import "server-only";

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
 * **Vazio, e é assim que tem de ser nesta rodada.** Não há provider real, nem
 * chave, nem SDK (mandato §13). O fake determinístico existe apenas no suporte
 * de testes e é injetado explicitamente — nunca alcançado a partir daqui.
 *
 * A consequência é deliberada: sem adapter registrado, o Router falha com
 * `ADAPTER_NOT_REGISTERED` e registra a falha no ledger. Cair em fake por
 * ausência de provider produtivo seria o pior desfecho possível — a aplicação
 * pareceria funcionar, produzindo respostas inventadas com custo zero.
 */
export const PRODUCTION_ADAPTERS: readonly AIProviderAdapter[] = [];

export const adapterRegistry: AIAdapterRegistry =
  criarAdapterRegistry(PRODUCTION_ADAPTERS);
