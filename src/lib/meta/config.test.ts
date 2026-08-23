import { describe, expect, it } from "vitest";

import { isPrivilegedEnvName } from "@/lib/env/server";

import {
  authorizationDialogUrl,
  DEFAULT_META_GRAPH_API_VERSION,
  graphApiBaseUrl,
  isMetaConfigured,
  META_ENV_NAMES,
  parseMetaEnv,
} from "./config";

const completo = {
  META_APP_ID: "123456789",
  META_APP_SECRET: "segredo-sintetico",
  META_LOGIN_CONFIG_ID: "987654321",
  META_OAUTH_REDIRECT_URI: "http://localhost:3000/meta/callback",
};

describe("parseMetaEnv", () => {
  it("aceita configuração completa e aplica a versão default", () => {
    const env = parseMetaEnv(completo);

    expect(env.META_APP_ID).toBe("123456789");
    expect(env.META_GRAPH_API_VERSION).toBe(DEFAULT_META_GRAPH_API_VERSION);
  });

  it("aceita versão explícita no formato vXX.X", () => {
    const env = parseMetaEnv({ ...completo, META_GRAPH_API_VERSION: "v25.0" });
    expect(env.META_GRAPH_API_VERSION).toBe("v25.0");
  });

  it.each(["26.0", "v26", "latest", "v26.0.1", ""])(
    "recusa a versão %j",
    (versao) => {
      expect(() =>
        parseMetaEnv({ ...completo, META_GRAPH_API_VERSION: versao }),
      ).toThrow();
    },
  );

  it.each(["META_APP_ID", "META_APP_SECRET", "META_LOGIN_CONFIG_ID"])(
    "falha quando %s está ausente",
    (nome) => {
      const raw = { ...completo, [nome]: undefined };
      expect(() => parseMetaEnv(raw)).toThrow();
    },
  );

  it("recusa redirect URI que não é URL", () => {
    expect(() =>
      parseMetaEnv({ ...completo, META_OAUTH_REDIRECT_URI: "/meta/callback" }),
    ).toThrow();
  });

  it("mensagem de erro cita apenas NOMES, nunca valores", () => {
    // O valor de `META_APP_SECRET` não pode atravessar log, stack trace ou
    // resposta de erro (`SECURITY_MODEL.md` §15).
    try {
      parseMetaEnv({ ...completo, META_APP_ID: "" });
      throw new Error("deveria ter lançado");
    } catch (erro) {
      const mensagem = (erro as Error).message;
      expect(mensagem).toContain("META_APP_ID");
      expect(mensagem).not.toContain("segredo-sintetico");
    }
  });
});

describe("isMetaConfigured", () => {
  it("é verdadeiro com configuração completa", () => {
    expect(isMetaConfigured(completo)).toBe(true);
  });

  it("é falso — e não lança — quando falta configuração", () => {
    // A tela precisa distinguir "não configurado" de "erro", sem quebrar.
    expect(isMetaConfigured({})).toBe(false);
    expect(isMetaConfigured({ ...completo, META_APP_SECRET: undefined })).toBe(
      false,
    );
  });
});

describe("fronteira de segredo", () => {
  it("META_APP_SECRET é reconhecido como privilegiado", () => {
    // É esse reconhecimento que faz `assertNoLeakedPrivilegedEnv` barrar um
    // eventual `NEXT_PUBLIC_META_APP_SECRET`.
    expect(isPrivilegedEnvName("META_APP_SECRET")).toBe(true);
    expect(isPrivilegedEnvName("NEXT_PUBLIC_META_APP_SECRET")).toBe(true);
  });

  it("nenhum nome da integração usa prefixo público", () => {
    for (const nome of META_ENV_NAMES) {
      expect(nome.startsWith("NEXT_PUBLIC_")).toBe(false);
    }
  });
});

describe("URLs centralizadas", () => {
  it("monta a base da Graph API a partir da versão configurada", () => {
    expect(graphApiBaseUrl("v26.0")).toBe("https://graph.facebook.com/v26.0");
  });

  it("monta o diálogo de autorização a partir da versão configurada", () => {
    expect(authorizationDialogUrl("v26.0")).toBe(
      "https://www.facebook.com/v26.0/dialog/oauth",
    );
  });

  it("a versão vigente é a revalidada na documentação oficial", () => {
    // v26.0, lançada em 2026-07-29, confirmada como a mais recente em
    // 2026-08-23. Trocar exige changelog, testes e promoção (TECHNICAL_SPEC §7.2).
    expect(DEFAULT_META_GRAPH_API_VERSION).toBe("v26.0");
  });
});
