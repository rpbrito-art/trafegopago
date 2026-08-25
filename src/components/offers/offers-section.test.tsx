import { isValidElement, type ReactElement, type ReactNode } from "react";
import { describe, expect, it } from "vitest";

import type { OffersState } from "@/lib/offers/offer-catalog";
import {
  OFFER_TYPES,
  PRICE_MODES,
  type BusinessOffer,
} from "@/lib/offers/offers";

import { OffersSection } from "./offers-section";

/**
 * Ofertas na tela — Rodada 004C §§9 e 12.3.
 *
 * Percorre a árvore sem DOM, como os demais testes de componente. O que se
 * prova é de produto: catálogo vazio orienta em vez de bloquear, preço aparece
 * em formato humano, e nada de vocabulário interno chega ao usuário.
 */

const FOLHAS: readonly unknown[] = [];

function walk(node: ReactNode, visit: (element: ReactElement) => void): void {
  if (Array.isArray(node)) {
    for (const filho of node) walk(filho, visit);
    return;
  }

  if (!isValidElement(node)) return;

  visit(node);

  if (typeof node.type === "function" && !FOLHAS.includes(node.type)) {
    const render = node.type as (props: unknown) => ReactNode;
    walk(render(node.props), visit);
    return;
  }

  const props = node.props as { children?: ReactNode };
  if (props?.children !== undefined) walk(props.children, visit);
}

function textOf(node: ReactNode): string {
  const partes: string[] = [];

  walk(node, (element) => {
    const children = (element.props as { children?: ReactNode })?.children;

    for (const parte of [children].flat()) {
      if (typeof parte === "string" || typeof parte === "number") {
        partes.push(String(parte));
      }
    }
  });

  return partes.join(" ");
}

const OFERTA: BusinessOffer = {
  id: "44444444-4444-4444-4444-444444444444",
  name: "Corte de cabelo",
  offerType: "SERVICE",
  description: null,
  valueProposition: null,
  priceMode: "STARTING_AT",
  priceMinMinor: 5000,
  priceMaxMinor: null,
  currency: "BRL",
  createdAt: "2026-08-25T12:00:00.000Z",
};

function pronto(extra: Partial<Extract<OffersState, { kind: "pronto" }>> = {}) {
  return {
    kind: "pronto" as const,
    organizationId: "11111111-1111-1111-1111-111111111111",
    podeGerenciar: true,
    ofertas: [OFERTA],
    sugestaoLegada: null,
    ...extra,
  };
}

describe("OffersSection", () => {
  it("orienta o próximo passo quando não há oferta", () => {
    const texto = textOf(
      <OffersSection state={pronto({ ofertas: [] })} />,
    );

    expect(texto).toContain("Adicionar uma oferta");
    expect(texto).not.toContain("erro");
  });

  it("não oferece cadastro a quem não administra", () => {
    const texto = textOf(
      <OffersSection state={pronto({ ofertas: [], podeGerenciar: false })} />,
    );

    expect(texto).toContain("Quem administra o negócio");
    expect(texto).not.toContain("Adicionar uma oferta");
  });

  it("mostra a oferta em linguagem humana, com preço formatado", () => {
    // `textOf` junta cada nó com espaço, e `Intl` usa espaço não separável
    // antes do valor; a normalização abaixo compara a frase, não o espaçamento.
    const texto = textOf(<OffersSection state={pronto()} />)
      .replace(/ /g, " ")
      .replace(/\s+/g, " ");

    expect(texto).toContain("Corte de cabelo");
    expect(texto).toContain("Serviço");
    expect(texto).toContain("A partir de R$ 50,00");
  });

  /**
   * Nenhum enum, id ou termo de banco pode chegar à tela — a mesma regra que
   * vale para objetivo (`GROWTH_INTELLIGENCE_CANONICAL.md` §2.1).
   */
  it("não expõe taxonomia interna, uuid nem versão", () => {
    const texto = textOf(<OffersSection state={pronto()} />);

    for (const tipo of OFFER_TYPES) expect(texto).not.toContain(tipo);
    for (const modo of PRICE_MODES) expect(texto).not.toContain(modo);

    expect(texto).not.toContain(OFERTA.id);
    expect(texto).not.toContain("version");
    expect(texto).not.toContain("offer_id");
  });

  it("explica o estado multi-negócio sem revelar dados internos", () => {
    const texto = textOf(
      <OffersSection state={{ kind: "multiplos-negocios", quantidade: 2 }} />,
    );

    expect(texto).toContain("mais de um negócio");
    expect(texto).not.toContain("2");
  });

  /** A conta já mostra o convite para criar o negócio; repetir competiria com ele. */
  it("não renderiza nada sem organização", () => {
    expect(OffersSection({ state: { kind: "sem-organizacao" } })).toBeNull();
  });

  it("erro técnico diz que nada foi alterado", () => {
    const texto = textOf(<OffersSection state={{ kind: "erro-tecnico" }} />);

    expect(texto).toContain("Nada foi alterado");
  });
});
