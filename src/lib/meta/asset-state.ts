import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

import {
  discoverAdAccounts,
  discoverInstagramAccounts,
  type AssetFailure,
} from "./assets";

/**
 * Estado dos ativos Meta para a tela.
 *
 * Duas leituras diferentes, de propósito:
 *
 * - **o que já foi escolhido** passa pelo cliente autenticado, sob RLS e sob o
 *   grant por coluna. A tela não vê identificador externo nenhum porque o
 *   banco não o entrega a `authenticated`;
 * - **os candidatos** vêm da descoberta server-side, que precisa do token e
 *   por isso revalida membership por conta própria.
 *
 * Os estados são de produto. "Nenhuma Página elegível", "Página sem Instagram
 * profissional" e "permissão não concedida" são situações diferentes para
 * quem usa o produto, e a tela precisa dizer qual é qual em linguagem comum
 * (mandato 003B §4.8, `GROWTH_INTELLIGENCE_CANONICAL.md` §2.1).
 */

export type InstagramEscolhido = {
  username: string | null;
  nome: string | null;
  selecionadoEm: string | null;
};

export type InstagramOpcao = {
  /** Id externo. Vai no formulário, nunca na tela. */
  valor: string;
  username: string | null;
  nome: string | null;
  pagina: string | null;
};

export type ContaAnunciosEscolhida = {
  nome: string | null;
  moeda: string | null;
};

export type ContaAnunciosOpcao = {
  valor: string;
  nome: string | null;
  moeda: string | null;
};

/** Ramo opcional. Nenhum destes estados invalida o Instagram. */
export type MetaAdsState =
  /** `ads_read` não foi concedido — e isso é uma escolha legítima. */
  | { kind: "nao-autorizado" }
  | { kind: "selecionada"; conta: ContaAnunciosEscolhida }
  | { kind: "escolher"; opcoes: ContaAnunciosOpcao[] }
  | { kind: "sem-contas" }
  | { kind: "indisponivel" };

export type MetaAssetState =
  /** Sem conexão ativa: a seção de ativos não faz sentido ainda. */
  | { kind: "sem-conexao" }
  | {
      kind: "instagram-selecionado";
      organizationId: string;
      instagram: InstagramEscolhido;
      ads: MetaAdsState;
    }
  | { kind: "escolher-instagram"; organizationId: string; opcoes: InstagramOpcao[] }
  /** A conexão não enxerga nenhuma Página. */
  | { kind: "sem-pagina"; organizationId: string }
  /** Há Página, mas nenhuma tem conta profissional do Instagram vinculada. */
  | { kind: "sem-instagram-vinculado"; organizationId: string }
  /** Falta permissão que o usuário não concedeu no diálogo da Meta. */
  | { kind: "permissao-faltando"; organizationId: string }
  /** A Meta recusou a credencial. Nada foi alterado por aqui. */
  | { kind: "conexao-recusada"; organizationId: string }
  /** Falha temporária. A pessoa pode tentar de novo. */
  | { kind: "indisponivel"; organizationId: string };

/**
 * Monta o estado dos ativos de uma organização com conexão ativa.
 *
 * Só consulta a Meta pelo que ainda falta decidir: com Instagram já escolhido,
 * a descoberta de Páginas não roda. É o que evita que a tela de conta pague
 * duas chamadas externas a cada visita.
 */
export async function getMetaAssetState(input: {
  userId: string;
  organizationId: string;
}): Promise<MetaAssetState> {
  const { organizationId } = input;
  const supabase = await createSupabaseServerClient();

  const { data: conexao, error: erroConexao } = await supabase
    .from("meta_connections")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("status", "ACTIVE")
    .maybeSingle();

  if (erroConexao) return { kind: "indisponivel", organizationId };
  if (!conexao) return { kind: "sem-conexao" };

  const connectionId = conexao.id as string;

  const { data: escolhido, error: erroEscolhido } = await supabase
    .from("instagram_accounts")
    .select("username, display_name, selected_at")
    .eq("meta_connection_id", connectionId)
    .eq("status", "SELECTED")
    .maybeSingle();

  if (erroEscolhido) return { kind: "indisponivel", organizationId };

  if (escolhido) {
    return {
      kind: "instagram-selecionado",
      organizationId,
      instagram: {
        username: (escolhido.username as string | null) ?? null,
        nome: (escolhido.display_name as string | null) ?? null,
        selecionadoEm: (escolhido.selected_at as string | null) ?? null,
      },
      ads: await lerEstadoAds({ ...input, supabase, connectionId }),
    };
  }

  const descoberta = await discoverInstagramAccounts(input);

  if (!descoberta.ok) return traduzirFalha(descoberta.reason, organizationId);

  if (descoberta.pagesFound === 0) return { kind: "sem-pagina", organizationId };
  if (descoberta.candidates.length === 0) {
    return { kind: "sem-instagram-vinculado", organizationId };
  }

  return {
    kind: "escolher-instagram",
    organizationId,
    opcoes: descoberta.candidates.map((c) => ({
      valor: c.externalInstagramAccountId,
      username: c.username,
      nome: c.name,
      pagina: c.pageName,
    })),
  };
}

async function lerEstadoAds(input: {
  userId: string;
  organizationId: string;
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  connectionId: string;
}): Promise<MetaAdsState> {
  const { data: escolhida, error } = await input.supabase
    .from("ad_accounts")
    .select("name, currency")
    .eq("meta_connection_id", input.connectionId)
    .eq("status", "SELECTED")
    .maybeSingle();

  if (error) return { kind: "indisponivel" };

  if (escolhida) {
    return {
      kind: "selecionada",
      conta: {
        nome: (escolhida.name as string | null) ?? null,
        moeda: (escolhida.currency as string | null) ?? null,
      },
    };
  }

  const descoberta = await discoverAdAccounts({
    userId: input.userId,
    organizationId: input.organizationId,
  });

  // Qualquer recusa aqui é ramo opcional que não deu certo — jamais um erro
  // que contamine o Instagram.
  if (!descoberta.ok) return { kind: "indisponivel" };
  if (!descoberta.authorized) return { kind: "nao-autorizado" };
  if (descoberta.accounts.length === 0) return { kind: "sem-contas" };

  return {
    kind: "escolher",
    opcoes: descoberta.accounts.map((c) => ({
      valor: c.externalAdAccountId,
      nome: c.name,
      moeda: c.currency,
    })),
  };
}

function traduzirFalha(
  reason: AssetFailure,
  organizationId: string,
): MetaAssetState {
  if (reason === "NOT_CONNECTED" || reason === "NO_MEMBERSHIP") {
    return { kind: "sem-conexao" };
  }
  if (reason === "MISSING_PERMISSION") {
    return { kind: "permissao-faltando", organizationId };
  }
  if (reason === "CONNECTION_REJECTED") {
    return { kind: "conexao-recusada", organizationId };
  }
  return { kind: "indisponivel", organizationId };
}
