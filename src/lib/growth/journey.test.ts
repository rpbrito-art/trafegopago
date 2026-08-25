import { describe, expect, it } from "vitest";

import type { OffersState } from "@/lib/offers/offer-catalog";
import type { BusinessOffer } from "@/lib/offers/offers";

import { decideJourneyStep, type JourneyInput } from "./journey";
import type { ObjectiveState } from "./objective-state";
import type { GrowthObjective } from "./objectives";

/**
 * Motor de condução — Rodada 004D §§8 e 19.
 *
 * A função de decisão é pura: estes testes provam a regra sem banco, sem
 * sessão e sem rede. Se algum dia ela precisar de um mock de Supabase para ser
 * testada, a separação entre coleta e julgamento terá se perdido.
 */

const ORG = "11111111-1111-1111-1111-111111111111";
const OFERTA_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const OFERTA_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

function oferta(id: string, name = "Corte de cabelo"): BusinessOffer {
  return {
    id,
    name,
    offerType: "SERVICE",
    description: null,
    valueProposition: null,
    priceMode: "QUOTE",
    priceMinMinor: null,
    priceMaxMinor: null,
    currency: "BRL",
    createdAt: "2026-08-25T12:00:00.000Z",
  };
}

function objetivo(extra: Partial<GrowthObjective> = {}): GrowthObjective {
  return {
    id: "22222222-2222-2222-2222-222222222222",
    objectiveType: "LEADS",
    objectiveDetail: null,
    destinationType: "WHATSAPP",
    successEventType: "CONVERSATION_STARTED",
    successEventDetail: null,
    focusType: null,
    focusOfferId: null,
    createdAt: "2026-08-25T12:00:00.000Z",
    ...extra,
  };
}

function definido(
  objetivoAtual = objetivo(),
  podeAlterar = true,
): ObjectiveState {
  return {
    kind: "definido",
    organizationId: ORG,
    objetivo: objetivoAtual,
    podeAlterar,
  };
}

function catalogo(
  ofertas: BusinessOffer[],
  podeGerenciar = true,
): OffersState {
  return {
    kind: "pronto",
    organizationId: ORG,
    podeGerenciar,
    ofertas,
    sugestaoLegada: null,
  };
}

function decidir(input: JourneyInput) {
  return decideJourneyStep(input);
}

describe("decideJourneyStep — contexto do negócio", () => {
  it("sem organização, o passo é cadastrar o negócio", () => {
    const passo = decidir({
      objetivo: { kind: "sem-organizacao" },
      ofertas: { kind: "sem-organizacao" },
    });

    expect(passo.kind).toBe("SEM_ORGANIZACAO");
    expect(passo.acao?.href).toBe("/conta");
  });

  it("negócio indisponível não finge ação de domínio disponível", () => {
    const passo = decidir({
      objetivo: { kind: "negocio-indisponivel" },
      ofertas: { kind: "negocio-indisponivel" },
    });

    expect(passo.kind).toBe("NEGOCIO_INDISPONIVEL");
    expect(passo.acao?.href).toBe("/conta");
    expect(passo.progresso).toBeNull();
  });

  /**
   * Nenhuma orientação baseada em dados de uma organização arbitrária: sem
   * contexto inequívoco não há passo a sugerir.
   */
  it("multi-organização falha fechado e não sugere ação", () => {
    const passo = decidir({
      objetivo: { kind: "multiplos-negocios", quantidade: 2 },
      ofertas: { kind: "multiplos-negocios", quantidade: 2 },
    });

    expect(passo.kind).toBe("MULTIPLAS_ORGANIZACOES");
    expect(passo.acao).toBeNull();
    expect(passo.progresso).toBeNull();
  });

  it("multi-organização vence mesmo se apenas uma das leituras a detectar", () => {
    const passo = decidir({
      objetivo: { kind: "multiplos-negocios", quantidade: 2 },
      ofertas: catalogo([oferta(OFERTA_A)]),
    });

    expect(passo.kind).toBe("MULTIPLAS_ORGANIZACOES");
  });

  it("erro técnico não vira estado vazio nem passo inventado", () => {
    const passo = decidir({
      objetivo: { kind: "erro-tecnico" },
      ofertas: catalogo([oferta(OFERTA_A)]),
    });

    expect(passo.kind).toBe("ERRO_TECNICO");
    expect(passo.acao).toBeNull();
  });

  it("erro na leitura de ofertas também é erro técnico", () => {
    const passo = decidir({
      objetivo: definido(),
      ofertas: { kind: "erro-tecnico" },
    });

    expect(passo.kind).toBe("ERRO_TECNICO");
  });
});

describe("decideJourneyStep — trilha da base inicial", () => {
  it("organização sem objetivo pede o objetivo", () => {
    const passo = decidir({
      objetivo: { kind: "sem-objetivo", organizationId: ORG, podeDefinir: true },
      ofertas: catalogo([]),
    });

    expect(passo.kind).toBe("DEFINIR_OBJETIVO");
    expect(passo.acao?.href).toBe("/objetivo");
    expect(passo.progresso).toEqual({ etapa: 2, total: 4 });
  });

  it("objetivo sem ofertas pede a oferta", () => {
    const passo = decidir({
      objetivo: definido(),
      ofertas: catalogo([]),
    });

    expect(passo.kind).toBe("ADICIONAR_OFERTA");
    expect(passo.acao?.href).toBe("/ofertas");
  });

  it("objetivo e ofertas sem foco pedem a escolha de prioridade", () => {
    const passo = decidir({
      objetivo: definido(),
      ofertas: catalogo([oferta(OFERTA_A), oferta(OFERTA_B, "Barba")]),
    });

    expect(passo.kind).toBe("ESCOLHER_FOCO");
    expect(passo.acao?.href).toBe("/foco");
  });

  it("foco no negócio como um todo completa a base", () => {
    const passo = decidir({
      objetivo: definido(objetivo({ focusType: "BUSINESS" })),
      ofertas: catalogo([oferta(OFERTA_A)]),
    });

    expect(passo.kind).toBe("BASE_ESTRATEGICA_PRONTA");
    expect(passo.progresso).toEqual({ etapa: 4, total: 4 });
  });

  /**
   * Rodada 004E §11: com a base pronta, o próximo passo passa a ser revisar o
   * contexto. A decisão é determinística — comparação de fingerprint feita
   * antes de chegar aqui —, e **nada nela chama IA**.
   */
  it("base pronta sem revisão atual orienta para a revisão", () => {
    const passo = decidir({
      objetivo: definido(objetivo({ focusType: "BUSINESS" })),
      ofertas: catalogo([oferta(OFERTA_A)]),
      revisaoAtual: false,
    });

    expect(passo.kind).toBe("REVISAR_CONTEXTO_DECLARADO");
    expect(passo.acao?.href).toBe("/revisao");
  });

  it("com revisão atual, o passo é ver a revisão", () => {
    const passo = decidir({
      objetivo: definido(objetivo({ focusType: "BUSINESS" })),
      ofertas: catalogo([oferta(OFERTA_A)]),
      revisaoAtual: true,
    });

    expect(passo.kind).toBe("CONTEXTO_DECLARADO_REVISADO");
    expect(passo.acao?.href).toBe("/revisao");
  });

  it("member não recebe ação de revisar, que geraria custo", () => {
    const passo = decidir({
      objetivo: definido(objetivo({ focusType: "BUSINESS" }), false),
      ofertas: catalogo([oferta(OFERTA_A)], false),
      revisaoAtual: false,
    });

    expect(passo.kind).toBe("REVISAR_CONTEXTO_DECLARADO");
    expect(passo.acao).toBeNull();
  });

  /**
   * Estado da revisão desconhecido — a leitura falhou. O motor não afirma que
   * falta revisar algo que talvez já esteja revisado.
   */
  it("sem informação sobre a revisão, para em base pronta", () => {
    const passo = decidir({
      objetivo: definido(objetivo({ focusType: "BUSINESS" })),
      ofertas: catalogo([oferta(OFERTA_A)]),
    });

    expect(passo.kind).toBe("BASE_ESTRATEGICA_PRONTA");
  });

  it("foco em oferta ativa completa a base", () => {
    const passo = decidir({
      objetivo: definido(
        objetivo({ focusType: "OFFER", focusOfferId: OFERTA_A }),
      ),
      ofertas: catalogo([oferta(OFERTA_A)]),
    });

    expect(passo.kind).toBe("BASE_ESTRATEGICA_PRONTA");
  });

  /**
   * A oferta priorizada foi arquivada. O foco antigo não é apagado nem
   * substituído sozinho — o motor apenas detecta e devolve a decisão ao
   * usuário (mandato §7).
   */
  it("foco em oferta arquivada pede nova escolha", () => {
    const passo = decidir({
      objetivo: definido(
        objetivo({ focusType: "OFFER", focusOfferId: OFERTA_A }),
      ),
      ofertas: catalogo([oferta(OFERTA_B, "Barba")]),
    });

    expect(passo.kind).toBe("REESCOLHER_FOCO");
    expect(passo.acao?.href).toBe("/foco");
  });
});

describe("decideJourneyStep — papel de quem está olhando", () => {
  it("member vê a orientação, mas não recebe ação que não pode executar", () => {
    const semObjetivo = decidir({
      objetivo: { kind: "sem-objetivo", organizationId: ORG, podeDefinir: false },
      ofertas: catalogo([], false),
    });

    expect(semObjetivo.kind).toBe("DEFINIR_OBJETIVO");
    expect(semObjetivo.acao).toBeNull();
    expect(semObjetivo.explicacao.length).toBeGreaterThan(0);

    const semOferta = decidir({
      objetivo: definido(objetivo(), false),
      ofertas: catalogo([], false),
    });

    expect(semOferta.kind).toBe("ADICIONAR_OFERTA");
    expect(semOferta.acao).toBeNull();

    const semFoco = decidir({
      objetivo: definido(objetivo(), false),
      ofertas: catalogo([oferta(OFERTA_A)], false),
    });

    expect(semFoco.kind).toBe("ESCOLHER_FOCO");
    expect(semFoco.acao).toBeNull();
  });
});

describe("decideJourneyStep — honestidade do conteúdo", () => {
  const TODOS: JourneyInput[] = [
    { objetivo: { kind: "sem-organizacao" }, ofertas: { kind: "sem-organizacao" } },
    { objetivo: { kind: "negocio-indisponivel" }, ofertas: { kind: "negocio-indisponivel" } },
    {
      objetivo: { kind: "multiplos-negocios", quantidade: 2 },
      ofertas: { kind: "multiplos-negocios", quantidade: 2 },
    },
    { objetivo: { kind: "erro-tecnico" }, ofertas: { kind: "erro-tecnico" } },
    {
      objetivo: { kind: "sem-objetivo", organizationId: ORG, podeDefinir: true },
      ofertas: catalogo([]),
    },
    { objetivo: definido(), ofertas: catalogo([]) },
    { objetivo: definido(), ofertas: catalogo([oferta(OFERTA_A)]) },
    {
      objetivo: definido(objetivo({ focusType: "OFFER", focusOfferId: OFERTA_A })),
      ofertas: catalogo([oferta(OFERTA_B, "Barba")]),
    },
    {
      objetivo: definido(objetivo({ focusType: "BUSINESS" })),
      ofertas: catalogo([oferta(OFERTA_A)]),
    },
    {
      objetivo: definido(objetivo({ focusType: "BUSINESS" })),
      ofertas: catalogo([oferta(OFERTA_A)]),
      revisaoAtual: false,
    },
    {
      objetivo: definido(objetivo({ focusType: "BUSINESS" })),
      ofertas: catalogo([oferta(OFERTA_A)]),
      revisaoAtual: true,
    },
  ];

  /** Nenhum enum, id ou termo de banco pode chegar ao usuário. */
  it("nenhum texto expõe vocabulário interno", () => {
    const proibidos = [
      "BUSINESS",
      "OFFER",
      "ACTIVE",
      "ARCHIVED",
      "focus_type",
      "growth_objectives",
      "business_offers",
      "organization_id",
      ORG,
      OFERTA_A,
      OFERTA_B,
    ];

    for (const entrada of TODOS) {
      const passo = decidir(entrada);
      const texto = [
        passo.titulo,
        passo.explicacao,
        passo.porqueImporta,
        passo.oQueMuda,
        passo.acao?.rotulo ?? "",
      ].join(" ");

      for (const termo of proibidos) {
        expect(texto).not.toContain(termo);
      }
    }
  });

  /**
   * Base pronta não pode fabricar um próximo passo de Meta ou de análise que o
   * produto ainda não entrega (mandato §§8.2 e 14).
   */
  it("base pronta não oferece integração bloqueada nem promete o que não existe", () => {
    const passo = decidir({
      objetivo: definido(objetivo({ focusType: "BUSINESS" })),
      ofertas: catalogo([oferta(OFERTA_A)]),
    });

    expect(passo.acao).toBeNull();

    const texto = [passo.titulo, passo.explicacao, passo.oQueMuda]
      .join(" ")
      .toLowerCase();

    for (const termo of ["instagram", "meta", "facebook", "anúncio", "campanha"]) {
      expect(texto).not.toContain(termo);
    }
  });

  it("todo passo explica por que importa e o que muda depois", () => {
    for (const entrada of TODOS) {
      const passo = decidir(entrada);

      expect(passo.titulo.length).toBeGreaterThan(0);
      expect(passo.porqueImporta.length).toBeGreaterThan(0);
      expect(passo.oQueMuda.length).toBeGreaterThan(0);
    }
  });

  /** Uma ação principal por passo — nunca duas competindo. */
  it("cada passo tem no máximo uma ação principal", () => {
    for (const entrada of TODOS) {
      const passo = decidir(entrada);
      expect(passo.acao === null || typeof passo.acao.href === "string").toBe(true);
    }
  });
});
