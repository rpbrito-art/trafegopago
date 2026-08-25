import { z } from "zod";

import {
  declaredContextSnapshotSchema,
  refsDoSnapshot,
  type DeclaredContextSnapshot,
} from "@/lib/review/snapshot";

import type { AITaskDefinition } from "../contracts";

/**
 * `DECLARED_BUSINESS_CONTEXT_REVIEW@v1` — Rodada 004E §5.
 *
 * A primeira task produtiva do Quoron, e deliberadamente estreita: síntese e
 * checagem semântica **do que o negócio declarou**. Não é Strategic Insight,
 * não afirma o que o mercado pensa e não recomenda estratégia causal.
 *
 * A política mora aqui, versionada — capacidades exigidas, tier permitido,
 * qualidade, latência —, e a feature não conhece provider nem modelo. É o
 * Router que resolve pelo catálogo (`AI_ARCHITECTURE.md` §4).
 */

export const DECLARED_CONTEXT_REVIEW_TASK_TYPE =
  "DECLARED_BUSINESS_CONTEXT_REVIEW";
export const DECLARED_CONTEXT_REVIEW_TASK_VERSION = "v1";
export const DECLARED_CONTEXT_REVIEW_PROMPT_VERSION = "v1";
export const DECLARED_CONTEXT_REVIEW_SCHEMA_VERSION = "v1";

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

/**
 * Cardinalidades e tamanhos são parte do contrato, não estilo.
 *
 * Um output sem teto é um custo sem teto — e uma tela que às vezes mostra três
 * itens e às vezes trinta não é a mesma tela.
 */
export const REVIEW_LIMITS = {
  summary: 600,
  statement: 400,
  topic: 120,
  whyItMatters: 300,
  interpretation: 400,
  question: 300,
  limitation: 240,
  maxDeclaredFacts: 8,
  maxGaps: 5,
  maxTensions: 3,
  maxLimitations: 5,
  maxEvidenceRefs: 6,
} as const;

const evidenceRefs = z
  .array(z.string().min(1).max(200))
  .min(1)
  .max(REVIEW_LIMITS.maxEvidenceRefs);

export const declaredContextReviewSchema = z.object({
  summary: z.string().min(1).max(REVIEW_LIMITS.summary),

  /** O que o negócio contou, reorganizado — cada item ancorado no snapshot. */
  declaredFacts: z
    .array(
      z.object({
        statement: z.string().min(1).max(REVIEW_LIMITS.statement),
        evidenceRefs,
      }),
    )
    .max(REVIEW_LIMITS.maxDeclaredFacts),

  /** O que falta esclarecer. Ausência é ausência, não fato negativo. */
  gaps: z
    .array(
      z.object({
        topic: z.string().min(1).max(REVIEW_LIMITS.topic),
        whyItMatters: z.string().min(1).max(REVIEW_LIMITS.whyItMatters),
        /**
         * Lacuna pode não ter âncora: ela fala justamente do que **não** está
         * no snapshot. Exigir ref aqui obrigaria o modelo a inventar uma.
         */
        evidenceRefs: z
          .array(z.string().min(1).max(200))
          .max(REVIEW_LIMITS.maxEvidenceRefs)
          .default([]),
      }),
    )
    .max(REVIEW_LIMITS.maxGaps),

  /**
   * Aparentes inconsistências. Sempre hipótese que pede confirmação humana —
   * uma tensão declarada como veredito seria o produto decidindo pelo negócio.
   */
  tensions: z
    .array(
      z.object({
        statement: z.string().min(1).max(REVIEW_LIMITS.statement),
        interpretation: z.string().min(1).max(REVIEW_LIMITS.interpretation),
        /** Comparação exige ao menos os dois lados comparados. */
        evidenceRefs: z
          .array(z.string().min(1).max(200))
          .min(2)
          .max(REVIEW_LIMITS.maxEvidenceRefs),
        needsHumanConfirmation: z.literal(true),
      }),
    )
    .max(REVIEW_LIMITS.maxTensions),

  nextQuestion: z
    .object({
      question: z.string().min(1).max(REVIEW_LIMITS.question),
      whyItMatters: z.string().min(1).max(REVIEW_LIMITS.whyItMatters),
    })
    .nullable(),

  limitations: z
    .array(z.string().min(1).max(REVIEW_LIMITS.limitation))
    .max(REVIEW_LIMITS.maxLimitations),
});

export type DeclaredContextReview = z.infer<typeof declaredContextReviewSchema>;

// ---------------------------------------------------------------------------
// JSON Schema para structured output do provider
// ---------------------------------------------------------------------------

/**
 * Schema enviado ao provider.
 *
 * Escrito à mão, e não derivado do Zod: os provedores aceitam um subconjunto do
 * JSON Schema, e um conversor genérico produz construções (`$ref`,
 * `anyOf` de nullable, `default`) que o Gemini recusa. O Zod continua sendo a
 * validação que vale — este schema só reduz a chance de o modelo errar a forma.
 *
 * `nextQuestion` é declarado `nullable` porque "não tenho pergunta" é uma
 * resposta legítima, e forçá-la produziria pergunta inventada.
 */
export const declaredContextReviewJsonSchema = {
  type: "object",
  properties: {
    summary: { type: "string", maxLength: REVIEW_LIMITS.summary },
    declaredFacts: {
      type: "array",
      maxItems: REVIEW_LIMITS.maxDeclaredFacts,
      items: {
        type: "object",
        properties: {
          statement: { type: "string", maxLength: REVIEW_LIMITS.statement },
          evidenceRefs: {
            type: "array",
            maxItems: REVIEW_LIMITS.maxEvidenceRefs,
            items: { type: "string" },
          },
        },
        required: ["statement", "evidenceRefs"],
      },
    },
    gaps: {
      type: "array",
      maxItems: REVIEW_LIMITS.maxGaps,
      items: {
        type: "object",
        properties: {
          topic: { type: "string", maxLength: REVIEW_LIMITS.topic },
          whyItMatters: { type: "string", maxLength: REVIEW_LIMITS.whyItMatters },
          evidenceRefs: {
            type: "array",
            maxItems: REVIEW_LIMITS.maxEvidenceRefs,
            items: { type: "string" },
          },
        },
        required: ["topic", "whyItMatters", "evidenceRefs"],
      },
    },
    tensions: {
      type: "array",
      maxItems: REVIEW_LIMITS.maxTensions,
      items: {
        type: "object",
        properties: {
          statement: { type: "string", maxLength: REVIEW_LIMITS.statement },
          interpretation: {
            type: "string",
            maxLength: REVIEW_LIMITS.interpretation,
          },
          evidenceRefs: {
            type: "array",
            minItems: 2,
            maxItems: REVIEW_LIMITS.maxEvidenceRefs,
            items: { type: "string" },
          },
          needsHumanConfirmation: { type: "boolean" },
        },
        required: [
          "statement",
          "interpretation",
          "evidenceRefs",
          "needsHumanConfirmation",
        ],
      },
    },
    nextQuestion: {
      type: "object",
      nullable: true,
      properties: {
        question: { type: "string", maxLength: REVIEW_LIMITS.question },
        whyItMatters: { type: "string", maxLength: REVIEW_LIMITS.whyItMatters },
      },
      required: ["question", "whyItMatters"],
    },
    limitations: {
      type: "array",
      maxItems: REVIEW_LIMITS.maxLimitations,
      items: { type: "string", maxLength: REVIEW_LIMITS.limitation },
    },
  },
  required: [
    "summary",
    "declaredFacts",
    "gaps",
    "tensions",
    "nextQuestion",
    "limitations",
  ],
} as const;

// ---------------------------------------------------------------------------
// Grounding
// ---------------------------------------------------------------------------

export type GroundingFailure =
  /** Referência que não existe no snapshot enviado. */
  | { kind: "ref-inexistente"; ref: string }
  /** Fato sem nenhuma âncora — afirmação sem origem declarada. */
  | { kind: "fato-sem-referencia" };

/**
 * Valida que tudo que o modelo referenciou existe no snapshot.
 *
 * É a diferença entre "reorganizou o que você me contou" e "inventou". O
 * schema garante a forma; isto garante a origem. Uma única referência
 * inexistente invalida o output inteiro — aceitar o resto seria publicar uma
 * revisão em que parte das afirmações não tem base e o usuário não sabe qual
 * (mandato §5.3).
 */
export function validarGrounding(
  review: DeclaredContextReview,
  snapshot: DeclaredContextSnapshot,
): { ok: true } | { ok: false; motivo: GroundingFailure } {
  const conhecidas = refsDoSnapshot(snapshot);

  const todas = [
    ...review.declaredFacts.flatMap((fato) => fato.evidenceRefs),
    ...review.gaps.flatMap((lacuna) => lacuna.evidenceRefs),
    ...review.tensions.flatMap((tensao) => tensao.evidenceRefs),
  ];

  for (const ref of todas) {
    if (!conhecidas.has(ref)) return { ok: false, motivo: { kind: "ref-inexistente", ref } };
  }

  for (const fato of review.declaredFacts) {
    if (fato.evidenceRefs.length === 0) {
      return { ok: false, motivo: { kind: "fato-sem-referencia" } };
    }
  }

  return { ok: true };
}

// ---------------------------------------------------------------------------
// Definição da task
// ---------------------------------------------------------------------------

export const declaredContextReviewTask: AITaskDefinition<
  DeclaredContextSnapshot,
  DeclaredContextReview
> = {
  taskType: DECLARED_CONTEXT_REVIEW_TASK_TYPE,
  taskVersion: DECLARED_CONTEXT_REVIEW_TASK_VERSION,
  promptVersion: DECLARED_CONTEXT_REVIEW_PROMPT_VERSION,
  schemaVersion: DECLARED_CONTEXT_REVIEW_SCHEMA_VERSION,
  scope: "TENANT",
  inputSchema: declaredContextSnapshotSchema,
  outputSchema: declaredContextReviewSchema,
  // Capacidades, não marca. Trocar o modelo desta task é alterar o catálogo.
  requiredCapabilities: ["STRUCTURED_EXTRACTION", "JSON_SCHEMA_NATIVE", "LOW_COST"],
  // Só Tier 1: a tarefa é síntese do que já está estruturado. Permitir
  // escalada para Tier 2/3 aqui compraria raciocínio caro para um trabalho que
  // não o exige (`AI_ARCHITECTURE.md` §2).
  allowedTiers: [1],
  qualityRequirement: "MEDIUM",
  latencyClass: "INTERACTIVE",
};
