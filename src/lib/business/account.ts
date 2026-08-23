import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Leitura do estado de negócio da conta, pelo caminho do usuário.
 *
 * Usa o cliente com a sessão do visitante — nunca o privilegiado. A RLS é a
 * autorização: se uma linha chega aqui, é porque o usuário pode vê-la. Ler com
 * `service_role` e filtrar em TypeScript trocaria uma garantia do banco por
 * uma condição que qualquer refatoração futura pode apagar sem erro visível
 * (`SECURITY_MODEL.md` §4, §5).
 */

export type OrganizationSummary = {
  id: string;
  name: string;
  status: string;
  timezone: string;
  defaultCurrency: string;
};

export type BusinessProfileSummary = {
  segment: string;
  locationSummary: string;
  primaryOffer: string;
  averageTicketMinor: number | null;
  currency: string;
  targetAudience: string;
  differentiators: string | null;
  knownObjections: string | null;
  acquisitionGoal: string | null;
  commercialGoal: string | null;
};

/**
 * Estado da conta, com cada caso explícito.
 *
 * Os quatro primeiros vieram do mandato 001E §9; `erro-tecnico` entra na 001F.
 * Um único tipo-união em vez de campos opcionais: força a UI a tratar cada
 * caso, e impede que "sem organização" e "organização inativa" caiam no mesmo
 * `else` — que é justamente onde um novo tenant seria criado por engano.
 */
export type AccountBusinessState =
  | { kind: "sem-organizacao" }
  | { kind: "organizacao-indisponivel" }
  | { kind: "multiplas-organizacoes"; membershipCount: number }
  | { kind: "erro-tecnico" }
  | {
      kind: "pronta";
      organization: OrganizationSummary;
      profile: BusinessProfileSummary | null;
    };

export async function getAccountBusinessState(): Promise<AccountBusinessState> {
  const supabase = await createSupabaseServerClient();

  // A policy `organization_members_select_own` já restringe às próprias linhas;
  // o filtro por status NÃO é aplicado aqui de propósito. Uma membership
  // INACTIVE ainda é uma membership: contá-la é o que impede o onboarding de
  // oferecer "crie seu negócio" a quem foi desativado.
  const { data: memberships, error: membershipsError } = await supabase
    .from("organization_members")
    .select("organization_id, role, status");

  // Falha técnica vira estado próprio, não exceção e não lista vazia. Antes,
  // um erro de leitura subia como 500 e um erro nas leituras seguintes era
  // silenciosamente lido como "não existe" — os dois casos apagavam a
  // diferença entre "ainda não há negócio" e "não deu para saber". Dívida
  // registrada na auditoria da 001E.
  if (membershipsError) return { kind: "erro-tecnico" };

  const rows = memberships ?? [];

  if (rows.length === 0) return { kind: "sem-organizacao" };
  if (rows.length > 1) {
    return { kind: "multiplas-organizacoes", membershipCount: rows.length };
  }

  const membership = rows[0];

  // Duas leituras independentes, ambas sob RLS. A organização só aparece se
  // estiver ACTIVE e a membership própria também — é a policy da 001D que
  // decide, não este código.
  const [organizationResult, profileResult] = await Promise.all([
    supabase
      .from("organizations")
      .select("id, name, status, timezone, default_currency")
      .eq("id", membership.organization_id)
      .maybeSingle(),
    supabase
      .from("business_profiles")
      .select(
        "segment, location_summary, primary_offer, average_ticket_minor, currency, target_audience, differentiators, known_objections, acquisition_goal, commercial_goal_json",
      )
      .eq("organization_id", membership.organization_id)
      .maybeSingle(),
  ]);

  // `maybeSingle()` não trata ausência de linha como erro: o que chega aqui é
  // falha de verdade (rede, permissão, indisponibilidade) e não pode ser
  // confundida com "o negócio não existe".
  if (organizationResult.error || profileResult.error) {
    return { kind: "erro-tecnico" };
  }

  const organization = organizationResult.data;
  const profile = profileResult.data;

  // Membership existe, organização não chega: desativada, removida ou fora do
  // alcance da policy. Estado explícito — nunca oferecer novo bootstrap aqui.
  if (!organization) return { kind: "organizacao-indisponivel" };

  return {
    kind: "pronta",
    organization: {
      id: organization.id,
      name: organization.name,
      status: organization.status,
      timezone: organization.timezone,
      defaultCurrency: organization.default_currency,
    },
    profile: profile ? toProfileSummary(profile) : null,
  };
}

type ProfileRow = Record<string, unknown>;

function toProfileSummary(row: ProfileRow): BusinessProfileSummary {
  return {
    segment: asText(row.segment) ?? "",
    locationSummary: asText(row.location_summary) ?? "",
    primaryOffer: asText(row.primary_offer) ?? "",
    averageTicketMinor:
      typeof row.average_ticket_minor === "number"
        ? row.average_ticket_minor
        : null,
    currency: asText(row.currency) ?? "BRL",
    targetAudience: asText(row.target_audience) ?? "",
    differentiators: asText(row.differentiators),
    knownObjections: asText(row.known_objections),
    acquisitionGoal: asText(row.acquisition_goal),
    commercialGoal: readCommercialGoal(row.commercial_goal_json),
  };
}

function asText(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/**
 * O JSONB é gravado por esta aplicação, mas lido como dado externo: a coluna
 * aceita qualquer objeto, e uma linha antiga ou editada fora do fluxo não
 * precisa ter `summary`.
 */
function readCommercialGoal(value: unknown): string | null {
  if (typeof value !== "object" || value === null) return null;

  const summary = (value as Record<string, unknown>).summary;
  return typeof summary === "string" && summary.length > 0 ? summary : null;
}
