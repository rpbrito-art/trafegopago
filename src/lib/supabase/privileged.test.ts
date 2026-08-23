import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

const createClient = vi.fn(() => ({ marker: "privileged" }));

vi.mock("@supabase/supabase-js", () => ({ createClient }));

const { createSupabasePrivilegedClient } = await import("./privileged");

const URL = "https://cbnxdoxpyioxjwgjhbtq.supabase.co";
const SECRET = "sb_secret_valor_de_teste";

beforeEach(() => {
  createClient.mockClear();
  process.env.NEXT_PUBLIC_SUPABASE_URL = URL;
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_teste";
  process.env.SUPABASE_SECRET_KEY = SECRET;
});

describe("createSupabasePrivilegedClient", () => {
  it("usa a secret key server-only, nunca a publicável", () => {
    createSupabasePrivilegedClient();

    const [url, key] = createClient.mock.calls[0] as unknown as [
      string,
      string,
      Record<string, unknown>,
    ];

    expect(url).toBe(URL);
    expect(key).toBe(SECRET);
  });

  it("não carrega sessão, persistência nem auto-refresh", () => {
    createSupabasePrivilegedClient();

    const options = (
      createClient.mock.calls[0] as unknown as [string, string, { auth: Record<string, boolean> }]
    )[2];

    expect(options.auth).toEqual({
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    });
  });

  it("devolve instância nova a cada chamada", () => {
    createSupabasePrivilegedClient();
    createSupabasePrivilegedClient();

    expect(createClient).toHaveBeenCalledTimes(2);
  });

  it("falha quando a secret key está ausente", () => {
    delete process.env.SUPABASE_SECRET_KEY;

    expect(() => createSupabasePrivilegedClient()).toThrow(
      /SUPABASE_SECRET_KEY/,
    );
  });

  it("não repete o valor da credencial na mensagem de erro", () => {
    process.env.SUPABASE_SECRET_KEY = "";

    try {
      createSupabasePrivilegedClient();
      throw new Error("deveria ter falhado");
    } catch (error) {
      expect(String(error)).not.toContain(SECRET);
    }
  });
});

/**
 * Guarda estática do limite server/client.
 *
 * O `import "server-only"` já quebra o build se um Client Component importar o
 * caminho privilegiado. Esta varredura cobre o que aquele erro não cobre: um
 * arquivo `"use client"` que leia `process.env.SUPABASE_SECRET_KEY` direto,
 * sem passar por módulo nenhum.
 */
describe("secret key fora do código client-side", () => {
  const SRC = join(process.cwd(), "src");

  function sourceFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((entry) => {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) return sourceFiles(full);
      return /\.(ts|tsx)$/.test(entry) ? [full] : [];
    });
  }

  const files = sourceFiles(SRC).map((file) => ({
    path: relative(process.cwd(), file).split(sep).join("/"),
    content: readFileSync(file, "utf8"),
  }));

  const clientFiles = files.filter(({ content }) =>
    /^\s*["']use client["']/m.test(content),
  );

  it("encontra os Client Components do projeto", () => {
    expect(clientFiles.length).toBeGreaterThan(0);
  });

  it("nenhum Client Component menciona a secret key", () => {
    const ofensores = clientFiles
      .filter(({ content }) => content.includes("SUPABASE_SECRET_KEY"))
      .map(({ path }) => path);

    expect(ofensores).toEqual([]);
  });

  it("nenhum Client Component importa o cliente privilegiado", () => {
    const ofensores = clientFiles
      .filter(({ content }) => content.includes("supabase/privileged"))
      .map(({ path }) => path);

    expect(ofensores).toEqual([]);
  });

  it("nenhum módulo de produção declara segredo sob prefixo NEXT_PUBLIC_", () => {
    // Testes ficam de fora: `env.test.ts` usa exatamente esse nome como
    // fixture negativa, provando que a guarda de runtime o rejeita.
    const ofensores = files
      .filter(({ path }) => !/\.test\.tsx?$/.test(path))
      .filter(({ content }) => /NEXT_PUBLIC_[A-Z_]*(SECRET|SERVICE_ROLE)/.test(content))
      .map(({ path }) => path);

    expect(ofensores).toEqual([]);
  });

  it("o módulo privilegiado é server-only", () => {
    const modulo = files.find(
      ({ path }) => path === "src/lib/supabase/privileged.ts",
    );

    expect(modulo?.content.startsWith('import "server-only";')).toBe(true);
  });
});
