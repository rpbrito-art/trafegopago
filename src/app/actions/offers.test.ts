import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `saveOfferAction` / `archiveOfferAction` — Rodada 004C §§6 e 12.2.
 *
 * O ponto central é o mesmo da 004B-01: em contexto de organização ambíguo ou
 * indisponível, a RPC **não é chamada**. Escolher com `.limit(1)` gravaria a
 * oferta num negócio que o usuário não selecionou.
 *
 * O segundo ponto é o que o formulário **não** consegue enviar: tenant,
 * identidade, papel e moeda não têm caminho até o SQL.
 */

const USER_ID = "33333333-3333-3333-3333-333333333333";
const ORG_A = "11111111-1111-1111-1111-111111111111";
const ORG_B = "22222222-2222-2222-2222-222222222222";
const OFFER_ID = "44444444-4444-4444-4444-444444444444";

type Linha = { organization_id: string; role: string; status: string };

let memberships: Linha[] = [];
let organizacao: { id: string; status: string } | null = null;
let erroRpc: { code: string } | null = null;

const rpc = vi.fn(async () => ({ data: null, error: erroRpc }));

const privilegedClient = {
  from: vi.fn((tabela: string) => {
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

    const builder = {
      select: () => builder,
      eq: () => builder,
      async maybeSingle() {
        return { data: organizacao, error: null };
      },
    };
    return builder;
  }),
  rpc,
};

vi.mock("@/lib/supabase/privileged", () => ({
  createSupabasePrivilegedClient: () => privilegedClient,
}));

vi.mock("@/lib/auth/session", () => ({
  requireUser: async () => ({ id: USER_ID }),
}));

/** `redirect()` lança no Next; aqui o destino é capturado. */
class RedirectError extends Error {
  constructor(readonly destino: string) {
    super("redirect");
  }
}

vi.mock("next/navigation", () => ({
  redirect: (destino: string) => {
    throw new RedirectError(destino);
  },
}));

const { archiveOfferAction, saveOfferAction } = await import("./offers");

async function capturarRedirect(fn: () => Promise<unknown>) {
  try {
    await fn();
    return null;
  } catch (erro) {
    if (erro instanceof RedirectError) return erro.destino;
    throw erro;
  }
}

function form(extra: Record<string, string> = {}): FormData {
  const data = new FormData();
  const campos = {
    name: "Corte de cabelo",
    offerType: "SERVICE",
    priceMode: "FIXED",
    priceMin: "50,00",
    ...extra,
  };
  for (const [chave, valor] of Object.entries(campos)) data.append(chave, valor);
  return data;
}

const ATIVA_A: Linha = { organization_id: ORG_A, role: "owner", status: "ACTIVE" };
const ATIVA_B: Linha = { organization_id: ORG_B, role: "admin", status: "ACTIVE" };

beforeEach(() => {
  memberships = [ATIVA_A];
  organizacao = { id: ORG_A, status: "ACTIVE" };
  erroRpc = null;
  rpc.mockClear();
});

describe("saveOfferAction — contexto de organização", () => {
  it("salva quando existe exatamente um negócio ativo", async () => {
    const destino = await capturarRedirect(() =>
      saveOfferAction(undefined, form()),
    );

    expect(destino).toBe("/ofertas");
    expect(rpc).toHaveBeenCalledTimes(1);

    const [nome, args] = rpc.mock.calls[0] as unknown as [
      string,
      Record<string, unknown>,
    ];

    expect(nome).toBe("save_business_offer");
    expect(args.p_organization_id).toBe(ORG_A);
    expect(args.p_user_id).toBe(USER_ID);
    expect(args.p_offer_id).toBeNull();
    expect(args.p_price_min_minor).toBe(5000);
  });

  it("não chama a RPC quando a conta participa de mais de um negócio", async () => {
    memberships = [ATIVA_A, ATIVA_B];

    const state = await saveOfferAction(undefined, form());

    expect(rpc).not.toHaveBeenCalled();
    expect(state.message).toContain("mais de um negócio");
    // A mensagem não revela id, papel nem contagem.
    expect(state.message).not.toContain(ORG_A);
    expect(state.message).not.toContain("owner");
  });

  it("conta membership INACTIVE ao detectar múltiplos negócios", async () => {
    memberships = [ATIVA_A, { ...ATIVA_B, status: "INACTIVE" }];

    const state = await saveOfferAction(undefined, form());

    expect(rpc).not.toHaveBeenCalled();
    expect(state.message).toContain("mais de um negócio");
  });

  it("não chama a RPC quando o negócio está indisponível", async () => {
    organizacao = { id: ORG_A, status: "INACTIVE" };

    const state = await saveOfferAction(undefined, form());

    expect(rpc).not.toHaveBeenCalled();
    expect(state.message).toContain("não está disponível");
  });

  it("manda criar o negócio quando não há organização", async () => {
    memberships = [];

    const destino = await capturarRedirect(() =>
      saveOfferAction(undefined, form()),
    );

    expect(destino).toBe("/conta");
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe("saveOfferAction — o que o formulário não consegue enviar", () => {
  it("ignora organizationId vindo do formulário", async () => {
    await capturarRedirect(() =>
      saveOfferAction(undefined, form({ organizationId: ORG_B })),
    );

    const [, args] = rpc.mock.calls[0] as unknown as [
      string,
      Record<string, unknown>,
    ];

    expect(args.p_organization_id).toBe(ORG_A);
    expect(JSON.stringify(args)).not.toContain(ORG_B);
  });

  it("não envia moeda: quem a define é a organização, server-side", async () => {
    await capturarRedirect(() =>
      saveOfferAction(undefined, form({ currency: "USD" })),
    );

    const [, args] = rpc.mock.calls[0] as unknown as [
      string,
      Record<string, unknown>,
    ];

    expect(Object.keys(args)).not.toContain("p_currency");
    expect(JSON.stringify(args)).not.toContain("USD");
  });

  /**
   * `offerId` é a única coisa que vem do cliente — e não é confiada: a RPC só
   * encontra a oferta dentro da organização resolvida aqui.
   */
  it("repassa offerId, mas sempre junto do tenant resolvido no servidor", async () => {
    await capturarRedirect(() =>
      saveOfferAction(undefined, form({ offerId: OFFER_ID })),
    );

    const [, args] = rpc.mock.calls[0] as unknown as [
      string,
      Record<string, unknown>,
    ];

    expect(args.p_offer_id).toBe(OFFER_ID);
    expect(args.p_organization_id).toBe(ORG_A);
  });
});

describe("saveOfferAction — validação e erros", () => {
  it("recusa oferta sem nome antes de ir ao banco", async () => {
    const state = await saveOfferAction(undefined, form({ name: "  " }));

    expect(rpc).not.toHaveBeenCalled();
    expect(state.erros?.name).toBeDefined();
  });

  it("recusa taxonomia desconhecida antes de ir ao banco", async () => {
    const state = await saveOfferAction(undefined, form({ offerType: "SKU" }));

    expect(rpc).not.toHaveBeenCalled();
    expect(state.erros?.offerType).toBeDefined();
  });

  it("traduz 42501 sem vazar detalhe do banco", async () => {
    erroRpc = { code: "42501" };

    const state = await saveOfferAction(undefined, form());

    expect(state.message).toContain("administra o negócio");
    expect(state.message).not.toContain("42501");
  });

  it("explica que oferta arquivada não é revisada", async () => {
    erroRpc = { code: "55000" };

    const state = await saveOfferAction(undefined, form({ offerId: OFFER_ID }));

    expect(state.message).toContain("arquivada");
  });

  it("não vaza erro desconhecido do Postgres", async () => {
    erroRpc = { code: "23514" };

    const state = await saveOfferAction(undefined, form());

    expect(state.message).not.toContain("23514");
    expect(state.message).toContain("Tente novamente");
  });
});

describe("archiveOfferAction", () => {
  it("arquiva a oferta da organização resolvida", async () => {
    const data = new FormData();
    data.append("offerId", OFFER_ID);

    const destino = await capturarRedirect(() =>
      archiveOfferAction(undefined, data),
    );

    expect(destino).toBe("/ofertas");

    const [nome, args] = rpc.mock.calls[0] as unknown as [
      string,
      Record<string, unknown>,
    ];

    expect(nome).toBe("archive_business_offer");
    expect(args.p_offer_id).toBe(OFFER_ID);
    expect(args.p_organization_id).toBe(ORG_A);
  });

  it("não chama a RPC sem oferta identificada", async () => {
    const state = await archiveOfferAction(undefined, new FormData());

    expect(rpc).not.toHaveBeenCalled();
    expect(state.message).toBeDefined();
  });

  it("não arquiva em conta com mais de um negócio", async () => {
    memberships = [ATIVA_A, ATIVA_B];

    const data = new FormData();
    data.append("offerId", OFFER_ID);

    const state = await archiveOfferAction(undefined, data);

    expect(rpc).not.toHaveBeenCalled();
    expect(state.message).toContain("mais de um negócio");
  });
});
