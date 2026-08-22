import { sanitizeRedirect } from "./redirect";

/**
 * Tipos de OTP por e-mail aceitos pelo endpoint de confirmação.
 *
 * Deliberadamente restrito ao que a Rodada 001B entrega: confirmação de
 * cadastro. `recovery`, `invite`, `magiclink` e `email_change` estão fora de
 * escopo e devem ser rejeitados — aceitá-los abriria fluxos de autenticação que
 * o produto ainda não implementa nem testa.
 */
export const ALLOWED_EMAIL_OTP_TYPES = ["signup", "email"] as const;

export type AllowedEmailOtpType = (typeof ALLOWED_EMAIL_OTP_TYPES)[number];

export function isAllowedEmailOtpType(
  value: string | null | undefined,
): value is AllowedEmailOtpType {
  return (
    typeof value === "string" &&
    (ALLOWED_EMAIL_OTP_TYPES as readonly string[]).includes(value)
  );
}

/** Motivo da recusa. Nunca é ecoado ao usuário com o valor recebido. */
export type ConfirmRejectionReason = "missing_token_hash" | "invalid_type";

export type ParsedConfirmRequest =
  | { ok: true; tokenHash: string; type: AllowedEmailOtpType; next: string }
  | { ok: false; reason: ConfirmRejectionReason };

/**
 * Limite defensivo para o `token_hash`. O valor real é bem menor; o teto existe
 * só para não repassar payload arbitrário ao Supabase.
 */
const MAX_TOKEN_HASH_LENGTH = 512;

/**
 * Lê apenas os parâmetros esperados de `/auth/confirm`.
 *
 * Qualquer outro parâmetro da URL é ignorado, e `next` passa pela allowlist de
 * redirect antes de ser devolvido — o chamador nunca precisa decidir se o
 * destino é seguro.
 */
export function parseConfirmRequest(
  searchParams: URLSearchParams,
): ParsedConfirmRequest {
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  if (
    typeof tokenHash !== "string" ||
    tokenHash.length === 0 ||
    tokenHash.length > MAX_TOKEN_HASH_LENGTH
  ) {
    return { ok: false, reason: "missing_token_hash" };
  }

  if (!isAllowedEmailOtpType(type)) {
    return { ok: false, reason: "invalid_type" };
  }

  return {
    ok: true,
    tokenHash,
    type,
    next: sanitizeRedirect(searchParams.get("next")),
  };
}
