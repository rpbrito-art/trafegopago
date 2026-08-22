"use client";

import { createBrowserClient } from "@supabase/ssr";

import { readPublicEnv } from "@/lib/env/public";

/**
 * Cliente Supabase para o browser.
 *
 * Recebe exclusivamente URL e chave publicável. Nenhuma credencial
 * privilegiada pode chegar até aqui.
 */
export function createSupabaseBrowserClient() {
  const env = readPublicEnv();

  return createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
