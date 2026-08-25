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
  /** Pedido público de recuperação de senha. */
  forgotPassword: "/recuperar-senha",
  /** Definição de nova senha. Só funciona sob sessão de recovery. */
  resetPassword: "/redefinir-senha",
  /** Route Handler SSR que troca `token_hash` por sessão. */
  confirm: "/auth/confirm",
  /** Página segura de erro de autenticação (sem eco de parâmetros). */
  authError: "/auth/erro",
  /** Área protegida mínima desta rodada. Não é o dashboard do produto. */
  account: "/conta",
  /**
   * Objetivo atual do negócio.
   *
   * Próximo passo natural depois de criar o negócio: sem ele, o onboarding
   * termina numa tela de resumo que não diz o que fazer agora.
   */
  objective: "/objetivo",
  /**
   * Ofertas do negócio.
   *
   * O que a empresa oferece deixa de ser uma linha de texto no perfil e passa
   * a ser catálogo estruturado com histórico (Rodada 004C).
   */
  offers: "/ofertas",
  /**
   * Callback do Facebook Login for Business.
   *
   * Precisa bater exatamente com o URI cadastrado no app Meta e com
   * `META_OAUTH_REDIRECT_URI`. Fica fora de `ALLOWED_REDIRECT_PATHS`: nenhum
   * fluxo interno deve poder despejar sessão aqui.
   */
  metaCallback: "/meta/callback",
} as const;

export type Route = (typeof ROUTES)[keyof typeof ROUTES];

/**
 * Marcador na URL de login depois de uma troca de senha bem-sucedida.
 *
 * Só um booleano: nada do que aconteceu no recovery — nem e-mail, nem
 * identificador — atravessa para uma URL que fica no histórico do navegador.
 *
 * Vive aqui, e não junto da Server Action, porque um arquivo `"use server"` só
 * pode exportar funções assíncronas.
 */
export const PASSWORD_RESET_DONE_PARAM = "redefinida";

/**
 * Prefixos que exigem sessão.
 *
 * O Proxy usa isto para o redirect otimista; a autorização real continua sendo
 * feita server-side na própria rota (`requireUser`). Ver `SECURITY_MODEL.md`
 * §12: esconder a rota não é autorização.
 */
export const PROTECTED_PREFIXES: readonly string[] = [
  ROUTES.account,
  ROUTES.objective,
  ROUTES.offers,
];

/**
 * Rotas de autenticação das quais um usuário já autenticado deve ser tirado.
 *
 * `resetPassword` fica **fora** desta lista de propósito: quem chega lá vem de
 * `/auth/confirm` já com sessão, e mandá-lo para `/conta` mataria justamente o
 * fluxo de recovery. A restrição dessa rota é outra — exige sessão de
 * recuperação, o que é verificado dentro da própria página.
 */
export const AUTH_ENTRY_PATHS: readonly string[] = [
  ROUTES.signIn,
  ROUTES.signUp,
  ROUTES.forgotPassword,
];

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix));
}

export function isAuthEntryPath(pathname: string): boolean {
  return AUTH_ENTRY_PATHS.some((prefix) => matchesPrefix(pathname, prefix));
}
