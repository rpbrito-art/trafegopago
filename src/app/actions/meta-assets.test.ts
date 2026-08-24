import { beforeEach, describe, expect, it, vi } from "vitest";

import { ROUTES } from "@/lib/auth/routes";

/**
 * Ações de seleção de ativo — o que atravessa a URL, e o que não atravessa.
 *
 * A prova de autorização é do gateway (`assets.test.ts`). O que se prova aqui
 * é a fronteira da action: campo ausente não chega a chamar o gateway, e o
 * desfecho volta como marcador pobre — sem id externo, sem resposta do
 * provider, sem razão técnica que ensine qual defesa recusou.
 */

const USER_ID = "11111111-1111-1111-1111-111111111111";
const ORG = "22222222-2222-2222-2222-222222222222";

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
  requireUser: async () => ({ id: USER_ID, email: "fundador@example.com" }),
}));

let resultado: { ok: boolean; reason?: string } = { ok: true };

/** Assinatura declarada para que os argumentos sejam tipados na asserção. */
type Selecao = (input: unknown) => Promise<{ ok: boolean; reason?: string }>;

const selectInstagramAccount = vi.fn<Selecao>(async () => resultado);
const selectAdAccount = vi.fn<Selecao>(async () => resultado);

vi.mock("@/lib/meta/assets", () => ({
  selectInstagramAccount: (input: unknown) => selectInstagramAccount(input),
  selectAdAccount: (input: unknown) => selectAdAccount(input),
}));

const { selectAdAccountAction, selectInstagramAccountAction } = await import(
  "./meta-assets"
);

async function destino(
  action: (formData: FormData) => Promise<void>,
  campos: Record<string, string>,
): Promise<string> {
  const formData = new FormData();
  for (const [chave, valor] of Object.entries(campos)) formData.set(chave, valor);

  try {
    await action(formData);
  } catch (erro) {
    if (erro instanceof RedirectError) return erro.to;
    throw erro;
  }

  throw new Error("a action deveria ter redirecionado");
}

beforeEach(() => {
  resultado = { ok: true };
  selectInstagramAccount.mockClear();
  selectAdAccount.mockClear();
});

describe("seleção de Instagram — fronteira da action", () => {
  it("sucesso volta para a conta com marcador pobre", async () => {
    const to = await destino(selectInstagramAccountAction, {
      organizationId: ORG,
      instagramAccountId: "ig-1",
    });

    expect(to).toBe(`${ROUTES.account}?ativo=ok`);
    expect(selectInstagramAccount).toHaveBeenCalledWith({
      userId: USER_ID,
      organizationId: ORG,
      externalInstagramAccountId: "ig-1",
    });
  });

  it("campo ausente não chega a chamar o gateway", async () => {
    const to = await destino(selectInstagramAccountAction, { organizationId: ORG });

    expect(to).toBe(`${ROUTES.account}?ativo=erro`);
    expect(selectInstagramAccount).not.toHaveBeenCalled();
  });

  it("ativo alheio vira desfecho próprio, sem eco do id", async () => {
    resultado = { ok: false, reason: "ASSET_NOT_FOUND" };

    const to = await destino(selectInstagramAccountAction, {
      organizationId: ORG,
      instagramAccountId: "ig-de-outra-pessoa",
    });

    expect(to).toBe(`${ROUTES.account}?ativo=nao-encontrado`);
    expect(to).not.toContain("ig-de-outra-pessoa");
  });

  it("permissão faltando é distinguível para a tela", async () => {
    resultado = { ok: false, reason: "MISSING_PERMISSION" };

    expect(
      await destino(selectInstagramAccountAction, {
        organizationId: ORG,
        instagramAccountId: "ig-1",
      }),
    ).toBe(`${ROUTES.account}?ativo=sem-permissao`);
  });

  it("as demais recusas colapsam em erro genérico", async () => {
    // Distinguir "sem membership" de "conexão inexistente" na URL ensinaria a
    // quem sondasse qual defesa disparou.
    for (const reason of [
      "NO_MEMBERSHIP",
      "NOT_CONNECTED",
      "TOKEN_UNAVAILABLE",
      "CONNECTION_REJECTED",
      "PROVIDER_UNAVAILABLE",
      "PERSIST_FAILED",
    ]) {
      resultado = { ok: false, reason };

      expect(
        await destino(selectInstagramAccountAction, {
          organizationId: ORG,
          instagramAccountId: "ig-1",
        }),
      ).toBe(`${ROUTES.account}?ativo=erro`);
    }
  });
});

describe("seleção de conta de anúncios — fronteira da action", () => {
  it("sucesso volta com o mesmo vocabulário", async () => {
    const to = await destino(selectAdAccountAction, {
      organizationId: ORG,
      adAccountId: "act_123",
    });

    expect(to).toBe(`${ROUTES.account}?ativo=ok`);
    expect(selectAdAccount).toHaveBeenCalledWith({
      userId: USER_ID,
      organizationId: ORG,
      externalAdAccountId: "act_123",
    });
  });

  it("sem organização não chama o gateway", async () => {
    const to = await destino(selectAdAccountAction, { adAccountId: "act_123" });

    expect(to).toBe(`${ROUTES.account}?ativo=erro`);
    expect(selectAdAccount).not.toHaveBeenCalled();
  });
});
