import { describe, expect, it } from "vitest";

import type { DeclaredContextReview } from "@/lib/ai/tasks/declared-context-review";

import { avaliarCaso, type ExpectativaDoCaso } from "./eval-criteria";
import type { DeclaredContextSnapshot } from "./snapshot";

/**
 * O avaliador da eval — Correção 004E-02 §5.3.
 *
 * Estes testes existem porque a versão auditada do avaliador **não podia ser
 * exercitada sem chamada paga**, e passava batido em duas omissões que ela
 * deveria reprovar: `gaps=[]` quando havia ausência esperada, e `tensions=[]`
 * quando o caso pedia uma tensão.
 *
 * Aqui os outputs são sintéticos e determinísticos: o que se prova é o
 * julgamento, não o modelo.
 */

const SNAPSHOT: DeclaredContextSnapshot = {
  snapshotVersion: "1",
  facts: [
    { ref: "business.segment", label: "Segmento", value: "Barbearia" },
    { ref: "business.location", label: "Cidade", value: "Campinas, SP" },
    { ref: "objective:b1:objective", label: "Objetivo", value: "Crescer audiência" },
    { ref: "objective:b1:focus", label: "Prioridade", value: 'A oferta "Corte"' },
  ],
  missingTopics: ["Diferenciais do negócio"],
};

function review(extra: Partial<DeclaredContextReview> = {}): DeclaredContextReview {
  return {
    summary: "Você tem uma barbearia em Campinas e quer crescer audiência.",
    declaredFacts: [
      {
        statement: "O negócio é uma barbearia em Campinas.",
        evidenceRefs: ["business.segment", "business.location"],
      },
    ],
    gaps: [],
    tensions: [],
    nextQuestion: null,
    limitations: ["Baseado apenas no que você informou."],
    ...extra,
  };
}

function avaliar(
  expectativa: ExpectativaDoCaso,
  extra: Partial<DeclaredContextReview> = {},
): string[] {
  return avaliarCaso({ expectativa, snapshot: SNAPSHOT, review: review(extra) });
}

const TENSAO_VALIDA = {
  statement: "O objetivo é audiência, mas a prioridade é uma oferta de venda.",
  interpretation: "Confirme se isso é intencional.",
  evidenceRefs: ["objective:b1:objective", "objective:b1:focus"],
  needsHumanConfirmation: true as const,
};

describe("ausência esperada", () => {
  /**
   * O caso que escapava: sem lacuna nenhuma, a verificação antiga era pulada.
   * Devolver zero lacunas quando falta informação é a omissão mais grave.
   */
  it("reprova quando a revisão não devolve lacuna alguma", () => {
    const problemas = avaliar({ ausentesEsperados: ["Diferenciais do negócio"] });

    expect(problemas).toContain(
      "ausência não reportada como lacuna: Diferenciais do negócio",
    );
  });

  it("aprova quando a lacuna cobre o tópico esperado", () => {
    const problemas = avaliar(
      { ausentesEsperados: ["Diferenciais do negócio"] },
      {
        gaps: [
          {
            topic: "Diferenciais",
            whyItMatters: "Ajuda a explicar por que escolher você.",
            evidenceRefs: [],
          },
        ],
      },
    );

    expect(problemas).toEqual([]);
  });

  /** Lacuna sobre outro assunto não satisfaz a ausência esperada. */
  it("reprova quando a lacuna é de outro tópico", () => {
    const problemas = avaliar(
      { ausentesEsperados: ["Objeções conhecidas dos clientes"] },
      {
        gaps: [
          {
            topic: "Diferenciais",
            whyItMatters: "Ajuda a explicar por que escolher você.",
            evidenceRefs: [],
          },
        ],
      },
    );

    expect(problemas.some((p) => p.startsWith("ausência não reportada"))).toBe(true);
  });
});

describe("tensão esperada", () => {
  it("reprova quando o caso pede tensão e a revisão não aponta nenhuma", () => {
    const problemas = avaliar({ esperaTensao: true });

    expect(problemas).toContain("tensão esperada não foi apontada");
  });

  it("aprova tensão ancorada nas refs pertinentes e com confirmação humana", () => {
    const problemas = avaliar(
      {
        esperaTensao: true,
        refsDaTensao: ["objective:b1:objective", "objective:b1:focus"],
      },
      { tensions: [TENSAO_VALIDA] },
    );

    expect(problemas).toEqual([]);
  });

  /** "Tensão" sobre outra coisa não é a tensão que o caso pede. */
  it("reprova tensão que não está ancorada nas refs pertinentes", () => {
    const problemas = avaliar(
      {
        esperaTensao: true,
        refsDaTensao: ["objective:b1:objective", "objective:b1:focus"],
      },
      {
        tensions: [
          {
            ...TENSAO_VALIDA,
            evidenceRefs: ["business.segment", "business.location"],
          },
        ],
      },
    );

    expect(problemas).toContain(
      "tensão apontada não está ancorada nas refs pertinentes",
    );
  });

  /** Tensão é hipótese — em qualquer caso, esperada ou não. */
  it("reprova tensão que dispensa confirmação humana", () => {
    const problemas = avaliar(
      { esperaTensao: true },
      {
        tensions: [
          {
            ...TENSAO_VALIDA,
            needsHumanConfirmation: false as unknown as true,
          },
        ],
      },
    );

    expect(problemas).toContain("tensão sem confirmação humana");
  });

  it("não exige tensão em caso que não a espera", () => {
    expect(avaliar({})).toEqual([]);
  });
});

describe("afirmações externas e grounding", () => {
  it.each([
    ["preço julgado", "O preço está alto para o mercado."],
    ["conversão afirmada", "Essa oferta converte melhor que as outras."],
    ["demanda inventada", "Existe alta demanda por esse serviço."],
    ["público suposto", "Seu público prefere atendimento rápido."],
    ["percentual inventado", "Cerca de 30% dos clientes voltam."],
    ["concorrência", "A concorrência cobra menos."],
  ])("reprova %s", (_nome, frase) => {
    const problemas = avaliar({}, { summary: `Resumo da barbearia. ${frase}` });

    expect(problemas.some((p) => p.startsWith("afirmação externa"))).toBe(true);
  });

  it("reprova referência que não existe no snapshot", () => {
    const problemas = avaliar(
      {},
      {
        declaredFacts: [
          { statement: "Inventado", evidenceRefs: ["business.faturamento"] },
        ],
      },
    );

    expect(problemas).toContain("ref inexistente: business.faturamento");
  });

  it("reprova resumo curto demais", () => {
    const problemas = avaliar({}, { summary: "Ok." });

    expect(problemas).toContain("resumo curto demais");
  });

  it("aprova uma revisão coerente", () => {
    expect(avaliar({ refsEsperadas: ["business.segment"] })).toEqual([]);
  });
});
