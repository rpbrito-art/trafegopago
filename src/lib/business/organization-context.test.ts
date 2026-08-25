import { describe, expect, it, vi } from "vitest";

import { resolveOrganizationContext } from "./organization-context";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Resolução de contexto de organização — Correção 004B-01 §3.
 *
 * O que se prova: **nenhum caminho escolhe um tenant implicitamente**. Zero,
 * uma indisponível e múltiplas memberships produzem estados distintos, e só o
 * contexto inequívoco devolve um `organizationId`.
 */

type Linha = { organization_id: string; role: string; status: string };

const ORG_A = "11111111-1111-1111-1111-111111111111";
const ORG_B = "22222222-2222-2222-2222-222222222222";

function supabaseFalso(input: {
  memberships?: Linha[];
  erroMemberships?: boolean;
  organizacao?: { id: string; status: string } | null;
  erroOrganizacao?: boolean;
}) {
  const filtros: { coluna: string; valor: unknown }[] = [];

  const cliente = {
    filtros,
    from(tabela: string) {
      if (tabela === "organization_members") {
        const builder = {
          select: () => builder,
          eq(coluna: string, valor: unknown) {
            filtros.push({ coluna, valor });
            return builder;
          },
          then(resolve: (r: unknown) => void) {
            resolve(
              input.erroMemberships
                ? { data: null, error: { code: "42501" } }
                : { data: input.memberships ?? [], error: null },
            );
          },
        };
        return builder;
      }

      const builder = {
        select: () => builder,
        eq: () => builder,
        async maybeSingle() {
          return input.erroOrganizacao
            ? { data: null, error: { code: "42501" } }
            : { data: input.organizacao ?? null, error: null };
        },
      };
      return builder;
    },
  };

  return cliente as unknown as SupabaseClient & { filtros: typeof filtros };
}

const ATIVA_A: Linha = { organization_id: ORG_A, role: "owner", status: "ACTIVE" };
const ATIVA_B: Linha = { organization_id: ORG_B, role: "admin", status: "ACTIVE" };

describe("contexto de organização", () => {
  it("zero memberships é ausência de negócio", async () => {
    const r = await resolveOrganizationContext({
      supabase: supabaseFalso({ memberships: [] }),
    });

    expect(r).toEqual({ kind: "sem-organizacao" });
  });

  it("uma membership ativa em organização ativa é contexto inequívoco", async () => {
    const r = await resolveOrganizationContext({
      supabase: supabaseFalso({
        memberships: [ATIVA_A],
        organizacao: { id: ORG_A, status: "ACTIVE" },
      }),
    });

    expect(r).toEqual({ kind: "unica", organizationId: ORG_A, role: "owner" });
  });

  it("membership inativa não vira “crie outro negócio”", async () => {
    // Oferecer bootstrap a quem foi desativado criaria um segundo tenant por
    // engano.
    const r = await resolveOrganizationContext({
      supabase: supabaseFalso({
        memberships: [{ ...ATIVA_A, status: "INACTIVE" }],
      }),
    });

    expect(r).toEqual({ kind: "organizacao-indisponivel" });
  });

  it("organização que não chega é indisponível, não ausente", async () => {
    const r = await resolveOrganizationContext({
      supabase: supabaseFalso({ memberships: [ATIVA_A], organizacao: null }),
    });

    expect(r).toEqual({ kind: "organizacao-indisponivel" });
  });

  it("organização inativa é indisponível", async () => {
    const r = await resolveOrganizationContext({
      supabase: supabaseFalso({
        memberships: [ATIVA_A],
        organizacao: { id: ORG_A, status: "INACTIVE" },
      }),
    });

    expect(r).toEqual({ kind: "organizacao-indisponivel" });
  });

  it("duas memberships nunca devolvem um organizationId", async () => {
    // É este o ponto: `memberships[0]` escolheria um tenant pela ordem do
    // banco.
    const r = await resolveOrganizationContext({
      supabase: supabaseFalso({ memberships: [ATIVA_A, ATIVA_B] }),
    });

    expect(r).toEqual({ kind: "multiplas-organizacoes", membershipCount: 2 });
    expect(r).not.toHaveProperty("organizationId");
  });

  it("membership inativa ainda conta para detectar múltiplos negócios", async () => {
    // Ignorá-la transformaria uma conta multi-negócio em "um negócio só"
    // conforme o status mudasse.
    const r = await resolveOrganizationContext({
      supabase: supabaseFalso({
        memberships: [ATIVA_A, { ...ATIVA_B, status: "INACTIVE" }],
      }),
    });

    expect(r.kind).toBe("multiplas-organizacoes");
  });

  it("falha de leitura vira erro técnico, não ausência", async () => {
    const r = await resolveOrganizationContext({
      supabase: supabaseFalso({ erroMemberships: true }),
    });

    expect(r).toEqual({ kind: "erro-tecnico" });
  });

  it("falha ao ler a organização também é erro técnico", async () => {
    const r = await resolveOrganizationContext({
      supabase: supabaseFalso({
        memberships: [ATIVA_A],
        erroOrganizacao: true,
      }),
    });

    expect(r).toEqual({ kind: "erro-tecnico" });
  });

  it("no caminho privilegiado, filtra pelo usuário verificado", async () => {
    const cliente = supabaseFalso({ memberships: [] });

    await resolveOrganizationContext({
      supabase: cliente,
      userId: "33333333-3333-3333-3333-333333333333",
    });

    expect(cliente.filtros).toContainEqual({
      coluna: "user_id",
      valor: "33333333-3333-3333-3333-333333333333",
    });
  });

  it("no caminho do usuário, não filtra por id — a RLS já restringe", async () => {
    const cliente = supabaseFalso({ memberships: [] });

    await resolveOrganizationContext({ supabase: cliente });

    expect(cliente.filtros.some((f) => f.coluna === "user_id")).toBe(false);
  });
});

describe("nenhuma seleção implícita sobrevive", () => {
  it("só o contexto inequívoco produz organizationId", async () => {
    const casos = [
      { memberships: [] },
      { memberships: [{ ...ATIVA_A, status: "INACTIVE" }] },
      { memberships: [ATIVA_A, ATIVA_B] },
      { erroMemberships: true },
    ];

    for (const caso of casos) {
      const r = await resolveOrganizationContext({
        supabase: supabaseFalso(caso),
      });
      expect(r.kind).not.toBe("unica");
    }
  });
});

vi.mock("server-only", () => ({}));
