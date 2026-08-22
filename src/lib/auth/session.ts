import "server-only";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

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
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data) return null;

  const { sub, email } = data.claims;
  if (typeof sub !== "string" || sub.length === 0) return null;

  return { id: sub, email: typeof email === "string" ? email : null };
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
