import { describe, expect, it } from "vitest";

import {
  evaluateCapabilities,
  hasCapability,
  META_SCOPES,
  missingScopesFor,
} from "./capabilities";

/**
 * Capacidades — Rodada 003B §6.
 *
 * O que precisa ficar provado aqui não é aritmética de conjuntos: é que a
 * ausência de `ads_read` **não** degrada o Instagram, e que `ads_management`
 * nunca entra como requisito por conveniência.
 */

const INSTAGRAM_COMPLETO = [
  META_SCOPES.pagesShowList,
  META_SCOPES.pagesReadEngagement,
  META_SCOPES.instagramBasic,
  META_SCOPES.instagramManageInsights,
];

describe("capacidades — conjuntos exatos", () => {
  it("descoberta exige listar Páginas e ler a conta profissional", () => {
    expect(
      hasCapability(
        [META_SCOPES.pagesShowList, META_SCOPES.instagramBasic],
        "instagram_discovery",
      ),
    ).toBe(true);

    expect(hasCapability([META_SCOPES.pagesShowList], "instagram_discovery")).toBe(
      false,
    );
    expect(hasCapability([META_SCOPES.instagramBasic], "instagram_discovery")).toBe(
      false,
    );
  });

  it("insights exige o conjunto documentado, e nada além dele", () => {
    expect(hasCapability(INSTAGRAM_COMPLETO, "instagram_insights")).toBe(true);

    // Sem `pages_read_engagement` os Insights não são alcançáveis — é o
    // requisito que separa descoberta de leitura de métrica.
    expect(
      hasCapability(
        INSTAGRAM_COMPLETO.filter((s) => s !== META_SCOPES.pagesReadEngagement),
        "instagram_insights",
      ),
    ).toBe(false);
  });

  it("ads_discovery depende só de ads_read", () => {
    expect(hasCapability([META_SCOPES.adsRead], "ads_discovery")).toBe(true);
    expect(hasCapability(INSTAGRAM_COMPLETO, "ads_discovery")).toBe(false);
  });

  it("ads_management nunca é requisito de nenhuma capacidade", () => {
    // A documentação de Insights registra que o papel via Business Manager
    // *pode* exigi-lo. Hipótese a provar no E2E — transformá-la em requisito
    // fixo pediria permissão de escrita numa rodada que só lê.
    const requisitos = [
      ...missingScopesFor([], "instagram_discovery"),
      ...missingScopesFor([], "instagram_insights"),
      ...missingScopesFor([], "ads_discovery"),
    ];

    expect(requisitos).not.toContain("ads_management");
    expect(requisitos).not.toContain("business_management");
  });
});

describe("capacidades — independência entre orgânico e pago", () => {
  it("sem ads_read, o Instagram continua inteiro", () => {
    const capacidades = evaluateCapabilities(INSTAGRAM_COMPLETO);

    expect(capacidades.instagram_discovery).toBe(true);
    expect(capacidades.instagram_insights).toBe(true);
    expect(capacidades.ads_discovery).toBe(false);
  });

  it("só com ads_read, nada de Instagram é liberado", () => {
    const capacidades = evaluateCapabilities([META_SCOPES.adsRead]);

    expect(capacidades.instagram_discovery).toBe(false);
    expect(capacidades.instagram_insights).toBe(false);
    expect(capacidades.ads_discovery).toBe(true);
  });

  it("escopo desconhecido não concede nada", () => {
    // O que a Meta devolve é fato; o que não reconhecemos não vira permissão.
    expect(evaluateCapabilities(["escopo_inventado"])).toEqual({
      instagram_discovery: false,
      instagram_insights: false,
      ads_discovery: false,
    });
  });

  it("lista vazia não quebra e não concede", () => {
    expect(evaluateCapabilities([])).toEqual({
      instagram_discovery: false,
      instagram_insights: false,
      ads_discovery: false,
    });

    expect(missingScopesFor([], "instagram_insights")).toEqual(INSTAGRAM_COMPLETO);
  });
});
