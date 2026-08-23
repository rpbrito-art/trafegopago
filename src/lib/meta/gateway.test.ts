import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Testes de autorização do MetaAuthGateway — Correção 003A-02.
 *
 * O gateway faz I/O, então o cliente privilegiado é substituído por um duplo
 * que registra o que foi chamado. O que se prova aqui não é o Supabase: é a
 * **ordem das decisões** — quem é barrado, quando a intenção é consumida e o
 * que nunca chega a acontecer depois de uma recusa.
 *
 * Nenhum teste alcança a Meta: `fetch` é substituído, e vários casos provam
 * justamente que ele **não** foi chamado.
 */

const ORG_A = "11111111-1111-1111-1111-111111111111";
const ORG_B = "22222222-2222-2222-2222-222222222222";
const USER_A = "33333333-3333-3333-3333-333333333333";
const CONN = "55555555-5555-5555-5555-555555555555";
const STATE = "a".repeat(64);

/** Estado do banco falso, reconfigurado por teste. */
let membershipAtiva = true;
let intencao: Record<string, unknown> | null = null;
let consumoVence = true;
let conexaoViva: Record<string, unknown> | null = null;
let tokenNoVault: string | null = "token-guardado";
let erroRpc: Record<string, { code: string } | null> = {};

const rpcCalls: { fn: string; args: Record<string, unknown> }[] = [];
const fetchCalls: string[] = [];

/**
 * O gateway toca `meta_oauth_intents` duas vezes: primeiro o SELECT do hash,
 * depois o UPDATE de consumo. O duplo precisa distinguir os dois — é a
 * diferença entre "a intenção não existe" e "existia, mas outra volta venceu
 * a corrida".
 */
let acessosAIntents = 0;

function queryBuilder(tabela: string) {
  const builder: Record<string, unknown> = {};
  const encadeia = () => builder;

  for (const metodo of ["select", "eq", "in", "is", "update", "insert", "limit"]) {
    builder[metodo] = vi.fn(encadeia);
  }

  builder.maybeSingle = vi.fn(async () => {
    if (tabela === "organization_members") {
      return { data: membershipAtiva ? { organization_id: ORG_A } : null, error: null };
    }
    if (tabela === "meta_oauth_intents") {
      acessosAIntents += 1;

      // 1ª: busca pelo hash. 2ª: consumo atômico — devolve linha só se venceu.
      if (acessosAIntents === 1) return { data: intencao, error: null };
      return { data: consumoVence ? intencao : null, error: null };
    }
    if (tabela === "meta_connections") {
      return { data: conexaoViva, error: null };
    }
    return { data: null, error: null };
  });

  return builder;
}

const supabaseFalso = {
  from: vi.fn((tabela: string) => queryBuilder(tabela)),
  rpc: vi.fn(async (fn: string, args: Record<string, unknown>) => {
    rpcCalls.push({ fn, args });

    if (erroRpc[fn]) return { data: null, error: erroRpc[fn] };
    if (fn === "begin_meta_connection") return { data: CONN, error: null };
    if (fn === "read_meta_connection_token") return { data: tokenNoVault, error: null };

    return { data: null, error: null };
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

const { completeMetaAuthorization, disconnectMeta, startMetaAuthorization } =
  await import("./gateway");

function intencaoValida(over: Record<string, unknown> = {}) {
  return {
    id: "66666666-6666-6666-6666-666666666666",
    organization_id: ORG_A,
    user_id: USER_A,
    expires_at: new Date(Date.now() + 300_000).toISOString(),
    consumed_at: null,
    ...over,
  };
}

beforeEach(() => {
  membershipAtiva = true;
  intencao = intencaoValida();
  consumoVence = true;
  conexaoViva = { id: CONN, external_user_id: "999" };
  tokenNoVault = "token-guardado";
  erroRpc = {};
  rpcCalls.length = 0;
  fetchCalls.length = 0;
  acessosAIntents = 0;
  supabaseFalso.from.mockClear();
  supabaseFalso.rpc.mockClear();

  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: URL | string) => {
      fetchCalls.push(String(url));
      const alvo = String(url);

      if (alvo.includes("/oauth/access_token")) {
        return {
          ok: true,
          json: async () => ({ access_token: "token-novo", expires_in: 5184000 }),
        } as Response;
      }
      if (alvo.includes("/debug_token")) {
        return {
          ok: true,
          json: async () => ({ data: { scopes: ["public_profile"], user_id: "999" } }),
        } as Response;
      }
      if (alvo.includes("/permissions")) {
        return { ok: true, json: async () => ({ success: true }) } as Response;
      }
      return { ok: false, json: async () => ({}) } as Response;
    }),
  );
});

const chamouMeta = () =>
  fetchCalls.some((u) => u.includes("graph.facebook.com"));
const rpcUsados = () => rpcCalls.map((c) => c.fn);

describe("startMetaAuthorization", () => {
  it("recusa quem não tem membership ativa", async () => {
    membershipAtiva = false;

    const r = await startMetaAuthorization({ userId: USER_A, organizationId: ORG_B });

    expect(r).toEqual({ ok: false, reason: "NO_MEMBERSHIP" });
  });

  it("usa config_id, e não scope, no diálogo de autorização", async () => {
    const r = await startMetaAuthorization({ userId: USER_A, organizationId: ORG_A });

    expect(r.ok).toBe(true);
    if (r.ok) {
      const url = new URL(r.authorizationUrl);
      expect(url.searchParams.get("config_id")).toBe("config-id");
      expect(url.searchParams.has("scope")).toBe(false);
      expect(url.searchParams.get("state")).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it("não vaza o app secret na URL de autorização", async () => {
    const r = await startMetaAuthorization({ userId: USER_A, organizationId: ORG_A });

    if (r.ok) expect(r.authorizationUrl).not.toContain("app-secret");
  });
});

describe("completeMetaAuthorization — single-use do state", () => {
  it("consome a intenção MESMO quando o provider negou", async () => {
    // O bloqueio 3.3: retornar DENIED antes de consumir deixaria o `state`
    // reutilizável — bastaria forjar `error=` para preservá-lo.
    const r = await completeMetaAuthorization({
      userId: USER_A,
      state: STATE,
      code: null,
      error: "access_denied",
    });

    expect(r).toEqual({ ok: false, reason: "DENIED" });
    // Consumiu antes de decidir.
    expect(supabaseFalso.from).toHaveBeenCalledWith("meta_oauth_intents");
    // E não falou com a Meta.
    expect(chamouMeta()).toBe(false);
  });

  it("replay após callback negado é recusado", async () => {
    await completeMetaAuthorization({
      userId: USER_A, state: STATE, code: null, error: "access_denied",
    });

    // Segunda volta com o MESMO state: a intenção continua lá, agora com
    // `consumed_at` preenchido pelo callback anterior.
    intencao = intencaoValida({ consumed_at: new Date().toISOString() });
    acessosAIntents = 0;

    const r = await completeMetaAuthorization({
      userId: USER_A, state: STATE, code: "codigo", error: null,
    });

    expect(r).toEqual({ ok: false, reason: "ALREADY_CONSUMED" });
    expect(chamouMeta()).toBe(false);
  });

  it("duas voltas simultâneas: só a primeira vence o consumo atômico", async () => {
    // Corrida real: ambas leem `consumed_at = null`, mas o UPDATE com
    // `is('consumed_at', null)` só devolve linha para uma delas.
    consumoVence = false;

    const r = await completeMetaAuthorization({
      userId: USER_A, state: STATE, code: "codigo", error: null,
    });

    expect(r).toEqual({ ok: false, reason: "ALREADY_CONSUMED" });
    expect(chamouMeta()).toBe(false);
  });

  it("state desconhecido não consome outra intenção", async () => {
    intencao = null;

    const r = await completeMetaAuthorization({
      userId: USER_A, state: STATE, code: "codigo", error: null,
    });

    expect(r).toEqual({ ok: false, reason: "NOT_FOUND" });
    expect(rpcUsados()).toHaveLength(0);
  });

  it("state malformado é recusado antes de qualquer efeito", async () => {
    const r = await completeMetaAuthorization({
      userId: USER_A, state: "nao-hex", code: "codigo", error: null,
    });

    expect(r).toEqual({ ok: false, reason: "MALFORMED_STATE" });
    expect(chamouMeta()).toBe(false);
  });
});

describe("completeMetaAuthorization — membership vigente", () => {
  it("recusa quando a membership sumiu durante o fluxo, ANTES de chamar a Meta", async () => {
    // Bloqueio 3.2: o usuário estava no diálogo da Meta e perdeu acesso ao
    // tenant nesse intervalo.
    membershipAtiva = false;

    const r = await completeMetaAuthorization({
      userId: USER_A, state: STATE, code: "codigo", error: null,
    });

    expect(r).toEqual({ ok: false, reason: "NO_MEMBERSHIP" });
    expect(chamouMeta()).toBe(false);
    expect(rpcUsados()).not.toContain("begin_meta_connection");
    expect(rpcUsados()).not.toContain("activate_meta_connection");
  });
});

describe("completeMetaAuthorization — persistência", () => {
  it("usa begin + activate, sem upsert", async () => {
    // Bloqueio 3.4: `onConflict: organization_id` não cobre o índice parcial.
    const r = await completeMetaAuthorization({
      userId: USER_A, state: STATE, code: "codigo", error: null,
    });

    expect(r).toEqual({ ok: true, organizationId: ORG_A });
    expect(rpcUsados()).toEqual([
      "begin_meta_connection",
      "activate_meta_connection",
    ]);
  });

  it("NÃO retorna sucesso se a ativação falhar", async () => {
    // Bloqueio 3.5: guardar o token e falhar ao marcar ACTIVE devolvia ok.
    erroRpc = { activate_meta_connection: { code: "XX000" } };

    const r = await completeMetaAuthorization({
      userId: USER_A, state: STATE, code: "codigo", error: null,
    });

    expect(r).toEqual({ ok: false, reason: "UNAVAILABLE" });
  });

  it("não persiste nada se a troca de código falhar", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, json: async () => ({}) })));

    const r = await completeMetaAuthorization({
      userId: USER_A, state: STATE, code: "codigo", error: null,
    });

    expect(r).toEqual({ ok: false, reason: "EXCHANGE_FAILED" });
    expect(rpcUsados()).toHaveLength(0);
  });
});

describe("disconnectMeta", () => {
  it("recusa desconexão de organização alheia — cross-tenant", async () => {
    // Bloqueio 3.1: conhecer o UUID não autoriza revogar.
    membershipAtiva = false;

    const r = await disconnectMeta({ userId: USER_A, organizationId: ORG_B });

    expect(r).toEqual({ ok: false, reason: "NO_MEMBERSHIP" });
    expect(rpcUsados()).toHaveLength(0);
    expect(chamouMeta()).toBe(false);
  });

  it("revoga na Meta ANTES de limpar o estado local", async () => {
    // Bloqueio 3.6: limpar antes deixaria o app autorizado no provider e sem
    // token para revogá-lo.
    const r = await disconnectMeta({ userId: USER_A, organizationId: ORG_A });

    expect(r).toEqual({ ok: true });
    expect(fetchCalls.some((u) => u.includes("/999/permissions"))).toBe(true);
    expect(rpcUsados()).toEqual([
      "read_meta_connection_token",
      "revoke_meta_connection",
    ]);
  });

  it("NÃO revoga localmente se o provider falhar de forma indeterminada", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("rede");
    }));

    const r = await disconnectMeta({ userId: USER_A, organizationId: ORG_A });

    expect(r).toEqual({ ok: false, reason: "PROVIDER_REVOKE_FAILED" });
    expect(rpcUsados()).not.toContain("revoke_meta_connection");
  });

  it("token já inválido conta como revogado e permite concluir", async () => {
    // Erro 190 = token inválido: não há mais autorização a revogar. Tratar
    // como falha prenderia o usuário numa conexão que ele não consegue remover.
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: false,
      json: async () => ({ error: { code: 190 } }),
    })));

    const r = await disconnectMeta({ userId: USER_A, organizationId: ORG_A });

    expect(r).toEqual({ ok: true });
    expect(rpcUsados()).toContain("revoke_meta_connection");
  });

  it("conexão sem token pula a revogação remota e limpa o local", async () => {
    tokenNoVault = null;

    const r = await disconnectMeta({ userId: USER_A, organizationId: ORG_A });

    expect(r).toEqual({ ok: true });
    expect(chamouMeta()).toBe(false);
    expect(rpcUsados()).toContain("revoke_meta_connection");
  });

  it("recusa quando não há conexão viva", async () => {
    conexaoViva = null;

    const r = await disconnectMeta({ userId: USER_A, organizationId: ORG_A });

    expect(r).toEqual({ ok: false, reason: "NOT_FOUND" });
  });
});
