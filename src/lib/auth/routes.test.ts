import { describe, expect, it } from "vitest";

import {
  AUTH_ENTRY_PATHS,
  isAuthEntryPath,
  isProtectedPath,
  PROTECTED_PREFIXES,
  ROUTES,
} from "./routes";

describe("isProtectedPath", () => {
  it("protege a área da conta e suas subrotas", () => {
    expect(isProtectedPath(ROUTES.account)).toBe(true);
    expect(isProtectedPath(`${ROUTES.account}/qualquer`)).toBe(true);
  });

  it.each([
    "/",
    "/entrar",
    "/cadastro",
    "/cadastro/confirme-seu-email",
    "/recuperar-senha",
    "/redefinir-senha",
    "/auth/confirm",
    "/auth/erro",
  ])("deixa %s público", (pathname) => {
    expect(isProtectedPath(pathname)).toBe(false);
  });

  it("não protege rota que apenas começa com o mesmo texto", () => {
    expect(isProtectedPath("/contatos")).toBe(false);
    expect(isProtectedPath("/conta-publica")).toBe(false);
  });
});

describe("isAuthEntryPath", () => {
  it.each([...AUTH_ENTRY_PATHS])("reconhece %s", (pathname) => {
    expect(isAuthEntryPath(pathname)).toBe(true);
  });

  it("não trata a área protegida como entrada de auth", () => {
    expect(isAuthEntryPath(ROUTES.account)).toBe(false);
  });

  it("não intercepta a tela de nova senha", () => {
    // Quem chega em `/redefinir-senha` vem de `/auth/confirm` já com sessão.
    // Tratá-la como entrada de auth mandaria essa sessão para `/conta` e
    // mataria o recovery; o guard dessa rota é `amr=recovery`, não o Proxy.
    expect(isAuthEntryPath(ROUTES.resetPassword)).toBe(false);
    expect(isProtectedPath(ROUTES.resetPassword)).toBe(false);
  });

  it("trata o pedido de recuperação como entrada de auth", () => {
    expect(isAuthEntryPath(ROUTES.forgotPassword)).toBe(true);
  });

  it("não intercepta o endpoint de confirmação", () => {
    // Interceptar `/auth/confirm` quebraria a confirmação de quem já tem sessão
    // ativa em outra conta no mesmo navegador.
    expect(isAuthEntryPath(ROUTES.confirm)).toBe(false);
    expect(isProtectedPath(ROUTES.confirm)).toBe(false);
  });
});

describe("consistência das rotas", () => {
  it("todo prefixo protegido é uma rota declarada", () => {
    const declaradas = Object.values(ROUTES) as string[];

    for (const prefixo of PROTECTED_PREFIXES) {
      expect(declaradas).toContain(prefixo);
    }
  });

  it("nenhuma rota de auth colide com a área protegida", () => {
    for (const entrada of AUTH_ENTRY_PATHS) {
      expect(isProtectedPath(entrada)).toBe(false);
    }
  });
});
