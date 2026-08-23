import { isValidElement, type ReactElement, type ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { CreateBusinessForm } from "@/components/business/create-business-form";
import type { AccountBusinessState } from "@/lib/business/account";

import { BusinessSection } from "./business-section";

/**
 * Percorre a árvore de elementos sem DOM.
 *
 * O projeto não tem renderer de testes instalado e o mandato 001E §10.2 pede
 * prova proporcional, não infraestrutura nova. Andar na árvore basta para o
 * que importa aqui: qual ramo o estado escolheu, e se o formulário de criação
 * aparece onde não deveria.
 *
 * Componentes de função internos (`Notice`, `ProfileSummary`) são chamados
 * durante a travessia — sem isso, o texto que eles recebem por prop, como o
 * título de um aviso, nunca apareceria. `CreateBusinessForm` é a exceção
 * deliberada: é Client Component com hook, então é tratado como folha e só
 * detectado pela identidade.
 */
const FOLHAS: readonly unknown[] = [CreateBusinessForm];

function walk(node: ReactNode, visit: (element: ReactElement) => void): void {
  if (Array.isArray(node)) {
    for (const child of node) walk(child, visit);
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

function usaFormularioDeCriacao(state: AccountBusinessState): boolean {
  let encontrado = false;

  walk(BusinessSection({ state }), (element) => {
    if (element.type === CreateBusinessForm) encontrado = true;
  });

  return encontrado;
}

const ORGANIZACAO = {
  id: "22222222-2222-2222-2222-222222222222",
  name: "Clínica Exemplo",
  status: "ACTIVE",
  timezone: "America/Sao_Paulo",
  defaultCurrency: "BRL",
};

const PERFIL = {
  segment: "Odontologia",
  locationSummary: "Campinas, SP",
  primaryOffer: "Implantes e clareamento",
  averageTicketMinor: 125_000,
  currency: "BRL",
  targetAudience: "Adultos de 30 a 55 anos",
  differentiators: null,
  knownObjections: null,
  acquisitionGoal: "Agendar 40 avaliações por mês",
  commercialGoal: null,
};

describe("BusinessSection", () => {
  it("oferece o onboarding quando não há organização", () => {
    const arvore = BusinessSection({ state: { kind: "sem-organizacao" } });

    expect(usaFormularioDeCriacao({ kind: "sem-organizacao" })).toBe(true);
    expect(textOf(arvore)).toContain("Crie seu negócio");
  });

  it("mostra o resumo quando há organização e perfil", () => {
    const state: AccountBusinessState = {
      kind: "pronta",
      organization: ORGANIZACAO,
      profile: PERFIL,
    };

    const texto = textOf(BusinessSection({ state }));

    expect(texto).toContain("Clínica Exemplo");
    expect(texto).toContain("Odontologia");
    expect(texto).toContain("Agendar 40 avaliações por mês");
    expect(texto.replace(/\s/g, " ")).toContain("R$ 1.250,00");
    expect(usaFormularioDeCriacao(state)).toBe(false);
  });

  it("marca como não informado o que é opcional e ficou vazio", () => {
    const texto = textOf(
      BusinessSection({
        state: { kind: "pronta", organization: ORGANIZACAO, profile: PERFIL },
      }),
    );

    expect(texto).toContain("Não informado");
  });

  it("não oferece novo bootstrap quando a organização está indisponível", () => {
    const state: AccountBusinessState = { kind: "organizacao-indisponivel" };

    expect(usaFormularioDeCriacao(state)).toBe(false);
    expect(textOf(BusinessSection({ state }))).toContain("Negócio indisponível");
  });

  it("não escolhe tenant sozinho quando há mais de uma membership", () => {
    const state: AccountBusinessState = {
      kind: "multiplas-organizacoes",
      membershipCount: 2,
    };

    expect(usaFormularioDeCriacao(state)).toBe(false);
    expect(textOf(BusinessSection({ state }))).toContain(
      "Mais de um negócio nesta conta",
    );
  });

  it("distingue falha técnica de conta sem negócio", () => {
    const erro = textOf(BusinessSection({ state: { kind: "erro-tecnico" } }));
    const vazio = textOf(
      BusinessSection({ state: { kind: "sem-organizacao" } }),
    );

    expect(usaFormularioDeCriacao({ kind: "erro-tecnico" })).toBe(false);
    expect(erro).toContain("Não foi possível carregar seu negócio");
    expect(erro).not.toBe(vazio);
  });

  it("o aviso técnico é acionável e não sugere perda de dados", () => {
    const texto = textOf(BusinessSection({ state: { kind: "erro-tecnico" } }));

    expect(texto).toMatch(/Atualize a página/);
    expect(texto).toMatch(/não foi\s+apagado/i);
  });

  it("não recria o perfil silenciosamente quando ele falta", () => {
    const state: AccountBusinessState = {
      kind: "pronta",
      organization: ORGANIZACAO,
      profile: null,
    };

    expect(usaFormularioDeCriacao(state)).toBe(false);
    expect(textOf(BusinessSection({ state }))).toContain(
      "Perfil do negócio ausente",
    );
  });
});
