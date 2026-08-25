import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Resolve **qual negócio** uma requisição está operando — ou recusa resolver.
 *
 * Existe porque a alternativa é pior: `memberships[0]`, `ativas[0]` ou
 * `.limit(1)` parecem inofensivos e são, na prática, uma escolha de tenant
 * feita pela ordem em que o banco devolveu as linhas. Numa conta com mais de um
 * negócio, isso significa mostrar — ou alterar — o objetivo de um negócio que
 * o usuário não escolheu (auditoria 004B §6.1).
 *
 * A semântica é a mesma já promovida em `getAccountBusinessState()`, e mora
 * aqui justamente para não haver duas definições divergentes de "a organização
 * do usuário" no mesmo produto.
 *
 * Contexto ambíguo **não** é erro nem ausência: é um estado próprio, que a UI
 * precisa tratar e nenhuma mutação pode atravessar.
 */
export type OrganizationContext =
  /** Não existe membership alguma: o próximo passo é criar o negócio. */
  | { kind: "sem-organizacao" }
  /**
   * Existe uma membership, mas o negócio não está disponível — organização
   * inativa, removida, ou membership desativada.
   *
   * Distinto de `sem-organizacao` de propósito: oferecer "crie seu negócio" a
   * quem foi desativado criaria um segundo tenant por engano.
   */
  | { kind: "organizacao-indisponivel" }
  /**
   * Mais de uma membership. Enquanto não houver seletor explícito, nenhuma
   * leitura ou escrita de negócio pode escolher uma por conta própria.
   */
  | { kind: "multiplas-organizacoes"; membershipCount: number }
  | { kind: "erro-tecnico" }
  /** Contexto inequívoco: exatamente um negócio, ativo e acessível. */
  | { kind: "unica"; organizationId: string; role: string };

/**
 * @param userId Presente apenas no caminho privilegiado, onde a identidade vem
 * de `getClaims()` verificado server-side. No caminho do usuário ele é omitido
 * e a RLS já restringe às próprias linhas.
 */
export async function resolveOrganizationContext(input: {
  supabase: SupabaseClient;
  userId?: string;
}): Promise<OrganizationContext> {
  const { supabase, userId } = input;

  let query = supabase
    .from("organization_members")
    .select("organization_id, role, status");

  if (userId) query = query.eq("user_id", userId);

  const { data, error } = await query;

  // Falha técnica vira estado próprio, nunca lista vazia: confundir "não deu
  // para saber" com "não existe" faria a tela oferecer criar um negócio a quem
  // já tem um.
  if (error) return { kind: "erro-tecnico" };

  const rows = data ?? [];

  if (rows.length === 0) return { kind: "sem-organizacao" };

  // A contagem inclui membership INACTIVE de propósito. Uma membership
  // desativada ainda é uma membership — ignorá-la aqui transformaria uma conta
  // multi-negócio em "conta com um negócio só" conforme o status mudasse.
  if (rows.length > 1) {
    return { kind: "multiplas-organizacoes", membershipCount: rows.length };
  }

  const membership = rows[0];

  if (membership.status !== "ACTIVE") return { kind: "organizacao-indisponivel" };

  const { data: organization, error: erroOrganizacao } = await supabase
    .from("organizations")
    .select("id, status")
    .eq("id", membership.organization_id)
    .maybeSingle();

  if (erroOrganizacao) return { kind: "erro-tecnico" };

  // Sem organização visível: desativada, removida ou fora do alcance da policy.
  if (!organization || organization.status !== "ACTIVE") {
    return { kind: "organizacao-indisponivel" };
  }

  return {
    kind: "unica",
    organizationId: organization.id as string,
    role: String(membership.role),
  };
}
