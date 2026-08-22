import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ROUTES } from "@/lib/auth/routes";

/**
 * Cookies que o cliente Supabase "renova" durante a chamada, para provar que o
 * Proxy propaga o resultado do refresh mesmo quando emite um redirect.
 */
type CookieToSet = { name: string; value: string; options?: object };

let claimsSub: string | null = null;
let cookiesToSet: CookieToSet[] = [];

vi.mock("@supabase/ssr", () => ({
  createServerClient: (
    _url: string,
    _key: string,
    options: {
      cookies: {
        getAll: () => { name: string; value: string }[];
        setAll: (list: CookieToSet[]) => void;
      };
    },
  ) => ({
    auth: {
      getClaims: async () => {
        if (cookiesToSet.length > 0) {
          options.cookies.setAll(cookiesToSet);
        }

        if (claimsSub === null) {
          return { data: null, error: { message: "sem sessão" } };
        }

        return { data: { claims: { sub: claimsSub } }, error: null };
      },
    },
  }),
}));

const { proxy, config } = await import("./proxy");

function request(pathname: string): NextRequest {
  return new NextRequest(new URL(pathname, "https://app.exemplo.com"));
}

beforeEach(() => {
  claimsSub = null;
  cookiesToSet = [];
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://projeto.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_teste";
});

describe("proxy — rota protegida", () => {
  it("redireciona visitante sem sessão para o login", async () => {
    const response = await proxy(request(ROUTES.account));

    expect(response.status).toBe(307);
    expect(new URL(response.headers.get("location") ?? "").pathname).toBe(
      ROUTES.signIn,
    );
  });

  it("deixa passar usuário com sessão verificada", async () => {
    claimsSub = "11111111-1111-1111-1111-111111111111";

    const response = await proxy(request(ROUTES.account));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("protege também as subrotas da área da conta", async () => {
    const response = await proxy(request(`${ROUTES.account}/detalhes`));

    expect(response.status).toBe(307);
    expect(new URL(response.headers.get("location") ?? "").pathname).toBe(
      ROUTES.signIn,
    );
  });
});

describe("proxy — rotas públicas", () => {
  it.each([ROUTES.home, ROUTES.confirm, ROUTES.authError, ROUTES.checkEmail])(
    "não interfere em %s sem sessão",
    async (pathname) => {
      const response = await proxy(request(pathname));

      expect(response.status).toBe(200);
    },
  );

  it("não intercepta a confirmação de e-mail de quem já tem sessão", async () => {
    claimsSub = "11111111-1111-1111-1111-111111111111";

    const response = await proxy(request(ROUTES.confirm));

    expect(response.status).toBe(200);
  });

  it("tira usuário autenticado das telas de entrada", async () => {
    claimsSub = "11111111-1111-1111-1111-111111111111";

    for (const pathname of [ROUTES.signIn, ROUTES.signUp]) {
      const response = await proxy(request(pathname));

      expect(response.status).toBe(307);
      expect(new URL(response.headers.get("location") ?? "").pathname).toBe(
        ROUTES.account,
      );
    }
  });
});

describe("proxy — propagação de cookies", () => {
  it("devolve os cookies renovados em resposta normal", async () => {
    claimsSub = "11111111-1111-1111-1111-111111111111";
    cookiesToSet = [{ name: "sb-access-token", value: "novo", options: {} }];

    const response = await proxy(request(ROUTES.account));

    expect(response.cookies.get("sb-access-token")?.value).toBe("novo");
  });

  it("preserva os cookies renovados mesmo ao redirecionar", async () => {
    // Cenário real: o refresh token ainda vale, o access token foi renovado,
    // mas as claims não autorizam a rota. Descartar o cookie aqui deslogaria o
    // usuário a cada passagem pelo Proxy.
    cookiesToSet = [{ name: "sb-access-token", value: "renovado", options: {} }];

    const response = await proxy(request(ROUTES.account));

    expect(response.status).toBe(307);
    expect(response.cookies.get("sb-access-token")?.value).toBe("renovado");
  });

  it("não vaza a query original no destino do redirect", async () => {
    const response = await proxy(
      new NextRequest(
        new URL(`${ROUTES.account}?token=segredo`, "https://app.exemplo.com"),
      ),
    );

    const location = new URL(response.headers.get("location") ?? "");
    expect(location.search).toBe("");
  });
});

describe("proxy — matcher", () => {
  // O matcher tem a forma `/(<padrão>)`; o padrão interno é um regex comum e é
  // ele que decide quais caminhos o Proxy enxerga.
  const regex = new RegExp(`^${config.matcher[0].slice(1)}$`);

  function cobre(pathname: string): boolean {
    return regex.test(pathname.replace(/^\//, ""));
  }

  it.each([
    "/_next/static/chunk.js",
    "/_next/image",
    "/favicon.ico",
    "/imagem.png",
    "/estilo.css",
    "/bundle.js",
    "/fonte.woff2",
  ])("exclui o asset %s", (pathname) => {
    expect(cobre(pathname)).toBe(false);
  });

  it.each([
    ROUTES.home,
    ROUTES.account,
    ROUTES.signIn,
    ROUTES.signUp,
    ROUTES.confirm,
    ROUTES.authError,
    ROUTES.checkEmail,
  ])("cobre a rota de navegação %s", (pathname) => {
    expect(cobre(pathname)).toBe(true);
  });
});
