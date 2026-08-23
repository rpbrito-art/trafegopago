import { describe, expect, it } from "vitest";

import {
  ALLOWED_EMAIL_OTP_TYPES,
  isAllowedEmailOtpType,
  parseConfirmRequest,
  RECOVERY_DESTINATION,
} from "./otp";
import { DEFAULT_AUTHENTICATED_REDIRECT } from "./redirect";
import { ROUTES } from "./routes";

function params(input: Record<string, string>): URLSearchParams {
  return new URLSearchParams(input);
}

describe("isAllowedEmailOtpType", () => {
  it.each([...ALLOWED_EMAIL_OTP_TYPES])("aceita %s", (type) => {
    expect(isAllowedEmailOtpType(type)).toBe(true);
  });

  it.each([
    "invite",
    "magiclink",
    "email_change",
    "sms",
    "phone_change",
    "",
    "SIGNUP",
    "RECOVERY",
  ])("rejeita %j, que está fora do escopo desta rodada", (type) => {
    expect(isAllowedEmailOtpType(type)).toBe(false);
  });

  it("rejeita valor ausente", () => {
    expect(isAllowedEmailOtpType(null)).toBe(false);
    expect(isAllowedEmailOtpType(undefined)).toBe(false);
  });
});

describe("parseConfirmRequest", () => {
  it("aceita token_hash e type válidos", () => {
    const result = parseConfirmRequest(
      params({ token_hash: "hash-valido", type: "signup" }),
    );

    expect(result).toEqual({
      ok: true,
      tokenHash: "hash-valido",
      type: "signup",
      next: DEFAULT_AUTHENTICATED_REDIRECT,
    });
  });

  it("recusa requisição sem token_hash", () => {
    expect(parseConfirmRequest(params({ type: "signup" }))).toEqual({
      ok: false,
      reason: "missing_token_hash",
    });
  });

  it("recusa token_hash vazio", () => {
    expect(
      parseConfirmRequest(params({ token_hash: "", type: "signup" })),
    ).toEqual({ ok: false, reason: "missing_token_hash" });
  });

  it("recusa token_hash absurdamente longo", () => {
    expect(
      parseConfirmRequest(
        params({ token_hash: "a".repeat(513), type: "signup" }),
      ),
    ).toEqual({ ok: false, reason: "missing_token_hash" });
  });

  it("recusa type ausente ou fora da lista permitida", () => {
    expect(parseConfirmRequest(params({ token_hash: "h" }))).toEqual({
      ok: false,
      reason: "invalid_type",
    });

    expect(
      parseConfirmRequest(params({ token_hash: "h", type: "magiclink" })),
    ).toEqual({ ok: false, reason: "invalid_type" });
  });

  it("aceita recovery e força o destino da nova senha", () => {
    expect(
      parseConfirmRequest(params({ token_hash: "h", type: "recovery" })),
    ).toEqual({
      ok: true,
      tokenHash: "h",
      type: "recovery",
      next: RECOVERY_DESTINATION,
    });

    expect(RECOVERY_DESTINATION).toBe(ROUTES.resetPassword);
  });

  it.each([ROUTES.home, ROUTES.account, "https://evil.com", "/qualquer"])(
    "ignora next=%j em recovery: o destino não é negociável",
    (next) => {
      const result = parseConfirmRequest(
        params({ token_hash: "h", type: "recovery", next }),
      );

      expect(result.ok && result.next).toBe(RECOVERY_DESTINATION);
    },
  );

  it("o destino de recovery fica fora da allowlist de ?next=", async () => {
    // A tela de nova senha não pode ser alcançada por um `next` qualquer: quem
    // chega lá tem de vir do próprio fluxo de recovery.
    const { ALLOWED_REDIRECT_PATHS } = await import("./redirect");

    expect(ALLOWED_REDIRECT_PATHS).not.toContain(RECOVERY_DESTINATION);
  });

  it("sanitiza next externo, caindo no destino padrão", () => {
    const result = parseConfirmRequest(
      params({
        token_hash: "h",
        type: "signup",
        next: "https://evil.com/roubar",
      }),
    );

    expect(result).toEqual({
      ok: true,
      tokenHash: "h",
      type: "signup",
      next: DEFAULT_AUTHENTICATED_REDIRECT,
    });
  });

  it("preserva next interno que está na allowlist", () => {
    const result = parseConfirmRequest(
      params({ token_hash: "h", type: "email", next: ROUTES.home }),
    );

    expect(result.ok && result.next).toBe(ROUTES.home);
  });

  it("ignora parâmetros extras da URL", () => {
    const result = parseConfirmRequest(
      params({
        token_hash: "h",
        type: "signup",
        redirect_to: "https://evil.com",
        access_token: "nao-deve-ser-lido",
      }),
    );

    expect(result).toEqual({
      ok: true,
      tokenHash: "h",
      type: "signup",
      next: DEFAULT_AUTHENTICATED_REDIRECT,
    });
  });
});
