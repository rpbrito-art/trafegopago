import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { readPublicEnv } from "@/lib/env/public";

export type SessionRefreshResult = {
  /**
   * Resposta que carrega os cookies de sessão atualizados. Deve ser devolvida
   * ao Next — ou ter seus cookies copiados — ou o refresh é perdido.
   */
  response: NextResponse;
  /** `sub` do JWT verificado, ou `null` quando não há sessão válida. */
  userId: string | null;
};

/**
 * Renova a sessão do Supabase e propaga os cookies resultantes.
 *
 * Dois cuidados são obrigatórios no padrão SSR e estão implementados abaixo:
 *
 * - os cookies novos são gravados **tanto** no request (para que a rota
 *   renderizada nesta mesma passagem já enxergue a sessão renovada) quanto na
 *   resposta (para que o browser receba o Set-Cookie);
 * - nada é executado entre criar o cliente e verificar a identidade, para não
 *   introduzir um ponto em que a sessão poderia ser lida antes do refresh.
 *
 * A verificação usa `getClaims()`, que valida a assinatura do JWT (ou consulta
 * o servidor Auth quando a chave é simétrica). `getSession()` sozinho não serve
 * como prova de identidade server-side.
 */
export async function refreshSession(
  request: NextRequest,
): Promise<SessionRefreshResult> {
  const env = readPublicEnv();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }

          response = NextResponse.next({ request });

          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;

  return { response, userId };
}

/**
 * Redireciona preservando os cookies já acumulados na resposta de refresh.
 *
 * Sem essa cópia, um redirect emitido logo após um refresh descartaria o token
 * renovado e derrubaria a sessão do usuário.
 */
export function redirectPreservingCookies(
  request: NextRequest,
  refreshed: NextResponse,
  pathname: string,
): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";

  const redirectResponse = NextResponse.redirect(url);

  for (const cookie of refreshed.cookies.getAll()) {
    redirectResponse.cookies.set(cookie);
  }

  return redirectResponse;
}
