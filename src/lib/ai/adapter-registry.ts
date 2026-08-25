import "server-only";

import { geminiAdapter } from "./adapters/gemini";
import type { AIProviderAdapter } from "./contracts";

/**
 * Registro de adapters de provider (Rodada 004A §5.5).
 *
 * O Router encontra o adapter pela `providerKey` que veio do catálogo. É esse
 * indireto que sustenta a regra de que nenhuma feature contém
 * `if provider === ...` (`AI_ARCHITECTURE.md` §20).
 */

export type AIAdapterRegistry = {
  resolve(providerKey: string): AIProviderAdapter | undefined;
};

export function criarAdapterRegistry(
  adapters: readonly AIProviderAdapter[],
): AIAdapterRegistry {
  const mapa = new Map<string, AIProviderAdapter>();

  for (const adapter of adapters) {
    if (mapa.has(adapter.providerKey)) {
      throw new Error(`adapter de IA registrado duas vezes: ${adapter.providerKey}`);
    }

    mapa.set(adapter.providerKey, adapter);
  }

  return {
    resolve(providerKey) {
      return mapa.get(providerKey);
    },
  };
}

/**
 * Registro de produção.
 *
 * A 004A o manteve vazio porque não havia provider real. A 004E registra o
 * primeiro: Google Gemini, nível pago, atrás do Router.
 *
 * O fake determinístico continua existindo **apenas** no suporte de testes e é
 * injetado explicitamente — nunca alcançado a partir daqui. Cair em fake por
 * ausência de credencial seria o pior desfecho possível: a aplicação pareceria
 * funcionar, produzindo respostas inventadas com custo zero. Sem chave, o
 * adapter falha com `PROVIDER_UNAVAILABLE` e o ledger registra.
 */
export const PRODUCTION_ADAPTERS: readonly AIProviderAdapter[] = [geminiAdapter];

export const adapterRegistry: AIAdapterRegistry =
  criarAdapterRegistry(PRODUCTION_ADAPTERS);
