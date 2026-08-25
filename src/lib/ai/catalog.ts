import "server-only";

import { createSupabasePrivilegedClient } from "@/lib/supabase/privileged";

import {
  isAITier,
  type AIModelCandidate,
  type AIModelStatus,
  type AIPriceVersion,
  type AIProviderStatus,
} from "./contracts";

/**
 * Leitura do catálogo de modelos e preços (Rodada 004A §7).
 *
 * Somente leitura: o catálogo é povoado por migration/operação administrativa,
 * não pelo caminho de execução. Um Router capaz de criar modelo ou preço
 * poderia inventar o custo da própria chamada.
 */

export type AICatalog = {
  /** Candidatos elegíveis a receber tarefa nova, na ordem do banco. */
  listarCandidatos(): Promise<AIModelCandidate[]>;
  /** Preços que abrangem `em` para um modelo. Mais de um = ambiguidade. */
  listarPrecosVigentes(
    aiModelId: string,
    em: Date,
  ): Promise<AIPriceVersion[]>;
};

type LinhaModelo = {
  id: string;
  provider_id: string;
  model_key: string;
  tier: number;
  capability_tags: string[] | null;
  status: string;
  supports_structured_output: boolean;
  context_window_tokens: number | string | null;
  max_output_tokens: number | string | null;
  ai_providers: {
    key: string;
    status: string;
  } | null;
};

function inteiroOuNulo(valor: number | string | null): number | null {
  if (valor === null) return null;
  const numero = typeof valor === "string" ? Number(valor) : valor;
  return Number.isFinite(numero) ? numero : null;
}

export function criarAICatalog(
  supabase: ReturnType<typeof createSupabasePrivilegedClient> = createSupabasePrivilegedClient(),
): AICatalog {
  return {
    async listarCandidatos() {
      // Provider e modelo precisam **os dois** estar elegíveis: um modelo
      // `ACTIVE` sob um provider `DISABLED` é um candidato que não pode
      // executar, e oferecê-lo ao Router só adiaria a falha para depois da
      // escolha.
      const { data, error } = await supabase
        .from("ai_models")
        .select(
          "id, provider_id, model_key, tier, capability_tags, status, supports_structured_output, context_window_tokens, max_output_tokens, ai_providers!inner(key, status)",
        )
        .in("status", ["ACTIVE", "DEGRADED"])
        .in("ai_providers.status", ["ACTIVE", "DEGRADED"]);

      if (error) {
        console.error("falha ao listar candidatos de modelo", { code: error.code });
        return [];
      }

      const linhas = (data ?? []) as unknown as LinhaModelo[];

      return linhas.flatMap((linha) => {
        // Tier fora de 1..3 não deveria existir — há `CHECK` no banco. Se
        // aparecer, o candidato é descartado em vez de virar `as AITier`: um
        // cast aqui transformaria dado corrompido em execução real.
        if (!isAITier(linha.tier)) return [];
        if (!linha.ai_providers) return [];

        return [
          {
            id: linha.id,
            providerId: linha.provider_id,
            providerKey: linha.ai_providers.key,
            providerStatus: linha.ai_providers.status as AIProviderStatus,
            modelKey: linha.model_key,
            tier: linha.tier,
            capabilityTags: linha.capability_tags ?? [],
            status: linha.status as AIModelStatus,
            supportsStructuredOutput: linha.supports_structured_output,
            contextWindowTokens: inteiroOuNulo(linha.context_window_tokens),
            maxOutputTokens: inteiroOuNulo(linha.max_output_tokens),
          },
        ];
      });
    },

    async listarPrecosVigentes(aiModelId, em) {
      const instante = em.toISOString();

      // Vigência é intervalo fechado no início e aberto no fim. Devolve
      // **todos** os que abrangem o instante, de propósito: quem decide o que
      // fazer com duas versões vigentes é o Router, e ele falha fechado. Um
      // `.limit(1)` aqui esconderia a ambiguidade e escolheria um preço por
      // ordem de índice.
      const { data, error } = await supabase
        .from("ai_price_versions")
        .select(
          "id, ai_model_id, input_price_per_million, output_price_per_million, cached_input_price_per_million, currency, effective_from, effective_to",
        )
        .eq("ai_model_id", aiModelId)
        .lte("effective_from", instante)
        .or(`effective_to.is.null,effective_to.gt.${instante}`);

      if (error) {
        console.error("falha ao listar precos vigentes", { code: error.code });
        return [];
      }

      return (data ?? []).map((linha) => ({
        id: linha.id as string,
        aiModelId: linha.ai_model_id as string,
        // `numeric` chega como texto do PostgREST, e é assim que fica: passar
        // por `number` aqui destruiria a precisão que a coluna existe para ter.
        inputPricePerMillion: String(linha.input_price_per_million),
        outputPricePerMillion: String(linha.output_price_per_million),
        cachedInputPricePerMillion:
          linha.cached_input_price_per_million === null
            ? null
            : String(linha.cached_input_price_per_million),
        currency: linha.currency as string,
        effectiveFrom: linha.effective_from as string,
        effectiveTo: (linha.effective_to as string | null) ?? null,
      }));
    },
  };
}
