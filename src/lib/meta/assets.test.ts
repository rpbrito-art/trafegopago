import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * MetaAssetGateway — provas da Rodada 003B §6.
 *
 * O Supabase e a Meta são substituídos por duplos. O que se prova aqui não é
 * o provider: é **a ordem das decisões** — quem é barrado antes de o token ser
 * lido, o que nunca chega a acontecer depois de uma recusa, e que o servidor
 * grava apenas o ativo que ele próprio acabou de ver na resposta da Meta.
 */

const ORG_A = "11111111-1111-1111-1111-111111111111";
const USER_A = "33333333-3333-3333-3333-333333333333";
const CONN = "55555555-5555-5555-5555-555555555555";
const TOKEN = "token-guardado-no-vault";

/** Estado do banco falso. */
let membershipAtiva = true;
/**
 * A partir de qual checagem a membership deixa de existir.
 *
 * `null` significa "não muda". Serve para reproduzir a pessoa removida da
 * organização **durante** a ida à Meta: a primeira checagem passa, a segunda
 * — a que acontece logo antes da gravação — já não.
 */
let membershipCaiNaChecagem: number | null = null;
let checagensDeMembership = 0;
let conexaoAtiva: Record<string, unknown> | null = null;
let tokenNoVault: string | null = TOKEN;
let erroLeituraToken: { code: string } | null = null;
let erroRpc: Record<string, { code: string } | null> = {};

/** Estado da Meta falsa. */
type PaginaMeta = {
  data: unknown;
  paging?: { cursors?: { after?: string }; next?: string };
};
let paginasDeContas: PaginaMeta[] = [];
let respostaAdAccounts: PaginaMeta = { data: [] };
let falhaDaMeta: { http: number; code?: number } | null = null;
let redeQuebrada = false;
/** Desfecho específico da leitura de metadados do IG User. */
let metadataIg:
  | { tipo: "ok"; corpo: Record<string, unknown> }
  | { tipo: "http"; http: number; code?: number }
  | { tipo: "rede" }
  | { tipo: "corpo-ilegivel" } = { tipo: "ok", corpo: {} };

const rpcCalls: { fn: string; args: Record<string, unknown> }[] = [];
const fetchCalls: string[] = [];

function queryBuilder(tabela: string) {
  const builder: Record<string, unknown> = {};
  const encadeia = () => builder;

  for (const metodo of ["select", "eq", "in", "limit"]) {
    builder[metodo] = vi.fn(encadeia);
  }

  builder.maybeSingle = vi.fn(async () => {
    if (tabela === "organization_members") {
      checagensDeMembership += 1;

      const caiu =
        membershipCaiNaChecagem !== null &&
        checagensDeMembership >= membershipCaiNaChecagem;

      return {
        data: membershipAtiva && !caiu ? { organization_id: ORG_A } : null,
        error: null,
      };
    }
    if (tabela === "meta_connections") {
      return { data: conexaoAtiva, error: null };
    }
    return { data: null, error: null };
  });

  return builder;
}

const supabaseFalso = {
  from: vi.fn((tabela: string) => queryBuilder(tabela)),
  rpc: vi.fn(async (fn: string, args: Record<string, unknown>) => {
    rpcCalls.push({ fn, args });

    if (fn === "read_meta_connection_token") {
      if (erroLeituraToken) return { data: null, error: erroLeituraToken };
      return { data: tokenNoVault, error: null };
    }

    if (erroRpc[fn]) return { data: null, error: erroRpc[fn] };

    return { data: "77777777-7777-7777-7777-777777777777", error: null };
  }),
};

vi.mock("@/lib/supabase/privileged", () => ({
  createSupabasePrivilegedClient: () => supabaseFalso,
}));

vi.mock("./config", async () => {
  const real = await vi.importActual<typeof import("./config")>("./config");
  return {
    ...real,
    readMetaEnv: () => ({
      META_APP_ID: "app-id",
      META_APP_SECRET: "app-secret",
      META_LOGIN_CONFIG_ID: "config-id",
      META_OAUTH_REDIRECT_URI: "http://localhost:3000/meta/callback",
      META_GRAPH_API_VERSION: "v26.0",
    }),
  };
});

const {
  discoverAdAccounts,
  discoverInstagramAccounts,
  selectAdAccount,
  selectInstagramAccount,
} = await import("./assets");

const ESCOPOS_INSTAGRAM = [
  "pages_show_list",
  "pages_read_engagement",
  "instagram_basic",
  "instagram_manage_insights",
];

function conexao(scopes: string[] = ESCOPOS_INSTAGRAM) {
  return { id: CONN, granted_scopes: scopes };
}

/** Uma Página com conta profissional vinculada. */
function pagina(id: string, igId: string | null, nome = `Página ${id}`) {
  return {
    id,
    name: nome,
    ...(igId ? { instagram_business_account: { id: igId } } : {}),
  };
}

const PEDIDO = { userId: USER_A, organizationId: ORG_A };

beforeEach(() => {
  membershipAtiva = true;
  membershipCaiNaChecagem = null;
  checagensDeMembership = 0;
  metadataIg = { tipo: "ok", corpo: {} };
  conexaoAtiva = conexao();
  tokenNoVault = TOKEN;
  erroLeituraToken = null;
  erroRpc = {};
  paginasDeContas = [{ data: [pagina("page-1", "ig-1")] }];
  respostaAdAccounts = { data: [] };
  falhaDaMeta = null;
  redeQuebrada = false;
  rpcCalls.length = 0;
  fetchCalls.length = 0;
  supabaseFalso.from.mockClear();
  supabaseFalso.rpc.mockClear();

  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: URL | string) => {
      const alvo = String(url);
      fetchCalls.push(alvo);

      if (redeQuebrada) throw new Error("rede");

      if (falhaDaMeta) {
        return {
          ok: false,
          status: falhaDaMeta.http,
          json: async () => ({
            error: {
              type: "OAuthException",
              code: falhaDaMeta?.code ?? 1,
            },
          }),
        } as Response;
      }

      if (alvo.includes("/me/accounts")) {
        const cursor = new URL(alvo).searchParams.get("after");
        const indice = cursor ? Number(cursor) : 0;
        const pagina = paginasDeContas[indice] ?? { data: [] };
        return { ok: true, status: 200, json: async () => pagina } as Response;
      }

      if (alvo.includes("/me/adaccounts")) {
        return {
          ok: true,
          status: 200,
          json: async () => respostaAdAccounts,
        } as Response;
      }

      // Metadados do IG User.
      const igId = new URL(alvo).pathname.split("/").pop();
      const desfecho = metadataIg;

      if (desfecho.tipo === "rede") throw new Error("rede");

      if (desfecho.tipo === "http") {
        return {
          ok: false,
          status: desfecho.http,
          json: async () => ({
            error: { type: "OAuthException", code: desfecho.code ?? 1 },
          }),
        } as Response;
      }

      if (desfecho.tipo === "corpo-ilegivel") {
        return {
          ok: true,
          status: 200,
          json: async () => {
            throw new Error("corpo ilegível");
          },
        } as unknown as Response;
      }

      return {
        ok: true,
        status: 200,
        json: async () => ({
          id: igId,
          username: `perfil_${igId}`,
          name: `Nome ${igId}`,
          ...desfecho.corpo,
        }),
      } as Response;
    }),
  );
});

// ---------------------------------------------------------------------------
// Segurança e tenancy
// ---------------------------------------------------------------------------

describe("descoberta — quem é barrado antes de qualquer coisa", () => {
  it("sem membership ativa não lê token nem chama a Meta", () => {
    membershipAtiva = false;

    return discoverInstagramAccounts(PEDIDO).then((r) => {
      expect(r).toEqual({ ok: false, reason: "NO_MEMBERSHIP" });
      expect(rpcCalls).toHaveLength(0);
      expect(fetchCalls).toHaveLength(0);
    });
  });

  it("organização sem conexão ativa não expõe nada do provider", async () => {
    // Também é o caso de uma conexão que existe em OUTRA organização: a
    // consulta filtra por `organization_id`, então ela simplesmente não existe
    // do ponto de vista deste pedido.
    conexaoAtiva = null;

    const r = await discoverInstagramAccounts(PEDIDO);

    expect(r).toEqual({ ok: false, reason: "NOT_CONNECTED" });
    expect(fetchCalls).toHaveLength(0);
  });

  it("falha ao ler o token não vira 'sem token' nem segue adiante", async () => {
    erroLeituraToken = { code: "42501" };

    const r = await discoverInstagramAccounts(PEDIDO);

    expect(r).toEqual({ ok: false, reason: "TOKEN_UNAVAILABLE" });
    expect(fetchCalls).toHaveLength(0);
  });

  it("o token não aparece no que volta para quem chamou", async () => {
    const r = await discoverInstagramAccounts(PEDIDO);

    expect(JSON.stringify(r)).not.toContain(TOKEN);
  });

  it("permissão não concedida não gasta chamada à Meta", async () => {
    conexaoAtiva = conexao(["pages_show_list"]);

    const r = await discoverInstagramAccounts(PEDIDO);

    expect(r).toEqual({ ok: false, reason: "MISSING_PERMISSION" });
    expect(fetchCalls).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Descoberta de Instagram
// ---------------------------------------------------------------------------

describe("descoberta de Instagram", () => {
  it("nenhuma Página é estado vazio distinguível", async () => {
    paginasDeContas = [{ data: [] }];

    const r = await discoverInstagramAccounts(PEDIDO);

    expect(r).toMatchObject({ ok: true, pagesFound: 0, candidates: [] });
  });

  it("Página sem Instagram vinculado não vira candidata", async () => {
    paginasDeContas = [{ data: [pagina("page-1", null)] }];

    const r = await discoverInstagramAccounts(PEDIDO);

    // A distinção importa para a tela: existe Página, falta o vínculo.
    expect(r).toMatchObject({ ok: true, pagesFound: 1, candidates: [] });
  });

  it("uma conta profissional volta com os metadados de exibição", async () => {
    const r = await discoverInstagramAccounts(PEDIDO);

    expect(r).toMatchObject({
      ok: true,
      pagesFound: 1,
      candidates: [
        {
          externalInstagramAccountId: "ig-1",
          externalPageId: "page-1",
          pageName: "Página page-1",
          username: "perfil_ig-1",
          name: "Nome ig-1",
          accountType: null,
        },
      ],
    });
  });

  it("várias Páginas com Instagram viram várias opções", async () => {
    paginasDeContas = [
      { data: [pagina("page-1", "ig-1"), pagina("page-2", null), pagina("page-3", "ig-3")] },
    ];

    const r = await discoverInstagramAccounts(PEDIDO);

    expect(r.ok && r.candidates.map((c) => c.externalInstagramAccountId)).toEqual([
      "ig-1",
      "ig-3",
    ]);
  });

  it("campo ausente num 2xx não elimina o candidato", async () => {
    // O vínculo já provou que a conta existe. Sumir com ela porque a Meta não
    // descreveu o perfil deixaria a pessoa sem opção nenhuma para escolher.
    metadataIg = { tipo: "ok", corpo: { username: null, name: null } };

    const r = await discoverInstagramAccounts(PEDIDO);

    expect(r).toMatchObject({
      ok: true,
      candidates: [
        { externalInstagramAccountId: "ig-1", username: null, name: null },
      ],
    });
  });
});

// ---------------------------------------------------------------------------
// Correção 003B-01 §2 — leitura do IG User falha fechado
// ---------------------------------------------------------------------------

describe("leitura do IG User — recusa não é campo ausente", () => {
  async function selecionar() {
    return selectInstagramAccount({ ...PEDIDO, externalInstagramAccountId: "ig-1" });
  }

  it("credencial recusada derruba a descoberta e não grava nada", async () => {
    // Recusa aqui pode significar que o token da conexão não lê este IG User —
    // o gate arquitetural do mandato §4.1. Seguir com o candidato ofereceria
    // para escolha uma conta que ninguém consegue ler.
    metadataIg = { tipo: "http", http: 400, code: 190 };

    expect(await discoverInstagramAccounts(PEDIDO)).toEqual({
      ok: false,
      reason: "CONNECTION_REJECTED",
    });

    expect(await selecionar()).toEqual({ ok: false, reason: "CONNECTION_REJECTED" });
    expect(rpcCalls.some((c) => c.fn === "select_instagram_account")).toBe(false);
  });

  it("permissão insuficiente na leitura do perfil falha fechado", async () => {
    for (const code of [10, 200]) {
      metadataIg = { tipo: "http", http: 403, code };
      rpcCalls.length = 0;

      expect(await discoverInstagramAccounts(PEDIDO)).toEqual({
        ok: false,
        reason: "MISSING_PERMISSION",
      });
      expect(await selecionar()).toEqual({ ok: false, reason: "MISSING_PERMISSION" });
      expect(rpcCalls.some((c) => c.fn === "select_instagram_account")).toBe(false);
    }
  });

  it("5xx na leitura do perfil não vira candidato gravável", async () => {
    metadataIg = { tipo: "http", http: 500 };

    expect(await discoverInstagramAccounts(PEDIDO)).toEqual({
      ok: false,
      reason: "PROVIDER_UNAVAILABLE",
    });
    expect(await selecionar()).toEqual({ ok: false, reason: "PROVIDER_UNAVAILABLE" });
    expect(rpcCalls.some((c) => c.fn === "select_instagram_account")).toBe(false);
  });

  it("rede quebrada na leitura do perfil não vira candidato gravável", async () => {
    metadataIg = { tipo: "rede" };

    expect(await discoverInstagramAccounts(PEDIDO)).toEqual({
      ok: false,
      reason: "PROVIDER_UNAVAILABLE",
    });
    expect(await selecionar()).toEqual({ ok: false, reason: "PROVIDER_UNAVAILABLE" });
    expect(rpcCalls.some((c) => c.fn === "select_instagram_account")).toBe(false);
  });

  it("2xx com corpo ilegível não é tratado como metadata ausente", async () => {
    metadataIg = { tipo: "corpo-ilegivel" };

    expect(await discoverInstagramAccounts(PEDIDO)).toEqual({
      ok: false,
      reason: "PROVIDER_UNAVAILABLE",
    });
  });

  it("uma conta ilegível derruba a lista inteira, não só ela mesma", async () => {
    // Uma lista parcial ofereceria as contas legíveis e esconderia que existe
    // outra que o token não alcança — exatamente o fato que precisa subir.
    paginasDeContas = [{ data: [pagina("page-1", "ig-1"), pagina("page-2", "ig-2")] }];
    metadataIg = { tipo: "http", http: 400, code: 190 };

    expect((await discoverInstagramAccounts(PEDIDO)).ok).toBe(false);
  });

  it("nada disso é logado com token ou URL", async () => {
    const logs: unknown[][] = [];
    const erro = vi.spyOn(console, "error").mockImplementation((...args) => {
      logs.push(args);
    });

    metadataIg = { tipo: "http", http: 400, code: 190 };
    await discoverInstagramAccounts(PEDIDO);

    erro.mockRestore();

    const texto = JSON.stringify(logs);
    expect(texto).not.toContain(TOKEN);
    expect(texto).not.toContain("graph.facebook.com");
    expect(texto).toContain("190");
  });
});

// ---------------------------------------------------------------------------
// Paginação
// ---------------------------------------------------------------------------

describe("paginação", () => {
  it("segue o cursor reconstruindo a chamada contra o host controlado", async () => {
    paginasDeContas = [
      { data: [pagina("page-1", "ig-1")], paging: { cursors: { after: "1" } } },
      { data: [pagina("page-2", "ig-2")] },
    ];

    const r = await discoverInstagramAccounts(PEDIDO);

    expect(r.ok && r.candidates.map((c) => c.externalInstagramAccountId)).toEqual([
      "ig-1",
      "ig-2",
    ]);

    const listagens = fetchCalls.filter((u) => u.includes("/me/accounts"));
    expect(listagens).toHaveLength(2);
    expect(listagens[1]).toContain("after=1");
    for (const url of listagens) {
      expect(url.startsWith("https://graph.facebook.com/v26.0/")).toBe(true);
    }
  });

  it("nunca segue a URL `next` devolvida pelo provider", async () => {
    // Seguir `paging.next` seria deixar um terceiro escolher para onde o
    // servidor faz request com o token em mãos.
    paginasDeContas = [
      {
        data: [pagina("page-1", "ig-1")],
        paging: {
          cursors: { after: "1" },
          next: "https://atacante.example/roubar?token=1",
        },
      },
      { data: [] },
    ];

    await discoverInstagramAccounts(PEDIDO);

    expect(fetchCalls.some((u) => u.includes("atacante.example"))).toBe(false);
  });

  it("cursor que não termina para no teto de páginas", async () => {
    // Uma listagem que sempre devolve cursor não pode virar laço infinito.
    paginasDeContas = Array.from({ length: 20 }, (_, i) => ({
      data: [pagina(`page-${i}`, null)],
      paging: { cursors: { after: String(i + 1) } },
    }));

    const r = await discoverInstagramAccounts(PEDIDO);

    expect(r.ok).toBe(true);
    expect(fetchCalls.filter((u) => u.includes("/me/accounts")).length).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// Falhas do provider
// ---------------------------------------------------------------------------

describe("falhas do provider — fail closed", () => {
  it("erro de credencial vira estado de tela, não mutação local", async () => {
    falhaDaMeta = { http: 400, code: 190 };

    const r = await discoverInstagramAccounts(PEDIDO);

    expect(r).toEqual({ ok: false, reason: "CONNECTION_REJECTED" });
    // A 003A provou que `190` genérico não é prova de revogação. Nada aqui
    // pode revogar, expirar ou apagar conexão.
    expect(rpcCalls.map((c) => c.fn)).toEqual(["read_meta_connection_token"]);
  });

  it("permissão insuficiente é distinguida de falha temporária", async () => {
    falhaDaMeta = { http: 403, code: 200 };

    expect(await discoverInstagramAccounts(PEDIDO)).toEqual({
      ok: false,
      reason: "MISSING_PERMISSION",
    });
  });

  it("5xx não vira lista vazia", async () => {
    falhaDaMeta = { http: 500 };

    expect(await discoverInstagramAccounts(PEDIDO)).toEqual({
      ok: false,
      reason: "PROVIDER_UNAVAILABLE",
    });
  });

  it("rede quebrada não vira lista vazia", async () => {
    redeQuebrada = true;

    expect(await discoverInstagramAccounts(PEDIDO)).toEqual({
      ok: false,
      reason: "PROVIDER_UNAVAILABLE",
    });
  });
});

// ---------------------------------------------------------------------------
// Contas de anúncios — ramo opcional
// ---------------------------------------------------------------------------

describe("contas de anúncios", () => {
  it("sem ads_read não é erro, é capacidade ausente", async () => {
    const r = await discoverAdAccounts(PEDIDO);

    expect(r).toEqual({ ok: true, authorized: false });
    expect(fetchCalls).toHaveLength(0);
  });

  it("com ads_read lista as contas com os campos mínimos", async () => {
    conexaoAtiva = conexao([...ESCOPOS_INSTAGRAM, "ads_read"]);
    respostaAdAccounts = {
      data: [
        {
          id: "act_123",
          name: "Conta do negócio",
          account_status: 1,
          currency: "BRL",
          timezone_name: "America/Sao_Paulo",
        },
      ],
    };

    const r = await discoverAdAccounts(PEDIDO);

    expect(r).toEqual({
      ok: true,
      authorized: true,
      accounts: [
        {
          externalAdAccountId: "act_123",
          name: "Conta do negócio",
          currency: "BRL",
          timezoneName: "America/Sao_Paulo",
          providerAccountStatus: "1",
        },
      ],
    });
  });

  it("falha na descoberta de anúncios não é falha do Instagram", async () => {
    conexaoAtiva = conexao([...ESCOPOS_INSTAGRAM, "ads_read"]);
    falhaDaMeta = { http: 500 };

    expect(await discoverAdAccounts(PEDIDO)).toEqual({
      ok: false,
      reason: "PROVIDER_UNAVAILABLE",
    });

    // E o Instagram segue descobrível pelo mesmo conjunto de escopos.
    falhaDaMeta = null;
    expect((await discoverInstagramAccounts(PEDIDO)).ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Seleção
// ---------------------------------------------------------------------------

describe("seleção de Instagram", () => {
  it("grava o que o servidor redescobriu, não o que o formulário mandou", async () => {
    const r = await selectInstagramAccount({
      ...PEDIDO,
      externalInstagramAccountId: "ig-1",
    });

    expect(r).toEqual({ ok: true });

    const gravacao = rpcCalls.find((c) => c.fn === "select_instagram_account");
    expect(gravacao?.args).toMatchObject({
      p_organization_id: ORG_A,
      p_connection_id: CONN,
      p_user_id: USER_A,
      p_external_instagram_account_id: "ig-1",
      // A Página e os metadados vêm da resposta da Meta, não do browser.
      p_external_page_id: "page-1",
      p_username: "perfil_ig-1",
    });
  });

  it("id arbitrário é recusado antes de qualquer escrita", async () => {
    const r = await selectInstagramAccount({
      ...PEDIDO,
      externalInstagramAccountId: "ig-de-outra-pessoa",
    });

    expect(r).toEqual({ ok: false, reason: "ASSET_NOT_FOUND" });
    expect(rpcCalls.some((c) => c.fn === "select_instagram_account")).toBe(false);
  });

  it("sem membership não redescobre nem grava", async () => {
    membershipAtiva = false;

    const r = await selectInstagramAccount({
      ...PEDIDO,
      externalInstagramAccountId: "ig-1",
    });

    expect(r).toEqual({ ok: false, reason: "NO_MEMBERSHIP" });
    expect(rpcCalls).toHaveLength(0);
    expect(fetchCalls).toHaveLength(0);
  });

  it("reenviar a mesma escolha repete a mesma gravação idempotente", async () => {
    await selectInstagramAccount({ ...PEDIDO, externalInstagramAccountId: "ig-1" });
    const primeira = rpcCalls.find((c) => c.fn === "select_instagram_account");

    rpcCalls.length = 0;

    await selectInstagramAccount({ ...PEDIDO, externalInstagramAccountId: "ig-1" });
    const segunda = rpcCalls.find((c) => c.fn === "select_instagram_account");

    // Mesmos argumentos: a deduplicação real é do índice único do banco, e é
    // isso que a torna possível.
    expect(segunda?.args).toEqual(primeira?.args);
  });

  it("falha de gravação não é reportada como sucesso", async () => {
    erroRpc = { select_instagram_account: { code: "23503" } };

    expect(
      await selectInstagramAccount({ ...PEDIDO, externalInstagramAccountId: "ig-1" }),
    ).toEqual({ ok: false, reason: "PERSIST_FAILED" });
  });

  it("provider indisponível não grava seleção às cegas", async () => {
    falhaDaMeta = { http: 500 };

    const r = await selectInstagramAccount({
      ...PEDIDO,
      externalInstagramAccountId: "ig-1",
    });

    expect(r).toEqual({ ok: false, reason: "PROVIDER_UNAVAILABLE" });
    expect(rpcCalls.some((c) => c.fn === "select_instagram_account")).toBe(false);
  });
});

describe("seleção de conta de anúncios", () => {
  beforeEach(() => {
    conexaoAtiva = conexao([...ESCOPOS_INSTAGRAM, "ads_read"]);
    respostaAdAccounts = {
      data: [{ id: "act_123", name: "Conta", currency: "BRL" }],
    };
  });

  it("grava a conta redescoberta", async () => {
    const r = await selectAdAccount({ ...PEDIDO, externalAdAccountId: "act_123" });

    expect(r).toEqual({ ok: true });
    expect(
      rpcCalls.find((c) => c.fn === "select_ad_account")?.args,
    ).toMatchObject({
      p_external_ad_account_id: "act_123",
      p_currency: "BRL",
    });
  });

  it("conta de outra pessoa é recusada", async () => {
    const r = await selectAdAccount({ ...PEDIDO, externalAdAccountId: "act_999" });

    expect(r).toEqual({ ok: false, reason: "ASSET_NOT_FOUND" });
    expect(rpcCalls.some((c) => c.fn === "select_ad_account")).toBe(false);
  });

  it("sem ads_read a seleção é recusada sem escrita", async () => {
    conexaoAtiva = conexao(ESCOPOS_INSTAGRAM);

    const r = await selectAdAccount({ ...PEDIDO, externalAdAccountId: "act_123" });

    expect(r).toEqual({ ok: false, reason: "MISSING_PERMISSION" });
    expect(rpcCalls.some((c) => c.fn === "select_ad_account")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Correção 003B-01 §3 — membership é fato temporal
// ---------------------------------------------------------------------------

describe("membership removida durante a ida à Meta", () => {
  it("Instagram: autorização no início não autoriza a gravação no fim", async () => {
    // A gravação usa `service_role`, então RLS não a barra. Sem esta segunda
    // checagem, quem saiu da organização durante a redescoberta ainda
    // conseguiria fixar qual conta ela vai ler.
    membershipCaiNaChecagem = 2;

    const r = await selectInstagramAccount({
      ...PEDIDO,
      externalInstagramAccountId: "ig-1",
    });

    expect(r).toEqual({ ok: false, reason: "NO_MEMBERSHIP" });
    expect(rpcCalls.some((c) => c.fn === "select_instagram_account")).toBe(false);
  });

  it("conta de anúncios: mesma reconferência", async () => {
    conexaoAtiva = conexao([...ESCOPOS_INSTAGRAM, "ads_read"]);
    respostaAdAccounts = { data: [{ id: "act_123", name: "Conta", currency: "BRL" }] };
    membershipCaiNaChecagem = 2;

    const r = await selectAdAccount({ ...PEDIDO, externalAdAccountId: "act_123" });

    expect(r).toEqual({ ok: false, reason: "NO_MEMBERSHIP" });
    expect(rpcCalls.some((c) => c.fn === "select_ad_account")).toBe(false);
  });

  it("membership que permanece ativa continua gravando", async () => {
    const r = await selectInstagramAccount({
      ...PEDIDO,
      externalInstagramAccountId: "ig-1",
    });

    expect(r).toEqual({ ok: true });
    // Duas checagens: uma para começar, outra imediatamente antes da escrita.
    expect(checagensDeMembership).toBe(2);
    expect(rpcCalls.some((c) => c.fn === "select_instagram_account")).toBe(true);
  });
});
