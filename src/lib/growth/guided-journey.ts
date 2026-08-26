import "server-only";

import { getOffersState } from "@/lib/offers/offer-catalog";
import { getReviewState } from "@/lib/review/review-state";

import { decideJourneyStep, type JourneyStep } from "./journey";
import { getObjectiveState } from "./objective-state";

/**
 * Coleta o estado real do negócio e deriva o próximo passo.
 *
 * A leitura reaproveita `getObjectiveState()`, `getOffersState()` e
 * `getReviewState()` em vez de consultar as tabelas de novo. Custa uma
 * resolução de contexto a mais e evita o que custaria caro: duas definições
 * divergentes de "o objetivo ativo deste negócio" — exatamente o defeito que a
 * correção 004B-01 removeu.
 *
 * Nenhuma recomendação é persistida nesta camada e **nenhum provider de IA é
 * chamado**: `getReviewState()` apenas compara fingerprints, e o passo é
 * derivado por regra explícita em `decideJourneyStep()`.
 */
export async function resolveGuidedGrowthJourney(): Promise<JourneyStep> {
  const [objetivo, ofertas, revisao] = await Promise.all([
    getObjectiveState(),
    getOffersState(),
    getReviewState(),
  ]);

  // `undefined` quando a revisão não pôde ser consultada: o motor então para
  // em `BASE_ESTRATEGICA_PRONTA` em vez de afirmar que falta revisar algo que
  // talvez já esteja revisado.
  const revisaoAtual =
    revisao.kind === "pronto" ? revisao.atual !== null : undefined;

  return decideJourneyStep({ objetivo, ofertas, revisaoAtual });
}
