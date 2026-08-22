/**
 * Rotas de autenticação.
 *
 * Centralizadas para que Proxy, Server Actions, Route Handler de confirmação e
 * páginas usem exatamente os mesmos caminhos. Qualquer divergência entre esses
 * pontos vira falha de guard ou redirect quebrado.
 *
 * Rotas de produto em pt-BR; `/auth/confirm` mantém o nome do padrão SSR
 * oficial do Supabase porque também aparece no template de e-mail.
 */
export const ROUTES = {
  /** Home pública. */
  home: "/",
  /** Login por e-mail/senha. */
  signIn: "/entrar",
  /** Cadastro por e-mail/senha. */
  signUp: "/cadastro",
  /** Aviso pós-cadastro: verifique a caixa de entrada. */
  checkEmail: "/cadastro/confirme-seu-email",
  /** Route Handler SSR que troca `token_hash` por sessão. */
  confirm: "/auth/confirm",
  /** Página segura de erro de autenticação (sem eco de parâmetros). */
  authError: "/auth/erro",
  /** Área protegida mínima desta rodada. Não é o dashboard do produto. */
  account: "/conta",
} as const;

export type Route = (typeof ROUTES)[keyof typeof ROUTES];

/**
 * Prefixos que exigem sessão.
 *
 * O Proxy usa isto para o redirect otimista; a autorização real continua sendo
 * feita server-side na própria rota (`requireUser`). Ver `SECURITY_MODEL.md`
 * §12: esconder a rota não é autorização.
 */
export const PROTECTED_PREFIXES: readonly string[] = [ROUTES.account];

/**
 * Rotas de autenticação das quais um usuário já autenticado deve ser tirado.
 */
export const AUTH_ENTRY_PATHS: readonly string[] = [ROUTES.signIn, ROUTES.signUp];

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix));
}

export function isAuthEntryPath(pathname: string): boolean {
  return AUTH_ENTRY_PATHS.some((prefix) => matchesPrefix(pathname, prefix));
}
