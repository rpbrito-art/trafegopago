import { describe, expect, it, vi } from "vitest";

import {
  ANTHROPIC_PROVIDER_KEY,
  classificarErro,
  criarAnthropicAdapter,
  criarClienteAnthropicPadrao,
  normalizarUsage,
  type AnthropicClient,
} from "./anthropic";

/**
 * Adapter Anthropic — Correção 004E-04 §7.
 *
 * Nenhum teste aqui chama a API real. O que se prova é a tradução: request no
 * contrato oficial, usage normalizado para o contrato da 004A, erro do provider
 * virando taxonomia interna, e ausência de chave falhando de forma explícita em
 * vez de cair em qualquer coisa parecida com um fake.
 */

const REVIEW_JSON = JSON.stringify({
  summary: "Resumo do contexto declarado do negócio.",
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

const USAGE_VALIDO = { input_tokens: 1200, output_tokens: 300 };

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
    content?: unknown;
    usage?: Record<string, number> | null;
  },
  espiao?: (args: unknown, options?: unknown) => void,
): AnthropicClient {
  return {
    messages: {
      create: (async (args: unknown, options?: unknown) => {
        espiao?.(args, options);
        return resposta;
      }) as AnthropicClient["messages"]["create"],
    },
  };
}

/** Resposta bem formada do provider: bloco de texto com o JSON estruturado. */
function respostaOk(json = REVIEW_JSON) {
  return {
    content: [{ type: "text", text: json }],
    usage: USAGE_VALIDO,
  };
}

describe("normalizarUsage", () => {
  it("mapeia input e output para o contrato da 004A", () => {
    expect(normalizarUsage({ input_tokens: 1200, output_tokens: 300 })).toEqual({
      inputTokens: 1200,
      outputTokens: 300,
      cachedTokens: null,
    });
  });

  it("recusa metadata ausente ou vazia", () => {
    expect(normalizarUsage(null)).toBeNull();
    expect(normalizarUsage(undefined)).toBeNull();
    expect(normalizarUsage({})).toBeNull();
  });

  it("recusa quando falta uma das contagens obrigatórias", () => {
    expect(normalizarUsage({ input_tokens: 1200 })).toBeNull();
    expect(normalizarUsage({ output_tokens: 300 })).toBeNull();
  });

  /**
   * Numa task que envia prompt não vazio e exige JSON não vazio de volta,
   * entrada ou saída zero são impossíveis: o metadado não é confiável, e
   * registrar custo zero colocaria ficção no ledger.
   */
  it("recusa contagem zerada, negativa ou fracionária", () => {
    expect(normalizarUsage({ input_tokens: 0, output_tokens: 300 })).toBeNull();
    expect(normalizarUsage({ input_tokens: 1200, output_tokens: 0 })).toBeNull();
    expect(normalizarUsage({ input_tokens: -1, output_tokens: 300 })).toBeNull();
    expect(normalizarUsage({ input_tokens: 1200, output_tokens: 1.5 })).toBeNull();
  });

  /**
   * Prompt caching não é habilitado nesta rodada, e o contrato de custo da 004A
   * tem um único campo de cache — enquanto a Anthropic cobra leitura e criação
   * com preços distintos. Com tokens de cache presentes, qualquer decomposição
   * seria uma escolha sobre quanto a chamada custou.
   */
  it("recusa tokens de cache nesta rodada", () => {
    expect(
      normalizarUsage({ ...USAGE_VALIDO, cache_read_input_tokens: 500 }),
    ).toBeNull();
    expect(
      normalizarUsage({ ...USAGE_VALIDO, cache_creation_input_tokens: 500 }),
    ).toBeNull();
  });

  it("aceita campos de cache presentes e zerados", () => {
    expect(
      normalizarUsage({
        ...USAGE_VALIDO,
        cache_read_input_tokens: 0,
        cache_creation_input_tokens: 0,
      }),
    ).toEqual({ inputTokens: 1200, outputTokens: 300, cachedTokens: null });
  });
});

describe("classificarErro", () => {
  it("mapeia status do provider para a taxonomia interna", () => {
    expect(classificarErro({ status: 429 })).toBe("PROVIDER_RATE_LIMITED");
    expect(classificarErro({ status: 401 })).toBe("PROVIDER_REJECTED");
    expect(classificarErro({ status: 403 })).toBe("PROVIDER_REJECTED");
    expect(classificarErro({ status: 400 })).toBe("PROVIDER_REJECTED");
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
  it("declara a chave do provider catalogado", () => {
    expect(criarAnthropicAdapter().providerKey).toBe(ANTHROPIC_PROVIDER_KEY);
    expect(ANTHROPIC_PROVIDER_KEY).toBe("anthropic_claude");
  });

  /**
   * Sem chave não há chamada — e não há fake. Cair em resposta inventada com
   * custo zero seria o pior desfecho possível: a aplicação pareceria funcionar.
   */
  it("sem chave falha explicitamente e não chama o provider", async () => {
    const espiao = vi.fn();
    const adapter = criarAnthropicAdapter({
      lerApiKey: () => undefined,
      criarCliente: () => clienteQueResponde(respostaOk(), espiao),
    });

    const resultado = await adapter.execute(pedido());

    expect(resultado.ok).toBe(false);
    expect(!resultado.ok && resultado.errorClass).toBe("PROVIDER_UNAVAILABLE");
    expect(espiao).not.toHaveBeenCalled();
  });

  it("usa o modelo que veio do Router, sem literal próprio", async () => {
    const espiao = vi.fn();
    const adapter = criarAnthropicAdapter({
      lerApiKey: () => "chave-de-teste",
      criarCliente: () => clienteQueResponde(respostaOk(), espiao),
    });

    await adapter.execute({ ...pedido(), modelKey: "outro-modelo" });

    const [args] = espiao.mock.calls[0] as [Record<string, unknown>];
    expect(args.model).toBe("outro-modelo");
  });

  it("pede structured output por JSON Schema e limita a saída", async () => {
    const espiao = vi.fn();
    const adapter = criarAnthropicAdapter({
      lerApiKey: () => "chave-de-teste",
      criarCliente: () => clienteQueResponde(respostaOk(), espiao),
    });

    await adapter.execute(pedido());

    const [args] = espiao.mock.calls[0] as [
      {
        max_tokens: number;
        output_config: { format: { type: string; schema: unknown } };
        system: string;
        messages: { role: string }[];
      },
    ];

    expect(args.max_tokens).toBe(2048);
    expect(args.output_config.format.type).toBe("json_schema");
    expect(args.output_config.format.schema).toBeDefined();
    expect(args.system).toContain("Quoron");
    expect(args.messages[0].role).toBe("user");
  });

  /** Sem tools, sem web search e sem thinking: a task é síntese do declarado. */
  it("não habilita tools, busca externa nem raciocínio", async () => {
    const espiao = vi.fn();
    const adapter = criarAnthropicAdapter({
      lerApiKey: () => "chave-de-teste",
      criarCliente: () => clienteQueResponde(respostaOk(), espiao),
    });

    await adapter.execute(pedido());

    const [args] = espiao.mock.calls[0] as [Record<string, unknown>];

    expect(args.tools).toBeUndefined();
    expect(args.thinking).toBeUndefined();
    expect(args.mcp_servers).toBeUndefined();
  });

  /**
   * O SDK repete 2 vezes por padrão. Numa chamada paga, cada retentativa é
   * outra cobrança que o ledger registraria como uma execução só.
   */
  it("zera retentativas e fixa o timeout na própria chamada", async () => {
    const espiao = vi.fn();

    const adapter = criarAnthropicAdapter({
      lerApiKey: () => "chave-de-teste",
      criarCliente: () => clienteQueResponde(respostaOk(), espiao),
    });

    await adapter.execute(pedido());

    const [, options] = espiao.mock.calls[0] as [unknown, Record<string, unknown>];

    expect(options.maxRetries).toBe(0);
    expect(options.timeout).toBe(45_000);
  });

  /**
   * A configuração da chamada não bastaria: um cliente construído com o padrão
   * do SDK repetiria 2 vezes em qualquer caminho que não passasse pelas opções
   * por request. A garantia precisa estar no cliente real.
   */
  it("o cliente de produção nasce sem retry e com timeout interativo", () => {
    const cliente = criarClienteAnthropicPadrao("chave-de-teste");

    expect(cliente.maxRetries).toBe(0);
    expect(cliente.timeout).toBe(45_000);
  });

  it("devolve o output como dado ainda não validado, com usage normalizado", async () => {
    const adapter = criarAnthropicAdapter({
      lerApiKey: () => "chave-de-teste",
      criarCliente: () => clienteQueResponde(respostaOk()),
    });

    const resultado = await adapter.execute(pedido());

    expect(resultado.ok).toBe(true);
    expect(resultado.ok && resultado.usage).toEqual({
      inputTokens: 1200,
      outputTokens: 300,
      cachedTokens: null,
    });
    expect(resultado.ok && (resultado.output as { summary: string }).summary).toContain(
      "Resumo",
    );
  });

  it("concatena blocos de texto antes de interpretar o JSON", async () => {
    const metade = REVIEW_JSON.slice(0, 40);
    const resto = REVIEW_JSON.slice(40);

    const adapter = criarAnthropicAdapter({
      lerApiKey: () => "chave-de-teste",
      criarCliente: () =>
        clienteQueResponde({
          content: [
            { type: "text", text: metade },
            { type: "text", text: resto },
          ],
          usage: USAGE_VALIDO,
        }),
    });

    const resultado = await adapter.execute(pedido());

    expect(resultado.ok).toBe(true);
  });

  it("resposta sem bloco textual vira falha de schema", async () => {
    const adapter = criarAnthropicAdapter({
      lerApiKey: () => "chave-de-teste",
      criarCliente: () =>
        clienteQueResponde({ content: [{ type: "thinking" }], usage: USAGE_VALIDO }),
    });

    const resultado = await adapter.execute(pedido());

    expect(!resultado.ok && resultado.errorClass).toBe("OUTPUT_SCHEMA_INVALID");
  });

  it("texto que não é JSON vira falha de schema, não exceção", async () => {
    const adapter = criarAnthropicAdapter({
      lerApiKey: () => "chave-de-teste",
      criarCliente: () =>
        clienteQueResponde({
          content: [{ type: "text", text: "desculpe, não consegui" }],
          usage: USAGE_VALIDO,
        }),
    });

    const resultado = await adapter.execute(pedido());

    expect(!resultado.ok && resultado.errorClass).toBe("OUTPUT_SCHEMA_INVALID");
  });

  it("usage ausente falha em vez de estimar", async () => {
    const adapter = criarAnthropicAdapter({
      lerApiKey: () => "chave-de-teste",
      criarCliente: () =>
        clienteQueResponde({ content: [{ type: "text", text: REVIEW_JSON }], usage: null }),
    });

    const resultado = await adapter.execute(pedido());

    expect(!resultado.ok && resultado.errorClass).toBe("USAGE_INVALID");
  });

  it("tokens de cache inesperados falham fechado", async () => {
    const adapter = criarAnthropicAdapter({
      lerApiKey: () => "chave-de-teste",
      criarCliente: () =>
        clienteQueResponde({
          content: [{ type: "text", text: REVIEW_JSON }],
          usage: { ...USAGE_VALIDO, cache_read_input_tokens: 800 },
        }),
    });

    const resultado = await adapter.execute(pedido());

    expect(!resultado.ok && resultado.errorClass).toBe("USAGE_INVALID");
  });

  it("input fora do contrato não chega ao provider", async () => {
    const espiao = vi.fn();
    const adapter = criarAnthropicAdapter({
      lerApiKey: () => "chave-de-teste",
      criarCliente: () => clienteQueResponde(respostaOk(), espiao),
    });

    const resultado = await adapter.execute({
      ...pedido(),
      input: { qualquer: "coisa" },
    });

    expect(!resultado.ok && resultado.errorClass).toBe("INPUT_SCHEMA_INVALID");
    expect(espiao).not.toHaveBeenCalled();
  });

  /** Mensagem do provider é justamente onde credencial costuma vazar. */
  it("erro do provider não vaza mensagem nem chave", async () => {
    const adapter = criarAnthropicAdapter({
      lerApiKey: () => "sk-ant-chave-secreta",
      criarCliente: () => ({
        messages: {
          create: (async () => {
            throw Object.assign(
              new Error("invalid x-api-key: sk-ant-chave-secreta"),
              { status: 401 },
            );
          }) as AnthropicClient["messages"]["create"],
        },
      }),
    });

    const resultado = await adapter.execute(pedido());

    expect(resultado.ok).toBe(false);
    expect(!resultado.ok && resultado.errorClass).toBe("PROVIDER_REJECTED");

    const serializado = JSON.stringify(resultado);
    expect(serializado).not.toMatch(/sk-ant|x-api-key|invalid/i);
  });

  it("nada do adapter expõe a chave em resultado de sucesso", async () => {
    const adapter = criarAnthropicAdapter({
      lerApiKey: () => "sk-ant-chave-secreta",
      criarCliente: () => clienteQueResponde(respostaOk()),
    });

    const resultado = await adapter.execute(pedido());

    expect(JSON.stringify(resultado)).not.toContain("sk-ant");
  });
});
