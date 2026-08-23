/**
 * Reconhecimento de sessão de recuperação a partir das claims do JWT.
 *
 * Uma sessão criada por link de recuperação e uma sessão criada por login
 * comum são, do ponto de vista de "há usuário autenticado", indistinguíveis.
 * A diferença está em `amr` (Authentication Methods References), que o
 * Supabase Auth preenche com o método que originou a sessão.
 *
 * Por que isso importa: a tela de nova senha troca a senha sem pedir a senha
 * atual. Se ela se contentasse com "há sessão", qualquer sessão comum — a de
 * um dispositivo esquecido aberto, por exemplo — viraria caminho para tomar a
 * conta. O direito de trocar a senha tem de vir do token que chegou por
 * e-mail.
 *
 * ## Divergência observada no provider (001F)
 *
 * A documentação do Supabase lista `recovery` entre os métodos possíveis de
 * `amr`. **O projeto hospedado não emite esse valor.** Medido em 2026-08-23
 * contra GoTrue `v2.195.0`, tanto no JWT quanto na origem
 * (`auth.mfa_amr_claims.authentication_method`):
 *
 * | origem da sessão                  | método registrado |
 * | --------------------------------- | ----------------- |
 * | login por senha                   | `password`        |
 * | `verifyOtp({ type: 'recovery' })` | `otp`             |
 * | `verifyOtp({ type: 'signup' })`   | `otp`             |
 *
 * Consequências, que são fato e não escolha deste módulo:
 *
 * 1. sessão de login por senha é distinguida com segurança — é o ataque que o
 *    mandato nomeia, e ele fica bloqueado;
 * 2. sessão de recuperação **não** é distinguível de outra sessão nascida de
 *    OTP por e-mail (hoje, a confirmação de cadastro) com o contrato vigente.
 *
 * O predicado abaixo implementa a regra mais estrita que o contrato real
 * suporta: exige método de OTP por e-mail **e** recusa a presença de
 * `password`. Ele aceita `recovery` para o dia em que o provider passar a
 * emiti-lo, sem depender disso para funcionar.
 *
 * Isso é mais fraco do que o mandato 001F §4.4 pede ao nomear `recovery`, e
 * está registrado como divergência aberta para decisão do GPT — não como
 * equivalência assumida.
 */

/** Método documentado pelo Supabase para sessão nascida de recuperação. */
export const RECOVERY_AMR_METHOD = "recovery";

/**
 * Métodos que indicam sessão nascida de um OTP por e-mail.
 *
 * `otp` é o que o provider emite hoje para recovery; `recovery` é o que a
 * documentação promete. Aceitar os dois evita que o fluxo quebre em silêncio
 * quando o Auth for atualizado.
 */
export const EMAIL_OTP_AMR_METHODS: readonly string[] = [
  RECOVERY_AMR_METHOD,
  "otp",
];

/**
 * Método que marca a sessão como nascida de login por senha.
 *
 * Presença deste método é recusa incondicional: é exatamente a sessão que o
 * mandato proíbe de usar a tela de nova senha como atalho.
 */
export const PASSWORD_AMR_METHOD = "password";

/**
 * Entrada de `amr` no formato detalhado do Supabase.
 *
 * A claim aceita dois formatos: `string[]` (RFC-8176) e objetos com
 * `{ method, timestamp }`. Os dois são tratados porque o formato efetivo
 * depende da versão do Auth, e isso não deve virar dependência silenciosa de
 * infraestrutura.
 */
type AmrEntry = { method?: unknown };

function methodOf(entry: unknown): string | null {
  if (typeof entry === "string") return entry;

  if (typeof entry === "object" && entry !== null) {
    const { method } = entry as AmrEntry;
    if (typeof method === "string") return method;
  }

  return null;
}

/**
 * Lista os métodos declarados em `amr`, em qualquer um dos dois formatos.
 *
 * Valor ausente ou malformado devolve lista vazia — nunca lança. Uma claim
 * corrompida deve resultar em "não autoriza", não em erro 500 numa rota
 * pública.
 */
export function readAmrMethods(amr: unknown): string[] {
  if (!Array.isArray(amr)) return [];

  return amr
    .map(methodOf)
    .filter((method): method is string => method !== null);
}

/**
 * A sessão declara literalmente o método `recovery`?
 *
 * Hoje sempre `false` no projeto hospedado. Existe para que a diferença entre
 * "o provider promete" e "o provider entrega" continue mensurável em teste, em
 * vez de virar folclore.
 */
export function hasRecoveryMethod(amr: unknown): boolean {
  return readAmrMethods(amr).includes(RECOVERY_AMR_METHOD);
}

/**
 * A sessão pode redefinir a senha sem informar a senha atual?
 *
 * Verdadeiro apenas para sessão nascida de OTP por e-mail e sem `password` no
 * histórico de métodos.
 */
export function grantsPasswordReset(amr: unknown): boolean {
  const methods = readAmrMethods(amr);

  if (methods.includes(PASSWORD_AMR_METHOD)) return false;

  return methods.some((method) => EMAIL_OTP_AMR_METHODS.includes(method));
}
