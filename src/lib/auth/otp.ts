import { sanitizeRedirect } from "./redirect";
import { ROUTES } from "./routes";

/**
 * Tipos de OTP por e-mail aceitos pelo endpoint de confirmação.
 *
 * `signup`/`email` vieram da Rodada 001B (confirmação de cadastro);
 * `recovery` entra na 001F para o fluxo de nova senha. A lista continua sendo
 * uma allowlist fechada: `invite`, `magiclink` e `email_change` seguem
 * rejeitados — aceitá-los abriria fluxos de autenticação que o produto ainda
 * não implementa nem testa.
 */
export const ALLOWED_EMAIL_OTP_TYPES = ["signup", "email", "recovery"] as const;

/**
 * Tipo cujo destino final é imposto pela aplicação, e não negociado pela URL.
 */
export const RECOVERY_OTP_TYPE = "recovery" as const;

/**
 * Destino único de uma confirmação de recovery bem-sucedida.
 *
 * Não passa por `sanitizeRedirect`: não há nada a negociar. Um link de
 * recovery cria uma sessão com poder de trocar a senha, e deixar o próprio
 * e-mail escolher para onde essa sessão é entregue — ainda que dentro da
 * allowlist — transformaria o token em um atalho para qualquer rota da
 * aplicação. O destino é sempre a tela de nova senha.
 */
export const RECOVERY_DESTINATION: string = ROUTES.resetPassword;

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
 * destino é seguro. Em `recovery`, `next` é descartado por completo: ver
 * `RECOVERY_DESTINATION`.
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
    next:
      type === RECOVERY_OTP_TYPE
        ? RECOVERY_DESTINATION
        : sanitizeRedirect(searchParams.get("next")),
  };
}
