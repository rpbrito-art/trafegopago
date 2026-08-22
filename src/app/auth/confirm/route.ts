import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

import { parseConfirmRequest } from "@/lib/auth/otp";
import { ROUTES } from "@/lib/auth/routes";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Confirmação de e-mail no padrão SSR do Supabase.
 *
 * O link do e-mail traz `token_hash` + `type`; aqui o token é trocado por uma
 * sessão real, gravada em cookies pelo server client. O usuário é então
 * redirecionado para um caminho da allowlist — **sem** o token na URL, que de
 * outro modo ficaria no histórico do navegador e no header `Referer` de
 * qualquer request subsequente.
 *
 * Um Route Handler é obrigatório aqui: Server Components não podem gravar
 * cookies, e sem gravar cookies não há sessão.
 */
export async function GET(request: NextRequest) {
  const parsed = parseConfirmRequest(request.nextUrl.searchParams);

  if (!parsed.ok) {
    redirect(ROUTES.authError);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({
    type: parsed.type,
    token_hash: parsed.tokenHash,
  });

  if (error) {
    // Token expirado, já usado ou forjado. A página de erro é genérica: não
    // devolve o motivo nem ecoa qualquer parâmetro recebido.
    redirect(ROUTES.authError);
  }

  redirect(parsed.next);
}
