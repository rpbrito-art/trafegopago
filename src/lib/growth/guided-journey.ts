import "server-only";

import { getOffersState } from "@/lib/offers/offer-catalog";

import { decideJourneyStep, type JourneyStep } from "./journey";
import { getObjectiveState } from "./objective-state";

/**
 * Coleta o estado real do negócio e deriva o próximo passo.
 *
 * A leitura reaproveita `getObjectiveState()` e `getOffersState()` em vez de
 * consultar as tabelas de novo. Custa uma resolução de contexto a mais e evita
 * o que custaria caro: duas definições divergentes de "o objetivo ativo deste
 * negócio" — exatamente o defeito que a correção 004B-01 removeu.
 *
 * Nenhuma recomendação é persistida nesta rodada, e nenhum provider de IA é
 * chamado: o passo é derivado por regra explícita em `decideJourneyStep()`.
 */
export async function resolveGuidedGrowthJourney(): Promise<JourneyStep> {
  const [objetivo, ofertas] = await Promise.all([
    getObjectiveState(),
    getOffersState(),
  ]);

  return decideJourneyStep({ objetivo, ofertas });
}
