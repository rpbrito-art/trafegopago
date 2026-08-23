/**
 * Contratos compartilhados da fundação de operações (Rodada 002A).
 *
 * Este módulo existe por um motivo estreito: impedir que a aplicação e o banco
 * divirjam sobre os mesmos conjuntos fechados. Os `CHECK` da migration
 * `20260823160000_create_operations_and_audit_events.sql` são a autoridade —
 * aqui ficam os mesmos valores em TypeScript, para que a divergência apareça
 * em teste e no compilador em vez de virar `23514` em produção.
 *
 * **Não** há worker, scheduler ou chamada externa nesta rodada. O que segue é
 * vocabulário e política declarada, não execução.
 */

/**
 * Estados de uma operação.
 *
 * `UNKNOWN` não é preguiça de classificar: é o desfecho em que a chamada
 * externa não respondeu de forma conclusiva e o efeito remoto pode ou não ter
 * acontecido. Tratá-lo como `FAILED` autorizaria um retry capaz de duplicar
 * uma mutação — daí ele ser um estado próprio, com política própria.
 */
export const OPERATION_STATUSES = [
  "PENDING",
  "CLAIMED",
  "SUCCEEDED",
  "FAILED",
  "ACTION_REQUIRED",
  "UNKNOWN",
] as const;

export type OperationStatus = (typeof OPERATION_STATUSES)[number];

/** Estados a partir dos quais nenhuma nova tentativa deve partir. */
export const TERMINAL_OPERATION_STATUSES = [
  "SUCCEEDED",
  "FAILED",
] as const satisfies readonly OperationStatus[];

export function isOperationStatus(value: unknown): value is OperationStatus {
  return (
    typeof value === "string" &&
    (OPERATION_STATUSES as readonly string[]).includes(value)
  );
}

export function isTerminalOperationStatus(status: OperationStatus): boolean {
  return (TERMINAL_OPERATION_STATUSES as readonly string[]).includes(status);
}

/**
 * Taxonomia interna de erro externo (`API_CONTRACTS.md` §12).
 *
 * Adapters traduzem o erro do provider para uma destas categorias. Código de
 * provider não sobe para as features: um `error_subcode` da Meta espalhado
 * pelo domínio amarraria regra de negócio à versão de uma API externa.
 */
export const EXTERNAL_ERROR_CLASSES = [
  "AUTH_REQUIRED",
  "PERMISSION_DENIED",
  "RATE_LIMITED",
  "VALIDATION_FAILED",
  "NOT_FOUND",
  "CONFLICT",
  "TRANSIENT_UPSTREAM",
  "UPSTREAM_UNAVAILABLE",
  "UNKNOWN_UPSTREAM",
] as const;

export type ExternalErrorClass = (typeof EXTERNAL_ERROR_CLASSES)[number];

export function isExternalErrorClass(
  value: unknown,
): value is ExternalErrorClass {
  return (
    typeof value === "string" &&
    (EXTERNAL_ERROR_CLASSES as readonly string[]).includes(value)
  );
}

/** Tipos de ator em `audit_events`. */
export const AUDIT_ACTOR_TYPES = [
  "USER",
  "SYSTEM",
  "PROVIDER",
  "AI",
] as const;

export type AuditActorType = (typeof AUDIT_ACTOR_TYPES)[number];

export function isAuditActorType(value: unknown): value is AuditActorType {
  return (
    typeof value === "string" &&
    (AUDIT_ACTOR_TYPES as readonly string[]).includes(value)
  );
}

/**
 * Como cada categoria de erro deve ser tratada quanto a nova tentativa.
 *
 * - `PROVIDER_PACED` — repetir só respeitando o ritmo imposto pelo provider
 *   (`Retry-After` ou equivalente). Backoff próprio não substitui a regra dele.
 * - `BACKOFF_LIMITED` — repetir com backoff e teto de tentativas.
 * - `CONSERVATIVE` — repetir poucas vezes, com folga, e escalar depois.
 * - `HUMAN_ACTION` — repetir não resolve: falta credencial, permissão ou
 *   configuração que só uma pessoa restabelece.
 * - `PERMANENT` — o pedido está errado. Repetir é errar de novo.
 */
export const RETRY_POLICIES = [
  "PROVIDER_PACED",
  "BACKOFF_LIMITED",
  "CONSERVATIVE",
  "HUMAN_ACTION",
  "PERMANENT",
] as const;

export type RetryPolicy = (typeof RETRY_POLICIES)[number];

/**
 * Política por categoria (`API_CONTRACTS.md` §13).
 *
 * `Record` completo e não parcial de propósito: acrescentar uma categoria à
 * taxonomia sem decidir sua política vira erro de compilação, em vez de um
 * `undefined` que o chamador interpretaria como "pode repetir".
 */
export const RETRY_POLICY_BY_ERROR_CLASS: Record<
  ExternalErrorClass,
  RetryPolicy
> = {
  RATE_LIMITED: "PROVIDER_PACED",
  TRANSIENT_UPSTREAM: "BACKOFF_LIMITED",
  UPSTREAM_UNAVAILABLE: "BACKOFF_LIMITED",
  UNKNOWN_UPSTREAM: "CONSERVATIVE",
  AUTH_REQUIRED: "HUMAN_ACTION",
  PERMISSION_DENIED: "PERMANENT",
  VALIDATION_FAILED: "PERMANENT",
  NOT_FOUND: "PERMANENT",
  CONFLICT: "PERMANENT",
};

export function retryPolicyFor(errorClass: ExternalErrorClass): RetryPolicy {
  return RETRY_POLICY_BY_ERROR_CLASS[errorClass];
}

/** Políticas que admitem alguma nova tentativa automática. */
const POLITICAS_COM_RETRY: readonly RetryPolicy[] = [
  "PROVIDER_PACED",
  "BACKOFF_LIMITED",
  "CONSERVATIVE",
];

/**
 * A categoria admite nova tentativa automática?
 *
 * Resposta isolada do efeito da operação. Para decidir se **esta** operação
 * pode ser repetida, use `canRetryOperation`.
 */
export function allowsAutomaticRetry(errorClass: ExternalErrorClass): boolean {
  return POLITICAS_COM_RETRY.includes(retryPolicyFor(errorClass));
}

/**
 * Esta operação pode ser tentada de novo?
 *
 * A regra que o `API_CONTRACTS.md` §13 fecha com "mutação só pode retry se
 * idempotência/reconciliação proteger duplicação", e que é a razão de esta
 * função existir em vez de o chamador consultar só a taxonomia:
 *
 * 1. estado terminal não se repete;
 * 2. desfecho `UNKNOWN` **nunca** autoriza retry automático — o efeito remoto
 *    pode ter acontecido, e só reconciliação (ainda não implementada) resolve;
 * 3. `mutatesExternalResource` exige proteção de idempotência declarada; sem
 *    ela, repetir pode cobrar duas vezes, publicar duas vezes, criar duas vezes.
 *
 * O default de `hasIdempotencyProtection` é `false`: quem for mutar precisa
 * afirmar a proteção, e não esquecê-la por omissão.
 */
export function canRetryOperation(input: {
  status: OperationStatus;
  errorClass: ExternalErrorClass | null;
  mutatesExternalResource: boolean;
  hasIdempotencyProtection?: boolean;
}): boolean {
  const {
    status,
    errorClass,
    mutatesExternalResource,
    hasIdempotencyProtection = false,
  } = input;

  if (isTerminalOperationStatus(status)) return false;
  if (status === "UNKNOWN") return false;
  if (errorClass === null) return false;
  if (!allowsAutomaticRetry(errorClass)) return false;
  if (mutatesExternalResource && !hasIdempotencyProtection) return false;

  return true;
}
