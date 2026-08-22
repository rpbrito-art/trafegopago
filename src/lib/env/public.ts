import { z } from "zod";

/**
 * Variáveis de ambiente PÚBLICAS.
 *
 * Tudo o que estiver aqui é embutido no bundle do browser pelo Next.js e deve
 * ser tratado como informação pública. Nenhuma credencial privilegiada
 * (`service_role`, secret key, token Meta, senha) pode ser declarada neste
 * schema — ver `SECURITY_MODEL.md` §6.
 */
export const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

export type RawEnv = Record<string, string | undefined>;

/**
 * Resolve a chave pública do Supabase aceitando o nome atual
 * (`publishable key`) e o nome legado (`anon key`), nesta ordem.
 *
 * O Supabase está em transição entre as duas nomenclaturas; aceitar as duas
 * evita que a fundação quebre conforme o projeto for migrado, sem esconder
 * qual valor foi efetivamente usado.
 */
export function resolvePublishableKey(raw: RawEnv): string | undefined {
  return (
    raw.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? raw.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function parsePublicEnv(raw: RawEnv): PublicEnv {
  const result = publicEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: raw.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: resolvePublishableKey(raw),
  });

  if (!result.success) {
    throw new Error(
      `Variáveis de ambiente públicas inválidas: ${formatIssues(result.error)}`,
    );
  }

  return result.data;
}

/**
 * Leitura das variáveis públicas em runtime.
 *
 * O acesso a `process.env.NEXT_PUBLIC_*` é feito por membro literal porque o
 * Next.js só substitui essas referências no bundle quando escritas dessa forma.
 */
export function readPublicEnv(): PublicEnv {
  return parsePublicEnv({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}

function formatIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("; ");
}
