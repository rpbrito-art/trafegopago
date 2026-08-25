import "server-only";

import { createSupabasePrivilegedClient } from "@/lib/supabase/privileged";

import type { AIErrorClass, AITier } from "./contracts";

/**
 * Ledger de execuções de IA (Rodada 004A §6.4).
 *
 * Um run nasce `STARTED` **antes** da chamada ao provider e é concluído depois.
 * A ordem importa: se o processo morrer no meio de uma chamada paga, o gasto
 * fica registrado como iniciado em vez de desaparecer — um ledger que só
 * escreve no sucesso não é um ledger de custo, é um relatório de sucessos.
 *
 * ## O que nunca entra aqui
 *
 * Prompt, input, output e PII. A tabela guarda contagem, custo, latência,
 * status e versões — o suficiente para auditar gasto e reproduzir a conta, e
 * insuficiente para vazar conteúdo de cliente (`AI_ARCHITECTURE.md` §12,
 * `SECURITY_MODEL.md` §13).
 */

export type AbrirRunInput = {
  organizationId: string | null;
  correlationId: string;
  taskType: string;
  taskVersion: string;
  providerId: string;
  aiModelId: string;
  aiPriceVersionId: string | null;
  tier: AITier;
  promptVersion: string;
  schemaVersion: string;
  fallbackFromRunId?: string | null;
};

export type ConcluirRunInput = {
  runId: string;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number | null;
  /** Texto decimal exato, nunca `number`. */
  estimatedCost: string | null;
  currency: string | null;
  latencyMs: number | null;
  confidence: number | null;
};

export type FalharRunInput = {
  runId: string;
  errorClass: AIErrorClass;
  latencyMs: number | null;
  inputTokens?: number;
  outputTokens?: number;
  cachedTokens?: number | null;
  estimatedCost?: string | null;
  currency?: string | null;
};

export type AIRunLedger = {
  abrir(input: AbrirRunInput): Promise<string | null>;
  concluir(input: ConcluirRunInput): Promise<boolean>;
  falhar(input: FalharRunInput): Promise<boolean>;
};

export function criarAIRunLedger(
  supabase: ReturnType<typeof createSupabasePrivilegedClient> = createSupabasePrivilegedClient(),
): AIRunLedger {
  return {
    async abrir(input) {
      const { data, error } = await supabase
        .from("ai_runs")
        .insert({
          organization_id: input.organizationId,
          correlation_id: input.correlationId,
          task_type: input.taskType,
          task_version: input.taskVersion,
          provider_id: input.providerId,
          ai_model_id: input.aiModelId,
          ai_price_version_id: input.aiPriceVersionId,
          tier: input.tier,
          prompt_version: input.promptVersion,
          schema_version: input.schemaVersion,
          fallback_from_run_id: input.fallbackFromRunId ?? null,
          status: "STARTED",
        })
        .select("id")
        .maybeSingle();

      if (error || !data) {
        // Sem `message`: erro de banco pode citar valor de coluna.
        console.error("falha ao abrir ai_run", { code: error?.code ?? null });
        return null;
      }

      return data.id as string;
    },

    async concluir(input) {
      const { error } = await supabase
        .from("ai_runs")
        .update({
          status: "SUCCEEDED",
          input_tokens: input.inputTokens,
          output_tokens: input.outputTokens,
          cached_tokens: input.cachedTokens,
          estimated_cost: input.estimatedCost,
          currency: input.currency,
          latency_ms: input.latencyMs,
          confidence: input.confidence,
          completed_at: new Date().toISOString(),
        })
        .eq("id", input.runId);

      if (error) {
        console.error("falha ao concluir ai_run", { code: error.code });
        return false;
      }

      return true;
    },

    async falhar(input) {
      // Um run que falhou depois de consumir tokens ainda custou dinheiro. O
      // usage entra quando existir; quando não existir, fica nulo em vez de
      // zero — `0` afirmaria que a chamada foi gratuita.
      const { error } = await supabase
        .from("ai_runs")
        .update({
          status: "FAILED",
          error_class: input.errorClass,
          latency_ms: input.latencyMs,
          ...(input.inputTokens === undefined
            ? {}
            : { input_tokens: input.inputTokens }),
          ...(input.outputTokens === undefined
            ? {}
            : { output_tokens: input.outputTokens }),
          ...(input.cachedTokens === undefined
            ? {}
            : { cached_tokens: input.cachedTokens }),
          ...(input.estimatedCost === undefined
            ? {}
            : { estimated_cost: input.estimatedCost }),
          ...(input.currency === undefined ? {} : { currency: input.currency }),
          completed_at: new Date().toISOString(),
        })
        .eq("id", input.runId);

      if (error) {
        console.error("falha ao registrar ai_run com falha", { code: error.code });
        return false;
      }

      return true;
    },
  };
}
