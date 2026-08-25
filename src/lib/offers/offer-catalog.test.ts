import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `getOffersState` — Rodada 004C §§7, 8 e 9.5.
 *
 * Três coisas se provam aqui:
 *
 * 1. em contexto de organização ambíguo, o catálogo **não é consultado**;
 * 2. a oferta legada do perfil aparece como sugestão e some assim que existir
 *    oferta estruturada — nunca é convertida sozinha;
 * 3. taxonomia desconhecida vira erro visível, não `undefined` na tela.
 */

type Row = Record<string, unknown>;

const ORG_ID = "11111111-1111-1111-1111-111111111111";
const OFFER_ID = "44444444-4444-4444-4444-444444444444";

let memberships: Row[] = [];
let organization: Row | null = null;
let offers: Row[] = [];
let versions: Row[] = [];
let profile: Row | null = null;
let erroEmOfertas = false;

/** Tabelas realmente consultadas, para provar o que **não** é lido. */
const tabelasLidas: string[] = [];

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    from(tabela: string) {
      tabelasLidas.push(tabela);

      if (tabela === "organization_members") {
        const builder = {
          select: () => builder,
          eq: () => builder,
          then(resolve: (r: unknown) => void) {
            resolve({ data: memberships, error: null });
          },
        };
        return builder;
      }

      if (tabela === "business_offers") {
        const builder = {
          select: () => builder,
          eq: () => builder,
          order: () => builder,
          then(resolve: (r: unknown) => void) {
            resolve({
              data: erroEmOfertas ? null : offers,
              error: erroEmOfertas ? { message: "falhou" } : null,
            });
          },
        };
        return builder;
      }

      if (tabela === "business_offer_versions") {
        const builder = {
          select: () => builder,
          eq: () => builder,
          in: () => builder,
          is: () => builder,
          then(resolve: (r: unknown) => void) {
            resolve({ data: versions, error: null });
          },
        };
        return builder;
      }

      const linha = tabela === "organizations" ? organization : profile;

      return {
        select: () => ({
          eq: () => ({ maybeSingle: async () => ({ data: linha, error: null }) }),
        }),
      };
    },
  }),
}));

const { getOffersState } = await import("./offer-catalog");

const MEMBERSHIP_ATIVA: Row = {
  organization_id: ORG_ID,
  role: "owner",
  status: "ACTIVE",
};

const VERSAO_CORRENTE: Row = {
  offer_id: OFFER_ID,
  name: "Corte de cabelo",
  offer_type: "SERVICE",
  description: null,
  value_proposition: "Atendimento no mesmo dia",
  price_mode: "FIXED",
  price_min_minor: 5000,
  price_max_minor: null,
  currency: "BRL",
};

beforeEach(() => {
  memberships = [MEMBERSHIP_ATIVA];
  organization = { id: ORG_ID, status: "ACTIVE" };
  offers = [{ id: OFFER_ID, created_at: "2026-08-25T12:00:00.000Z" }];
  versions = [VERSAO_CORRENTE];
  profile = { primary_offer: "Corte e barba" };
  erroEmOfertas = false;
  tabelasLidas.length = 0;
});

describe("getOffersState — contexto de organização", () => {
  it("não consulta o catálogo quando a conta tem mais de um negócio", async () => {
    memberships = [
      MEMBERSHIP_ATIVA,
      { organization_id: "outra", role: "admin", status: "ACTIVE" },
    ];

    const state = await getOffersState();

    expect(state).toEqual({ kind: "multiplos-negocios", quantidade: 2 });
    expect(tabelasLidas).not.toContain("business_offers");
    expect(tabelasLidas).not.toContain("business_offer_versions");
  });

  it("reporta negócio indisponível sem ler ofertas", async () => {
    organization = { id: ORG_ID, status: "INACTIVE" };

    expect(await getOffersState()).toEqual({ kind: "negocio-indisponivel" });
    expect(tabelasLidas).not.toContain("business_offers");
  });

  it("reporta ausência de organização", async () => {
    memberships = [];

    expect(await getOffersState()).toEqual({ kind: "sem-organizacao" });
  });

  it("falha de leitura vira erro técnico, não catálogo vazio", async () => {
    erroEmOfertas = true;

    expect(await getOffersState()).toEqual({ kind: "erro-tecnico" });
  });
});

describe("getOffersState — catálogo", () => {
  it("resolve a oferta com a versão corrente", async () => {
    const state = await getOffersState();

    expect(state.kind).toBe("pronto");
    if (state.kind !== "pronto") return;

    expect(state.ofertas).toHaveLength(1);
    expect(state.ofertas[0]).toMatchObject({
      id: OFFER_ID,
      name: "Corte de cabelo",
      offerType: "SERVICE",
      priceMode: "FIXED",
      priceMinMinor: 5000,
      valueProposition: "Atendimento no mesmo dia",
      currency: "BRL",
    });
    expect(state.podeGerenciar).toBe(true);
  });

  it("member comum lê o catálogo, mas não gerencia", async () => {
    memberships = [{ ...MEMBERSHIP_ATIVA, role: "member" }];

    const state = await getOffersState();

    expect(state.kind === "pronto" && state.podeGerenciar).toBe(false);
    expect(state.kind === "pronto" && state.ofertas).toHaveLength(1);
  });

  it("aceita bigint devolvido como string", async () => {
    versions = [{ ...VERSAO_CORRENTE, price_min_minor: "5000" }];

    const state = await getOffersState();

    expect(state.kind === "pronto" && state.ofertas[0].priceMinMinor).toBe(5000);
  });

  it("taxonomia desconhecida vira erro técnico em vez de rótulo vazio", async () => {
    versions = [{ ...VERSAO_CORRENTE, price_mode: "NEGOTIABLE" }];

    expect(await getOffersState()).toEqual({ kind: "erro-tecnico" });
  });

  it("omite oferta sem versão corrente em vez de renderizar linha vazia", async () => {
    versions = [];

    const state = await getOffersState();

    expect(state.kind === "pronto" && state.ofertas).toHaveLength(0);
  });
});

describe("getOffersState — campo legado do perfil", () => {
  it("oferece o texto legado como sugestão quando não há oferta estruturada", async () => {
    offers = [];

    const state = await getOffersState();

    expect(state.kind === "pronto" && state.sugestaoLegada).toBe("Corte e barba");
    // Sugestão não é fato: nenhuma oferta foi criada a partir dela.
    expect(state.kind === "pronto" && state.ofertas).toHaveLength(0);
  });

  it("não sugere nada quando já existe oferta estruturada", async () => {
    const state = await getOffersState();

    expect(state.kind === "pronto" && state.sugestaoLegada).toBeNull();
  });

  it("tolera perfil sem oferta legada", async () => {
    offers = [];
    profile = { primary_offer: null };

    const state = await getOffersState();

    expect(state.kind === "pronto" && state.sugestaoLegada).toBeNull();
  });
});
