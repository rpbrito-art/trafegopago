"use server";

import { redirect } from "next/navigation";

import { ROUTES } from "@/lib/auth/routes";
import { requireUser } from "@/lib/auth/session";
import { DEFAULT_CURRENCY, DEFAULT_TIMEZONE } from "@/lib/business/money";
import {
  createInitialBusinessSchema,
  toBusinessFieldErrors,
  type BusinessFieldErrors,
} from "@/lib/business/schemas";
import { createSupabasePrivilegedClient } from "@/lib/supabase/privileged";

/** SQLSTATE levantado pela função quando o usuário já tem membership. */
const ALREADY_BOOTSTRAPPED = "P0001";

const GENERIC_ERROR =
  "Não foi possível criar seu negócio agora. Tente novamente em instantes.";

export type BusinessFormState = {
  errors?: BusinessFieldErrors;
  message?: string;
  /** Valores digitados, devolvidos para repopular o formulário. */
  values?: Record<string, string>;
};

/**
 * Cria a organização inicial, a membership `owner` e o perfil de negócio.
 *
 * Esta é a primeira mutação privilegiada do produto, e por isso o desenho é
 * deliberadamente estreito. Três coisas nunca atravessam a fronteira do
 * browser: identidade, papel e tenant.
 *
 * - a identidade vem de `requireUser()`, que verifica o JWT server-side;
 * - `owner`/`ACTIVE` são literais dentro da função SQL;
 * - `organization_id` é gerado pelo banco, não escolhido pelo cliente.
 *
 * O `FormData` é lido campo a campo, com nomes fixos. Um campo extra que o
 * atacante inclua no POST — `user_id`, `role`, `organization_id` — não tem
 * caminho até o SQL: não é lido aqui, não existe no schema Zod e não é
 * parâmetro da RPC.
 *
 * A action roda como POST na própria página e é alcançável sem passar pela UI
 * (guia oficial de Server Actions do Next: "treat every action as an untrusted
 * entry point"). Renderizar o formulário só para quem não tem organização não
 * é autorização — a verificação abaixo é.
 */
export async function createInitialBusinessAction(
  _prevState: BusinessFormState | undefined,
  formData: FormData,
): Promise<BusinessFormState> {
  const user = await requireUser();

  // Só os quatro campos essenciais são lidos. Um POST que carregue
  // `targetAudience` ou `averageTicket` não tem por onde chegar ao SQL: não é
  // lido aqui, não existe no schema e não é passado à RPC.
  const values = {
    organizationName: text(formData, "organizationName"),
    segment: text(formData, "segment"),
    locationSummary: text(formData, "locationSummary"),
    primaryOffer: text(formData, "primaryOffer"),
  };

  const parsed = createInitialBusinessSchema.safeParse(values);

  if (!parsed.success) {
    return { errors: toBusinessFieldErrors(parsed.error), values };
  }

  const input = parsed.data;
  const supabase = createSupabasePrivilegedClient();

  // Pré-checagem: quem já tem membership não passa pelo onboarding inicial.
  //
  // Ela existe pela resposta, não pela garantia. A garantia é o advisory lock
  // dentro da função SQL — esta leitura acontece em outra transação e, sozinha,
  // perderia a corrida contra uma segunda submissão. Serve para responder
  // "você já tem um negócio" sem gastar uma tentativa de escrita.
  const { data: existing, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1);

  if (membershipError) return { message: GENERIC_ERROR, values };
  if ((existing ?? []).length > 0) redirect(ROUTES.account);

  const { error } = await supabase.rpc(
    "bootstrap_organization_business_profile",
    {
      p_user_id: user.id,
      p_organization_name: input.organizationName,
      p_segment: input.segment,
      p_location_summary: input.locationSummary,
      p_primary_offer: input.primaryOffer,
      // Contexto progressivo nasce ausente, e ausência é `NULL` — não string
      // vazia, que o CHECK `..._not_blank` recusaria e que afirmaria um dado
      // que ninguém informou.
      p_target_audience: null,
      p_acquisition_goal: null,
      p_average_ticket_minor: null,
      p_differentiators: null,
      p_known_objections: null,
      p_commercial_goal_json: null,
      p_timezone: DEFAULT_TIMEZONE,
      p_currency: DEFAULT_CURRENCY,
    },
  );

  if (error) {
    // Dupla submissão que passou pela pré-checagem: a segunda chamada esperou
    // o lock, encontrou a membership recém-criada e foi recusada pelo banco.
    // Para o usuário isso não é erro — o negócio dele existe.
    if (error.code === ALREADY_BOOTSTRAPPED) redirect(ROUTES.account);

    // Nada do erro original chega à UI. Uma `PostgrestError` carrega `details`
    // e `hint` com fragmentos de SQL e valores enviados (`SECURITY_MODEL.md`
    // §15); a mensagem genérica é a única resposta segura.
    return { message: GENERIC_ERROR, values };
  }

  // Próximo passo do onboarding: definir o objetivo. Terminar em `/conta`
  // deixaria a pessoa numa tela de resumo sem dizer o que fazer agora
  // (mandato 004B §5.2).
  redirect(ROUTES.objective);
}

function text(formData: FormData, field: string): string {
  const value = formData.get(field);
  return typeof value === "string" ? value : "";
}
