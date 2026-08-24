import "server-only";

import { z } from "zod";

import type { RawEnv } from "./public";

/**
 * Padrões que identificam uma variável como privilegiada.
 *
 * Usado para provar, em teste e em runtime, que nenhuma credencial sensível foi
 * publicada no bundle do browser com prefixo `NEXT_PUBLIC_`
 * (`SECURITY_MODEL.md` §6, §7, §15).
 */
export const PRIVILEGED_ENV_PATTERNS: readonly RegExp[] = [
  /SERVICE_ROLE/i,
  /SECRET/i,
  /PRIVATE/i,
  /PASSWORD/i,
  /ACCESS_TOKEN/i,
  /REFRESH_TOKEN/i,
  /_TOKEN$/i,
  /APP_SECRET/i,
];

export function isPrivilegedEnvName(name: string): boolean {
  return PRIVILEGED_ENV_PATTERNS.some((pattern) => pattern.test(name));
}

/**
 * Retorna os nomes de variáveis que são simultaneamente públicas
 * (`NEXT_PUBLIC_*`) e privilegiadas — ou seja, vazamentos.
 */
export function findLeakedPrivilegedEnvNames(raw: RawEnv): string[] {
  return Object.keys(raw)
    .filter((name) => name.startsWith("NEXT_PUBLIC_"))
    .filter((name) => isPrivilegedEnvName(name))
    .sort();
}

export function assertNoLeakedPrivilegedEnv(raw: RawEnv): void {
  const leaked = findLeakedPrivilegedEnvNames(raw);

  if (leaked.length > 0) {
    throw new Error(
      `Credencial privilegiada exposta com prefixo NEXT_PUBLIC_: ${leaked.join(", ")}. ` +
        "Segredos devem permanecer server-side.",
    );
  }
}

/**
 * Variáveis server-only conhecidas nesta fase.
 *
 * Fixa a convenção de nomes e alimenta `.env.example`. Cada valor ganha schema
 * efetivo na rodada que realmente passa a consumi-lo.
 */
export const SERVER_ONLY_ENV_NAMES = [
  "SUPABASE_SECRET_KEY",
  // Integração Meta (Rodada 003A). O schema efetivo vive em
  // `src/lib/meta/config.ts`, junto do resto da configuração da integração;
  // aqui ficam só os nomes, para que a convenção e o teste anti-vazamento
  // conheçam todas as variáveis server-only do projeto.
  "META_APP_ID",
  "META_APP_SECRET",
  "META_LOGIN_CONFIG_ID",
  "META_OAUTH_REDIRECT_URI",
  "META_GRAPH_API_VERSION",
] as const;

/**
 * Variáveis de ambiente SERVER-ONLY consumidas pela aplicação.
 *
 * Nada aqui pode ganhar prefixo `NEXT_PUBLIC_` — ver `SECURITY_MODEL.md` §6.
 * A Rodada 001E é a primeira a consumir de fato a secret key, no caminho
 * privilegiado de `src/lib/supabase/privileged.ts`.
 */
export const serverEnvSchema = z.object({
  SUPABASE_SECRET_KEY: z.string().min(1),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function parseServerEnv(raw: RawEnv): ServerEnv {
  // Um segredo público é falha de configuração, não detalhe: a leitura falha
  // antes de qualquer uso, e não só para as chaves deste schema.
  assertNoLeakedPrivilegedEnv(raw);

  const result = serverEnvSchema.safeParse({
    SUPABASE_SECRET_KEY: raw.SUPABASE_SECRET_KEY,
  });

  if (!result.success) {
    // Só os NOMES das variáveis inválidas entram na mensagem. O valor de uma
    // credencial nunca pode atravessar log, stack trace ou resposta de erro
    // (`SECURITY_MODEL.md` §15).
    throw new Error(
      `Variáveis de ambiente server-only inválidas: ${result.error.issues
        .map((issue) => issue.path.join(".") || "(root)")
        .join(", ")}`,
    );
  }

  return result.data;
}

export function readServerEnv(): ServerEnv {
  return parseServerEnv(process.env as RawEnv);
}
