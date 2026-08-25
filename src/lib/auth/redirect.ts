import { ROUTES } from "./routes";

/**
 * Destino padrão após autenticação bem-sucedida.
 *
 * A partir da 004D é `/inicio`, e não `/conta`: quem entra deve encontrar o
 * próximo passo do negócio, não uma tela de configuração onde precisa deduzir
 * sozinho o que fazer. `/conta` continua existindo como conta/configuração.
 */
export const DEFAULT_AUTHENTICATED_REDIRECT: string = ROUTES.start;

/**
 * Allowlist estrita de destinos aceitos em `?next=`.
 *
 * `SECURITY_MODEL.md` §8 exige allowlist de redirect. Nesta rodada o conjunto de
 * destinos legítimos pós-autenticação é pequeno e conhecido, então a allowlist é
 * por caminho exato — mais restritiva (e mais fácil de auditar) do que validar
 * "parece interno". Quando o produto tiver rotas profundas, esta lista cresce de
 * forma explícita, nunca por heurística.
 */
export const ALLOWED_REDIRECT_PATHS: readonly string[] = [
  ROUTES.start,
  ROUTES.focus,
  ROUTES.account,
  ROUTES.home,
];

/**
 * Caracteres de controle (incluindo NUL, CR e LF), usados em response splitting
 * e em bypass de parsers de URL.
 */
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

/**
 * Verifica se um valor é um caminho interno seguro.
 *
 * Rejeita, entre outros: URL absoluta (`https://evil.com`), protocol-relative
 * (`//evil.com`), backslash (`/\evil.com`, tratado como `//` por vários
 * navegadores), esquemas exóticos (`javascript:`, `data:`), caracteres de
 * controle e qualquer valor que, ao ser resolvido, escape da origem atual.
 */
export function isSafeInternalPath(value: string): boolean {
  if (value.length === 0 || value.length > 512) return false;
  if (!value.startsWith("/")) return false;
  if (value.startsWith("//")) return false;
  if (value.includes("\\")) return false;
  if (CONTROL_CHARS.test(value)) return false;

  // Prova final por resolução: se a URL resolvida sair da origem sentinela, o
  // valor não era interno, qualquer que tenha sido o truque de codificação.
  const sentinel = "https://internal.invalid";
  let resolved: URL;
  try {
    resolved = new URL(value, sentinel);
  } catch {
    return false;
  }

  return resolved.origin === sentinel;
}

/**
 * Resolve o destino pós-autenticação a partir de um `next` não confiável.
 *
 * Sempre devolve um caminho interno conhecido: valor ausente, malformado,
 * externo ou fora da allowlist cai silenciosamente no destino padrão. Nunca
 * lança e nunca ecoa o valor recebido.
 */
export function sanitizeRedirect(
  next: string | null | undefined,
  fallback: string = DEFAULT_AUTHENTICATED_REDIRECT,
): string {
  if (typeof next !== "string") return fallback;

  const candidate = next.trim();
  if (!isSafeInternalPath(candidate)) return fallback;

  // Query string e fragmento não fazem parte da allowlist: compara-se só o path.
  const { pathname } = new URL(candidate, "https://internal.invalid");
  if (!ALLOWED_REDIRECT_PATHS.includes(pathname)) return fallback;

  return pathname;
}
