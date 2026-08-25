import { z } from "zod";

/**
 * Snapshot do contexto **declarado** do negócio (Rodada 004E §5.1).
 *
 * O que entra aqui é a fronteira epistemológica da rodada: só existe neste
 * snapshot o que o próprio negócio informou ao Quoron. Nada de Instagram,
 * mercado, leads ou resultado — porque nada disso foi observado ainda, e uma
 * revisão que fale do que não viu não é análise, é invenção
 * (`AGENTIC_PRODUCT_CANONICAL.md` §§3.1 e 9).
 *
 * Cada fato carrega um `ref` estável. É contra essa lista que o grounding é
 * verificado depois: uma referência que não está aqui não pode ter vindo do
 * contexto, e invalida o output inteiro.
 *
 * Não entra: e-mail, id de usuário, token, dado de provider, campo vazio
 * fingindo valor (`AI_ARCHITECTURE.md` §19).
 */

export const declaredFactSchema = z.object({
  /** Identificador estável do fato dentro deste snapshot. */
  ref: z.string().min(1).max(200),
  /** Rótulo humano do campo, em português. */
  label: z.string().min(1).max(120),
  /** O que o negócio declarou. */
  value: z.string().min(1).max(2000),
});

export type DeclaredFact = z.infer<typeof declaredFactSchema>;

export const declaredContextSnapshotSchema = z.object({
  /** Versão da forma do snapshot; entra no fingerprint. */
  snapshotVersion: z.literal("1"),
  facts: z.array(declaredFactSchema).min(1).max(60),
  /**
   * Tópicos que o produto sabe existir e que **não** foram declarados.
   *
   * Enviados explicitamente para que a ausência seja um fato conhecido, e não
   * algo que o modelo precise adivinhar pelo silêncio.
   */
  missingTopics: z.array(z.string().min(1).max(120)).max(20),
});

export type DeclaredContextSnapshot = z.infer<
  typeof declaredContextSnapshotSchema
>;

/** Refs conhecidas do snapshot, para validação de grounding. */
export function refsDoSnapshot(snapshot: DeclaredContextSnapshot): Set<string> {
  return new Set(snapshot.facts.map((fato) => fato.ref));
}

/**
 * Serialização canônica: mesma informação, sempre o mesmo texto.
 *
 * `JSON.stringify` direto não serve como base de fingerprint — a ordem das
 * chaves seguiria a ordem de construção do objeto, e uma refatoração inocente
 * mudaria o hash sem que nada do contexto tivesse mudado, forçando uma chamada
 * paga desnecessária.
 */
export function serializarSnapshotCanonico(
  snapshot: DeclaredContextSnapshot,
): string {
  const facts = [...snapshot.facts]
    .sort((a, b) => a.ref.localeCompare(b.ref))
    .map((fato) => ({ ref: fato.ref, label: fato.label, value: fato.value }));

  const missingTopics = [...snapshot.missingTopics].sort((a, b) =>
    a.localeCompare(b),
  );

  return JSON.stringify({
    snapshotVersion: snapshot.snapshotVersion,
    facts,
    missingTopics,
  });
}
