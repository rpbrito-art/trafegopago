import { NextResponse, type NextRequest } from "next/server";

import { ROUTES } from "@/lib/auth/routes";
import { getVerifiedUser } from "@/lib/auth/session";
import { completeMetaAuthorization } from "@/lib/meta/gateway";

/**
 * Callback do Facebook Login for Business.
 *
 * Este é o `redirect_uri` cadastrado no app Meta. Três regras governam o
 * arquivo (`SECURITY_MODEL.md` §8):
 *
 * 1. **Destino fixo.** Sempre volta para `/conta`. Não existe parâmetro `next`
 *    e nenhum valor do request influencia o redirect — é o que impede que este
 *    endpoint vire open redirect.
 * 2. **Nada do provider ecoa na URL final.** Nem `code`, nem `state`, nem
 *    mensagem de erro da Meta. O que chega vai para a decisão, não para a barra
 *    de endereços nem para o histórico do navegador.
 * 3. **Identidade vem da sessão.** `getVerifiedUser()` valida o JWT
 *    server-side; a querystring não diz quem é o usuário.
 */
export const dynamic = "force-dynamic";

/** Marcador do desfecho na volta. Booleano/enumerado curto, sem eco de dados. */
const RESULTADO_PARAM = "meta";

export async function GET(request: NextRequest) {
  const destino = new URL(ROUTES.account, request.nextUrl.origin);

  const user = await getVerifiedUser();

  // Sem sessão não há o que concluir: o callback não autentica ninguém.
  if (!user) {
    return NextResponse.redirect(new URL(ROUTES.signIn, request.nextUrl.origin));
  }

  const params = request.nextUrl.searchParams;

  const resultado = await completeMetaAuthorization({
    userId: user.id,
    state: params.get("state"),
    code: params.get("code"),
    error: params.get("error") ?? params.get("error_reason"),
  });

  // Um único marcador, deliberadamente pobre: `ok` ou `erro`. Distinguir
  // "replay" de "expirado" na URL ensinaria a quem sondasse qual defesa
  // disparou.
  destino.searchParams.set(RESULTADO_PARAM, resultado.ok ? "ok" : "erro");

  return NextResponse.redirect(destino);
}
