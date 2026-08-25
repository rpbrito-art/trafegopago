import "server-only";

import { getAccountBusinessState } from "@/lib/business/account";
import { getObjectiveState } from "@/lib/growth/objective-state";
import { getOffersState } from "@/lib/offers/offer-catalog";
import {
  DECLARED_CONTEXT_REVIEW_PROMPT_VERSION,
  DECLARED_CONTEXT_REVIEW_SCHEMA_VERSION,
  DECLARED_CONTEXT_REVIEW_TASK_TYPE,
  DECLARED_CONTEXT_REVIEW_TASK_VERSION,
  declaredContextReviewSchema,
  type DeclaredContextReview,
} from "@/lib/ai/tasks/declared-context-review";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { montarSnapshotDeclarado } from "./context-snapshot-builder";
import { calcularFingerprint } from "./fingerprint";
import type { DeclaredContextSnapshot } from "./snapshot";

/**
 * Leitura do estado da revisão, pelo caminho do usuário (Rodada 004E §10).
 *
 * **Não chama provider.** Renderizar uma tela nunca pode gastar dinheiro: a
 * chamada acontece só depois de um clique explícito, na Server Action
 * (mandato §9.1). Aqui apenas se responde "existe revisão para o contexto de
 * agora?".
 *
 * A leitura usa o cliente com a sessão do visitante — a RLS é a autorização.
 */

export type ReviewState =
  | { kind: "sem-organizacao" }
  | { kind: "negocio-indisponivel" }
  | { kind: "multiplos-negocios" }
  | { kind: "erro-tecnico" }
  /** Falta objetivo, oferta ou foco: revisar agora seria revisar um contexto pela metade. */
  | { kind: "base-incompleta" }
  | {
      kind: "pronto";
      organizationId: string;
      podeRevisar: boolean;
      snapshot: DeclaredContextSnapshot;
      fingerprint: string;
      /** Revisão do contexto **de agora**, quando existe. */
      atual: { review: DeclaredContextReview; createdAt: string } | null;
      /** Houve revisão antes, mas o contexto mudou desde então. */
      temRevisaoDesatualizada: boolean;
    };

export async function getReviewState(): Promise<ReviewState> {
  const supabase = await createSupabaseServerClient();

  const [account, objetivoState, ofertasState] = await Promise.all([
    getAccountBusinessState(),
    getObjectiveState(),
    getOffersState(),
  ]);

  if (
    account.kind === "erro-tecnico" ||
    objetivoState.kind === "erro-tecnico" ||
    ofertasState.kind === "erro-tecnico"
  ) {
    return { kind: "erro-tecnico" };
  }

  // Nenhuma organização escolhida implicitamente — a mesma regra que vale para
  // objetivo e ofertas vale para a revisão.
  if (
    account.kind === "multiplas-organizacoes" ||
    objetivoState.kind === "multiplos-negocios" ||
    ofertasState.kind === "multiplos-negocios"
  ) {
    return { kind: "multiplos-negocios" };
  }

  if (
    account.kind === "organizacao-indisponivel" ||
    objetivoState.kind === "negocio-indisponivel" ||
    ofertasState.kind === "negocio-indisponivel"
  ) {
    return { kind: "negocio-indisponivel" };
  }

  if (account.kind === "sem-organizacao") return { kind: "sem-organizacao" };
  if (account.kind !== "pronta") return { kind: "erro-tecnico" };

  // A base da 004D precisa estar completa: sem objetivo, sem oferta ou sem
  // foco, a revisão falaria de um contexto que o próprio usuário ainda não
  // terminou de declarar.
  if (
    objetivoState.kind !== "definido" ||
    ofertasState.kind !== "pronto" ||
    ofertasState.ofertas.length === 0 ||
    objetivoState.objetivo.focusType === null
  ) {
    return { kind: "base-incompleta" };
  }

  const snapshot = montarSnapshotDeclarado({
    account,
    objetivo: objetivoState.objetivo,
    ofertas: ofertasState.ofertas,
  });

  const fingerprint = calcularFingerprint({
    snapshot,
    taskType: DECLARED_CONTEXT_REVIEW_TASK_TYPE,
    taskVersion: DECLARED_CONTEXT_REVIEW_TASK_VERSION,
    promptVersion: DECLARED_CONTEXT_REVIEW_PROMPT_VERSION,
    schemaVersion: DECLARED_CONTEXT_REVIEW_SCHEMA_VERSION,
  });

  const organizationId = account.organization.id;

  // Duas leituras baratas: a revisão do contexto atual e a existência de
  // qualquer revisão anterior. A segunda é o que permite dizer "seu contexto
  // mudou desde a última revisão" em vez de apresentar artefato velho como
  // atual (mandato §10).
  const { data, error } = await supabase
    .from("declared_context_reviews")
    .select("input_fingerprint, review_json, created_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) return { kind: "erro-tecnico" };

  const linhas = data ?? [];

  const atualBruta = linhas.find(
    (linha) => linha.input_fingerprint === fingerprint,
  );

  const atual = atualBruta ? parseReview(atualBruta) : null;

  return {
    kind: "pronto",
    organizationId,
    // Mesmos papéis que definem a direção do negócio geram custo novo:
    // owner/admin. `podeAlterar` já carrega essa decisão, resolvida da
    // membership no servidor — recalculá-la aqui criaria uma segunda regra.
    // A autorização de verdade está em `revisarContextoDeclarado`.
    podeRevisar: objetivoState.podeAlterar,
    snapshot,
    fingerprint,
    atual,
    temRevisaoDesatualizada: atual === null && linhas.length > 0,
  };
}

function parseReview(
  linha: Record<string, unknown>,
): { review: DeclaredContextReview; createdAt: string } | null {
  const parsed = declaredContextReviewSchema.safeParse(linha.review_json);

  if (!parsed.success) return null;

  return { review: parsed.data, createdAt: String(linha.created_at) };
}
