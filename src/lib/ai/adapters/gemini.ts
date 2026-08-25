import "server-only";

import { GoogleGenAI } from "@google/genai";

import {
  DECLARED_CONTEXT_REVIEW_SYSTEM_PROMPT,
  montarPromptDoUsuario,
} from "../prompts/declared-context-review";
import { declaredContextSnapshotSchema } from "@/lib/review/snapshot";
import { declaredContextReviewJsonSchema } from "../tasks/declared-context-review";
import type {
  AIAdapterRequest,
  AIAdapterResult,
  AIAdapterUsage,
  AIErrorClass,
  AIProviderAdapter,
} from "../contracts";

/**
 * Adapter nativo do Google Gemini (Rodada 004E §6).
 *
 * Traduz protocolo, e só isso: não conhece tenant, não decide autorização e
 * não escolhe modelo — `modelKey` chega do Router, resolvido pelo catálogo
 * (`AI_ARCHITECTURE.md` §20).
 *
 * A chave vive em `GEMINI_API_KEY`, lida server-side no momento da chamada.
 * Ausência falha explicitamente: cair em fake por falta de credencial seria o
 * pior desfecho possível — a aplicação pareceria funcionar, produzindo
 * respostas inventadas com custo zero.
 */

export const GEMINI_PROVIDER_KEY = "google_gemini";

/** Teto de saída da task. Output sem teto é custo sem teto. */
const MAX_OUTPUT_TOKENS = 2048;

/** Interativo: acima disto, o usuário já desistiu da tela. */
const TIMEOUT_MS = 45_000;

type GeminiUsageMetadata = {
  promptTokenCount?: number | null;
  cachedContentTokenCount?: number | null;
  candidatesTokenCount?: number | null;
  thoughtsTokenCount?: number | null;
};

/**
 * Normaliza o usage do provider para o contrato da 004A.
 *
 * Dois ajustes que não são cosméticos:
 *
 * - o contrato define `cachedTokens` **disjunto** de `inputTokens`, enquanto o
 *   Gemini reporta `promptTokenCount` já incluindo a parcela cacheada. Somar os
 *   dois cobraria a mesma entrada duas vezes;
 * - `thoughtsTokenCount` é cobrado como saída, então entra em `outputTokens`.
 *   Esta task não habilita raciocínio, mas normalizar o campo evita que uma
 *   mudança de default do provider passe despercebida na conta.
 *
 * Qualquer contagem inválida vira `USAGE_INVALID` em vez de estimativa: um
 * custo estimado por chute é pior do que uma falha visível (§6.1).
 */
export function normalizarUsage(
  metadata: GeminiUsageMetadata | null | undefined,
): AIAdapterUsage | null {
  if (!metadata) return null;

  const prompt = metadata.promptTokenCount ?? 0;
  const cached = metadata.cachedContentTokenCount ?? 0;
  const candidates = metadata.candidatesTokenCount ?? 0;
  const thoughts = metadata.thoughtsTokenCount ?? 0;

  for (const valor of [prompt, cached, candidates, thoughts]) {
    if (!Number.isInteger(valor) || valor < 0) return null;
  }

  const inputTokens = prompt - cached;
  if (inputTokens < 0) return null;

  return {
    inputTokens,
    outputTokens: candidates + thoughts,
    // `null` quando o provider não informa cache: `0` afirmaria que nada veio
    // de cache, o que é diferente de não saber.
    cachedTokens: metadata.cachedContentTokenCount ?? null,
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
  const status = (erro as { status?: number } | null)?.status;
  const texto = erro instanceof Error ? erro.message : "";

  if (status === 429) return "PROVIDER_RATE_LIMITED";
  if (status === 400 || status === 403) return "PROVIDER_REJECTED";
  if (typeof status === "number" && status >= 500) return "PROVIDER_UNAVAILABLE";

  // O SDK não expõe status em toda falha de rede; o nome do erro de abort é
  // estável o bastante para distinguir timeout de indisponibilidade.
  if (erro instanceof Error && erro.name === "AbortError") return "TIMEOUT";
  if (/timeout/i.test(texto)) return "TIMEOUT";

  return "UNKNOWN";
}

/** Cliente injetável para teste; em produção é o SDK oficial. */
export type GeminiClient = {
  models: {
    generateContent(args: unknown): Promise<{
      text?: string | null;
      usageMetadata?: GeminiUsageMetadata | null;
    }>;
  };
};

export function criarGeminiAdapter(deps: {
  /** Lê a chave no momento da chamada, nunca no import. */
  lerApiKey?: () => string | undefined;
  criarCliente?: (apiKey: string) => GeminiClient;
  agora?: () => number;
} = {}): AIProviderAdapter {
  const lerApiKey = deps.lerApiKey ?? (() => process.env.GEMINI_API_KEY);
  const criarCliente =
    deps.criarCliente ??
    ((apiKey: string) => new GoogleGenAI({ apiKey }) as unknown as GeminiClient);
  const agora = deps.agora ?? (() => Date.now());

  return {
    providerKey: GEMINI_PROVIDER_KEY,

    async execute(request: AIAdapterRequest): Promise<AIAdapterResult> {
      const inicio = agora();

      const apiKey = lerApiKey();

      // Sem chave não há chamada — e não há fake. `PROVIDER_UNAVAILABLE` é
      // exato: o provider existe no catálogo, mas não está alcançável deste
      // runtime.
      if (!apiKey) {
        return { ok: false, errorClass: "PROVIDER_UNAVAILABLE", latencyMs: 0 };
      }

      // O adapter recebe `unknown` e valida: input do Router já passou pelo
      // schema da task, mas um adapter que confia no chamador é um adapter que
      // manda lixo para uma API paga.
      const snapshot = declaredContextSnapshotSchema.safeParse(request.input);

      if (!snapshot.success) {
        return { ok: false, errorClass: "INPUT_SCHEMA_INVALID", latencyMs: 0 };
      }

      const controle = new AbortController();
      const timeout = setTimeout(() => controle.abort(), TIMEOUT_MS);

      try {
        const cliente = criarCliente(apiKey);

        const resposta = await cliente.models.generateContent({
          // Modelo vem do Router. Nenhum literal de modelo aqui.
          model: request.modelKey,
          contents: montarPromptDoUsuario(snapshot.data),
          config: {
            systemInstruction: DECLARED_CONTEXT_REVIEW_SYSTEM_PROMPT,
            responseMimeType: "application/json",
            responseJsonSchema: declaredContextReviewJsonSchema,
            maxOutputTokens: MAX_OUTPUT_TOKENS,
            temperature: 0.2,
            // Raciocínio desabilitado: esta task é síntese do que já está
            // estruturado, e tokens de pensamento são cobrados como saída
            // (mandato §5).
            thinkingConfig: { thinkingBudget: 0 },
            abortSignal: controle.signal,
          },
        });

        const latencyMs = agora() - inicio;

        const usage = normalizarUsage(resposta.usageMetadata);

        // Sem usage confiável não há custo confiável, e o Router precisa saber
        // disso antes de concluir a execução.
        if (!usage) return { ok: false, errorClass: "USAGE_INVALID", latencyMs };

        const texto = resposta.text;

        if (typeof texto !== "string" || texto.trim() === "") {
          return { ok: false, errorClass: "OUTPUT_SCHEMA_INVALID", latencyMs };
        }

        let output: unknown;

        try {
          output = JSON.parse(texto);
        } catch {
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
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}

export const geminiAdapter: AIProviderAdapter = criarGeminiAdapter();
