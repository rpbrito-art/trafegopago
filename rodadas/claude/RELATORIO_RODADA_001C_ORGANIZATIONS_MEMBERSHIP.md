# RELATÓRIO — RODADA 001C — ORGANIZATIONS + MEMBERSHIP

Executor: Claude Code
Data: 2026-08-22
Mandato: `rodadas/gpt/RODADA_001C_ORGANIZATIONS_MEMBERSHIP.md`
Branch: `claude/rodada-001c-organizations-membership`
Status: **EXECUTADA — AGUARDANDO AUDITORIA GPT**

## 1. Preflight

| item | resultado |
|---|---|
| toplevel | `C:/Users/rpbri/Documents/trafegopago` |
| remote origin | `rpbrito-art/trafegopago` |
| base | `main` limpa, sincronizada com `origin/main` (`8d1a891`) |
| `supabase --version` | `2.115.0` |
| project ref linkado | `cbnxdoxpyioxjwgjhbtq` (`supabase projects list` → `"linked":true`) |
| migration history pré-rodada | local = remoto = `20260822212544` |

Nenhum arquivo não rastreado além da própria migration criada.

## 2. Arquivos alterados

- `supabase/migrations/20260822234354_create_organizations_and_members.sql` (novo);
- `rodadas/claude/RELATORIO_RODADA_001C_ORGANIZATIONS_MEMBERSHIP.md` (novo);
- `estado.md` (campos de execução).

Nenhum arquivo TypeScript/JavaScript foi tocado.

## 3. Decisões não óbvias

**3.1 REVOKE explícito era obrigatório, não decorativo.** Auditoria de `pg_default_acl`
antes do DDL mostrou que o schema `public` concede `arwdDxtm` (ALL) a `anon` e
`authenticated` em toda tabela nova — nos defaults de `postgres` **e** de
`supabase_admin`. Sem intervenção, as duas tabelas nasceriam com privilégios
concedidos aos papéis do browser. O mandato §3.3 previa a hipótese; ela se confirmou.

**3.2 Default privileges globais do schema não foram alterados.** O REVOKE é escopado
às duas tabelas. Alterar os defaults afeta toda tabela futura e é decisão de
arquitetura de grants — pertence à 001D. Registrado em §9.1.

**3.3 PK composta sem unique index redundante.** `primary key (organization_id, user_id)`
já satisfaz a unicidade canônica do `DATA_MODEL` §2. O índice dedicado por `user_id`
existe porque a PK indexa `(organization_id, user_id)` nessa ordem e não serve ao
lookup "quais orgs este usuário tem".

**3.4 Sem trigger de `updated_at`.** O mandato §3.4 proíbe funções próprias nesta
rodada; `updated_at` fica a cargo do domínio na mutação.

**3.5 Provas de escrita via `supabase db query --linked`.** O MCP Supabase é
read-only (`25006: cannot execute INSERT in a read-only transaction`) e o teste
transacional do §5.1 exige escrita. Usado o subcomando oficial da CLI, no project ref
linkado. Nenhum gate foi contornado: `supabase db push` executou normalmente e todo
DDL persistente veio da migration versionada.

## 4. Provas

| prova | comando/fonte | resultado |
|---|---|---|
| 1. migration local/remota alinhadas | `supabase migration list` | `20260822212544` e `20260822234354` presentes local **e** remoto |
| 2. só as 2 tabelas de tenancy em `public` | `pg_tables` | `public_tables=2`: `organizations`, `organization_members` (baseline pré-rodada era `0`) |
| 3. colunas/defaults/PK/CHECK/FK/índice | `information_schema.columns`, `pg_constraint`, `pg_indexes` | conforme §3.1/§3.2 — detalhe em 4.1 |
| 4. `relrowsecurity` | `pg_class` | `organizations=true`, `organization_members=true` |
| 5. zero policies | `pg_policy` | `0` nas duas tabelas |
| 6a. privilégio declarado do browser | `has_table_privilege` × 2 roles × 2 tabelas × 4 verbos | **16/16 = false** |
| 6b. negação real em execução | `set local role` + SELECT/INSERT | `anon` SELECT → `42501`; `authenticated` SELECT → `42501`; `authenticated` INSERT → `42501` |
| 6c. ACL das tabelas | `pg_class.relacl` | `{postgres=arwdDxtm/postgres,service_role=arwdDxtm/postgres}` — sem `anon`/`authenticated` |
| 6d. grants via information_schema | `role_table_grants` filtrado por `anon\|authenticated\|PUBLIC` | conjunto vazio |
| 7. `ensure_rls` ativo | `pg_event_trigger` (`evtenabled <> 'D'`) | `1` |
| 8. Security Advisor | `get_advisors(security)` | sem nova regressão de banco — detalhe em 4.2 |
| 9. zero resíduos | `count(*)` nas duas tabelas após provas | `orgs=0`, `members=0` |
| 10. nada fora de escopo | `pg_proc`/`pg_trigger` em `public` | `public_functions=1` (apenas `rls_auto_enable` da 001A), `public_triggers=0` |

### 4.1 Constraints verificadas no banco real

`organizations`: PK `(id)`; `name_not_blank` (`btrim(name)` não vazio); `name_max_length`
(`char_length(name) <= 160`); `status_valid` `ACTIVE|INACTIVE`; `default_currency_valid`
(regex de três letras maiúsculas). Defaults: `gen_random_uuid()`, `'ACTIVE'`,
`'America/Sao_Paulo'`, `'BRL'`, `now()`, `now()`.

`organization_members`: PK `(organization_id, user_id)`; FK → `public.organizations(id)`
`ON DELETE CASCADE`; FK → `auth.users(id)` `ON DELETE CASCADE`; `role_valid`
`owner|admin|member`; `status_valid` `ACTIVE|INACTIVE`; índice
`organization_members_user_id_idx` em `(user_id)`.

### 4.2 Advisor

- 2× **INFO** `rls_enabled_no_policy` nas duas tabelas — consequência direta e
  **autorizada** do escopo (o mandato §3.3 proíbe policies aqui); resolve na 001D;
- 1× **WARN** `auth_leaked_password_protection` — pendência conhecida e pré-existente
  de Auth (`estado.md` §5.1), **não causada pela 001C**, inalterada;
- nenhum WARN/ERROR novo de banco.

### 4.3 Teste transacional de constraints (§5.1)

Bloco `DO` único, encerrado por `RAISE EXCEPTION` deliberado para forçar rollback
total — por isso o resultado chega como `P0001` e não há resíduo. `user_id` obtido de
`auth.users` apenas como referência técnica; nenhum e-mail ou PII registrado.

```
org_valida=OK | nome_vazio=REJEITADO | nome_161=REJEITADO | moeda_invalida=REJEITADO
| status_org_invalido=REJEITADO | role_invalida=REJEITADO | status_member_invalido=REJEITADO
| fk_user_inexistente=REJEITADO | fk_org_inexistente=REJEITADO | membership_valida=OK
| membership_duplicada=REJEITADO | defaults_org_ok=1 | defaults_member_ok=1
| cascade_membership_restante=0
```

Cobre os sete casos exigidos pelo mandato, mais status inválido nas duas tabelas,
FK de organização inexistente e conferência de defaults.

## 5. Migration / DDL

`supabase/migrations/20260822234354_create_organizations_and_members.sql`, criada por
`supabase migration new` (timestamp gerado pela CLI, não manual) e aplicada por
`supabase db push` → `"migrations":["20260822234354_create_organizations_and_members.sql"]`.

Conteúdo: as duas tabelas, constraints/FKs/índice, `ENABLE ROW LEVEL SECURITY`
explícito nas duas e `REVOKE ALL ... FROM anon, authenticated` escopado às duas.
Zero policies, zero funções, zero triggers.

Rollback: `drop table public.organization_members;` seguido de
`drop table public.organizations;` — sem dependentes, schema `public` estava vazio
antes da rodada.

## 6. Configuração remota

Nenhuma mudança de configuração remota aplicada nem pendente. Nenhum gate humano foi
necessário: `supabase db push` executou sem bloqueio.

## 7. Gates

Mandato §7: a rodada altera apenas SQL + documentação de handoff, e nenhum arquivo
TS/JS foi tocado (`git status --porcelain` antes do commit listava só a migration).
Portanto, conforme autorizado, **não** foram executados `npm ci`, lint, typecheck,
test ou build locais. Executados: `git diff --check` (limpo, exit 0) e as
verificações SQL/Supabase da seção 4. A CI remota sobre o head da branch é o gate
limpo do conjunto.

## 8. Branch

`claude/rodada-001c-organizations-membership` — criada a partir da `main` limpa.
Push único contendo migration + relatório + `estado.md`. Sem merge, sem force push,
sem reescrita de histórico.

## 9. Pendências, riscos e divergências

1. **Default privileges globais do schema `public`** ainda concedem ALL a `anon`/
   `authenticated` para tabelas futuras. As tabelas da 001C estão fechadas, mas a
   próxima tabela criada nascerá aberta se ninguém revogar. **Entra como decisão da
   001D**, junto do desenho de grants. Risco atual: baixo (não há outra tabela).
2. `auth_leaked_password_protection` desabilitado — hardening de Auth, pré-existente.
3. Brevo Free permanece SMTP provisório de desenvolvimento.
4. Pendência de default privileges **para funções** segue aberta; a 001C não criou
   nenhuma função própria.
5. Nenhuma divergência entre mandato e documentação canônica foi encontrada.

## 10. Conclusão

Fundação relacional de tenancy criada por migration versionada e aplicada no project
ref autorizado. Estrutura, constraints, FKs e índice conforme contrato; RLS
explicitamente habilitado; zero policies; acesso de `anon`/`authenticated` fechado e
provado negado em execução; constraints provadas transacionalmente sem resíduos;
nenhuma tabela, função ou trigger fora de escopo; Advisor sem regressão nova de banco.

Rodada 001D **não** iniciada e **não** autorizada. Execução parada aguardando
auditoria do GPT.
