# HISTORY SUMMARY — TRÁFEGO PAGO

Atualizado: 2026-08-22

Este arquivo resume somente estado **auditado e promovido**. Ele substitui a leitura rotineira de relatórios antigos; as evidências originais continuam preservadas em `rodadas/` e no Git.

## Fundação documental — Etapas 1, 2A, 2B e 3

- MVP inicial definido para Instagram + Meta Ads + geração/aprendizagem sobre leads.
- Pesquisa técnica e revisão adversarial concluídas.
- Arquitetura canônica consolidada: Next.js/TypeScript + Supabase + APIs oficiais Meta + AI Router multi-provedor.
- Regras estruturais consolidadas: tenancy por organização, RLS, approval gate para gasto, IA sem autonomia financeira, cálculos determinísticos fora de LLM, custo de IA por execução.

Referências principais atuais: `docs/01-produto/MVP_CANONICAL.md` e `docs/03-canonical/`.

## Rodada 000 — Bootstrap Técnico

Resultado promovido:

- aplicação Next.js 16.3.2 + React 19.2.8 + TypeScript;
- App Router;
- lint, typecheck, Vitest e build;
- GitHub Actions CI;
- clientes Supabase browser/server com `@supabase/ssr` e publishable key;
- convenção de env/secrets;
- nenhum schema de domínio antecipado.

Auditoria: `rodadas/gpt/AUDITORIA_RODADA_000_BOOTSTRAP_TECNICO.md`
Relatório original: `rodadas/claude/RELATORIO_RODADA_000_BOOTSTRAP_TECNICO.md`
PR: #1. Merge: `9f0f6aaa205fe5b774faab92c34e8373e4ef7d6c`.

## Rodada 001A — Baseline Supabase e Segurança

Resultado promovido:

- baseline remoto inventariado;
- migration `20260822212544_harden_rls_auto_enable_privileges.sql` aplicada e versionada;
- `EXECUTE` de `public.rls_auto_enable()` removido de `PUBLIC`, `anon` e `authenticated`;
- `postgres` e `service_role` permanecem com EXECUTE;
- event trigger `ensure_rls` continua habilitando RLS automaticamente em novas tabelas `public`;
- prova transacional confirmou auto-enable de RLS sem deixar tabela residual;
- `.claude/commands/proxima.md` e `.gitattributes` versionados.

Auditoria: `rodadas/gpt/AUDITORIA_RODADA_001A_BASELINE_SUPABASE_SEGURANCA.md`
Relatório original: `rodadas/claude/RELATORIO_RODADA_001A_BASELINE_SUPABASE_SEGURANCA.md`
PR: #2. Merge: `fb9bc62e6cf25e03e39255bff7042e330a80e1d6`.

## Rodada 001B — Auth Real

Resultado promovido:

- autenticação real por e-mail/senha com Supabase Auth;
- confirmação de e-mail obrigatória;
- endpoint SSR `/auth/confirm` usando `token_hash` + `verifyOtp`;
- template de confirmação versionado e remoto com `type=email`;
- sessão SSR em cookies com `@supabase/ssr`;
- Next.js 16 `proxy.ts` para refresh/propagação da sessão;
- autorização mínima de página protegida com `getClaims()` server-side;
- proteção contra open redirect;
- cadastro, confirmação, logout, bloqueio pós-logout e login posterior validados por passagem E2E humana 9/9;
- smoke de integração real mantido como prova complementar, sem ser rotulado como E2E de UI;
- SMTP Brevo Free configurado apenas para desenvolvimento, permitindo customização de template no plano Free;
- nenhuma tabela, organization, membership ou RLS de domínio antecipada;
- CI final verde no head auditado `ea886def6face318e032f2ae940a7044a1ce0552`.

Auditoria: `rodadas/gpt/AUDITORIA_RODADA_001B_AUTH_REAL.md`
Relatório original: `rodadas/claude/RELATORIO_RODADA_001B_AUTH_REAL.md`
PR: #3. Merge: `4819875007784f9bc016abd57202fe1fe9a7063b`.

Pendências que sobrevivem:

- `auth_leaked_password_protection` desabilitado: hardening antes de clientes reais/produção;
- SMTP de produção/domínio autenticado ainda não definido;
- default privileges para futuras funções próprias antes de função sensível em schema exposto;
- rate limiting próprio quando necessário além do provider.

## Estado após esta reciclagem

Auth real está promovido. A próxima direção planejada é **Organizations + Membership**, seguida da fundação de RLS/isolamento de domínio. Não é necessário reler relatórios completos das Rodadas 000/001A/001B por padrão; consultar este resumo e abrir evidência histórica apenas quando surgir dependência concreta.
