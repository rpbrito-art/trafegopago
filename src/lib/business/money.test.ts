import { describe, expect, it } from "vitest";

import {
  MAX_AMOUNT_MINOR,
  formatMinorAmount,
  parseAmountToMinor,
} from "./money";

describe("parseAmountToMinor", () => {
  it("trata campo vazio como ausência, não como zero", () => {
    expect(parseAmountToMinor("")).toEqual({ ok: true, amountMinor: null });
    expect(parseAmountToMinor("   ")).toEqual({ ok: true, amountMinor: null });
    expect(parseAmountToMinor(undefined)).toEqual({
      ok: true,
      amountMinor: null,
    });
    expect(parseAmountToMinor("0")).toEqual({ ok: true, amountMinor: 0 });
  });

  it("converte os formatos que um usuário brasileiro digita", () => {
    const casos: [string, number][] = [
      ["1250", 125_000],
      ["1250,00", 125_000],
      ["1.250,00", 125_000],
      ["1.250", 125_000],
      ["R$ 1.250,00", 125_000],
      ["1.234.567,89", 123_456_789],
      ["12,5", 1250],
      [",50", 50],
      ["1250.00", 125_000],
    ];

    for (const [entrada, esperado] of casos) {
      expect(parseAmountToMinor(entrada), entrada).toEqual({
        ok: true,
        amountMinor: esperado,
      });
    }
  });

  it("não perde centavo em valores que o float arredondaria", () => {
    // parseFloat("1234.56") * 100 === 123455.99999999999
    expect(parseAmountToMinor("1234,56")).toEqual({
      ok: true,
      amountMinor: 123_456,
    });
    expect(parseAmountToMinor("8,07")).toEqual({ ok: true, amountMinor: 807 });
    expect(parseAmountToMinor("0,29")).toEqual({ ok: true, amountMinor: 29 });
  });

  it("devolve inteiro, nunca fracionário", () => {
    const resultado = parseAmountToMinor("99,99");

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(Number.isInteger(resultado.amountMinor)).toBe(true);
  });

  it("recusa entrada malformada em vez de adivinhar", () => {
    // `1.23.456` e `1.2.3,4,5` importam em especial: um parser que apenas
    // remove separadores os aceitaria como 123456 e 1234,40.
    for (const entrada of [
      "abc",
      "1,234",
      "12,345",
      "1.2.3,4,5",
      "1.23.456",
      "1.234,5.6",
      "1e3",
      "--5",
    ]) {
      expect(parseAmountToMinor(entrada).ok, entrada).toBe(false);
    }
  });

  it("recusa negativo", () => {
    expect(parseAmountToMinor("-10")).toEqual({ ok: false, reason: "negativo" });
  });

  it("recusa valor acima do teto", () => {
    expect(parseAmountToMinor("1.000.000.001,00")).toEqual({
      ok: false,
      reason: "excede",
    });
    expect(parseAmountToMinor("1.000.000.000,00")).toEqual({
      ok: true,
      amountMinor: MAX_AMOUNT_MINOR,
    });
  });

  it("recusa moeda sem expoente conhecido", () => {
    expect(parseAmountToMinor("10", "XYZ").ok).toBe(false);
  });
});

describe("formatMinorAmount", () => {
  it("formata unidade menor em pt-BR", () => {
    expect(formatMinorAmount(125_000).replace(/\s/g, " ")).toBe(
      "R$ 1.250,00",
    );
    expect(formatMinorAmount(29).replace(/\s/g, " ")).toBe("R$ 0,29");
  });
});
