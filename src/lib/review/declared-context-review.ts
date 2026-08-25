import "server-only";

import { criarAdapterRegistry, PRODUCTION_ADAPTERS } from "@/lib/ai/adapter-registry";
import { criarAICatalog } from "@/lib/ai/catalog";
import { criarAIRouter, type AIRouter } from "@/lib/ai/router";
import { criarAIRunLedger } from "@/lib/ai/run-ledger";
import { criarTaskRegistry, PRODUCTION_TASKS } from "@/lib/ai/task-registry";
import {
  DECLARED_CONTEXT_REVIEW_PROMPT_VERSION,
  DECLARED_CONTEXT_REVIEW_SCHEMA_VERSION,
  DECLARED_CONTEXT_REVIEW_TASK_TYPE,
  DECLARED_CONTEXT_REVIEW_TASK_VERSION,
  declaredContextReviewSchema,
  validarGrounding,
  type DeclaredContextReview,
} from "@/lib/ai/tasks/declared-context-review";
import { createSupabasePrivilegedClient } from "@/lib/supabase/privileged";

import { calcularFingerprint } from "./fingerprint";
import type { DeclaredContextSnapshot } from "./snapshot";

/**
 * Execução da revisão de contexto declarado (Rodada 004E §§8 e 9).
 *
 * Esta é a primeira feature do Quoron que gasta dinheiro real, e a ordem das
 * verificações é a proteção principal:
 *
 * 1. cache por fingerprint — antes de qualquer coisa;
 * 2. papel: só owner/admin geram custo novo;
 * 3. limite de 3 chamadas não cacheadas por organização por hora, medido pela
 *    evidência persistida em `ai_runs`, não por estado do browser;
 * 4. só então o Router, que resolve modelo, abre o ledger e chama o provider;
 * 5. grounding validado antes de persistir ou exibir qualquer coisa.
 *
 * Nenhuma dessas etapas pode viver na UI: uma tela é sugestão, um limite
 * server-side é limite (`SECURITY_MODEL.md` §19).
 */

/** Janela e teto de chamadas não cacheadas por organização. */
export const RATE_LIMIT_JANELA_MS = 60 * 60 * 1000;
export const RATE_LIMIT_MAX_CHAMADAS = 3;

export type ReviewRecord = {
  id: string;
  fingerprint: string;
  review: DeclaredContextReview;
  createdAt: string;
};

export type ReviewOutcome =
  /** Já existia revisão para este contexto: nenhuma chamada foi feita. */
  | { kind: "cache"; review: ReviewRecord }
  | { kind: "criada"; review: ReviewRecord }
  /** Papel não autoriza gerar custo novo. */
  | { kind: "sem-permissao" }
  /** Teto horário atingido. */
  | { kind: "limite-atingido"; disponivelEm: string }
  /** O provider respondeu, mas o output não passou no grounding/schema. */
  | { kind: "revisao-invalida" }
  | { kind: "erro-tecnico" };

type Supabase = ReturnType<typeof createSupabasePrivilegedClient>;

export type DeclaredContextReviewDeps = {
  supabase?: Supabase;
  router?: AIRouter;
  agora?: () => Date;
};

/** Papéis que podem gerar custo novo nesta versão. */
const PAPEIS_QUE_REVISAM = ["owner", "admin"];

function criarRouterPadrao(supabase: Supabase): AIRouter {
  return criarAIRouter({
    tasks: criarTaskRegistry(PRODUCTION_TASKS),
    catalog: criarAICatalog(supabase),
    adapters: criarAdapterRegistry(PRODUCTION_ADAPTERS),
    ledger: criarAIRunLedger(supabase),
  });
}

/**
 * Busca a revisão correspondente a um fingerprint, sem chamar provider.
 *
 * Usada tanto pela leitura da tela quanto pelo caminho de escrita — a decisão
 * "existe revisão atual?" precisa ser a mesma nos dois, ou `/inicio` diria uma
 * coisa e `/revisao` outra.
 */
export async function buscarRevisaoPorFingerprint(input: {
  supabase: Supabase;
  organizationId: string;
  fingerprint: string;
}): Promise<ReviewRecord | null> {
  const { data, error } = await input.supabase
    .from("declared_context_reviews")
    .select("id, input_fingerprint, review_json, created_at")
    .eq("organization_id", input.organizationId)
    .eq("input_fingerprint", input.fingerprint)
    .eq("task_version", DECLARED_CONTEXT_REVIEW_TASK_VERSION)
    .eq("prompt_version", DECLARED_CONTEXT_REVIEW_PROMPT_VERSION)
    .eq("schema_version", DECLARED_CONTEXT_REVIEW_SCHEMA_VERSION)
    .maybeSingle();

  if (error || !data) return null;

  // O artefato é validado de novo na leitura. Ele foi validado antes de ser
  // gravado, mas uma revisão de schema futura pode tornar antigo o que está
  // no banco — e exibir um artefato que não satisfaz o contrato atual seria
  // mostrar campos vazios como se fossem resposta.
  const review = declaredContextReviewSchema.safeParse(data.review_json);

  if (!review.success) return null;

  return {
    id: data.id as string,
    fingerprint: data.input_fingerprint as string,
    review: review.data,
    createdAt: data.created_at as string,
  };
}

/**
 * Chamadas não cacheadas da organização na janela corrente.
 *
 * Conta `ai_runs` desta task — qualquer status. Contar só sucesso deixaria o
 * caminho aberto para queimar a cota com falhas: a chamada ao provider já
 * aconteceu, e é ela que custa.
 */
async function contarChamadasNaJanela(input: {
  supabase: Supabase;
  organizationId: string;
  desde: Date;
}): Promise<number | null> {
  const { count, error } = await input.supabase
    .from("ai_runs")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", input.organizationId)
    .eq("task_type", DECLARED_CONTEXT_REVIEW_TASK_TYPE)
    .gte("created_at", input.desde.toISOString());

  if (error) return null;

  return count ?? 0;
}

/**
 * Gera — ou reaproveita — a revisão do contexto declarado.
 *
 * `role` vem da membership resolvida no servidor, nunca do formulário.
 */
export async function revisarContextoDeclarado(input: {
  organizationId: string;
  role: string;
  snapshot: DeclaredContextSnapshot;
  deps?: DeclaredContextReviewDeps;
}): Promise<ReviewOutcome> {
  const supabase = input.deps?.supabase ?? createSupabasePrivilegedClient();
  const agora = input.deps?.agora ?? (() => new Date());

  const fingerprint = calcularFingerprint({
    snapshot: input.snapshot,
    taskType: DECLARED_CONTEXT_REVIEW_TASK_TYPE,
    taskVersion: DECLARED_CONTEXT_REVIEW_TASK_VERSION,
    promptVersion: DECLARED_CONTEXT_REVIEW_PROMPT_VERSION,
    schemaVersion: DECLARED_CONTEXT_REVIEW_SCHEMA_VERSION,
  });

  // Cache primeiro, sempre. Antes do papel, antes do limite: reexibir uma
  // revisão que já existe não gasta nada e não precisa de permissão de escrita.
  const existente = await buscarRevisaoPorFingerprint({
    supabase,
    organizationId: input.organizationId,
    fingerprint,
  });

  if (existente) return { kind: "cache", review: existente };

  if (!PAPEIS_QUE_REVISAM.includes(input.role)) return { kind: "sem-permissao" };

  const instante = agora();
  const desde = new Date(instante.getTime() - RATE_LIMIT_JANELA_MS);

  const chamadas = await contarChamadasNaJanela({
    supabase,
    organizationId: input.organizationId,
    desde,
  });

  // Falha ao contar não libera a chamada: sem saber quantas já houve, permitir
  // mais uma é abrir o teto justamente quando o sistema está cego.
  if (chamadas === null) return { kind: "erro-tecnico" };

  if (chamadas >= RATE_LIMIT_MAX_CHAMADAS) {
    return {
      kind: "limite-atingido",
      disponivelEm: new Date(instante.getTime() + RATE_LIMIT_JANELA_MS).toISOString(),
    };
  }

  const router = input.deps?.router ?? criarRouterPadrao(supabase);

  const resultado = await router.run<DeclaredContextReview>({
    taskType: DECLARED_CONTEXT_REVIEW_TASK_TYPE,
    taskVersion: DECLARED_CONTEXT_REVIEW_TASK_VERSION,
    input: input.snapshot,
    organizationId: input.organizationId,
  });

  if (!resultado.ok) return { kind: "erro-tecnico" };

  // Grounding depois do schema: a forma pode estar perfeita e as afirmações
  // ainda assim citarem evidência que não existe. Referência inventada invalida
  // o output inteiro — publicar o resto deixaria o usuário sem saber qual parte
  // tem base (mandato §5.3).
  const grounding = validarGrounding(resultado.output, input.snapshot);

  if (!grounding.ok) return { kind: "revisao-invalida" };

  const { data, error } = await supabase
    .from("declared_context_reviews")
    .insert({
      organization_id: input.organizationId,
      input_fingerprint: fingerprint,
      task_type: DECLARED_CONTEXT_REVIEW_TASK_TYPE,
      task_version: DECLARED_CONTEXT_REVIEW_TASK_VERSION,
      prompt_version: DECLARED_CONTEXT_REVIEW_PROMPT_VERSION,
      schema_version: DECLARED_CONTEXT_REVIEW_SCHEMA_VERSION,
      ai_run_id: resultado.runId,
      input_snapshot_json: input.snapshot,
      review_json: resultado.output,
    })
    .select("id, input_fingerprint, created_at")
    .single();

  if (error || !data) {
    // A chamada já custou; o artefato não pôde ser guardado. Reportar como
    // erro técnico é honesto — devolver a revisão sem persistir faria o
    // próximo acesso pagar de novo pela mesma resposta.
    console.error("falha ao persistir revisao de contexto", {
      code: (error as { code?: string } | null)?.code ?? null,
    });
    return { kind: "erro-tecnico" };
  }

  return {
    kind: "criada",
    review: {
      id: data.id as string,
      fingerprint: data.input_fingerprint as string,
      review: resultado.output,
      createdAt: data.created_at as string,
    },
  };
}
