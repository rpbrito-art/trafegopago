import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `setGrowthObjectiveAction` — Correção 004B-01 §§3.3 e 7.
 *
 * O ponto central: em contexto de organização ambíguo ou indisponível, a RPC
 * **não é chamada**. Escolher com `.limit(1)` gravaria o objetivo num negócio
 * que o usuário não selecionou.
 */

const USER_ID = "33333333-3333-3333-3333-333333333333";
const ORG_A = "11111111-1111-1111-1111-111111111111";
const ORG_B = "22222222-2222-2222-2222-222222222222";

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

const { setGrowthObjectiveAction } = await import("./growth");

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
    objectiveType: "LEADS",
    destinationType: "WHATSAPP",
    successEventType: "CONVERSATION_STARTED",
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
  privilegedClient.from.mockClear();
});

describe("contexto único", () => {
  it("chama a RPC com a organização resolvida no servidor", async () => {
    const destino = await capturarRedirect(() =>
      setGrowthObjectiveAction(undefined, form()),
    );

    expect(destino).toBe("/objetivo");
    expect(rpc).toHaveBeenCalledTimes(1);

    const [nome, args] = rpc.mock.calls[0] as unknown as [
      string,
      Record<string, unknown>,
    ];

    expect(nome).toBe("set_active_growth_objective");
    expect(args.p_user_id).toBe(USER_ID);
    expect(args.p_organization_id).toBe(ORG_A);
  });

  it("ignora organizationId enviado pelo formulário", async () => {
    await capturarRedirect(() =>
      setGrowthObjectiveAction(
        undefined,
        form({ organizationId: ORG_B, p_organization_id: ORG_B, role: "owner" }),
      ),
    );

    const [, args] = rpc.mock.calls[0] as unknown as [
      string,
      Record<string, unknown>,
    ];

    expect(args.p_organization_id).toBe(ORG_A);
  });
});

describe("contexto ambíguo ou indisponível não muta nada", () => {
  it("duas memberships: a RPC não é chamada", async () => {
    memberships = [ATIVA_A, ATIVA_B];

    const state = await setGrowthObjectiveAction(undefined, form());

    expect(rpc).not.toHaveBeenCalled();
    expect(state.message).toContain("mais de um negócio");
  });

  it("membership inativa: a RPC não é chamada", async () => {
    memberships = [{ ...ATIVA_A, status: "INACTIVE" }];

    const state = await setGrowthObjectiveAction(undefined, form());

    expect(rpc).not.toHaveBeenCalled();
    expect(state.message).toBeTruthy();
  });

  it("organização indisponível: a RPC não é chamada", async () => {
    organizacao = null;

    const state = await setGrowthObjectiveAction(undefined, form());

    expect(rpc).not.toHaveBeenCalled();
    expect(state.message).toBeTruthy();
  });

  it("sem membership alguma: leva a criar o negócio, sem RPC", async () => {
    memberships = [];

    const destino = await capturarRedirect(() =>
      setGrowthObjectiveAction(undefined, form()),
    );

    expect(destino).toBe("/conta");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("nenhuma mensagem revela id, papel ou nome técnico", async () => {
    memberships = [ATIVA_A, ATIVA_B];

    const state = await setGrowthObjectiveAction(undefined, form());
    const texto = state.message ?? "";

    expect(texto).not.toContain(ORG_A);
    expect(texto).not.toContain(ORG_B);
    expect(texto).not.toContain(USER_ID);
    expect(texto).not.toMatch(/owner|admin|organization_id/i);
  });
});

describe("validação de entrada", () => {
  it("taxonomia desconhecida falha antes de qualquer ida ao banco", async () => {
    const state = await setGrowthObjectiveAction(
      undefined,
      form({ objectiveType: "VENDER_MUITO" }),
    );

    expect(state.erros?.objetivo).toBeTruthy();
    expect(rpc).not.toHaveBeenCalled();
    expect(privilegedClient.from).not.toHaveBeenCalled();
  });

  it("“Outro” sem detalhe é recusado", async () => {
    const state = await setGrowthObjectiveAction(
      undefined,
      form({ objectiveType: "OTHER" }),
    );

    expect(state.erros?.detalhe).toBeTruthy();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("detalhe acima do limite é recusado", async () => {
    const state = await setGrowthObjectiveAction(
      undefined,
      form({ objectiveDetail: "a".repeat(281) }),
    );

    expect(state.erros?.detalhe).toBeTruthy();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("detalhe em branco vira null, não string vazia", async () => {
    await capturarRedirect(() =>
      setGrowthObjectiveAction(undefined, form({ objectiveDetail: "   " })),
    );

    const [, args] = rpc.mock.calls[0] as unknown as [
      string,
      Record<string, unknown>,
    ];

    expect(args.p_objective_detail).toBeNull();
  });
});

describe("recusa da RPC", () => {
  it("papel insuficiente vira mensagem de negócio, não código", async () => {
    erroRpc = { code: "42501" };

    const state = await setGrowthObjectiveAction(undefined, form());

    expect(state.message).toContain("administra");
    expect(state.message).not.toContain("42501");
  });

  it("outro erro do banco não vaza detalhe técnico", async () => {
    erroRpc = { code: "23514" };

    const state = await setGrowthObjectiveAction(undefined, form());

    expect(state.message).toBeTruthy();
    expect(state.message).not.toContain("23514");
  });
});
