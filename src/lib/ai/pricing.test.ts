import { describe, expect, it } from "vitest";

import {
  calcularCusto,
  formatarEscalaParaDecimal,
  parseDecimalParaEscala,
} from "./pricing";

/**
 * Custo de IA — Rodada 004A §§8 e 10.10.
 *
 * O que se prova aqui não é aritmética genérica: é que o custo de uma chamada
 * **subcentavo** sobrevive ao cálculo, e que preço ou usage que não dão para
 * confiar não viram um número plausível.
 */

const PRECO = {
  // Ordem de grandeza real de um Tier 1: centavos de dólar por milhão.
  inputPricePerMillion: "0.150000000000",
  outputPricePerMillion: "0.600000000000",
  cachedInputPricePerMillion: null,
  currency: "USD",
};

describe("conversão decimal", () => {
  it("preserva o valor em texto exato na ida e na volta", () => {
    const escalado = parseDecimalParaEscala("0.15");

    expect(escalado).not.toBeNull();
    expect(formatarEscalaParaDecimal(escalado!)).toBe("0.150000000000");
  });

  it("aceita inteiro sem parte fracionária", () => {
    expect(formatarEscalaParaDecimal(parseDecimalParaEscala("3")!)).toBe(
      "3.000000000000",
    );
  });

  it("recusa notação científica", () => {
    // Um preço que chega como `1e-7` é um preço que ninguém conferiu.
    expect(parseDecimalParaEscala("1e-7")).toBeNull();
  });

  it("recusa mais casas do que a escala suporta", () => {
    // Truncar aqui esconderia perda de precisão dentro de um número que
    // continua parecendo exato.
    expect(parseDecimalParaEscala("0.1234567890123")).toBeNull();
  });

  it("recusa texto que não é decimal", () => {
    for (const lixo of ["", "abc", "0,15", "0.15.1", " "]) {
      expect(parseDecimalParaEscala(lixo)).toBeNull();
    }
  });
});

describe("cálculo de custo", () => {
  it("custo subcentavo não vira zero", () => {
    // 1.000 tokens de input a 0,15/milhão = 0,00015 — que em `numeric(20,2)`
    // seria 0,00 e apagaria a operação Tier 1 inteira da contabilidade.
    const r = calcularCusto({
      usage: { inputTokens: 1000, outputTokens: 0 },
      price: PRECO,
    });

    expect(r).toEqual({ ok: true, custo: "0.000150000000", currency: "USD" });
  });

  it("soma input e output pelos preços respectivos", () => {
    // 1.234 * 0,15/1e6 + 567 * 0,60/1e6 = 0,0001851 + 0,0003402 = 0,0005253
    const r = calcularCusto({
      usage: { inputTokens: 1234, outputTokens: 567 },
      price: PRECO,
    });

    expect(r.ok && r.custo).toBe("0.000525300000");
  });

  it("é determinístico: mesma entrada, mesmo custo", () => {
    const uma = calcularCusto({
      usage: { inputTokens: 7919, outputTokens: 1223 },
      price: PRECO,
    });
    const outra = calcularCusto({
      usage: { inputTokens: 7919, outputTokens: 1223 },
      price: PRECO,
    });

    expect(uma).toEqual(outra);
  });

  it("tokens cacheados usam o preço de cache quando existe", () => {
    // 1000 input a 0,15 + 1000 cached a 0,015 = 0,00015 + 0,000015
    const r = calcularCusto({
      usage: { inputTokens: 1000, outputTokens: 0, cachedTokens: 1000 },
      price: { ...PRECO, cachedInputPricePerMillion: "0.015" },
    });

    expect(r.ok && r.custo).toBe("0.000165000000");
  });

  it("sem preço de cache, o token cacheado custa como input — não zero", () => {
    // Cobrar zero afirmaria gratuidade onde o correto é "este provider não
    // distingue cache".
    const r = calcularCusto({
      usage: { inputTokens: 1000, outputTokens: 0, cachedTokens: 1000 },
      price: PRECO,
    });

    expect(r.ok && r.custo).toBe("0.000300000000");
  });

  it("cacheado é disjunto de input, não somado duas vezes", () => {
    const comCache = calcularCusto({
      usage: { inputTokens: 1000, outputTokens: 0, cachedTokens: 500 },
      price: { ...PRECO, cachedInputPricePerMillion: "0" },
    });

    // Com preço de cache zero, o total tem de ser exatamente o dos 1000 de
    // input: se `cachedTokens` fosse somado a `inputTokens`, daria mais.
    expect(comCache.ok && comCache.custo).toBe("0.000150000000");
  });

  it("usage zerado produz custo zero, não erro", () => {
    const r = calcularCusto({
      usage: { inputTokens: 0, outputTokens: 0 },
      price: PRECO,
    });

    expect(r.ok && r.custo).toBe("0.000000000000");
  });

  it("arredonda para cima na metade exata", () => {
    // 1 token a 0,000000000005/milhão daria 5e-18: abaixo da escala. O
    // arredondamento half-up é o que impede o viés sistemático para baixo.
    const r = calcularCusto({
      usage: { inputTokens: 500_000, outputTokens: 0 },
      price: { ...PRECO, inputPricePerMillion: "0.000000000001" },
    });

    expect(r.ok && r.custo).toBe("0.000000000001");
  });

  it("preço ilegível falha em vez de virar número plausível", () => {
    const r = calcularCusto({
      usage: { inputTokens: 10, outputTokens: 10 },
      price: { ...PRECO, inputPricePerMillion: "grátis" },
    });

    expect(r).toEqual({ ok: false, motivo: "PRECO_INVALIDO" });
  });

  it("preço negativo é recusado", () => {
    const r = calcularCusto({
      usage: { inputTokens: 10, outputTokens: 10 },
      price: { ...PRECO, outputPricePerMillion: "-0.1" },
    });

    expect(r).toEqual({ ok: false, motivo: "PRECO_INVALIDO" });
  });

  it("usage fracionário ou negativo é recusado", () => {
    for (const usage of [
      { inputTokens: 1.5, outputTokens: 0 },
      { inputTokens: -1, outputTokens: 0 },
      { inputTokens: 0, outputTokens: 0, cachedTokens: -3 },
    ]) {
      expect(calcularCusto({ usage, price: PRECO })).toEqual({
        ok: false,
        motivo: "USAGE_INVALIDO",
      });
    }
  });

  it("preserva a moeda da versão de preço", () => {
    const r = calcularCusto({
      usage: { inputTokens: 1000, outputTokens: 0 },
      price: { ...PRECO, currency: "BRL" },
    });

    expect(r.ok && r.currency).toBe("BRL");
  });
});
