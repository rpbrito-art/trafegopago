"use server";

import { redirect } from "next/navigation";

import { ROUTES } from "@/lib/auth/routes";
import { requireUser } from "@/lib/auth/session";
import { resolveOrganizationContext } from "@/lib/business/organization-context";
import { isFocusType } from "@/lib/growth/objectives";
import { createSupabasePrivilegedClient } from "@/lib/supabase/privileged";

/** SQLSTATE levantado pela RPC quando papel ou tenant não autorizam. */
const NAO_AUTORIZADO = "42501";

/** SQLSTATE de oferta arquivada escolhida como foco. */
const ESTADO_INVALIDO = "55000";

const ERRO_GENERICO =
  "Não foi possível salvar sua escolha agora. Tente novamente em instantes.";

export type FocusFormState = {
  erro?: string;
  message?: string;
};

/**
 * Define o que o negócio está priorizando agora.
 *
 * Mesma disciplina das demais escritas de domínio: identidade, papel e tenant
 * **não** atravessam a fronteira do browser.
 *
 * - a identidade vem de `requireUser()`, que verifica o JWT server-side;
 * - o papel é lido pela RPC, da tabela de membership;
 * - a organização é resolvida no servidor, e falha fechado em conta com mais
 *   de um negócio;
 * - `objectiveId` e `offerId` vêm do formulário e **não são confiados**: a RPC
 *   só os encontra dentro da organização resolvida aqui, e um id de outra
 *   empresa falha com o mesmo erro de "não existe".
 *
 * A action é alcançável sem passar pela UI. Renderizar o formulário só para
 * owner/admin não é autorização — a verificação dentro da RPC é.
 */
export async function setObjectiveFocusAction(
  _prevState: FocusFormState | undefined,
  formData: FormData,
): Promise<FocusFormState> {
  const user = await requireUser();

  const escolha = texto(formData, "focus");
  const objectiveId = opcional(formData, "objectiveId");

  if (objectiveId === null) return { message: ERRO_GENERICO };

  // O formulário envia uma única resposta: `BUSINESS` ou o id da oferta
  // priorizada. Um campo só evita o estado impossível de "foco no negócio com
  // oferta selecionada" chegar ao banco.
  const focusType = escolha === "BUSINESS" ? "BUSINESS" : "OFFER";
  const focusOfferId = escolha === "BUSINESS" ? null : escolha;

  if (!isFocusType(focusType) || (focusType === "OFFER" && !focusOfferId)) {
    return { erro: "Escolha o que você quer priorizar agora." };
  }

  const supabase = createSupabasePrivilegedClient();

  const contexto = await resolveOrganizationContext({
    supabase,
    userId: user.id,
  });

  if (contexto.kind === "erro-tecnico") return { message: ERRO_GENERICO };

  if (contexto.kind === "sem-organizacao") redirect(ROUTES.account);

  if (contexto.kind === "organizacao-indisponivel") {
    return {
      message:
        "Seu negócio não está disponível no momento. Verifique sua conta antes de escolher o foco.",
    };
  }

  // Nenhuma mutação em contexto ambíguo. A mensagem não revela id, papel nem
  // nome de organização.
  if (contexto.kind === "multiplas-organizacoes") {
    return {
      message:
        "Sua conta participa de mais de um negócio. Ainda não é possível escolher qual deles recebe a prioridade.",
    };
  }

  const { error } = await supabase.rpc("set_growth_objective_focus", {
    p_user_id: user.id,
    p_organization_id: contexto.organizationId,
    p_objective_id: objectiveId,
    p_focus_type: focusType,
    p_focus_offer_id: focusOfferId,
  });

  if (error) {
    if (error.code === NAO_AUTORIZADO) {
      return {
        message:
          "Só quem administra o negócio pode alterar a prioridade. Peça a quem criou a conta.",
      };
    }

    if (error.code === ESTADO_INVALIDO) {
      return {
        message:
          "Essa oferta foi arquivada e não pode ser priorizada. Escolha outra opção.",
      };
    }

    // Nada do erro original chega à UI: `PostgrestError` carrega `details` e
    // `hint` com fragmentos de SQL e valores enviados (`SECURITY_MODEL.md` §15).
    return { message: ERRO_GENERICO };
  }

  // Volta para a entrada guiada: é lá que o motor deriva o próximo passo a
  // partir do estado novo.
  redirect(ROUTES.start);
}

function texto(formData: FormData, campo: string): string {
  const valor = formData.get(campo);
  return typeof valor === "string" ? valor.trim() : "";
}

function opcional(formData: FormData, campo: string): string | null {
  const valor = texto(formData, campo);
  return valor === "" ? null : valor;
}
