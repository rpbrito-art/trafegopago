import { beforeEach, describe, expect, it, vi } from "vitest";

type Row = Record<string, unknown>;

let memberships: Row[] = [];
let organization: Row | null = null;
let profile: Row | null = null;

const selectedTables: string[] = [];

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    from(table: string) {
      selectedTables.push(table);

      if (table === "organization_members") {
        return { select: async () => ({ data: memberships, error: null }) };
      }

      const row = table === "organizations" ? organization : profile;

      return {
        select: () => ({
          eq: () => ({ maybeSingle: async () => ({ data: row, error: null }) }),
        }),
      };
    },
  }),
}));

const { getAccountBusinessState } = await import("./account");

const ORG_ID = "22222222-2222-2222-2222-222222222222";

const ORGANIZACAO: Row = {
  id: ORG_ID,
  name: "Clínica Exemplo",
  status: "ACTIVE",
  timezone: "America/Sao_Paulo",
  default_currency: "BRL",
};

const PERFIL: Row = {
  segment: "Odontologia",
  location_summary: "Campinas, SP",
  primary_offer: "Implantes",
  average_ticket_minor: 125_000,
  currency: "BRL",
  target_audience: "Adultos de 30 a 55 anos",
  differentiators: null,
  known_objections: null,
  acquisition_goal: "Agendar 40 avaliações por mês",
  commercial_goal_json: { summary: "Dobrar o faturamento" },
};

beforeEach(() => {
  memberships = [];
  organization = null;
  profile = null;
  selectedTables.length = 0;
});

describe("getAccountBusinessState", () => {
  it("reporta ausência de organização quando não há membership", async () => {
    expect(await getAccountBusinessState()).toEqual({ kind: "sem-organizacao" });
  });

  it("não escolhe tenant quando há mais de uma membership", async () => {
    memberships = [
      { organization_id: ORG_ID, role: "owner", status: "ACTIVE" },
      { organization_id: "outra", role: "member", status: "ACTIVE" },
    ];

    expect(await getAccountBusinessState()).toEqual({
      kind: "multiplas-organizacoes",
      membershipCount: 2,
    });
  });

  it("reporta indisponibilidade quando a RLS não devolve a organização", async () => {
    memberships = [
      { organization_id: ORG_ID, role: "owner", status: "INACTIVE" },
    ];
    organization = null;

    expect(await getAccountBusinessState()).toEqual({
      kind: "organizacao-indisponivel",
    });
  });

  it("monta o resumo a partir das linhas visíveis", async () => {
    memberships = [{ organization_id: ORG_ID, role: "owner", status: "ACTIVE" }];
    organization = ORGANIZACAO;
    profile = PERFIL;

    const state = await getAccountBusinessState();

    expect(state.kind).toBe("pronta");
    if (state.kind !== "pronta") return;

    expect(state.organization.name).toBe("Clínica Exemplo");
    expect(state.organization.defaultCurrency).toBe("BRL");
    expect(state.profile?.averageTicketMinor).toBe(125_000);
    expect(state.profile?.commercialGoal).toBe("Dobrar o faturamento");
    expect(state.profile?.differentiators).toBeNull();
  });

  it("tolera meta comercial sem a chave esperada", async () => {
    memberships = [{ organization_id: ORG_ID, role: "owner", status: "ACTIVE" }];
    organization = ORGANIZACAO;
    profile = { ...PERFIL, commercial_goal_json: { outro: 1 } };

    const state = await getAccountBusinessState();

    expect(state.kind).toBe("pronta");
    if (state.kind !== "pronta") return;
    expect(state.profile?.commercialGoal).toBeNull();
  });

  it("lê pelo caminho do usuário, sem cliente privilegiado", async () => {
    memberships = [{ organization_id: ORG_ID, role: "owner", status: "ACTIVE" }];
    organization = ORGANIZACAO;
    profile = PERFIL;

    await getAccountBusinessState();

    expect(selectedTables).toEqual([
      "organization_members",
      "organizations",
      "business_profiles",
    ]);
  });
});
