import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `setObjectiveFocusAction` — Rodada 004D §§6 e 12.
 *
 * O que se prova aqui é o mesmo invariante das demais escritas de domínio: em
 * contexto de organização ambíguo ou indisponível, a RPC **não é chamada**; e
 * tenant, identidade e papel não têm caminho a partir do formulário.
 */

const USER_ID = "33333333-3333-3333-3333-333333333333";
const ORG_A = "11111111-1111-1111-1111-111111111111";
const ORG_B = "22222222-2222-2222-2222-222222222222";
const OBJETIVO = "44444444-4444-4444-4444-444444444444";
const OFERTA = "55555555-5555-5555-5555-555555555555";

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

const { setObjectiveFocusAction } = await import("./focus");

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
  const campos = { objectiveId: OBJETIVO, focus: OFERTA, ...extra };
  for (const [chave, valor] of Object.entries(campos)) data.append(chave, valor);
  return data;
}

function argsDaRpc(): Record<string, unknown> {
  const [, args] = rpc.mock.calls[0] as unknown as [
    string,
    Record<string, unknown>,
  ];
  return args;
}

const ATIVA_A: Linha = { organization_id: ORG_A, role: "owner", status: "ACTIVE" };
const ATIVA_B: Linha = { organization_id: ORG_B, role: "admin", status: "ACTIVE" };

beforeEach(() => {
  memberships = [ATIVA_A];
  organizacao = { id: ORG_A, status: "ACTIVE" };
  erroRpc = null;
  rpc.mockClear();
});

describe("setObjectiveFocusAction — escolha", () => {
  it("prioriza uma oferta e volta para a entrada guiada", async () => {
    const destino = await capturarRedirect(() =>
      setObjectiveFocusAction(undefined, form()),
    );

    expect(destino).toBe("/inicio");

    const args = argsDaRpc();
    expect(args.p_focus_type).toBe("OFFER");
    expect(args.p_focus_offer_id).toBe(OFERTA);
    expect(args.p_objective_id).toBe(OBJETIVO);
    expect(args.p_organization_id).toBe(ORG_A);
    expect(args.p_user_id).toBe(USER_ID);
  });

  /**
   * O formulário envia uma única resposta. "Negócio como um todo" não pode
   * chegar ao banco acompanhado de uma oferta — é um estado que a constraint
   * recusaria, e o usuário receberia erro de banco em vez de confirmação.
   */
  it("prioriza o negócio sem carregar oferta junto", async () => {
    await capturarRedirect(() =>
      setObjectiveFocusAction(undefined, form({ focus: "BUSINESS" })),
    );

    const args = argsDaRpc();
    expect(args.p_focus_type).toBe("BUSINESS");
    expect(args.p_focus_offer_id).toBeNull();
  });

  it("recusa envio sem escolha antes de ir ao banco", async () => {
    const state = await setObjectiveFocusAction(undefined, form({ focus: "" }));

    expect(rpc).not.toHaveBeenCalled();
    expect(state.erro).toBeDefined();
  });

  it("não chama a RPC sem objetivo identificado", async () => {
    const state = await setObjectiveFocusAction(
      undefined,
      form({ objectiveId: "" }),
    );

    expect(rpc).not.toHaveBeenCalled();
    expect(state.message).toBeDefined();
  });
});

describe("setObjectiveFocusAction — contexto de organização", () => {
  it("não chama a RPC quando a conta participa de mais de um negócio", async () => {
    memberships = [ATIVA_A, ATIVA_B];

    const state = await setObjectiveFocusAction(undefined, form());

    expect(rpc).not.toHaveBeenCalled();
    expect(state.message).toContain("mais de um negócio");
    expect(state.message).not.toContain(ORG_A);
    expect(state.message).not.toContain("owner");
  });

  it("conta membership INACTIVE ao detectar múltiplos negócios", async () => {
    memberships = [ATIVA_A, { ...ATIVA_B, status: "INACTIVE" }];

    await setObjectiveFocusAction(undefined, form());

    expect(rpc).not.toHaveBeenCalled();
  });

  it("não chama a RPC com o negócio indisponível", async () => {
    organizacao = { id: ORG_A, status: "INACTIVE" };

    const state = await setObjectiveFocusAction(undefined, form());

    expect(rpc).not.toHaveBeenCalled();
    expect(state.message).toContain("não está disponível");
  });

  it("manda criar o negócio quando não há organização", async () => {
    memberships = [];

    const destino = await capturarRedirect(() =>
      setObjectiveFocusAction(undefined, form()),
    );

    expect(destino).toBe("/conta");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("ignora organizationId vindo do formulário", async () => {
    await capturarRedirect(() =>
      setObjectiveFocusAction(undefined, form({ organizationId: ORG_B })),
    );

    const args = argsDaRpc();
    expect(args.p_organization_id).toBe(ORG_A);
    expect(JSON.stringify(args)).not.toContain(ORG_B);
  });
});

describe("setObjectiveFocusAction — erros do banco", () => {
  it("traduz 42501 sem vazar detalhe", async () => {
    erroRpc = { code: "42501" };

    const state = await setObjectiveFocusAction(undefined, form());

    expect(state.message).toContain("administra o negócio");
    expect(state.message).not.toContain("42501");
  });

  it("explica que oferta arquivada não pode ser priorizada", async () => {
    erroRpc = { code: "55000" };

    const state = await setObjectiveFocusAction(undefined, form());

    expect(state.message).toContain("arquivada");
  });

  it("não vaza erro desconhecido do Postgres", async () => {
    erroRpc = { code: "23514" };

    const state = await setObjectiveFocusAction(undefined, form());

    expect(state.message).not.toContain("23514");
    expect(state.message).toContain("Tente novamente");
  });
});
