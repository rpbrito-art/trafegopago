import { describe, expect, it } from "vitest";

import {
  AVISO_DE_MENSURACAO,
  DESTINATION_LABELS,
  DESTINATION_TYPES,
  OBJECTIVE_LABELS,
  OBJECTIVE_TYPES,
  SUCCESS_EVENT_LABELS,
  SUCCESS_EVENT_TYPES,
  descreverObjetivo,
  isDestinationType,
  isObjectiveType,
  isSuccessEventType,
  type GrowthObjective,
} from "./objectives";

/**
 * Taxonomias e tradução — Rodada 004B §6.
 *
 * O que se prova aqui: as chaves internas nunca chegam à tela, e o produto não
 * afirma medir o que ainda não mede.
 */

const BASE: GrowthObjective = {
  id: "11111111-1111-1111-1111-111111111111",
  objectiveType: "LEADS",
  objectiveDetail: null,
  destinationType: "WHATSAPP",
  successEventType: "CONVERSATION_STARTED",
  focusType: null,
  focusOfferId: null,
  successEventDetail: null,
  createdAt: "2026-08-25T12:00:00.000Z",
};

describe("taxonomias", () => {
  it("toda chave tem rótulo em português", () => {
    // Um rótulo faltando renderizaria `undefined` na tela.
    for (const chave of OBJECTIVE_TYPES) {
      expect(OBJECTIVE_LABELS[chave], chave).toBeTruthy();
    }
    for (const chave of DESTINATION_TYPES) {
      expect(DESTINATION_LABELS[chave], chave).toBeTruthy();
    }
    for (const chave of SUCCESS_EVENT_TYPES) {
      expect(SUCCESS_EVENT_LABELS[chave], chave).toBeTruthy();
    }
  });

  it("nenhum rótulo usa termo de plataforma publicitária", () => {
    // Quem opera o produto não precisa aprender o vocabulário do Ads Manager.
    const proibidos =
      /\b(pixel|ad ?set|placement|campaign|conversion|CPA|ROAS|lookalike|remarketing)\b/i;

    for (const rotulo of [
      ...Object.values(OBJECTIVE_LABELS),
      ...Object.values(DESTINATION_LABELS),
      ...Object.values(SUCCESS_EVENT_LABELS),
    ]) {
      expect(rotulo).not.toMatch(proibidos);
    }
  });

  it("nenhum rótulo repete a chave interna", () => {
    for (const chave of OBJECTIVE_TYPES) {
      expect(OBJECTIVE_LABELS[chave]).not.toBe(chave);
    }
  });

  it("taxonomia desconhecida é recusada", () => {
    expect(isObjectiveType("VENDER")).toBe(false);
    expect(isDestinationType("TELEGRAM")).toBe(false);
    expect(isSuccessEventType("CLIQUE")).toBe(false);

    expect(isObjectiveType("SALES")).toBe(true);
    expect(isDestinationType("WHATSAPP")).toBe(true);
    expect(isSuccessEventType("PURCHASE")).toBe(true);
  });
});

describe("descrição em linguagem de negócio", () => {
  it("traduz as três respostas", () => {
    const descrito = descreverObjetivo(BASE);

    expect(descrito.objetivo).toBe("Gerar contatos interessados");
    expect(descrito.destino).toBe("WhatsApp");
    expect(descrito.sucesso).toBe("A pessoa iniciar uma conversa");
  });

  it("não vaza chave interna nem UUID", () => {
    const descrito = descreverObjetivo(BASE);
    const tudo = Object.values(descrito).join(" ");

    expect(tudo).not.toContain("LEADS");
    expect(tudo).not.toContain("WHATSAPP");
    expect(tudo).not.toContain("CONVERSATION_STARTED");
    expect(tudo).not.toContain(BASE.id);
  });

  it("em “Outro”, mostra o que a pessoa escreveu", () => {
    // É justamente quando ela escolheu "outro" que o texto dela é a única
    // descrição fiel.
    const descrito = descreverObjetivo({
      ...BASE,
      objectiveType: "OTHER",
      objectiveDetail: "Reativar clientes antigos",
      successEventType: "OTHER",
      successEventDetail: "Responder a pesquisa",
    });

    expect(descrito.objetivo).toBe("Reativar clientes antigos");
    expect(descrito.sucesso).toBe("Responder a pesquisa");
  });

  it("“Outro” sem detalhe cai no rótulo genérico em vez de vazio", () => {
    const descrito = descreverObjetivo({ ...BASE, objectiveType: "OTHER" });

    expect(descrito.objetivo).toBe("Outro objetivo");
  });
});

describe("aviso de mensuração", () => {
  it("não afirma que o produto já mede o resultado", () => {
    // Registrar o resultado desejado não é o mesmo que conseguir observá-lo.
    expect(AVISO_DE_MENSURACAO).toContain("conforme suas conexões");
    expect(AVISO_DE_MENSURACAO).not.toMatch(/\bmedimos\b|\bestamos medindo\b/i);
  });

  it("usa o nome canônico do produto", () => {
    expect(AVISO_DE_MENSURACAO).toContain("Quoron");
    expect(AVISO_DE_MENSURACAO).not.toContain("Tráfego Pago");
  });
});
