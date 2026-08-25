import { isValidElement, type ReactElement, type ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { connectMetaAction, disconnectMetaAction } from "@/app/actions/meta";
import { MetaConnectButton } from "@/components/meta/meta-connect-button";
import { MetaDisconnectButton } from "@/components/meta/meta-disconnect-button";
import type { MetaAdsState, MetaAssetState } from "@/lib/meta/asset-state";

import { MetaAssetsSection, type AtivoResultado } from "./meta-assets-section";

/**
 * Folhas do percurso: componentes cuja presença e props importam, mas cuja
 * renderização não é o assunto deste arquivo.
 */
const FOLHAS: readonly unknown[] = [MetaConnectButton];

/**
 * Percorre a árvore sem DOM, como em `meta-section.test.tsx`.
 *
 * O que precisa ficar provado aqui é de produto: cada estado vazio diz uma
 * coisa diferente, o ramo de anúncios nunca parece obrigatório, e nenhum
 * identificador externo aparece como texto na tela — ele existe apenas dentro
 * do campo oculto que a Server Action vai revalidar.
 */
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

/** Props com que um componente-folha foi chamado. */
function propsDe(componente: unknown, node: ReactNode): Record<string, unknown> | null {
  let props: Record<string, unknown> | null = null;
  walk(node, (element) => {
    if (element.type === componente) props = element.props as Record<string, unknown>;
  });
  return props;
}

/** Valores que viajam em campo oculto, e só ali. */
function valoresOcultos(node: ReactNode): string[] {
  const valores: string[] = [];

  walk(node, (element) => {
    const props = element.props as { type?: string; value?: unknown };
    if (element.type === "input" && props.type === "hidden") {
      valores.push(String(props.value));
    }
  });

  return valores;
}

const ORG = "11111111-1111-1111-1111-111111111111";

function render(state: MetaAssetState, resultado?: AtivoResultado) {
  return MetaAssetsSection({ state, resultado });
}

const OPCAO = {
  valor: "17841400000000000",
  username: "quoron",
  nome: "Quoron",
  pagina: "Página do Quoron",
};

describe("MetaAssetsSection — escolha do Instagram", () => {
  it("uma única conta é apresentada direto, sem formulário técnico", () => {
    const texto = textOf(render({ kind: "escolher-instagram", organizationId: ORG, opcoes: [OPCAO] }));

    expect(texto).toContain("Escolha o Instagram do negócio");
    expect(texto).toContain("Encontramos esta conta profissional");
    expect(texto).toContain("@quoron");
    expect(texto).toContain("Usar esta conta");
  });

  it("mais de uma conta pede a escolha explicitamente", () => {
    const texto = textOf(
      render({
        kind: "escolher-instagram",
        organizationId: ORG,
        opcoes: [OPCAO, { ...OPCAO, valor: "outro", username: "outro_perfil" }],
      }),
    );

    expect(texto).toContain("mais de uma conta profissional");
    expect(texto).toContain("@outro_perfil");
  });

  it("o id externo viaja em campo oculto e não vira texto de tela", () => {
    const arvore = render({
      kind: "escolher-instagram",
      organizationId: ORG,
      opcoes: [OPCAO],
    });

    expect(valoresOcultos(arvore)).toContain(OPCAO.valor);
    expect(textOf(arvore)).not.toContain(OPCAO.valor);
  });

  it("conta escolhida é confirmada em linguagem de negócio", () => {
    const texto = textOf(
      render({
        kind: "instagram-selecionado",
        organizationId: ORG,
        instagram: { username: "quoron", nome: "Quoron", selecionadoEm: "2026-08-24T12:00:00.000Z" },
        ads: { kind: "nao-autorizado" },
      }),
    );

    expect(texto).toContain("@quoron");
    expect(texto).toContain("Quoron");
  });
});

describe("MetaAssetsSection — estados vazios são distinguíveis", () => {
  it("sem Página, o próximo passo é a Página", () => {
    const texto = textOf(render({ kind: "sem-pagina", organizationId: ORG }));

    expect(texto).toContain("Página");
    expect(texto).not.toContain("vinculada a ela");
  });

  it("Página sem Instagram pede o vínculo, não uma Página nova", () => {
    const texto = textOf(render({ kind: "sem-instagram-vinculado", organizationId: ORG }));

    expect(texto).toContain("nenhuma conta profissional do Instagram");
    expect(texto).toContain("vinculada a ela");
  });

  it("permissão faltando oferece ampliar a autorização, sem mandar desconectar", () => {
    const arvore = render({ kind: "permissao-faltando", organizationId: ORG });
    const texto = textOf(arvore);

    expect(texto).toContain("está conectada");
    expect(texto).toContain("acesso necessário ao Instagram");
    // Desconectar primeiro destruiria uma credencial que ainda funciona.
    expect(texto).not.toContain("Desconect");
    expect(usa(MetaConnectButton, arvore)).toBe(true);
  });

  it("credencial recusada pede reconexão sem culpar o usuário", () => {
    const texto = textOf(render({ kind: "conexao-recusada", organizationId: ORG }));

    expect(texto).toContain("não aceitou mais a autorização");
  });

  it("credencial recusada oferece o botão de reconectar", () => {
    // Mandar conectar novamente sem oferecer por onde é um beco: a orientação
    // e a ação precisam estar na mesma tela (Correção 003B-08 §1).
    const arvore = render({ kind: "conexao-recusada", organizationId: ORG });
    const props = propsDe(MetaConnectButton, arvore);

    expect(usa(MetaConnectButton, arvore)).toBe(true);
    expect(props?.rotulo).toBe("Conectar novamente");
    expect(props?.organizationId).toBe(ORG);
  });

  it("credencial recusada também deixa recomeçar do zero", () => {
    // Ação secundária, não pré-requisito: reconectar continua não passando por
    // desconectar — a credencial atual só é substituída quando a nova
    // autorização conclui. Mas quem quer reiniciar o ciclo precisa de saída
    // (Correção 003B-09 §3.2).
    const arvore = render({ kind: "conexao-recusada", organizationId: ORG });
    const props = propsDe(MetaDisconnectButton, arvore);

    expect(usa(MetaDisconnectButton, arvore)).toBe(true);
    expect(props?.rotulo).toBe("Desconectar e começar de novo");
    expect(props?.organizationId).toBe(ORG);
  });

  it("recomeçar do zero usa a action canônica de desconexão", () => {
    const form = MetaDisconnectButton({
      organizationId: ORG,
      rotulo: "Desconectar e começar de novo",
    });

    let action: unknown = null;
    walk(form, (element) => {
      if (element.type === "form") action = (element.props as { action?: unknown }).action;
    });

    expect(action).toBe(disconnectMetaAction);
  });

  it("o botão de reconectar usa a action canônica de conexão", () => {
    const form = MetaConnectButton({
      organizationId: ORG,
      rotulo: "Conectar novamente",
    });

    let action: unknown = null;
    walk(form, (element) => {
      if (element.type === "form") action = (element.props as { action?: unknown }).action;
    });

    expect(action).toBe(connectMetaAction);
  });

  it("falha temporária diz que nada foi alterado", () => {
    const texto = textOf(render({ kind: "indisponivel", organizationId: ORG }));

    expect(texto).toContain("Nada foi alterado");
  });

  it("sem conexão a seção não aparece", () => {
    expect(render({ kind: "sem-conexao" })).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Correção 003B-03 — reautorizar sem desconectar
// ---------------------------------------------------------------------------

describe("ampliar autorização de uma conexão viva", () => {
  const FALTANDO: MetaAssetState = {
    kind: "permissao-faltando",
    organizationId: ORG,
  };

  it("oferece o botão com o rótulo de ampliação", () => {
    const props = propsDe(MetaConnectButton, render(FALTANDO));

    expect(props?.rotulo).toBe("Atualizar autorização");
  });

  it("o botão usa a organização do próprio estado", () => {
    const props = propsDe(MetaConnectButton, render(FALTANDO));

    expect(props?.organizationId).toBe(ORG);
  });

  it("reutiliza a action canônica de conexão, sem caminho novo de token", () => {
    // O mesmo fluxo OAuth da 003A: `begin_meta_connection` retoma a linha viva
    // e só troca o segredo depois que o novo token chega.
    const form = MetaConnectButton({ organizationId: ORG, rotulo: "Atualizar autorização" });

    let action: unknown = null;
    walk(form, (element) => {
      if (element.type === "form") action = (element.props as { action?: unknown }).action;
    });

    expect(action).toBe(connectMetaAction);
  });

  it("diz que a conexão atual continua valendo", () => {
    // Se a tela sugerisse desconectar antes, a pessoa destruiria uma
    // credencial funcional para tentar obter outra que pode nem ser concedida.
    expect(textOf(render(FALTANDO))).toContain("não perde a conexão atual");
  });

  it("nenhum outro estado ganha botão de conexão", () => {
    const outros: MetaAssetState[] = [
      { kind: "escolher-instagram", organizationId: ORG, opcoes: [OPCAO] },
      { kind: "sem-pagina", organizationId: ORG },
      { kind: "sem-instagram-vinculado", organizationId: ORG },
      { kind: "indisponivel", organizationId: ORG },
      {
        kind: "instagram-selecionado",
        organizationId: ORG,
        instagram: { username: "quoron", nome: "Quoron", selecionadoEm: null },
        ads: { kind: "nao-autorizado" },
      },
    ];

    for (const estado of outros) {
      expect(usa(MetaConnectButton, render(estado))).toBe(false);
    }
  });
});

describe("MetaAssetsSection — anunciar é opcional", () => {
  function comAds(ads: MetaAdsState) {
    return render({
      kind: "instagram-selecionado",
      organizationId: ORG,
      instagram: { username: "quoron", nome: "Quoron", selecionadoEm: null },
      ads,
    });
  }

  it("sem ads_read, o ramo de anúncios simplesmente não existe na tela", () => {
    // Mostrar "você não autorizou anúncios" transformaria uma escolha legítima
    // em pendência (`GROWTH_INTELLIGENCE_CANONICAL.md` §7 e §12).
    const texto = textOf(comAds({ kind: "nao-autorizado" }));

    expect(texto).not.toContain("anúncios");
    expect(texto).toContain("@quoron");
  });

  it("sem contas disponíveis também não vira pendência", () => {
    expect(textOf(comAds({ kind: "sem-contas" }))).not.toContain("anúncios");
  });

  it("falha no ramo pago não contamina a confirmação do Instagram", () => {
    const texto = textOf(comAds({ kind: "indisponivel" }));

    expect(texto).toContain("@quoron");
    expect(texto).not.toContain("Nada foi alterado");
  });

  it("com contas, o convite é condicional e sem promessa de gasto", () => {
    const arvore = comAds({
      kind: "escolher",
      opcoes: [{ valor: "act_123", nome: "Conta do negócio", moeda: "BRL" }],
    });
    const texto = textOf(arvore);

    expect(texto).toContain("Se um dia quiser investir");
    expect(texto).toContain("não gera nenhum gasto agora");
    expect(valoresOcultos(arvore)).toContain("act_123");
    expect(texto).not.toContain("act_123");
  });

  it("conta escolhida lembra que investir depende de aprovação", () => {
    const texto = textOf(
      comAds({ kind: "selecionada", conta: { nome: "Conta do negócio", moeda: "BRL" } }),
    );

    expect(texto).toContain("sem a sua aprovação");
  });
});

describe("MetaAssetsSection — desfechos e vocabulário", () => {
  const ESCOLHER: MetaAssetState = {
    kind: "escolher-instagram",
    organizationId: ORG,
    opcoes: [OPCAO],
  };

  it("id recusado explica que nada mudou e mantém as opções", () => {
    const texto = textOf(render(ESCOLHER, "nao-encontrado"));

    expect(texto).toContain("não está entre as que você liberou");
    expect(texto).toContain("Nada foi alterado");
    expect(texto).toContain("Usar esta conta");
  });

  it("permissão faltando no desfecho usa o mesmo vocabulário de ampliar", () => {
    expect(textOf(render(ESCOLHER, "sem-permissao"))).toContain(
      "Atualize a autorização",
    );
  });

  it("sucesso não deixa aviso de erro na tela", () => {
    const texto = textOf(render(ESCOLHER, "ok"));

    expect(texto).not.toContain("Nada foi alterado");
  });

  it("nenhum estado usa vocabulário de plataforma", () => {
    const PROIBIDO = [
      "token",
      "scope",
      "escopo",
      "graph",
      "api",
      "oauth",
      "instagram_basic",
      "ads_read",
      "act_",
    ];

    const estados: MetaAssetState[] = [
      ESCOLHER,
      { kind: "sem-pagina", organizationId: ORG },
      { kind: "sem-instagram-vinculado", organizationId: ORG },
      { kind: "permissao-faltando", organizationId: ORG },
      { kind: "conexao-recusada", organizationId: ORG },
      { kind: "indisponivel", organizationId: ORG },
      {
        kind: "instagram-selecionado",
        organizationId: ORG,
        instagram: { username: "quoron", nome: "Quoron", selecionadoEm: null },
        ads: { kind: "escolher", opcoes: [{ valor: "act_123", nome: "Conta", moeda: "BRL" }] },
      },
    ];

    for (const estado of estados) {
      const texto = textOf(render(estado)).toLowerCase();
      for (const termo of PROIBIDO) {
        expect(texto).not.toContain(termo);
      }
    }
  });
});
