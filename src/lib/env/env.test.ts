import { describe, expect, it } from "vitest";

import { parsePublicEnv, resolvePublishableKey } from "./public";
import {
  assertNoLeakedPrivilegedEnv,
  findLeakedPrivilegedEnvNames,
  isPrivilegedEnvName,
} from "./server";

const VALID_URL = "https://cbnxdoxpyioxjwgjhbtq.supabase.co";

describe("parsePublicEnv", () => {
  it("aceita a chave publicável no nome atual", () => {
    const env = parsePublicEnv({
      NEXT_PUBLIC_SUPABASE_URL: VALID_URL,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_exemplo",
    });

    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe(VALID_URL);
    expect(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).toBe(
      "sb_publishable_exemplo",
    );
  });

  it("cai para o nome legado anon key quando o atual está ausente", () => {
    const env = parsePublicEnv({
      NEXT_PUBLIC_SUPABASE_URL: VALID_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon_legado",
    });

    expect(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).toBe("anon_legado");
  });

  it("prefere o nome atual quando ambos existem", () => {
    expect(
      resolvePublishableKey({
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "atual",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "legado",
      }),
    ).toBe("atual");
  });

  it("falha quando a URL é inválida", () => {
    expect(() =>
      parsePublicEnv({
        NEXT_PUBLIC_SUPABASE_URL: "nao-e-url",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_exemplo",
      }),
    ).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });

  it("falha quando nenhuma chave publicável está presente", () => {
    expect(() =>
      parsePublicEnv({ NEXT_PUBLIC_SUPABASE_URL: VALID_URL }),
    ).toThrow(/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
  });
});

describe("guarda de credenciais privilegiadas", () => {
  it("classifica nomes privilegiados", () => {
    expect(isPrivilegedEnvName("SUPABASE_SECRET_KEY")).toBe(true);
    expect(isPrivilegedEnvName("SUPABASE_SERVICE_ROLE_KEY")).toBe(true);
    expect(isPrivilegedEnvName("META_APP_SECRET")).toBe(true);
    expect(isPrivilegedEnvName("META_ACCESS_TOKEN")).toBe(true);
    expect(isPrivilegedEnvName("NEXT_PUBLIC_SUPABASE_URL")).toBe(false);
  });

  it("detecta segredo exposto com prefixo NEXT_PUBLIC_", () => {
    const leaked = findLeakedPrivilegedEnvNames({
      NEXT_PUBLIC_SUPABASE_URL: VALID_URL,
      NEXT_PUBLIC_SUPABASE_SECRET_KEY: "sb_secret_vazado",
      SUPABASE_SECRET_KEY: "sb_secret_ok_no_servidor",
    });

    expect(leaked).toEqual(["NEXT_PUBLIC_SUPABASE_SECRET_KEY"]);
  });

  it("bloqueia a inicialização quando há segredo público", () => {
    expect(() =>
      assertNoLeakedPrivilegedEnv({
        NEXT_PUBLIC_META_APP_SECRET: "vazado",
      }),
    ).toThrow(/NEXT_PUBLIC_META_APP_SECRET/);
  });

  it("aceita a convenção adotada pelo projeto", () => {
    expect(() =>
      assertNoLeakedPrivilegedEnv({
        NEXT_PUBLIC_SUPABASE_URL: VALID_URL,
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_exemplo",
        SUPABASE_SECRET_KEY: "sb_secret_exemplo",
      }),
    ).not.toThrow();
  });
});
