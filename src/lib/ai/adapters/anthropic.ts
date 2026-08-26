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

/**
 * Stop reasons desta task (Correção 004E-05 §4).
 *
 * A Messages API devolve `stop_reason` em toda resposta **HTTP 200**. Só
 * `end_turn` significa que o modelo terminou o que foi pedido; os demais
 * descrevem uma resposta que existe, consumiu input, e não serve:
 *
 * - `refusal` — o classificador de segurança recusou. Vem como 200, com
 *   `content: []` e `output_tokens: 0`, e pode não respeitar o schema;
 * - `max_tokens` — a saída foi cortada no teto. O JSON pode até parsear e
 *   ainda assim estar incompleto;
 * - qualquer outro (`tool_use`, `pause_turn`, `stop_sequence`,
 *   `model_context_window_exceeded`) — esta task não usa tools, server tools
 *   nem stop sequences, então nenhum deles deveria aparecer. Se aparecer, algo
 *   mudou no provider e a resposta não é confiável.
 *
 * A documentação sugere fallback para outro modelo diante de `refusal`. Não
 * nesta rodada: fallback multi-provider é decisão de outra rodada, e retry
 * automático dobraria uma cobrança que o ledger registraria como uma só.
 */
const STOP_REASON_NORMAL = "end_turn";

type AnthropicUsage = {
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
};

/**
 * Normaliza o usage do provider para o contrato da 004A.
 *
 * Esta função responde **quanto a resposta consumiu**, não se ela serve. São
 * perguntas diferentes, e confundi-las custava dinheiro: a versão anterior
 * exigia `output_tokens > 0` aqui, então a recusa oficial da Anthropic — HTTP
 * 200, `content: []`, `input_tokens: 412`, `output_tokens: 0` — tinha o usage
 * descartado antes mesmo de o stop reason ser classificado, e o input
 * consumido sumia do ledger (Correção 004E-06 §3).
 *
 * Por isso os dois campos têm regras distintas:
 *
 * - `input_tokens` continua obrigatório e `> 0`: o prompt desta task nunca é
 *   vazio, então zero de input é metadado quebrado, não chamada de graça;
 * - `output_tokens` aceita `0`, porque numa resposta anormal zero é um fato
 *   conhecido sobre o consumo, não ausência de informação.
 *
 * Ausente, fracionário ou negativo continua inválido nos dois. Estimar token
 * por tamanho de texto seria pior que falhar — colocaria ficção no ledger.
 *
 * Saída zero não vira sucesso: quem decide isso é `execute`, que tem o stop
 * reason na mão.
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

  if (typeof input !== "number" || !Number.isInteger(input) || input <= 0) {
    return null;
  }

  if (typeof output !== "number" || !Number.isInteger(output) || output < 0) {
    return null;
  }

  const cacheRead = usage.cache_read_input_tokens ?? 0;
  const cacheCreation = usage.cache_creation_input_tokens ?? 0;

  for (const cache of [cacheRead, cacheCreation]) {
    if (!Number.isInteger(cache) || cache < 0) return null;
  }

  if (cacheRead > 0 || cacheCreation > 0) return null;

  return {
    inputTokens: input,
    outputTokens: output,
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

/**
 * Traduz um `stop_reason` anormal para a taxonomia interna.
 *
 * `refusal` é rejeição do provider — a resposta existe, consumiu input, e o
 * conteúdo não pode ser usado. `max_tokens` é output incompleto, que é
 * literalmente uma falha de forma. O resto é comportamento que esta task não
 * pediu, e `UNKNOWN` diz exatamente isso: não sabemos o que aconteceu.
 *
 * Nada do texto da recusa, nem `stop_details`, atravessa: o motivo de uma
 * recusa é conteúdo produzido pelo provider sobre o input do cliente, e o
 * ledger guarda classe de erro, não narrativa.
 */
export function classificarStopReason(
  stopReason: string | null | undefined,
): AIErrorClass {
  if (stopReason === "refusal") return "PROVIDER_REJECTED";
  if (stopReason === "max_tokens") return "OUTPUT_SCHEMA_INVALID";

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

        // Usage primeiro, antes de qualquer decisão sobre o conteúdo: a partir
        // daqui a chamada **já consumiu tokens**, e toda falha precisa poder
        // carregar o que ela consumiu.
        //
        // A tarifação exata de uma recusa é do provider, não nossa: a
        // documentação vigente diz que recusa antes de qualquer output não é
        // cobrada, e que recusa em meio a stream cobra o que já saiu. O ledger
        // registra `estimated_cost` — estimativa a partir do consumo conhecido
        // e do preço vigente. Registrar o consumo e deixar a fatura corrigir a
        // estimativa é seguro; descartar o consumo, não.
        const usage = normalizarUsage(resposta.usage);

        // Sem usage confiável não há custo confiável, e o Router precisa saber
        // disso antes de concluir a execução.
        if (!usage) return { ok: false, errorClass: "USAGE_INVALID", latencyMs };

        const stopReason = resposta.stop_reason;

        if (stopReason !== STOP_REASON_NORMAL) {
          return {
            ok: false,
            errorClass: classificarStopReason(stopReason),
            usage,
            latencyMs,
          };
        }

        // `end_turn` com saída zero: o provider diz que terminou normalmente e
        // ao mesmo tempo que não produziu nada. Não é sucesso — esta task exige
        // JSON não vazio de volta — mas o input foi consumido. Falha contábil
        // com o usage conhecido, sem inventar output que não existiu.
        if (usage.outputTokens === 0) {
          return { ok: false, errorClass: "USAGE_INVALID", usage, latencyMs };
        }

        const output = extrairJson(resposta.content);

        if (output === null) {
          // O provider respondeu e cobrou; o conteúdo é que não serve. O usage
          // sobe junto para o run registrar o custo do que aconteceu.
          return {
            ok: false,
            errorClass: "OUTPUT_SCHEMA_INVALID",
            usage,
            latencyMs,
          };
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
