/**
 * Objetivo atual do negócio — vocabulário e tradução (Rodada 004B §6).
 *
 * Os `CHECK` da migration `20260825180000_create_growth_objectives.sql` são a
 * autoridade sobre os conjuntos fechados; aqui ficam os mesmos valores em
 * TypeScript, para que a divergência apareça no compilador em vez de virar
 * `23514` em produção.
 *
 * As chaves são **internas**. A UI mostra apenas os rótulos em português — um
 * usuário não deve encontrar `LEAD_CREATED` na tela, do mesmo modo que não deve
 * encontrar `campaign objective`, pixel ou ad set
 * (`GROWTH_INTELLIGENCE_CANONICAL.md` §2.1).
 */

export const OBJECTIVE_TYPES = [
  "SALES",
  "LEADS",
  "CONVERSATIONS",
  "BOOKINGS",
  "REGISTRATIONS",
  "STORE_VISITS",
  "AUDIENCE",
  "OTHER",
] as const;

export type ObjectiveType = (typeof OBJECTIVE_TYPES)[number];

export const DESTINATION_TYPES = [
  "WHATSAPP",
  "WEBSITE",
  "META_FORM",
  "APP",
  "PHYSICAL_STORE",
  "INSTAGRAM_PROFILE",
  "OTHER",
] as const;

export type DestinationType = (typeof DESTINATION_TYPES)[number];

export const SUCCESS_EVENT_TYPES = [
  "PURCHASE",
  "LEAD_CREATED",
  "CONVERSATION_STARTED",
  "QUOTE_REQUESTED",
  "BOOKING_CONFIRMED",
  "FORM_SUBMITTED",
  "ACCOUNT_CREATED",
  "STORE_VISIT",
  "PROFILE_ACTION",
  "OTHER",
] as const;

export type SuccessEventType = (typeof SUCCESS_EVENT_TYPES)[number];

export const OBJECTIVE_STATUSES = ["ACTIVE", "ARCHIVED"] as const;

export type ObjectiveStatus = (typeof OBJECTIVE_STATUSES)[number];

/**
 * O que o objetivo está priorizando agora (Rodada 004D §4).
 *
 * `BUSINESS` e `OFFER` são estados diferentes de uma mesma decisão; a ausência
 * de foco é um terceiro estado, representado por `null` e não por um valor da
 * taxonomia. Inventar um `NONE` faria "ainda não decidi" parecer uma escolha
 * estratégica registrada.
 */
export const FOCUS_TYPES = ["BUSINESS", "OFFER"] as const;

export type FocusType = (typeof FOCUS_TYPES)[number];

export function isFocusType(value: unknown): value is FocusType {
  return (FOCUS_TYPES as readonly unknown[]).includes(value);
}

// ---------------------------------------------------------------------------
// Tradução para linguagem de negócio
// ---------------------------------------------------------------------------

/** "O que você quer conseguir agora?" */
export const OBJECTIVE_LABELS: Record<ObjectiveType, string> = {
  SALES: "Vender mais",
  LEADS: "Gerar contatos interessados",
  CONVERSATIONS: "Iniciar conversas",
  BOOKINGS: "Receber agendamentos",
  REGISTRATIONS: "Receber cadastros",
  STORE_VISITS: "Levar gente até a loja",
  AUDIENCE: "Crescer audiência e relacionamento",
  OTHER: "Outro objetivo",
};

/** "Para onde você quer levar a pessoa?" */
export const DESTINATION_LABELS: Record<DestinationType, string> = {
  WHATSAPP: "WhatsApp",
  WEBSITE: "Meu site",
  META_FORM: "Formulário no próprio Instagram/Facebook",
  APP: "Meu aplicativo",
  PHYSICAL_STORE: "Minha loja física",
  INSTAGRAM_PROFILE: "Meu perfil no Instagram",
  OTHER: "Outro lugar",
};

/** "Qual ação significa sucesso?" */
export const SUCCESS_EVENT_LABELS: Record<SuccessEventType, string> = {
  PURCHASE: "A pessoa comprar",
  LEAD_CREATED: "A pessoa deixar o contato",
  CONVERSATION_STARTED: "A pessoa iniciar uma conversa",
  QUOTE_REQUESTED: "A pessoa pedir um orçamento",
  BOOKING_CONFIRMED: "A pessoa confirmar um agendamento",
  FORM_SUBMITTED: "A pessoa enviar o formulário",
  ACCOUNT_CREATED: "A pessoa criar uma conta",
  STORE_VISIT: "A pessoa visitar a loja",
  PROFILE_ACTION: "A pessoa seguir ou interagir com o perfil",
  OTHER: "Outra ação",
};

export function isObjectiveType(value: unknown): value is ObjectiveType {
  return (OBJECTIVE_TYPES as readonly unknown[]).includes(value);
}

export function isDestinationType(value: unknown): value is DestinationType {
  return (DESTINATION_TYPES as readonly unknown[]).includes(value);
}

export function isSuccessEventType(value: unknown): value is SuccessEventType {
  return (SUCCESS_EVENT_TYPES as readonly unknown[]).includes(value);
}

// ---------------------------------------------------------------------------
// Objetivo resolvido
// ---------------------------------------------------------------------------

export type GrowthObjective = {
  id: string;
  objectiveType: ObjectiveType;
  objectiveDetail: string | null;
  destinationType: DestinationType;
  successEventType: SuccessEventType;
  successEventDetail: string | null;
  /** `null` enquanto o usuário não confirmar o que priorizar. */
  focusType: FocusType | null;
  /** Identidade da oferta priorizada; nunca uma versão de oferta. */
  focusOfferId: string | null;
  createdAt: string;
};

/**
 * Como o objetivo é apresentado.
 *
 * `OTHER` mostra o que a pessoa escreveu, não o rótulo genérico: é justamente
 * quando ela escolheu "outro" que o texto dela é a única descrição fiel.
 */
export function descreverObjetivo(objetivo: GrowthObjective): {
  objetivo: string;
  destino: string;
  sucesso: string;
} {
  return {
    objetivo:
      objetivo.objectiveType === "OTHER" && objetivo.objectiveDetail
        ? objetivo.objectiveDetail
        : OBJECTIVE_LABELS[objetivo.objectiveType],
    destino: DESTINATION_LABELS[objetivo.destinationType],
    sucesso:
      objetivo.successEventType === "OTHER" && objetivo.successEventDetail
        ? objetivo.successEventDetail
        : SUCCESS_EVENT_LABELS[objetivo.successEventType],
  };
}

/**
 * O que o produto pode afirmar sobre medição — hoje, nada.
 *
 * Registrar o resultado desejado não é o mesmo que conseguir observá-lo
 * (mandato 004B §9). Enquanto conectores e eventos não provarem
 * observabilidade, a tela diz isso em voz alta em vez de sugerir uma
 * capacidade de mensuração que ainda não existe.
 */
export const AVISO_DE_MENSURACAO =
  "Este é o resultado que você quer alcançar. O Quoron vai indicar até onde consegue medi-lo conforme suas conexões forem configuradas.";
