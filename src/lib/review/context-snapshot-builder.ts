import type { AccountBusinessState } from "@/lib/business/account";
import {
  DESTINATION_LABELS,
  OBJECTIVE_LABELS,
  SUCCESS_EVENT_LABELS,
  type GrowthObjective,
} from "@/lib/growth/objectives";
import type { BusinessOffer } from "@/lib/offers/offers";
import { OFFER_TYPE_LABELS, descreverPreco } from "@/lib/offers/offers";

import type { DeclaredContextSnapshot } from "./snapshot";

/**
 * Monta o snapshot do contexto declarado (Rodada 004E §5.1).
 *
 * Puro: recebe o estado já lido e devolve o snapshot. A regra de **o que** vai
 * para um provider externo não pode depender de IO — é justamente aqui que uma
 * consulta a mais transformaria "contexto mínimo" em dump de banco.
 *
 * O que sai daqui é o que o negócio declarou, traduzido para rótulos humanos.
 * Não sai: e-mail, id de usuário, credencial, dado de provider, campo vazio.
 * Ids internos aparecem apenas dentro das `ref`, que são âncoras de evidência e
 * nunca chegam à tela.
 */

/** Tópicos que o produto sabe existir e cuja ausência é informação. */
const TOPICOS_CONHECIDOS: readonly { chave: string; rotulo: string }[] = [
  { chave: "business.target_audience", rotulo: "Público que o negócio acredita atender" },
  { chave: "business.differentiators", rotulo: "Diferenciais do negócio" },
  { chave: "business.known_objections", rotulo: "Objeções conhecidas dos clientes" },
  { chave: "business.average_ticket", rotulo: "Ticket médio" },
  { chave: "business.commercial_goal", rotulo: "Meta comercial" },
];

export type SnapshotInput = {
  account: Extract<AccountBusinessState, { kind: "pronta" }>;
  objetivo: GrowthObjective;
  ofertas: BusinessOffer[];
};

export function montarSnapshotDeclarado({
  account,
  objetivo,
  ofertas,
}: SnapshotInput): DeclaredContextSnapshot {
  const facts: DeclaredContextSnapshot["facts"] = [];
  const declarados = new Set<string>();

  const adicionar = (ref: string, label: string, value: string | null) => {
    // Campo em branco não vira fato vazio: ausência é ausência, e será
    // reportada como tópico faltante.
    if (value === null || value.trim() === "") return;

    facts.push({ ref, label, value: value.trim().slice(0, 2000) });
    declarados.add(ref);
  };

  const { organization, profile } = account;

  adicionar("business.name", "Nome do negócio", organization.name);

  if (profile) {
    adicionar("business.segment", "Segmento", profile.segment);
    adicionar("business.location", "Cidade ou região de atendimento", profile.locationSummary);
    adicionar("business.target_audience", "Público que o negócio acredita atender", profile.targetAudience);
    adicionar("business.differentiators", "Diferenciais", profile.differentiators);
    adicionar("business.known_objections", "Objeções conhecidas", profile.knownObjections);
    adicionar("business.commercial_goal", "Meta comercial", profile.commercialGoal);

    // O ticket médio é monetário; vai como texto formatado, não como número
    // solto — "12500" sem moeda seria ambíguo para o modelo e para o leitor.
    if (profile.averageTicketMinor !== null) {
      adicionar(
        "business.average_ticket",
        "Ticket médio",
        formatarTicket(profile.averageTicketMinor, profile.currency),
      );
    }

    // O campo legado é declarado como legado: sem isso, o modelo poderia lê-lo
    // como uma oferta estruturada a mais e contá-la duas vezes.
    adicionar(
      "business.primary_offer_legacy",
      "Oferta principal informada no cadastro inicial (texto livre, anterior ao catálogo)",
      profile.primaryOffer,
    );
  }

  for (const oferta of ofertas) {
    const base = `offer:${oferta.id}`;

    adicionar(`${base}:name`, "Nome da oferta", oferta.name);
    adicionar(`${base}:type`, "Tipo da oferta", OFFER_TYPE_LABELS[oferta.offerType]);
    adicionar(`${base}:price`, "Como a oferta é cobrada", descreverPreco(oferta));
    adicionar(`${base}:description`, "Descrição da oferta", oferta.description);
    adicionar(`${base}:value_proposition`, "Por que um cliente escolheria esta oferta", oferta.valueProposition);
  }

  const objetivoBase = `objective:${objetivo.id}`;

  adicionar(
    `${objetivoBase}:objective`,
    "O que o negócio quer conseguir agora",
    objetivo.objectiveType === "OTHER" && objetivo.objectiveDetail
      ? objetivo.objectiveDetail
      : OBJECTIVE_LABELS[objetivo.objectiveType],
  );
  adicionar(
    `${objetivoBase}:destination`,
    "Para onde o negócio quer levar as pessoas",
    DESTINATION_LABELS[objetivo.destinationType],
  );
  adicionar(
    `${objetivoBase}:success_event`,
    "O que o negócio considera sucesso",
    objetivo.successEventType === "OTHER" && objetivo.successEventDetail
      ? objetivo.successEventDetail
      : SUCCESS_EVENT_LABELS[objetivo.successEventType],
  );

  if (objetivo.focusType === "BUSINESS") {
    adicionar(`${objetivoBase}:focus`, "O que está sendo priorizado agora", "O negócio como um todo");
  } else if (objetivo.focusType === "OFFER" && objetivo.focusOfferId) {
    const focada = ofertas.find((oferta) => oferta.id === objetivo.focusOfferId);

    adicionar(
      `${objetivoBase}:focus`,
      "O que está sendo priorizado agora",
      focada ? `A oferta "${focada.name}"` : "Uma oferta que não está mais na lista ativa",
    );
  }

  const missingTopics = TOPICOS_CONHECIDOS.filter(
    (topico) => !declarados.has(topico.chave),
  ).map((topico) => topico.rotulo);

  if (ofertas.length === 0) {
    missingTopics.push("Ofertas estruturadas do negócio");
  }

  return { snapshotVersion: "1", facts, missingTopics };
}

/**
 * Formata o ticket médio para o snapshot.
 *
 * Textual como em `money.ts`: converter para número e dividir por 100 traria
 * ponto flutuante a um caminho que só precisa produzir texto.
 */
function formatarTicket(amountMinor: number, currency: string): string {
  const digitos = String(Math.trunc(Math.abs(amountMinor))).padStart(3, "0");
  const inteiro = digitos.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  return `${currency} ${inteiro},${digitos.slice(-2)}`;
}
