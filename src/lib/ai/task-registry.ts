import "server-only";

import type { AITaskDefinition } from "./contracts";

/**
 * Registro server-side das tasks de IA (Rodada 004A §5.4).
 *
 * A política de uma task — capacidades exigidas, tiers aceitáveis, versão de
 * prompt e de schema — mora aqui, versionada, e não espalhada em componentes.
 * Um prompt grande dentro de um componente de UI é um prompt que ninguém
 * consegue versionar nem avaliar (`AI_ARCHITECTURE.md` §8).
 *
 * A chave é `taskType@taskVersion`. Versão faz parte da identidade de propósito:
 * mudar a semântica de uma task sem mudar a versão tornaria o histórico de
 * `ai_runs` impossível de interpretar — runs antigos e novos apareceriam sob o
 * mesmo nome significando coisas diferentes.
 */

export type AITaskRegistry = {
  resolve(
    taskType: string,
    taskVersion: string,
  ): AITaskDefinition | undefined;
};

export function chaveDaTask(taskType: string, taskVersion: string): string {
  return `${taskType}@${taskVersion}`;
}

/**
 * Constrói um registro imutável a partir de definições.
 *
 * Registrar duas vezes a mesma `taskType@taskVersion` é erro de programação, não
 * um "último vence": a segunda definição sobrescreveria silenciosamente a
 * política da primeira.
 */
export function criarTaskRegistry(
  definicoes: readonly AITaskDefinition[],
): AITaskRegistry {
  const mapa = new Map<string, AITaskDefinition>();

  for (const definicao of definicoes) {
    const chave = chaveDaTask(definicao.taskType, definicao.taskVersion);

    if (mapa.has(chave)) {
      throw new Error(`task de IA registrada duas vezes: ${chave}`);
    }

    mapa.set(chave, definicao);
  }

  return {
    resolve(taskType, taskVersion) {
      return mapa.get(chaveDaTask(taskType, taskVersion));
    },
  };
}

/**
 * Registro de produção.
 *
 * **Vazio de propósito.** A 004A constrói a fundação; inventar uma "feature de
 * IA" só para ter o que registrar produziria uma task que ninguém pediu e que
 * a próxima rodada teria de desfazer (mandato §5.4). As tasks reais nascem
 * junto com as features que as consomem.
 */
export const PRODUCTION_TASKS: readonly AITaskDefinition[] = [];

export const taskRegistry: AITaskRegistry = criarTaskRegistry(PRODUCTION_TASKS);
