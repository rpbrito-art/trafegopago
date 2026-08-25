import { isValidElement, type ReactElement, type ReactNode } from "react";
import { describe, expect, it } from "vitest";

import type { ObjectiveState } from "@/lib/growth/objective-state";
import type { GrowthObjective } from "@/lib/growth/objectives";

import { ObjectiveSection } from "./objective-section";

/**
 * Objetivo na tela — Rodada 004B §§8 e 11.3.
 *
 * Percorre a árvore sem DOM, como os demais testes de componente. O que se
 * prova é de produto: ausência de objetivo orienta em vez de bloquear, e nada
 * de vocabulário interno chega ao usuário.
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

  return partes.join("");
}

function temLinkPara(node: ReactNode, href: string): boolean {
  let achou = false;
  walk(node, (element) => {
    if ((element.props as { href?: string })?.href === href) achou = true;
  });
  return achou;
}

const ORG = "11111111-1111-1111-1111-111111111111";

const OBJETIVO: GrowthObjective = {
  id: "22222222-2222-2222-2222-222222222222",
  objectiveType: "BOOKINGS",
  objectiveDetail: null,
  destinationType: "WHATSAPP",
  successEventType: "BOOKING_CONFIRMED",
  successEventDetail: null,
  createdAt: "2026-08-25T12:00:00.000Z",
};

function render(state: ObjectiveState) {
  return ObjectiveSection({ state });
}

describe("sem objetivo definido", () => {
  const SEM: ObjectiveState = {
    kind: "sem-objetivo",
    organizationId: ORG,
    podeDefinir: true,
  };

  it("é estado válido: orienta em vez de acusar erro", () => {
    const texto = textOf(render(SEM));

    expect(texto).toContain("objetivo");
    expect(texto).not.toMatch(/erro|falha|inválid/i);
  });

  it("oferece uma ação principal clara", () => {
    expect(textOf(render(SEM))).toContain("Definir meu objetivo");
    expect(temLinkPara(render(SEM), "/objetivo")).toBe(true);
  });

  it("explica por que a resposta importa", () => {
    const texto = textOf(render(SEM));

    expect(texto).toMatch(/orienta|recomenda/i);
  });

  it("quem não administra não recebe o convite para definir", () => {
    const texto = textOf(render({ ...SEM, podeDefinir: false }));

    expect(texto).not.toContain("Definir meu objetivo");
    expect(texto).toContain("administra");
  });
});

describe("com objetivo definido", () => {
  const DEFINIDO: ObjectiveState = {
    kind: "definido",
    organizationId: ORG,
    objetivo: OBJETIVO,
    podeAlterar: true,
  };

  it("mostra as três respostas em português", () => {
    const texto = textOf(render(DEFINIDO));

    expect(texto).toContain("Receber agendamentos");
    expect(texto).toContain("WhatsApp");
    expect(texto).toContain("A pessoa confirmar um agendamento");
  });

  it("não mostra UUID nem taxonomia interna", () => {
    const texto = textOf(render(DEFINIDO));

    expect(texto).not.toContain(OBJETIVO.id);
    expect(texto).not.toContain(ORG);
    expect(texto).not.toContain("BOOKINGS");
    expect(texto).not.toContain("BOOKING_CONFIRMED");
  });

  it("diz quando foi definido", () => {
    expect(textOf(render(DEFINIDO))).toContain("Definido em");
  });

  it("não promete mensuração que ainda não existe", () => {
    const texto = textOf(render(DEFINIDO));

    expect(texto).toContain("conforme suas conexões");
    expect(texto).not.toMatch(/já medimos|conversão confirmada|atribuição/i);
  });

  it("oferece alterar o objetivo a quem administra", () => {
    expect(textOf(render(DEFINIDO))).toContain("Alterar objetivo");
  });

  it("quem não administra vê o objetivo, mas não a ação de alterar", () => {
    const texto = textOf(render({ ...DEFINIDO, podeAlterar: false }));

    expect(texto).toContain("Receber agendamentos");
    expect(texto).not.toContain("Alterar objetivo");
  });
});

describe("contexto de organização ambíguo ou indisponível", () => {
  it("negócio indisponível não convida a criar outro", () => {
    // Esse convite criaria um segundo tenant por engano.
    const texto = textOf(render({ kind: "negocio-indisponivel" }));

    expect(texto).toContain("Verifique sua conta");
    expect(texto).not.toContain("Criar meu negócio");
    expect(texto).not.toContain("Definir meu objetivo");
  });

  it("mais de um negócio explica sem oferecer escolha implícita", () => {
    const texto = textOf(render({ kind: "multiplos-negocios", quantidade: 2 }));

    expect(texto).toContain("mais de um negócio");
    expect(texto).not.toContain("Definir meu objetivo");
    expect(texto).not.toContain("Alterar objetivo");
  });

  it("nenhum dos dois expõe id, papel ou contagem técnica", () => {
    for (const estado of [
      { kind: "negocio-indisponivel" } as const,
      { kind: "multiplos-negocios", quantidade: 2 } as const,
    ]) {
      const texto = textOf(render(estado));

      expect(texto).not.toContain(ORG);
      expect(texto).not.toMatch(/owner|admin|organization_id|membership/i);
    }
  });
});

describe("demais estados", () => {
  it("sem organização, o próximo passo é criar o negócio", () => {
    const texto = textOf(render({ kind: "sem-organizacao" }));

    expect(texto).toContain("Criar meu negócio");
    expect(texto).not.toContain("Definir meu objetivo");
  });

  it("falha técnica diz que nada foi alterado", () => {
    expect(textOf(render({ kind: "erro-tecnico" }))).toContain(
      "Nada foi alterado",
    );
  });

  it("nenhum estado exibe termo de plataforma publicitária", () => {
    const estados: ObjectiveState[] = [
      { kind: "sem-objetivo", organizationId: ORG, podeDefinir: true },
      { kind: "definido", organizationId: ORG, objetivo: OBJETIVO, podeAlterar: true },
      { kind: "sem-organizacao" },
      { kind: "negocio-indisponivel" },
      { kind: "multiplos-negocios", quantidade: 2 },
      { kind: "erro-tecnico" },
    ];

    const proibidos = /\b(pixel|ad ?set|placement|campaign|token|API)\b/i;

    for (const estado of estados) {
      expect(textOf(render(estado)), estado.kind).not.toMatch(proibidos);
    }
  });
});
