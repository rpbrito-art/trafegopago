import { describe, expect, it } from "vitest";

import type { DeclaredContextSnapshot } from "@/lib/review/snapshot";

import {
  declaredContextReviewJsonSchema,
  declaredContextReviewSchema,
  declaredContextReviewTask,
  KEYWORDS_SUPORTADAS,
  REVIEW_LIMITS,
  validarGrounding,
  type DeclaredContextReview,
} from "./declared-context-review";

/**
 * Task de revisão do contexto declarado — Rodada 004E §§5 e 13.
 *
 * Duas invariantes se provam aqui, e nenhuma delas depende de provider:
 *
 * 1. o output que não satisfaz a forma **não vira revisão**;
 * 2. o output que cita evidência inexistente **não vira revisão**, mesmo com a
 *    forma perfeita. É a diferença entre reorganizar o que o negócio contou e
 *    inventar.
 */

const SNAPSHOT: DeclaredContextSnapshot = {
  snapshotVersion: "1",
  facts: [
    { ref: "business.segment", label: "Segmento", value: "Barbearia" },
    { ref: "business.location", label: "Cidade", value: "Campinas, SP" },
    { ref: "offer:abc:name", label: "Nome da oferta", value: "Corte de cabelo" },
    {
      ref: "objective:xyz:objective",
      label: "Objetivo",
      value: "Gerar contatos interessados",
    },
  ],
  missingTopics: ["Diferenciais do negócio"],
};

function review(extra: Partial<DeclaredContextReview> = {}): DeclaredContextReview {
  return {
    summary: "Você tem uma barbearia em Campinas e quer gerar contatos.",
    declaredFacts: [
      {
        statement: "O negócio é uma barbearia em Campinas.",
        evidenceRefs: ["business.segment", "business.location"],
      },
    ],
    gaps: [
      {
        topic: "Diferenciais",
        whyItMatters: "Ajuda a explicar por que escolher você.",
        evidenceRefs: [],
      },
    ],
    tensions: [],
    nextQuestion: null,
    limitations: ["Baseado apenas no que você informou."],
    ...extra,
  };
}

describe("declaredContextReviewTask — política", () => {
  it("é tenant-scoped, Tier 1 e escolhe por capacidade", () => {
    expect(declaredContextReviewTask.scope).toBe("TENANT");
    expect(declaredContextReviewTask.allowedTiers).toEqual([1]);
    expect(declaredContextReviewTask.requiredCapabilities).toContain(
      "STRUCTURED_EXTRACTION",
    );
    expect(declaredContextReviewTask.requiredCapabilities).toContain(
      "JSON_SCHEMA_NATIVE",
    );
    expect(declaredContextReviewTask.requiredCapabilities).toContain("LOW_COST");
  });

  it("é versionada em task, prompt e schema", () => {
    expect(declaredContextReviewTask.taskVersion).toBe("v1");
    expect(declaredContextReviewTask.promptVersion).toBe("v1");
    expect(declaredContextReviewTask.schemaVersion).toBe("v1");
  });

  /** A política não pode citar provider nem modelo — quem resolve é o Router. */
  it("não menciona provider nem modelo", () => {
    const serializada = JSON.stringify({
      taskType: declaredContextReviewTask.taskType,
      capabilities: declaredContextReviewTask.requiredCapabilities,
      tiers: declaredContextReviewTask.allowedTiers,
    });

    expect(serializada).not.toMatch(/gemini|google|openai|anthropic/i);
  });
});

/**
 * Correção 004E-01 §3.
 *
 * O provider aceita um subconjunto do JSON Schema. `maxLength` e `nullable`
 * estavam no schema enviado e não constam no subconjunto documentado — a
 * primeira chamada paga poderia ser rejeitada por contrato, antes de produzir
 * qualquer revisão.
 *
 * Esta varredura existe para que a regressão não passe em silêncio: qualquer
 * keyword fora da allowlist derruba o teste.
 */
describe("schema enviado ao provider", () => {
  function keywordsDe(no: unknown, encontradas: Set<string> = new Set()): Set<string> {
    if (Array.isArray(no)) {
      for (const item of no) keywordsDe(item, encontradas);
      return encontradas;
    }

    if (typeof no !== "object" || no === null) return encontradas;

    for (const [chave, valor] of Object.entries(no)) {
      encontradas.add(chave);

      // `properties` e `required` carregam **nomes de campo**, não keywords: o
      // conteúdo de `properties` é varrido, mas suas chaves não entram na
      // conta, senão `summary` viraria uma "keyword não suportada".
      if (chave === "properties") {
        for (const sub of Object.values(valor as Record<string, unknown>)) {
          keywordsDe(sub, encontradas);
        }
        continue;
      }

      if (chave === "required" || chave === "enum" || chave === "description") {
        continue;
      }

      keywordsDe(valor, encontradas);
    }

    return encontradas;
  }

  it("usa apenas keywords do subconjunto suportado", () => {
    const usadas = [...keywordsDe(declaredContextReviewJsonSchema)];
    const permitidas = new Set<string>(KEYWORDS_SUPORTADAS);

    const forbiddas = usadas.filter((chave) => !permitidas.has(chave));

    expect(forbiddas).toEqual([]);
  });

  it("não reintroduz maxLength nem nullable", () => {
    const serializado = JSON.stringify(declaredContextReviewJsonSchema);

    expect(serializado).not.toContain('"maxLength"');
    expect(serializado).not.toContain('"nullable"');
  });

  /** Ausência de pergunta continua possível — agora por união de tipos. */
  it("representa nextQuestion nulo por união de tipos", () => {
    const nextQuestion = (
      declaredContextReviewJsonSchema.properties as Record<
        string,
        { type: unknown }
      >
    ).nextQuestion;

    expect(nextQuestion.type).toEqual(["object", "null"]);
  });

  /**
   * O limite não desaparece por não caber no schema do provider: quem recusa
   * um texto fora do contrato é o Zod, no Router.
   */
  it("os limites de texto continuam valendo no Zod", () => {
    const longo = "a".repeat(REVIEW_LIMITS.summary + 1);

    expect(
      declaredContextReviewSchema.safeParse(review({ summary: longo })).success,
    ).toBe(false);
  });
});

describe("schema de saída", () => {
  it("aceita uma revisão bem formada", () => {
    expect(declaredContextReviewSchema.safeParse(review()).success).toBe(true);
  });

  it("recusa summary acima do limite", () => {
    const longo = "a".repeat(REVIEW_LIMITS.summary + 1);

    expect(
      declaredContextReviewSchema.safeParse(review({ summary: longo })).success,
    ).toBe(false);
  });

  it("recusa mais fatos do que o contratado", () => {
    const fatos = Array.from(
      { length: REVIEW_LIMITS.maxDeclaredFacts + 1 },
      () => ({ statement: "Fato", evidenceRefs: ["business.segment"] }),
    );

    expect(
      declaredContextReviewSchema.safeParse(review({ declaredFacts: fatos }))
        .success,
    ).toBe(false);
  });

  /** Tensão sem os dois lados comparados não é comparação. */
  it("recusa tensão com uma única referência", () => {
    const resultado = declaredContextReviewSchema.safeParse(
      review({
        tensions: [
          {
            statement: "Objetivo e foco parecem divergir",
            interpretation: "Confirme se é intencional",
            evidenceRefs: ["business.segment"],
            needsHumanConfirmation: true,
          },
        ],
      }),
    );

    expect(resultado.success).toBe(false);
  });

  /** Tensão é sempre hipótese: `false` não é um valor aceitável. */
  it("recusa tensão que dispensa confirmação humana", () => {
    const resultado = declaredContextReviewSchema.safeParse({
      ...review(),
      tensions: [
        {
          statement: "x",
          interpretation: "y",
          evidenceRefs: ["business.segment", "business.location"],
          needsHumanConfirmation: false,
        },
      ],
    });

    expect(resultado.success).toBe(false);
  });

  it("aceita ausência de pergunta em vez de exigir uma inventada", () => {
    expect(
      declaredContextReviewSchema.safeParse(review({ nextQuestion: null }))
        .success,
    ).toBe(true);
  });

  it("recusa prosa livre no lugar do objeto", () => {
    expect(
      declaredContextReviewSchema.safeParse("Aqui está a sua revisão!").success,
    ).toBe(false);
  });
});

describe("validarGrounding", () => {
  it("aceita revisão cujas referências existem no snapshot", () => {
    expect(validarGrounding(review(), SNAPSHOT).ok).toBe(true);
  });

  it("recusa referência inventada em fato", () => {
    const resultado = validarGrounding(
      review({
        declaredFacts: [
          { statement: "Inventado", evidenceRefs: ["business.faturamento"] },
        ],
      }),
      SNAPSHOT,
    );

    expect(resultado.ok).toBe(false);
    expect(!resultado.ok && resultado.motivo).toEqual({
      kind: "ref-inexistente",
      ref: "business.faturamento",
    });
  });

  it("recusa referência inventada em tensão", () => {
    const resultado = validarGrounding(
      review({
        tensions: [
          {
            statement: "Tensão",
            interpretation: "Confirme",
            evidenceRefs: ["business.segment", "offer:inexistente:name"],
            needsHumanConfirmation: true,
          },
        ],
      }),
      SNAPSHOT,
    );

    expect(resultado.ok).toBe(false);
  });

  it("recusa referência inventada em lacuna", () => {
    const resultado = validarGrounding(
      review({
        gaps: [
          {
            topic: "Público",
            whyItMatters: "Importa",
            evidenceRefs: ["business.publico_secreto"],
          },
        ],
      }),
      SNAPSHOT,
    );

    expect(resultado.ok).toBe(false);
  });

  /**
   * Lacuna fala do que **não** está no snapshot: exigir âncora obrigaria o
   * modelo a inventar uma.
   */
  it("aceita lacuna sem referência", () => {
    expect(
      validarGrounding(
        review({
          gaps: [{ topic: "Público", whyItMatters: "Importa", evidenceRefs: [] }],
        }),
        SNAPSHOT,
      ).ok,
    ).toBe(true);
  });

  it("recusa fato sem nenhuma âncora", () => {
    // O schema já exige ao menos uma ref; o grounding é a segunda barreira,
    // para o caso de o objeto chegar por outro caminho.
    const semRef = {
      ...review(),
      declaredFacts: [{ statement: "Sem origem", evidenceRefs: [] }],
    } as DeclaredContextReview;

    const resultado = validarGrounding(semRef, SNAPSHOT);

    expect(resultado.ok).toBe(false);
    expect(!resultado.ok && resultado.motivo.kind).toBe("fato-sem-referencia");
  });

  /** Cache e grounding são por tenant: refs de outro snapshot não valem. */
  it("recusa referência válida em outro negócio", () => {
    const outro: DeclaredContextSnapshot = {
      snapshotVersion: "1",
      facts: [{ ref: "business.segment", label: "Segmento", value: "Padaria" }],
      missingTopics: [],
    };

    expect(validarGrounding(review(), outro).ok).toBe(false);
  });
});
