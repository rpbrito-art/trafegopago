# RELATÓRIO CLAUDE CODE — RODADA 001A — BASELINE SUPABASE E SEGURANÇA

Data: 2026-08-22

Mandato: `rodadas/gpt/RODADA_001A_BASELINE_SUPABASE_SEGURANCA.md`

Executor: Claude Code (comando `/proxima`)

Resultado: **EXECUTADA — AGUARDANDO AUDITORIA GPT**

---

## 1. Preflight

### 1.1 Repositório

```
$ pwd
/c/Users/rpbri/Documents/trafegopago

$ git rev-parse --show-toplevel
C:/Users/rpbri/Documents/trafegopago

$ git remote -v
origin  https://github.com/rpbrito-art/trafegopago.git (fetch)
origin  https://github.com/rpbrito-art/trafegopago.git (push)

$ git branch --show-current
main

$ git status
On branch main
Your branch is up to date with 'origin/main'.

Untracked files:
	.claude/

nothing added to commit but untracked files present
```

Critérios de aceite do preflight:

- raiz do git = `C:\Users\rpbri\Documents\trafegopago` — **OK**;
- remote `origin` = `rpbrito-art/trafegopago` — **OK**;
- `estado.md` e `.gpt/PROJECT_PROMPT.md` presentes na raiz — **OK**;
- nenhuma referência operacional a `rpbrito-art/business-weaver` — **OK**.

Único arquivo não rastreado no início: `.claude/` (contendo `commands/proxima.md`).
Presença esperada e prevista na seção 7 do mandato; não bloqueia o preflight.

### 1.2 Git não destrutivo

```
$ git fetch --all --prune
(sem saída)

$ git status -sb
## main...origin/main
?? .claude/

$ git log --oneline -5
a77838d docs: authorize round 001A Supabase security baseline
2078ad0 docs: authorize round 001A Supabase security baseline
bc028bb docs: atualizar estado após aprovação da rodada 000
7ac444f docs: registrar auditoria GPT da rodada 000
9f0f6aa Merge Rodada 000 — Bootstrap técnico
```

Sem divergência ahead/behind, sem merge/rebase pendente, working tree limpa.
Nenhum `merge`, `rebase`, `reset`, `checkout` destrutivo, `clean`, `stash drop`
ou `push --force` foi executado nesta rodada.

### 1.3 Supabase CLI e project ref

```
$ supabase --version
2.115.0

$ cat supabase/.temp/project-ref
cbnxdoxpyioxjwgjhbtq
```

Confirmação independente pela API de gerenciamento:

```
$ supabase projects list
... {"ref":"cbnxdoxpyioxjwgjhbtq", "name":"quoron", "region":"sa-east-1",
     "status":"ACTIVE_HEALTHY", "database":{"version":"17.6.1.155"},
     "created_at":"2026-08-22T18:59:34.243778Z", "linked":true} ...
```

O project ref vinculado é exatamente o único autorizado pelo mandato.
O outro projeto da conta (`zzoxxigidugzpttkaoru`) aparece com `linked:false` e
**não foi tocado em nenhum momento**.

Conforme observação do mandato, o nome de painel `quoron` é cosmético e
**não foi renomeado** nesta rodada.

### 1.4 Branch da rodada

```
$ git checkout -b claude/rodada-001a-baseline-supabase-seguranca
Switched to a new branch 'claude/rodada-001a-baseline-supabase-seguranca'
```

Nenhum trabalho foi feito diretamente na `main`.

---

## 2. Bootstrap documental

Lidos integralmente, na ordem exigida pela seção 1 do mandato:

1. `estado.md`;
2. `.gpt/PROJECT_PROMPT.md`;
3. `rodadas/gpt/AUDITORIA_RODADA_000_BOOTSTRAP_TECNICO.md`;
4. `rodadas/gpt/RODADA_001A_BASELINE_SUPABASE_SEGURANCA.md` (mandato vigente);
5. `docs/03-canonical/SECURITY_MODEL.md` (integral).

Lidos de forma dirigida, nas seções pertinentes a esta rodada de infraestrutura:

- `docs/03-canonical/TECHNICAL_SPEC.md` — seção 33 (Estratégia de migrations),
  seções 34–36;
- `docs/00-governanca/IMPLEMENTATION_ROADMAP.md` — Fases 0 a 3;
- `docs/03-canonical/DATA_MODEL.md` — seção final sobre pré-requisitos da
  primeira migration de schema.

Justificativa da leitura dirigida: a seção 1 do mandato autoriza explicitamente
ler os demais documentos "apenas quando necessários para resolver alguma
dependência". Esta rodada não cria schema de domínio nem contrato de API, então
`API_CONTRACTS.md` e o corpo conceitual de `DATA_MODEL.md` não governam nenhuma
decisão tomada aqui. Nenhum documento canônico foi alterado.

### 2.1 Aderência aos contratos canônicos

Nenhuma contradição foi encontrada entre o mandato e a documentação canônica.

`SECURITY_MODEL.md` §5 exige RLS em toda tabela exposta à Data API que contenha
dados tenant, e §6 restringe credenciais privilegiadas ao servidor. O hardening
executado nesta rodada **reforça** ambos: preserva o mecanismo automático de RLS
e fecha uma superfície REST indevida. `TECHNICAL_SPEC.md` §33 exige migrations
SQL versionadas no repositório — cumprido.

---

## 3. Pesquisa e documentação oficial vigente

A seção 2 do mandato exige revalidar documentação oficial antes de qualquer DDL.

### 3.1 Sintaxe da CLI — descoberta, não memorizada

Verificada via `--help` na versão instalada (2.115.0), não por memória:

- `supabase --help` — subcomandos disponíveis;
- `supabase migration --help` — confirmou `new`, `list`, `repair`, `squash`,
  `up`, `down`, `fetch`;
- `supabase db --help` — confirmou `push`, `query`, `advisors`, `diff`, `pull`;
- `supabase db query --help` — confirmou as flags `--linked` e `-f/--file`;
- `supabase db advisors --help` — confirmou `--linked`, `--type`, `--level`;
- `supabase db push --help` — confirmou `--linked` e `--dry-run`.

Consequência prática: o Security Advisor é hoje acessível pela CLI
(`supabase db advisors`), sem depender de leitura manual do Dashboard, e
`--linked` opera via Management API. Isso viabilizou as provas reproduzíveis
deste relatório.

### 3.2 Documentação oficial consultada

Consultada pela ferramenta oficial de busca na documentação Supabase.

**Lint 0028 — `anon_security_definer_function_executable`**
https://supabase.com/docs/guides/database/database-advisors?lint=0028_anon_security_definer_function_executable

**Lint 0029 — `authenticated_security_definer_function_executable`**
https://supabase.com/docs/guides/database/database-advisors?lint=0029_authenticated_security_definer_function_executable

Pontos que governaram a decisão, citados da documentação vigente:

> "Postgres' default function ACL is `EXECUTE` to `PUBLIC`, and Supabase
> additionally grants default privileges for new functions to `anon,
> authenticated, service_role`. So a function created in `public` is, by
> default, executable by `anon`. The author has to actively revoke to remove
> that grant."

> Option 1: Revoke `EXECUTE` (most common)
> ```sql
> revoke execute on function public.my_priv_op(int, text) from authenticated, anon, public;
> ```
> "Revoke from `PUBLIC` as well, because Postgres' default-grant lives there."

> "`/rest/v1/rpc` accepts any function name the role has `EXECUTE` on."

**Row Level Security — "Auto-enable RLS for new tables"**
https://supabase.com/docs/guides/database/postgres/row-level-security

Achado relevante: o corpo de `public.rls_auto_enable()` presente no banco é
**cópia literal** do snippet publicado nessa página oficial, incluindo
`SECURITY DEFINER`, `SET search_path = pg_catalog` e o event trigger
`ensure_rls ON ddl_command_end WHEN TAG IN ('CREATE TABLE','CREATE TABLE AS','SELECT INTO')`.
Isto é, o objeto sinalizado pelo Advisor não é código improvisado: é o padrão
recomendado pelo próprio Supabase, que apenas não vem acompanhado do revoke.

### 3.3 Decisões afetadas pela documentação atual

1. **Revogar de `PUBLIC` explicitamente**, e não apenas de `anon`/`authenticated`.
   Sem isso o default grant do Postgres continuaria valendo e o lint continuaria
   disparando. Essa é a razão de a migration ter três `revoke` e não dois.

2. **Não trocar para `SECURITY INVOKER`** (Option 2 da doc). A função executa
   `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`; como invoker ela rodaria com os
   privilégios de quem criou a tabela e falharia — ou pior, falharia
   silenciosamente, já que o corpo captura `WHEN OTHERS` e apenas loga. Isso
   quebraria o mecanismo de RLS automático, expressamente proibido pela seção
   5.2 do mandato.

3. **Não aplicar Option 3** (suprimir o achado como intencional). Não há caso de
   uso em que um cliente do browser deva chamar um event trigger.

4. **Não alterar a lógica da função**, conforme seção 5.2 do mandato: o problema
   auditado é de privilégio, não de corpo. `SET search_path = pg_catalog` já
   estava correto no baseline.

---

## 4. Baseline anterior (antes de qualquer DDL)

### 4.1 Histórico de migrations remoto

```
$ supabase migration list --linked
{"migrations":[],"message":"Migrations listed"}
```

Vazio — confirma o estado descrito pela auditoria da Rodada 000.

### 4.2 Tabelas em `public`

```sql
select table_schema, table_name, table_type
from information_schema.tables where table_schema='public' order by table_name;
```

```
rows: []
```

Nenhuma tabela de domínio. Confirmado.

### 4.3 Funções em `public`

```sql
select n.nspname, p.proname, pg_get_userbyid(p.proowner) as owner,
       p.prosecdef, p.proconfig,
       coalesce(array_to_string(p.proacl,' | '),'(null)') as acl
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' order by p.proname;
```

Resultado — uma única função:

| campo | valor |
|---|---|
| schema | `public` |
| name | `rls_auto_enable` |
| owner | `postgres` |
| security_definer | `true` |
| config | `search_path=pg_catalog` |
| **acl (BASELINE)** | `=X/postgres \| postgres=X/postgres \| anon=X/postgres \| authenticated=X/postgres \| service_role=X/postgres` |

Leitura do ACL baseline: o item `=X/postgres` (grantee vazio) é o grant a
**PUBLIC**. Portanto `PUBLIC`, `anon`, `authenticated` e `service_role` tinham
`EXECUTE`.

### 4.4 Event triggers

```sql
select evtname, evtevent, pg_get_userbyid(evtowner) as owner, evtenabled, evttags,
       (select n.nspname||'.'||p.proname from pg_proc p
        join pg_namespace n on n.oid=p.pronamespace where p.oid=e.evtfoid) as function
from pg_event_trigger e order by evtname;
```

| evtname | evento | owner | enabled | tags | função |
|---|---|---|---|---|---|
| **ensure_rls** | ddl_command_end | **postgres** | O | CREATE TABLE, CREATE TABLE AS, SELECT INTO | **public.rls_auto_enable** |
| issue_graphql_placeholder | sql_drop | supabase_admin | O | DROP EXTENSION | extensions.set_graphql_placeholder |
| issue_pg_cron_access | ddl_command_end | supabase_admin | O | CREATE EXTENSION | extensions.grant_pg_cron_access |
| issue_pg_graphql_access | ddl_command_end | supabase_admin | O | CREATE EXTENSION | extensions.grant_pg_graphql_access |
| issue_pg_net_access | ddl_command_end | supabase_admin | O | CREATE EXTENSION | extensions.grant_pg_net_access |
| pgrst_ddl_watch | ddl_command_end | supabase_admin | O | (todos) | extensions.pgrst_ddl_watch |
| pgrst_drop_watch | sql_drop | supabase_admin | O | (todos) | extensions.pgrst_drop_watch |

**Diferenciação plataforma x produto** (exigida pela seção 5.1 do mandato):
os seis triggers com owner `supabase_admin` e função em `extensions.` são
objetos gerenciados pela plataforma Supabase e **não foram tocados**. Apenas
`ensure_rls` / `public.rls_auto_enable` tem owner `postgres` e vive no schema
`public` — é o objeto de nível de projeto, e é o único alvo desta rodada.

Nenhum `db pull` foi executado, justamente para não arrastar objetos de
plataforma para dentro do schema do produto.

### 4.5 Definição da função (baseline)

```sql
CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT * FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public')
        AND cmd.schema_name NOT IN ('pg_catalog','information_schema')
        AND cmd.schema_name NOT LIKE 'pg_toast%'
        AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)',
                  cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$
```

Idêntica ao padrão oficial citado em 3.2.

### 4.6 Security Advisor — ANTES

```
$ supabase db advisors --linked --type security --level info
```

```json
{"results":[
 {"name":"anon_security_definer_function_executable",
  "title":"Public Can Execute SECURITY DEFINER Function",
  "level":"WARN","facing":"EXTERNAL","categories":["SECURITY"],
  "detail":"Function `public.rls_auto_enable()` can be executed by the `anon` role as a `SECURITY DEFINER` function via `/rest/v1/rpc/rls_auto_enable`. Revoke `EXECUTE` or switch it to `SECURITY INVOKER` if that is not intentional.",
  "metadata":{"name":"rls_auto_enable","schema":"public"}},
 {"name":"authenticated_security_definer_function_executable",
  "title":"Signed-In Users Can Execute SECURITY DEFINER Function",
  "level":"WARN","facing":"EXTERNAL","categories":["SECURITY"],
  "detail":"Function `public.rls_auto_enable()` can be executed by the `authenticated` role as a `SECURITY DEFINER` function via `/rest/v1/rpc/rls_auto_enable`. Revoke `EXECUTE` or switch it to `SECURITY INVOKER` if that is not intentional.",
  "metadata":{"name":"rls_auto_enable","schema":"public"}}
],"message":"db advisors"}
```

Total: **2 WARN**, ambos sobre o mesmo objeto. Executado com `--level info`,
portanto a saída inclui também achados `INFO`: **não havia nenhum outro**.

Classificação exigida pela seção 5.4 do mandato:

- criados por esta rodada: **nenhum**;
- pré-existentes: os 2 acima, herdados do provisionamento do projeto;
- relevantes para fases futuras: nenhum além destes.

---

## 5. Implementação

### 5.1 Migration versionada

Criada pelo comando oficial da CLI (nome e timestamp gerados pela ferramenta,
não escritos à mão):

```
$ supabase migration new harden_rls_auto_enable_privileges
{"path":"...\\supabase\\migrations\\20260822212544_harden_rls_auto_enable_privileges.sql",
 "message":"Migration created"}
```

Arquivo: `supabase/migrations/20260822212544_harden_rls_auto_enable_privileges.sql`

DDL efetivamente aplicado (o restante do arquivo é comentário de rastreabilidade):

```sql
revoke execute on function public.rls_auto_enable() from public;
revoke execute on function public.rls_auto_enable() from anon;
revoke execute on function public.rls_auto_enable() from authenticated;
```

Propriedades:

- **mínima e focada** — três revokes, nenhum outro efeito colateral;
- **não altera a lógica da função** — nenhum `CREATE OR REPLACE`;
- **não remove nem desabilita o event trigger** `ensure_rls`;
- **não usa `SECURITY DEFINER` como atalho** — ao contrário, restringe quem
  alcança um `SECURITY DEFINER` existente;
- **não cria tabela de domínio**;
- **idempotente** — no Postgres, `REVOKE` de privilégio inexistente é no-op sem
  erro, então a reaplicação é segura;
- **sem dependência de estado local oculto ou de ação manual no Dashboard** —
  todo o efeito está no arquivo versionado.

`service_role` foi deliberadamente preservado — ver seção 9.1.

### 5.2 Aplicação

Dry-run primeiro:

```
$ supabase db push --linked --dry-run
DRY RUN: migrations will *not* be pushed to the database.
Connecting to remote database...
Would push these migrations:
 • 20260822212544_harden_rls_auto_enable_privileges.sql
```

Aplicação real:

```
$ supabase db push --linked --yes
Initialising login role...
Connecting to remote database...
Do you want to push these migrations to the remote database?
 • 20260822212544_harden_rls_auto_enable_privileges.sql
 [Y/n] y
Applying migration 20260822212544_harden_rls_auto_enable_privileges.sql...
{"upToDate":false,"dryRun":false,
 "migrations":["20260822212544_harden_rls_auto_enable_privileges.sql"],
 "seeds":[],"roles":[],"message":"Finished supabase db push."}
```

**Nota de procedência (transparência para auditoria):** o `supabase db push`
foi bloqueado pelo classificador de permissões do ambiente do executor. A
situação foi apresentada ao fundador, que optou por executar o comando ele
mesmo na sessão. O comando é exatamente o citado acima, sobre o arquivo
versionado acima, no project ref autorizado. Nenhum DDL foi aplicado por outro
caminho, nenhum SQL persistente foi executado fora da migration versionada, e
nenhuma tentativa de contornar o bloqueio foi feita.

### 5.3 `.claude/commands/proxima.md`

Arquivo lido integralmente (314 linhas, sha256
`85cc848a98e2d6eaa92aac1ee8146ed7646422721070869d90e7801c14c38a22`).

Verificação de aderência ao protocolo aprovado, exigida pela seção 5.5:

| Requisito do mandato | Onde está no arquivo | OK |
|---|---|---|
| `estado.md` como fonte primária | "REGRA SOBERANA" + PASSO 3 (14 menções a `estado.md`) | sim |
| bootstrap documental | PASSO 4, incluindo `.gpt/PROJECT_PROMPT.md` | sim |
| abrir mandato vigente em `rodadas/gpt/` | PASSO 5 | sim |
| executar somente se autorizado | PASSO 6 (lista de estados que impedem execução) e PASSO 7 | sim |
| relatório em `rodadas/claude/` | PASSO 10 | sim |
| aguardar auditoria | PASSO 11 — status `AGUARDANDO AUDITORIA GPT`; proíbe auto-aprovar e auto-promover | sim |
| bloquear repositório fora de `rpbrito-art/trafegopago` | PASSO 1 (preflight bloqueante, cita `business-weaver` como proibido) + PROIBIÇÃO PERMANENTE nº 1 | sim |

Estrutura confirmada: REGRA SOBERANA, PASSOS 1–12, PROIBIÇÕES PERMANENTES,
RESULTADO ESPERADO (CASO A / CASO B).

**Conclusão: nenhuma divergência material.** Portanto, conforme a instrução do
mandato de não substituir silenciosamente e corrigir apenas o que destoe do
comportamento aprovado, o arquivo foi versionado **sem nenhuma edição**. O diff
em relação ao repositório é a adição integral do arquivo, nada mais.

Efeito prático: o protocolo `/proxima` deixa de existir só na máquina do
fundador e passa a ser reproduzível pelo Git, fechando a ressalva nº 1 da
auditoria da Rodada 000.

### 5.4 `.gitattributes`

Criado na raiz. Fecha a ressalva nº 2 da auditoria da Rodada 000.

Antes de escrever, o estado real foi medido:

```
$ git config --get core.autocrlf
true

$ git ls-files --eol | awk '{print $1}' | sort | uniq -c
     43 i/lf

$ git ls-files --eol | awk '{print $2}' | sort | uniq -c
     43 w/crlf
```

Ou seja: **os 43 arquivos rastreados já estavam gravados com LF no índice**;
o CRLF existia apenas na working tree por causa do `core.autocrlf=true` local.
Consequentemente `* text=auto eol=lf` apenas torna explícito o que já valia, e
**não provoca renormalização**.

Prova de ausência de diff cosmético:

```
$ git add .gitattributes
$ git diff --cached --stat -- . ':!.gitattributes'
(vazio — nenhum outro arquivo alterado)

$ git ls-files --eol | awk '{print $1, $3}' | sort | uniq -c
     44 i/lf attr/text=auto
```

Nenhum `git add --renormalize` foi executado. O conteúdo do arquivo cobre:
padrão `* text=auto eol=lf`; `*.sh`/`*.sql` forçados a LF; `*.bat`/`*.cmd`
forçados a CRLF; e uma lista de extensões binárias marcadas como `binary`.

---

## 6. Provas Supabase (pós-mudança)

### 6.1 Migration list — local x remoto

```
$ supabase migration list --linked
{"migrations":[{"local":"20260822212544","remote":"20260822212544",
                "time":"2026-08-22 21:25:44"}],"message":"Migrations listed"}
```

`local` e `remote` idênticos. Não existe migration aplicada sem arquivo
versionado correspondente, nem arquivo versionado sem aplicação.

### 6.2 ACL final da função

```sql
select coalesce(array_to_string(p.proacl,' | '),'(null)') as acl_final,
       has_function_privilege('anon',          p.oid,'EXECUTE') as anon,
       has_function_privilege('authenticated', p.oid,'EXECUTE') as authenticated,
       has_function_privilege('public',        p.oid,'EXECUTE') as public,
       has_function_privilege('service_role',  p.oid,'EXECUTE') as service_role,
       p.prosecdef, p.proconfig
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname='rls_auto_enable';
```

Resultado:

| campo | valor |
|---|---|
| **acl_final** | `postgres=X/postgres \| service_role=X/postgres` |
| anon_pode_executar | **false** |
| authenticated_pode_executar | **false** |
| public_pode_executar | **false** |
| service_role_pode_executar | true (intencional — ver 9.1) |
| ainda_security_definer | true (lógica preservada) |
| search_path | `search_path=pg_catalog` (preservado) |

Comparação direta:

```
ANTES:  =X/postgres | postgres=X/postgres | anon=X/postgres | authenticated=X/postgres | service_role=X/postgres
DEPOIS: postgres=X/postgres | service_role=X/postgres
```

O grant a PUBLIC (`=X/postgres`), a `anon` e a `authenticated` desapareceram.
A rota `POST /rest/v1/rpc/rls_auto_enable` não é mais alcançável nem com a
publishable key nem com uma sessão autenticada.

### 6.3 Event trigger final

```
evtname    = ensure_rls
evtenabled = O   (habilitado, modo origin)
owner      = postgres
evttags    = CREATE TABLE, CREATE TABLE AS, SELECT INTO
```

Intacto. Não foi removido, desabilitado nem recriado.

### 6.4 Prova real de auto-enable RLS

A seção 5.3 do mandato é explícita: consultar a existência do trigger não é
prova suficiente. Foi executada uma prova transacional com rollback, que é o
desenho preferido pelo mandato — DDL no Postgres é transacional e event
triggers disparam dentro da transação, então o desenho é tecnicamente correto e
não deixa resíduo:

```sql
begin;
create table public.zz_prova_rls_001a (id bigint primary key generated always as identity);
select 'DENTRO DA TRANSACAO' as momento,
       c.relname as tabela,
       c.relrowsecurity as rls_habilitado_automaticamente,
       (select evtenabled from pg_event_trigger where evtname='ensure_rls') as ensure_rls_status
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname='zz_prova_rls_001a';
rollback;
```

Resultado:

```json
{"momento":"DENTRO DA TRANSACAO",
 "tabela":"zz_prova_rls_001a",
 "rls_habilitado_automaticamente":true,
 "ensure_rls_status":"O"}
```

Interpretação: a tabela foi criada **depois** do revoke e mesmo assim recebeu
`relrowsecurity = true` sem nenhum `ALTER TABLE` explícito. Isso prova em
execução real, e não por inspeção de catálogo, que:

1. o event trigger `ensure_rls` continua disparando;
2. `public.rls_auto_enable()` continua executando com sucesso;
3. o hardening de privilégios **não quebrou o mecanismo**.

Fundamento técnico do porquê: o Postgres não consulta o ACL de `EXECUTE` no
disparo de um event trigger — a função é invocada pelo mecanismo de trigger, não
por chamada direta. O `EXECUTE` só governa a chamada direta, que é justamente a
superfície REST/GraphQL que queríamos fechar.

### 6.5 Limpeza e ausência de tabelas inesperadas

```sql
select (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
        where n.nspname='public' and c.relname='zz_prova_rls_001a') as tabela_de_prova_remanescente,
       (select count(*) from information_schema.tables where table_schema='public') as total_tabelas_public,
       (select evtenabled from pg_event_trigger where evtname='ensure_rls') as status_final,
       (select pg_get_userbyid(evtowner) from pg_event_trigger where evtname='ensure_rls') as owner,
       (select array_to_string(evttags,', ') from pg_event_trigger where evtname='ensure_rls') as tags;
```

Resultado:

| campo | valor |
|---|---|
| tabela_de_prova_remanescente | **0** |
| total_tabelas_public | **0** |
| ensure_rls_status_final | O |
| ensure_rls_owner | postgres |
| ensure_rls_tags | CREATE TABLE, CREATE TABLE AS, SELECT INTO |

A tabela de prova não sobreviveu ao rollback e o schema `public` permanece com
zero tabelas. Nenhuma tabela de domínio foi antecipada por esta rodada.

### 6.6 Security Advisor — DEPOIS

```
$ supabase db advisors --linked --type security --level info
No issues found
{"results":[],"message":"db advisors"}
```

Checagem adicional, não exigida mas barata:

```
$ supabase db advisors --linked --type performance --level info
No issues found
{"results":[],"message":"db advisors"}
```

**2 WARN antes → 0 achados depois**, inclusive em nível `info`. Nenhum warning
remanescente, portanto nenhuma justificativa técnica de exceção é necessária.
Nenhum achado novo foi introduzido por esta rodada.

---

## 7. Gates de código

Executados na branch da rodada, após todas as alterações de arquivo:

| Gate | Comando | Resultado |
|---|---|---|
| Install | `npm ci` | **OK** — 403 pacotes, 0 vulnerabilidades |
| Lint | `npm run lint` | **OK** — exit 0, sem avisos |
| Typecheck | `npm run typecheck` | **OK** — `next typegen` + `tsc --noEmit`, exit 0 |
| Test | `npm test` | **OK** — Vitest 4.1.11, 2 arquivos, **11 testes passaram** |
| Build | `npm run build` | **OK** — Next.js 16.3.2 (Turbopack), compilado em 12.8s, 3 páginas estáticas |

Saídas relevantes:

```
$ npm ci
npm warn deprecated eslint@9.39.5: This version is no longer supported.
added 403 packages, and audited 404 packages in 1m
found 0 vulnerabilities

$ npm test
 Test Files  2 passed (2)
      Tests  11 passed (11)
   Duration  9.11s

$ npm run build
▲ Next.js 16.3.2 (Turbopack)
✓ Compiled successfully in 12.8s
  Finished TypeScript in 4.0s
✓ Generating static pages using 4 workers (3/3) in 1250ms
Route (app)
┌ ○ /
└ ○ /_not-found
```

O aviso de deprecação do ESLint 9.39.5 é o mesmo já registrado na ressalva nº 3
da auditoria da Rodada 000. **Não foi "corrigido" por upgrade cego**, conforme a
recomendação daquela auditoria; permanece monitorado.

Working tree após os gates (nenhum arquivo gerado sujou a árvore):

```
$ git status --porcelain
A  .gitattributes
?? .claude/
?? supabase/migrations/

$ git diff --stat
(vazio)
```

Em particular, o build **não** reescreveu o bloco de `AGENTS.md` gerado pelo
Next.js — não há alteração pendente nesse arquivo.

---

## 8. Arquivos alterados

| Arquivo | Tipo | Descrição |
|---|---|---|
| `supabase/migrations/20260822212544_harden_rls_auto_enable_privileges.sql` | novo | Migration de hardening dos privilégios de `public.rls_auto_enable()` |
| `.claude/commands/proxima.md` | novo (versionado) | Protocolo `/proxima`, versionado sem edição |
| `.gitattributes` | novo | Normalização de line endings, sem renormalização |
| `rodadas/claude/RELATORIO_RODADA_001A_BASELINE_SUPABASE_SEGURANCA.md` | novo | Este relatório |
| `estado.md` | alterado | Registro de execução da rodada (seção 12 do mandato) |

Nenhum arquivo de `docs/` foi alterado. Nenhum arquivo de aplicação
(`app/`, `lib/`, `package.json`, CI) foi alterado.

---

## 9. Pendências, riscos e decisões para o GPT

### 9.1 `service_role` mantém `EXECUTE` — decisão deliberada

O ACL final preserva `service_role=X/postgres`.

Racional:

1. A seção 5.2 do mandato enumera precisamente `PUBLIC`, `anon` e
   `authenticated` como os papéis públicos a restringir. `service_role` não está
   nessa lista, e a migration deveria ser mínima.
2. O Security Advisor não sinaliza `service_role`, e o resultado final é zero
   achados.
3. `service_role` já contorna RLS por desenho. Revogar `EXECUTE` desta função
   específica não reduziria materialmente o poder de quem detém a secret key.
4. `SECURITY_MODEL.md` §6 já trata a secret key como estritamente server-side.

Risco residual: **muito baixo**. Uma função que retorna `event_trigger` não pode
ser invocada como chamada SQL comum — o Postgres rejeita a invocação direta. A
exposição era, na prática, uma superfície de API indevida e um sinal ruim de
higiene, mais do que um vetor diretamente explorável. Ainda assim, fechá-la era
obrigatório: era um WARN externo aberto sobre um objeto `SECURITY DEFINER`, e o
mandato tratava isso como bloqueador.

**Decisão para o GPT:** avaliar em rodada futura se `service_role` também deve
perder `EXECUTE` sobre event trigger functions, como política geral.

### 9.2 Default privileges do schema `public` — recomendação NÃO executada

A documentação oficial dos lints 0028/0029 oferece uma trava preventiva:

```sql
alter default privileges in schema public revoke execute on functions from anon, authenticated, public;
```

Isso impediria que **futuras** funções em `public` nasçam executáveis por
`anon`/`authenticated`, evitando a reincidência exata do problema desta rodada
quando as rodadas 001B+ começarem a criar funções de domínio.

**Não foi executado nesta rodada**, por três razões: (a) a seção 5.2 exige uma
migration mínima e focada; (b) é uma decisão de política de schema que afeta
todas as rodadas futuras, e a seção 3 do `PROJECT_PROMPT.md` manda devolver
decisões estruturais ao planejamento em vez de decidir localmente; (c) mudaria
silenciosamente o comportamento esperado por quem escrever as próximas
migrations, que passariam a precisar de `grant execute` explícito.

**Recomendação formal ao GPT:** incluir essa decisão no planejamento da Rodada
001B ou de uma rodada de política de schema. É baixo custo e alto valor
preventivo.

### 9.3 Herdadas da auditoria da Rodada 000 — status

| Ressalva 000 | Status após 001A |
|---|---|
| 1. `/proxima` não versionado | **RESOLVIDA** — versionado em `.claude/commands/proxima.md` |
| 2. Falta `.gitattributes` | **RESOLVIDA** — criado, sem diff cosmético |
| 3. ESLint 9.39.5 deprecated | **ABERTA** — monitorada, sem upgrade cego (fora do escopo desta rodada) |
| 4. `proxy.ts` de refresh de sessão ausente | **ABERTA** — requisito da Rodada 001B (Auth), fora do escopo desta rodada |
| 5. Nomenclatura "middleware" → `proxy.ts` | **ABERTA** — a corrigir na documentação da Rodada 001B |
| — `assertNoLeakedPrivilegedEnv` sem gate automático | **ABERTA** — dívida de hardening; sugerido gate de secret scanning na CI |

### 9.4 Riscos residuais desta rodada

- **Nenhum bloqueador identificado.**
- A prova de RLS automático cobre `CREATE TABLE` em `public`. Tabelas criadas em
  outros schemas não são cobertas pelo trigger — comportamento correto e
  intencional do padrão oficial, mas relevante se o domínio decidir usar schemas
  além de `public`.
- O mecanismo de auto-enable garante RLS **habilitada**, não RLS **com
  policies**. Uma tabela com RLS habilitada e sem policy nega tudo por padrão —
  seguro, mas as rodadas de domínio precisarão criar policies explícitas, e o
  lint `0008_rls_enabled_no_policy` passará a ser o sinal a observar.

### 9.5 Fora de escopo — confirmação

Nada foi implementado em: cadastro/login, confirmação de e-mail, `proxy.ts` de
Auth, Organizations, Membership, tabelas de negócio, policies RLS de domínio,
onboarding, Meta/Instagram, campanhas, leads, IA, filas de domínio, pagamentos,
deploy, n8n/Make. O projeto Supabase **não** foi renomeado. Nenhuma Rodada 001B
foi iniciada, criada ou autorizada. Nenhum mandato novo foi criado em
`rodadas/gpt/`. Esta execução **não** se auto-aprovou.

---

## 10. Critério de sucesso do mandato — verificação

> "O banco remoto correto está conhecido, o hardening do mecanismo automático de
> RLS está versionado e seguro, o mecanismo continua funcionando, o Security
> Advisor foi revalidado, o protocolo `/proxima` é reproduzível pelo Git e
> nenhuma funcionalidade de domínio foi antecipada."

| Afirmação | Prova |
|---|---|
| Banco remoto correto e conhecido | §1.3 (`linked:true` em `cbnxdoxpyioxjwgjhbtq`), §4.1–4.5 (inventário completo) |
| Hardening versionado e seguro | §5.1 (migration pela CLI), §6.1 (local == remoto), §6.2 (ACL final) |
| Mecanismo continua funcionando | §6.4 (tabela criada pós-revoke recebeu `relrowsecurity=true`) |
| Security Advisor revalidado | §4.6 (2 WARN) → §6.6 (0 achados) |
| `/proxima` reproduzível pelo Git | §5.3 |
| Nenhum domínio antecipado | §6.5 (0 tabelas em `public`), §9.5 |

Bloqueadores da seção 10 do mandato — todos negativos:

- secret real versionado: **não**;
- `service_role`/secret key exposta ao browser: **não**;
- migration aplicada sem arquivo versionado: **não** (§6.1);
- warning relevante mantido sem justificativa: **não** (§6.6, zero warnings);
- event trigger quebrado: **não** (§6.3, §6.4);
- tabela de prova deixada no remoto: **não** (§6.5);
- DDL fora do project ref autorizado: **não** (§1.3);
- alteração de outro repositório/Supabase: **não**.

---

## 11. Git — commit, push e CI

_Preenchido no commit de handoff._

---

## 12. Estado final

- Etapa: Fase 1 — Fundação Supabase, Auth e Tenancy (parte A).
- Rodada 001A: **EXECUTADA — AGUARDANDO AUDITORIA GPT**.
- Banco `cbnxdoxpyioxjwgjhbtq`: 1 migration aplicada, 0 tabelas em `public`,
  `ensure_rls` ativo e provado, Security Advisor limpo.
- Próxima ação: **auditoria do GPT** sobre branch, diff, migration e provas
  deste relatório. A Rodada 001B (Auth real) permanece **não autorizada**.
