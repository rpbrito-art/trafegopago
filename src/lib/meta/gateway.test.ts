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
/** Tipo que o `debug_token` devolve para o token da desconexão. */
let tipoDoToken: string = "SYSTEM_USER";
/** `is_valid` devolvido a cada chamada de `debug_token`, em ordem. */
let validadeDoToken: boolean[] = [true, false];
let chamadasDebug = 0;
/**
 * `client_business_id` devolvido por `GET /me` — a marca do BISU.
 * `null` significa credencial que não é BISU.
 */
let negocioDoToken: string | null = "negocio-123";
/**
 * Corpo cru de `GET /me`, quando o teste precisa de um que a montagem
 * padrão não produz — `{}`, `id` ausente, tipo inválido.
 */
let corpoDoMe: Record<string, unknown> | null | "PADRAO" = "PADRAO";
/**
 * Desfecho de `GET /me?fields=id` — o segundo braço da prova composta.
 * `"REMOVIDO"` reproduz a assinatura real observada na 003A-09.
 */
let meComTokenAlvo:
  | "OPERA"
  | "REMOVIDO"
  | "SEM_SUBCODE"
  | "OUTRO_SUBCODE"
  | "OUTRO_CODE"
  | "HTTP_500"
  | "REDE" = "REMOVIDO";
/** O app token de controle está saudável? */
let appTokenSaudavel = true;

/** Instante fixo — o marcador de remoção pendente é só "existe ou não". */
const AGORA = "2026-08-24T12:00:00.000Z";
/** Desfecho do endpoint de revogação. */
let revogacaoResponde: "sucesso" | "erro190" | "erro100" | "http500" = "sucesso";
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

const {
  checkMetaDisconnection,
  completeMetaAuthorization,
  disconnectMeta,
  startMetaAuthorization,
} = await import("./gateway");

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
  conexaoViva = {
    id: CONN,
    external_user_id: "999",
    external_disconnect_pending_at: null,
  };
  tokenNoVault = "token-guardado";
  tipoDoToken = "SYSTEM_USER";
  // Padrão: válido antes de revogar, inválido depois — o caminho feliz.
  validadeDoToken = [true, false];
  chamadasDebug = 0;
  revogacaoResponde = "sucesso";
  // Padrão: a credencial real da 003A — BISU emitido pelo Login for Business.
  negocioDoToken = "negocio-123";
  corpoDoMe = "PADRAO";
  meComTokenAlvo = "REMOVIDO";
  appTokenSaudavel = true;
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
        // Controle da prova composta: o app inspecionando a si mesmo.
        if (alvo.includes(`input_token=${encodeURIComponent("app-id|app-secret")}`)) {
          if (!appTokenSaudavel) {
            return { ok: false, json: async () => ({}) } as Response;
          }
          return {
            ok: true,
            json: async () => ({ data: { type: "APP", is_valid: true } }),
          } as Response;
        }

        const i = Math.min(chamadasDebug, validadeDoToken.length - 1);
        const valida = validadeDoToken[i];
        chamadasDebug += 1;

        return {
          ok: true,
          json: async () => ({
            data: {
              scopes: ["public_profile"],
              user_id: "999",
              type: tipoDoToken,
              is_valid: valida,
            },
          }),
        } as Response;
      }
      // Antes de `/me`: `/permissions` também mora sob `/me` quando não há id.
      if (alvo.includes("/permissions")) {
        if (revogacaoResponde === "sucesso") {
          return { ok: true, json: async () => ({ success: "true" }) } as Response;
        }
        if (revogacaoResponde === "http500") {
          return { ok: false, json: async () => ({}) } as Response;
        }
        const code = revogacaoResponde === "erro190" ? 190 : 100;
        return { ok: false, json: async () => ({ error: { code } }) } as Response;
      }
      if (alvo.includes("/me?") && alvo.includes("fields=id")) {
        if (meComTokenAlvo === "REDE") throw new Error("rede");
        if (meComTokenAlvo === "OPERA") {
          return { ok: true, json: async () => ({ id: "999" }) } as Response;
        }
        if (meComTokenAlvo === "HTTP_500") {
          return { ok: false, json: async () => ({}) } as Response;
        }

        const erro =
          meComTokenAlvo === "REMOVIDO"
            ? { type: "OAuthException", code: 190, error_subcode: 464 }
            : meComTokenAlvo === "SEM_SUBCODE"
              ? { type: "OAuthException", code: 190 }
              : meComTokenAlvo === "OUTRO_SUBCODE"
                ? { type: "OAuthException", code: 190, error_subcode: 463 }
                : { type: "OAuthException", code: 200, error_subcode: 464 };

        return { ok: false, json: async () => ({ error: erro }) } as Response;
      }
      if (alvo.includes("/me?") && alvo.includes("client_business_id")) {
        if (negocioDoToken === "HTTP_RUIM") {
          return { ok: false, json: async () => ({ error: { code: 190 } }) } as Response;
        }
        if (corpoDoMe !== "PADRAO") {
          return { ok: true, json: async () => corpoDoMe } as Response;
        }
        return {
          ok: true,
          json: async () => ({
            id: "999",
            // `null` seria "presente e inválido"; ausência é omissão mesmo.
            ...(negocioDoToken !== null
              ? { client_business_id: negocioDoToken }
              : {}),
          }),
        } as Response;
      }
      if (alvo.includes("/oauth/revoke")) {
        if (revogacaoResponde === "sucesso") {
          return { ok: true, json: async () => ({ success: "true" }) } as Response;
        }
        if (revogacaoResponde === "http500") {
          return { ok: false, json: async () => ({}) } as Response;
        }
        const code = revogacaoResponde === "erro190" ? 190 : 100;
        return { ok: false, json: async () => ({ error: { code } }) } as Response;
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
    membershipAtiva = false;

    const r = await disconnectMeta({ userId: USER_A, organizationId: ORG_B });

    expect(r).toEqual({ ok: false, reason: "NO_MEMBERSHIP" });
    expect(rpcUsados()).not.toContain("revoke_meta_connection");
    expect(chamouMeta()).toBe(false);
  });

  it("recusa quando não há conexão viva", async () => {
    conexaoViva = null;

    const r = await disconnectMeta({ userId: USER_A, organizationId: ORG_A });

    expect(r).toEqual({ ok: false, reason: "NOT_FOUND" });
  });

  it("conexão sem token pula a Meta e limpa o local", async () => {
    tokenNoVault = null;

    const r = await disconnectMeta({ userId: USER_A, organizationId: ORG_A });

    expect(r).toEqual({ ok: true });
    expect(chamouMeta()).toBe(false);
    expect(rpcUsados()).toContain("revoke_meta_connection");
  });

  // -------------------------------------------------------------- BISU
  //
  // A credencial real da 003A. A Meta a encerra pelo ambiente dela; não existe
  // endpoint nosso que faça isso. Tentar um foi o que produziu a primeira
  // desconexão real que não desconectou nada.

  describe("credencial BISU", () => {
    it("pede ação externa em vez de tentar revogar", async () => {
      const r = await disconnectMeta({ userId: USER_A, organizationId: ORG_A });

      expect(r).toEqual({ ok: false, reason: "EXTERNAL_ACTION_REQUIRED" });
    });

    it("não chama nenhum endpoint mutável da Meta", async () => {
      await disconnectMeta({ userId: USER_A, organizationId: ORG_A });

      expect(fetchCalls.some((u) => u.includes("/oauth/revoke"))).toBe(false);
      expect(fetchCalls.some((u) => u.includes("/permissions"))).toBe(false);
      expect(fetchCalls.some((u) => u.includes("/access_tokens"))).toBe(false);
    });

    it("não limpa o estado local antes da remoção externa", async () => {
      await disconnectMeta({ userId: USER_A, organizationId: ORG_A });

      expect(rpcUsados()).not.toContain("revoke_meta_connection");
    });

    it("classifica por client_business_id, não por debug_token.type", async () => {
      // O mesmo `SYSTEM_USER` que o system user clássico devolve. É o campo do
      // contrato de negócio que separa os dois — e só ele.
      expect(tipoDoToken).toBe("SYSTEM_USER");

      const r = await disconnectMeta({ userId: USER_A, organizationId: ORG_A });

      expect(r).toEqual({ ok: false, reason: "EXTERNAL_ACTION_REQUIRED" });
      expect(
        fetchCalls.some((u) => u.includes("client_business_id")),
      ).toBe(true);
    });

    it("client_business_id vazio não conta como BISU", async () => {
      negocioDoToken = "";

      const r = await disconnectMeta({ userId: USER_A, organizationId: ORG_A });

      // Não é BISU e o tipo não é revogável: para sem tocar em nada.
      expect(r).toEqual({ ok: false, reason: "PROVIDER_REVOKE_FAILED" });
      expect(fetchCalls.some((u) => u.includes("/permissions"))).toBe(false);
      expect(rpcUsados()).not.toContain("revoke_meta_connection");
    });
  });

  describe("classificação sem identidade positiva", () => {
    // "Não é BISU" libera mutação externa. Um HTTP 200 vazio não afirma isso —
    // afirma que não sabemos o que a credencial é.
    beforeEach(() => {
      tipoDoToken = "USER";
    });

    it("corpo {} falha fechado", async () => {
      corpoDoMe = {};

      const r = await disconnectMeta({ userId: USER_A, organizationId: ORG_A });

      expect(r).toEqual({ ok: false, reason: "PROVIDER_REVOKE_FAILED" });
      expect(fetchCalls.some((u) => u.includes("/permissions"))).toBe(false);
      expect(rpcUsados()).not.toContain("revoke_meta_connection");
    });

    it("corpo sem `id` falha fechado", async () => {
      corpoDoMe = { name: "Alguém" };

      const r = await disconnectMeta({ userId: USER_A, organizationId: ORG_A });

      expect(r).toEqual({ ok: false, reason: "PROVIDER_REVOKE_FAILED" });
      expect(fetchCalls.some((u) => u.includes("/permissions"))).toBe(false);
      expect(rpcUsados()).not.toContain("revoke_meta_connection");
    });

    it("`id` vazio falha fechado", async () => {
      corpoDoMe = { id: "" };

      const r = await disconnectMeta({ userId: USER_A, organizationId: ORG_A });

      expect(r).toEqual({ ok: false, reason: "PROVIDER_REVOKE_FAILED" });
      expect(fetchCalls.some((u) => u.includes("/permissions"))).toBe(false);
    });

    it("identidade divergente do external_user_id falha fechado", async () => {
      // Revogar permissões de outra conta é pior do que não revogar nada.
      corpoDoMe = { id: "outra-conta" };

      const r = await disconnectMeta({ userId: USER_A, organizationId: ORG_A });

      expect(r).toEqual({ ok: false, reason: "PROVIDER_REVOKE_FAILED" });
      expect(fetchCalls.some((u) => u.includes("/permissions"))).toBe(false);
      expect(rpcUsados()).not.toContain("revoke_meta_connection");
    });

    it("client_business_id vazio falha fechado mesmo com type USER", async () => {
      corpoDoMe = { id: "999", client_business_id: "" };

      const r = await disconnectMeta({ userId: USER_A, organizationId: ORG_A });

      expect(r).toEqual({ ok: false, reason: "PROVIDER_REVOKE_FAILED" });
      expect(fetchCalls.some((u) => u.includes("/permissions"))).toBe(false);
      expect(rpcUsados()).not.toContain("revoke_meta_connection");
    });

    it("client_business_id de tipo inválido falha fechado", async () => {
      for (const valor of [null, 123, {}, []]) {
        corpoDoMe = { id: "999", client_business_id: valor };
        fetchCalls.length = 0;
        rpcCalls.length = 0;
        // A sequência de `is_valid` é consumida por chamada: sem reiniciar, a
        // segunda volta do laço já leria o token como inativo.
        chamadasDebug = 0;

        const r = await disconnectMeta({ userId: USER_A, organizationId: ORG_A });

        expect(r, JSON.stringify(valor)).toEqual({
          ok: false,
          reason: "PROVIDER_REVOKE_FAILED",
        });
        expect(fetchCalls.some((u) => u.includes("/permissions"))).toBe(false);
        expect(rpcUsados()).not.toContain("revoke_meta_connection");
      }
    });

    it("a etapa que barrou é registrada como classificação", async () => {
      const espiao = vi.spyOn(console, "error").mockImplementation(() => {});
      corpoDoMe = {};

      await disconnectMeta({ userId: USER_A, organizationId: ORG_A });

      const escrito = JSON.stringify(espiao.mock.calls);
      expect(escrito).toContain("CLASSIFICACAO");
      expect(escrito).not.toContain("token-guardado");
      espiao.mockRestore();
    });

    it("identidade coerente e sem client_business_id segue para USER", async () => {
      // O contraponto: endurecer não pode fechar o caminho legítimo.
      corpoDoMe = { id: "999" };

      const r = await disconnectMeta({ userId: USER_A, organizationId: ORG_A });

      expect(r).toEqual({ ok: true });
      expect(fetchCalls.some((u) => u.includes("/999/permissions"))).toBe(true);
      expect(rpcUsados()).toContain("revoke_meta_connection");
    });
  });

  describe("classificação que não conclui", () => {
    it("HTTP ruim falha fechado, sem tentar outro caminho", async () => {
      negocioDoToken = "HTTP_RUIM";

      const r = await disconnectMeta({ userId: USER_A, organizationId: ORG_A });

      expect(r).toEqual({ ok: false, reason: "PROVIDER_REVOKE_FAILED" });
      expect(fetchCalls.some((u) => u.includes("/permissions"))).toBe(false);
      expect(fetchCalls.some((u) => u.includes("/oauth/revoke"))).toBe(false);
      expect(rpcUsados()).not.toContain("revoke_meta_connection");
    });

    it("falha de rede falha fechado", async () => {
      vi.stubGlobal("fetch", vi.fn(async (url: URL | string) => {
        const alvo = String(url);
        fetchCalls.push(alvo);
        if (alvo.includes("/debug_token")) {
          return {
            ok: true,
            json: async () => ({ data: { type: "SYSTEM_USER", is_valid: true } }),
          } as Response;
        }
        throw new Error("rede");
      }));

      const r = await disconnectMeta({ userId: USER_A, organizationId: ORG_A });

      expect(r).toEqual({ ok: false, reason: "PROVIDER_REVOKE_FAILED" });
      expect(rpcUsados()).not.toContain("revoke_meta_connection");
    });

    it("corpo sem identificação nenhuma falha fechado", async () => {
      vi.stubGlobal("fetch", vi.fn(async (url: URL | string) => {
        const alvo = String(url);
        fetchCalls.push(alvo);
        if (alvo.includes("/debug_token")) {
          return {
            ok: true,
            json: async () => ({ data: { type: "SYSTEM_USER", is_valid: true } }),
          } as Response;
        }
        return { ok: true, json: async () => null } as unknown as Response;
      }));

      const r = await disconnectMeta({ userId: USER_A, organizationId: ORG_A });

      expect(r).toEqual({ ok: false, reason: "PROVIDER_REVOKE_FAILED" });
      expect(rpcUsados()).not.toContain("revoke_meta_connection");
    });
  });

  // ------------------------------------------------------ inspeção inicial
  //
  // Vale para qualquer credencial: sem saber o que existe do outro lado, não
  // se apaga nada.

  it("token já inválido não chama a Meta, mas pode limpar", async () => {
    validadeDoToken = [false];

    const r = await disconnectMeta({ userId: USER_A, organizationId: ORG_A });

    expect(r).toEqual({ ok: true });
    expect(fetchCalls.some((u) => u.includes("client_business_id"))).toBe(false);
    expect(fetchCalls.some((u) => u.includes("/permissions"))).toBe(false);
    expect(rpcUsados()).toContain("revoke_meta_connection");
  });

  it("falha na inspeção inicial não completa a desconexão", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: URL | string) => {
      fetchCalls.push(String(url));
      return { ok: false, json: async () => ({}) } as Response;
    }));

    const r = await disconnectMeta({ userId: USER_A, organizationId: ORG_A });

    expect(r).toEqual({ ok: false, reason: "PROVIDER_REVOKE_FAILED" });
    expect(rpcUsados()).not.toContain("revoke_meta_connection");
  });

  it("resposta ambígua de debug_token não é lida como inválido", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: URL | string) => {
      const alvo = String(url);
      fetchCalls.push(alvo);
      if (alvo.includes("/debug_token")) {
        return {
          ok: true,
          json: async () => ({ data: { type: "SYSTEM_USER" } }),
        } as Response;
      }
      return { ok: true, json: async () => ({ success: "true" }) } as Response;
    }));

    const r = await disconnectMeta({ userId: USER_A, organizationId: ORG_A });

    expect(r).toEqual({ ok: false, reason: "PROVIDER_REVOKE_FAILED" });
    expect(rpcUsados()).not.toContain("revoke_meta_connection");
  });

  // ------------------------------------------------ token de usuário comum
  //
  // Caminho legado, isolado: nunca é escolhido para BISU, porque a
  // classificação vem antes e BISU sai por `EXTERNAL_ACTION_REQUIRED`.

  describe("token de usuário comum", () => {
    beforeEach(() => {
      tipoDoToken = "USER";
      negocioDoToken = null;
    });

    it("usa /permissions e não oauth/revoke", async () => {
      const r = await disconnectMeta({ userId: USER_A, organizationId: ORG_A });

      expect(r).toEqual({ ok: true });
      expect(fetchCalls.some((u) => u.includes("/999/permissions"))).toBe(true);
      expect(fetchCalls.some((u) => u.includes("/oauth/revoke"))).toBe(false);
    });

    it("revoga na Meta ANTES de limpar o estado local", async () => {
      await disconnectMeta({ userId: USER_A, organizationId: ORG_A });

      const limpeza = rpcCalls.findIndex(
        (c) => c.fn === "revoke_meta_connection",
      );
      expect(limpeza).toBeGreaterThanOrEqual(0);
      expect(fetchCalls.some((u) => u.includes("/permissions"))).toBe(true);
    });

    it("erro 190 do provider NÃO prova revogação — falha fechado", async () => {
      // `190` é família genérica de falha de token: o código não diz sequer
      // qual credencial falhou, muito menos que o alvo ficou inativo.
      revogacaoResponde = "erro190";

      const r = await disconnectMeta({ userId: USER_A, organizationId: ORG_A });

      expect(r).toEqual({ ok: false, reason: "PROVIDER_REVOKE_FAILED" });
      expect(rpcUsados()).not.toContain("revoke_meta_connection");
    });

    it("outros erros do provider também falham fechado", async () => {
      revogacaoResponde = "erro100";

      const r = await disconnectMeta({ userId: USER_A, organizationId: ORG_A });

      expect(r).toEqual({ ok: false, reason: "PROVIDER_REVOKE_FAILED" });
      expect(rpcUsados()).not.toContain("revoke_meta_connection");
    });

    it("sucesso do provider NÃO basta: token ainda válido falha fechado", async () => {
      validadeDoToken = [true, true];

      const r = await disconnectMeta({ userId: USER_A, organizationId: ORG_A });

      expect(r).toEqual({ ok: false, reason: "PROVIDER_REVOKE_FAILED" });
      expect(rpcUsados()).not.toContain("revoke_meta_connection");
    });

    it("falha na pós-verificação não completa a desconexão", async () => {
      let n = 0;
      vi.stubGlobal("fetch", vi.fn(async (url: URL | string) => {
        const alvo = String(url);
        fetchCalls.push(alvo);
        if (alvo.includes("/debug_token")) {
          n += 1;
          if (n === 1) {
            return {
              ok: true,
              json: async () => ({ data: { type: "USER", is_valid: true } }),
            } as Response;
          }
          return { ok: false, json: async () => ({}) } as Response;
        }
        if (alvo.includes("/permissions")) {
          return { ok: true, json: async () => ({ success: "true" }) } as Response;
        }
        return { ok: true, json: async () => ({ id: "999" }) } as Response;
      }));

      const r = await disconnectMeta({ userId: USER_A, organizationId: ORG_A });

      expect(r).toEqual({ ok: false, reason: "PROVIDER_REVOKE_FAILED" });
      expect(rpcUsados()).not.toContain("revoke_meta_connection");
    });

    it("tipo desconhecido e não-BISU não revoga por tentativa", async () => {
      tipoDoToken = "PAGE";

      const r = await disconnectMeta({ userId: USER_A, organizationId: ORG_A });

      expect(r).toEqual({ ok: false, reason: "PROVIDER_REVOKE_FAILED" });
      expect(fetchCalls.some((u) => u.includes("/permissions"))).toBe(false);
      expect(rpcUsados()).not.toContain("revoke_meta_connection");
    });
  });

  // ------------------------------------------------------- leitura do Vault

  it("erro ao LER o token não conclui a desconexão nem limpa o local", async () => {
    // A RPC devolve `data: null` tanto para "não há token" quanto para "falhou
    // ao ler". Tratar os dois igual limparia o estado local deixando a
    // autorização viva na Meta — e sem referência para encerrá-la depois.
    erroRpc = { read_meta_connection_token: { code: "42501" } };

    const r = await disconnectMeta({ userId: USER_A, organizationId: ORG_A });

    expect(r).toEqual({ ok: false, reason: "TOKEN_READ_FAILED" });
    expect(rpcUsados()).not.toContain("revoke_meta_connection");
    expect(chamouMeta()).toBe(false);
  });

  it("erro de leitura é distinguido de ausência de token", async () => {
    erroRpc = { read_meta_connection_token: { code: "XX000" } };
    const comErro = await disconnectMeta({ userId: USER_A, organizationId: ORG_A });

    erroRpc = {};
    tokenNoVault = null;
    const semToken = await disconnectMeta({ userId: USER_A, organizationId: ORG_A });

    expect(comErro).toEqual({ ok: false, reason: "TOKEN_READ_FAILED" });
    expect(semToken).toEqual({ ok: true });
  });

  // ------------------------------------------------------------ diagnóstico

  it("o log de diagnóstico nomeia a etapa sem vazar segredo", async () => {
    const espiao = vi.spyOn(console, "error").mockImplementation(() => {});
    tipoDoToken = "USER";
    negocioDoToken = null;
    revogacaoResponde = "erro190";

    await disconnectMeta({ userId: USER_A, organizationId: ORG_A });

    const escrito = JSON.stringify(espiao.mock.calls);

    expect(escrito).toContain("REVOGACAO");
    expect(escrito).toContain("190");
    expect(escrito).not.toContain("token-guardado");
    expect(escrito).not.toContain("app-secret");
    espiao.mockRestore();
  });

  it("token ainda válido depois da revogação é registrado como tal", async () => {
    const espiao = vi.spyOn(console, "error").mockImplementation(() => {});
    tipoDoToken = "USER";
    negocioDoToken = null;
    validadeDoToken = [true, true];

    await disconnectMeta({ userId: USER_A, organizationId: ORG_A });

    const escrito = JSON.stringify(espiao.mock.calls);

    expect(escrito).toContain("POS_VERIFICACAO");
    expect(escrito).toContain("AINDA_VALIDO");
    expect(escrito).not.toContain("token-guardado");
    espiao.mockRestore();
  });
});

describe("checkMetaDisconnection", () => {
  it("token ainda válido: nada é tocado", async () => {
    validadeDoToken = [true];

    const r = await checkMetaDisconnection({
      userId: USER_A,
      organizationId: ORG_A,
    });

    expect(r).toEqual({ ok: false, reason: "STILL_ACTIVE" });
    expect(rpcUsados()).not.toContain("revoke_meta_connection");
  });

  it("token comprovadamente inválido: limpa o local e conclui", async () => {
    validadeDoToken = [false];

    const r = await checkMetaDisconnection({
      userId: USER_A,
      organizationId: ORG_A,
    });

    expect(r).toEqual({ ok: true });
    expect(rpcUsados()).toContain("revoke_meta_connection");
  });

  it("nunca chama endpoint mutável da Meta", async () => {
    validadeDoToken = [false];

    await checkMetaDisconnection({ userId: USER_A, organizationId: ORG_A });

    expect(fetchCalls.some((u) => u.includes("/oauth/revoke"))).toBe(false);
    expect(fetchCalls.some((u) => u.includes("/permissions"))).toBe(false);
    expect(fetchCalls.some((u) => u.includes("/access_tokens"))).toBe(false);
    expect(fetchCalls.every((u) => u.includes("/debug_token"))).toBe(true);
  });

  it("falha de rede não limpa o local", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: URL | string) => {
      fetchCalls.push(String(url));
      throw new Error("rede");
    }));

    const r = await checkMetaDisconnection({
      userId: USER_A,
      organizationId: ORG_A,
    });

    expect(r).toEqual({ ok: false, reason: "UNVERIFIED" });
    expect(rpcUsados()).not.toContain("revoke_meta_connection");
  });

  it("HTTP ruim não limpa o local", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: URL | string) => {
      fetchCalls.push(String(url));
      return { ok: false, json: async () => ({}) } as Response;
    }));

    const r = await checkMetaDisconnection({
      userId: USER_A,
      organizationId: ORG_A,
    });

    expect(r).toEqual({ ok: false, reason: "UNVERIFIED" });
    expect(rpcUsados()).not.toContain("revoke_meta_connection");
  });

  it("resposta ambígua não conta como inválido", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: URL | string) => {
      fetchCalls.push(String(url));
      return {
        ok: true,
        json: async () => ({ data: { type: "SYSTEM_USER" } }),
      } as Response;
    }));

    const r = await checkMetaDisconnection({
      userId: USER_A,
      organizationId: ORG_A,
    });

    expect(r).toEqual({ ok: false, reason: "UNVERIFIED" });
    expect(rpcUsados()).not.toContain("revoke_meta_connection");
  });

  it("erro ao ler o token não limpa o local", async () => {
    erroRpc = { read_meta_connection_token: { code: "42501" } };

    const r = await checkMetaDisconnection({
      userId: USER_A,
      organizationId: ORG_A,
    });

    expect(r).toEqual({ ok: false, reason: "TOKEN_READ_FAILED" });
    expect(rpcUsados()).not.toContain("revoke_meta_connection");
    expect(chamouMeta()).toBe(false);
  });

  it("recusa verificação de organização alheia — cross-tenant", async () => {
    membershipAtiva = false;

    const r = await checkMetaDisconnection({
      userId: USER_A,
      organizationId: ORG_B,
    });

    expect(r).toEqual({ ok: false, reason: "NO_MEMBERSHIP" });
    expect(chamouMeta()).toBe(false);
    expect(rpcUsados()).not.toContain("revoke_meta_connection");
  });

  it("recusa quando não há conexão viva", async () => {
    conexaoViva = null;

    const r = await checkMetaDisconnection({
      userId: USER_A,
      organizationId: ORG_A,
    });

    expect(r).toEqual({ ok: false, reason: "NOT_FOUND" });
  });
});

describe("remoção externa pendente — marcador persistido", () => {
  it("BISU válido persiste o marcador e não muta a Meta", async () => {
    const r = await disconnectMeta({ userId: USER_A, organizationId: ORG_A });

    expect(r).toEqual({ ok: false, reason: "EXTERNAL_ACTION_REQUIRED" });
    expect(rpcUsados()).toContain("mark_meta_external_disconnect_pending");
    expect(fetchCalls.some((u) => u.includes("/permissions"))).toBe(false);
    expect(fetchCalls.some((u) => u.includes("/oauth/revoke"))).toBe(false);
    expect(rpcUsados()).not.toContain("revoke_meta_connection");
  });

  it("falha ao persistir o marcador não finge que o passo foi registrado", async () => {
    // Sem marcador, a verificação depois não teria como distinguir este caso
    // de um erro qualquer — e a trilha sumiria no próximo reload.
    erroRpc = { mark_meta_external_disconnect_pending: { code: "23503" } };

    const r = await disconnectMeta({ userId: USER_A, organizationId: ORG_A });

    expect(r).toEqual({ ok: false, reason: "UNAVAILABLE" });
    expect(rpcUsados()).not.toContain("revoke_meta_connection");
  });

  it("clicar Desconectar de novo não produz efeito diferente", async () => {
    const primeiro = await disconnectMeta({ userId: USER_A, organizationId: ORG_A });

    conexaoViva = { ...conexaoViva, external_disconnect_pending_at: AGORA };
    // A sequência de `is_valid` é consumida por chamada; sem reiniciar, a
    // segunda volta leria o token como já inativo.
    chamadasDebug = 0;

    const segundo = await disconnectMeta({ userId: USER_A, organizationId: ORG_A });

    expect(primeiro).toEqual(segundo);
    expect(rpcUsados()).not.toContain("revoke_meta_connection");
  });
});

describe("checkMetaDisconnection — prova composta pós-remoção", () => {
  /** Conexão com remoção externa já pedida. */
  function comRemocaoPedida() {
    conexaoViva = { ...conexaoViva, external_disconnect_pending_at: AGORA };
  }

  /** Reproduz a 003A-09: `debug_token` deixa de ser utilizável. */
  function debugTokenInutilizavel() {
    validadeDoToken = [];
  }

  it("assinatura real pós-remoção conclui a desconexão", async () => {
    comRemocaoPedida();
    debugTokenInutilizavel();
    meComTokenAlvo = "REMOVIDO";

    const r = await checkMetaDisconnection({
      userId: USER_A,
      organizationId: ORG_A,
    });

    expect(r).toEqual({ ok: true });
    expect(rpcUsados()).toContain("revoke_meta_connection");
    expect(fetchCalls.some((u) => u.includes("/permissions"))).toBe(false);
    expect(fetchCalls.some((u) => u.includes("/oauth/revoke"))).toBe(false);
  });

  it("a MESMA assinatura sem remoção pedida NÃO conclui", async () => {
    // O que separa esta correção da regra insegura "190 = revogado": fora do
    // fluxo de remoção externa, 190/464 não prova nada.
    debugTokenInutilizavel();
    meComTokenAlvo = "REMOVIDO";

    const r = await checkMetaDisconnection({
      userId: USER_A,
      organizationId: ORG_A,
    });

    expect(r).toEqual({ ok: false, reason: "UNVERIFIED" });
    expect(rpcUsados()).not.toContain("revoke_meta_connection");
  });

  it("190 sem subcode não conclui", async () => {
    comRemocaoPedida();
    debugTokenInutilizavel();
    meComTokenAlvo = "SEM_SUBCODE";

    const r = await checkMetaDisconnection({
      userId: USER_A,
      organizationId: ORG_A,
    });

    expect(r).toEqual({ ok: false, reason: "UNVERIFIED" });
    expect(rpcUsados()).not.toContain("revoke_meta_connection");
  });

  it("190 com outro subcode não conclui", async () => {
    comRemocaoPedida();
    debugTokenInutilizavel();
    meComTokenAlvo = "OUTRO_SUBCODE";

    const r = await checkMetaDisconnection({
      userId: USER_A,
      organizationId: ORG_A,
    });

    expect(r).toEqual({ ok: false, reason: "UNVERIFIED" });
    expect(rpcUsados()).not.toContain("revoke_meta_connection");
  });

  it("outro código com o subcode certo não conclui", async () => {
    comRemocaoPedida();
    debugTokenInutilizavel();
    meComTokenAlvo = "OUTRO_CODE";

    const r = await checkMetaDisconnection({
      userId: USER_A,
      organizationId: ORG_A,
    });

    expect(r).toEqual({ ok: false, reason: "UNVERIFIED" });
    expect(rpcUsados()).not.toContain("revoke_meta_connection");
  });

  it("app token de controle doente preserva o local", async () => {
    // Se as nossas credenciais estão ruins, o erro fala do nosso app — não do
    // token alvo. Apagar aqui seria apagar sem prova.
    comRemocaoPedida();
    debugTokenInutilizavel();
    appTokenSaudavel = false;
    meComTokenAlvo = "REMOVIDO";

    const r = await checkMetaDisconnection({
      userId: USER_A,
      organizationId: ORG_A,
    });

    expect(r).toEqual({ ok: false, reason: "UNVERIFIED" });
    expect(rpcUsados()).not.toContain("revoke_meta_connection");
  });

  it("token que ainda opera informa ainda ativo e preserva o local", async () => {
    comRemocaoPedida();
    debugTokenInutilizavel();
    meComTokenAlvo = "OPERA";

    const r = await checkMetaDisconnection({
      userId: USER_A,
      organizationId: ORG_A,
    });

    expect(r).toEqual({ ok: false, reason: "STILL_ACTIVE" });
    expect(rpcUsados()).not.toContain("revoke_meta_connection");
  });

  it("5xx na prova composta preserva o local", async () => {
    comRemocaoPedida();
    debugTokenInutilizavel();
    meComTokenAlvo = "HTTP_500";

    const r = await checkMetaDisconnection({
      userId: USER_A,
      organizationId: ORG_A,
    });

    expect(r).toEqual({ ok: false, reason: "UNVERIFIED" });
    expect(rpcUsados()).not.toContain("revoke_meta_connection");
  });

  it("rede caída na prova composta preserva o local", async () => {
    comRemocaoPedida();
    debugTokenInutilizavel();
    meComTokenAlvo = "REDE";

    const r = await checkMetaDisconnection({
      userId: USER_A,
      organizationId: ORG_A,
    });

    expect(r).toEqual({ ok: false, reason: "UNVERIFIED" });
    expect(rpcUsados()).not.toContain("revoke_meta_connection");
  });

  it("is_valid=false explícito continua concluindo, com ou sem marcador", async () => {
    validadeDoToken = [false];

    const semMarcador = await checkMetaDisconnection({
      userId: USER_A,
      organizationId: ORG_A,
    });

    expect(semMarcador).toEqual({ ok: true });
    expect(rpcUsados()).toContain("revoke_meta_connection");
    // E não precisou da prova composta.
    expect(fetchCalls.some((u) => u.includes("fields=id"))).toBe(false);
  });

  it("token ainda válido no debug_token vence o marcador", async () => {
    comRemocaoPedida();
    validadeDoToken = [true];

    const r = await checkMetaDisconnection({
      userId: USER_A,
      organizationId: ORG_A,
    });

    expect(r).toEqual({ ok: false, reason: "STILL_ACTIVE" });
    expect(rpcUsados()).not.toContain("revoke_meta_connection");
  });

  it("verificações repetidas são idempotentes", async () => {
    comRemocaoPedida();
    debugTokenInutilizavel();
    meComTokenAlvo = "REMOVIDO";

    const primeira = await checkMetaDisconnection({
      userId: USER_A,
      organizationId: ORG_A,
    });

    // Depois da limpeza não há mais conexão viva: a segunda não recria nada.
    conexaoViva = null;
    rpcCalls.length = 0;

    const segunda = await checkMetaDisconnection({
      userId: USER_A,
      organizationId: ORG_A,
    });

    expect(primeira).toEqual({ ok: true });
    expect(segunda).toEqual({ ok: false, reason: "NOT_FOUND" });
    expect(rpcUsados()).not.toContain("revoke_meta_connection");
  });

  it("a prova composta não toca nenhum endpoint mutável", async () => {
    comRemocaoPedida();
    debugTokenInutilizavel();
    meComTokenAlvo = "REMOVIDO";

    await checkMetaDisconnection({ userId: USER_A, organizationId: ORG_A });

    expect(fetchCalls.some((u) => u.includes("/permissions"))).toBe(false);
    expect(fetchCalls.some((u) => u.includes("/oauth/revoke"))).toBe(false);
    expect(fetchCalls.some((u) => u.includes("/access_tokens"))).toBe(false);
  });
});
