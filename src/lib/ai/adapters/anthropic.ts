import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import { declaredContextSnapshotSchema } from "@/lib/review/snapshot";

import {
  DECLARED_CONTEXT_REVIEW_SYSTEM_PROMPT,
  montarPromptDoUsuario,
} from "../prompts/declared-context-review";
import { declaredContextReviewJsonSchema } from "../tasks/declared-context-review";
import type {
  AIAdapterRequest,
  AIAdapterResult,
  AIAdapterUsage,
  AIErrorClass,
  AIProviderAdapter,
} from "../contracts";

/**
 * Adapter nativo da Claude API (Correção 004E-04).
 *
 * Traduz protocolo, e só isso: não conhece tenant, não decide autorização e
 * não escolhe modelo — `modelKey` chega do Router, resolvido pelo catálogo
 * (`AI_ARCHITECTURE.md` §20). É essa indireção que permitiu trocar o primeiro
 * provider real sem tocar em nenhuma feature.
 *
 * A chave vive em `ANTHROPIC_API_KEY`, lida server-side no momento da chamada.
 * Ausência falha explicitamente: cair em fake por falta de credencial seria o
 * pior desfecho possível — a aplicação pareceria funcionar, produzindo
 * respostas inventadas com custo zero.
 */

export const ANTHROPIC_PROVIDER_KEY = "anthropic_claude";

/** Teto de saída da task. Output sem teto é custo sem teto. */
const MAX_OUTPUT_TOKENS = 2048;

/** Interativo: acima disto, o usuário já desistiu da tela. */
const TIMEOUT_MS = 45_000;

/**
 * Zero retentativas automáticas.
 *
 * O SDK repete 2 vezes por padrão. Numa chamada paga, cada retentativa é outra
 * cobrança que o ledger registraria como uma única execução — e o teto de 3/h
 * da organização passaria a valer três vezes menos do que diz.
 */
const MAX_RETRIES = 0;

type AnthropicUsage = {
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
};

/**
 * Normaliza o usage do provider para o contrato da 004A.
 *
 * `input_tokens` e `output_tokens` são obrigatórios e positivos: numa task que
 * envia prompt não vazio e exige JSON não vazio de volta, contagem ausente ou
 * zerada significa metadado não confiável, não chamada gratuita. Estimar por
 * tamanho de texto seria pior — colocaria ficção no ledger.
 *
 * Tokens de cache **reprovam** nesta rodada. A Anthropic cobra leitura e
 * criação de cache com preços distintos, e o contrato de custo da 004A tem um
 * único campo para cache: com os dois presentes, qualquer decomposição seria
 * uma escolha arbitrária sobre quanto a chamada custou. Prompt caching não é
 * habilitado aqui, então tokens de cache indicam que algo mudou — e falhar
 * fechado é mais honesto do que registrar um custo que não fecha.
 */
export function normalizarUsage(
  usage: AnthropicUsage | null | undefined,
): AIAdapterUsage | null {
  if (!usage) return null;

  const input = usage.input_tokens;
  const output = usage.output_tokens;

  for (const obrigatorio of [input, output]) {
    if (typeof obrigatorio !== "number") return null;
    if (!Number.isInteger(obrigatorio) || obrigatorio <= 0) return null;
  }

  const cacheRead = usage.cache_read_input_tokens ?? 0;
  const cacheCreation = usage.cache_creation_input_tokens ?? 0;

  for (const cache of [cacheRead, cacheCreation]) {
    if (!Number.isInteger(cache) || cache < 0) return null;
  }

  if (cacheRead > 0 || cacheCreation > 0) return null;

  return {
    inputTokens: input as number,
    outputTokens: output as number,
    // `null`, e não `0`: sem caching habilitado, "não veio de cache" e "não sei
    // quanto veio" são a mesma coisa aqui, e o contrato reserva `null` para a
    // ausência de informação.
    cachedTokens: null,
  };
}

/**
 * Traduz o erro do provider para a taxonomia interna.
 *
 * Nada do erro original atravessa: além de amarrar regra de negócio à versão de
 * uma API externa, `message` é justamente onde credencial costuma vazar
 * (`SECURITY_MODEL.md` §15).
 */
export function classificarErro(erro: unknown): AIErrorClass {
  if (erro instanceof Anthropic.AuthenticationError) return "PROVIDER_REJECTED";
  if (erro instanceof Anthropic.PermissionDeniedError) return "PROVIDER_REJECTED";
  if (erro instanceof Anthropic.BadRequestError) return "PROVIDER_REJECTED";
  if (erro instanceof Anthropic.RateLimitError) return "PROVIDER_RATE_LIMITED";
  if (erro instanceof Anthropic.APIConnectionTimeoutError) return "TIMEOUT";
  if (erro instanceof Anthropic.InternalServerError) return "PROVIDER_UNAVAILABLE";
  if (erro instanceof Anthropic.APIConnectionError) return "PROVIDER_UNAVAILABLE";

  // O `instanceof` cobre o SDK; o status cobre um erro que chegue por outro
  // caminho sem deixar de ser classificável.
  const status = (erro as { status?: number } | null)?.status;

  if (status === 429) return "PROVIDER_RATE_LIMITED";
  if (status === 400 || status === 401 || status === 403) return "PROVIDER_REJECTED";
  if (typeof status === "number" && status >= 500) return "PROVIDER_UNAVAILABLE";

  if (erro instanceof Error && erro.name === "AbortError") return "TIMEOUT";

  return "UNKNOWN";
}

/** Cliente injetável para teste; em produção é o SDK oficial. */
export type AnthropicClient = {
  messages: {
    create(args: unknown, options?: unknown): Promise<{
      content?: unknown;
      usage?: AnthropicUsage | null;
      stop_reason?: string | null;
    }>;
  };
};

/**
 * Extrai o JSON da resposta.
 *
 * Structured output chega como bloco de texto; conteúdo inesperado ou ausente
 * falha fechado. O adapter não tenta "consertar" a resposta — reparar JSON
 * quebrado transformaria uma falha visível numa revisão silenciosamente
 * diferente da que o modelo produziu.
 */
function extrairJson(content: unknown): unknown | null {
  if (!Array.isArray(content)) return null;

  const textos = content
    .filter(
      (bloco): bloco is { type: string; text: string } =>
        typeof bloco === "object" &&
        bloco !== null &&
        (bloco as { type?: unknown }).type === "text" &&
        typeof (bloco as { text?: unknown }).text === "string",
    )
    .map((bloco) => bloco.text)
    .join("");

  if (textos.trim() === "") return null;

  try {
    return JSON.parse(textos);
  } catch {
    return null;
  }
}

/**
 * Cliente de produção.
 *
 * Exportado para ser testável: as duas garantias de custo previsível —
 * nenhuma retentativa e teto de tempo — vivem aqui, e um teste que só
 * inspecionasse a chamada não provaria que o cliente real as tem.
 */
export function criarClienteAnthropicPadrao(apiKey: string): Anthropic {
  return new Anthropic({
    apiKey,
    maxRetries: MAX_RETRIES,
    timeout: TIMEOUT_MS,
  });
}

export function criarAnthropicAdapter(deps: {
  /** Lê a chave no momento da chamada, nunca no import. */
  lerApiKey?: () => string | undefined;
  criarCliente?: (apiKey: string) => AnthropicClient;
  agora?: () => number;
} = {}): AIProviderAdapter {
  const lerApiKey = deps.lerApiKey ?? (() => process.env.ANTHROPIC_API_KEY);
  const criarCliente =
    deps.criarCliente ??
    ((apiKey: string) =>
      criarClienteAnthropicPadrao(apiKey) as unknown as AnthropicClient);
  const agora = deps.agora ?? (() => Date.now());

  return {
    providerKey: ANTHROPIC_PROVIDER_KEY,

    async execute(request: AIAdapterRequest): Promise<AIAdapterResult> {
      const inicio = agora();

      const apiKey = lerApiKey();

      // Sem chave não há chamada — e não há fake. `PROVIDER_UNAVAILABLE` é
      // exato: o provider existe no catálogo, mas não está alcançável deste
      // runtime.
      if (!apiKey) {
        return { ok: false, errorClass: "PROVIDER_UNAVAILABLE", latencyMs: 0 };
      }

      // O adapter recebe `unknown` e valida: o input do Router já passou pelo
      // schema da task, mas um adapter que confia no chamador é um adapter que
      // manda lixo para uma API paga.
      const snapshot = declaredContextSnapshotSchema.safeParse(request.input);

      if (!snapshot.success) {
        return { ok: false, errorClass: "INPUT_SCHEMA_INVALID", latencyMs: 0 };
      }

      try {
        const cliente = criarCliente(apiKey);

        const resposta = await cliente.messages.create(
          {
            // Modelo vem do Router. Nenhum literal de modelo aqui.
            model: request.modelKey,
            max_tokens: MAX_OUTPUT_TOKENS,
            system: DECLARED_CONTEXT_REVIEW_SYSTEM_PROMPT,
            messages: [
              { role: "user", content: montarPromptDoUsuario(snapshot.data) },
            ],
            // Structured output pelo mesmo JSON Schema já versionado da task.
            // Duplicá-lo aqui criaria duas verdades sobre a forma da resposta.
            output_config: {
              format: {
                type: "json_schema",
                schema: declaredContextReviewJsonSchema,
              },
            },
            // Sem tools, sem web search, sem citations e sem thinking: esta
            // task é síntese do que já está estruturado.
          },
          // Redundante com o cliente, e proposital: se alguém injetar outro
          // cliente amanhã, a chamada continua sem retentativa e com o mesmo
          // teto de tempo.
          { maxRetries: MAX_RETRIES, timeout: TIMEOUT_MS },
        );

        const latencyMs = agora() - inicio;

        const usage = normalizarUsage(resposta.usage);

        // Sem usage confiável não há custo confiável, e o Router precisa saber
        // disso antes de concluir a execução.
        if (!usage) return { ok: false, errorClass: "USAGE_INVALID", latencyMs };

        const output = extrairJson(resposta.content);

        if (output === null) {
          return { ok: false, errorClass: "OUTPUT_SCHEMA_INVALID", latencyMs };
        }

        // O output sobe como `unknown`: quem o transforma em tipo é o schema da
        // task, no Router. Conteúdo produzido por modelo é dado não confiável
        // como qualquer outro.
        return { ok: true, output, usage, latencyMs };
      } catch (erro) {
        return {
          ok: false,
          errorClass: classificarErro(erro),
          latencyMs: agora() - inicio,
        };
      }
    },
  };
}

export const anthropicAdapter: AIProviderAdapter = criarAnthropicAdapter();
