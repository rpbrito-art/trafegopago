import "server-only";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

import { grantsPasswordReset } from "./recovery";
import { ROUTES } from "./routes";

/**
 * Identidade mínima derivada do JWT verificado.
 *
 * Deliberadamente estreita: nada além do necessário atravessa a fronteira até a
 * UI (`SECURITY_MODEL.md` §13, DTO). `user_metadata` não entra aqui — não é
 * fonte de autorização (`PROJECT_PROMPT.md` §10).
 */
export type VerifiedUser = {
  id: string;
  email: string | null;
};

/**
 * Retorna o usuário autenticado, verificado server-side, ou `null`.
 *
 * Usa `getClaims()`, que valida criptograficamente a assinatura do JWT (ou
 * consulta o servidor Auth quando a chave é simétrica). Ler `getSession()` — ou
 * pior, o cookie cru — provaria apenas que *algum* valor chegou no request, não
 * que ele é autêntico.
 */
export async function getVerifiedUser(): Promise<VerifiedUser | null> {
  const claims = await readVerifiedClaims();

  return claims ? toVerifiedUser(claims) : null;
}

/**
 * Retorna o usuário **somente** quando a sessão nasceu de um OTP por e-mail e
 * não de login por senha.
 *
 * Sessão comum de login devolve `null` aqui, mesmo sendo perfeitamente válida:
 * o direito de trocar a senha sem informar a senha atual vem do token que
 * chegou por e-mail, não de estar logado.
 *
 * O critério exato — e por que ele não consegue exigir literalmente
 * `amr=recovery` no provider vigente — está documentado em `recovery.ts`.
 */
export async function getRecoveryUser(): Promise<VerifiedUser | null> {
  const claims = await readVerifiedClaims();

  if (!claims || !grantsPasswordReset(claims.amr)) return null;

  return toVerifiedUser(claims);
}

/**
 * Claims do JWT verificado, ou `null`.
 *
 * Um único ponto de leitura: `getVerifiedUser` e `getRecoveryUser` precisam
 * exatamente da mesma verificação criptográfica e diferem só no que exigem do
 * resultado.
 */
async function readVerifiedClaims(): Promise<Record<string, unknown> | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data) return null;

  const claims = data.claims as Record<string, unknown>;
  const { sub } = claims;
  if (typeof sub !== "string" || sub.length === 0) return null;

  return claims;
}

function toVerifiedUser(claims: Record<string, unknown>): VerifiedUser {
  const { sub, email } = claims;

  return {
    id: sub as string,
    email: typeof email === "string" ? email : null,
  };
}

/**
 * Exige sessão válida. Redireciona para o login quando não houver.
 *
 * Este é o guard que realmente protege a rota; o redirect do Proxy é apenas
 * otimização de navegação.
 */
export async function requireUser(): Promise<VerifiedUser> {
  const user = await getVerifiedUser();

  if (!user) {
    redirect(ROUTES.signIn);
  }

  return user;
}
