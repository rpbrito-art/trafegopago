"use server";

import { redirect } from "next/navigation";

import { ROUTES } from "@/lib/auth/routes";
import { requireUser } from "@/lib/auth/session";
import { getAccountBusinessState } from "@/lib/business/account";
import { resolveOrganizationContext } from "@/lib/business/organization-context";
import { getObjectiveState } from "@/lib/growth/objective-state";
import { getOffersState } from "@/lib/offers/offer-catalog";
import { montarSnapshotDeclarado } from "@/lib/review/context-snapshot-builder";
import { revisarContextoDeclarado } from "@/lib/review/declared-context-review";
import { createSupabasePrivilegedClient } from "@/lib/supabase/privileged";

/**
 * Pede a revisão do contexto declarado.
 *
 * **Este é o único caminho que pode gastar dinheiro nesta rodada**, e só é
 * alcançado por clique explícito: nenhuma página chama o provider ao
 * renderizar (mandato §9.1).
 *
 * Identidade vem de `requireUser()`; tenant e papel vêm de
 * `resolveOrganizationContext()`, resolvido no servidor. O formulário não
 * envia nada além do gesto — não há id, papel ou organização a forjar.
 */

export type ReviewFormState = {
  message?: string;
};

/**
 * Mensagem neutra de propósito.
 *
 * A versão anterior prometia que nada havia sido cobrado quando a revisão não
 * ficava pronta. Isso não é verdade depois que a chamada alcança o provider:
 * grounding ou persistência podem falhar com a chamada já feita, e abortar do
 * lado do cliente não cancela necessariamente o processamento no serviço
 * (auditoria 004E §4). Afirmar gratuidade que não se pode garantir é pior do
 * que não dizer nada sobre custo.
 */
const ERRO_GENERICO =
  "Não foi possível concluir a revisão agora. Tente novamente em instantes.";

/**
 * Sem parâmetros de propósito.
 *
 * `useActionState` passa `(prevState, formData)`, e ignorá-los é a garantia
 * mais forte que esta action pode dar: **nada** vindo do formulário influencia
 * o que será revisado. Tenant, papel e contexto são todos resolvidos aqui.
 */
export async function requestContextReviewAction(): Promise<ReviewFormState> {
  const user = await requireUser();

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
        "Seu negócio não está disponível no momento. Verifique sua conta antes de pedir a revisão.",
    };
  }

  // Nenhuma chamada paga em contexto ambíguo: revisar o contexto de um negócio
  // que o usuário não escolheu gastaria dinheiro no tenant errado.
  if (contexto.kind === "multiplas-organizacoes") {
    return {
      message:
        "Sua conta participa de mais de um negócio. Ainda não é possível escolher qual deles será revisado.",
    };
  }

  // O snapshot é montado a partir do estado lido sob a sessão do usuário — as
  // mesmas leituras que a tela usa, e sob a mesma RLS.
  const [account, objetivoState, ofertasState] = await Promise.all([
    getAccountBusinessState(),
    getObjectiveState(),
    getOffersState(),
  ]);

  if (
    account.kind !== "pronta" ||
    objetivoState.kind !== "definido" ||
    ofertasState.kind !== "pronto" ||
    ofertasState.ofertas.length === 0 ||
    objetivoState.objetivo.focusType === null
  ) {
    return {
      message:
        "Complete seu negócio, objetivo, ofertas e prioridade antes de pedir a revisão.",
    };
  }

  const snapshot = montarSnapshotDeclarado({
    account,
    objetivo: objetivoState.objetivo,
    ofertas: ofertasState.ofertas,
  });

  const resultado = await revisarContextoDeclarado({
    organizationId: contexto.organizationId,
    userId: user.id,
    snapshot,
  });

  switch (resultado.kind) {
    case "cache":
    case "criada":
      redirect(ROUTES.review);

    case "sem-permissao":
      return {
        message:
          "Só quem administra o negócio pode pedir uma nova revisão. Você continua podendo ler a revisão existente.",
      };

    case "em-andamento":
      // Outra requisição já está revisando este mesmo contexto. Não é erro, e
      // recusar aqui é o que impede a segunda chamada paga.
      return {
        message:
          "Sua revisão já está sendo preparada. Atualize a página em instantes.",
      };

    case "limite-atingido":
      return {
        message:
          "Você já pediu várias revisões na última hora. Aguarde um pouco antes de pedir outra.",
      };

    case "revisao-invalida":
      // O provider respondeu, mas a resposta citou evidência que não existe no
      // contexto enviado. Exibir isso seria apresentar invenção como leitura do
      // negócio. Nada aqui afirma ausência de custo.
      return {
        message:
          "A revisão não passou na nossa verificação de qualidade e foi descartada. Tente novamente em instantes.",
      };

    case "erro-tecnico":
      return { message: ERRO_GENERICO };
  }
}
