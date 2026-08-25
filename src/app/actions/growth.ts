"use server";

import { redirect } from "next/navigation";

import { ROUTES } from "@/lib/auth/routes";
import { requireUser } from "@/lib/auth/session";
import { resolveOrganizationContext } from "@/lib/business/organization-context";
import {
  isDestinationType,
  isObjectiveType,
  isSuccessEventType,
} from "@/lib/growth/objectives";
import { createSupabasePrivilegedClient } from "@/lib/supabase/privileged";

/** SQLSTATE levantado pela RPC quando o papel não autoriza a alteração. */
const NAO_AUTORIZADO = "42501";

const ERRO_GENERICO =
  "Não foi possível salvar seu objetivo agora. Tente novamente em instantes.";

export type ObjectiveFormState = {
  erros?: Partial<
    Record<"objetivo" | "destino" | "sucesso" | "detalhe", string>
  >;
  message?: string;
};

const MAX_DETALHE = 280;

/**
 * Define o objetivo atual do negócio.
 *
 * Mesma disciplina do bootstrap da 001E: identidade, papel e tenant **não**
 * atravessam a fronteira do browser.
 *
 * - a identidade vem de `requireUser()`, que verifica o JWT server-side;
 * - o papel é lido pela RPC, da tabela de membership, não do formulário;
 * - a organização é resolvida no servidor, nunca de um campo do POST. Aceitar
 *   `organizationId` do cliente seria entregar a chave do tenant a quem envia o
 *   formulário.
 *
 * E a resolução **falha fechada**: em conta com mais de um negócio, ou com o
 * negócio indisponível, a RPC não é chamada. Escolher com `.limit(1)` gravaria
 * o objetivo num negócio que o usuário não selecionou (auditoria 004B §6.1).
 *
 * A action é alcançável sem passar pela UI. Renderizar o formulário só para
 * owner/admin não é autorização — a verificação dentro da RPC é.
 */
export async function setGrowthObjectiveAction(
  _prevState: ObjectiveFormState | undefined,
  formData: FormData,
): Promise<ObjectiveFormState> {
  const user = await requireUser();

  const objetivo = texto(formData, "objectiveType");
  const destino = texto(formData, "destinationType");
  const sucesso = texto(formData, "successEventType");
  const detalheObjetivo = opcional(formData, "objectiveDetail");
  const detalheSucesso = opcional(formData, "successEventDetail");

  const erros: ObjectiveFormState["erros"] = {};

  // Taxonomia desconhecida é recusada antes de qualquer ida ao banco: o CHECK
  // pegaria depois, mas devolveria erro de constraint em vez de instrução.
  if (!isObjectiveType(objetivo)) erros.objetivo = "Escolha o que quer conseguir agora.";
  if (!isDestinationType(destino)) erros.destino = "Escolha para onde quer levar a pessoa.";
  if (!isSuccessEventType(sucesso)) erros.sucesso = "Escolha o que significa sucesso.";

  // Quem escolhe "Outro" precisa dizer qual — sem isso o objetivo não descreve
  // nada e nenhuma recomendação futura poderia se apoiar nele.
  if (objetivo === "OTHER" && !detalheObjetivo) {
    erros.detalhe = "Conte em poucas palavras qual é o seu objetivo.";
  }
  if (sucesso === "OTHER" && !detalheSucesso) {
    erros.detalhe = "Conte em poucas palavras o que significa sucesso para você.";
  }

  for (const detalhe of [detalheObjetivo, detalheSucesso]) {
    if (detalhe && detalhe.length > MAX_DETALHE) {
      erros.detalhe = `Use no máximo ${MAX_DETALHE} caracteres.`;
    }
  }

  if (Object.keys(erros).length > 0) return { erros };

  const supabase = createSupabasePrivilegedClient();

  const contexto = await resolveOrganizationContext({
    supabase,
    userId: user.id,
  });

  if (contexto.kind === "erro-tecnico") return { message: ERRO_GENERICO };

  // Sem organização não há objetivo a definir; o próximo passo é criar o
  // negócio.
  if (contexto.kind === "sem-organizacao") redirect(ROUTES.account);

  if (contexto.kind === "organizacao-indisponivel") {
    return {
      message:
        "Seu negócio não está disponível no momento. Verifique sua conta antes de definir o objetivo.",
    };
  }

  // Nenhuma mutação em contexto ambíguo. A mensagem não revela id, papel nem
  // nome de organização — só diz o que está acontecendo.
  if (contexto.kind === "multiplas-organizacoes") {
    return {
      message:
        "Sua conta participa de mais de um negócio. Ainda não é possível escolher qual deles receberá o objetivo.",
    };
  }

  const organizationId = contexto.organizationId;

  const { error } = await supabase.rpc("set_active_growth_objective", {
    p_user_id: user.id,
    p_organization_id: organizationId,
    p_objective_type: objetivo,
    p_destination_type: destino,
    p_success_event_type: sucesso,
    p_objective_detail: detalheObjetivo,
    p_success_event_detail: detalheSucesso,
  });

  if (error) {
    if (error.code === NAO_AUTORIZADO) {
      return {
        message:
          "Só quem administra o negócio pode alterar o objetivo. Peça a quem criou a conta.",
      };
    }

    // Nada do erro original chega à UI: `PostgrestError` carrega `details` e
    // `hint` com fragmentos de SQL e valores enviados (`SECURITY_MODEL.md` §15).
    return { message: ERRO_GENERICO };
  }

  redirect(ROUTES.objective);
}

function texto(formData: FormData, campo: string): string {
  const valor = formData.get(campo);
  return typeof valor === "string" ? valor.trim() : "";
}

function opcional(formData: FormData, campo: string): string | null {
  const valor = texto(formData, campo);
  // Campo em branco é ausência, não string vazia — o CHECK `..._not_blank` da
  // tabela recusaria `''`.
  return valor === "" ? null : valor;
}
