import { describe, expect, it } from "vitest";

import { offerFormSchema, toOfferFieldErrors } from "./schemas";
import {
  MAX_OFFER_DESCRIPTION_LENGTH,
  MAX_OFFER_NAME_LENGTH,
  MAX_OFFER_VALUE_PROPOSITION_LENGTH,
} from "./offers";

/**
 * Validação da oferta — Rodada 004C §§4.4, 4.5 e 12.1.
 *
 * O schema é a mensagem; o banco é a garantia. O que se prova aqui é que
 * nenhum estado contraditório de preço chega às constraints como erro de
 * constraint — e que o que chega à RPC tem exatamente a forma que a tabela
 * aceita.
 */

function entrada(extra: Record<string, string> = {}) {
  return {
    name: "Corte de cabelo",
    offerType: "SERVICE",
    description: "",
    valueProposition: "",
    priceMode: "FIXED",
    priceMin: "50,00",
    priceMax: "",
    ...extra,
  };
}

describe("offerFormSchema — preço", () => {
  it("aceita preço fixo com valor e sem máximo", () => {
    const resultado = offerFormSchema.safeParse(entrada());

    expect(resultado.success).toBe(true);
    expect(resultado.success && resultado.data.priceMin).toBe(5000);
    expect(resultado.success && resultado.data.priceMax).toBeNull();
  });

  it("exige valor em preço fixo", () => {
    const resultado = offerFormSchema.safeParse(entrada({ priceMin: "" }));

    expect(resultado.success).toBe(false);
    expect(
      !resultado.success && toOfferFieldErrors(resultado.error).priceMin,
    ).toBeDefined();
  });

  it("exige valor em a partir de e descarta o máximo", () => {
    const semValor = offerFormSchema.safeParse(
      entrada({ priceMode: "STARTING_AT", priceMin: "" }),
    );
    expect(semValor.success).toBe(false);

    const comValor = offerFormSchema.safeParse(
      entrada({ priceMode: "STARTING_AT", priceMin: "120,00", priceMax: "500,00" }),
    );

    expect(comValor.success).toBe(true);
    // O máximo digitado antes da troca de modo não pode ser persistido: a
    // constraint `..._price_shape` recusaria a linha.
    expect(comValor.success && comValor.data.priceMax).toBeNull();
  });

  it("exige os dois extremos na faixa", () => {
    const semMaximo = offerFormSchema.safeParse(
      entrada({ priceMode: "RANGE", priceMin: "100,00", priceMax: "" }),
    );

    expect(semMaximo.success).toBe(false);
    expect(
      !semMaximo.success && toOfferFieldErrors(semMaximo.error).priceMax,
    ).toBeDefined();
  });

  it("recusa faixa invertida", () => {
    const resultado = offerFormSchema.safeParse(
      entrada({ priceMode: "RANGE", priceMin: "250,00", priceMax: "100,00" }),
    );

    expect(resultado.success).toBe(false);
    expect(
      !resultado.success && toOfferFieldErrors(resultado.error).priceMax,
    ).toContain("menor");
  });

  it("aceita faixa com extremos iguais", () => {
    const resultado = offerFormSchema.safeParse(
      entrada({ priceMode: "RANGE", priceMin: "100,00", priceMax: "100,00" }),
    );

    expect(resultado.success).toBe(true);
  });

  /**
   * Trocar o modo depois de digitar um valor é o caminho normal do formulário.
   * O número precisa ser descartado aqui, e não viajar até a constraint.
   */
  it("descarta valores nos modos que não persistem número", () => {
    for (const priceMode of ["QUOTE", "FREE", "NOT_INFORMED"]) {
      const resultado = offerFormSchema.safeParse(
        entrada({ priceMode, priceMin: "80,00", priceMax: "120,00" }),
      );

      expect(resultado.success).toBe(true);
      expect(resultado.success && resultado.data.priceMin).toBeNull();
      expect(resultado.success && resultado.data.priceMax).toBeNull();
    }
  });

  it("recusa valor negativo", () => {
    const resultado = offerFormSchema.safeParse(entrada({ priceMin: "-10,00" }));

    expect(resultado.success).toBe(false);
    expect(
      !resultado.success && toOfferFieldErrors(resultado.error).priceMin,
    ).toContain("negativo");
  });

  it("recusa valor acima do teto do domínio", () => {
    const resultado = offerFormSchema.safeParse(
      entrada({ priceMin: "9.000.000.000,00" }),
    );

    expect(resultado.success).toBe(false);
  });

  it("aceita preço zero em modo com valor", () => {
    const resultado = offerFormSchema.safeParse(entrada({ priceMin: "0,00" }));

    expect(resultado.success).toBe(true);
    expect(resultado.success && resultado.data.priceMin).toBe(0);
  });
});

describe("offerFormSchema — texto e taxonomia", () => {
  it("exige nome", () => {
    const resultado = offerFormSchema.safeParse(entrada({ name: "   " }));

    expect(resultado.success).toBe(false);
    expect(
      !resultado.success && toOfferFieldErrors(resultado.error).name,
    ).toBeDefined();
  });

  /** Ausência é `NULL`; string vazia é informação inexistente fingindo existir. */
  it("converte opcionais em branco para null", () => {
    const resultado = offerFormSchema.safeParse(entrada());

    expect(resultado.success && resultado.data.description).toBeNull();
    expect(resultado.success && resultado.data.valueProposition).toBeNull();
  });

  it("recusa texto além do limite da tabela", () => {
    const longo = (n: number) => "a".repeat(n + 1);

    expect(
      offerFormSchema.safeParse(entrada({ name: longo(MAX_OFFER_NAME_LENGTH) }))
        .success,
    ).toBe(false);
    expect(
      offerFormSchema.safeParse(
        entrada({ description: longo(MAX_OFFER_DESCRIPTION_LENGTH) }),
      ).success,
    ).toBe(false);
    expect(
      offerFormSchema.safeParse(
        entrada({ valueProposition: longo(MAX_OFFER_VALUE_PROPOSITION_LENGTH) }),
      ).success,
    ).toBe(false);
  });

  it("recusa taxonomia desconhecida antes de qualquer ida ao banco", () => {
    expect(offerFormSchema.safeParse(entrada({ offerType: "SKU" })).success).toBe(
      false,
    );
    expect(
      offerFormSchema.safeParse(entrada({ priceMode: "NEGOTIABLE" })).success,
    ).toBe(false);
  });

  it("normaliza espaços em volta do nome", () => {
    const resultado = offerFormSchema.safeParse(entrada({ name: "  Corte  " }));

    expect(resultado.success && resultado.data.name).toBe("Corte");
  });
});
