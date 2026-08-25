import { describe, expect, it } from "vitest";

import {
  OFFER_TYPES,
  PRICE_MODES,
  PRICE_MODE_AMOUNTS,
  descreverPreco,
  isOfferType,
  isPriceMode,
  valorParaCampo,
  type BusinessOffer,
} from "./offers";

/**
 * Vocabulário e apresentação de oferta — Rodada 004C §§4.3 e 9.3.
 *
 * O que se prova aqui é de produto: cada modo de preço vira uma frase que o
 * usuário entende, e modos sem valor não são colapsados num traço.
 */

function oferta(parcial: Partial<BusinessOffer> = {}): BusinessOffer {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    name: "Corte de cabelo",
    offerType: "SERVICE",
    description: null,
    valueProposition: null,
    priceMode: "FIXED",
    priceMinMinor: 5000,
    priceMaxMinor: null,
    currency: "BRL",
    createdAt: "2026-08-25T12:00:00.000Z",
    ...parcial,
  };
}

/** `Intl` usa espaço não separável entre símbolo e número. */
function normalizar(texto: string): string {
  return texto.replace(/ /g, " ");
}

describe("descreverPreco", () => {
  it("apresenta preço fixo com moeda", () => {
    expect(normalizar(descreverPreco(oferta()))).toBe("R$ 50,00");
  });

  it("apresenta a partir de", () => {
    expect(
      normalizar(
        descreverPreco(oferta({ priceMode: "STARTING_AT", priceMinMinor: 12000 })),
      ),
    ).toBe("A partir de R$ 120,00");
  });

  it("apresenta faixa com os dois extremos", () => {
    expect(
      normalizar(
        descreverPreco(
          oferta({
            priceMode: "RANGE",
            priceMinMinor: 10000,
            priceMaxMinor: 25000,
          }),
        ),
      ),
    ).toBe("De R$ 100,00 a R$ 250,00");
  });

  /**
   * As três ausências de número são afirmações diferentes: colapsá-las apagaria
   * a resposta que o usuário acabou de dar.
   */
  it("distingue sob orçamento, gratuito e não informado", () => {
    const semValor = { priceMinMinor: null, priceMaxMinor: null };

    expect(descreverPreco(oferta({ priceMode: "QUOTE", ...semValor }))).toBe(
      "Sob orçamento",
    );
    expect(descreverPreco(oferta({ priceMode: "FREE", ...semValor }))).toBe(
      "Gratuito",
    );
    expect(
      descreverPreco(oferta({ priceMode: "NOT_INFORMED", ...semValor })),
    ).toBe("Preço não informado");
  });

  it("não exibe NaN quando o valor esperado estiver ausente", () => {
    const texto = descreverPreco(oferta({ priceMinMinor: null }));

    expect(texto).toBe("Preço não informado");
    expect(texto).not.toContain("NaN");
  });

  /** Nenhuma taxonomia interna pode vazar para a frase mostrada. */
  it("nunca devolve a chave interna do modo", () => {
    for (const priceMode of PRICE_MODES) {
      const texto = descreverPreco(oferta({ priceMode }));
      expect(texto).not.toContain(priceMode);
    }
  });
});

describe("valorParaCampo", () => {
  it("devolve texto vazio para ausência", () => {
    expect(valorParaCampo(null)).toBe("");
  });

  it("mantém os centavos e agrupa o milhar", () => {
    expect(valorParaCampo(123456)).toBe("1.234,56");
    expect(valorParaCampo(5000)).toBe("50,00");
    expect(valorParaCampo(5)).toBe("0,05");
  });

  /**
   * Ida e volta sem ponto flutuante: o teto de `money.ts` é justamente onde
   * uma divisão por 100 começaria a perder centavos.
   */
  it("preserva o centavo no teto do domínio", () => {
    expect(valorParaCampo(100_000_000_000)).toBe("1.000.000.000,00");
    expect(valorParaCampo(99_999_999_999)).toBe("999.999.999,99");
  });
});

describe("guards de taxonomia", () => {
  it("aceita os valores do banco e recusa o resto", () => {
    for (const tipo of OFFER_TYPES) expect(isOfferType(tipo)).toBe(true);
    for (const modo of PRICE_MODES) expect(isPriceMode(modo)).toBe(true);

    expect(isOfferType("SKU")).toBe(false);
    expect(isPriceMode("NEGOTIABLE")).toBe(false);
    expect(isOfferType(null)).toBe(false);
  });

  it("descreve a forma de preço de todos os modos", () => {
    for (const modo of PRICE_MODES) {
      expect(PRICE_MODE_AMOUNTS[modo]).toBeDefined();
    }
  });
});
