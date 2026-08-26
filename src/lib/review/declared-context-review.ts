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
 * Execução da revisão de contexto declarado (Rodada 004E §§8 e 9, endurecida
 * pela Correção 004E-01 §4).
 *
 * Esta é a primeira feature do Quoron que gasta dinheiro real, e a ordem das
 * verificações é a proteção principal:
 *
 * 1. cache por fingerprint — leitura barata, antes de qualquer coisa;
 * 2. **reserva atômica** no banco, que decide num único passo serializado se
 *    há cache, se já existe execução em andamento para o mesmo contexto, se o
 *    papel autoriza e se ainda há vaga na janela de uma hora;
 * 3. só quem adquire a reserva chega ao Router;
 * 4. grounding validado antes de persistir ou exibir qualquer coisa;
 * 5. a reserva é fechada em qualquer desfecho.
 *
 * A auditoria da 004E mostrou por que o passo 2 não pode ser feito em etapas
 * separadas na aplicação: duas requisições simultâneas encontravam o mesmo
 * "sem cache" e a mesma contagem abaixo do teto, e as duas pagavam. O botão
 * desabilitado do formulário evita duplo clique acidental; não é controle de
 * concorrência.
 */

/** Teto de tentativas por organização na janela móvel de uma hora. */
export const RATE_LIMIT_MAX_CHAMADAS = 3;

/**
 * Validade da reserva.
 *
 * Maior que o timeout do adapter (45s), para que uma chamada lenta não perca a
 * própria reserva; e curta o bastante para que um processo morto não trave o
 * contexto por muito tempo.
 */
export const RESERVA_TTL_SEGUNDOS = 120;

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
  /** Outra requisição já está revisando este mesmo contexto agora. */
  | { kind: "em-andamento" }
  /** Papel não autoriza gerar custo novo. */
  | { kind: "sem-permissao" }
  /** Teto horário atingido. */
  | { kind: "limite-atingido" }
  /** O provider respondeu, mas o output não passou no grounding/schema. */
  | { kind: "revisao-invalida" }
  | { kind: "erro-tecnico" };

type Supabase = ReturnType<typeof createSupabasePrivilegedClient>;

export type DeclaredContextReviewDeps = {
  supabase?: Supabase;
  router?: AIRouter;
};

/** SQLSTATE devolvido pela RPC quando o papel não autoriza. */
const NAO_AUTORIZADO = "42501";

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

type Reserva =
  | { outcome: "CACHE" }
  | { outcome: "IN_FLIGHT" }
  | { outcome: "RATE_LIMITED" }
  | { outcome: "RESERVED"; attemptId: string }
  | { outcome: "SEM_PERMISSAO" }
  | { outcome: "ERRO" };

/**
 * Adquire — ou não — o direito de chamar o provider.
 *
 * Toda a decisão acontece dentro de uma transação serializada por organização,
 * no banco. Falha de comunicação vira `ERRO` e **não** libera a chamada: sem
 * saber se há vaga, permitir mais uma abriria o teto justamente quando o
 * sistema está cego.
 */
async function adquirirReserva(input: {
  supabase: Supabase;
  userId: string;
  organizationId: string;
  fingerprint: string;
}): Promise<Reserva> {
  const { data, error } = await input.supabase.rpc(
    "acquire_declared_context_review_slot",
    {
      p_user_id: input.userId,
      p_organization_id: input.organizationId,
      p_input_fingerprint: input.fingerprint,
      p_task_type: DECLARED_CONTEXT_REVIEW_TASK_TYPE,
      p_task_version: DECLARED_CONTEXT_REVIEW_TASK_VERSION,
      p_prompt_version: DECLARED_CONTEXT_REVIEW_PROMPT_VERSION,
      p_schema_version: DECLARED_CONTEXT_REVIEW_SCHEMA_VERSION,
      p_max_per_hour: RATE_LIMIT_MAX_CHAMADAS,
      p_ttl_seconds: RESERVA_TTL_SEGUNDOS,
    },
  );

  if (error) {
    if (error.code === NAO_AUTORIZADO) return { outcome: "SEM_PERMISSAO" };

    console.error("falha ao adquirir reserva de revisao", {
      code: error.code ?? null,
    });
    return { outcome: "ERRO" };
  }

  // A RPC devolve uma tabela de uma linha.
  const linha = Array.isArray(data) ? data[0] : data;
  const outcome = (linha as { outcome?: string } | null)?.outcome;

  if (outcome === "CACHE") return { outcome: "CACHE" };
  if (outcome === "IN_FLIGHT") return { outcome: "IN_FLIGHT" };
  if (outcome === "RATE_LIMITED") return { outcome: "RATE_LIMITED" };

  if (outcome === "RESERVED") {
    const attemptId = (linha as { attempt_id?: string }).attempt_id;
    if (typeof attemptId === "string") return { outcome: "RESERVED", attemptId };
  }

  return { outcome: "ERRO" };
}

/** Fecha a reserva. O desfecho da revisão não depende disto ter dado certo. */
async function finalizarReserva(input: {
  supabase: Supabase;
  attemptId: string;
  organizationId: string;
  status: "COMPLETED" | "FAILED";
  aiRunId?: string | null;
}): Promise<void> {
  const { error } = await input.supabase.rpc(
    "finalize_declared_context_review_attempt",
    {
      p_attempt_id: input.attemptId,
      p_organization_id: input.organizationId,
      p_status: input.status,
      p_ai_run_id: input.aiRunId ?? null,
    },
  );

  // Reserva não fechada expira sozinha; registrar basta. Derrubar a revisão
  // por causa disso descartaria um resultado que já foi pago.
  if (error) {
    console.error("falha ao finalizar reserva de revisao", {
      code: error.code ?? null,
    });
  }
}

/**
 * Gera — ou reaproveita — a revisão do contexto declarado.
 *
 * `role` chega apenas para a decisão de UI; a autorização que vale é a da RPC,
 * que lê papel e status da membership no banco.
 */
export async function revisarContextoDeclarado(input: {
  organizationId: string;
  userId: string;
  snapshot: DeclaredContextSnapshot;
  deps?: DeclaredContextReviewDeps;
}): Promise<ReviewOutcome> {
  const supabase = input.deps?.supabase ?? createSupabasePrivilegedClient();

  const fingerprint = calcularFingerprint({
    snapshot: input.snapshot,
    taskType: DECLARED_CONTEXT_REVIEW_TASK_TYPE,
    taskVersion: DECLARED_CONTEXT_REVIEW_TASK_VERSION,
    promptVersion: DECLARED_CONTEXT_REVIEW_PROMPT_VERSION,
    schemaVersion: DECLARED_CONTEXT_REVIEW_SCHEMA_VERSION,
  });

  const buscarCache = () =>
    buscarRevisaoPorFingerprint({
      supabase,
      organizationId: input.organizationId,
      fingerprint,
    });

  // Cache primeiro, e fora da reserva: reexibir uma revisão que já existe não
  // gasta nada e não exige permissão de escrita — um member precisa conseguir
  // ler o que a organização já revisou.
  const existente = await buscarCache();

  if (existente) return { kind: "cache", review: existente };

  const reserva = await adquirirReserva({
    supabase,
    userId: input.userId,
    organizationId: input.organizationId,
    fingerprint,
  });

  if (reserva.outcome === "SEM_PERMISSAO") return { kind: "sem-permissao" };
  if (reserva.outcome === "RATE_LIMITED") return { kind: "limite-atingido" };
  if (reserva.outcome === "IN_FLIGHT") return { kind: "em-andamento" };
  if (reserva.outcome === "ERRO") return { kind: "erro-tecnico" };

  if (reserva.outcome === "CACHE") {
    // Corrida perdida por pouco: alguém concluiu a mesma revisão entre a nossa
    // leitura e a reserva. O resultado dela serve.
    const agora = await buscarCache();
    return agora ? { kind: "cache", review: agora } : { kind: "erro-tecnico" };
  }

  const { attemptId } = reserva;

  const router = input.deps?.router ?? criarRouterPadrao(supabase);

  const resultado = await router.run<DeclaredContextReview>({
    taskType: DECLARED_CONTEXT_REVIEW_TASK_TYPE,
    taskVersion: DECLARED_CONTEXT_REVIEW_TASK_VERSION,
    input: input.snapshot,
    organizationId: input.organizationId,
  });

  if (!resultado.ok) {
    await finalizarReserva({
      supabase,
      attemptId,
      organizationId: input.organizationId,
      status: "FAILED",
      aiRunId: resultado.runId,
    });

    return { kind: "erro-tecnico" };
  }

  // Grounding depois do schema: a forma pode estar perfeita e as afirmações
  // ainda assim citarem evidência que não existe. Referência inventada invalida
  // o output inteiro — publicar o resto deixaria o usuário sem saber qual parte
  // tem base (mandato §5.3).
  const grounding = validarGrounding(resultado.output, input.snapshot);

  if (!grounding.ok) {
    await finalizarReserva({
      supabase,
      attemptId,
      organizationId: input.organizationId,
      status: "FAILED",
      aiRunId: resultado.runId,
    });

    return { kind: "revisao-invalida" };
  }

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
    console.error("falha ao persistir revisao de contexto", {
      code: (error as { code?: string } | null)?.code ?? null,
    });

    await finalizarReserva({
      supabase,
      attemptId,
      organizationId: input.organizationId,
      status: "FAILED",
      aiRunId: resultado.runId,
    });

    // A chamada já aconteceu e pode ter custado; o artefato não pôde ser
    // guardado. Devolver a revisão sem persistir faria o próximo acesso pagar
    // de novo pela mesma resposta.
    return { kind: "erro-tecnico" };
  }

  await finalizarReserva({
    supabase,
    attemptId,
    organizationId: input.organizationId,
    status: "COMPLETED",
    aiRunId: resultado.runId,
  });

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
