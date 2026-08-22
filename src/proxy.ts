import type { NextRequest } from "next/server";

import { isAuthEntryPath, isProtectedPath, ROUTES } from "@/lib/auth/routes";
import {
  redirectPreservingCookies,
  refreshSession,
} from "@/lib/supabase/proxy";

/**
 * Proxy (o antigo Middleware; renomeado no Next.js 16).
 *
 * Responsabilidades, nesta ordem:
 *
 * 1. renovar a sessão do Supabase e propagar os cookies resultantes — sem isso,
 *    Server Components não conseguem gravar o token renovado;
 * 2. fazer um redirect **otimista** para rotas protegidas.
 *
 * O passo 2 é conveniência, não autorização: a decisão que vale é tomada
 * server-side dentro da própria rota (`requireUser`). Não colocar consulta de
 * banco nem regra de domínio aqui — o Proxy roda em toda navegação, inclusive
 * em prefetch.
 */
export async function proxy(request: NextRequest) {
  const { response, userId } = await refreshSession(request);
  const { pathname } = request.nextUrl;

  if (!userId && isProtectedPath(pathname)) {
    return redirectPreservingCookies(request, response, ROUTES.signIn);
  }

  if (userId && isAuthEntryPath(pathname)) {
    return redirectPreservingCookies(request, response, ROUTES.account);
  }

  return response;
}

export const config = {
  /**
   * Roda em todas as rotas de navegação, exceto assets e arquivos estáticos.
   *
   * Auth precisa de cobertura ampla: uma rota fora do matcher nunca teria a
   * sessão renovada e passaria a deslogar o usuário ao expirar o token.
   */
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|css|js|map|txt|xml|woff|woff2|ttf)$).*)",
  ],
};
