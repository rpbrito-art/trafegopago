import { describe, expect, it } from "vitest";

import {
  createInitialBusinessSchema,
  progressiveBusinessContextSchema,
  toBusinessFieldErrors,
  toCommercialGoalJson,
} from "./schemas";

/** O primeiro formulário pede só isto (mandato 004B §5). */
const VALIDO = {
  organizationName: "Clínica Exemplo",
  segment: "Odontologia",
  locationSummary: "Campinas, SP",
  primaryOffer: "Implantes e clareamento",
};

const CONTEXTO = {
  targetAudience: "",
  averageTicket: "",
  differentiators: "",
  knownObjections: "",
  commercialGoal: "",
};

describe("createInitialBusinessSchema", () => {
  it("aceita o bootstrap com apenas os quatro campos essenciais", () => {
    const parsed = createInitialBusinessSchema.parse(VALIDO);

    expect(parsed.organizationName).toBe("Clínica Exemplo");
    expect(parsed.segment).toBe("Odontologia");
    expect(parsed.locationSummary).toBe("Campinas, SP");
    expect(parsed.primaryOffer).toBe("Implantes e clareamento");
  });

  it("não pede mais público, ticket, objeções nem objetivo de aquisição", () => {
    // Pedir dez campos antes de o produto ter entregado qualquer valor é o
    // desenho que o onboarding progressivo rejeita.
    const parsed = createInitialBusinessSchema.parse(VALIDO);

    for (const removido of [
      "targetAudience",
      "acquisitionGoal",
      "averageTicket",
      "differentiators",
      "knownObjections",
      "commercialGoal",
    ]) {
      expect(parsed).not.toHaveProperty(removido);
    }
  });

  it("normaliza espaços em volta dos valores", () => {
    const parsed = createInitialBusinessSchema.parse({
      ...VALIDO,
      organizationName: "  Clínica Exemplo  ",
    });

    expect(parsed.organizationName).toBe("Clínica Exemplo");
  });

  it("exige os campos obrigatórios", () => {
    const result = createInitialBusinessSchema.safeParse({
      ...VALIDO,
      organizationName: "",
      segment: "   ",
    });

    expect(result.success).toBe(false);
    if (result.success) return;

    const errors = toBusinessFieldErrors(result.error);
    expect(errors.organizationName).toBeTruthy();
    expect(errors.segment).toBeTruthy();
  });

  it("aplica os mesmos limites de tamanho dos CHECKs da tabela", () => {
    const limites: [keyof typeof VALIDO, number][] = [
      ["organizationName", 160],
      ["segment", 120],
      ["locationSummary", 160],
      ["primaryOffer", 280],
    ];

    for (const [campo, max] of limites) {
      expect(
        createInitialBusinessSchema.safeParse({ ...VALIDO, [campo]: "a".repeat(max) })
          .success,
        `${campo} no limite`,
      ).toBe(true);

      expect(
        createInitialBusinessSchema.safeParse({
          ...VALIDO,
          [campo]: "a".repeat(max + 1),
        }).success,
        `${campo} acima do limite`,
      ).toBe(false);
    }
  });


  it("ignora campos de identidade e autorização enviados pelo cliente", () => {
    const parsed = createInitialBusinessSchema.parse({
      ...VALIDO,
      userId: "00000000-0000-0000-0000-000000000000",
      organizationId: "11111111-1111-1111-1111-111111111111",
      role: "owner",
      status: "ACTIVE",
    });

    expect(parsed).not.toHaveProperty("userId");
    expect(parsed).not.toHaveProperty("organizationId");
    expect(parsed).not.toHaveProperty("role");
    expect(parsed).not.toHaveProperty("status");
  });
});

describe("progressiveBusinessContextSchema", () => {
  it("trata opcionais vazios como nulos, não como string vazia", () => {
    // Ausência é `NULL`: o CHECK `..._not_blank` da tabela recusaria `''`, e
    // uma string vazia afirmaria um dado que ninguém informou.
    const parsed = progressiveBusinessContextSchema.parse(CONTEXTO);

    expect(parsed.targetAudience).toBeNull();
    expect(parsed.averageTicket).toBeNull();
    expect(parsed.differentiators).toBeNull();
    expect(parsed.knownObjections).toBeNull();
    expect(parsed.commercialGoal).toBeNull();
  });

  it("converte o ticket médio para unidade menor inteira", () => {
    const parsed = progressiveBusinessContextSchema.parse({
      ...CONTEXTO,
      averageTicket: "1.250,00",
    });

    expect(parsed.averageTicket).toBe(125_000);
  });

  it("recusa ticket médio malformado como erro de campo", () => {
    const result = progressiveBusinessContextSchema.safeParse({
      ...CONTEXTO,
      averageTicket: "mil reais",
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(toBusinessFieldErrors(result.error).averageTicket).toBeTruthy();
  });

  it("aplica os limites dos CHECKs da tabela", () => {
    const limites: [keyof typeof CONTEXTO, number][] = [
      ["targetAudience", 280],
      ["differentiators", 1000],
      ["knownObjections", 1000],
    ];

    for (const [campo, max] of limites) {
      expect(
        progressiveBusinessContextSchema.safeParse({
          ...CONTEXTO,
          [campo]: "a".repeat(max),
        }).success,
        `${campo} no limite`,
      ).toBe(true);

      expect(
        progressiveBusinessContextSchema.safeParse({
          ...CONTEXTO,
          [campo]: "a".repeat(max + 1),
        }).success,
        `${campo} acima do limite`,
      ).toBe(false);
    }
  });
});

describe("toCommercialGoalJson", () => {
  it("embrulha o texto em objeto, como o CHECK da tabela exige", () => {
    expect(toCommercialGoalJson("Dobrar o faturamento")).toEqual({
      summary: "Dobrar o faturamento",
    });
  });

  it("mantém ausência como nulo", () => {
    expect(toCommercialGoalJson(null)).toBeNull();
  });
});
