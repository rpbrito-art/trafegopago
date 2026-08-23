import "server-only";

import { createSupabasePrivilegedClient } from "@/lib/supabase/privileged";

import {
  authorizationDialogUrl,
  graphApiBaseUrl,
  readMetaEnv,
} from "./config";
import {
  generateState,
  hashState,
  intentExpiresAt,
  validateIntent,
  type IntentRejection,
} from "./oauth-state";

/**
 * MetaAuthGateway — o único lugar que fala com a Meta (`API_CONTRACTS.md` §1).
 *
 * Nenhuma feature monta URL de Graph API, lê `META_APP_SECRET` ou manipula
 * token. Tudo passa por aqui, e o token nunca sai daqui: ele vai direto para o
 * Vault pelo wrapper `store_meta_connection_token`.
 *
 * Fluxo autorizado nesta rodada: **Facebook Login for Business**, que usa
 * `config_id` no lugar de `scope` — as permissões e os tipos de ativo ficam na
 * *business login configuration* do painel Meta. É o caminho compatível com
 * Instagram profissional **e** Marketing API, revalidado na documentação
 * oficial em 2026-08-23.
 */

export type ConnectionStatus =
  | "PENDING"
  | "ACTIVE"
  | "ACTION_REQUIRED"
  | "EXPIRED"
  | "REVOKED"
  | "ERROR";

export type StartResult =
  | { ok: true; authorizationUrl: string }
  | { ok: false; reason: "NOT_CONFIGURED" | "NO_MEMBERSHIP" | "UNAVAILABLE" };

export type CompleteResult =
  | { ok: true; organizationId: string }
  | { ok: false; reason: IntentRejection | "EXCHANGE_FAILED" | "DENIED" | "UNAVAILABLE" };

export type DisconnectResult =
  | { ok: true }
  | { ok: false; reason: "NOT_FOUND" | "UNAVAILABLE" };

/**
 * Inicia a autorização.
 *
 * Cria a intenção **antes** de devolver a URL: se o registro falhar, nenhuma
 * ida acontece, e um callback sem intenção correspondente já falha fechado.
 */
export async function startMetaAuthorization(input: {
  userId: string;
  organizationId: string;
}): Promise<StartResult> {
  const env = readMetaEnv();
  const supabase = createSupabasePrivilegedClient();

  // A organização vem do servidor, mas a membership é reconferida aqui: quem
  // inicia a conexão precisa pertencer ao tenant, não apenas conhecer o id.
  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("organization_id", input.organizationId)
    .eq("user_id", input.userId)
    .eq("status", "ACTIVE")
    .maybeSingle();

  if (!membership) return { ok: false, reason: "NO_MEMBERSHIP" };

  const state = generateState();
  const stateHash = await hashState(state);

  const { error } = await supabase.from("meta_oauth_intents").insert({
    organization_id: input.organizationId,
    user_id: input.userId,
    state_hash: stateHash,
    expires_at: intentExpiresAt(),
  });

  if (error) return { ok: false, reason: "UNAVAILABLE" };

  const url = new URL(authorizationDialogUrl(env.META_GRAPH_API_VERSION));
  url.searchParams.set("client_id", env.META_APP_ID);
  url.searchParams.set("redirect_uri", env.META_OAUTH_REDIRECT_URI);
  url.searchParams.set("state", state);
  // `config_id` substitui `scope` no Login for Business.
  url.searchParams.set("config_id", env.META_LOGIN_CONFIG_ID);
  url.searchParams.set("response_type", "code");

  return { ok: true, authorizationUrl: url.toString() };
}

/**
 * Conclui o callback.
 *
 * Ordem deliberada: consumir a intenção **antes** de trocar o código. Se a
 * troca falhasse depois de um `state` ainda marcado como não usado, o mesmo
 * `state` poderia ser reapresentado — que é exatamente o replay que a intenção
 * existe para impedir.
 */
export async function completeMetaAuthorization(input: {
  userId: string;
  state: unknown;
  code: unknown;
  error?: string | null;
}): Promise<CompleteResult> {
  const env = readMetaEnv();
  const supabase = createSupabasePrivilegedClient();

  // Usuário recusou no diálogo da Meta. Não é falha do sistema.
  if (input.error) return { ok: false, reason: "DENIED" };

  const stateHash =
    typeof input.state === "string" && input.state.length > 0
      ? await hashState(input.state)
      : null;

  const { data: registro } = stateHash
    ? await supabase
        .from("meta_oauth_intents")
        .select("id, organization_id, user_id, expires_at, consumed_at")
        .eq("state_hash", stateHash)
        .maybeSingle()
    : { data: null };

  const validacao = validateIntent({
    state: input.state,
    intent: registro
      ? {
          organizationId: registro.organization_id,
          userId: registro.user_id,
          expiresAt: registro.expires_at,
          consumedAt: registro.consumed_at,
        }
      : null,
    currentUserId: input.userId,
  });

  if (!validacao.ok) return { ok: false, reason: validacao.reason };

  // Consumo atômico: o `is` garante que só a primeira volta vence, mesmo que
  // duas cheguem ao mesmo tempo. Sem isso, duas requisições simultâneas
  // passariam pela validação de leitura acima.
  const { data: consumida } = await supabase
    .from("meta_oauth_intents")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", registro!.id)
    .is("consumed_at", null)
    .select("id")
    .maybeSingle();

  if (!consumida) return { ok: false, reason: "ALREADY_CONSUMED" };

  if (typeof input.code !== "string" || input.code.length === 0) {
    return { ok: false, reason: "EXCHANGE_FAILED" };
  }

  const troca = await exchangeCodeForToken({
    code: input.code,
    env,
  });

  if (!troca.ok) return { ok: false, reason: "EXCHANGE_FAILED" };

  const organizationId = validacao.organizationId;

  // A conexão nasce/volta a `PENDING` sem token; o segredo entra em seguida e
  // só então o status vira `ACTIVE`. O CHECK
  // `meta_connections_active_requires_token` garante essa ordem no banco.
  const { data: conexao, error: erroConexao } = await supabase
    .from("meta_connections")
    .upsert(
      {
        organization_id: organizationId,
        status: "PENDING",
        connected_by: input.userId,
        api_version_last_verified: env.META_GRAPH_API_VERSION,
        granted_scopes: troca.grantedScopes,
        external_user_id: troca.externalUserId,
        disconnected_at: null,
        action_required_reason: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "organization_id" },
    )
    .select("id")
    .maybeSingle();

  if (erroConexao || !conexao) return { ok: false, reason: "UNAVAILABLE" };

  const { error: erroToken } = await supabase.rpc(
    "store_meta_connection_token",
    {
      p_connection_id: conexao.id,
      p_token: troca.accessToken,
      p_expires_at: troca.expiresAt,
    },
  );

  if (erroToken) return { ok: false, reason: "UNAVAILABLE" };

  await supabase
    .from("meta_connections")
    .update({
      status: "ACTIVE",
      connected_at: new Date().toISOString(),
      last_health_check_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", conexao.id);

  return { ok: true, organizationId };
}

/**
 * Desconecta.
 *
 * Remove o segredo do Vault e marca `REVOKED` — a linha permanece como
 * histórico de que a organização já esteve conectada. O CHECK
 * `meta_connections_revoked_has_no_token` impede marcar `REVOKED` com
 * referência de segredo ainda presente.
 */
export async function disconnectMeta(input: {
  userId: string;
  organizationId: string;
}): Promise<DisconnectResult> {
  const supabase = createSupabasePrivilegedClient();

  const { data: conexao } = await supabase
    .from("meta_connections")
    .select("id")
    .eq("organization_id", input.organizationId)
    .in("status", ["PENDING", "ACTIVE", "ACTION_REQUIRED"])
    .maybeSingle();

  if (!conexao) return { ok: false, reason: "NOT_FOUND" };

  // Uma chamada só: status e referência mudam no mesmo UPDATE, e o segredo é
  // removido do Vault em seguida. Fazer isso em dois passos daqui violaria os
  // CHECKs de coerência — foi o que a prova da rodada mostrou.
  const { error } = await supabase.rpc("revoke_meta_connection", {
    p_connection_id: conexao.id,
  });

  if (error) return { ok: false, reason: "UNAVAILABLE" };

  return { ok: true };
}

type Exchange =
  | {
      ok: true;
      accessToken: string;
      expiresAt: string | null;
      grantedScopes: string[];
      externalUserId: string | null;
    }
  | { ok: false };

/**
 * Troca o `code` por token.
 *
 * `META_APP_SECRET` é usado **apenas aqui**, no servidor, e o token retornado
 * não é logado nem devolvido ao chamador do gateway — segue direto para o
 * Vault (`SECURITY_MODEL.md` §15.1).
 */
async function exchangeCodeForToken(input: {
  code: string;
  env: ReturnType<typeof readMetaEnv>;
}): Promise<Exchange> {
  const { env, code } = input;
  const url = new URL(`${graphApiBaseUrl(env.META_GRAPH_API_VERSION)}/oauth/access_token`);
  url.searchParams.set("client_id", env.META_APP_ID);
  url.searchParams.set("client_secret", env.META_APP_SECRET);
  url.searchParams.set("redirect_uri", env.META_OAUTH_REDIRECT_URI);
  url.searchParams.set("code", code);

  try {
    const resposta = await fetch(url, { method: "GET" });
    if (!resposta.ok) return { ok: false };

    const corpo = (await resposta.json()) as {
      access_token?: unknown;
      expires_in?: unknown;
    };

    if (typeof corpo.access_token !== "string" || corpo.access_token.length === 0) {
      return { ok: false };
    }

    const expiresAt =
      typeof corpo.expires_in === "number" && corpo.expires_in > 0
        ? new Date(Date.now() + corpo.expires_in * 1000).toISOString()
        : null;

    const identidade = await readGrantedIdentity({
      accessToken: corpo.access_token,
      env,
    });

    return {
      ok: true,
      accessToken: corpo.access_token,
      expiresAt,
      grantedScopes: identidade.scopes,
      externalUserId: identidade.userId,
    };
  } catch {
    // Falha de rede não vaza detalhe para o chamador; a UI recebe estado
    // acionável, não stack trace.
    return { ok: false };
  }
}

/**
 * Lê identidade e escopos concedidos.
 *
 * Guardamos o que foi **concedido**, que pode ser menos do que o pedido — é o
 * que permite detectar permissão faltante antes de uma chamada falhar. Falha
 * aqui não invalida a conexão: o token já é válido, e o health posterior
 * reavalia.
 */
async function readGrantedIdentity(input: {
  accessToken: string;
  env: ReturnType<typeof readMetaEnv>;
}): Promise<{ scopes: string[]; userId: string | null }> {
  const base = graphApiBaseUrl(input.env.META_GRAPH_API_VERSION);

  try {
    const url = new URL(`${base}/debug_token`);
    url.searchParams.set("input_token", input.accessToken);
    url.searchParams.set(
      "access_token",
      `${input.env.META_APP_ID}|${input.env.META_APP_SECRET}`,
    );

    const resposta = await fetch(url, { method: "GET" });
    if (!resposta.ok) return { scopes: [], userId: null };

    const corpo = (await resposta.json()) as {
      data?: { scopes?: unknown; user_id?: unknown };
    };

    const scopes = Array.isArray(corpo.data?.scopes)
      ? corpo.data.scopes.filter((s): s is string => typeof s === "string").slice(0, 50)
      : [];

    const userId =
      typeof corpo.data?.user_id === "string" ? corpo.data.user_id : null;

    return { scopes, userId };
  } catch {
    return { scopes: [], userId: null };
  }
}
