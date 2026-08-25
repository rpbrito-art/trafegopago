import { createHash } from "node:crypto";

import { serializarSnapshotCanonico, type DeclaredContextSnapshot } from "./snapshot";

/**
 * Fingerprint do contexto revisado (Rodada 004E §8.1).
 *
 * É o que decide se o Quoron gasta ou não uma chamada paga. Mesmo contexto e
 * mesmas versões devolvem a revisão existente; qualquer mudança material gera
 * fingerprint novo e permite revisar de novo.
 *
 * As versões entram no hash junto com o snapshot porque uma revisão produzida
 * pelo prompt `v1` não responde pelo prompt `v2` — reutilizá-la depois de trocar
 * o prompt entregaria ao usuário uma resposta de um contrato que não existe
 * mais.
 */
export function calcularFingerprint(input: {
  snapshot: DeclaredContextSnapshot;
  taskType: string;
  taskVersion: string;
  promptVersion: string;
  schemaVersion: string;
}): string {
  const canonico = [
    input.taskType,
    input.taskVersion,
    input.promptVersion,
    input.schemaVersion,
    serializarSnapshotCanonico(input.snapshot),
  ].join("\n");

  return createHash("sha256").update(canonico, "utf8").digest("hex");
}
