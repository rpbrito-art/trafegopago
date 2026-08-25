"use server";

import { redirect } from "next/navigation";

import { ROUTES } from "@/lib/auth/routes";
import { requireUser } from "@/lib/auth/session";
import { resolveOrganizationContext } from "@/lib/business/organization-context";
import {
  offerFormSchema,
  toOfferFieldErrors,
  type OfferFieldErrors,
} from "@/lib/offers/schemas";
import { createSupabasePrivilegedClient } from "@/lib/supabase/privileged";

/** SQLSTATE levantado pelas RPCs quando o papel ou o tenant não autorizam. */
const NAO_AUTORIZADO = "42501";

/** SQLSTATE de oferta arquivada que alguém tentou revisar. */
const ESTADO_INVALIDO = "55000";

const ERRO_GENERICO =
  "Não foi possível salvar sua oferta agora. Tente novamente em instantes.";

export type OfferFormState = {
  erros?: OfferFieldErrors;
  message?: string;
};

/**
 * Cria ou revisa uma oferta.
 *
 * Mesma disciplina de `setGrowthObjectiveAction`: identidade, papel e tenant
 * **não** atravessam a fronteira do browser.
 *
 * - a identidade vem de `requireUser()`, que verifica o JWT server-side;
 * - o papel é lido pela RPC, da tabela de membership, não do formulário;
 * - a organização é resolvida no servidor;
 * - a moeda é lida da organização pela RPC — o browser não escolhe moeda.
 *
 * `offerId` é a única exceção que vem do formulário, porque o usuário precisa
 * dizer qual oferta está editando. Ele não é confiado: a RPC só encontra a
 * oferta se ela pertencer à organização resolvida aqui, e um id de outra
 * empresa falha fechado com o mesmo erro de "não existe".
 *
 * A action é alcançável sem passar pela UI. Renderizar o formulário só para
 * owner/admin não é autorização — a verificação dentro da RPC é.
 */
export async function saveOfferAction(
  _prevState: OfferFormState | undefined,
  formData: FormData,
): Promise<OfferFormState> {
  const user = await requireUser();

  const parsed = offerFormSchema.safeParse({
    name: texto(formData, "name"),
    offerType: texto(formData, "offerType"),
    description: texto(formData, "description"),
    valueProposition: texto(formData, "valueProposition"),
    priceMode: texto(formData, "priceMode"),
    priceMin: texto(formData, "priceMin"),
    priceMax: texto(formData, "priceMax"),
  });

  if (!parsed.success) return { erros: toOfferFieldErrors(parsed.error) };

  const offerId = opcional(formData, "offerId");

  const contexto = await resolverContexto(user.id);

  if (!contexto.ok) return contexto.estado;

  const { supabase, organizationId } = contexto;

  const { error } = await supabase.rpc("save_business_offer", {
    p_user_id: user.id,
    p_organization_id: organizationId,
    p_name: parsed.data.name,
    p_offer_type: parsed.data.offerType,
    p_price_mode: parsed.data.priceMode,
    p_offer_id: offerId,
    p_description: parsed.data.description,
    p_value_proposition: parsed.data.valueProposition,
    p_price_min_minor: parsed.data.priceMin,
    p_price_max_minor: parsed.data.priceMax,
  });

  if (error) return { message: mensagemDeErro(error.code) };

  redirect(ROUTES.offers);
}

/**
 * Arquiva uma oferta.
 *
 * Operação separada e sem conteúdo: nenhum campo da oferta pode ser alterado
 * por este caminho. Repetir o arquivamento é idempotente na RPC — o usuário
 * que clicar duas vezes não recebe erro.
 */
export async function archiveOfferAction(
  _prevState: OfferFormState | undefined,
  formData: FormData,
): Promise<OfferFormState> {
  const user = await requireUser();

  const offerId = opcional(formData, "offerId");

  if (offerId === null) return { message: ERRO_GENERICO };

  const contexto = await resolverContexto(user.id);

  if (!contexto.ok) return contexto.estado;

  const { supabase, organizationId } = contexto;

  const { error } = await supabase.rpc("archive_business_offer", {
    p_user_id: user.id,
    p_organization_id: organizationId,
    p_offer_id: offerId,
  });

  if (error) return { message: mensagemDeErro(error.code) };

  redirect(ROUTES.offers);
}

type ContextoResolvido =
  | {
      ok: true;
      supabase: ReturnType<typeof createSupabasePrivilegedClient>;
      organizationId: string;
    }
  | { ok: false; estado: OfferFormState };

/**
 * Resolve tenant e cliente privilegiado, ou devolve o estado que a UI mostra.
 *
 * Falha fechado: em conta com mais de um negócio, ou com o negócio
 * indisponível, nenhuma RPC é chamada (auditoria 004B §6.1).
 */
async function resolverContexto(userId: string): Promise<ContextoResolvido> {
  const supabase = createSupabasePrivilegedClient();

  const contexto = await resolveOrganizationContext({ supabase, userId });

  if (contexto.kind === "erro-tecnico") {
    return { ok: false, estado: { message: ERRO_GENERICO } };
  }

  // Sem organização não há oferta a cadastrar; o próximo passo é criar o
  // negócio.
  if (contexto.kind === "sem-organizacao") redirect(ROUTES.account);

  if (contexto.kind === "organizacao-indisponivel") {
    return {
      ok: false,
      estado: {
        message:
          "Seu negócio não está disponível no momento. Verifique sua conta antes de cadastrar ofertas.",
      },
    };
  }

  // Nenhuma mutação em contexto ambíguo. A mensagem não revela id, papel nem
  // nome de organização — só diz o que está acontecendo.
  if (contexto.kind === "multiplas-organizacoes") {
    return {
      ok: false,
      estado: {
        message:
          "Sua conta participa de mais de um negócio. Ainda não é possível escolher qual deles recebe a oferta.",
      },
    };
  }

  return { ok: true, supabase, organizationId: contexto.organizationId };
}

/**
 * Nada do erro original chega à UI: `PostgrestError` carrega `details` e `hint`
 * com fragmentos de SQL e valores enviados (`SECURITY_MODEL.md` §15).
 */
function mensagemDeErro(code: string | undefined): string {
  if (code === NAO_AUTORIZADO) {
    return "Só quem administra o negócio pode manter as ofertas. Peça a quem criou a conta.";
  }

  if (code === ESTADO_INVALIDO) {
    return "Esta oferta está arquivada e não pode ser alterada. Cadastre uma nova oferta.";
  }

  return ERRO_GENERICO;
}

function texto(formData: FormData, campo: string): string {
  const valor = formData.get(campo);
  return typeof valor === "string" ? valor.trim() : "";
}

function opcional(formData: FormData, campo: string): string | null {
  const valor = texto(formData, campo);
  return valor === "" ? null : valor;
}
