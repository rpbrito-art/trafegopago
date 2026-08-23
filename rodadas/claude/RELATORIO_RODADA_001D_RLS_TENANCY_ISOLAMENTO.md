# RELATÓRIO — RODADA 001D — DEFAULT PRIVILEGES + GRANTS + RLS + ISOLAMENTO

Status: **BLOQUEADA — PARADA DETERMINADA PELO PRÓPRIO MANDATO (§4.4). NENHUMA MUTAÇÃO APLICADA.**
Data: 2026-08-22
Branch: `claude/rodada-001d-rls-tenancy-isolamento`

## 1. Preflight

| Item | Resultado |
|---|---|
| toplevel | `C:/Users/rpbri/Documents/trafegopago` OK |
| remote origin | `rpbrito-art/trafegopago` OK |
| working tree | limpa, `main` sincronizada com origin OK |
| `estado.md` / `.gpt/PROJECT_PROMPT.md` | presentes OK |
| CLI | supabase 2.115.0 |
| project ref linkado | `cbnxdoxpyioxjwgjhbtq` OK |
| migration history | local == remoto (`20260822212544`, `20260822234354`) OK |

## 2. Motivo da parada

O mandato §4.4 determina:

> "se `supabase_admin` não puder ser tratado de forma reprodutível por migration com o papel
> executor autorizado, **parar antes de aplicar solução parcial** e reportar ao GPT"

Essa condição foi **acionada e comprovada empiricamente**. Não apliquei migration, grants,
policies nem qualquer alteração remota. O banco permanece no baseline promovido da 001C.

## 3. Baseline reconfirmado (§3 do mandato) — conforme `estado.md`

| Prova | Fonte | Resultado |
|---|---|---|
| tabelas existem | `pg_class`/`pg_namespace` | `organizations`, `organization_members` OK |
| RLS habilitado | `relrowsecurity` | `true` em ambas OK |
| zero policies | `pg_policies` | 0 linhas OK |
| ACL sem browser roles | `relacl` | `postgres`, `service_role` apenas OK |
| `ensure_rls` ativo | `pg_event_trigger` | `evtenabled='O'` -> `rls_auto_enable()` OK |
| ACL de `rls_auto_enable()` | `pg_proc.proacl` | `postgres=X`, `service_role=X` (001A preservada) OK |
| nenhuma outra tabela de domínio | `pg_class` | 2 tabelas em `public` OK |
| `pg_default_acl` inseguro | `pg_default_acl` | pendência confirmada — ver §4 |
| Advisor security | `supabase db advisors --linked` | 2 INFO `rls_enabled_no_policy` + 1 WARN `auth_leaked_password_protection`; zero ERROR OK |

## 4. O bloqueio, em detalhe

`pg_default_acl` em `public` tem entradas para **duas** roles criadoras, ambas concedendo a
`anon`/`authenticated` — para tabelas (`r`), funções (`f`) e sequências (`S`):

- `postgres` — tratável;
- `supabase_admin` — **não tratável pelo executor**.

| Prova | Comando/fonte | Resultado |
|---|---|---|
| executor não é superuser | `pg_roles.rolsuper` p/ `postgres` | `false` |
| executor não é membro de `supabase_admin` | `pg_has_role('postgres','supabase_admin','MEMBER')` | `false` |
| tentativa real (transacional, rollback) | `alter default privileges for role supabase_admin in schema public revoke all on tables from anon, authenticated` | **`ERROR 42501: permission denied to change default privileges`** |
| tratamento de `postgres` funciona | mesmo comando `for role postgres`, transacional | aceito; ACL resultante com `postgres`+`service_role` apenas, nos 3 objtypes (`r`,`f`,`S`) |

### Fatos que o GPT precisa para decidir

1. **A doc oficial vigente do Supabase trata exclusivamente `role postgres`.**
   `guides/api/securing-your-api` -> "Default privileges for new tables and functions" prescreve
   somente `alter default privileges for role postgres in schema public revoke ...` (tables,
   functions, sequences, e `revoke execute on functions from public`). `supabase_admin` não é
   mencionado em nenhum ponto do caminho oficial.
2. **Nenhum objeto de `public` pertence a `supabase_admin`.** Levantamento por owner:
   2 tabelas, 3 índices e 1 função — **todos** owned por `postgres`. O default ACL de
   `supabase_admin` é, hoje, inerte: só se materializaria se a própria plataforma criasse objeto
   em `public`, o que está fora do controle do repositório e não seria regressão nossa.
3. **O gate humano não resolve.** O SQL Editor do Dashboard também executa como `postgres`.
   Tratar `supabase_admin` exigiria escalonamento ao suporte Supabase — não é ação que o
   fundador possa executar por conta própria.

### Recomendação (decisão é do GPT)

Autorizar a 001D a tratar **apenas `role postgres`**, com `supabase_admin` registrado como risco
residual aceito e documentado. Justificativa: é o caminho oficial vigente, cobre integralmente o
vetor real (todas as migrations do projeto executam como `postgres`) e não deixa exposição
alcançável. A alternativa — chamado ao suporte Supabase — bloquearia a fundação por um default
ACL que nenhum objeto do projeto consome.

Não implementei essa opção por conta própria: §4.4 reservou a decisão ao GPT.

## 5. Verificação adiantada do desenho §6 (não destrutiva, rollback)

Para que a decisão do GPT não exija nova rodada exploratória, validei o desenho autorizado de
policies em transação revertida, com fixtures efêmeras (2 usuários x 2 organizações),
`SET LOCAL ROLE` + `request.jwt.claims`. **Isto não substitui a prova §9 com sessões/JWTs reais
via Data API**, que pertence à execução.

| # | Prova | Resultado |
|---|---|---|
| 1 | A lê orgs | somente a própria OK |
| 2 | A lê memberships | 1 linha (a própria) OK |
| 3 | B lê orgs | somente a própria OK |
| 4 | B lê memberships | 1 linha (a própria) OK |
| 5 | A com membership `INACTIVE` | zero orgs OK |
| 6 | `anon` lê `organizations` | NEGADO 42501 OK |
| 7 | `owner` faz UPDATE na **própria** org | NEGADO 42501 OK |
| 8 | A faz UPDATE na org **B** | NEGADO 42501 OK |

Conclusões relevantes:

- o desenho **funciona sem `SECURITY DEFINER`** — §6.4 não precisa ser acionado;
- **não há recursão**: a policy de `organization_members` (`user_id = (select auth.uid())`) não
  referencia `organizations`, então o `EXISTS` da policy de `organizations` termina;
- `role='owner'` **não** concede bypass de escrita — a negação vem da ausência de grant (42501),
  antes mesmo da camada RLS.

Resíduo pós-rollback: `organizations`=0, `organization_members`=0, policies=0, usuários-probe=0,
tabelas em `public`=2, ACL de `organizations` inalterada. **Zero resíduo.**

## 6. Arquivos alterados

- `rodadas/claude/RELATORIO_RODADA_001D_RLS_TENANCY_ISOLAMENTO.md` (este arquivo);
- `estado.md` (campos de execução -> bloqueio).

Nenhum arquivo SQL, TS/JS ou de configuração criado ou alterado. Nenhuma migration criada.

## 7. Migrations / DDL

Nenhuma. `supabase/migrations/` permanece com as duas migrations promovidas.

## 8. Configuração remota

Nenhuma aplicada. Nenhuma pendente por ação do fundador — a pendência de `supabase_admin` é
decisão de escopo do GPT, não gate humano executável (ver §4, fato 3).

## 9. Gates

Conforme §12 do mandato (nenhum TS/JS/lockfile alterado; mudança restrita a documentação):

| Gate | Resultado |
|---|---|
| `git diff --check` | limpo |
| `npm ci` / lint / typecheck / test / build | não executados — nenhum código de runtime alterado |
| provas SQL não destrutivas | executadas, ver §3/§4/§5 |
| CI remota | roda sobre o head desta branch |

## 10. Pendências, riscos e divergências

1. **BLOQUEANTE — decisão do GPT:** tratar apenas `role postgres` (recomendado) ou escalar
   `supabase_admin` ao suporte Supabase. Nada da 001D avança antes disso.
2. Divergência correlata a ratificar: o mandato §4.1 permite manter `service_role` nos default
   privileges; a doc oficial revoga também `service_role`. Segui o mandato na simulação
   (mantive `service_role`), mas registro para decisão explícita do GPT.
3. `auth_leaked_password_protection` permanece WARN pré-existente conhecido — não bloqueia.
4. Nenhum arquivo não rastreado relevante ao mandato.

## 11. Conclusão

Baseline reconfirmado integralmente. A condição de parada prevista em §4.4 do mandato foi
acionada com prova reproduzível (`42501`), e o executor parou **antes** de aplicar solução
parcial, conforme instruído. Como verificação não destrutiva adicional, o desenho de policies §6
está validado e dispensa `SECURITY DEFINER`.

Banco remoto e repositório permanecem no estado promovido da 001C. Aguardando decisão do GPT
sobre o escopo de `supabase_admin` para retomar a execução da 001D.
