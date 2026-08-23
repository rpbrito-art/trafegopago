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
  const EMAIL = "pessoa@exemplo.com";

  /** `amr` como o Supabase entrega: método + instante em segundos. */
  function amr(method: string, idadeMs = 0) {
    return [{ method, timestamp: Math.floor((Date.now() - idadeMs) / 1000) }];
  }

  function claimsDe(amrValue: unknown, extra: Record<string, unknown> = {}) {
    return {
      data: { claims: { sub: SUB, email: EMAIL, amr: amrValue, ...extra } },
      error: null,
    };
  }

  it.each(["recovery", "otp"])(
    "devolve identidade quando amr traz o método %s usado agora",
    async (metodo) => {
      claimsResult = claimsDe(amr(metodo));

      expect(await getRecoveryUser()).toEqual({ id: SUB, email: EMAIL });
    },
  );

  it("recusa sessão comum de login, ainda que perfeitamente válida", async () => {
    claimsResult = claimsDe(amr("password"));

    expect(await getRecoveryUser()).toBeNull();
    // A mesma sessão continua valendo como login: o que muda é só o direito de
    // trocar a senha sem informar a atual.
    expect(await getVerifiedUser()).not.toBeNull();
  });

  it("recusa sessão de OTP que já saiu da janela de 15 minutos", async () => {
    claimsResult = claimsDe(amr("otp", 16 * 60 * 1000));

    expect(await getRecoveryUser()).toBeNull();
    expect(await getVerifiedUser()).not.toBeNull();
  });

  it("recusa sessão sem claim amr", async () => {
    claimsResult = {
      data: { claims: { sub: SUB, email: EMAIL } },
      error: null,
    };

    expect(await getRecoveryUser()).toBeNull();
  });

  it("recusa quando não há sessão", async () => {
    claimsResult = { data: null, error: null };

    expect(await getRecoveryUser()).toBeNull();
  });

  it("recusa quando a verificação do JWT falha", async () => {
    claimsResult = {
      data: { claims: { sub: SUB, email: EMAIL, amr: amr("otp") } },
      error: { message: "assinatura inválida" },
    };

    expect(await getRecoveryUser()).toBeNull();
  });

  it("recusa claims sem sub, mesmo com amr que autorizaria", async () => {
    claimsResult = {
      data: { claims: { email: EMAIL, amr: amr("otp") } },
      error: null,
    };

    expect(await getRecoveryUser()).toBeNull();
  });

  it.each([undefined, null, "", 42])(
    "recusa claim email %j: trocar senha exige saber de qual endereço veio",
    async (email) => {
      claimsResult = {
        data: { claims: { sub: SUB, email, amr: amr("otp") } },
        error: null,
      };

      expect(await getRecoveryUser()).toBeNull();
    },
  );

  it("não expõe nada além de id e e-mail", async () => {
    claimsResult = claimsDe(amr("otp"), {
      user_metadata: { role: "admin" },
      app_metadata: { plano: "enterprise" },
    });

    const user = await getRecoveryUser();

    expect(Object.keys(user ?? {}).sort()).toEqual(["email", "id"]);
  });
});
