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
 * Identidade de uma sessão de recuperação.
 *
 * Diferente de `VerifiedUser` num ponto: o e-mail é obrigatório. Trocar a
 * senha de uma sessão que não sabe dizer de qual endereço veio não é uma
 * operação que este produto queira permitir (Correção 001F-01 §3.3).
 */
export type RecoveryUser = {
  id: string;
  email: string;
};

/**
 * Retorna o usuário **somente** quando a sessão prova posse recente do e-mail
 * e não passou por login com senha.
 *
 * Sessão comum de login devolve `null` aqui, mesmo sendo perfeitamente válida:
 * o direito de trocar a senha sem informar a senha atual vem do token que
 * chegou por e-mail, não de estar logado. Sessão nascida de OTP mas antiga
 * também devolve `null` — a janela é a do link recém-usado.
 *
 * As seis condições da Correção 001F-01 §3 se dividem aqui: claims verificadas
 * por `getClaims()`, `sub` utilizável e `email` não vazio ficam neste módulo;
 * o predicado sobre `amr` — métodos aceitos, ausência de `password` e recência
 * — está em `recovery.ts`, junto da medição que o motivou.
 */
export async function getRecoveryUser(): Promise<RecoveryUser | null> {
  const claims = await readVerifiedClaims();

  if (!claims) return null;

  const { sub, email } = claims;
  if (typeof email !== "string" || email.length === 0) return null;

  if (!grantsPasswordReset(claims.amr)) return null;

  return { id: sub as string, email };
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
