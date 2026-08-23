# AUDITORIA GPT — RODADA 001D — RLS TENANCY E ISOLAMENTO

Data: 2026-08-23
Classificação: **APROVADA E PROMOVIDA**

## 1. Escopo auditado

Mandato-base:
`rodadas/gpt/RODADA_001D_RLS_TENANCY_ISOLAMENTO.md`

Correções:
- `rodadas/gpt/CORRECAO_001D_01_DEFAULT_PRIVILEGES_SCOPE.md`
- `rodadas/gpt/CORRECAO_001D_02_GLOBAL_FUNCTION_DEFAULT_EXECUTE.md`

Branch auditada:
`claude/rodada-001d-rls-tenancy-isolamento`

Head técnico final do Claude:
`055b411db15355515d7cb5cb35a3fd724058f589`

Head final reconciliado para CI/PR:
`ca1fe3b54890834ba16b9126ccee7c6c4ed4ef77`

PR: #5
Merge: `178c2aa0e4ada91ae2bae73d2ff97c21f27c0222`
CI final: run `32635190849` — success.

## 2. Git e aderência ao escopo

A PR final contém somente:
- `estado.md`;
- relatório Claude da 001D;
- correção documental 001D-02;
- script de prova `scripts/rls-isolation-001d.mjs`;
- migration base `20260823003128_*`;
- migration corretiva `20260823103521_*`.

Nenhum código de produto em `src/` foi alterado. Nenhuma etapa posterior foi antecipada.

A branch e a `main` haviam divergido apenas por commits documentais GPT publicados durante as correções. A reconciliação foi feita sem alteração de árvore técnica, e a PR passou a ser mergeável antes da promoção.

## 3. Migrations e default privileges

Migrations remotas confirmadas:
- `20260822212544`;
- `20260822234354`;
- `20260823003128`;
- `20260823103521`.

A migration `20260823003128_*`:
- endurece defaults de tabelas/sequências/funções para `postgres` em `public`;
- concede `authenticated` somente SELECT nas duas tabelas atuais;
- mantém `anon` sem acesso;
- preserva `service_role` por grant explícito;
- cria duas policies SELECT não recursivas;
- não cria policy de escrita nem nova `SECURITY DEFINER`.

A Correção 001D-02 resolveu o único bloqueio restante. O `REVOKE EXECUTE` por schema não podia retirar o default global do PostgreSQL. A migration `20260823103521_*` aplica o comando global:

`ALTER DEFAULT PRIVILEGES FOR ROLE postgres REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC`.

Estado remoto final confirmado:
- default global de funções owned por `postgres`: `{postgres=X/postgres}`;
- zero `PUBLIC EXECUTE` por default para funções futuras owned por `postgres`;
- funções futuras que precisem execução exigem GRANT explícito por migration;
- 50 funções atuais owned por `postgres`, todas com ACL explícita (`null_acl=0`);
- `public.rls_auto_enable()` preserva `{postgres=X, service_role=X}`;
- `ensure_rls` permanece ativo.

## 4. Grants, RLS e isolamento

Estado remoto confirmado:
- `organizations` e `organization_members` com RLS ativo;
- `authenticated`: SELECT nas duas tabelas e sem INSERT/UPDATE/DELETE;
- `anon`: sem SELECT;
- `service_role`: acesso atual preservado explicitamente;
- policy `organization_members_select_own` restringe leitura à própria membership;
- policy `organizations_select_by_active_membership` exige organização ACTIVE + membership própria ACTIVE;
- zero policies de escrita.

Prova adversarial versionada executada pelo Claude com Auth/JWT/Data API real: **21/21**.
Incluiu 2 usuários × 2 organizações, cross-tenant vazio, membership/org INACTIVE retirando acesso, `anon` negado e escrita negada inclusive para `owner`.

Limpeza confirmada após a prova:
- `organizations` = 0;
- `organization_members` = 0;
- `auth.users` = 1, preservando apenas o usuário real pré-existente.

## 5. Segurança e Advisor

Security Advisor final:
- zero ERROR;
- zero WARN novo de banco/RLS;
- permanece somente `auth_leaked_password_protection` como WARN conhecido de Auth.

O risco residual de `supabase_admin` permanece aceito enquanto o schema `public` tiver zero objetos owned por essa role. Auditoria final confirmou count = 0. Se esse count deixar de ser zero, a decisão deve ser reaberta.

## 6. CI

Run `32635190849` no head reconciliado `ca1fe3b...`:
- install: success;
- lint: success;
- typecheck: success;
- test: success;
- build: success.

## 7. Conclusão

**RODADA 001D APROVADA E PROMOVIDA.**

A fundação de tenancy agora possui, de forma incorporada:
- defaults futuros opt-in para objetos criados por `postgres`;
- grants mínimos explícitos;
- RLS de leitura por membership;
- prova real de isolamento tenant;
- escrita direta do browser fechada;
- default global de EXECUTE de funções fechado.

Pendências não bloqueantes que sobrevivem:
- leaked password protection antes de clientes reais/produção;
- SMTP de produção/domínio autenticado;
- risco residual monitorado de defaults de `supabase_admin`;
- políticas de escrita/gestão de organizações e memberships ainda não desenhadas;
- `business_profiles` ainda não criado.

Nenhuma etapa posterior está autorizada por esta auditoria.