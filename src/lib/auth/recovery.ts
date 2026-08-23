/**
 * Reconhecimento de sessão de recuperação a partir das claims do JWT.
 *
 * Uma sessão criada por link de recuperação e uma sessão criada por login
 * comum são, do ponto de vista de "há usuário autenticado", indistinguíveis.
 * A diferença está em `amr` (Authentication Methods References), que o
 * Supabase Auth preenche com o método que originou a sessão e o instante em
 * que ele foi usado.
 *
 * Por que isso importa: a tela de nova senha troca a senha sem pedir a senha
 * atual. Se ela se contentasse com "há sessão", qualquer sessão comum — a de
 * um dispositivo esquecido aberto, por exemplo — viraria caminho para tomar a
 * conta. O direito de trocar a senha tem de vir do token que chegou por
 * e-mail, e tem de ser recente.
 *
 * ## O contrato real do provider (Correção 001F-01)
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
 * A Correção 001F-01 §2 decidiu não introduzir hook, tabela, cookie assinado
 * ou admin API só para separar `recovery` de outros OTPs nesta fase, e
 * substituiu o requisito literal por um predicado que o provider consegue
 * sustentar: **posse recente do e-mail, provada por OTP, sem senha no
 * histórico da sessão**.
 *
 * O que a recência acrescenta: sem ela, uma sessão nascida da confirmação de
 * cadastro autorizaria a troca de senha indefinidamente, porque `otp` fica no
 * `amr` enquanto a sessão for renovada. Com ela, a janela de autorização é a
 * do link que acabou de ser usado.
 *
 * ## Residual conscientemente aceito
 *
 * Uma sessão recém-nascida de outro OTP por e-mail — hoje, só a confirmação de
 * cadastro — satisfaz o predicado. Não há escalada material: essa sessão já
 * prova posse recente da caixa postal do próprio usuário, que é exatamente o
 * fator que o recovery usa. Se magic link, phone OTP, invite, social login ou
 * outro método forem habilitados, **este guard tem de ser reaberto antes**
 * (Correção 001F-01 §3.1) — `otp` deixaria de significar só posse do e-mail.
 *
 * ## Falha fechada
 *
 * `amr` sem timestamp utilizável não autoriza. Se o provider passar a emitir
 * o formato RFC-8176 (lista de strings, sem instante), o fluxo nega em vez de
 * abrir — e o smoke de recovery acusa na hora.
 */

/** Método que a documentação do Supabase promete para sessão de recuperação. */
export const RECOVERY_AMR_METHOD = "recovery";

/** Método que o provider realmente emite para OTP por e-mail. */
export const OTP_AMR_METHOD = "otp";

/**
 * Métodos que provam posse do e-mail.
 *
 * `otp` é o que o provider emite hoje para recovery; `recovery` é o que a
 * documentação promete. Aceitar os dois evita que o fluxo quebre em silêncio
 * quando o Auth for atualizado.
 */
export const EMAIL_OTP_AMR_METHODS: readonly string[] = [
  RECOVERY_AMR_METHOD,
  OTP_AMR_METHOD,
];

/**
 * Método que marca a sessão como nascida de login por senha.
 *
 * Presença deste método é recusa incondicional: é exatamente a sessão que o
 * mandato proíbe de usar a tela de nova senha como atalho.
 */
export const PASSWORD_AMR_METHOD = "password";

/** Idade máxima do método autorizador (Correção 001F-01 §3.6). */
export const MAX_RECOVERY_AMR_AGE_MS = 15 * 60 * 1000;

/**
 * Tolerância para relógio do Auth adiantado em relação ao da aplicação.
 *
 * Sem isso, alguns segundos de deriva entre os dois servidores transformariam
 * um link recém-usado em "timestamp no futuro" e negariam a troca.
 */
export const MAX_RECOVERY_AMR_SKEW_MS = 60 * 1000;

/**
 * Entrada de `amr` já normalizada.
 *
 * `timestampMs` é `null` quando a entrada não declara instante utilizável — o
 * caso do formato RFC-8176 e o de valores corrompidos.
 */
export type AmrEntry = {
  method: string;
  timestampMs: number | null;
};

/**
 * Converte o `timestamp` do Supabase (epoch em **segundos**) para milissegundos.
 *
 * Valor não numérico, não finito ou não positivo devolve `null`: vira "não
 * prova recência", nunca uma data absurda tratada como válida.
 */
function toTimestampMs(timestamp: unknown): number | null {
  if (typeof timestamp !== "number") return null;
  if (!Number.isFinite(timestamp) || timestamp <= 0) return null;

  return timestamp * 1000;
}

function toEntry(entry: unknown): AmrEntry | null {
  // Formato RFC-8176: método sem instante. Continua sendo lido, para que
  // `password` seja detectado, mas nunca autoriza por falta de timestamp.
  if (typeof entry === "string") return { method: entry, timestampMs: null };

  if (typeof entry === "object" && entry !== null) {
    const { method, timestamp } = entry as {
      method?: unknown;
      timestamp?: unknown;
    };

    if (typeof method !== "string") return null;

    return { method, timestampMs: toTimestampMs(timestamp) };
  }

  return null;
}

/**
 * Lê `amr` inteiro, ou devolve `null` se o claim não for utilizável.
 *
 * **Fail-closed por claim, não por entrada** (Correção 001F-02 §3): uma única
 * entrada estruturalmente inválida invalida o claim todo. A versão anterior
 * descartava a entrada ruim e ficava com as boas — de modo que um `amr` misto,
 * com um `otp` recente ao lado de um item corrompido, seguia autorizando a
 * troca de senha. Sanear um claim inesperado até que ele passe é exatamente o
 * oposto do contrato de segurança autorizado.
 *
 * `null` também para não-array e para array vazio: nenhum dos dois prova
 * método de autenticação nenhum.
 *
 * Nunca lança. Claim corrompido deve virar "não autoriza", não erro 500 numa
 * rota pública.
 */
export function readAmrEntries(amr: unknown): AmrEntry[] | null {
  if (!Array.isArray(amr) || amr.length === 0) return null;

  const entries: AmrEntry[] = [];

  for (const bruto of amr) {
    const entry = toEntry(bruto);
    if (entry === null) return null;

    entries.push(entry);
  }

  return entries;
}

/**
 * Só os métodos declarados, para diagnóstico e para as recusas.
 *
 * Claim inutilizável vira lista vazia: quem só quer saber "qual método está
 * aí" não precisa distinguir ausência de corrupção.
 */
export function readAmrMethods(amr: unknown): string[] {
  return (readAmrEntries(amr) ?? []).map((entry) => entry.method);
}

/**
 * A sessão declara literalmente o método `recovery`?
 *
 * Hoje sempre `false` no projeto hospedado. Deixou de ser critério de
 * autorização na Correção 001F-01 §3 e permanece como diagnóstico: mantém
 * mensurável, em teste e no smoke, a diferença entre o que o provider promete
 * e o que ele entrega.
 */
export function hasRecoveryMethod(amr: unknown): boolean {
  return readAmrMethods(amr).includes(RECOVERY_AMR_METHOD);
}

/**
 * A entrada foi usada dentro da janela que autoriza a troca?
 *
 * Aceita até `MAX_RECOVERY_AMR_SKEW_MS` de adiantamento — deriva de relógio
 * entre o Auth e a aplicação — e no máximo `MAX_RECOVERY_AMR_AGE_MS` de idade.
 */
export function isAuthorizingEntryFresh(
  entry: AmrEntry,
  nowMs: number,
): boolean {
  if (entry.timestampMs === null) return false;

  const idadeMs = nowMs - entry.timestampMs;

  return (
    idadeMs <= MAX_RECOVERY_AMR_AGE_MS && idadeMs >= -MAX_RECOVERY_AMR_SKEW_MS
  );
}

/**
 * A sessão pode redefinir a senha sem informar a senha atual?
 *
 * Verdadeiro apenas quando `amr` é bem formado **por inteiro**, **nenhuma**
 * entrada declara `password` e existe uma entrada de OTP por e-mail usada há
 * no máximo 15 minutos. Métodos adicionais bem formados podem coexistir.
 * `nowMs` é injetável para que a janela seja testável sem esperar o relógio.
 */
export function grantsPasswordReset(
  amr: unknown,
  nowMs: number = Date.now(),
): boolean {
  const entries = readAmrEntries(amr);

  if (entries === null) return false;
  if (entries.some((entry) => entry.method === PASSWORD_AMR_METHOD)) {
    return false;
  }

  return entries.some(
    (entry) =>
      EMAIL_OTP_AMR_METHODS.includes(entry.method) &&
      isAuthorizingEntryFresh(entry, nowMs),
  );
}
