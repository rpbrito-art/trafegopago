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

/**
 * Mensagem neutra do pedido de recuperação.
 *
 * É a mesma resposta para e-mail cadastrado e não cadastrado. O produto não
 * pode confirmar a existência de uma conta a quem só digitou um endereço.
 */
export const PASSWORD_RESET_REQUESTED =
  "Se houver uma conta com esse e-mail, enviaremos as instruções de recuperação.";

/**
 * Mensagem para quem chega à tela de nova senha sem sessão de recovery válida.
 *
 * Não distingue "link expirado" de "link já usado" de "nunca houve link": os
 * três levam ao mesmo lugar, que é pedir de novo.
 */
export const RECOVERY_SESSION_REQUIRED =
  "Este link de recuperação não é mais válido. Peça um novo para redefinir sua senha.";

/**
 * Mensagem para quando a senha mudou mas o logout global falhou.
 *
 * A troca já aconteceu — repetir o formulário seria mentira. O que resta é uma
 * consequência real que o usuário precisa saber: sessões abertas em outros
 * aparelhos podem continuar valendo. Esconder isso para deixar a tela mais
 * limpa violaria a regra de nunca esconder risco
 * (`GROWTH_INTELLIGENCE_CANONICAL.md` §2.2), e a frase termina no que ele pode
 * fazer a respeito (§2.1).
 */
export const PASSWORD_CHANGED_SESSIONS_KEPT =
  "Sua senha foi alterada, mas não conseguimos encerrar as sessões abertas em outros aparelhos. Entre com a nova senha e saia dos outros dispositivos.";

/**
 * Mensagem para falha ao gravar a nova senha.
 *
 * Diferente do login, aqui o usuário já provou a posse do e-mail: dizer que a
 * senha é fraca ou igual à anterior é acionável e não revela nada sobre a
 * existência de outras contas.
 */
export function describePasswordUpdateError(error: AuthErrorLike): string {
  if (error.code === "weak_password") {
    return "Escolha uma senha mais forte.";
  }

  if (error.code === "same_password") {
    return "A nova senha precisa ser diferente da anterior.";
  }

  if (error.code === "reauthentication_needed") {
    return RECOVERY_SESSION_REQUIRED;
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
