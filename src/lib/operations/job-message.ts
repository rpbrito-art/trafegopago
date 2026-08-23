/**
 * Envelope da mensagem de job da fila `integration_jobs` (Rodada 002B).
 *
 * Espelha `public.is_valid_integration_job_message` da migration
 * `20260823180000_create_queue_and_worker_foundation.sql`. As duas validações
 * existem de propósito: o banco é a fronteira que impede envelope malformado de
 * **entrar** na fila; este módulo é o que o consumidor usa para decidir se a
 * mensagem que **saiu** ainda é processável. Um teste garante que não divirjam.
 *
 * O envelope é pequeno e referencial (`API_CONTRACTS.md` §11): aponta para
 * registros persistidos em vez de duplicá-los. Metadados que a própria fila já
 * fornece — `msg_id`, `read_ct`, `enqueued_at` — não são repetidos aqui.
 */

/** Versão aceita nesta rodada. Consumidor que não conhece a versão recusa. */
export const INTEGRATION_JOB_MESSAGE_VERSION = 1;

/** Único job desta rodada: interno, sem efeito externo e sem gasto. */
export const SYSTEM_HEALTHCHECK_JOB = "SYSTEM_HEALTHCHECK";

export const SUPPORTED_JOB_TYPES = [SYSTEM_HEALTHCHECK_JOB] as const;

export type SupportedJobType = (typeof SUPPORTED_JOB_TYPES)[number];

export const MAX_JOB_TYPE_LENGTH = 120;

/** Teto do payload serializado, igual ao CHECK do banco. */
export const MAX_PAYLOAD_LENGTH = 4000;

export type IntegrationJobMessage = {
  version: 1;
  organizationId: string;
  jobType: string;
  operationId: string | null;
  correlationId: string;
  payload: Record<string, unknown>;
};

/**
 * Job entregue ao consumidor: envelope + o que o PGMQ já sabe.
 *
 * `attempt` vem de `read_ct` — a fila conta as entregas, então o worker não
 * precisa manter esse número em lugar nenhum.
 */
export type IntegrationJob = {
  jobId: number;
  attempt: number;
  createdAt: string;
  message: IntegrationJobMessage;
};

const UUID_RE =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" && value !== null && !Array.isArray(value)
  );
}

/** Motivo pelo qual um envelope foi recusado. Vai para log, nunca o payload. */
export type JobMessageRejection =
  | "NOT_AN_OBJECT"
  | "UNSUPPORTED_VERSION"
  | "INVALID_ORGANIZATION_ID"
  | "INVALID_CORRELATION_ID"
  | "INVALID_JOB_TYPE"
  | "INVALID_OPERATION_ID"
  | "INVALID_PAYLOAD"
  | "PAYLOAD_TOO_LARGE";

export type ParseResult =
  | { ok: true; message: IntegrationJobMessage }
  | { ok: false; reason: JobMessageRejection };

/**
 * Valida um envelope vindo da fila.
 *
 * Devolve o motivo da recusa em vez de lançar: o worker precisa arquivar a
 * mensagem e seguir para a próxima, e o motivo é o que ele registra no log.
 * Nenhum campo do payload atravessa esse retorno.
 */
export function parseIntegrationJobMessage(value: unknown): ParseResult {
  if (!isPlainObject(value)) return { ok: false, reason: "NOT_AN_OBJECT" };

  if (value.version !== INTEGRATION_JOB_MESSAGE_VERSION) {
    return { ok: false, reason: "UNSUPPORTED_VERSION" };
  }

  if (!isUuid(value.organizationId)) {
    return { ok: false, reason: "INVALID_ORGANIZATION_ID" };
  }

  if (!isUuid(value.correlationId)) {
    return { ok: false, reason: "INVALID_CORRELATION_ID" };
  }

  const { jobType } = value;
  if (
    typeof jobType !== "string" ||
    jobType.trim() === "" ||
    jobType.length > MAX_JOB_TYPE_LENGTH
  ) {
    return { ok: false, reason: "INVALID_JOB_TYPE" };
  }

  // Ausente e `null` são equivalentes: job sem operação associada é legítimo.
  // Qualquer outro valor precisa ser UUID.
  const operationId =
    value.operationId === undefined ? null : value.operationId;
  if (operationId !== null && !isUuid(operationId)) {
    return { ok: false, reason: "INVALID_OPERATION_ID" };
  }

  if (!isPlainObject(value.payload)) {
    return { ok: false, reason: "INVALID_PAYLOAD" };
  }

  if (JSON.stringify(value.payload).length > MAX_PAYLOAD_LENGTH) {
    return { ok: false, reason: "PAYLOAD_TOO_LARGE" };
  }

  return {
    ok: true,
    message: {
      version: INTEGRATION_JOB_MESSAGE_VERSION,
      organizationId: value.organizationId,
      jobType,
      operationId: operationId as string | null,
      correlationId: value.correlationId,
      payload: value.payload,
    },
  };
}

export function isSupportedJobType(
  jobType: string,
): jobType is SupportedJobType {
  return (SUPPORTED_JOB_TYPES as readonly string[]).includes(jobType);
}

/**
 * `SYSTEM_HEALTHCHECK` exige `operationId`.
 *
 * O job existe para provar o caminho completo `PENDING → CLAIMED → SUCCEEDED`.
 * Sem operação associada não haveria o que provar, e a mensagem seria trabalho
 * sem efeito registrado.
 */
export function requiresOperation(jobType: SupportedJobType): boolean {
  return jobType === SYSTEM_HEALTHCHECK_JOB;
}

/**
 * Monta um envelope válido, para quem enfileira.
 *
 * `correlationId` é obrigatório e não tem default: quem cria o job já conhece a
 * correlação da operação, e gerar uma nova aqui romperia a trilha em silêncio.
 */
export function buildIntegrationJobMessage(input: {
  organizationId: string;
  jobType: string;
  correlationId: string;
  operationId?: string | null;
  payload?: Record<string, unknown>;
}): IntegrationJobMessage {
  return {
    version: INTEGRATION_JOB_MESSAGE_VERSION,
    organizationId: input.organizationId,
    jobType: input.jobType,
    operationId: input.operationId ?? null,
    correlationId: input.correlationId,
    payload: input.payload ?? {},
  };
}
