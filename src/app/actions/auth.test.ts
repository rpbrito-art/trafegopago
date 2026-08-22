import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  GENERIC_ERROR,
  GENERIC_SIGN_IN_ERROR,
} from "@/lib/auth/errors";
import { ROUTES } from "@/lib/auth/routes";

type AuthResult = {
  data: { session: object | null };
  error: { code?: string; status?: number } | null;
};

let signUpResult: AuthResult = { data: { session: null }, error: null };
let signInResult: AuthResult = { data: { session: null }, error: null };

const signUp = vi.fn(async () => signUpResult);
const signInWithPassword = vi.fn(async () => signInResult);
const signOut = vi.fn(async () => ({ error: null }));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: { signUp, signInWithPassword, signOut },
  }),
}));

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

const { signInAction, signOutAction, signUpAction } = await import("./auth");

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    data.append(key, value);
  }
  return data;
}

/** Captura o destino de um redirect disparado pela action. */
async function capturarRedirect(run: () => Promise<unknown>): Promise<string> {
  try {
    await run();
  } catch (error) {
    if (error instanceof RedirectError) return error.to;
    throw error;
  }

  throw new Error("a action retornou sem redirecionar");
}

const SENHA = "senha-forte-123";

beforeEach(() => {
  signUpResult = { data: { session: null }, error: null };
  signInResult = { data: { session: null }, error: null };
  signUp.mockClear();
  signInWithPassword.mockClear();
  signOut.mockClear();
});

describe("signUpAction", () => {
  it("recusa entrada inválida sem chamar o Supabase", async () => {
    const state = await signUpAction(undefined, form({ email: "x", password: "1" }));

    expect(state?.errors?.email).toBeTruthy();
    expect(state?.errors?.password).toBeTruthy();
    expect(signUp).not.toHaveBeenCalled();
  });

  it("devolve o e-mail digitado mas nunca a senha", async () => {
    const state = await signUpAction(
      undefined,
      form({ email: "pessoa@exemplo.com", password: "curta" }),
    );

    expect(state?.email).toBe("pessoa@exemplo.com");
    expect(JSON.stringify(state)).not.toContain("curta");
  });

  it("manda para a tela de confirmação quando não há sessão imediata", async () => {
    const destino = await capturarRedirect(() =>
      signUpAction(undefined, form({ email: "pessoa@exemplo.com", password: SENHA })),
    );

    expect(destino).toBe(ROUTES.checkEmail);
    expect(signUp).toHaveBeenCalledWith({
      email: "pessoa@exemplo.com",
      password: SENHA,
    });
  });

  it("normaliza o e-mail antes de chamar o provider", async () => {
    await capturarRedirect(() =>
      signUpAction(undefined, form({ email: "  Pessoa@Exemplo.COM ", password: SENHA })),
    );

    expect(signUp).toHaveBeenCalledWith({
      email: "pessoa@exemplo.com",
      password: SENHA,
    });
  });

  it("vai direto para a conta quando o projeto devolve sessão", async () => {
    signUpResult = { data: { session: { access_token: "t" } }, error: null };

    const destino = await capturarRedirect(() =>
      signUpAction(undefined, form({ email: "pessoa@exemplo.com", password: SENHA })),
    );

    expect(destino).toBe(ROUTES.account);
  });

  it("não revela que o e-mail já está cadastrado", async () => {
    signUpResult = { data: { session: null }, error: { code: "email_exists" } };

    const state = await signUpAction(
      undefined,
      form({ email: "pessoa@exemplo.com", password: SENHA }),
    );

    expect(state?.message).toBe(GENERIC_ERROR);
  });
});

describe("signInAction", () => {
  it("recusa entrada inválida sem chamar o Supabase", async () => {
    const state = await signInAction(undefined, form({ email: "", password: "" }));

    expect(state?.errors?.email).toBeTruthy();
    expect(signInWithPassword).not.toHaveBeenCalled();
  });

  it("devolve mensagem genérica para credencial inválida", async () => {
    signInResult = {
      data: { session: null },
      error: { code: "invalid_credentials", status: 400 },
    };

    const state = await signInAction(
      undefined,
      form({ email: "pessoa@exemplo.com", password: SENHA }),
    );

    expect(state?.message).toBe(GENERIC_SIGN_IN_ERROR);
  });

  it("leva para a área da conta por padrão", async () => {
    const destino = await capturarRedirect(() =>
      signInAction(undefined, form({ email: "pessoa@exemplo.com", password: SENHA })),
    );

    expect(destino).toBe(ROUTES.account);
  });

  it.each([
    "https://evil.com",
    "//evil.com",
    "/\evil.com",
    "/admin",
    "javascript:alert(1)",
  ])("ignora o destino hostil %j vindo do formulário", async (next) => {
    const destino = await capturarRedirect(() =>
      signInAction(
        undefined,
        form({ email: "pessoa@exemplo.com", password: SENHA, next }),
      ),
    );

    expect(destino).toBe(ROUTES.account);
  });

  it("respeita um destino interno da allowlist", async () => {
    const destino = await capturarRedirect(() =>
      signInAction(
        undefined,
        form({ email: "pessoa@exemplo.com", password: SENHA, next: ROUTES.home }),
      ),
    );

    expect(destino).toBe(ROUTES.home);
  });
});

describe("signOutAction", () => {
  it("encerra a sessão no provider e volta para a home", async () => {
    const destino = await capturarRedirect(() => signOutAction());

    expect(signOut).toHaveBeenCalledTimes(1);
    expect(destino).toBe(ROUTES.home);
  });
});
