import { describe, expect, it } from "vitest";

import {
  classificarLinkRecovery,
  LINK_CONFIRMATION_URL_NATIVA,
  LINK_SSR,
  LINK_TERCEIRO,
} from "./recovery-link.mjs";

const CONTEXTO = {
  appUrl: "http://localhost:3000",
  supabaseUrl: "https://cbnxdoxpyioxjwgjhbtq.supabase.co",
};

const classificar = (valor) => classificarLinkRecovery(valor, CONTEXTO);

describe("classificarLinkRecovery", () => {
  it("reconhece o link SSR do template versionado", () => {
    const r = classificar(
      "http://localhost:3000/auth/confirm?token_hash=abc123&type=recovery",
    );

    expect(r.tipo).toBe(LINK_SSR);
    expect(r.path).toBe("/auth/confirm");
    expect(r.type).toBe("recovery");
    expect(r.temTokenHash).toBe(true);
    expect(r.temNext).toBe(false);
  });

  it("reconhece a ConfirmationURL nativa como do provider, NÃO como terceiro", () => {
    // Este é exatamente o caso que a versão anterior classificava errado,
    // acusando o domínio do próprio projeto de ser rastreador de cliques.
    const r = classificar(
      "https://cbnxdoxpyioxjwgjhbtq.supabase.co/auth/v1/verify?token=abc&type=recovery&redirect_to=http://localhost:3000",
    );

    expect(r.tipo).toBe(LINK_CONFIRMATION_URL_NATIVA);
    expect(r.tipo).not.toBe(LINK_TERCEIRO);
    expect(r.path).toBe("/auth/v1/verify");
  });

  it("reconhece rastreador externo de cliques", () => {
    const r = classificar(
      "https://exemplo.r.af.d.sendibt2.com/tr/cl/TOKEN-DE-RASTREIO",
    );

    expect(r.tipo).toBe(LINK_TERCEIRO);
  });

  it("não aceita host de terceiro que apenas contém o domínio do provider", () => {
    // Uma checagem por sufixo aceitaria isto como se fosse o Supabase.
    for (const valor of [
      "https://cbnxdoxpyioxjwgjhbtq.supabase.co.dominio-de-terceiro.com/auth/v1/verify",
      "https://evil-cbnxdoxpyioxjwgjhbtq.supabase.co.attacker.net/tr/cl/x",
      "https://outro-projeto.supabase.co/auth/v1/verify?token=abc",
    ]) {
      expect(classificar(valor).tipo).toBe(LINK_TERCEIRO);
    }
  });

  it("distingue a aplicação por porta, não só por hostname", () => {
    expect(classificar("http://localhost:3001/auth/confirm").tipo).toBe(
      LINK_TERCEIRO,
    );
  });

  it("registra o type real do link, que é o que separa recovery de signup", () => {
    // O envio de 2026-08-23 chegou assim: formato SSR correto, `type` errado —
    // conteúdo do template de confirmação colado no slot de Reset Password.
    const r = classificar(
      "http://localhost:3000/auth/confirm?token_hash=abc&type=email",
    );

    expect(r.tipo).toBe(LINK_SSR);
    expect(r.type).toBe("email");
  });

  it("acusa next, que o template de recovery não pode carregar", () => {
    const r = classificar(
      "http://localhost:3000/auth/confirm?token_hash=abc&type=recovery&next=/conta",
    );

    expect(r.temNext).toBe(true);
  });

  it("lança quando o valor colado não é uma URL", () => {
    expect(() => classificar("isto não é uma url")).toThrow();
  });
});
