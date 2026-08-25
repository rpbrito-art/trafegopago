import type { ZodType } from "zod";

/**
 * Vocabulário da camada de IA (Rodada 004A).
 *
 * Os `CHECK` da migration `20260825140000_create_ai_foundation_core.sql` são a
 * autoridade sobre os conjuntos fechados; aqui ficam os mesmos valores em
 * TypeScript, para que a divergência apareça no compilador em vez de virar
 * `23514` em produção — mesma disciplina de `operations/contracts.ts`.
 *
 * Este módulo é só vocabulário e tipo. Nada aqui executa, chama provider ou
 * toca banco.
 */

// ---------------------------------------------------------------------------
// Tiers
// ---------------------------------------------------------------------------

/**
 * Tiers que chegam ao Router.
 *
 * Tier 0 **não está aqui**, e a ausência é o ponto: Tier 0 é o caminho
 * determinístico — métrica, ranking, state machine — que por definição não
 * chama provider (`AI_ARCHITECTURE.md` §3). Um `allowedTiers: [0]` não é uma
 * política econômica, é uma tarefa que não deveria ter chegado a esta camada.
 */
export const AI_TIERS = [1, 2, 3] as const;

export type AITier = (typeof AI_TIERS)[number];

export function isAITier(value: unknown): value is AITier {
  return (AI_TIERS as readonly unknown[]).includes(value);
}

// ---------------------------------------------------------------------------
// Estados de catálogo
// ---------------------------------------------------------------------------

export const AI_PROVIDER_STATUSES = ["ACTIVE", "DEGRADED", "DISABLED"] as const;

export type AIProviderStatus = (typeof AI_PROVIDER_STATUSES)[number];

export const AI_MODEL_STATUSES = [
  "ACTIVE",
  "DEGRADED",
  "DEPRECATED",
  "DISABLED",
] as const;

export type AIModelStatus = (typeof AI_MODEL_STATUSES)[number];

/**
 * Estados que ainda recebem tarefa nova.
 *
 * `DEGRADED` continua elegível de propósito: degradação é sinal de preferência
 * — o Router escolhe outro candidato quando existe —, não ausência de
 * candidato. `DEPRECATED` e `DISABLED` não recebem nova tarefa
 * (`AI_ARCHITECTURE.md` §21).
 */
export const AI_MODEL_STATUSES_ELEGIVEIS = [
  "ACTIVE",
  "DEGRADED",
] as const satisfies readonly AIModelStatus[];

export function aceitaTarefaNova(status: AIModelStatus): boolean {
  return (AI_MODEL_STATUSES_ELEGIVEIS as readonly string[]).includes(status);
}

// ---------------------------------------------------------------------------
// Capacidades
// ---------------------------------------------------------------------------

/**
 * Capacidades declaradas por modelo (`AI_ARCHITECTURE.md` §5).
 *
 * Policies selecionam por capacidade, nunca por marca. O conjunto é aberto no
 * banco (`text[]`) e fechado aqui: o catálogo pode registrar uma capacidade que
 * o código ainda não conhece sem quebrar a migration, mas uma task só pode
 * exigir o que o domínio sabe nomear.
 */
export const AI_CAPABILITIES = [
  "TEXT_CLASSIFICATION",
  "STRUCTURED_EXTRACTION",
  "LONG_CONTEXT",
  "VISION",
  "REASONING",
  "LOW_COST",
  "FAST",
  "JSON_SCHEMA_NATIVE",
] as const;

export type AICapability = (typeof AI_CAPABILITIES)[number];

// ---------------------------------------------------------------------------
// Execução
// ---------------------------------------------------------------------------

export const AI_RUN_STATUSES = ["STARTED", "SUCCEEDED", "FAILED"] as const;

export type AIRunStatus = (typeof AI_RUN_STATUSES)[number];

/**
 * Taxonomia interna de falha.
 *
 * Adapters traduzem o erro do provider para uma destas categorias. Código,
 * mensagem ou corpo cru do provider **não** sobem para o domínio: além de
 * amarrar regra de negócio à versão de uma API externa, `message` é justamente
 * onde credencial costuma vazar (`SECURITY_MODEL.md` §15).
 */
export const AI_ERROR_CLASSES = [
  /** Nenhum modelo ativo satisfaz tier + capacidades da task. */
  "NO_CANDIDATE_MODEL",
  /** O modelo existe, mas não há preço vigente para a data da execução. */
  "NO_PRICE_VERSION",
  /** Mais de um preço vigente: o custo seria uma escolha, não um cálculo. */
  "AMBIGUOUS_PRICE_VERSION",
  /** O provider está no catálogo, mas nenhum adapter foi registrado para ele. */
  "ADAPTER_NOT_REGISTERED",
  "PROVIDER_UNAVAILABLE",
  "PROVIDER_RATE_LIMITED",
  "PROVIDER_REJECTED",
  /** O provider respondeu, mas o output não satisfez o schema da task. */
  "OUTPUT_SCHEMA_INVALID",
  "TIMEOUT",
  "UNKNOWN",
] as const;

export type AIErrorClass = (typeof AI_ERROR_CLASSES)[number];

export const AI_QUALITY_REQUIREMENTS = ["LOW", "MEDIUM", "HIGH"] as const;

export type AIQualityRequirement = (typeof AI_QUALITY_REQUIREMENTS)[number];

export const AI_LATENCY_CLASSES = ["INTERACTIVE", "ASYNC"] as const;

export type AILatencyClass = (typeof AI_LATENCY_CLASSES)[number];

// ---------------------------------------------------------------------------
// AI Task
// ---------------------------------------------------------------------------

/**
 * A política de uma tarefa, versionada e server-side.
 *
 * **A feature não escolhe provider nem modelo.** Ela declara o que a tarefa
 * precisa — capacidades, tiers aceitáveis, qualidade, latência — e o Router
 * resolve o resto (`AI_ARCHITECTURE.md` §4). É isso que permite trocar o modelo
 * de uma capability sem tocar em nenhuma feature.
 *
 * `scope` separa tarefa de tenant de tarefa legitimamente global. Não é
 * decoração: uma task `TENANT` sem `organizationId` é um vazamento de contexto
 * esperando acontecer, e uma task `GLOBAL` que recebe organização está tratando
 * dado de cliente como se fosse manutenção interna.
 */
export type AITaskDefinition<TInput = unknown, TOutput = unknown> = {
  taskType: string;
  taskVersion: string;
  /** Versão do prompt de produção (`AI_ARCHITECTURE.md` §8). */
  promptVersion: string;
  /** Versão do schema de saída, independente da do prompt. */
  schemaVersion: string;
  scope: "TENANT" | "GLOBAL";
  inputSchema: ZodType<TInput>;
  /** O output é `unknown` até passar por aqui (§7). */
  outputSchema: ZodType<TOutput>;
  requiredCapabilities: readonly AICapability[];
  allowedTiers: readonly AITier[];
  qualityRequirement: AIQualityRequirement;
  latencyClass: AILatencyClass;
};

/** O que uma feature entrega ao Router: uma task e um input. Nada mais. */
export type AITaskRequest<TInput = unknown> = {
  taskType: string;
  taskVersion: string;
  input: TInput;
  /** Obrigatório para tasks `TENANT`; proibido para tasks `GLOBAL`. */
  organizationId?: string | null;
  correlationId?: string;
  /** Run anterior que esta execução substitui, dentro do mesmo tenant. */
  fallbackFromRunId?: string | null;
};

// ---------------------------------------------------------------------------
// Catálogo resolvido
// ---------------------------------------------------------------------------

/** Preço de um modelo numa vigência. Valores em texto decimal, nunca `number`. */
export type AIPriceVersion = {
  id: string;
  aiModelId: string;
  /** Por 1.000.000 de tokens, como texto decimal exato. */
  inputPricePerMillion: string;
  outputPricePerMillion: string;
  cachedInputPricePerMillion: string | null;
  currency: string;
  effectiveFrom: string;
  effectiveTo: string | null;
};

export type AIModelCandidate = {
  id: string;
  providerId: string;
  providerKey: string;
  providerStatus: AIProviderStatus;
  modelKey: string;
  tier: AITier;
  capabilityTags: readonly string[];
  status: AIModelStatus;
  supportsStructuredOutput: boolean;
  contextWindowTokens: number | null;
  maxOutputTokens: number | null;
};

// ---------------------------------------------------------------------------
// Provider adapter
// ---------------------------------------------------------------------------

/**
 * O que o adapter recebe.
 *
 * Deliberadamente sem `organizationId`, sem token e sem qualquer credencial: um
 * adapter traduz protocolo, não decide autorização nem conhece o tenant
 * (`AI_ARCHITECTURE.md` §9, `SECURITY_MODEL.md` §14).
 */
export type AIAdapterRequest = {
  modelKey: string;
  promptVersion: string;
  schemaVersion: string;
  /** Conteúdo do cliente é dado não confiável, e chega como tal. */
  input: unknown;
  latencyClass: AILatencyClass;
};

export type AIAdapterUsage = {
  inputTokens: number;
  outputTokens: number;
  /**
   * Tokens servidos de cache, **disjuntos** de `inputTokens`.
   *
   * `null` quando o provider não informa. `0` afirmaria que nada veio de cache,
   * o que é diferente de não saber.
   */
  cachedTokens?: number | null;
};

export type AIAdapterResult =
  | {
      ok: true;
      /** Ainda **não** validado. Vira tipo só depois do schema da task. */
      output: unknown;
      usage: AIAdapterUsage;
      /** Só quando o provider dá base real para isso (§17). */
      confidence?: number | null;
      latencyMs?: number | null;
    }
  | {
      ok: false;
      /** Já normalizado e sanitizado pelo adapter. */
      errorClass: AIErrorClass;
      latencyMs?: number | null;
    };

export type AIProviderAdapter = {
  /** Casa com `ai_providers.key`. */
  providerKey: string;
  execute(request: AIAdapterRequest): Promise<AIAdapterResult>;
};

// ---------------------------------------------------------------------------
// Resultado do Router
// ---------------------------------------------------------------------------

export type AITaskSuccess<TOutput> = {
  ok: true;
  output: TOutput;
  runId: string;
  modelKey: string;
  tier: AITier;
  /** Texto decimal exato; `null` quando o usage não permitiu calcular. */
  estimatedCost: string | null;
  currency: string | null;
};

export type AITaskFailure = {
  ok: false;
  errorClass: AIErrorClass;
  /** `null` quando a falha ocorreu antes de haver run para registrar. */
  runId: string | null;
};

export type AITaskResult<TOutput> = AITaskSuccess<TOutput> | AITaskFailure;
