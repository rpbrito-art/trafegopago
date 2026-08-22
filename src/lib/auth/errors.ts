/**
 * Tradução de erros do Supabase Auth em mensagens seguras para a UI.
 *
 * Duas regras governam este módulo (`SECURITY_MODEL.md` §15):
 *
 * 1. Nenhuma mensagem pode revelar se um e-mail existe na base. Falha de login
 *    é sempre a mesma frase, qualquer que seja a causa real.
 * 2. Nenhuma mensagem repassa texto cru do provider, que pode conter detalhe
 *    interno ou o próprio valor enviado.
 */

/** Mensagem única para qualquer falha de login. */
export const GENERIC_SIGN_IN_ERROR =
  "E-mail ou senha inválidos. Verifique os dados e tente novamente.";

/** Mensagem padrão para falhas não mapeadas. */
export const GENERIC_ERROR =
  "Não foi possível concluir a operação. Tente novamente em instantes.";

/**
 * Subconjunto de `AuthError` de que precisamos. Evita acoplar este módulo — e
 * seus testes — à classe concreta do SDK.
 */
export type AuthErrorLike = {
  code?: string | null;
  status?: number | null;
};

/**
 * Mensagem para falha de login.
 *
 * Só diferencia o caso em que o próprio Supabase já enviou o e-mail de
 * confirmação e o usuário ainda não clicou: aí a informação é acionável e não
 * constitui enumeração de contas além do que o cadastro já expõe.
 */
export function describeSignInError(error: AuthErrorLike): string {
  if (error.code === "email_not_confirmed") {
    return "Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.";
  }

  if (isRateLimited(error)) {
    return "Muitas tentativas em pouco tempo. Aguarde alguns minutos.";
  }

  return GENERIC_SIGN_IN_ERROR;
}

/**
 * Mensagem para falha de cadastro.
 *
 * `email_exists`/`user_already_exists` NÃO são repassados: o fluxo de cadastro
 * responde igual para e-mail novo e e-mail já cadastrado, e o Supabase se
 * encarrega de avisar o dono real do endereço por e-mail.
 */
export function describeSignUpError(error: AuthErrorLike): string {
  if (error.code === "weak_password") {
    return "Escolha uma senha mais forte.";
  }

  if (error.code === "email_address_invalid") {
    return "Informe um e-mail válido.";
  }

  if (error.code === "signup_disabled" || error.code === "email_provider_disabled") {
    return "Cadastro indisponível no momento.";
  }

  if (isRateLimited(error)) {
    return "Muitas tentativas em pouco tempo. Aguarde alguns minutos.";
  }

  return GENERIC_ERROR;
}

export function isRateLimited(error: AuthErrorLike): boolean {
  return (
    error.status === 429 ||
    error.code === "over_request_rate_limit" ||
    error.code === "over_email_send_rate_limit"
  );
}

/**
 * Códigos que indicam e-mail já cadastrado.
 *
 * Exportado para os testes provarem que nenhum deles vira mensagem específica
 * na UI — a existência da conta não pode vazar por resposta de cadastro.
 */
export const ACCOUNT_ENUMERATION_CODES: readonly string[] = [
  "email_exists",
  "user_already_exists",
  "identity_already_exists",
];
