# HISTORY SUMMARY — TRÁFEGO PAGO

Atualizado: 2026-08-23

Este arquivo resume somente estado **auditado e promovido**. Ele substitui a leitura rotineira de relatórios antigos; as evidências originais continuam preservadas em `rodadas/` e no Git.

## Fundação documental — Etapas 1, 2A, 2B e 3

- MVP inicial definido para Instagram + Meta Ads + geração/aprendizagem sobre leads.
- Pesquisa técnica e revisão adversarial concluídas.
- Arquitetura canônica consolidada: Next.js/TypeScript + Supabase + APIs oficiais Meta + AI Router multi-provedor.
- Regras estruturais consolidadas: tenancy por organização, RLS, approval gate para gasto, IA sem autonomia financeira, cálculos determinísticos fora de LLM e custo de IA por execução.

Referências atuais: `docs/01-produto/MVP_CANONICAL.md` e `docs/03-canonical/`.

## Rodada 000 — Bootstrap Técnico

Resultado promovido:
- Next.js 16.3.2 + React 19.2.8 + TypeScript;
- App Router;
- lint, typecheck, Vitest e build;
- GitHub Actions CI;
- clientes Supabase browser/server com `@supabase/ssr` e publishable key;
- convenção de env/secrets;
- nenhum schema de domínio antecipado.

Auditoria: `rodadas/gpt/AUDITORIA_RODADA_000_BOOTSTRAP_TECNICO.md`
PR #1. Merge: `9f0f6aaa205fe5b774faab92c34e8373e4ef7d6c`.

## Rodada 001A — Baseline Supabase e Segurança

Resultado promovido:
- migration `20260822212544_harden_rls_auto_enable_privileges.sql`;
- `EXECUTE` de `public.rls_auto_enable()` removido de `PUBLIC`, `anon` e `authenticated`;
- `postgres` e `service_role` permanecem com EXECUTE;
- event trigger `ensure_rls` auto-habilita RLS em novas tabelas `public`;
- prova transacional sem resíduo;
- `/proxima` e convenções de linha versionados.

Auditoria: `rodadas/gpt/AUDITORIA_RODADA_001A_BASELINE_SUPABASE_SEGURANCA.md`
PR #2. Merge: `fb9bc62e6cf25e03e39255bff7042e330a80e1d6`.

## Rodada 001B — Auth Real

Resultado promovido:
- autenticação real por e-mail/senha com Supabase Auth;
- confirmação SSR `/auth/confirm` usando `token_hash` + `verifyOtp`;
- template remoto/versionado com `type=email`;
- sessão SSR em cookies com `@supabase/ssr`;
- Next.js 16 `proxy.ts`;
- página protegida com `getClaims()` server-side;
- proteção contra open redirect;
- fluxo real cadastro → e-mail → confirmação → `/conta` → logout → bloqueio → login posterior validado 9/9;
- SMTP Brevo Free apenas para desenvolvimento.

Auditoria: `rodadas/gpt/AUDITORIA_RODADA_001B_AUTH_REAL.md`
PR #3. Merge: `4819875007784f9bc016abd57202fe1fe9a7063b`.

## Rodada 001C — Organizations + Membership

Resultado promovido:
- migration `20260822234354_create_organizations_and_members.sql`;
- `public.organizations` e `public.organization_members`;
- PKs, FKs, CHECKs, defaults e índice por `organization_members.user_id`;
- RLS explicitamente habilitado;
- zero policies deliberadamente, deixando autorização para a 001D;
- `anon` e `authenticated` sem privilégios funcionais nas duas tabelas;
- constraints/cascades provados sem resíduo;
- `ensure_rls` preservado.

Auditoria: `rodadas/gpt/AUDITORIA_RODADA_001C_ORGANIZATIONS_MEMBERSHIP.md`
PR #4. Merge: `a6b2e912f8d54005d1decf69cb4e4bf8335d31ec`.

## Rodada 001D — Default privileges + Grants + RLS + Isolamento

Resultado promovido após Correções 001D-01 e 001D-02:
- migration `20260823003128_harden_default_privileges_grants_and_rls_policies.sql`;
- migration `20260823103521_revoke_global_default_execute_on_functions.sql`;
- default privileges futuros de tabelas/sequências de `postgres` em `public` tornados opt-in;
- default global de EXECUTE para funções futuras owned por `postgres` fechado, exigindo GRANT explícito quando necessário;
- `authenticated` recebe somente SELECT em `organizations` e `organization_members`;
- `anon` permanece sem acesso;
- `service_role` atual preservado por grants explícitos;
- policy de membership permite ler somente a própria linha;
- policy de organizations exige organização ACTIVE + membership própria ACTIVE;
- nenhuma policy de escrita e nenhuma nova `SECURITY DEFINER`;
- prova adversarial real Auth/JWT/Data API 2 usuários × 2 organizações: 21/21;
- cross-tenant negado, estados INACTIVE retiram acesso e `owner` não ganha escrita;
- fixtures removidas sem resíduo;
- `rls_auto_enable()` e `ensure_rls` preservados;
- 50 funções atuais owned por `postgres` mantêm ACL explícita;
- `supabase_admin` possui zero objetos owned em `public`;
- Advisor final sem regressão de banco/RLS;
- CI final run `32635190849` verde.

O primeiro bloqueio da 001D mostrou que `postgres` não pode alterar defaults de `supabase_admin`. A decisão promovida é aceitar esse ACL residual enquanto nenhum objeto `public` pertencer a essa role; se isso mudar, a decisão deve ser reaberta.

O segundo bloqueio mostrou que `REVOKE EXECUTE ... IN SCHEMA public` não remove o default global de `PUBLIC`. A Correção 001D-02 aplicou o `ALTER DEFAULT PRIVILEGES` global para funções futuras de `postgres`, sem reescrever migration já aplicada.

Auditoria: `rodadas/gpt/AUDITORIA_RODADA_001D_RLS_TENANCY_ISOLAMENTO.md`
PR #5. Merge: `178c2aa0e4ada91ae2bae73d2ff97c21f27c0222`.

## Pendências transversais ainda abertas

- `auth_leaked_password_protection` desabilitado: hardening antes de clientes reais/produção;
- SMTP de produção/domínio autenticado ainda não definido;
- default ACL residual de `supabase_admin` monitorado enquanto inerte;
- funções futuras exigem GRANT EXECUTE explícito quando necessário;
- policies de escrita/gestão de Organizations/Membership ainda não definidas;
- `business_profiles` ainda não criado;
- rate limiting próprio continua futuro conforme risco/endpoint.

## Estado após esta reciclagem

A fundação de Auth + tenancy de leitura está promovida: autenticação real, schema mínimo, grants explícitos, RLS e isolamento real por organização. Não há mandato executável pendente.

A próxima etapa deve ser planejada a partir do estado real, considerando `business_profiles`, fluxo mínimo conta → organização → negócio e o mecanismo seguro de criação/gestão de tenancy. Nenhuma nova rodada foi autorizada automaticamente.

Não é necessário reler relatórios completos das Rodadas 000–001D por padrão; consultar este resumo e abrir evidência histórica somente quando surgir dependência concreta.