# RELATÓRIO — RODADA 001D — DEFAULT PRIVILEGES + GRANTS + RLS + ISOLAMENTO

Status: **EXECUTADA COM CORREÇÃO 001D-02 — AGUARDANDO AUDITORIA GPT**
Data: 2026-08-22 (execução base) · 2026-08-23 (correção 001D-02)
Branch: `claude/rodada-001d-rls-tenancy-isolamento`
Mandato: `rodadas/gpt/RODADA_001D_RLS_TENANCY_ISOLAMENTO.md` + `rodadas/gpt/CORRECAO_001D_01_DEFAULT_PRIVILEGES_SCOPE.md` + `rodadas/gpt/CORRECAO_001D_02_GLOBAL_FUNCTION_DEFAULT_EXECUTE.md`

Esta versão substitui o relatório de bloqueio anterior (parada em §4.4, sem mutação, registrada no
histórico da branch). A retomada seguiu a Correção 001D-01: default privileges tratados somente para
`role postgres`, `supabase_admin` como risco residual aceito.

A pendência bloqueante registrada em §9.1 foi **resolvida** pela Correção 001D-02 — ver §11.

## 1. Preflight

| Item | Resultado |
|---|---|
| toplevel / remote | `C:/Users/rpbri/Documents/trafegopago` · `rpbrito-art/trafegopago` OK |
| branch / working tree | branch esperada · limpa OK |
| project ref linkado | `cbnxdoxpyioxjwgjhbtq` OK · CLI 2.115.0 |
| árvore vs `origin/main` | idêntica exceto por este relatório (docs da correção já batem) |
| baseline §3 | reconfirmado integralmente antes de mutar — 2 tabelas, RLS on, 0 policies, ACL sem browser roles, `ensure_rls` ativo (`evtenabled='O'`), `rls_auto_enable` ACL da 001A intacta, objetos `public` owned por `supabase_admin` = **0** |

## 2. Arquivos alterados

- `supabase/migrations/20260823003128_harden_default_privileges_grants_and_rls_policies.sql` (novo);
- `supabase/migrations/20260823103521_revoke_global_default_execute_on_functions.sql` (novo — correção 001D-02);
- `scripts/rls-isolation-001d.mjs` (novo — prova §9, versionado para reexecução na auditoria);
- `rodadas/claude/RELATORIO_RODADA_001D_RLS_TENANCY_ISOLAMENTO.md`;
- `estado.md` (campos de execução).

Nenhum código de produto (`src/`) alterado.

## 3. Decisões não óbvias

1. **`revoke all` em vez da lista nominal de privilégios** nos default privileges de `postgres`: é a
   forma da doc oficial e é superconjunto do exigido pela correção §2 (cobre também TRUNCATE,
   REFERENCES, TRIGGER).
2. **`service_role` recebe `grant all` explícito** nas duas tabelas. O acesso efetivo atual vinha do
   default privilege que esta migration revoga; sem o grant explícito, o caminho server-side passaria
   a depender de um default que deixou de existir. Preserva exatamente o `arwdDxtm` anterior.
3. **Policy de `organizations` usa `id in (subquery)`** em vez de `EXISTS` correlacionado: a subquery
   é avaliada por statement e usa `organization_members_user_id_idx`, em vez de rodar por linha.
4. **Nenhuma `SECURITY DEFINER` criada** — §6.4 não precisou ser acionado. A única `SECURITY DEFINER`
   em `public` continua sendo `rls_auto_enable` (001A), com ACL preservada.
5. **Comentário da migration corrigido após aplicação** para não afirmar um efeito que a prova
   desmentiu (§9.1). Os statements executáveis não mudaram em nenhum caractere; nada foi reaplicado.

## 4. Migration / DDL

Statements, em três camadas:

- default privileges de `postgres` em `public`: `revoke all` sobre tables/sequences/functions para
  `anon`, `authenticated`, `service_role`; `revoke execute on functions from public`;
- grants: `anon` sem nada; `authenticated` com `SELECT` nas duas tabelas; `service_role` com `all`
  explícito;
- policies `SELECT` `TO authenticated`: `organization_members_select_own`
  (`user_id = (select auth.uid())`) e `organizations_select_by_active_membership`
  (`status = 'ACTIVE'` + membership `ACTIVE` do próprio `auth.uid()`).

Zero policies de escrita. `supabase_admin` não foi tocado (correção §1.1).

Rollback conceitual (não executado): `drop policy` nas duas policies, `revoke select ... from
authenticated`, e `alter default privileges ... grant` restaurando o baseline anterior.

## 5. Provas — default privileges e probe

| Prova | Comando/fonte | Resultado |
|---|---|---|
| defaults de `postgres` em `public` | `pg_default_acl` pós-migration | `r`, `f`, `S` reduzidos a `{postgres=.../postgres}` — `anon`/`authenticated`/`service_role` fora OK |
| defaults de `supabase_admin` | idem | inalterados, como decidido OK |
| objetos `public` owned por `supabase_admin` | `pg_class`/`pg_get_userbyid` | **0** — gatilho de reabertura não acionado OK |
| probe tabela (tx + rollback) | `create table` em `public` | RLS auto-habilitado por `ensure_rls`; `relacl` owner-only; `has_table_privilege` **false** para os 3 papéis OK |
| probe sequência (tx + rollback) | `create sequence` | `has_sequence_privilege` **false** para os 3 papéis OK |
| probe função `SECURITY INVOKER` (tx + rollback) | `create function` | `has_function_privilege` **true** para PUBLIC/anon/authenticated/service_role — falhou nesta etapa; **corrigido em §11** |
| resíduo de probes | `pg_class`/`pg_proc`/`pg_namespace` like `probe_001d%` | 0 OK |

## 6. Prova §9 — isolamento real, 2 usuários × 2 organizações

`node scripts/rls-isolation-001d.mjs` — usuários criados pela API admin, sessões/JWT reais por Auth,
todas as leituras/escritas pela Data API com publishable key. A=`owner`, B=`member`.

**21/21 provas aprovadas.** Sem PII no output (e-mails `@example.com` descartáveis, nunca impressos).

| Grupo | Resultado |
|---|---|
| leitura de `organizations` | A e B leem só a própria; consulta direta à org alheia → 0 linhas |
| leitura de `organization_members` | cada um lê só a própria linha; membership alheia → 0 linhas |
| membership `INACTIVE` | A perde o tenant (0 linhas) e o recupera ao reativar |
| org `INACTIVE` | não é lida nem pelo `owner` |
| `anon` | `42501` em ambas as tabelas |
| escrita `authenticated` | UPDATE/INSERT/DELETE em org própria e alheia → `42501`, inclusive para `owner` |
| escalação de role | B (`member`) tentando virar `owner` → `42501` |
| limpeza | memberships caem por CASCADE; orgs e usuários removidos; resíduo 0 |

Confirmação pós-limpeza: `organizations`=0, `organization_members`=0, `auth.users`=1 (o usuário real
pré-existente), usuários `@example.com`=0, tabelas em `public`=2.

## 7. Advisor

`supabase db advisors --linked --type security`: **os dois INFO `rls_enabled_no_policy` desapareceram**.
Resta apenas o WARN pré-existente `auth_leaked_password_protection`. Zero ERROR, nenhum WARN novo.
`ensure_rls` ativo; ACL de `rls_auto_enable()` segue `{postgres=X/postgres,service_role=X/postgres}`.

## 8. Gates

| Gate | Resultado |
|---|---|
| `git diff --check` | limpo |
| `npm run lint` | limpo |
| `npm run typecheck` | limpo |
| `npm ci` / `npm test` / `npm run build` | não executados localmente — nenhuma dependência, lockfile ou código de runtime alterado (§12); a CI roda a bateria completa sobre o head |
| `supabase migration list --linked` | local == remoto nas quatro migrations (§11) |
| provas SQL / Auth / Data API | §5, §6, §7 |

Branch: `claude/rodada-001d-rls-tenancy-isolamento`. Um único push com implementação, prova,
relatório e `estado.md`.

## 9. Pendências, riscos e divergências

### 9.1 RESOLVIDA pela Correção 001D-02 — default EXECUTE global de funções

Registro original: o critério §14 do mandato-base não foi atingido pela migration `20260823003128_*`,
que usou `revoke execute on functions from public` **com `IN SCHEMA public`**. Provado em três
medições transacionais que o comando era aceito e descartado (nem chegava a gravar linha em
`pg_default_acl`), e que funções novas nasciam com `proacl` nulo, herdando o `EXECUTE` de PUBLIC
embutido em `acldefault()`.

O diagnóstico GPT (correção 001D-02 §1) corrigiu a conclusão: no PostgreSQL 17 defaults por schema
são **adicionados** aos globais e não podem revogar privilégio concedido globalmente. A remoção é
expressável — mas só no default **global**, sem `IN SCHEMA`. Resolvido em §11.

### 9.2 Demais

- `supabase_admin`: default ACL residual segue existente e inerte; `count` de objetos `public` owned
  por ele permanece 0 — condição da correção §1.2 mantida.
- `auth_leaked_password_protection`: WARN conhecido de Auth, não bloqueia (correção §6).
- `scripts/rls-isolation-001d.mjs` lê `.env.local` e usa a secret key apenas localmente,
  fora do bundle. Nenhum segredo, token, e-mail ou PII em código, log, commit ou neste relatório.

## 10. Conclusão

Fundação de autorização multi-tenant fechada nas três camadas para as tabelas promovidas: defaults de
`postgres` endurecidos, `authenticated` somente com SELECT, `anon` sem acesso, `service_role`
explícito, duas policies de leitura não recursivas, e isolamento provado com sessões reais —
21/21, incluindo negação de escrita para `owner` e limpeza sem resíduo. Advisor sem regressão e com
os dois INFO da 001C resolvidos.

A pendência §9.1 deixou de existir com a Correção 001D-02 (§11): o default `EXECUTE` de PUBLIC sobre
funções futuras de `postgres` está fechado, provado e versionado.

Parado aguardando auditoria GPT. Nenhuma etapa posterior iniciada.

## 11. Correção 001D-02 — default EXECUTE global de funções

Mandato: `rodadas/gpt/CORRECAO_001D_02_GLOBAL_FUNCTION_DEFAULT_EXECUTE.md`. Escopo estrito: fechar a
pendência §9.1. Nada da 001D base foi refeito; a migration `20260823003128_*` não teve um caractere
de SQL executável alterado.

Ferramenta das provas: `supabase db query --linked` (Management API, conecta como `postgres`,
read-write). O MCP Supabase conecta como `supabase_read_only_user` e não serve para DDL/probe.

### 11.1 Prova prévia em transação revertida (correção §2)

`begin; alter default privileges for role postgres revoke execute on functions from public;` +
`create function public.probe_001d02_fn() ... security invoker` + asserts + `rollback;`

| Assert | Resultado |
|---|---|
| `proacl` da probe | `{postgres=X/postgres}` — não nulo, PUBLIC fora OK |
| `EXECUTE` efetivo de PUBLIC (`aclexplode` sobre `coalesce(proacl, acldefault())`, grantee=0) | **0** OK |
| `anon` / `authenticated` / `service_role` EXECUTE | **false** nos três OK |
| linha global em `pg_default_acl` (`defaclobjtype='f'`, `defaclnamespace=0`) | criada: `{postgres=X/postgres}` OK |
| resíduo pós-rollback | função 0 · linha global `pg_default_acl` 0 OK |

A prova passou, então a correção foi aplicada. Nenhum event trigger ou arquitetura alternativa criada.

### 11.2 Migration

`supabase/migrations/20260823103521_revoke_global_default_execute_on_functions.sql`, criada por
`supabase migration new` e aplicada por `supabase db push --linked`. Um único statement executável:
`alter default privileges for role postgres revoke execute on functions from public;` — sem
`IN SCHEMA`. O resto do arquivo é comentário registrando causa raiz, escopo global aceito e a regra
operacional decorrente.

### 11.3 Provas pós-migration (correção §5, 9 itens)

| # | Prova | Fonte | Resultado |
|---|---|---|---|
| 1 | migrations local == remoto | `supabase migration list --linked` | 4/4 pareadas, incl. `20260823103521` OK |
| 2 | default global de funções de `postgres` | `pg_default_acl` (`f`, ns=0) | `{postgres=X/postgres}` — sem PUBLIC OK |
| 3 | probe reversível em `public` | tx + rollback | `proacl={postgres=X/postgres}`; PUBLIC=0; anon/authenticated/service_role **false** OK |
| 4 | ACL de funções existentes | `pg_proc` owned por `postgres`, diff antes×depois | **50 funções, diff vazio** OK |
| 5 | `rls_auto_enable()` e `ensure_rls` | `pg_proc` / `pg_event_trigger` | `{postgres=X/postgres,service_role=X/postgres}` · `evtenabled='O'` OK |
| 6 | defaults por schema da 001D | `pg_default_acl` + probes tabela/sequência | `r={postgres=arwdDxtm/postgres}`, `S={postgres=rwU/postgres}`; probes com privilégio **false** nos 3 papéis; RLS auto-habilitado OK |
| 7 | objetos `public` owned por `supabase_admin` | `pg_class` | **0** OK |
| 8 | Advisor security | Supabase advisors pós-migration | só o WARN pré-existente `auth_leaked_password_protection`; 0 ERROR, nenhum novo OK |
| 9 | resíduo de probes | `pg_proc`/`pg_class` like `probe_001d%` | **0** OK |

Sem regressão nas tabelas promovidas: `public` com 2 tabelas e 2 policies; `anon` sem SELECT,
`authenticated` e `service_role` com SELECT — idêntico ao pós-001D. Por isso a prova 21/21 de
isolamento **não foi reexecutada** (correção §5 a dispensa quando policy/grant de tabela não muda).

### 11.4 Gates da correção (§6)

`git diff --check` limpo. Nenhum TS/JS/dependência alterado — bateria frontend local não reexecutada
por ritual (correção §6); a CI remota roda o conjunto completo sobre o head final.

### 11.5 Consequência operacional permanente

`ALTER DEFAULT PRIVILEGES` é global para funções futuras de `postgres` neste banco, em qualquer
schema. Toda função futura que precise ser chamada por `anon`, `authenticated`, `service_role` ou
PUBLIC deve receber `GRANT EXECUTE` explícito e versionado na migration da própria feature. Funções
existentes não foram afetadas (prova 4). Defaults de `supabase_admin` não foram tocados.
