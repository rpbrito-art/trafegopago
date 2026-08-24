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
  | {
      ok: false;
      reason:
        | IntentRejection
        | "EXCHANGE_FAILED"
        | "DENIED"
        | "NO_MEMBERSHIP"
        | "UNAVAILABLE";
    };

export type DisconnectResult =
  | { ok: true }
  | {
      ok: false;
      reason: "NOT_FOUND" | "NO_MEMBERSHIP" | "PROVIDER_REVOKE_FAILED" | "UNAVAILABLE";
    };

/**
 * O usuário tem membership ACTIVE nesta organização **agora**?
 *
 * Conhecer o UUID de uma organização não autoriza nada. Esta checagem é
 * repetida em cada operação — iniciar, concluir e desconectar — porque a
 * membership pode ser removida no meio do fluxo OAuth, que passa por um
 * provider externo e leva tempo indeterminado.
 */
async function hasActiveMembership(
  supabase: ReturnType<typeof createSupabasePrivilegedClient>,
  userId: string,
  organizationId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .eq("status", "ACTIVE")
    .maybeSingle();

  return Boolean(data);
}

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
  if (!(await hasActiveMembership(supabase, input.userId, input.organizationId))) {
    return { ok: false, reason: "NO_MEMBERSHIP" };
  }

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

  // A recusa do usuário NÃO curto-circuita a validação. Retornar `DENIED` antes
  // de consumir a intenção deixaria o `state` reutilizável: bastaria forjar um
  // callback com `error=` para preservá-lo e reapresentá-lo depois. Uso único
  // significa único, qualquer que seja o desfecho.
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

  // `state` malformado ou desconhecido não consome nada — não há registro a
  // consumir, e inventar um consumo afetaria outra intenção.
  if (!validacao.ok) return { ok: false, reason: validacao.reason };

  const organizationId = validacao.organizationId;

  // Consumo atômico antes de qualquer efeito. O `is` garante que só a primeira
  // volta vence, mesmo com duas chegando ao mesmo tempo.
  const { data: consumida } = await supabase
    .from("meta_oauth_intents")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", registro!.id)
    .is("consumed_at", null)
    .select("id")
    .maybeSingle();

  if (!consumida) return { ok: false, reason: "ALREADY_CONSUMED" };

  // Só agora o desfecho do provider importa. A intenção já morreu.
  if (input.error) return { ok: false, reason: "DENIED" };

  // A membership pode ter sido removida enquanto o usuário estava no diálogo da
  // Meta. Reconferir aqui, antes de chamar o provider e antes de persistir
  // qualquer coisa, é o que impede conectar uma organização à qual a pessoa já
  // não pertence.
  if (!(await hasActiveMembership(supabase, input.userId, organizationId))) {
    return { ok: false, reason: "NO_MEMBERSHIP" };
  }

  if (typeof input.code !== "string" || input.code.length === 0) {
    return { ok: false, reason: "EXCHANGE_FAILED" };
  }

  const troca = await exchangeCodeForToken({ code: input.code, env });
  if (!troca.ok) return { ok: false, reason: "EXCHANGE_FAILED" };

  // Abre ou retoma a conexão viva. Sem `upsert`: o índice único é parcial e
  // `ON CONFLICT (organization_id)` não o cobre — e, se cobrisse, colidiria
  // também com linhas terminais e destruiria o histórico.
  const { data: connectionId, error: erroBegin } = await supabase.rpc(
    "begin_meta_connection",
    {
      p_organization_id: organizationId,
      p_user_id: input.userId,
      p_api_version: env.META_GRAPH_API_VERSION,
    },
  );

  if (erroBegin || !connectionId) return { ok: false, reason: "UNAVAILABLE" };

  // Segredo, escopos, identidade e status numa única transação. Antes, guardar
  // o token e falhar ao marcar `ACTIVE` devolvia sucesso com a conexão
  // incoerente.
  const { error: erroAtivacao } = await supabase.rpc(
    "activate_meta_connection",
    {
      p_connection_id: connectionId,
      p_token: troca.accessToken,
      p_expires_at: troca.expiresAt,
      p_scopes: troca.grantedScopes,
      p_external_user_id: troca.externalUserId,
    },
  );

  if (erroAtivacao) return { ok: false, reason: "UNAVAILABLE" };

  return { ok: true, organizationId };
}

/**
 * Desconecta.
 *
 * Ordem deliberada, exigida pela auditoria: **membership → revogar na Meta →
 * revogar localmente**.
 *
 * Revogar primeiro no provider é o que distingue "desconectar" de "esquecer".
 * Se limpássemos o estado local antes, o app continuaria autorizado do lado da
 * Meta e ninguém teria mais o token para revogá-lo — o usuário veria
 * "desconectado" e a permissão seguiria de pé.
 *
 * Falha indeterminada do provider **não** vira desconexão concluída.
 */
export async function disconnectMeta(input: {
  userId: string;
  organizationId: string;
}): Promise<DisconnectResult> {
  const env = readMetaEnv();
  const supabase = createSupabasePrivilegedClient();

  // Primeiro de tudo: conhecer o id da organização não autoriza desconectá-la.
  if (!(await hasActiveMembership(supabase, input.userId, input.organizationId))) {
    return { ok: false, reason: "NO_MEMBERSHIP" };
  }

  const { data: conexao } = await supabase
    .from("meta_connections")
    .select("id, external_user_id")
    .eq("organization_id", input.organizationId)
    .in("status", ["PENDING", "ACTIVE", "ACTION_REQUIRED"])
    .maybeSingle();

  if (!conexao) return { ok: false, reason: "NOT_FOUND" };

  // O token sai do Vault apenas aqui, no servidor, para apresentar à Meta. Não
  // é logado, não é retornado e não sobrevive a esta função.
  const { data: token } = await supabase.rpc("read_meta_connection_token", {
    p_connection_id: conexao.id,
  });

  if (typeof token === "string" && token.length > 0) {
    const revogacao = await revokeOnMeta({
      accessToken: token,
      externalUserId: conexao.external_user_id as string | null,
      env,
    });

    // Só `alreadyRevoked` e `revoked` autorizam seguir. Um erro transitório
    // deixa tudo como está para que a pessoa possa tentar de novo — melhor uma
    // desconexão que não completou do que uma que mente.
    if (!revogacao.ok) return { ok: false, reason: "PROVIDER_REVOKE_FAILED" };
  }

  // Sem token não há o que revogar remotamente: a conexão nunca chegou a ter
  // credencial (`PENDING`) ou já a perdeu. A limpeza local segue.
  const { error } = await supabase.rpc("revoke_meta_connection", {
    p_connection_id: conexao.id,
  });

  if (error) return { ok: false, reason: "UNAVAILABLE" };

  return { ok: true };
}

/**
 * Revoga a autorização no provider.
 *
 * A Meta tem **dois mecanismos**, e usar o errado falha:
 *
 * - **`GET /oauth/revoke`** — para token de usuário do sistema (BISU, emitido
 *   pelo Facebook Login for Business). Exige `client_id`, `client_secret` e o
 *   token a revogar; a documentação impõe que o app do `revoke_token` e o do
 *   `client_id` sejam o mesmo, o que é o nosso caso.
 * - **`DELETE /{user-id}/permissions`** — para token de usuário comum. É o
 *   endpoint de permissões *de usuário*, e um system user não as tem no
 *   sentido desse endpoint.
 *
 * O tipo é descoberto em `debug_token` na hora da desconexão, e não lido de uma
 * coluna: a configuração de login pode mudar no painel Meta entre a conexão e a
 * desconexão, e o token que temos em mãos é a única fonte confiável do que ele
 * é agora.
 *
 * Token já inválido (`190`) conta como revogado: não há mais autorização a
 * remover, e tratar isso como falha prenderia o usuário numa conexão que ele
 * não consegue desfazer.
 */
async function revokeOnMeta(input: {
  accessToken: string;
  externalUserId: string | null;
  env: ReturnType<typeof readMetaEnv>;
}): Promise<{ ok: boolean }> {
  const base = graphApiBaseUrl(input.env.META_GRAPH_API_VERSION);
  const tipo = await inspectTokenType({ accessToken: input.accessToken, env: input.env });

  if (tipo === "INVALID") return { ok: true };

  return tipo === "SYSTEM_USER"
    ? revokeSystemUserToken({ ...input, base })
    : revokeUserPermissions({ ...input, base });
}

/** `oauth/revoke` — caminho do token de usuário do sistema. */
async function revokeSystemUserToken(input: {
  accessToken: string;
  env: ReturnType<typeof readMetaEnv>;
  base: string;
}): Promise<{ ok: boolean }> {
  const url = new URL(`${input.base}/oauth/revoke`);
  url.searchParams.set("client_id", input.env.META_APP_ID);
  url.searchParams.set("client_secret", input.env.META_APP_SECRET);
  url.searchParams.set("revoke_token", input.accessToken);
  url.searchParams.set(
    "access_token",
    `${input.env.META_APP_ID}|${input.env.META_APP_SECRET}`,
  );

  try {
    const resposta = await fetch(url, { method: "GET" });
    const corpo = (await resposta.json().catch(() => null)) as {
      success?: unknown;
      error?: { code?: unknown };
    } | null;

    // A API devolve a string "true", não o booleano.
    if (resposta.ok && (corpo?.success === true || corpo?.success === "true")) {
      return { ok: true };
    }

    if (corpo?.error?.code === 190) return { ok: true };

    return { ok: false };
  } catch {
    return { ok: false };
  }
}

/** `DELETE /{user-id}/permissions` — caminho do token de usuário comum. */
async function revokeUserPermissions(input: {
  accessToken: string;
  externalUserId: string | null;
  base: string;
}): Promise<{ ok: boolean }> {
  const alvo = input.externalUserId ?? "me";
  const url = new URL(`${input.base}/${alvo}/permissions`);
  url.searchParams.set("access_token", input.accessToken);

  try {
    const resposta = await fetch(url, { method: "DELETE" });

    if (resposta.ok) {
      const corpo = (await resposta.json()) as { success?: unknown };
      return { ok: corpo.success === true || corpo.success === "true" };
    }

    const corpo = (await resposta.json().catch(() => null)) as {
      error?: { code?: unknown };
    } | null;

    if (corpo?.error?.code === 190) return { ok: true };

    return { ok: false };
  } catch {
    return { ok: false };
  }
}

/**
 * Que tipo de token é este, segundo a própria Meta?
 *
 * `UNKNOWN` quando não dá para saber — e nesse caso o chamador segue pelo
 * caminho de usuário comum, que é o mais conservador: se falhar, a desconexão
 * não completa, em vez de completar sem revogar.
 */
async function inspectTokenType(input: {
  accessToken: string;
  env: ReturnType<typeof readMetaEnv>;
}): Promise<"SYSTEM_USER" | "USER" | "INVALID" | "UNKNOWN"> {
  const url = new URL(`${graphApiBaseUrl(input.env.META_GRAPH_API_VERSION)}/debug_token`);
  url.searchParams.set("input_token", input.accessToken);
  url.searchParams.set(
    "access_token",
    `${input.env.META_APP_ID}|${input.env.META_APP_SECRET}`,
  );

  try {
    const resposta = await fetch(url, { method: "GET" });
    if (!resposta.ok) return "UNKNOWN";

    const corpo = (await resposta.json()) as {
      data?: { type?: unknown; is_valid?: unknown };
    };

    if (corpo.data?.is_valid === false) return "INVALID";
    if (corpo.data?.type === "SYSTEM_USER") return "SYSTEM_USER";
    if (corpo.data?.type === "USER") return "USER";

    return "UNKNOWN";
  } catch {
    return "UNKNOWN";
  }
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
