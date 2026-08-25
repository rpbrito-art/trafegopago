import { describe, expect, it, vi } from "vitest";

import {
  classificarErro,
  criarGeminiAdapter,
  normalizarUsage,
  type GeminiClient,
} from "./gemini";

/**
 * Adapter Gemini — Rodada 004E §§6 e 13.
 *
 * Nenhum teste aqui chama a API real. O que se prova é a tradução: usage
 * normalizado para o contrato da 004A, erro do provider virando taxonomia
 * interna, e ausência de chave falhando de forma explícita em vez de cair em
 * qualquer coisa parecida com um fake.
 */

const REVIEW_JSON = JSON.stringify({
  summary: "Resumo",
  declaredFacts: [{ statement: "Fato", evidenceRefs: ["business.segment"] }],
  gaps: [],
  tensions: [],
  nextQuestion: null,
  limitations: ["Somente o declarado."],
});

const SNAPSHOT = {
  snapshotVersion: "1",
  facts: [{ ref: "business.segment", label: "Segmento", value: "Barbearia" }],
  missingTopics: [],
};

function pedido() {
  return {
    modelKey: "modelo-do-catalogo",
    promptVersion: "v1",
    schemaVersion: "v1",
    input: SNAPSHOT,
    latencyClass: "INTERACTIVE" as const,
  };
}

function clienteQueResponde(
  resposta: {
    text?: string | null;
    usageMetadata?: Record<string, number> | null;
  },
  espiao?: (args: unknown) => void,
): GeminiClient {
  return {
    models: {
      generateContent: (async (args: unknown) => {
        espiao?.(args);
        return resposta;
      }) as GeminiClient["models"]["generateContent"],
    },
  };
}

describe("normalizarUsage", () => {
  /**
   * O contrato da 004A define `cachedTokens` disjunto de `inputTokens`, e o
   * Gemini reporta `promptTokenCount` já incluindo o cache. Somar os dois
   * cobraria a mesma entrada duas vezes.
   */
  it("subtrai a parcela cacheada da entrada", () => {
    const usage = normalizarUsage({
      promptTokenCount: 1000,
      cachedContentTokenCount: 400,
      candidatesTokenCount: 200,
    });

    expect(usage).toEqual({
      inputTokens: 600,
      outputTokens: 200,
      cachedTokens: 400,
    });
  });

  /** Tokens de raciocínio são cobrados como saída. */
  it("soma tokens de raciocínio à saída", () => {
    const usage = normalizarUsage({
      promptTokenCount: 100,
      candidatesTokenCount: 50,
      thoughtsTokenCount: 30,
    });

    expect(usage?.outputTokens).toBe(80);
  });

  /** `null` é "não sei"; `0` afirmaria que nada veio de cache. */
  it("preserva a ausência de informação de cache", () => {
    const usage = normalizarUsage({
      promptTokenCount: 100,
      candidatesTokenCount: 10,
    });

    expect(usage?.cachedTokens).toBeNull();
    expect(usage?.inputTokens).toBe(100);
  });

  /** Nenhuma estimativa por tamanho de texto: ou o provider informou, ou falha. */
  it("não estima tokens quando o provider não informa", () => {
    expect(normalizarUsage(undefined)).toBeNull();
    expect(normalizarUsage({ thoughtsTokenCount: 10 })).toBeNull();
  });

  it("recusa contagem negativa, fracionária ou incoerente", () => {
    expect(normalizarUsage({ promptTokenCount: -1, candidatesTokenCount: 10 })).toBeNull();
    expect(normalizarUsage({ promptTokenCount: 10, candidatesTokenCount: 1.5 })).toBeNull();
    // Cache maior que o prompt total tornaria a entrada negativa.
    expect(
      normalizarUsage({
        promptTokenCount: 10,
        candidatesTokenCount: 5,
        cachedContentTokenCount: 20,
      }),
    ).toBeNull();
    expect(normalizarUsage(null)).toBeNull();
  });

  /**
   * Correção 004E-02 §4.
   *
   * A versão anterior fazia `?? 0`, convertendo "o provider não informou" em
   * "custou nada" — e uma chamada paga entraria no ledger como gratuita. Numa
   * task que envia prompt não vazio e exige JSON não vazio de volta, entrada
   * ou saída zero são impossíveis: se aparecem, o metadado não é confiável.
   */
  it("metadata vazia não vira custo zero", () => {
    expect(normalizarUsage({})).toBeNull();
  });

  it("recusa quando falta uma das contagens obrigatórias", () => {
    expect(normalizarUsage({ promptTokenCount: 100 })).toBeNull();
    expect(normalizarUsage({ candidatesTokenCount: 20 })).toBeNull();
  });

  it("recusa entrada ou saída zeradas numa resposta textual", () => {
    expect(
      normalizarUsage({ promptTokenCount: 0, candidatesTokenCount: 20 }),
    ).toBeNull();
    expect(
      normalizarUsage({ promptTokenCount: 100, candidatesTokenCount: 0 }),
    ).toBeNull();
  });

  /** Opcional ausente tem significado próprio e não invalida a contagem. */
  it("aceita cache e raciocínio ausentes", () => {
    const usage = normalizarUsage({
      promptTokenCount: 100,
      candidatesTokenCount: 20,
    });

    expect(usage).toEqual({
      inputTokens: 100,
      outputTokens: 20,
      cachedTokens: null,
    });
  });

  it("aceita cache informado e o mantém disjunto da entrada", () => {
    const usage = normalizarUsage({
      promptTokenCount: 1000,
      cachedContentTokenCount: 250,
      candidatesTokenCount: 40,
    });

    expect(usage).toEqual({
      inputTokens: 750,
      outputTokens: 40,
      cachedTokens: 250,
    });
  });

  it("recusa opcional fracionário ou negativo", () => {
    expect(
      normalizarUsage({
        promptTokenCount: 100,
        candidatesTokenCount: 20,
        cachedContentTokenCount: -5,
      }),
    ).toBeNull();
    expect(
      normalizarUsage({
        promptTokenCount: 100,
        candidatesTokenCount: 20,
        thoughtsTokenCount: 2.5,
      }),
    ).toBeNull();
  });
});

describe("classificarErro", () => {
  it("mapeia status do provider para a taxonomia interna", () => {
    expect(classificarErro({ status: 429 })).toBe("PROVIDER_RATE_LIMITED");
    expect(classificarErro({ status: 400 })).toBe("PROVIDER_REJECTED");
    expect(classificarErro({ status: 403 })).toBe("PROVIDER_REJECTED");
    expect(classificarErro({ status: 503 })).toBe("PROVIDER_UNAVAILABLE");
  });

  it("reconhece abort como timeout", () => {
    const abort = new Error("aborted");
    abort.name = "AbortError";

    expect(classificarErro(abort)).toBe("TIMEOUT");
  });

  it("desconhecido não vira suposição", () => {
    expect(classificarErro(new Error("algo estranho"))).toBe("UNKNOWN");
  });
});

describe("execute", () => {
  /**
   * Sem chave não há chamada — e não há fake. Cair em resposta inventada com
   * custo zero seria o pior desfecho possível: a aplicação pareceria funcionar.
   */
  it("sem chave falha explicitamente e não chama o provider", async () => {
    const espiao = vi.fn();
    const adapter = criarGeminiAdapter({
      lerApiKey: () => undefined,
      criarCliente: () => clienteQueResponde({ text: REVIEW_JSON }, espiao),
    });

    const resultado = await adapter.execute(pedido());

    expect(resultado.ok).toBe(false);
    expect(!resultado.ok && resultado.errorClass).toBe("PROVIDER_UNAVAILABLE");
    expect(espiao).not.toHaveBeenCalled();
  });

  it("usa o modelo que veio do Router, sem literal próprio", async () => {
    const espiao = vi.fn();
    const adapter = criarGeminiAdapter({
      lerApiKey: () => "chave-de-teste",
      criarCliente: () =>
        clienteQueResponde(
          {
            text: REVIEW_JSON,
            usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 20 },
          },
          espiao,
        ),
    });

    await adapter.execute({ ...pedido(), modelKey: "outro-modelo" });

    const [args] = espiao.mock.calls[0] as [Record<string, unknown>];
    expect(args.model).toBe("outro-modelo");
  });

  it("desabilita raciocínio e limita a saída", async () => {
    const espiao = vi.fn();
    const adapter = criarGeminiAdapter({
      lerApiKey: () => "chave-de-teste",
      criarCliente: () =>
        clienteQueResponde(
          {
            text: REVIEW_JSON,
            usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 20 },
          },
          espiao,
        ),
    });

    await adapter.execute(pedido());

    const [args] = espiao.mock.calls[0] as [
      { config: Record<string, unknown> },
    ];

    expect(args.config.thinkingConfig).toEqual({ thinkingBudget: 0 });
    expect(args.config.maxOutputTokens).toBeGreaterThan(0);
    expect(args.config.responseMimeType).toBe("application/json");
  });

  it("devolve o output como dado ainda não validado", async () => {
    const adapter = criarGeminiAdapter({
      lerApiKey: () => "chave-de-teste",
      criarCliente: () =>
        clienteQueResponde({
          text: REVIEW_JSON,
          usageMetadata: {
            promptTokenCount: 100,
            candidatesTokenCount: 20,
          },
        }),
    });

    const resultado = await adapter.execute(pedido());

    expect(resultado.ok).toBe(true);
    expect(resultado.ok && resultado.usage).toEqual({
      inputTokens: 100,
      outputTokens: 20,
      cachedTokens: null,
    });
  });

  it("resposta que não é JSON vira falha de schema, não exceção", async () => {
    const adapter = criarGeminiAdapter({
      lerApiKey: () => "chave-de-teste",
      criarCliente: () =>
        clienteQueResponde({
          text: "desculpe, não consegui",
          usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5 },
        }),
    });

    const resultado = await adapter.execute(pedido());

    expect(!resultado.ok && resultado.errorClass).toBe("OUTPUT_SCHEMA_INVALID");
  });

  it("usage ausente falha em vez de estimar", async () => {
    const adapter = criarGeminiAdapter({
      lerApiKey: () => "chave-de-teste",
      criarCliente: () => clienteQueResponde({ text: REVIEW_JSON, usageMetadata: null }),
    });

    const resultado = await adapter.execute(pedido());

    expect(!resultado.ok && resultado.errorClass).toBe("USAGE_INVALID");
  });

  it("input fora do contrato não chega ao provider", async () => {
    const espiao = vi.fn();
    const adapter = criarGeminiAdapter({
      lerApiKey: () => "chave-de-teste",
      criarCliente: () => clienteQueResponde({ text: REVIEW_JSON }, espiao),
    });

    const resultado = await adapter.execute({
      ...pedido(),
      input: { qualquer: "coisa" },
    });

    expect(!resultado.ok && resultado.errorClass).toBe("INPUT_SCHEMA_INVALID");
    expect(espiao).not.toHaveBeenCalled();
  });

  /** Mensagem do provider é justamente onde credencial costuma vazar. */
  it("erro do provider não vaza mensagem original", async () => {
    const adapter = criarGeminiAdapter({
      lerApiKey: () => "chave-de-teste",
      criarCliente: () => ({
        models: {
          generateContent: (async () => {
            throw Object.assign(new Error("API key AIzaSy... inválida"), {
              status: 403,
            });
          }) as GeminiClient["models"]["generateContent"],
        },
      }),
    });

    const resultado = await adapter.execute(pedido());

    expect(resultado.ok).toBe(false);
    expect(JSON.stringify(resultado)).not.toMatch(/AIzaSy|API key/);
    expect(!resultado.ok && resultado.errorClass).toBe("PROVIDER_REJECTED");
  });
});
