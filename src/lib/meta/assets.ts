import "server-only";

import { createSupabasePrivilegedClient } from "@/lib/supabase/privileged";

import { evaluateCapabilities, type MetaCapabilities } from "./capabilities";
import { graphApiBaseUrl, readMetaEnv } from "./config";
import { classifyCredential } from "./credential";

/**
 * MetaAssetGateway — a única fronteira que descobre e seleciona ativos Meta.
 *
 * Mesma disciplina do `MetaAuthGateway` (`API_CONTRACTS.md` §1): nenhuma
 * feature monta URL de Graph API, e o token sai do Vault apenas aqui, no
 * servidor, para ser apresentado ao provider. Ele não é retornado, não é
 * logado e não sobrevive à função que o pediu.
 *
 * ## O que esta rodada faz, e o que não faz
 *
 * Descobre Páginas e a conta profissional do Instagram vinculada, descobre
 * contas de anúncios quando `ads_read` foi concedido, e persiste **a escolha**.
 * Não importa post, não lê métrica para guardar e não toca em nada mutável
 * (mandato 003B §8).
 *
 * ## A regra que governa a seleção
 *
 * O browser pode dizer *qual* ativo a pessoa escolheu, mas não prova que
 * aquele ativo é dela. Todo `selectX` redescobre a lista contra a Meta e só
 * grava se o id enviado estiver nela (mandato §4.5). Um id inventado, ou
 * pertencente ao conjunto de outra conexão, falha fechado — antes de qualquer
 * escrita.
 */

/** Motivos de recusa, no vocabulário do domínio — não da Graph API. */
export type AssetFailure =
  /** Quem pediu não pertence a esta organização agora. */
  | "NO_MEMBERSHIP"
  /** Não há conexão Meta ativa para esta organização. */
  | "NOT_CONNECTED"
  /** A conexão existe, mas o usuário não concedeu a permissão necessária. */
  | "MISSING_PERMISSION"
  /** O token não pôde ser lido. Diferente de "não há token". */
  | "TOKEN_UNAVAILABLE"
  /**
   * A Meta recusou a credencial.
   *
   * Deliberadamente **não** muda o status da conexão: a 003A provou que erro
   * de token da família `190` não é prova de revogação, e transformá-lo em
   * mutação local traria de volta o defeito que aquela rodada removeu.
   */
  | "CONNECTION_REJECTED"
  /** Falha temporária/rede/HTTP inesperado. Nada foi alterado. */
  | "PROVIDER_UNAVAILABLE"
  /** O ativo escolhido não está entre os que esta conexão autoriza. */
  | "ASSET_NOT_FOUND"
  /** A gravação falhou. Nenhuma seleção foi trocada. */
  | "PERSIST_FAILED";

/** Conta profissional do Instagram candidata à seleção. */
export type InstagramCandidate = {
  externalInstagramAccountId: string;
  /** Página pela qual esta conta foi descoberta. */
  externalPageId: string;
  pageName: string | null;
  username: string | null;
  name: string | null;
  /** A Graph API com Facebook Login nem sempre expõe isto. */
  accountType: string | null;
};

export type InstagramDiscovery =
  | {
      ok: true;
      /** Quantas Páginas a conexão enxerga — separa "sem Página" de "sem IG". */
      pagesFound: number;
      candidates: InstagramCandidate[];
    }
  | { ok: false; reason: AssetFailure };

export type AdAccountCandidate = {
  externalAdAccountId: string;
  name: string | null;
  currency: string | null;
  timezoneName: string | null;
  providerAccountStatus: string | null;
};

export type AdAccountDiscovery =
  /**
   * Ausência de `ads_read` é capacidade que não existe, não erro
   * (mandato §4.2). O caminho orgânico segue intacto.
   */
  | { ok: true; authorized: false }
  | { ok: true; authorized: true; accounts: AdAccountCandidate[] }
  | { ok: false; reason: AssetFailure };

export type SelectionResult =
  | { ok: true }
  | { ok: false; reason: AssetFailure };

/** Teto de páginas seguidas por listagem. Uma conexão real não chega perto. */
const MAX_PAGINAS = 5;
/** Teto de itens acumulados por listagem. */
const MAX_ITENS = 200;
/** Itens por página pedidos à Meta. */
const TAMANHO_PAGINA = 50;

// ---------------------------------------------------------------------------
// Conexão e credencial
// ---------------------------------------------------------------------------

type Conexao = {
  id: string;
  organizationId: string;
  /** Identidade que persistimos no OAuth. Âncora da conferência de classe. */
  externalUserId: string | null;
  grantedScopes: string[];
  capabilities: MetaCapabilities;
  token: string;
};

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
 * Membership → conexão ativa → escopos concedidos → token.
 *
 * Nesta ordem por um motivo: a membership é reconferida **antes** de qualquer
 * leitura de conexão, para que conhecer o UUID de uma organização não revele
 * sequer se ela tem conexão. E o token é lido por último, só quando tudo o
 * mais já autorizou o uso.
 */
async function carregarConexao(input: {
  supabase: ReturnType<typeof createSupabasePrivilegedClient>;
  userId: string;
  organizationId: string;
}): Promise<{ ok: true; conexao: Conexao } | { ok: false; reason: AssetFailure }> {
  const { supabase, userId, organizationId } = input;

  if (!(await hasActiveMembership(supabase, userId, organizationId))) {
    return { ok: false, reason: "NO_MEMBERSHIP" };
  }

  const { data: conexao, error } = await supabase
    .from("meta_connections")
    .select("id, granted_scopes, external_user_id")
    .eq("organization_id", organizationId)
    .eq("status", "ACTIVE")
    .maybeSingle();

  if (error) return { ok: false, reason: "PROVIDER_UNAVAILABLE" };
  if (!conexao) return { ok: false, reason: "NOT_CONNECTED" };

  const { data: token, error: erroToken } = await supabase.rpc(
    "read_meta_connection_token",
    { p_connection_id: conexao.id },
  );

  // Falha ao ler é diferente de não haver token — a mesma distinção que a 003A
  // precisou fazer para não apagar credencial sem prova.
  if (erroToken) {
    console.error("falha ao ler token para descoberta de ativos", {
      connectionId: conexao.id,
      code: erroToken.code,
    });
    return { ok: false, reason: "TOKEN_UNAVAILABLE" };
  }

  if (typeof token !== "string" || token.length === 0) {
    return { ok: false, reason: "TOKEN_UNAVAILABLE" };
  }

  const grantedScopes = Array.isArray(conexao.granted_scopes)
    ? (conexao.granted_scopes as string[])
    : [];

  return {
    ok: true,
    conexao: {
      id: conexao.id as string,
      organizationId,
      externalUserId:
        typeof conexao.external_user_id === "string" &&
        conexao.external_user_id.length > 0
          ? conexao.external_user_id
          : null,
      grantedScopes,
      capabilities: evaluateCapabilities(grantedScopes),
      token,
    },
  };
}

// ---------------------------------------------------------------------------
// Paginação
// ---------------------------------------------------------------------------

/**
 * Traduz a recusa da Meta para o vocabulário do domínio.
 *
 * Um único lugar, usado por toda chamada externa desta fronteira: a mesma
 * resposta do provider não pode significar coisas diferentes conforme o
 * endpoint que a recebeu.
 */
function classificarRecusa(code: number | null): AssetFailure {
  // `190` diz que a credencial não serve **agora**. Vira estado de tela, não
  // mutação: nada aqui revoga, expira ou apaga conexão.
  if (code === 190) return "CONNECTION_REJECTED";
  // `10`/`200` são a família de permissão insuficiente.
  if (code === 10 || code === 200) return "MISSING_PERMISSION";
  return "PROVIDER_UNAVAILABLE";
}

type Pagina = { itens: Record<string, unknown>[]; proximoCursor: string | null };

/**
 * Uma página de uma listagem da Graph API.
 *
 * O cursor é extraído e a próxima chamada é **reconstruída** contra o host,
 * base e versão que nós controlamos. Seguir a URL `paging.next` que o provider
 * devolve seria deixar um terceiro escolher para onde o servidor faz request
 * com o token em mãos (mandato §4.7).
 */
async function lerPagina(input: {
  base: string;
  path: string;
  fields: string;
  accessToken: string;
  after: string | null;
}): Promise<{ ok: true; pagina: Pagina } | { ok: false; reason: AssetFailure }> {
  const url = new URL(`${input.base}/${input.path}`);
  url.searchParams.set("fields", input.fields);
  url.searchParams.set("limit", String(TAMANHO_PAGINA));
  if (input.after) url.searchParams.set("after", input.after);
  url.searchParams.set("access_token", input.accessToken);

  let resposta: Response;

  try {
    resposta = await fetch(url, { method: "GET" });
  } catch {
    return { ok: false, reason: "PROVIDER_UNAVAILABLE" };
  }

  const corpo = (await resposta.json().catch(() => null)) as {
    data?: unknown;
    paging?: { cursors?: { after?: unknown } };
    error?: { code?: unknown; error_subcode?: unknown; type?: unknown };
  } | null;

  if (!resposta.ok) {
    const erro = corpo?.error;
    const code = typeof erro?.code === "number" ? erro.code : null;
    const subcode =
      typeof erro?.error_subcode === "number" ? erro.error_subcode : null;

    // Sem `message`: ela pode citar o token (`SECURITY_MODEL.md` §15).
    console.error("descoberta de ativos meta recusada", {
      path: input.path,
      http: resposta.status,
      code,
      subcode,
    });

    return { ok: false, reason: classificarRecusa(code) };
  }

  if (!Array.isArray(corpo?.data)) {
    return { ok: false, reason: "PROVIDER_UNAVAILABLE" };
  }

  const itens = corpo.data.filter(
    (item): item is Record<string, unknown> =>
      typeof item === "object" && item !== null,
  );

  const after = corpo.paging?.cursors?.after;

  return {
    ok: true,
    pagina: {
      itens,
      proximoCursor: typeof after === "string" && after.length > 0 ? after : null,
    },
  };
}

/** Percorre a listagem inteira, com teto de páginas e de itens. */
async function lerListagem(input: {
  base: string;
  path: string;
  fields: string;
  accessToken: string;
}): Promise<
  { ok: true; itens: Record<string, unknown>[] } | { ok: false; reason: AssetFailure }
> {
  const itens: Record<string, unknown>[] = [];
  let after: string | null = null;

  for (let pagina = 0; pagina < MAX_PAGINAS; pagina += 1) {
    const resultado: Awaited<ReturnType<typeof lerPagina>> = await lerPagina({
      ...input,
      after,
    });
    if (!resultado.ok) return resultado;

    itens.push(...resultado.pagina.itens);

    if (itens.length >= MAX_ITENS) return { ok: true, itens: itens.slice(0, MAX_ITENS) };
    if (!resultado.pagina.proximoCursor) break;

    after = resultado.pagina.proximoCursor;
  }

  return { ok: true, itens };
}

// ---------------------------------------------------------------------------
// Descoberta — Instagram
// ---------------------------------------------------------------------------

function texto(valor: unknown): string | null {
  return typeof valor === "string" && valor.length > 0 ? valor : null;
}

/**
 * Onde estão as Páginas desta credencial.
 *
 * Não existe um edge único: `/me/accounts` lista as Páginas que **uma pessoa**
 * administra, e um system user não é uma pessoa. Apresentar o token de um BISU
 * a `/me/accounts` devolve HTTP 200 com lista vazia — a forma mais cara de
 * errar, porque parece "este negócio não tem Página" em vez de "perguntamos no
 * lugar errado" (Correção 003B-06 §2).
 *
 * Por isso a classe da credencial é estabelecida **antes** de escolher o edge,
 * pela mesma classificação fail-closed que a desconexão usa — `debug_token.type`
 * sozinho não distingue BISU de system user clássico, e `external_business_id`
 * não é proxy de tipo.
 *
 * - **USER** → `GET /me/accounts`, caminho documentado do Instagram API with
 *   Facebook Login;
 * - **BISU/System User** → `GET /{system-user-id}/assigned_pages`, o edge de
 *   Pages atribuídas ao usuário do sistema na referência oficial do Graph API.
 *
 * Classificação inconclusiva **não** tenta um edge por chute: sem saber o que
 * é a credencial, qualquer escolha seria adivinhação, e uma lista vazia obtida
 * por adivinhação é indistinguível de uma lista vazia verdadeira.
 */
async function descobrirPaginas(input: {
  conexao: Conexao;
  base: string;
}): Promise<
  { ok: true; itens: Record<string, unknown>[] } | { ok: false; reason: AssetFailure }
> {
  const { conexao, base } = input;

  const classificada = await classifyCredential({
    accessToken: conexao.token,
    externalUserId: conexao.externalUserId,
    base,
  });

  if (!classificada.ok) {
    // Sem `message` e sem URL: as duas podem citar o token.
    console.error("classificacao de credencial meta inconclusiva", {
      connectionId: conexao.id,
      http: classificada.motivo.http ?? null,
      code: classificada.motivo.code ?? null,
      subcode: classificada.motivo.subcode ?? null,
      causa: classificada.motivo.causa ?? null,
    });

    return {
      ok: false,
      reason: classificarRecusa(classificada.motivo.code ?? null),
    };
  }

  const classe = classificada.classe;

  // O edge do system user é escopado à identidade, e a identidade tem que vir
  // da Meta — não do que digitamos no banco. Sem ela, não há caminho: cair de
  // volta em `/me/accounts` seria exatamente o defeito que esta correção
  // remove.
  if (classe.bisu) {
    if (!classe.subjectId) {
      console.error("credencial bisu sem identidade para ancorar assigned_pages", {
        connectionId: conexao.id,
      });
      return { ok: false, reason: "PROVIDER_UNAVAILABLE" };
    }

    // A mesma conferência que a classificação faz no ramo de usuário comum. Um
    // token que responde por outra identidade não descobre ativos aqui.
    if (conexao.externalUserId && conexao.externalUserId !== classe.subjectId) {
      console.error("identidade da credencial diverge da conexao", {
        connectionId: conexao.id,
      });
      return { ok: false, reason: "PROVIDER_UNAVAILABLE" };
    }

    return lerListagem({
      base,
      path: `${encodeURIComponent(classe.subjectId)}/assigned_pages`,
      fields: "id,name,instagram_business_account",
      accessToken: conexao.token,
    });
  }

  return lerListagem({
    base,
    path: "me/accounts",
    fields: "id,name,instagram_business_account",
    accessToken: conexao.token,
  });
}

/**
 * Páginas administradas → conta profissional do Instagram vinculada.
 *
 * O edge de Páginas é escolhido por `descobrirPaginas`, conforme a classe da
 * credencial; daqui para a frente o pipeline é o mesmo, e
 * `instagram_business_account` é o vínculo com a conta profissional (mandato
 * §4.1). Página sem esse vínculo simplesmente não vira candidata — não é erro,
 * é um negócio que ainda não conectou o Instagram à Página.
 *
 * `access_token` da Página **não** é pedido aqui: a 003B precisa primeiro
 * provar se o token da conexão basta, e persistir Page Access Token é decisão
 * arquitetural que não pertence a esta rodada.
 */
export async function discoverInstagramAccounts(input: {
  userId: string;
  organizationId: string;
}): Promise<InstagramDiscovery> {
  const supabase = createSupabasePrivilegedClient();
  const carregada = await carregarConexao({ supabase, ...input });

  if (!carregada.ok) return { ok: false, reason: carregada.reason };

  return descobrirInstagram(carregada.conexao);
}

/**
 * A descoberta em si, sobre uma conexão já carregada.
 *
 * Separada do export porque a seleção precisa exatamente da mesma lista, e
 * recarregar conexão e token duas vezes por clique significaria ler o segredo
 * do Vault duas vezes sem necessidade.
 */
async function descobrirInstagram(
  conexao: Conexao,
): Promise<InstagramDiscovery> {
  if (!conexao.capabilities.instagram_discovery) {
    return { ok: false, reason: "MISSING_PERMISSION" };
  }

  const base = graphApiBaseUrl(readMetaEnv().META_GRAPH_API_VERSION);

  const paginas = await descobrirPaginas({ conexao, base });

  if (!paginas.ok) return { ok: false, reason: paginas.reason };

  const vinculos = paginas.itens.flatMap((pagina) => {
    const pageId = texto(pagina.id);
    if (!pageId) return [];

    const vinculo = pagina.instagram_business_account;
    const igId =
      typeof vinculo === "object" && vinculo !== null
        ? texto((vinculo as Record<string, unknown>).id)
        : null;

    if (!igId) return [];

    return [{ pageId, pageName: texto(pagina.name), igId }];
  });

  const candidates: InstagramCandidate[] = [];

  for (const vinculo of vinculos) {
    const metadados = await lerMetadadosInstagram({
      base,
      igId: vinculo.igId,
      accessToken: conexao.token,
    });

    // A recusa derruba a descoberta inteira, e não só este candidato: uma
    // lista parcial faria a tela oferecer contas legíveis e esconder que outra
    // existe mas não pôde ser lida.
    if (!metadados.ok) return { ok: false, reason: metadados.reason };

    // Campos ausentes num 2xx são outra coisa: a conta existe e o vínculo já
    // provou que pertence a esta Página. A tela mostra o que tiver.
    candidates.push({
      externalInstagramAccountId: vinculo.igId,
      externalPageId: vinculo.pageId,
      pageName: vinculo.pageName,
      username: metadados.metadados.username,
      name: metadados.metadados.name,
      accountType: metadados.metadados.accountType,
    });
  }

  return { ok: true, pagesFound: paginas.itens.length, candidates };
}

type MetadadosInstagram = {
  username: string | null;
  name: string | null;
  accountType: string | null;
};

/**
 * Metadados mínimos de uma conta profissional. Somente leitura.
 *
 * **Campo ausente e leitura recusada são coisas diferentes.** Um HTTP 200 sem
 * `username` é uma conta que a Meta não descreve — o candidato continua
 * válido, com metadata nula. Um 4xx/5xx ou uma falha de rede é a Meta dizendo
 * que este token **não lê este IG User**, e é precisamente o gate arquitetural
 * que o mandato 003B §4.1 antecipa: pode significar necessidade de Page Access
 * Token, decisão que não pertence a esta rodada.
 *
 * Colapsar os dois casos em `null` faria a descoberta seguir com um candidato
 * que ninguém consegue ler, e a seleção o gravaria. Por isso a recusa sobe
 * como falha de domínio, e a descoberta inteira falha fechado
 * (Correção 003B-01 §2).
 */
async function lerMetadadosInstagram(input: {
  base: string;
  igId: string;
  accessToken: string;
}): Promise<
  { ok: true; metadados: MetadadosInstagram } | { ok: false; reason: AssetFailure }
> {
  const url = new URL(`${input.base}/${input.igId}`);
  url.searchParams.set("fields", "id,username,name");
  url.searchParams.set("access_token", input.accessToken);

  let resposta: Response;

  try {
    resposta = await fetch(url, { method: "GET" });
  } catch {
    return { ok: false, reason: "PROVIDER_UNAVAILABLE" };
  }

  const corpo = (await resposta.json().catch(() => null)) as
    | (Record<string, unknown> & {
        error?: { code?: unknown; error_subcode?: unknown };
      })
    | null;

  if (!resposta.ok) {
    const erro = corpo?.error;
    const code = typeof erro?.code === "number" ? erro.code : null;

    // Sem `message` e sem a URL: as duas podem citar o token.
    console.error("leitura do IG User recusada", {
      http: resposta.status,
      code,
      subcode:
        typeof erro?.error_subcode === "number" ? erro.error_subcode : null,
    });

    return { ok: false, reason: classificarRecusa(code) };
  }

  // 2xx sem corpo legível não é "sem metadata": é uma resposta que não sabemos
  // ler, e afirmar sobre ela seria inventar.
  if (!corpo) return { ok: false, reason: "PROVIDER_UNAVAILABLE" };

  return {
    ok: true,
    metadados: {
      username: texto(corpo.username),
      name: texto(corpo.name),
      // A Graph API com Facebook Login não expõe `account_type` no IG User.
      // O campo existe no modelo para quando/se o provider passar a expô-lo.
      accountType: texto(corpo.account_type),
    },
  };
}

// ---------------------------------------------------------------------------
// Descoberta — contas de anúncios (opcional)
// ---------------------------------------------------------------------------

/**
 * Contas de anúncios, quando `ads_read` foi concedido.
 *
 * A ausência dessa permissão devolve `authorized: false` e nunca uma falha: o
 * usuário do modo orgânico não deve ver a integração quebrada por não ter
 * autorizado mídia paga (mandato §4.2).
 */
export async function discoverAdAccounts(input: {
  userId: string;
  organizationId: string;
}): Promise<AdAccountDiscovery> {
  const supabase = createSupabasePrivilegedClient();
  const carregada = await carregarConexao({ supabase, ...input });

  if (!carregada.ok) return { ok: false, reason: carregada.reason };

  return descobrirAdAccounts(carregada.conexao);
}

async function descobrirAdAccounts(
  conexao: Conexao,
): Promise<AdAccountDiscovery> {
  if (!conexao.capabilities.ads_discovery) return { ok: true, authorized: false };

  const base = graphApiBaseUrl(readMetaEnv().META_GRAPH_API_VERSION);

  const listagem = await lerListagem({
    base,
    path: "me/adaccounts",
    fields: "id,name,account_status,currency,timezone_name",
    accessToken: conexao.token,
  });

  if (!listagem.ok) return { ok: false, reason: listagem.reason };

  const accounts = listagem.itens.flatMap((conta) => {
    const id = texto(conta.id);
    if (!id) return [];

    return [
      {
        externalAdAccountId: id,
        name: texto(conta.name),
        currency: texto(conta.currency),
        timezoneName: texto(conta.timezone_name),
        providerAccountStatus:
          typeof conta.account_status === "number"
            ? String(conta.account_status)
            : texto(conta.account_status),
      },
    ];
  });

  return { ok: true, authorized: true, accounts };
}

// ---------------------------------------------------------------------------
// Seleção
// ---------------------------------------------------------------------------

/**
 * Grava a conta do Instagram escolhida.
 *
 * A redescoberta antes da escrita não é redundância: é o que impede que um id
 * digitado no formulário — ou pertencente ao conjunto de ativos de outra
 * conexão — vire uma linha de `instagram_accounts`. O servidor só grava o que
 * ele próprio acabou de ver na resposta da Meta.
 */
export async function selectInstagramAccount(input: {
  userId: string;
  organizationId: string;
  externalInstagramAccountId: string;
}): Promise<SelectionResult> {
  const supabase = createSupabasePrivilegedClient();
  const carregada = await carregarConexao({ supabase, ...input });

  if (!carregada.ok) return { ok: false, reason: carregada.reason };

  const descoberta = await descobrirInstagram(carregada.conexao);

  if (!descoberta.ok) return { ok: false, reason: descoberta.reason };

  const escolhido = descoberta.candidates.find(
    (c) => c.externalInstagramAccountId === input.externalInstagramAccountId,
  );

  if (!escolhido) return { ok: false, reason: "ASSET_NOT_FOUND" };

  // Membership de novo, agora que a redescoberta terminou.
  //
  // A primeira checagem autorizou *começar*; entre ela e este ponto houve uma
  // ou mais idas à Meta, de duração indeterminada. A gravação usa
  // `service_role`, então RLS não a barra — se a pessoa deixou a organização
  // nesse intervalo, é aqui que isso precisa ser notado
  // (Correção 003B-01 §3, mesmo raciocínio do callback OAuth da 003A).
  if (!(await hasActiveMembership(supabase, input.userId, input.organizationId))) {
    return { ok: false, reason: "NO_MEMBERSHIP" };
  }

  const { error } = await supabase.rpc("select_instagram_account", {
    p_organization_id: input.organizationId,
    p_connection_id: carregada.conexao.id,
    p_user_id: input.userId,
    p_external_instagram_account_id: escolhido.externalInstagramAccountId,
    p_external_page_id: escolhido.externalPageId,
    p_username: escolhido.username,
    p_display_name: escolhido.name,
    p_account_type: escolhido.accountType,
  });

  if (error) {
    console.error("falha ao gravar selecao de instagram", {
      connectionId: carregada.conexao.id,
      code: error.code,
    });
    return { ok: false, reason: "PERSIST_FAILED" };
  }

  return { ok: true };
}

/** Mesma disciplina da seleção de Instagram, no ramo opcional. */
export async function selectAdAccount(input: {
  userId: string;
  organizationId: string;
  externalAdAccountId: string;
}): Promise<SelectionResult> {
  const supabase = createSupabasePrivilegedClient();
  const carregada = await carregarConexao({ supabase, ...input });

  if (!carregada.ok) return { ok: false, reason: carregada.reason };

  const descoberta = await descobrirAdAccounts(carregada.conexao);

  if (!descoberta.ok) return { ok: false, reason: descoberta.reason };
  if (!descoberta.authorized) return { ok: false, reason: "MISSING_PERMISSION" };

  const escolhida = descoberta.accounts.find(
    (c) => c.externalAdAccountId === input.externalAdAccountId,
  );

  if (!escolhida) return { ok: false, reason: "ASSET_NOT_FOUND" };

  // Mesma reconferência do ramo principal: a ida à Meta abriu um intervalo, e
  // autorização é fato temporal.
  if (!(await hasActiveMembership(supabase, input.userId, input.organizationId))) {
    return { ok: false, reason: "NO_MEMBERSHIP" };
  }

  const { error } = await supabase.rpc("select_ad_account", {
    p_organization_id: input.organizationId,
    p_connection_id: carregada.conexao.id,
    p_user_id: input.userId,
    p_external_ad_account_id: escolhida.externalAdAccountId,
    p_name: escolhida.name,
    p_currency: escolhida.currency,
    p_timezone_name: escolhida.timezoneName,
    p_provider_account_status: escolhida.providerAccountStatus,
  });

  if (error) {
    console.error("falha ao gravar selecao de conta de anuncios", {
      connectionId: carregada.conexao.id,
      code: error.code,
    });
    return { ok: false, reason: "PERSIST_FAILED" };
  }

  return { ok: true };
}
