# RELATÓRIO — RODADA 001D — DEFAULT PRIVILEGES + GRANTS + RLS + ISOLAMENTO

Status: **EXECUTADA — AGUARDANDO AUDITORIA GPT**
Data: 2026-08-22
Branch: `claude/rodada-001d-rls-tenancy-isolamento`
Mandato: `rodadas/gpt/RODADA_001D_RLS_TENANCY_ISOLAMENTO.md` + `rodadas/gpt/CORRECAO_001D_01_DEFAULT_PRIVILEGES_SCOPE.md`

Esta versão substitui o relatório de bloqueio anterior (parada em §4.4, sem mutação, registrada no
histórico da branch). A retomada seguiu a Correção 001D-01: default privileges tratados somente para
`role postgres`, `supabase_admin` como risco residual aceito.

**Uma pendência bloqueante nova, provada e não contornada — ver §9.1.**

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
| probe função `SECURITY INVOKER` (tx + rollback) | `create function` | `has_function_privilege` **true** para PUBLIC/anon/authenticated/service_role — **FALHA, ver §9.1** |
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
| `supabase migration list --linked` | local == remoto nas três migrations |
| provas SQL / Auth / Data API | §5, §6, §7 |

Branch: `claude/rodada-001d-rls-tenancy-isolamento`. Um único push com implementação, prova,
relatório e `estado.md`.

## 9. Pendências, riscos e divergências

### 9.1 BLOQUEANTE — default EXECUTE de funções não é fechável por `ALTER DEFAULT PRIVILEGES`

O critério de conclusão §14 ("default EXECUTE inseguro de futuras funções em `public` estiver
corrigido") **não foi atingido**, e não o contornei.

Provado em três medições independentes, todas transacionais com rollback:

1. em `public`, após a migration, uma função `SECURITY INVOKER` nova nasce com `proacl` **nulo** →
   PUBLIC mantém EXECUTE, e `anon`/`authenticated`/`service_role` o herdam;
2. o mesmo ocorre em um schema recém-criado, com o `ALTER` aplicado na mesma transação — não é
   particularidade de `public` nem cache;
3. **causa raiz:** num schema virgem, `REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC` não chega a criar a
   linha em `pg_default_acl` (`count = 0`). O comando é aceito e descartado. Idem para
   `REVOKE ALL ... FROM PUBLIC` e para a forma sem `FOR ROLE`. Já um `GRANT ... TO anon` no mesmo
   schema grava normalmente (`{anon=X/postgres}`) e a função seguinte nasce com
   `{=X/postgres,postgres=X/postgres,anon=X/postgres}` — ou seja, `defaclacl` funciona como delta
   sobre o `acldefault()` built-in, e o EXECUTE de PUBLIC embutido nesse built-in é inexpressável
   como remoção. PostgreSQL 17.6.

O que **foi** atingido: os grants nominais de `anon`/`authenticated`/`service_role` saíram dos
defaults de funções, e tabelas e sequências futuras estão efetivamente fechadas (§5).

Divergência com a doc oficial do Supabase, que prescreve exatamente esse `revoke` como caminho de
hardening. Não implementei mitigação alternativa (event trigger ou equivalente): seria arquitetura
nova, fora do escopo autorizado.

Mitigação já vigente e suficiente hoje: nenhuma função nova foi criada nesta rodada, e a única
função em `public` (`rls_auto_enable`) teve a ACL fechada explicitamente na 001A. O padrão a manter —
até decisão do GPT — é **REVOKE explícito na migration que cria cada função**.

**Decisão pedida ao GPT:** aceitar esse padrão como regra permanente, autorizar um mecanismo
automático em rodada própria, ou escalar ao Supabase.

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

Fica aberta a pendência §9.1, com causa raiz provada e sem solução improvisada.

Parado aguardando auditoria GPT. Nenhuma etapa posterior iniciada.
