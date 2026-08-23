import { describe, expect, it } from "vitest";

import {
  createInitialBusinessSchema,
  toBusinessFieldErrors,
  toCommercialGoalJson,
} from "./schemas";

const VALIDO = {
  organizationName: "Clínica Exemplo",
  segment: "Odontologia",
  locationSummary: "Campinas, SP",
  primaryOffer: "Implantes e clareamento",
  targetAudience: "Adultos de 30 a 55 anos na região central",
  acquisitionGoal: "Agendar 40 avaliações por mês",
  averageTicket: "",
  differentiators: "",
  knownObjections: "",
  commercialGoal: "",
};

describe("createInitialBusinessSchema", () => {
  it("aceita o preenchimento mínimo e trata opcionais vazios como nulos", () => {
    const parsed = createInitialBusinessSchema.parse(VALIDO);

    expect(parsed.organizationName).toBe("Clínica Exemplo");
    expect(parsed.averageTicket).toBeNull();
    expect(parsed.differentiators).toBeNull();
    expect(parsed.knownObjections).toBeNull();
    expect(parsed.commercialGoal).toBeNull();
  });

  it("normaliza espaços em volta dos valores", () => {
    const parsed = createInitialBusinessSchema.parse({
      ...VALIDO,
      organizationName: "  Clínica Exemplo  ",
      differentiators: "   ",
    });

    expect(parsed.organizationName).toBe("Clínica Exemplo");
    expect(parsed.differentiators).toBeNull();
  });

  it("converte o ticket médio para unidade menor inteira", () => {
    const parsed = createInitialBusinessSchema.parse({
      ...VALIDO,
      averageTicket: "1.250,00",
    });

    expect(parsed.averageTicket).toBe(125_000);
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
      ["targetAudience", 280],
      ["acquisitionGoal", 280],
      ["differentiators", 1000],
      ["knownObjections", 1000],
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

  it("recusa ticket médio malformado como erro de campo", () => {
    const result = createInitialBusinessSchema.safeParse({
      ...VALIDO,
      averageTicket: "mil reais",
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(toBusinessFieldErrors(result.error).averageTicket).toBeTruthy();
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
