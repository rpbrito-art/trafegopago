import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { readPublicEnv } from "@/lib/env/public";

/**
 * Cliente Supabase para o servidor (Server Components, Route Handlers e
 * Server Actions), com sessão em cookies.
 *
 * Usa a chave publicável de propósito: o isolamento de dados é
 * responsabilidade da RLS, não de uma credencial privilegiada. Um cliente com
 * `service_role`/secret key só será introduzido quando uma rodada exigir
 * operação privilegiada, sempre com `organization_id` explícito
 * (`SECURITY_MODEL.md` §4, §5, §6).
 *
 * Um novo cliente deve ser criado a cada request — nunca compartilhado.
 */
export async function createSupabaseServerClient() {
  // `cookies()` primeiro, de propósito: é o que marca a rota como dependente do
  // request. Se a leitura de env viesse antes e falhasse, o Next ainda estaria
  // tratando a rota como estática e reportaria o erro como falha de prerender —
  // escondendo a causa real.
  const cookieStore = await cookies();
  const env = readPublicEnv();

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Chamado a partir de um Server Component, onde escrever cookies
            // não é permitido. Ignorar é seguro: o Proxy (`src/proxy.ts`) já
            // renovou a sessão antes desta renderização e gravou os cookies
            // atualizados na resposta.
          }
        },
      },
    },
  );
}
