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

Pendências que sobreviveram: Auth real, tenancy, RLS de domínio; tooling ESLint com warning não bloqueante.

## Rodada 001A — Baseline Supabase e Segurança

Resultado promovido:

- baseline remoto inventariado;
- migration `20260822212544_harden_rls_auto_enable_privileges.sql` aplicada e versionada;
- `EXECUTE` de `public.rls_auto_enable()` removido de `PUBLIC`, `anon` e `authenticated`;
- `postgres` e `service_role` permanecem com EXECUTE;
- event trigger `ensure_rls` continua habilitando RLS automaticamente em novas tabelas `public`;
- prova transacional confirmou auto-enable de RLS sem deixar tabela residual;
- Supabase Security Advisor ficou sem achados;
- `.claude/commands/proxima.md` e `.gitattributes` versionados.

Auditoria: `rodadas/gpt/AUDITORIA_RODADA_001A_BASELINE_SUPABASE_SEGURANCA.md`

Relatório original: `rodadas/claude/RELATORIO_RODADA_001A_BASELINE_SUPABASE_SEGURANCA.md`

PR: #2. Merge: `fb9bc62e6cf25e03e39255bff7042e330a80e1d6`.

Pendências que sobreviveram:

- definir política de privilégios mínimos para funções próprias antes da primeira função privilegiada de domínio;
- decidir `ALTER DEFAULT PRIVILEGES ... REVOKE EXECUTE ...` antes da primeira função própria em schema exposto;
- Auth real continua inexistente.

## Estado após esta reciclagem

A próxima etapa substantiva é Auth real. Não é necessário ler os relatórios completos das Rodadas 000/001A para implementá-la, salvo se surgir uma dúvida histórica concreta não resolvida pelos contratos canônicos ou por este resumo.