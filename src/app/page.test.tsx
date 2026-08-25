import { isValidElement, type ReactElement, type ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { APP_NAME } from "@/lib/brand";

import Home from "./page";

/** Percorre a árvore sem DOM, como nos demais testes de componente. */
function textOf(node: ReactNode): string {
  const partes: string[] = [];

  const walk = (atual: ReactNode): void => {
    if (Array.isArray(atual)) {
      for (const filho of atual) walk(filho);
      return;
    }
    if (typeof atual === "string" || typeof atual === "number") {
      partes.push(String(atual));
      return;
    }
    if (!isValidElement(atual)) return;

    const element = atual as ReactElement<{ children?: ReactNode }>;
    walk(element.props.children);
  };

  walk(node);
  return partes.join("");
}

describe("Home — marca e promessa", () => {
  it("renderiza um elemento React válido", () => {
    expect(isValidElement(Home())).toBe(true);
  });

  it("apresenta o produto pelo nome canônico", () => {
    expect(APP_NAME).toBe("Quoron");
    expect(textOf(Home())).toContain("Quoron");
  });

  it("não usa mais o nome antigo como marca", () => {
    expect(textOf(Home())).not.toContain("Tráfego Pago");
  });

  it("não exibe estágio técnico de rodada", () => {
    // `Rodada 001B — Auth real` era informação de quem constrói o produto, não
    // de quem o contrata.
    const texto = textOf(Home());

    expect(texto).not.toMatch(/Rodada \d/);
    expect(texto).not.toContain("001B");
  });

  it("não afirma ausência de funcionalidade nem promete o que não existe", () => {
    const texto = textOf(Home());

    expect(texto).not.toContain("Nenhuma funcionalidade");
    // Nada de prometer campanha, anúncio ou automação ainda não construída.
    expect(texto).not.toMatch(/\b(campanhas?|anúncios?)\b/i);
  });

  it("explica o propósito em linguagem de negócio", () => {
    const texto = textOf(Home());

    expect(texto).toContain("resultado");
    expect(texto).toContain("medir");
  });
});
