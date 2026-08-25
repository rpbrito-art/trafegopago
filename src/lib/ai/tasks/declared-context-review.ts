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
 * Escrito à mão, e não derivado do Zod: os provedores aceitam um **subconjunto**
 * do JSON Schema, e um conversor genérico produz construções que a API recusa —
 * o que faria a primeira chamada paga falhar por contrato antes de produzir
 * qualquer revisão.
 *
 * O subconjunto oficialmente documentado para `responseJsonSchema` cobre
 * `type`, `description`, `properties`, `required`, `items`, `minItems`,
 * `maxItems`, `enum`, `format`, `minimum`, `maximum` e `additionalProperties`.
 * Duas ausências mudaram este schema (auditoria 004E §2):
 *
 * - **`maxLength` não é suportado.** Os limites de texto continuam existindo, e
 *   valendo, no Zod e na validação server-side: o provider é orientado por
 *   `description`, mas quem recusa um texto fora do contrato é o schema da
 *   task, no Router;
 * - **`nullable` não é suportado.** A ausência de pergunta é representada por
 *   união de tipos — `["object", "null"]` —, que é a forma que a documentação
 *   oficial mostra.
 *
 * `KEYWORDS_SUPORTADAS` existe para que isso não regrida em silêncio: há teste
 * que percorre este objeto e falha se aparecer keyword fora da lista.
 */
export const KEYWORDS_SUPORTADAS = [
  "type",
  "description",
  "properties",
  "required",
  "items",
  "minItems",
  "maxItems",
  "enum",
  "format",
  "minimum",
  "maximum",
  "additionalProperties",
] as const;

export const declaredContextReviewJsonSchema = {
  type: "object",
  properties: {
    summary: {
      type: "string",
      description: `Resumo do que o negócio declarou, em português, com no máximo ${REVIEW_LIMITS.summary} caracteres.`,
    },
    declaredFacts: {
      type: "array",
      maxItems: REVIEW_LIMITS.maxDeclaredFacts,
      description:
        "O que o negócio contou, reorganizado. Cada item cita as refs do contexto que o sustentam.",
      items: {
        type: "object",
        properties: {
          statement: {
            type: "string",
            description: `Afirmação curta, até ${REVIEW_LIMITS.statement} caracteres.`,
          },
          evidenceRefs: {
            type: "array",
            minItems: 1,
            maxItems: REVIEW_LIMITS.maxEvidenceRefs,
            description: "Refs exatas do contexto declarado. Nunca inventar.",
            items: { type: "string" },
          },
        },
        required: ["statement", "evidenceRefs"],
      },
    },
    gaps: {
      type: "array",
      maxItems: REVIEW_LIMITS.maxGaps,
      description:
        "O que ainda falta esclarecer. Ausência é ausência: não preencher com suposição.",
      items: {
        type: "object",
        properties: {
          topic: {
            type: "string",
            description: `Tópico ausente, até ${REVIEW_LIMITS.topic} caracteres.`,
          },
          whyItMatters: {
            type: "string",
            description: `Por que importa, até ${REVIEW_LIMITS.whyItMatters} caracteres.`,
          },
          evidenceRefs: {
            type: "array",
            maxItems: REVIEW_LIMITS.maxEvidenceRefs,
            description: "Pode ficar vazio: a lacuna fala do que não está no contexto.",
            items: { type: "string" },
          },
        },
        required: ["topic", "whyItMatters", "evidenceRefs"],
      },
    },
    tensions: {
      type: "array",
      maxItems: REVIEW_LIMITS.maxTensions,
      description:
        "Possíveis inconsistências entre coisas declaradas. Sempre hipótese que pede confirmação humana.",
      items: {
        type: "object",
        properties: {
          statement: {
            type: "string",
            description: `Tensão observada, até ${REVIEW_LIMITS.statement} caracteres.`,
          },
          interpretation: {
            type: "string",
            description: `Interpretação, até ${REVIEW_LIMITS.interpretation} caracteres.`,
          },
          evidenceRefs: {
            type: "array",
            minItems: 2,
            maxItems: REVIEW_LIMITS.maxEvidenceRefs,
            description: "Os dois lados comparados, pelas refs do contexto.",
            items: { type: "string" },
          },
          needsHumanConfirmation: {
            type: "boolean",
            description: "Sempre true: tensão é hipótese, não veredito.",
          },
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
      // União de tipos no lugar de `nullable`: é a forma suportada, e "não
      // tenho pergunta" precisa ser uma resposta possível — forçar o objeto
      // produziria pergunta inventada.
      type: ["object", "null"],
      description:
        "Uma pergunta de esclarecimento, ou null se o contexto já estiver claro.",
      properties: {
        question: {
          type: "string",
          description: `Pergunta, até ${REVIEW_LIMITS.question} caracteres.`,
        },
        whyItMatters: {
          type: "string",
          description: `Por que importa, até ${REVIEW_LIMITS.whyItMatters} caracteres.`,
        },
      },
      required: ["question", "whyItMatters"],
    },
    limitations: {
      type: "array",
      maxItems: REVIEW_LIMITS.maxLimitations,
      description:
        "Limites desta revisão. Deve deixar claro que usa apenas o que o negócio declarou.",
      items: { type: "string" },
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
