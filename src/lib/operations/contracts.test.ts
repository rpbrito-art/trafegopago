import { describe, expect, it } from "vitest";

import {
  allowsAutomaticRetry,
  AUDIT_ACTOR_TYPES,
  canRetryOperation,
  EXTERNAL_ERROR_CLASSES,
  isAuditActorType,
  isExternalErrorClass,
  isOperationStatus,
  isTerminalOperationStatus,
  OPERATION_STATUSES,
  RETRY_POLICY_BY_ERROR_CLASS,
  retryPolicyFor,
  TERMINAL_OPERATION_STATUSES,
  type ExternalErrorClass,
  type OperationStatus,
} from "./contracts";

/**
 * Espelho literal dos `CHECK` da migration
 * `20260823160000_create_operations_and_audit_events.sql`.
 *
 * Escrito à mão de propósito: se alguém alterar a constante em `contracts.ts`
 * sem tocar na migration, é aqui que a divergência aparece. Derivar esta lista
 * do próprio módulo transformaria o teste numa tautologia.
 */
const STATUSES_NO_BANCO = [
  "PENDING",
  "CLAIMED",
  "SUCCEEDED",
  "FAILED",
  "ACTION_REQUIRED",
  "UNKNOWN",
];

const ERROR_CLASSES_NO_BANCO = [
  "AUTH_REQUIRED",
  "PERMISSION_DENIED",
  "RATE_LIMITED",
  "VALIDATION_FAILED",
  "NOT_FOUND",
  "CONFLICT",
  "TRANSIENT_UPSTREAM",
  "UPSTREAM_UNAVAILABLE",
  "UNKNOWN_UPSTREAM",
];

const ACTOR_TYPES_NO_BANCO = ["USER", "SYSTEM", "PROVIDER", "AI"];

describe("paridade com os CHECK da migration", () => {
  it("statuses de operation batem com o banco", () => {
    expect([...OPERATION_STATUSES].sort()).toEqual(
      [...STATUSES_NO_BANCO].sort(),
    );
  });

  it("taxonomia de erro bate com o banco", () => {
    expect([...EXTERNAL_ERROR_CLASSES].sort()).toEqual(
      [...ERROR_CLASSES_NO_BANCO].sort(),
    );
  });

  it("tipos de ator batem com o banco", () => {
    expect([...AUDIT_ACTOR_TYPES].sort()).toEqual(
      [...ACTOR_TYPES_NO_BANCO].sort(),
    );
  });
});

describe("guards", () => {
  it.each([...OPERATION_STATUSES])("aceita o status %s", (status) => {
    expect(isOperationStatus(status)).toBe(true);
  });

  it.each([undefined, null, 42, "", "pending", "DONE", {}])(
    "recusa %j como status",
    (valor) => {
      expect(isOperationStatus(valor)).toBe(false);
    },
  );

  it.each([...EXTERNAL_ERROR_CLASSES])("aceita a classe %s", (classe) => {
    expect(isExternalErrorClass(classe)).toBe(true);
  });

  it.each([undefined, null, "rate_limited", "TIMEOUT", 7])(
    "recusa %j como classe de erro",
    (valor) => {
      expect(isExternalErrorClass(valor)).toBe(false);
    },
  );

  it.each([...AUDIT_ACTOR_TYPES])("aceita o ator %s", (ator) => {
    expect(isAuditActorType(ator)).toBe(true);
  });

  it.each([undefined, null, "user", "ROBOT"])(
    "recusa %j como ator",
    (valor) => {
      expect(isAuditActorType(valor)).toBe(false);
    },
  );
});

describe("estados terminais", () => {
  it.each([...TERMINAL_OPERATION_STATUSES])("%s é terminal", (status) => {
    expect(isTerminalOperationStatus(status)).toBe(true);
  });

  it.each(["PENDING", "CLAIMED", "ACTION_REQUIRED", "UNKNOWN"] as const)(
    "%s não é terminal",
    (status) => {
      expect(isTerminalOperationStatus(status)).toBe(false);
    },
  );
});

describe("política de retry", () => {
  it("cobre toda a taxonomia sem buraco", () => {
    // Um `undefined` aqui seria lido pelo chamador como "pode repetir".
    for (const classe of EXTERNAL_ERROR_CLASSES) {
      expect(RETRY_POLICY_BY_ERROR_CLASS[classe]).toBeDefined();
    }

    expect(Object.keys(RETRY_POLICY_BY_ERROR_CLASS).sort()).toEqual(
      [...EXTERNAL_ERROR_CLASSES].sort(),
    );
  });

  it("segue o contrato do API_CONTRACTS §13", () => {
    expect(retryPolicyFor("RATE_LIMITED")).toBe("PROVIDER_PACED");
    expect(retryPolicyFor("TRANSIENT_UPSTREAM")).toBe("BACKOFF_LIMITED");
    expect(retryPolicyFor("UPSTREAM_UNAVAILABLE")).toBe("BACKOFF_LIMITED");
    expect(retryPolicyFor("UNKNOWN_UPSTREAM")).toBe("CONSERVATIVE");
    expect(retryPolicyFor("AUTH_REQUIRED")).toBe("HUMAN_ACTION");
    expect(retryPolicyFor("PERMISSION_DENIED")).toBe("PERMANENT");
    expect(retryPolicyFor("VALIDATION_FAILED")).toBe("PERMANENT");
  });

  it.each(["RATE_LIMITED", "TRANSIENT_UPSTREAM", "UPSTREAM_UNAVAILABLE", "UNKNOWN_UPSTREAM"] as const)(
    "%s admite nova tentativa automática",
    (classe) => {
      expect(allowsAutomaticRetry(classe)).toBe(true);
    },
  );

  it.each(["AUTH_REQUIRED", "PERMISSION_DENIED", "VALIDATION_FAILED", "NOT_FOUND", "CONFLICT"] as const)(
    "%s não admite nova tentativa automática",
    (classe) => {
      expect(allowsAutomaticRetry(classe)).toBe(false);
    },
  );
});

describe("canRetryOperation", () => {
  const base = {
    status: "PENDING" as OperationStatus,
    errorClass: "TRANSIENT_UPSTREAM" as ExternalErrorClass | null,
    mutatesExternalResource: false,
  };

  it("permite repetir leitura transitória", () => {
    expect(canRetryOperation(base)).toBe(true);
  });

  it.each([...TERMINAL_OPERATION_STATUSES])(
    "não repete a partir do estado terminal %s",
    (status) => {
      expect(canRetryOperation({ ...base, status })).toBe(false);
    },
  );

  it("NUNCA repete desfecho UNKNOWN", () => {
    // O efeito remoto pode ter acontecido. Só reconciliação — que não existe
    // nesta rodada — pode decidir, e repetir às cegas duplicaria a mutação.
    expect(canRetryOperation({ ...base, status: "UNKNOWN" })).toBe(false);
    expect(
      canRetryOperation({
        ...base,
        status: "UNKNOWN",
        mutatesExternalResource: true,
        hasIdempotencyProtection: true,
      }),
    ).toBe(false);
  });

  it("não repete sem classe de erro registrada", () => {
    expect(canRetryOperation({ ...base, errorClass: null })).toBe(false);
  });

  it("não repete mutação externa sem proteção de idempotência", () => {
    expect(
      canRetryOperation({ ...base, mutatesExternalResource: true }),
    ).toBe(false);
  });

  it("repete mutação externa quando a idempotência está declarada", () => {
    expect(
      canRetryOperation({
        ...base,
        mutatesExternalResource: true,
        hasIdempotencyProtection: true,
      }),
    ).toBe(true);
  });

  it("proteção de idempotência é opt-in, nunca presumida", () => {
    // Omitir o campo tem de valer o mesmo que negá-lo: esquecer a declaração
    // não pode virar autorização para duplicar efeito externo.
    const omitido = canRetryOperation({
      ...base,
      mutatesExternalResource: true,
    });
    const explicito = canRetryOperation({
      ...base,
      mutatesExternalResource: true,
      hasIdempotencyProtection: false,
    });

    expect(omitido).toBe(explicito);
    expect(omitido).toBe(false);
  });

  it("classe permanente não repete nem com idempotência protegida", () => {
    expect(
      canRetryOperation({
        ...base,
        errorClass: "VALIDATION_FAILED",
        mutatesExternalResource: true,
        hasIdempotencyProtection: true,
      }),
    ).toBe(false);
  });

  it("AUTH_REQUIRED exige pessoa, não nova tentativa", () => {
    expect(canRetryOperation({ ...base, errorClass: "AUTH_REQUIRED" })).toBe(
      false,
    );
  });
});
