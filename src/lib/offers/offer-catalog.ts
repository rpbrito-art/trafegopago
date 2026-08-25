import "server-only";

import { resolveOrganizationContext } from "@/lib/business/organization-context";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { isOfferType, isPriceMode, type BusinessOffer } from "./offers";

/**
 * Leitura do catálogo de ofertas, pelo caminho do usuário.
 *
 * Usa o cliente com a sessão do visitante — nunca o privilegiado. A RLS é a
 * autorização: se uma linha chega aqui, é porque o usuário pode vê-la. Ler com
 * `service_role` e filtrar em TypeScript trocaria uma garantia do banco por
 * uma condição que qualquer refatoração futura pode apagar sem erro visível
 * (`SECURITY_MODEL.md` §§4–5) — mesmo raciocínio de `growth/objective-state.ts`.
 *
 * Qual negócio está sendo lido vem de `resolveOrganizationContext()`, e não de
 * `ativas[0]`. Em contexto ambíguo o catálogo **não é consultado**: mostrar as
 * ofertas de um negócio escolhido pela ordem do banco é pior do que não mostrar
 * nada (auditoria 004B §6.1).
 */

export type OffersState =
  /** Sem organização ainda: o próximo passo é criar o negócio. */
  | { kind: "sem-organizacao" }
  /** O negócio existe, mas não está acessível agora. */
  | { kind: "negocio-indisponivel" }
  /** Mais de um negócio: sem seletor, nenhuma escolha implícita. */
  | { kind: "multiplos-negocios"; quantidade: number }
  | { kind: "erro-tecnico" }
  | {
      kind: "pronto";
      organizationId: string;
      podeGerenciar: boolean;
      /** Somente ofertas ativas. Arquivadas continuam no banco, fora da lista. */
      ofertas: BusinessOffer[];
      /**
       * `business_profiles.primary_offer`, quando ainda não há oferta
       * estruturada.
       *
       * Sugestão editável, nunca fato: só vira oferta depois de ação explícita
       * do usuário (mandato §8). Some assim que existir a primeira oferta.
       */
      sugestaoLegada: string | null;
    };

/** Papéis que podem manter o catálogo. */
const PAPEIS_QUE_GERENCIAM = ["owner", "admin"];

export async function getOffersState(): Promise<OffersState> {
  const supabase = await createSupabaseServerClient();

  const contexto = await resolveOrganizationContext({ supabase });

  if (contexto.kind === "erro-tecnico") return { kind: "erro-tecnico" };
  if (contexto.kind === "sem-organizacao") return { kind: "sem-organizacao" };
  if (contexto.kind === "organizacao-indisponivel") {
    return { kind: "negocio-indisponivel" };
  }
  if (contexto.kind === "multiplas-organizacoes") {
    // Nenhuma consulta ao catálogo acontece aqui.
    return { kind: "multiplos-negocios", quantidade: contexto.membershipCount };
  }

  const { organizationId } = contexto;

  // A UI esconde o formulário de quem não pode; a autorização de verdade está
  // na RPC, que lê papel e status do banco. Esconder não é autorizar.
  const podeGerenciar = PAPEIS_QUE_GERENCIAM.includes(contexto.role);

  const { data: ofertas, error: erroOfertas } = await supabase
    .from("business_offers")
    .select("id, created_at")
    .eq("organization_id", organizationId)
    .eq("status", "ACTIVE")
    .order("created_at", { ascending: true });

  if (erroOfertas) return { kind: "erro-tecnico" };

  const linhas = ofertas ?? [];

  if (linhas.length === 0) {
    return {
      kind: "pronto",
      organizationId,
      podeGerenciar,
      ofertas: [],
      sugestaoLegada: await lerOfertaLegada(supabase, organizationId),
    };
  }

  // Duas consultas em vez de um embed: a FK entre versões e ofertas é composta
  // `(organization_id, offer_id)`, e depender do PostgREST inferir esse
  // relacionamento tornaria a leitura refém de um detalhe de introspecção.
  const { data: versoes, error: erroVersoes } = await supabase
    .from("business_offer_versions")
    .select(
      "offer_id, name, offer_type, description, value_proposition, price_mode, price_min_minor, price_max_minor, currency",
    )
    .eq("organization_id", organizationId)
    .in(
      "offer_id",
      linhas.map((linha) => linha.id as string),
    )
    .is("superseded_at", null);

  if (erroVersoes) return { kind: "erro-tecnico" };

  const correntePorOferta = new Map<string, Record<string, unknown>>();
  for (const versao of versoes ?? []) {
    correntePorOferta.set(versao.offer_id as string, versao);
  }

  const resolvidas: BusinessOffer[] = [];

  for (const linha of linhas) {
    const corrente = correntePorOferta.get(linha.id as string);

    // Oferta sem versão corrente não existe no fluxo normal — a RPC cria as
    // duas na mesma transação. Se aparecer, é dado inconsistente: omitir a
    // linha é melhor do que renderizar uma oferta sem nome nem preço.
    if (!corrente) continue;

    const resolvida = toOffer(linha.id as string, linha.created_at as string, corrente);

    // Taxonomia desconhecida não vira `as OfferType`. Um cast aqui faria a
    // tela renderizar `undefined` como rótulo; devolver erro técnico é honesto
    // e visível.
    if (!resolvida) return { kind: "erro-tecnico" };

    resolvidas.push(resolvida);
  }

  return {
    kind: "pronto",
    organizationId,
    podeGerenciar,
    ofertas: resolvidas,
    sugestaoLegada: null,
  };
}

function toOffer(
  id: string,
  createdAt: string,
  row: Record<string, unknown>,
): BusinessOffer | null {
  if (!isOfferType(row.offer_type) || !isPriceMode(row.price_mode)) return null;

  return {
    id,
    name: String(row.name ?? ""),
    offerType: row.offer_type,
    description: texto(row.description),
    valueProposition: texto(row.value_proposition),
    priceMode: row.price_mode,
    priceMinMinor: numero(row.price_min_minor),
    priceMaxMinor: numero(row.price_max_minor),
    currency: typeof row.currency === "string" ? row.currency : "BRL",
    createdAt,
  };
}

/**
 * O campo legado do perfil, lido como sugestão.
 *
 * Falha de leitura devolve `null`: não ter sugestão é uma tela um pouco menos
 * conveniente, enquanto derrubar o catálogo inteiro por causa dela seria
 * desproporcional.
 */
async function lerOfertaLegada(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  organizationId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("business_profiles")
    .select("primary_offer")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error || !data) return null;

  return texto(data.primary_offer);
}

function texto(valor: unknown): string | null {
  return typeof valor === "string" && valor.length > 0 ? valor : null;
}

/**
 * `bigint` do Postgres chega como número ou string conforme o driver. Os dois
 * casos são aceitos; qualquer outra coisa vira ausência, nunca `NaN` — que a
 * formatação exibiria como preço.
 */
function numero(valor: unknown): number | null {
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : null;

  if (typeof valor === "string" && /^[0-9]+$/.test(valor)) {
    const convertido = Number(valor);
    return Number.isSafeInteger(convertido) ? convertido : null;
  }

  return null;
}
