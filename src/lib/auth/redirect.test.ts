import { describe, expect, it } from "vitest";

import {
  ALLOWED_REDIRECT_PATHS,
  DEFAULT_AUTHENTICATED_REDIRECT,
  isSafeInternalPath,
  sanitizeRedirect,
} from "./redirect";
import { ROUTES } from "./routes";

/**
 * Vetores clássicos de open redirect. Cada um deles já foi usado para burlar
 * validações "começa com barra" ingênuas.
 */
const OPEN_REDIRECT_VECTORS = [
  "https://evil.com",
  "http://evil.com",
  "//evil.com",
  "///evil.com",
  "/\\evil.com",
  "\\\\evil.com",
  "/\\/evil.com",
  "javascript:alert(1)",
  "data:text/html,<script>alert(1)</script>",
  "mailto:alguem@evil.com",
  "//evil.com/conta",
  "https://evil.com/conta",
  "http://localhost:3000.evil.com",
  "conta",
  "",
  "   ",
];

describe("isSafeInternalPath", () => {
  it("aceita caminho interno simples", () => {
    expect(isSafeInternalPath("/conta")).toBe(true);
    expect(isSafeInternalPath("/")).toBe(true);
    expect(isSafeInternalPath("/conta?a=1#b")).toBe(true);
  });

  it.each(OPEN_REDIRECT_VECTORS)("rejeita %j", (vector) => {
    expect(isSafeInternalPath(vector.trim())).toBe(false);
  });

  it("rejeita caracteres de controle usados em response splitting", () => {
    expect(isSafeInternalPath("/conta\r\nSet-Cookie: a=b")).toBe(false);
    expect(isSafeInternalPath("/conta\u0000")).toBe(false);
    expect(isSafeInternalPath("/conta\u0009")).toBe(false);
    expect(isSafeInternalPath("/conta\u007f")).toBe(false);
  });

  it("rejeita caminho absurdamente longo", () => {
    expect(isSafeInternalPath(`/${"a".repeat(1000)}`)).toBe(false);
  });
});

describe("sanitizeRedirect", () => {
  it.each(OPEN_REDIRECT_VECTORS)(
    "devolve o destino padrão para %j",
    (vector) => {
      expect(sanitizeRedirect(vector)).toBe(DEFAULT_AUTHENTICATED_REDIRECT);
    },
  );

  it("devolve o destino padrão quando next está ausente", () => {
    expect(sanitizeRedirect(undefined)).toBe(DEFAULT_AUTHENTICATED_REDIRECT);
    expect(sanitizeRedirect(null)).toBe(DEFAULT_AUTHENTICATED_REDIRECT);
  });

  it("aceita apenas caminhos da allowlist", () => {
    for (const allowed of ALLOWED_REDIRECT_PATHS) {
      expect(sanitizeRedirect(allowed)).toBe(allowed);
    }
  });

  it("recusa caminho interno que não está na allowlist", () => {
    expect(sanitizeRedirect("/admin")).toBe(DEFAULT_AUTHENTICATED_REDIRECT);
    expect(sanitizeRedirect("/conta/../admin")).toBe(
      DEFAULT_AUTHENTICATED_REDIRECT,
    );
  });

  it("descarta query e fragmento, preservando só o caminho permitido", () => {
    expect(sanitizeRedirect("/conta?token=abc#x")).toBe(ROUTES.account);
  });

  /**
   * O destino padrão passa a ser a entrada guiada: quem acaba de entrar deve
   * encontrar o próximo passo do negócio, não uma tela de configuração
   * (Rodada 004D §11).
   */
  it("leva à entrada guiada quando não há next seguro", () => {
    expect(DEFAULT_AUTHENTICATED_REDIRECT).toBe(ROUTES.start);
    expect(sanitizeRedirect(null)).toBe(ROUTES.start);
    expect(sanitizeRedirect("https://evil.com")).toBe(ROUTES.start);
  });

  it("aceita a trilha guiada e a escolha de prioridade como destino interno", () => {
    expect(sanitizeRedirect(ROUTES.start)).toBe(ROUTES.start);
    expect(sanitizeRedirect(ROUTES.focus)).toBe(ROUTES.focus);
    expect(sanitizeRedirect(ROUTES.account)).toBe(ROUTES.account);
  });

  it("respeita um fallback explícito", () => {
    expect(sanitizeRedirect("https://evil.com", ROUTES.signIn)).toBe(
      ROUTES.signIn,
    );
  });

  it("nunca devolve destino fora da allowlist, seja qual for a entrada", () => {
    const entradas = [
      ...OPEN_REDIRECT_VECTORS,
      "/conta",
      "/inicio",
      "/foco",
      "/",
      "/qualquer",
      "/conta%2f..%2fadmin",
      "/inicio%2f..%2fadmin",
    ];

    for (const entrada of entradas) {
      expect(ALLOWED_REDIRECT_PATHS).toContain(sanitizeRedirect(entrada));
    }
  });
});
