import type { ReactNode } from "react";

import { CreateBusinessForm } from "@/components/business/create-business-form";
import type {
  AccountBusinessState,
  BusinessProfileSummary,
} from "@/lib/business/account";
import { formatMinorAmount } from "@/lib/business/money";

/**
 * Os quatro estados do mandato 001E §9, cada um com seu próprio ramo.
 *
 * Nenhum `else` genérico: oferecer o formulário de criação a quem já tem
 * membership — ainda que a organização esteja indisponível — criaria um
 * segundo tenant para o mesmo usuário. O formulário aparece em exatamente um
 * ramo, e é o único em que `kind` vale `sem-organizacao`.
 */
export function BusinessSection({ state }: { state: AccountBusinessState }) {
  if (state.kind === "sem-organizacao") {
    return (
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">Crie seu negócio</h2>
          <p className="text-sm text-neutral-600">
            Estas informações orientam as recomendações e os testes de campanha.
            Você poderá revisá-las depois.
          </p>
        </div>
        <CreateBusinessForm />
      </section>
    );
  }

  if (state.kind === "organizacao-indisponivel") {
    return (
      <Notice title="Negócio indisponível">
        Sua conta está vinculada a um negócio que não está acessível no momento
        — ele pode estar inativo ou seu acesso pode ter sido suspenso. Fale com
        quem administra o negócio. Não é possível criar outro por aqui.
      </Notice>
    );
  }

  if (state.kind === "multiplas-organizacoes") {
    return (
      <Notice title="Mais de um negócio nesta conta">
        Sua conta participa de {state.membershipCount} negócios. A troca entre
        negócios ainda não está disponível nesta versão, então nada é
        selecionado automaticamente.
      </Notice>
    );
  }

  const { organization, profile } = state;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">{organization.name}</h2>
        <p className="text-sm text-neutral-600">
          {organization.timezone} · {organization.defaultCurrency}
        </p>
      </div>

      {profile ? (
        <ProfileSummary profile={profile} />
      ) : (
        <Notice title="Perfil do negócio ausente">
          O negócio existe, mas o perfil não foi encontrado. Nada será recriado
          automaticamente.
        </Notice>
      )}
    </section>
  );
}

function ProfileSummary({ profile }: { profile: BusinessProfileSummary }) {
  const rows: [string, string | null][] = [
    ["Segmento", profile.segment],
    ["Cidade ou região", profile.locationSummary],
    ["Oferta principal", profile.primaryOffer],
    [
      "Ticket médio",
      profile.averageTicketMinor === null
        ? null
        : formatMinorAmount(profile.averageTicketMinor, profile.currency),
    ],
    ["Público-alvo", profile.targetAudience],
    ["Diferenciais", profile.differentiators],
    ["Objeções conhecidas", profile.knownObjections],
    ["Objetivo de aquisição", profile.acquisitionGoal],
    ["Meta comercial", profile.commercialGoal],
  ];

  return (
    <dl className="flex flex-col gap-3 rounded border border-neutral-200 p-4 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="flex flex-col gap-0.5">
          <dt className="text-xs text-neutral-500">{label}</dt>
          <dd className={value ? "" : "text-neutral-400"}>
            {value ?? "Não informado"}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Notice({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section
      role="status"
      className="flex flex-col gap-1 rounded border border-amber-300 bg-amber-50 p-4"
    >
      <h2 className="text-sm font-semibold text-amber-900">{title}</h2>
      <p className="text-sm text-amber-900">{children}</p>
    </section>
  );
}
