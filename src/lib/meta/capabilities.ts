/**
 * Capacidades da conexão Meta — o que ela consegue fazer *de fato*.
 *
 * A 003A guardava uma conexão inteira como `ACTIVE` ou nada. Isso não descreve
 * a realidade: o usuário pode conceder o Instagram e recusar a conta de
 * anúncios, e o produto precisa seguir funcionando no caminho orgânico
 * (`GROWTH_INTELLIGENCE_CANONICAL.md` §7 e §12 — mídia paga é capacidade, não
 * obrigação).
 *
 * Duas regras governam este arquivo:
 *
 * 1. **A fonte é `granted_scopes`, nunca a configuração pretendida.** O que
 *    pedimos no painel Meta é intenção; o que o usuário concedeu é fato. Só o
 *    segundo decide (mandato 003B §4.3).
 * 2. **Faltar `ads_read` não é erro.** É a ausência de uma capacidade
 *    opcional, e o vocabulário abaixo torna isso representável sem colapsar em
 *    "conexão quebrada".
 *
 * Sem I/O e sem `server-only`: é uma função pura sobre a lista de escopos, e a
 * tela precisa poder descrever o que está disponível.
 */

/**
 * Escopos do caminho **Instagram API with Facebook Login**, revalidados pelo
 * GPT em 2026-08-24 (mandato 003B §2).
 *
 * `instagram_business_*` pertence ao caminho Instagram Login /
 * `graph.instagram.com` e deliberadamente **não** aparece aqui: trocar de
 * caminho é decisão arquitetural, não detalhe de implementação.
 */
export const META_SCOPES = {
  /** Listar as Páginas que a pessoa administra. */
  pagesShowList: "pages_show_list",
  /** Ler engajamento da Página — exigido pelos Insights do Instagram. */
  pagesReadEngagement: "pages_read_engagement",
  /** Metadados da conta profissional do Instagram. */
  instagramBasic: "instagram_basic",
  /** Insights da conta profissional. */
  instagramManageInsights: "instagram_manage_insights",
  /** Leitura de contas de anúncios. Opcional, read-only. */
  adsRead: "ads_read",
} as const;

export type MetaCapability =
  /** Descobrir Páginas e a conta profissional do Instagram vinculada. */
  | "instagram_discovery"
  /** Ler métricas da conta profissional — o que a Fase 4 vai consumir. */
  | "instagram_insights"
  /** Descobrir contas de anúncios. Opcional. */
  | "ads_discovery";

/**
 * Escopos exigidos por capacidade.
 *
 * `ads_management` **não** aparece em nenhuma linha, de propósito. A
 * documentação de Insights registra que o papel sobre a Página vindo do
 * Business Manager *pode* exigi-lo; isso é hipótese a provar no E2E, e
 * transformá-la em requisito fixo aqui pediria permissão de escrita para uma
 * rodada que só lê (mandato 003B §2 e §6).
 */
const ESCOPOS_POR_CAPACIDADE: Record<MetaCapability, readonly string[]> = {
  instagram_discovery: [META_SCOPES.pagesShowList, META_SCOPES.instagramBasic],
  instagram_insights: [
    META_SCOPES.pagesShowList,
    META_SCOPES.pagesReadEngagement,
    META_SCOPES.instagramBasic,
    META_SCOPES.instagramManageInsights,
  ],
  ads_discovery: [META_SCOPES.adsRead],
};

export type MetaCapabilities = Record<MetaCapability, boolean>;

/** Escopos que faltam para uma capacidade, na ordem em que foram declarados. */
export function missingScopesFor(
  grantedScopes: readonly string[],
  capability: MetaCapability,
): string[] {
  const concedidos = new Set(grantedScopes);
  return ESCOPOS_POR_CAPACIDADE[capability].filter((s) => !concedidos.has(s));
}

export function hasCapability(
  grantedScopes: readonly string[],
  capability: MetaCapability,
): boolean {
  return missingScopesFor(grantedScopes, capability).length === 0;
}

/** Todas as capacidades de uma vez, para a tela e para o log de diagnóstico. */
export function evaluateCapabilities(
  grantedScopes: readonly string[],
): MetaCapabilities {
  return {
    instagram_discovery: hasCapability(grantedScopes, "instagram_discovery"),
    instagram_insights: hasCapability(grantedScopes, "instagram_insights"),
    ads_discovery: hasCapability(grantedScopes, "ads_discovery"),
  };
}
