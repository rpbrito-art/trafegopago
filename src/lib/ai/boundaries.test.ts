import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Fronteiras da camada de IA — Rodada 004A §§5.2, 5.5, 9 e 10.15.
 *
 * Estes testes leem o próprio código-fonte. É deliberado: as invariantes aqui
 * não são sobre o que uma função devolve, e sim sobre o que o módulo **não
 * contém**. Um teste de comportamento não pega uma chave de API adicionada
 * amanhã; um que inspeciona o diretório, sim.
 */

const DIRETORIO = join(process.cwd(), "src", "lib", "ai");

/** Nomes comerciais que não podem vazar para fora da camada de adapter. */
const MARCAS_DE_PROVIDER =
  /(openai|anthropic|claude|gemini|vertex|bedrock|mistral|cohere|groq|kimi|deepseek)/i;

/**
 * Varre recursivamente uma pasta de código produtivo.
 *
 * Usado para provar o que **não** existe em features, páginas e componentes —
 * a invariante mais forte do §20 e do mandato 004E §2: nenhum componente de
 * produto contém `if provider === ...` nem literal de modelo.
 */
function arquivosRecursivos(raiz: string): { nome: string; conteudo: string }[] {
  const encontrados: { nome: string; conteudo: string }[] = [];

  for (const entrada of readdirSync(raiz, { withFileTypes: true })) {
    const caminho = join(raiz, entrada.name);

    if (entrada.isDirectory()) {
      encontrados.push(...arquivosRecursivos(caminho));
      continue;
    }

    if (!/\.(ts|tsx)$/.test(entrada.name) || /\.test\.tsx?$/.test(entrada.name)) {
      continue;
    }

    encontrados.push({
      nome: caminho.replace(process.cwd(), ""),
      conteudo: readFileSync(caminho, "utf8"),
    });
  }

  return encontrados;
}

function arquivosDeProducao(): { nome: string; conteudo: string }[] {
  return readdirSync(DIRETORIO)
    .filter((nome) => nome.endsWith(".ts") && !nome.endsWith(".test.ts"))
    .map((nome) => ({
      nome,
      conteudo: readFileSync(join(DIRETORIO, nome), "utf8"),
    }));
}

describe("a camada de IA não conhece provider real", () => {
  it("nenhum arquivo produtivo faz chamada de rede", () => {
    // Sem provider real nesta rodada: o único caminho de saída é o adapter, e
    // ele não existe em produção ainda (mandato §5.5).
    for (const { nome, conteudo } of arquivosDeProducao()) {
      expect(conteudo, nome).not.toMatch(/\bfetch\s*\(/);
      expect(conteudo, nome).not.toMatch(/\bXMLHttpRequest\b/);
    }
  });

  /**
   * A 004A podia exigir que a camada inteira ignorasse nome comercial, porque
   * não havia provider nenhum. Com um provider real, a invariante que importa é
   * mais precisa: **quem decide** não conhece marca. O núcleo — contratos,
   * Router, catálogo, ledger, preço, registro de tasks — escolhe por capacidade
   * e tier; a marca existe apenas no adapter e no ato de registrá-lo
   * (`AI_ARCHITECTURE.md` §20).
   */
  it("o núcleo que decide não cita marca de provider de IA", () => {
    for (const { nome, conteudo } of arquivosDeProducao()) {
      // Registrar um adapter é, literalmente, nomear o provider.
      if (nome === "adapter-registry.ts") continue;

      expect(conteudo, nome).not.toMatch(MARCAS_DE_PROVIDER);
    }
  });

  /**
   * A invariante mais forte, e a que o produto realmente precisa: nenhuma
   * feature, página ou componente conhece provider ou modelo. É isso que
   * permite trocar o modelo desta capacidade alterando só o catálogo
   * (mandato 004E §2).
   */
  it("nenhuma feature, página ou componente cita provider ou modelo", () => {
    const alvos = [
      join(process.cwd(), "src", "app"),
      join(process.cwd(), "src", "components"),
      join(process.cwd(), "src", "lib", "review"),
    ];

    for (const alvo of alvos) {
      for (const { nome, conteudo } of arquivosRecursivos(alvo)) {
        expect(conteudo, nome).not.toMatch(MARCAS_DE_PROVIDER);
        expect(conteudo, nome).not.toMatch(/\bmodel(Key)?\s*[:=]\s*["'`]/);
      }
    }
  });

  it("nenhum arquivo produtivo lê chave, token ou segredo de provider", () => {
    const segredos = /\b(api[_-]?key|apiKey|secret[_-]?key|bearer|authorization)\b/i;

    for (const { nome, conteudo } of arquivosDeProducao()) {
      expect(conteudo, nome).not.toMatch(segredos);
    }
  });

  it("nada na camada é exposto como NEXT_PUBLIC_", () => {
    for (const { nome, conteudo } of arquivosDeProducao()) {
      expect(conteudo, nome).not.toContain("NEXT_PUBLIC_");
    }
  });

  it("o runtime que toca banco ou executa é server-only", () => {
    // `contracts.ts` e `pricing.ts` são tipo e aritmética pura — não precisam
    // da marca. O resto sim: catálogo, ledger, Router e registros.
    const exigem = [
      "adapter-registry.ts",
      "catalog.ts",
      "router.ts",
      "run-ledger.ts",
      "task-registry.ts",
    ];

    for (const { nome, conteudo } of arquivosDeProducao()) {
      if (!exigem.includes(nome)) continue;
      expect(conteudo, nome).toContain('import "server-only"');
    }
  });

  it("o fake adapter vive fora de src/, onde produção não o alcança", () => {
    const nomes = arquivosDeProducao().map((a) => a.nome);

    expect(nomes.some((n) => n.includes("fake"))).toBe(false);

    for (const { nome, conteudo } of arquivosDeProducao()) {
      expect(conteudo, nome).not.toContain("test/support");
    }
  });

  it("a suíte roda sem qualquer credencial de provider", () => {
    // Nenhuma variável de ambiente de IA é lida em lugar nenhum da camada.
    for (const { nome, conteudo } of arquivosDeProducao()) {
      expect(conteudo, nome).not.toMatch(/process\.env\.[A-Z_]*AI[A-Z_]*/);
    }
  });
});
