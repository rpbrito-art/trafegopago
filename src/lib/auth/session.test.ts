import { beforeEach, describe, expect, it, vi } from "vitest";

import { ROUTES } from "./routes";

type ClaimsResult = {
  data: { claims: Record<string, unknown> } | null;
  error: { message: string } | null;
};

let claimsResult: ClaimsResult = { data: null, error: null };

const getClaims = vi.fn(async () => claimsResult);

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({ auth: { getClaims } }),
}));

/**
 * `redirect()` do Next interrompe a execução lançando. O stub reproduz esse
 * contrato para que o teste consiga distinguir "redirecionou" de "devolveu".
 */
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

const { getRecoveryUser, getVerifiedUser, requireUser } = await import(
  "./session"
);

beforeEach(() => {
  claimsResult = { data: null, error: null };
  getClaims.mockClear();
});

describe("getVerifiedUser", () => {
  it("devolve identidade quando o JWT é verificado", async () => {
    claimsResult = {
      data: {
        claims: {
          sub: "11111111-1111-1111-1111-111111111111",
          email: "pessoa@exemplo.com",
        },
      },
      error: null,
    };

    await expect(getVerifiedUser()).resolves.toEqual({
      id: "11111111-1111-1111-1111-111111111111",
      email: "pessoa@exemplo.com",
    });
  });

  it("usa getClaims, não getSession, como prova de identidade", async () => {
    claimsResult = {
      data: { claims: { sub: "abc", email: "a@b.com" } },
      error: null,
    };

    await getVerifiedUser();

    expect(getClaims).toHaveBeenCalledTimes(1);
  });

  it("devolve null quando não há sessão", async () => {
    await expect(getVerifiedUser()).resolves.toBeNull();
  });

  it("devolve null quando a verificação falha", async () => {
    claimsResult = { data: null, error: { message: "bad_jwt" } };

    await expect(getVerifiedUser()).resolves.toBeNull();
  });

  it("recusa claims sem sub utilizável", async () => {
    for (const sub of [undefined, null, "", 42]) {
      claimsResult = { data: { claims: { sub } }, error: null };

      await expect(getVerifiedUser()).resolves.toBeNull();
    }
  });

  it("tolera claims sem e-mail", async () => {
    claimsResult = { data: { claims: { sub: "abc" } }, error: null };

    await expect(getVerifiedUser()).resolves.toEqual({
      id: "abc",
      email: null,
    });
  });

  it("não expõe user_metadata nem outras claims", async () => {
    claimsResult = {
      data: {
        claims: {
          sub: "abc",
          email: "a@b.com",
          user_metadata: { role: "admin" },
          app_metadata: { plano: "enterprise" },
        },
      },
      error: null,
    };

    const user = await getVerifiedUser();

    expect(Object.keys(user ?? {}).sort()).toEqual(["email", "id"]);
  });
});

describe("requireUser", () => {
  it("devolve o usuário quando há sessão válida", async () => {
    claimsResult = {
      data: { claims: { sub: "abc", email: "a@b.com" } },
      error: null,
    };

    await expect(requireUser()).resolves.toEqual({
      id: "abc",
      email: "a@b.com",
    });
  });

  it("redireciona para o login quando não há sessão", async () => {
    await expect(requireUser()).rejects.toThrow(
      new RegExp(`NEXT_REDIRECT:${ROUTES.signIn}`),
    );
  });

  it("redireciona quando a verificação do JWT falha", async () => {
    claimsResult = { data: null, error: { message: "bad_jwt" } };

    await expect(requireUser()).rejects.toThrow(
      new RegExp(`NEXT_REDIRECT:${ROUTES.signIn}`),
    );
  });
});

describe("getRecoveryUser", () => {
  const SUB = "22222222-2222-2222-2222-222222222222";

  it.each(["recovery", "otp"])(
    "devolve identidade quando amr traz o método %s",
    async (metodo) => {
      claimsResult = {
        data: {
          claims: {
            sub: SUB,
            email: "pessoa@exemplo.com",
            amr: [{ method: metodo, timestamp: 1 }],
          },
        },
        error: null,
      };

      expect(await getRecoveryUser()).toEqual({
        id: SUB,
        email: "pessoa@exemplo.com",
      });
    },
  );

  it("recusa sessão comum de login, ainda que perfeitamente válida", async () => {
    claimsResult = {
      data: {
        claims: {
          sub: SUB,
          email: "pessoa@exemplo.com",
          amr: [{ method: "password", timestamp: 1 }],
        },
      },
      error: null,
    };

    expect(await getRecoveryUser()).toBeNull();
    // A mesma sessão continua valendo como login: o que muda é só o direito de
    // trocar a senha sem informar a atual.
    expect(await getVerifiedUser()).not.toBeNull();
  });

  it("recusa sessão sem claim amr", async () => {
    claimsResult = { data: { claims: { sub: SUB } }, error: null };

    expect(await getRecoveryUser()).toBeNull();
  });

  it("recusa quando não há sessão", async () => {
    claimsResult = { data: null, error: null };

    expect(await getRecoveryUser()).toBeNull();
  });

  it("recusa quando a verificação do JWT falha", async () => {
    claimsResult = {
      data: { claims: { sub: SUB, amr: ["otp"] } },
      error: { message: "assinatura inválida" },
    };

    expect(await getRecoveryUser()).toBeNull();
  });

  it("recusa claims sem sub, mesmo com amr que autorizaria", async () => {
    claimsResult = { data: { claims: { amr: ["otp"] } }, error: null };

    expect(await getRecoveryUser()).toBeNull();
  });
});
