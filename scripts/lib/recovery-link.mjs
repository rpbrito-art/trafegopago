/**
 * Classificação do link que chega no e-mail de recuperação.
 *
 * Existe como módulo próprio porque a versão embutida no smoke errou: ela
 * comparava o host apenas com o da aplicação, então o domínio do **próprio
 * projeto Supabase** caía em "rastreador de terceiro" e produzia um
 * diagnóstico falso. Separado e testado, o erro fica visível antes de custar
 * um envio de e-mail.
 *
 * Três formas possíveis, que exigem reações diferentes:
 *
 * 1. `ssr` — `<SiteURL>/auth/confirm?token_hash=...&type=recovery`.
 *    É o que o template versionado emite e o que a 001F precisa provar.
 *
 * 2. `confirmation-url-nativa` — `<project-ref>.supabase.co/auth/v1/verify?...`.
 *    Link **legítimo** do próprio Supabase, emitido quando o template efetivo
 *    é o padrão (`{{ .ConfirmationURL }}`). Não é ataque nem terceiro: é sinal
 *    de que o template customizado não está sendo aplicado ao envio.
 *
 * 3. `terceiro` — qualquer outro host. Tipicamente click tracking do provedor
 *    SMTP, que faz o `token_hash` transitar por fora do Supabase e da
 *    aplicação.
 */

export const LINK_SSR = "ssr";
export const LINK_CONFIRMATION_URL_NATIVA = "confirmation-url-nativa";
export const LINK_TERCEIRO = "terceiro";

/**
 * Classifica o link e extrai o que as provas precisam saber sobre ele.
 *
 * A comparação de host é por **igualdade exata**, nunca por sufixo: um teste
 * do tipo `host.endsWith(".supabase.co")` aceitaria
 * `projeto.supabase.co.dominio-de-terceiro.com` como se fosse o provider.
 *
 * Lança quando o valor não é uma URL — o chamador decide o que dizer ao
 * operador.
 */
export function classificarLinkRecovery(valor, { appUrl, supabaseUrl }) {
  const url = new URL(valor);
  const hostApp = new URL(appUrl).host;
  const hostSupabase = new URL(supabaseUrl).host;

  const tipo =
    url.host === hostApp
      ? LINK_SSR
      : url.host === hostSupabase
        ? LINK_CONFIRMATION_URL_NATIVA
        : LINK_TERCEIRO;

  return {
    tipo,
    host: url.host,
    path: url.pathname,
    busca: url.search,
    type: url.searchParams.get("type"),
    temTokenHash: Boolean(url.searchParams.get("token_hash")),
    temNext: url.searchParams.has("next"),
  };
}
