import { describe, expect, it } from "vitest";

import {
  buildIntegrationJobMessage,
  INTEGRATION_JOB_MESSAGE_VERSION,
  isSupportedJobType,
  isUuid,
  MAX_JOB_TYPE_LENGTH,
  MAX_PAYLOAD_LENGTH,
  parseIntegrationJobMessage,
  requiresOperation,
  SUPPORTED_JOB_TYPES,
  SYSTEM_HEALTHCHECK_JOB,
} from "./job-message";

const ORG = "11111111-1111-1111-1111-111111111111";
const CORR = "22222222-2222-2222-2222-222222222222";
const OP = "33333333-3333-3333-3333-333333333333";

function envelope(overrides: Record<string, unknown> = {}) {
  return {
    version: 1,
    organizationId: ORG,
    jobType: SYSTEM_HEALTHCHECK_JOB,
    operationId: OP,
    correlationId: CORR,
    payload: {},
    ...overrides,
  };
}

describe("parseIntegrationJobMessage", () => {
  it("aceita um envelope completo", () => {
    const r = parseIntegrationJobMessage(envelope());

    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.message.organizationId).toBe(ORG);
      expect(r.message.operationId).toBe(OP);
      expect(r.message.version).toBe(INTEGRATION_JOB_MESSAGE_VERSION);
    }
  });

  it("trata operationId ausente e null como equivalentes", () => {
    const semCampo = envelope();
    delete (semCampo as Record<string, unknown>).operationId;

    const a = parseIntegrationJobMessage(semCampo);
    const b = parseIntegrationJobMessage(envelope({ operationId: null }));

    expect(a.ok && a.message.operationId).toBe(null);
    expect(b.ok && b.message.operationId).toBe(null);
  });

  it.each([undefined, null, 42, "texto", [], true])(
    "recusa %j, que não é objeto",
    (valor) => {
      const r = parseIntegrationJobMessage(valor);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toBe("NOT_AN_OBJECT");
    },
  );

  it.each([0, 2, "1", null, undefined])(
    "recusa a versão %j",
    (version) => {
      const r = parseIntegrationJobMessage(envelope({ version }));
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toBe("UNSUPPORTED_VERSION");
    },
  );

  it.each(["", "nao-uuid", 42, null, `${ORG} `])(
    "recusa organizationId %j",
    (organizationId) => {
      const r = parseIntegrationJobMessage(envelope({ organizationId }));
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toBe("INVALID_ORGANIZATION_ID");
    },
  );

  it("recusa correlationId inválido", () => {
    const r = parseIntegrationJobMessage(envelope({ correlationId: "x" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("INVALID_CORRELATION_ID");
  });

  it.each(["", "   ", 7, null])("recusa jobType %j", (jobType) => {
    const r = parseIntegrationJobMessage(envelope({ jobType }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("INVALID_JOB_TYPE");
  });

  it("recusa jobType acima do teto", () => {
    const r = parseIntegrationJobMessage(
      envelope({ jobType: "x".repeat(MAX_JOB_TYPE_LENGTH + 1) }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("INVALID_JOB_TYPE");
  });

  it("aceita jobType exatamente no teto", () => {
    const r = parseIntegrationJobMessage(
      envelope({ jobType: "x".repeat(MAX_JOB_TYPE_LENGTH) }),
    );
    expect(r.ok).toBe(true);
  });

  it.each(["nao-uuid", 42, {}])("recusa operationId %j", (operationId) => {
    const r = parseIntegrationJobMessage(envelope({ operationId }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("INVALID_OPERATION_ID");
  });

  it.each([null, undefined, "texto", 42, [1, 2]])(
    "recusa payload %j, que não é objeto",
    (payload) => {
      const r = parseIntegrationJobMessage(envelope({ payload }));
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toBe("INVALID_PAYLOAD");
    },
  );

  it("recusa payload acima do teto", () => {
    const r = parseIntegrationJobMessage(
      envelope({ payload: { texto: "x".repeat(MAX_PAYLOAD_LENGTH) } }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("PAYLOAD_TOO_LARGE");
  });

  it("não deixa campo extra atravessar o envelope", () => {
    // O consumidor recebe só o contrato. Um campo solto na mensagem não vira
    // entrada silenciosa para o handler.
    const r = parseIntegrationJobMessage(
      envelope({ secret: "nao-deveria-passar", extra: 1 }),
    );

    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(Object.keys(r.message).sort()).toEqual([
        "correlationId",
        "jobType",
        "operationId",
        "organizationId",
        "payload",
        "version",
      ]);
      expect(JSON.stringify(r.message)).not.toContain("nao-deveria-passar");
    }
  });
});

describe("paridade com o CHECK do banco", () => {
  // `public.is_valid_integration_job_message` aplica exatamente estas regras.
  // Se um dos dois lados mudar sozinho, uma mensagem passaria numa fronteira e
  // seria recusada na outra — e o sintoma apareceria só em runtime.
  it("usa o mesmo teto de payload da migration", () => {
    expect(MAX_PAYLOAD_LENGTH).toBe(4000);
  });

  it("usa o mesmo teto de jobType da migration", () => {
    expect(MAX_JOB_TYPE_LENGTH).toBe(120);
  });

  it("fecha a versão em 1, como a migration", () => {
    expect(INTEGRATION_JOB_MESSAGE_VERSION).toBe(1);
  });
});

describe("isUuid", () => {
  it.each([ORG, CORR, OP, ORG.toUpperCase()])("aceita %s", (valor) => {
    expect(isUuid(valor)).toBe(true);
  });

  it.each(["", "x", `${ORG}x`, ` ${ORG}`, 42, null, undefined])(
    "recusa %j",
    (valor) => {
      expect(isUuid(valor)).toBe(false);
    },
  );
});

describe("tipos de job suportados", () => {
  it("nesta rodada existe exatamente um", () => {
    expect(SUPPORTED_JOB_TYPES).toEqual([SYSTEM_HEALTHCHECK_JOB]);
  });

  it("reconhece o suportado e recusa os demais", () => {
    expect(isSupportedJobType(SYSTEM_HEALTHCHECK_JOB)).toBe(true);
    expect(isSupportedJobType("META_PUBLISH")).toBe(false);
    expect(isSupportedJobType("")).toBe(false);
  });

  it("SYSTEM_HEALTHCHECK exige operação associada", () => {
    expect(requiresOperation(SYSTEM_HEALTHCHECK_JOB)).toBe(true);
  });
});

describe("buildIntegrationJobMessage", () => {
  it("produz envelope que o próprio parser aceita", () => {
    const msg = buildIntegrationJobMessage({
      organizationId: ORG,
      jobType: SYSTEM_HEALTHCHECK_JOB,
      correlationId: CORR,
      operationId: OP,
    });

    expect(parseIntegrationJobMessage(msg).ok).toBe(true);
  });

  it("payload ausente vira objeto vazio, nunca undefined", () => {
    const msg = buildIntegrationJobMessage({
      organizationId: ORG,
      jobType: SYSTEM_HEALTHCHECK_JOB,
      correlationId: CORR,
    });

    expect(msg.payload).toEqual({});
    expect(msg.operationId).toBe(null);
  });
});
