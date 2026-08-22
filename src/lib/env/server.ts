import "server-only";

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
 * A Rodada 000 não consome nenhuma delas — a fundação ainda não fala com
 * Supabase privilegiado nem com a Meta. Elas existem aqui para fixar a
 * convenção de nomes e alimentar `.env.example`. O schema efetivo será
 * introduzido na rodada que realmente precisar de cada valor.
 */
export const SERVER_ONLY_ENV_NAMES = ["SUPABASE_SECRET_KEY"] as const;
