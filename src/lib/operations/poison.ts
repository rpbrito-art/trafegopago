/**
 * Decisão de arquivamento de poison message (Correção 002B-01 §3).
 *
 * Vive fora do worker porque é a regra que decide **perder ou preservar** uma
 * mensagem, e essa decisão precisa ser testável sem depender de forçar uma
 * falha no Postgres hospedado. O worker importa daqui.
 *
 * O princípio: arquivar é irreversível para o ciclo de trabalho. Só se arquiva
 * depois de um desfecho conhecido de `fail_operation`. Diante de erro do RPC ou
 * de um retorno que não sabemos interpretar, a mensagem fica — a visibility
 * timeout a devolve e o próximo ciclo tenta de novo.
 */

/**
 * Desfechos de `public.fail_operation` que autorizam arquivar.
 *
 * - `FAILED` — a operação foi encerrada agora.
 * - `ALREADY_SUCCEEDED` — o trabalho já tinha sido concluído.
 * - `NOT_FAILABLE` — estado que o helper recusa rebaixar (`ACTION_REQUIRED`,
 *   `UNKNOWN`). Não há o que executar a partir desta mensagem.
 * - `NOT_FOUND` — a operação não existe mais.
 *
 * Nenhum deles rebaixa `SUCCEEDED`, `ACTION_REQUIRED` ou `UNKNOWN`: quem
 * garante isso é o predicado do próprio `fail_operation`, que só transiciona a
 * partir de `PENDING`/`CLAIMED`.
 */
export const SAFE_FAIL_OUTCOMES = [
  "FAILED",
  "ALREADY_SUCCEEDED",
  "NOT_FAILABLE",
  "NOT_FOUND",
] as const;

export type SafeFailOutcome = (typeof SAFE_FAIL_OUTCOMES)[number];

export type PoisonDecision =
  | { archive: true }
  | { archive: false; reason: "RPC_ERROR" | "UNKNOWN_OUTCOME" };

/**
 * A mensagem pode ser arquivada?
 *
 * `erro` presente vence tudo: se o RPC falhou, não sabemos o estado da
 * operação, e arquivar deixaria um trabalho pendurado sem mensagem que o
 * recupere.
 *
 * Um retorno fora de `SAFE_FAIL_OUTCOMES` — inclusive `null`/`undefined`, que é
 * o que um RPC devolve quando não encontra o que esperava — também preserva a
 * mensagem. Tratar desconhecido como sucesso é exatamente o erro que esta
 * função existe para impedir.
 */
export function decidePoisonArchival(input: {
  outcome: unknown;
  hasError: boolean;
}): PoisonDecision {
  if (input.hasError) return { archive: false, reason: "RPC_ERROR" };

  if (
    typeof input.outcome === "string" &&
    (SAFE_FAIL_OUTCOMES as readonly string[]).includes(input.outcome)
  ) {
    return { archive: true };
  }

  return { archive: false, reason: "UNKNOWN_OUTCOME" };
}

/**
 * Resumo interno gravado em `last_error_summary` no poison.
 *
 * Deliberadamente sem classe de erro: a taxonomia de `last_error_class`
 * descreve falhas de **provider externo** (`API_CONTRACTS.md` §12), e nenhuma
 * chamada externa aconteceu aqui. Rotular exaustão de fila como
 * `UNKNOWN_UPSTREAM` inventaria um erro que não ocorreu e envenenaria qualquer
 * política de retry que leia essa coluna — foi o bloqueio A da auditoria 002B.
 */
export function poisonSummary(maxAttempts: number): string {
  return `mensagem excedeu ${maxAttempts} entregas na fila interna`;
}
