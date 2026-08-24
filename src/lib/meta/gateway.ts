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
  /** Encerrado de fato: a credencial está inativa e o local foi limpo. */
  | { ok: true }
  | {
      ok: false;
      reason:
        | "NOT_FOUND"
        | "NO_MEMBERSHIP"
        | "TOKEN_READ_FAILED"
        /**
         * A Meta só encerra esta autorização pelo ambiente dela. Não é erro: é
         * o contrato da credencial. Nada foi mutado aqui nem lá.
         */
        | "EXTERNAL_ACTION_REQUIRED"
        | "PROVIDER_REVOKE_FAILED"
        | "UNAVAILABLE";
    };

/**
 * Resultado de conferir se a ação externa surtiu efeito.
 *
 * `STILL_ACTIVE` é o caso que separa este fluxo de um botão que mente: a
 * pessoa acha que removeu, a Meta ainda mostra o acesso de pé, e nós não
 * apagamos a única credencial que ainda serviria para provar o contrário.
 */
export type DisconnectCheckResult =
  | { ok: true }
  | {
      ok: false;
      reason:
        | "NOT_FOUND"
        | "NO_MEMBERSHIP"
        | "TOKEN_READ_FAILED"
        | "STILL_ACTIVE"
        | "UNVERIFIED"
        | "UNAVAILABLE";
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
  const { data: token, error: erroLeitura } = await supabase.rpc(
    "read_meta_connection_token",
    { p_connection_id: conexao.id },
  );

  // Falha ao LER o token não é o mesmo que "não há token". A RPC devolve
  // `data: null` nos dois casos, e confundi-los seria fatal: seguiríamos para a
  // revogação local achando que não havia credencial, deixando a autorização
  // viva na Meta e sem nenhuma referência para revogá-la depois.
  //
  // Diante de erro de leitura, nada é limpo. A conexão permanece como está e a
  // desconexão pode ser tentada de novo.
  if (erroLeitura) {
    console.error("falha ao ler token para revogacao", {
      connectionId: conexao.id,
      code: erroLeitura.code,
    });
    return { ok: false, reason: "TOKEN_READ_FAILED" };
  }

  if (typeof token === "string" && token.length > 0) {
    const encerramento = await encerrarNoProvider({
      accessToken: token,
      externalUserId: conexao.external_user_id as string | null,
      env,
    });

    // A Meta só encerra esta autorização pelo ambiente dela. Não é falha, e
    // por isso não vira erro genérico: a pessoa precisa saber o que fazer, e
    // a conexão continua exatamente como está até a remoção ser comprovada.
    if (!encerramento.ok && encerramento.externo) {
      return { ok: false, reason: "EXTERNAL_ACTION_REQUIRED" };
    }

    // Um erro transitório deixa tudo como está para que a pessoa possa tentar
    // de novo — melhor uma desconexão que não completou do que uma que mente.
    if (!encerramento.ok) return { ok: false, reason: "PROVIDER_REVOKE_FAILED" };
  }

  // Chegando aqui, a leitura funcionou e devolveu vazio: a conexão realmente não
  // tem credencial — nunca chegou a ter (`PENDING`) ou já a perdeu. Só neste
  // caso a limpeza local segue sem revogação remota.
  const { error } = await supabase.rpc("revoke_meta_connection", {
    p_connection_id: conexao.id,
  });

  if (error) return { ok: false, reason: "UNAVAILABLE" };

  return { ok: true };
}

/**
 * Confere se a remoção feita no ambiente da Meta surtiu efeito.
 *
 * É a segunda metade do encerramento BISU: a pessoa remove o aplicativo lá, e
 * aqui perguntamos ao provider se o acesso caiu de fato. Só a resposta
 * explícita `is_valid: false` autoriza apagar o segredo — que é a única coisa
 * que ainda permitiria conferir ou encerrar depois.
 *
 * Nenhum endpoint mutável é chamado. Se a Meta ainda mostra o acesso de pé, ou
 * se a rede falha, nada é tocado e a verificação pode ser repetida.
 */
export async function checkMetaDisconnection(input: {
  userId: string;
  organizationId: string;
}): Promise<DisconnectCheckResult> {
  const env = readMetaEnv();
  const supabase = createSupabasePrivilegedClient();

  if (!(await hasActiveMembership(supabase, input.userId, input.organizationId))) {
    return { ok: false, reason: "NO_MEMBERSHIP" };
  }

  const { data: conexao } = await supabase
    .from("meta_connections")
    .select("id")
    .eq("organization_id", input.organizationId)
    .in("status", ["PENDING", "ACTIVE", "ACTION_REQUIRED"])
    .maybeSingle();

  if (!conexao) return { ok: false, reason: "NOT_FOUND" };

  const { data: token, error: erroLeitura } = await supabase.rpc(
    "read_meta_connection_token",
    { p_connection_id: conexao.id },
  );

  // Mesmo raciocínio da desconexão: não saber ler o token é diferente de não
  // haver token, e confundi-los apagaria a credencial sem prova nenhuma.
  if (erroLeitura) {
    console.error("falha ao ler token para verificacao", {
      connectionId: conexao.id,
      code: erroLeitura.code,
    });
    return { ok: false, reason: "TOKEN_READ_FAILED" };
  }

  if (typeof token === "string" && token.length > 0) {
    const estado = await inspectToken({ accessToken: token, env });

    if (!estado.ok) {
      console.error("verificacao de desconexao inconclusiva", estado.motivo);
      return { ok: false, reason: "UNVERIFIED" };
    }

    if (estado.isValid) return { ok: false, reason: "STILL_ACTIVE" };
  }

  const { error } = await supabase.rpc("revoke_meta_connection", {
    p_connection_id: conexao.id,
  });

  if (error) return { ok: false, reason: "UNAVAILABLE" };

  return { ok: true };
}

/**
 * Diagnóstico da desconexão — o que pode ser dito em voz alta.
 *
 * A action devolve só `?meta=erro`, de propósito: a razão da recusa não é
 * informação para a barra de endereços. Mas quando a tentativa é real, cada
 * clique é caro — pode revogar de verdade — e sem registro fica impossível
 * saber em que etapa parou. O servidor guarda essa distinção.
 *
 * Nada aqui carrega token, App Secret ou URL: só HTTP status, código de erro
 * da Meta e um rótulo de causa.
 */
type FalhaExterna = {
  http?: number;
  code?: number;
  subcode?: number;
  causa?: string;
};

type Revogacao = { ok: true } | { ok: false; motivo: FalhaExterna };

/** Lê o erro da Meta sem tocar em `message`, que pode citar o token. */
async function descreverFalha(resposta: Response): Promise<FalhaExterna> {
  const corpo = (await resposta.json().catch(() => null)) as {
    error?: { code?: unknown; error_subcode?: unknown };
  } | null;

  const code = corpo?.error?.code;
  const subcode = corpo?.error?.error_subcode;

  return {
    http: resposta.status,
    ...(typeof code === "number" ? { code } : {}),
    ...(typeof subcode === "number" ? { subcode } : {}),
  };
}

/** Registra a etapa que barrou e falha fechado. */
function pare(etapa: string, motivo: FalhaExterna): { ok: false } {
  console.error("desconexao meta interrompida", { etapa, ...motivo });
  return { ok: false };
}

/**
 * Encerra a autorização no provider — quando isso é possível daqui.
 *
 * **Invariante:** o estado local só pode ser limpo quando o provider estiver
 * *comprovadamente* sem token ativo. "O provider aceitou o pedido" não é prova
 * — por isso todo caminho termina numa pós-condição observável.
 *
 * Fluxo:
 *
 * 1. inspecionar o token. `is_valid === false` já prova que não há autorização
 *    ativa: nada a encerrar, limpeza liberada;
 * 2. inspeção que falha ou é ambígua **não** vira "inválido" — falha fechado;
 * 3. classificar a credencial (somente leitura). BISU é encerrado no ambiente
 *    da Meta, não por API: devolvemos `externo` e não tocamos em nada;
 * 4. token de usuário comum segue por `DELETE /{user-id}/permissions`;
 * 5. qualquer outra combinação para aqui, sem endpoint mutável;
 * 6. **reinspecionar o mesmo token.** Só `is_valid === false` libera a limpeza.
 *
 * Erro do provider — inclusive `190` — nunca é tratado como prova de encerramento.
 * `190` é uma família genérica de falhas de token: a presença do código não diz
 * sequer qual credencial falhou, muito menos que o alvo ficou inativo.
 */
async function encerrarNoProvider(input: {
  accessToken: string;
  externalUserId: string | null;
  env: ReturnType<typeof readMetaEnv>;
}): Promise<{ ok: boolean; externo?: boolean }> {
  const base = graphApiBaseUrl(input.env.META_GRAPH_API_VERSION);

  const antes = await inspectToken({
    accessToken: input.accessToken,
    env: input.env,
  });

  // Não conseguimos verificar: não sabemos o que existe do outro lado.
  if (!antes.ok) return pare("INSPECAO_INICIAL", antes.motivo);

  // Já inativo — única forma segura de pular o encerramento remoto.
  if (antes.isValid === false) return { ok: true };

  // O token está ativo. Antes de escolher qualquer primitive, descobrir o que
  // ele é de fato — `debug_token.type` sozinho não distingue BISU de system
  // user clássico, e essa confusão já custou uma tentativa real.
  const classe = await classificarCredencial({
    accessToken: input.accessToken,
    externalUserId: input.externalUserId,
    base,
  });

  if (!classe.ok) return pare("CLASSIFICACAO", classe.motivo);

  // BISU: a Meta encerra pelo ambiente dela. Nada é chamado, nada é limpo.
  if (classe.bisu) {
    return { ok: false, externo: true };
  }

  // Token de usuário comum: caminho documentado, isolado do BISU.
  if (antes.type !== "USER") {
    return pare("TIPO_NAO_REVOGAVEL", { causa: antes.type ?? "AUSENTE" });
  }

  const revogacao = await revokeUserPermissions({ ...input, base });

  // Erro do provider não completa nada.
  if (!revogacao.ok) return pare("REVOGACAO", revogacao.motivo);

  // Pós-condição: o provider disse que aceitou — agora comprovamos. Aqui o
  // `type` já cumpriu seu papel (escolher a primitive); a única coisa
  // material é a invalidez explícita do mesmo token.
  const depois = await inspectToken({
    accessToken: input.accessToken,
    env: input.env,
  });

  if (!depois.ok) return pare("POS_VERIFICACAO", depois.motivo);

  if (depois.isValid) {
    // O provider aceitou o pedido e o token continua ativo. É o caso que mais
    // importa registrar: sem isto, "erro" na UI não distingue esta situação de
    // uma falha de rede.
    return pare("POS_VERIFICACAO", { causa: "AINDA_VALIDO" });
  }

  return { ok: true };
}

/**
 * A credencial é um BISU?
 *
 * Business Integration System User: o token que o Facebook Login for Business
 * emite quando a configuração pede token de usuário do sistema. `debug_token`
 * chama isso de `SYSTEM_USER`, o mesmo rótulo do system user clássico do
 * Business Manager — e os dois não têm o mesmo ciclo de vida. O que distingue
 * é o contrato de gerenciamento BISU responder `client_business_id`.
 *
 * Foi essa confusão que fez a primeira tentativa real de desconexão chamar
 * `oauth/revoke` e não revogar nada (Investigações 003A-05 e 003A-06A).
 *
 * **"Não é BISU" é uma afirmação, e afirmação exige prova.** Um HTTP 200 com
 * corpo `{}` não diz que a credencial não é BISU — diz que não sabemos o que
 * ela é. Como o único caminho que sobra depois daqui executa uma mutação
 * externa, a resposta precisa identificar positivamente a credencial: `id`
 * presente, coerente com o que persistimos, e `client_business_id` ausente de
 * verdade, não vazio nem de tipo estranho.
 *
 * Somente leitura.
 */
async function classificarCredencial(input: {
  accessToken: string;
  externalUserId: string | null;
  base: string;
}): Promise<{ ok: true; bisu: boolean } | { ok: false; motivo: FalhaExterna }> {
  const url = new URL(`${input.base}/me`);
  url.searchParams.set("fields", "client_business_id");
  url.searchParams.set("access_token", input.accessToken);

  try {
    const resposta = await fetch(url, { method: "GET" });

    if (!resposta.ok) {
      return { ok: false, motivo: await descreverFalha(resposta) };
    }

    const corpo = (await resposta.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;

    if (!corpo || typeof corpo !== "object") {
      return { ok: false, motivo: { http: resposta.status, causa: "CORPO_VAZIO" } };
    }

    // Presente: só é BISU se vier como identificador de verdade. Vazio, nulo
    // ou de outro tipo é resposta que não sabemos ler — não é "não é BISU".
    if ("client_business_id" in corpo) {
      const negocio = corpo.client_business_id;

      if (typeof negocio === "string" && negocio.length > 0) {
        return { ok: true, bisu: true };
      }

      return {
        ok: false,
        motivo: { http: resposta.status, causa: "NEGOCIO_INVALIDO" },
      };
    }

    // Daqui em diante a conclusão seria "não é BISU", que libera mutação. Ela
    // precisa de identidade positiva.
    const id = corpo.id;

    if (typeof id !== "string" || id.length === 0) {
      return {
        ok: false,
        motivo: { http: resposta.status, causa: "SEM_IDENTIDADE" },
      };
    }

    // E a identidade tem que ser a nossa. Revogar permissões de outra conta
    // seria pior do que não revogar nada.
    if (input.externalUserId && input.externalUserId !== id) {
      return {
        ok: false,
        motivo: { http: resposta.status, causa: "IDENTIDADE_DIVERGENTE" },
      };
    }

    return { ok: true, bisu: false };
  } catch {
    return { ok: false, motivo: { causa: "REDE" } };
  }
}

/** `DELETE /{user-id}/permissions` — caminho do token de usuário comum. */
async function revokeUserPermissions(input: {
  accessToken: string;
  externalUserId: string | null;
  base: string;
}): Promise<Revogacao> {
  const alvo = input.externalUserId ?? "me";
  const url = new URL(`${input.base}/${alvo}/permissions`);
  url.searchParams.set("access_token", input.accessToken);

  try {
    const resposta = await fetch(url, { method: "DELETE" });

    if (!resposta.ok) {
      return { ok: false, motivo: await descreverFalha(resposta) };
    }

    const corpo = (await resposta.json()) as { success?: unknown };
    if (corpo.success === true || corpo.success === "true") return { ok: true };

    return { ok: false, motivo: { http: resposta.status, causa: "SEM_SUCCESS" } };
  } catch {
    return { ok: false, motivo: { causa: "REDE" } };
  }
}

/**
 * Inspeciona o token na própria Meta.
 *
 * `ok: false` significa **não sabemos** — rede, HTTP ruim ou corpo sem o campo.
 * É diferente de `ok: true, isValid: false`, que é a única forma de afirmar que
 * o token não está ativo. Colapsar os dois foi o defeito que esta correção
 * remove.
 */
async function inspectToken(input: {
  accessToken: string;
  env: ReturnType<typeof readMetaEnv>;
}): Promise<
  | { ok: true; isValid: boolean; type: string | null }
  | { ok: false; motivo: FalhaExterna }
> {
  const url = new URL(`${graphApiBaseUrl(input.env.META_GRAPH_API_VERSION)}/debug_token`);
  url.searchParams.set("input_token", input.accessToken);
  url.searchParams.set(
    "access_token",
    `${input.env.META_APP_ID}|${input.env.META_APP_SECRET}`,
  );

  try {
    const resposta = await fetch(url, { method: "GET" });

    if (!resposta.ok) {
      return { ok: false, motivo: await descreverFalha(resposta) };
    }

    const corpo = (await resposta.json()) as {
      data?: { type?: unknown; is_valid?: unknown };
    };

    // Sem o booleano explícito não há afirmação possível.
    if (typeof corpo.data?.is_valid !== "boolean") {
      return { ok: false, motivo: { http: resposta.status, causa: "SEM_IS_VALID" } };
    }

    return {
      ok: true,
      isValid: corpo.data.is_valid,
      type: typeof corpo.data.type === "string" ? corpo.data.type : null,
    };
  } catch {
    return { ok: false, motivo: { causa: "REDE" } };
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
