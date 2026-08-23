import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { readPublicEnv } from "@/lib/env/public";
import { readServerEnv } from "@/lib/env/server";

/**
 * Cliente Supabase privilegiado — `service_role` via `SUPABASE_SECRET_KEY`.
 *
 * É a única credencial do projeto que ignora RLS. Três regras governam este
 * módulo (`SECURITY_MODEL.md` §4, §6, §15):
 *
 * 1. **Server-only, sem exceção.** O `server-only` no topo transforma qualquer
 *    import a partir de um Client Component em erro de build, não em vazamento
 *    silencioso em produção. A chave também nunca é `NEXT_PUBLIC_*`.
 * 2. **Sem sessão de usuário.** O cliente não recebe cookies, não persiste
 *    sessão e não faz auto-refresh. Um cliente privilegiado que carregasse o
 *    `Authorization` do visitante misturaria duas identidades na mesma conexão
 *    — e o supabase-js daria preferência ao token do usuário, quebrando o
 *    caminho privilegiado de forma difícil de perceber.
 * 3. **Identidade nunca vem daqui.** Este cliente não sabe quem é o usuário.
 *    Quem chama passa o `user.id` já verificado por `getClaims()`.
 *
 * Cada chamada devolve uma instância nova. Um singleton compartilhado entre
 * requests só economizaria a construção do objeto — o transporte é `fetch`
 * sem pool próprio — e criaria uma superfície onde estado de auth de um
 * request poderia sobreviver ao request seguinte.
 */
export function createSupabasePrivilegedClient(): SupabaseClient {
  const { NEXT_PUBLIC_SUPABASE_URL } = readPublicEnv();
  const { SUPABASE_SECRET_KEY } = readServerEnv();

  return createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
