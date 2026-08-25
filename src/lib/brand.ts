/**
 * Nome canônico do produto.
 *
 * Decisão: `rodadas/gpt/DECISAO_NOME_PRODUTO_QUORON.md`. `Tráfego Pago` deixou
 * de ser marca e permanece apenas como identificador técnico legado — repo,
 * pasta local e project ref do Supabase continuam com o nome antigo de
 * propósito, porque renomeá-los quebraria remotes, automações e branches
 * ativas sem nenhum ganho de produto.
 *
 * Existe como constante compartilhada, e não como literal repetido em cada
 * `metadata`, para que a próxima mudança de marca seja uma edição e não uma
 * caçada.
 */
export const APP_NAME = "Quoron";

/** Título de uma página, no formato usado em todo o produto. */
export function pageTitle(secao: string): string {
  return `${secao} — ${APP_NAME}`;
}
