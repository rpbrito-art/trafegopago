import { beforeEach, describe, expect, it, vi } from "vitest";

import { ROUTES } from "@/lib/auth/routes";

const USER_ID = "11111111-1111-1111-1111-111111111111";

let currentUser: { id: string; email: string | null } | null = {
  id: USER_ID,
  email: "fundador@example.com",
};

let membershipRows: { organization_id: string }[] = [];
let membershipError: { code?: string } | null = null;
let rpcError: { code?: string; message?: string; details?: string } | null =
  null;

/** Assinatura declarada para que `rpc.mock.calls` seja tipado na asserção. */
const rpc = vi.fn<
  (name: string, args: Record<string, unknown>) => Promise<unknown>
>(async () => ({ data: null, error: rpcError }));
const limit = vi.fn(async () => ({ data: membershipRows, error: membershipError }));

const privilegedClient = {
  from: vi.fn(() => ({
    select: () => ({ eq: () => ({ limit }) }),
  })),
  rpc,
};

class RedirectError extends Error {
  constructor(readonly to: string) {
    super(`NEXT_REDIRECT:${to}`);
  }
}

vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new RedirectError(to);
  },
}));

vi.mock("@/lib/auth/session", () => ({
  requireUser: async () => {
    if (!currentUser) throw new RedirectError(ROUTES.signIn);
    return currentUser;
  },
}));

vi.mock("@/lib/supabase/privileged", () => ({
  createSupabasePrivilegedClient: () => privilegedClient,
}));

const { createInitialBusinessAction } = await import("./business");

const CAMPOS = {
  organizationName: "Clínica Exemplo",
  segment: "Odontologia",
  locationSummary: "Campinas, SP",
  primaryOffer: "Implantes e clareamento",
  targetAudience: "Adultos de 30 a 55 anos",
  acquisitionGoal: "Agendar 40 avaliações por mês",
};

function form(extra: Record<string, string> = {}): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries({ ...CAMPOS, ...extra })) {
    data.append(key, value);
  }
  return data;
}

async function capturarRedirect(run: () => Promise<unknown>): Promise<string> {
  try {
    await run();
  } catch (error) {
    if (error instanceof RedirectError) return error.to;
    throw error;
  }

  throw new Error("a action retornou sem redirecionar");
}

beforeEach(() => {
  currentUser = { id: USER_ID, email: "fundador@example.com" };
  membershipRows = [];
  membershipError = null;
  rpcError = null;
  rpc.mockClear();
  limit.mockClear();
  privilegedClient.from.mockClear();
});

describe("createInitialBusinessAction", () => {
  it("exige sessão antes de tocar no caminho privilegiado", async () => {
    currentUser = null;

    const destino = await capturarRedirect(() =>
      createInitialBusinessAction(undefined, form()),
    );

    expect(destino).toBe(ROUTES.signIn);
    expect(rpc).not.toHaveBeenCalled();
    expect(privilegedClient.from).not.toHaveBeenCalled();
  });

  it("recusa entrada inválida sem chamar a RPC", async () => {
    const state = await createInitialBusinessAction(
      undefined,
      form({ organizationName: "", segment: "" }),
    );

    expect(state.errors?.organizationName).toBeTruthy();
    expect(state.errors?.segment).toBeTruthy();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("cria o negócio e leva para a conta", async () => {
    const destino = await capturarRedirect(() =>
      createInitialBusinessAction(undefined, form({ averageTicket: "1.250,00" })),
    );

    expect(destino).toBe(ROUTES.account);
    expect(rpc).toHaveBeenCalledTimes(1);

    const [nome, args] = rpc.mock.calls[0]!;

    expect(nome).toBe("bootstrap_organization_business_profile");
    expect(args.p_user_id).toBe(USER_ID);
    expect(args.p_average_ticket_minor).toBe(125_000);
    expect(args.p_currency).toBe("BRL");
    expect(args.p_timezone).toBe("America/Sao_Paulo");
  });

  it("usa a identidade verificada e ignora a enviada pelo formulário", async () => {
    const impostor = "99999999-9999-9999-9999-999999999999";

    await capturarRedirect(() =>
      createInitialBusinessAction(
        undefined,
        form({
          p_user_id: impostor,
          userId: impostor,
          user_id: impostor,
          organizationId: impostor,
          organization_id: impostor,
          role: "owner",
          status: "ACTIVE",
        }),
      ),
    );

    const args = rpc.mock.calls[0]![1];

    expect(args.p_user_id).toBe(USER_ID);
    expect(JSON.stringify(args)).not.toContain(impostor);
    expect(args).not.toHaveProperty("p_role");
    expect(args).not.toHaveProperty("p_status");
    expect(args).not.toHaveProperty("p_organization_id");
  });

  it("não cria segundo tenant quando já existe membership", async () => {
    membershipRows = [{ organization_id: "org-existente" }];

    const destino = await capturarRedirect(() =>
      createInitialBusinessAction(undefined, form()),
    );

    expect(destino).toBe(ROUTES.account);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("trata a recusa do banco por dupla submissão como sucesso do usuário", async () => {
    rpcError = { code: "P0001", message: "usuario ja possui membership" };

    const destino = await capturarRedirect(() =>
      createInitialBusinessAction(undefined, form()),
    );

    expect(destino).toBe(ROUTES.account);
  });

  it("devolve erro genérico e nada do detalhe do banco", async () => {
    rpcError = {
      code: "42501",
      message: 'permission denied for function bootstrap_organization_business_profile',
      details: "sb_secret_deveria_nunca_aparecer",
    };

    const state = await createInitialBusinessAction(undefined, form());

    expect(state.message).toBeTruthy();
    const serializado = JSON.stringify(state);
    expect(serializado).not.toContain("sb_secret");
    expect(serializado).not.toContain("permission denied");
    expect(serializado).not.toContain("42501");
  });

  it("devolve os valores digitados para repopular o formulário", async () => {
    const state = await createInitialBusinessAction(
      undefined,
      form({ segment: "" }),
    );

    expect(state.values?.organizationName).toBe(CAMPOS.organizationName);
  });
});
