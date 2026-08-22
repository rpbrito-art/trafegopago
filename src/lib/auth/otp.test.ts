import { describe, expect, it } from "vitest";

import {
  ALLOWED_EMAIL_OTP_TYPES,
  isAllowedEmailOtpType,
  parseConfirmRequest,
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
    "recovery",
    "invite",
    "magiclink",
    "email_change",
    "sms",
    "phone_change",
    "",
    "SIGNUP",
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
      parseConfirmRequest(params({ token_hash: "h", type: "recovery" })),
    ).toEqual({ ok: false, reason: "invalid_type" });
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
