import { isValidElement, type ReactElement, type ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { decideJourneyStep } from "@/lib/growth/journey";

import { NextStep } from "./next-step";

/**
 * A tela do próximo passo — Rodada 004D §§9 e 20.
 *
 * Percorre a árvore sem DOM, como os demais testes de componente. O que se
 * prova é de produto: uma ação principal, ensinamento junto do passo, e nenhum
 * CTA para capacidade que ainda não existe.
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

/** Conta os links renderizados — a "ação principal" da tela. */
function links(node: ReactNode): string[] {
  const href: string[] = [];

  walk(node, (element) => {
    const props = element.props as { href?: string };
    if (typeof props?.href === "string") href.push(props.href);
  });

  return href;
}

const ORG = "11111111-1111-1111-1111-111111111111";
const OFERTA = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

const OFERTA_ATIVA = {
  id: OFERTA,
  name: "Corte de cabelo",
  offerType: "SERVICE" as const,
  description: null,
  valueProposition: null,
  priceMode: "QUOTE" as const,
  priceMinMinor: null,
  priceMaxMinor: null,
  currency: "BRL",
  createdAt: "2026-08-25T12:00:00.000Z",
};

const OBJETIVO_COM_FOCO = {
  id: "22222222-2222-2222-2222-222222222222",
  objectiveType: "LEADS" as const,
  objectiveDetail: null,
  destinationType: "WHATSAPP" as const,
  successEventType: "CONVERSATION_STARTED" as const,
  successEventDetail: null,
  focusType: "BUSINESS" as const,
  focusOfferId: null,
  createdAt: "2026-08-25T12:00:00.000Z",
};

describe("NextStep", () => {
  it("mostra uma única ação principal quando há ação possível", () => {
    const step = decideJourneyStep({
      objetivo: { kind: "sem-objetivo", organizationId: ORG, podeDefinir: true },
      ofertas: {
        kind: "pronto",
        organizationId: ORG,
        podeGerenciar: true,
        ofertas: [],
        sugestaoLegada: null,
      },
    });

    const arvore = <NextStep step={step} />;

    expect(links(arvore)).toEqual(["/objetivo"]);
    expect(textOf(arvore)).toContain("Definir meu objetivo");
  });

  it("explica por que importa e o que muda depois", () => {
    const step = decideJourneyStep({
      objetivo: { kind: "sem-organizacao" },
      ofertas: { kind: "sem-organizacao" },
    });

    const texto = textOf(<NextStep step={step} />);

    expect(texto).toContain("Por que isso importa:");
    expect(texto).toContain("O que muda depois:");
  });

  it("não renderiza ação quando quem olha não pode executá-la", () => {
    const step = decideJourneyStep({
      objetivo: { kind: "sem-objetivo", organizationId: ORG, podeDefinir: false },
      ofertas: {
        kind: "pronto",
        organizationId: ORG,
        podeGerenciar: false,
        ofertas: [],
        sugestaoLegada: null,
      },
    });

    expect(links(<NextStep step={step} />)).toEqual([]);
  });

  it("base pronta não oferece link algum nem promete capacidade inexistente", () => {
    const step = decideJourneyStep({
      objetivo: {
        kind: "definido",
        organizationId: ORG,
        objetivo: OBJETIVO_COM_FOCO,
        podeAlterar: true,
      },
      ofertas: {
        kind: "pronto",
        organizationId: ORG,
        podeGerenciar: true,
        ofertas: [OFERTA_ATIVA],
        sugestaoLegada: null,
      },
    });

    const arvore = <NextStep step={step} />;

    expect(links(arvore)).toEqual([]);
    expect(textOf(arvore).toLowerCase()).not.toContain("instagram");
    expect(textOf(arvore)).toContain("etapas da base inicial estão completas");
  });

  /** Progresso é uma frase, não porcentagem inventada nem checklist técnico. */
  it("mostra a etapa da base inicial sem gamificação", () => {
    const step = decideJourneyStep({
      objetivo: { kind: "sem-objetivo", organizationId: ORG, podeDefinir: true },
      ofertas: {
        kind: "pronto",
        organizationId: ORG,
        podeGerenciar: true,
        ofertas: [],
        sugestaoLegada: null,
      },
    });

    const texto = textOf(<NextStep step={step} />);

    expect(texto).toContain("Etapa 2 de 4");
    expect(texto).not.toContain("%");
    expect(texto.toLowerCase()).not.toContain("pontos");
  });

  it("erro técnico não oferece ação e diz que nada mudou", () => {
    const step = decideJourneyStep({
      objetivo: { kind: "erro-tecnico" },
      ofertas: { kind: "erro-tecnico" },
    });

    const arvore = <NextStep step={step} />;

    expect(links(arvore)).toEqual([]);
    expect(textOf(arvore)).toContain("Nada foi alterado");
  });
});
