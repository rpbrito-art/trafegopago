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

  it("nenhum arquivo produtivo cita marca de provider de IA", () => {
    // Feature nunca contém `if provider === ...`; a camada inteira também não
    // deve conhecer nome comercial (`AI_ARCHITECTURE.md` §20).
    const marcas =
      /\b(openai|anthropic|claude|gemini|vertex|bedrock|mistral|cohere|groq|kimi|deepseek)\b/i;

    for (const { nome, conteudo } of arquivosDeProducao()) {
      expect(conteudo, nome).not.toMatch(marcas);
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
