import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  GENERIC_ERROR,
  GENERIC_SIGN_IN_ERROR,
  PASSWORD_CHANGED_SESSIONS_KEPT,
  PASSWORD_RESET_REQUESTED,
  RECOVERY_SESSION_REQUIRED,
} from "@/lib/auth/errors";
import { PASSWORD_RESET_DONE_PARAM, ROUTES } from "@/lib/auth/routes";

type AuthResult = {
  data: { session: object | null };
  error: { code?: string; status?: number } | null;
};

type ErrorOnly = { error: { code?: string; status?: number } | null };

let signUpResult: AuthResult = { data: { session: null }, error: null };
let signInResult: AuthResult = { data: { session: null }, error: null };
let resetRequestResult: ErrorOnly = { error: null };
let updateUserResult: ErrorOnly = { error: null };
let recoveryUser: { id: string; email: string | null } | null = null;

const signUp = vi.fn(async () => signUpResult);
const signInWithPassword = vi.fn(async () => signInResult);
let signOutResult: ErrorOnly = { error: null };
const signOut = vi.fn(async () => signOutResult);
const resetPasswordForEmail = vi.fn(async () => resetRequestResult);
const updateUser = vi.fn(async () => updateUserResult);
const getRecoveryUser = vi.fn(async () => recoveryUser);

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: {
      signUp,
      signInWithPassword,
      signOut,
      resetPasswordForEmail,
      updateUser,
    },
  }),
}));

vi.mock("@/lib/auth/session", () => ({
  getRecoveryUser: () => getRecoveryUser(),
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

const {
  requestPasswordResetAction,
  resetPasswordAction,
  signInAction,
  signOutAction,
  signUpAction,
} = await import("./auth");

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
  resetRequestResult = { error: null };
  updateUserResult = { error: null };
  signOutResult = { error: null };
  recoveryUser = { id: "u-1", email: "pessoa@exemplo.com" };
  signUp.mockClear();
  signInWithPassword.mockClear();
  signOut.mockClear();
  resetPasswordForEmail.mockClear();
  updateUser.mockClear();
  getRecoveryUser.mockClear();
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

describe("requestPasswordResetAction", () => {
  it("recusa e-mail malformado sem chamar o provider", async () => {
    const state = await requestPasswordResetAction(
      undefined,
      form({ email: "pessoa" }),
    );

    expect(state.errors?.email).toBeTruthy();
    expect(state.requested).toBeUndefined();
    expect(resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it("pede o link e responde de forma neutra", async () => {
    const state = await requestPasswordResetAction(
      undefined,
      form({ email: "Pessoa@Exemplo.com" }),
    );

    expect(resetPasswordForEmail).toHaveBeenCalledWith("pessoa@exemplo.com");
    expect(state.requested).toBe(true);
    expect(PASSWORD_RESET_REQUESTED).toMatch(/Se houver uma conta/);
  });

  it("não devolve o e-mail junto da resposta neutra", async () => {
    const state = await requestPasswordResetAction(
      undefined,
      form({ email: "pessoa@exemplo.com" }),
    );

    expect(state.email).toBeUndefined();
  });

  it.each([
    ["user_not_found", 400],
    ["email_not_confirmed", 400],
    ["validation_failed", 422],
  ])("responde igual quando o provider devolve %s", async (code, status) => {
    resetRequestResult = { error: { code, status } };

    const state = await requestPasswordResetAction(
      undefined,
      form({ email: "pessoa@exemplo.com" }),
    );

    expect(state).toEqual({ requested: true });
  });

  it("informa excesso de tentativas sem revelar a conta", async () => {
    resetRequestResult = { error: { status: 429 } };

    const state = await requestPasswordResetAction(
      undefined,
      form({ email: "pessoa@exemplo.com" }),
    );

    expect(state.requested).toBeUndefined();
    expect(state.message).toMatch(/tentativas/i);
    expect(state.message).not.toMatch(/conta|cadastr/i);
  });

  it("informa indisponibilidade do provider", async () => {
    resetRequestResult = { error: { status: 503 } };

    const state = await requestPasswordResetAction(
      undefined,
      form({ email: "pessoa@exemplo.com" }),
    );

    expect(state.message).toBe(GENERIC_ERROR);
  });
});

describe("resetPasswordAction", () => {
  const NOVA = "nova-senha-forte-1";

  it("recusa senha curta sem tocar no provider e sem ecoar a senha", async () => {
    const state = await resetPasswordAction(
      undefined,
      form({ password: "curta", passwordConfirmation: "curta" }),
    );

    expect(state.errors?.password).toBeTruthy();
    expect(JSON.stringify(state)).not.toContain("curta");
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("recusa confirmação divergente", async () => {
    const state = await resetPasswordAction(
      undefined,
      form({ password: NOVA, passwordConfirmation: `${NOVA}x` }),
    );

    expect(state.errors?.passwordConfirmation).toBeTruthy();
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("recusa quando a sessão não é de recovery", async () => {
    recoveryUser = null;

    const state = await resetPasswordAction(
      undefined,
      form({ password: NOVA, passwordConfirmation: NOVA }),
    );

    expect(state.message).toBe(RECOVERY_SESSION_REQUIRED);
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("troca a senha, encerra TODAS as sessões e volta ao login com aviso", async () => {
    const destino = await capturarRedirect(() =>
      resetPasswordAction(
        undefined,
        form({ password: NOVA, passwordConfirmation: NOVA }),
      ),
    );

    expect(updateUser).toHaveBeenCalledWith({ password: NOVA });
    // O escopo é explícito de propósito: quem recupera a conta pode estar
    // expulsando quem tinha acesso indevido, e herdar o default do SDK deixaria
    // isso na mão da versão da dependência.
    expect(signOut).toHaveBeenCalledWith({ scope: "global" });
    expect(signOut).toHaveBeenCalledOnce();
    expect(destino).toBe(`${ROUTES.signIn}?${PASSWORD_RESET_DONE_PARAM}=1`);
    expect(destino).not.toContain(NOVA);
  });

  it("avisa que outras sessões seguem abertas quando o logout global falha", async () => {
    signOutResult = { error: { status: 500 } };

    const state = await resetPasswordAction(
      undefined,
      form({ password: NOVA, passwordConfirmation: NOVA }),
    );

    // A senha já mudou: repetir o erro do formulário sugeriria que nada
    // aconteceu, e calar sobre as sessões esconderia consequência real.
    expect(state.message).toBe(PASSWORD_CHANGED_SESSIONS_KEPT);
    expect(state.errors).toBeUndefined();
    expect(updateUser).toHaveBeenCalledOnce();
  });

  it("não deixa a falha do logout vazar detalhe técnico", async () => {
    signOutResult = { error: { code: "session_not_found", status: 404 } };

    const state = await resetPasswordAction(
      undefined,
      form({ password: NOVA, passwordConfirmation: NOVA }),
    );

    expect(state.message).not.toContain("session_not_found");
    expect(JSON.stringify(state)).not.toContain(NOVA);
  });

  it("traduz falha do provider sem vazar o código bruto", async () => {
    updateUserResult = { error: { code: "weak_password", status: 422 } };

    const state = await resetPasswordAction(
      undefined,
      form({ password: NOVA, passwordConfirmation: NOVA }),
    );

    expect(state.message).toBeTruthy();
    expect(state.message).not.toContain("weak_password");
    expect(signOut).not.toHaveBeenCalled();
  });
});
