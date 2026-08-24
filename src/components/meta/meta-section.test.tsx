import { isValidElement, type ReactElement, type ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { MetaConnectButton } from "@/components/meta/meta-connect-button";
import { MetaDisconnectButton } from "@/components/meta/meta-disconnect-button";
import { MetaExternalRemoval } from "@/components/meta/meta-external-removal";

import { MetaSection, type MetaResultado } from "./meta-section";

/**
 * Percorre a árvore sem DOM, como em `business-section.test.tsx`.
 *
 * O que precisa ficar provado aqui é de produto, não de renderização: quando a
 * Meta é quem encerra o acesso, a tela precisa dizer o passo e oferecer a
 * verificação — e em nenhum estado pode aparecer vocabulário de Graph API,
 * token ou identificador externo.
 */
const FOLHAS: readonly unknown[] = [MetaConnectButton, MetaDisconnectButton];

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

function usa(componente: unknown, node: ReactNode): boolean {
  let encontrado = false;
  walk(node, (element) => {
    if (element.type === componente) encontrado = true;
  });
  return encontrado;
}

const ORG = "11111111-1111-1111-1111-111111111111";

const CONECTADO = {
  kind: "conectado" as const,
  organizationId: ORG,
  conectadaEm: "2026-08-24T01:47:57.000Z",
};

function conectado(resultado?: MetaResultado) {
  return MetaSection({ state: CONECTADO, resultado });
}

describe("MetaSection — encerramento no ambiente da Meta", () => {
  it("explica o passo externo e oferece a verificação", () => {
    const arvore = conectado("externo");
    const texto = textOf(arvore);

    expect(usa(MetaExternalRemoval, arvore)).toBe(true);
    expect(texto).toContain("Integrações");
    expect(texto).toContain("Aplicativos conectados");
    expect(texto).toContain("Já removi — verificar");
  });

  it("não oferece Desconectar enquanto a remoção externa está pendente", () => {
    // Repetir o botão que acabou de não resolver nada só reforçaria a
    // impressão de que o encerramento acontece aqui.
    expect(usa(MetaDisconnectButton, conectado("externo"))).toBe(false);
  });

  it("diz que a conexão continua guardada até a Meta confirmar", () => {
    expect(textOf(conectado("externo"))).toContain("guardada");
  });

  it("avisa quando a Meta ainda mostra o acesso ativo", () => {
    const texto = textOf(conectado("ainda-ativo"));

    expect(texto).toContain("ainda mostra o acesso como ativo");
    expect(texto).toContain("Já removi — verificar");
  });

  it("falha de verificação mantém o passo à vista e diz que nada mudou", () => {
    const texto = textOf(conectado("nao-verificado"));

    expect(texto).toContain("Não conseguimos confirmar agora");
    expect(texto).toContain("Nada foi alterado");
    expect(texto).toContain("Já removi — verificar");
  });

  it("erro genérico não vira instrução de remoção externa", () => {
    // Uma falha de rede na desconexão não prova que a credencial exige ação no
    // ambiente da Meta. Mandar a pessoa remover o app ali seria chute.
    const arvore = conectado("erro");

    expect(usa(MetaExternalRemoval, arvore)).toBe(false);
    expect(usa(MetaDisconnectButton, arvore)).toBe(true);
    expect(textOf(arvore)).toContain("Nada foi alterado");
  });

  it("confirma o encerramento quando a verificação passou", () => {
    const arvore = MetaSection({
      state: { kind: "desconectado", organizationId: ORG },
      resultado: "desconectado",
    });

    expect(textOf(arvore)).toContain("a Meta confirmou a remoção");
    expect(usa(MetaConnectButton, arvore)).toBe(true);
  });

  it("sem desfecho pendente, o estado conectado segue normal", () => {
    const arvore = conectado();

    expect(usa(MetaDisconnectButton, arvore)).toBe(true);
    expect(usa(MetaExternalRemoval, arvore)).toBe(false);
  });
});

describe("MetaSection — vocabulário", () => {
  const PROIBIDO = [
    "token",
    "Token",
    "client_business_id",
    "business_id",
    "system user",
    "System User",
    "BISU",
    "Graph",
    "oauth",
    "OAuth",
    "scope",
    "app secret",
    "access_token",
    "debug_token",
    "v26.0",
    "122103866379446065",
  ];

  const DESFECHOS: readonly (MetaResultado | undefined)[] = [
    undefined,
    "ok",
    "erro",
    "externo",
    "desconectado",
    "ainda-ativo",
    "nao-verificado",
  ];

  it("nenhum desfecho do estado conectado expõe jargão ou identificador", () => {
    for (const desfecho of DESFECHOS) {
      const texto = textOf(conectado(desfecho));

      for (const termo of PROIBIDO) {
        expect(texto, `desfecho ${desfecho ?? "nenhum"} × ${termo}`).not.toContain(
          termo,
        );
      }
    }
  });

  it("o passo externo não expõe o identificador do negócio na Meta", () => {
    const texto = textOf(
      MetaExternalRemoval({ organizationId: ORG, aviso: "ainda-ativo" }),
    );

    expect(texto).not.toContain(ORG);
    for (const termo of PROIBIDO) {
      expect(texto, termo).not.toContain(termo);
    }
  });
});
