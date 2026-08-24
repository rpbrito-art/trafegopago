import { describe, expect, it } from "vitest";

import {
  generateState,
  hashState,
  intentExpiresAt,
  INTENT_TTL_SECONDS,
  isWellFormedState,
  MAX_INTENT_TTL_SECONDS,
  STATE_BYTES,
  validateIntent,
  type StoredIntent,
} from "./oauth-state";

const ORG_A = "11111111-1111-1111-1111-111111111111";
const ORG_B = "22222222-2222-2222-2222-222222222222";
const USER_A = "33333333-3333-3333-3333-333333333333";
const USER_B = "44444444-4444-4444-4444-444444444444";

const AGORA = Date.UTC(2026, 7, 23, 12, 0, 0);

function intent(over: Partial<StoredIntent> = {}): StoredIntent {
  return {
    organizationId: ORG_A,
    userId: USER_A,
    expiresAt: new Date(AGORA + 5 * 60_000).toISOString(),
    consumedAt: null,
    ...over,
  };
}

const stateValido = "a".repeat(STATE_BYTES * 2);

describe("generateState", () => {
  it("produz hex do tamanho contratado", () => {
    const s = generateState();
    expect(s).toHaveLength(STATE_BYTES * 2);
    expect(isWellFormedState(s)).toBe(true);
  });

  it("não repete entre chamadas", () => {
    const amostras = new Set(Array.from({ length: 200 }, () => generateState()));
    expect(amostras.size).toBe(200);
  });

  it("usa toda a entropia pedida ao gerador", () => {
    // Se o `state` fosse previsível, ele deixaria de ser defesa. O teste força
    // o gerador a devolver bytes conhecidos e confere que nenhum se perde.
    const bytes = Uint8Array.from({ length: STATE_BYTES }, (_, i) => i);
    const s = generateState(() => bytes);

    expect(s).toBe(
      Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(""),
    );
  });

  it("preserva o zero à esquerda de cada byte", () => {
    const s = generateState(() => new Uint8Array(STATE_BYTES));
    expect(s).toBe("0".repeat(STATE_BYTES * 2));
  });
});

describe("hashState", () => {
  it("produz SHA-256 em hex minúsculo, no formato que a migration aceita", async () => {
    const h = await hashState("qualquer-state");

    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it("é determinístico e sensível a qualquer mudança", async () => {
    const a = await hashState(stateValido);
    const b = await hashState(stateValido);
    const c = await hashState(stateValido.replace(/a$/, "b"));

    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });

  it("não é reversível ao state — o hash não contém o valor", async () => {
    const h = await hashState(stateValido);
    expect(h).not.toContain(stateValido);
  });
});

describe("isWellFormedState", () => {
  it.each([stateValido, "0".repeat(64)])("aceita %s...", (s) => {
    expect(isWellFormedState(s)).toBe(true);
  });

  it.each([
    "",
    "a".repeat(63),
    "a".repeat(65),
    "A".repeat(64),
    "z".repeat(64),
    42,
    null,
    undefined,
    { toString: () => stateValido },
  ])("recusa %j", (valor) => {
    expect(isWellFormedState(valor)).toBe(false);
  });
});

describe("validateIntent", () => {
  const base = { state: stateValido, currentUserId: USER_A, nowMs: AGORA };

  it("autoriza intenção válida e devolve a organização da intenção", () => {
    const r = validateIntent({ ...base, intent: intent() });

    expect(r).toEqual({ ok: true, organizationId: ORG_A });
  });

  it("a organização vem da intenção, nunca do request", () => {
    // O callback não escolhe o tenant: quem escolheu foi a ida, já autenticada.
    const r = validateIntent({ ...base, intent: intent({ organizationId: ORG_B }) });

    expect(r).toEqual({ ok: true, organizationId: ORG_B });
  });

  it("recusa state malformado antes de consultar qualquer coisa", () => {
    const r = validateIntent({ ...base, state: "nao-hex", intent: intent() });

    expect(r).toEqual({ ok: false, reason: "MALFORMED_STATE" });
  });

  it("recusa callback sem state", () => {
    for (const state of [undefined, null, ""]) {
      const r = validateIntent({ ...base, state, intent: intent() });
      expect(r.ok).toBe(false);
    }
  });

  it("recusa intenção inexistente", () => {
    const r = validateIntent({ ...base, intent: null });

    expect(r).toEqual({ ok: false, reason: "NOT_FOUND" });
  });

  it("recusa replay: intenção já consumida", () => {
    const r = validateIntent({
      ...base,
      intent: intent({ consumedAt: new Date(AGORA - 1000).toISOString() }),
    });

    expect(r).toEqual({ ok: false, reason: "ALREADY_CONSUMED" });
  });

  it("nomeia replay como replay, mesmo que também esteja expirada", () => {
    // A ordem importa para o diagnóstico: um replay dentro da janela é o caso
    // perigoso, e não pode ser confundido com "expirou".
    const r = validateIntent({
      ...base,
      intent: intent({
        consumedAt: new Date(AGORA - 1000).toISOString(),
        expiresAt: new Date(AGORA - 500).toISOString(),
      }),
    });

    expect(r).toEqual({ ok: false, reason: "ALREADY_CONSUMED" });
  });

  it("recusa intenção expirada", () => {
    const r = validateIntent({
      ...base,
      intent: intent({ expiresAt: new Date(AGORA - 1).toISOString() }),
    });

    expect(r).toEqual({ ok: false, reason: "EXPIRED" });
  });

  it("recusa exatamente no instante da expiração", () => {
    const r = validateIntent({
      ...base,
      intent: intent({ expiresAt: new Date(AGORA).toISOString() }),
    });

    expect(r).toEqual({ ok: false, reason: "EXPIRED" });
  });

  it("recusa state de outro usuário — vetor cross-tenant", () => {
    // O caso que o mandato nomeia: state da organização/usuário A não pode
    // valer para B.
    const r = validateIntent({
      ...base,
      currentUserId: USER_B,
      intent: intent({ userId: USER_A, organizationId: ORG_A }),
    });

    expect(r).toEqual({ ok: false, reason: "WRONG_USER" });
  });

  it("identidade é checada mesmo com intenção perfeitamente válida", () => {
    const valida = intent();
    expect(validateIntent({ ...base, intent: valida }).ok).toBe(true);
    expect(
      validateIntent({ ...base, intent: valida, currentUserId: USER_B }).ok,
    ).toBe(false);
  });

  it("usa o relógio atual quando nenhum instante é injetado", () => {
    const r = validateIntent({
      state: stateValido,
      currentUserId: USER_A,
      intent: intent({ expiresAt: new Date(Date.now() + 60_000).toISOString() }),
    });

    expect(r.ok).toBe(true);
  });
});

describe("intentExpiresAt", () => {
  it("expira dentro da janela curta contratada", () => {
    const expira = new Date(intentExpiresAt(AGORA)).getTime();

    expect(expira - AGORA).toBe(INTENT_TTL_SECONDS * 1000);
  });

  it("cabe no teto que a migration impõe", () => {
    // O CHECK `meta_oauth_intents_max_lifetime` recusa acima de 30 min. Se
    // alguém aumentar o TTL sem olhar o banco, o INSERT falharia em runtime.
    expect(INTENT_TTL_SECONDS).toBeLessThanOrEqual(MAX_INTENT_TTL_SECONDS);
  });
});
