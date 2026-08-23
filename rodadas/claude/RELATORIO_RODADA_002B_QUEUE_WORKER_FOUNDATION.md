# RELATÓRIO — RODADA 002B — QUEUE + WORKER FOUNDATION

Executor: Claude Code
Data: 2026-08-23
Branch: `claude/rodada-002b-queue-worker-foundation`

Status: **002B EXECUTADA — AGUARDANDO AUDITORIA GPT**

---

## 1. Preflight

| item | resultado |
| --- | --- |
| raiz git | `C:/Users/rpbri/Documents/trafegopago` |
| remote `origin` | `rpbrito-art/trafegopago` |
| project ref | `cbnxdoxpyioxjwgjhbtq` (linked) |
| branch | criada de `origin/main` (`6c1cd5f`) |
| baseline antes de mutar | **6 migrations**, última `20260823160000`; `pgmq` disponível 1.5.1 e **não instalado**; `pg_cron` não instalado; 5 tabelas `public` todas com RLS; `operations`/`audit_events` vazias; 1 conta real; 0 objetos owned por `supabase_admin`; Postgres 17.6 |

READ SET cumprido, incluindo documentação vigente de PGMQ e de auth de Edge Functions.
Gate de produto não se aplica: escopo é infraestrutura interna e nenhuma proposta de
produto/UX surgiu.

---

## 2. Arquivos

Novos:

- `supabase/migrations/20260823180000_create_queue_and_worker_foundation.sql`;
- `supabase/functions/integration-worker/index.ts`;
- `src/lib/operations/job-message.ts` + `job-message.test.ts`;
- `scripts/queue-worker-002b.mjs` — prova funcional;
- `scripts/sql/queue-worker-002b-catalog.sql` — provas estruturais versionadas.

Alterados: `supabase/config.toml` (declara a função com `verify_jwt = false`),
`tsconfig.json` e `eslint.config.mjs` (excluem `supabase/functions` — ver §3.5),
`estado.md`, este relatório.

---

## 3. Decisões não óbvias

1. **Migration validada em transação revertida antes de aplicar.** O mandato §8 proíbe
   repetir o incidente da 002A. Rodei o arquivo inteiro dentro de `begin; … rollback;`
   pelo `db query --linked`; passou sem erro e confirmei que nada persistiu (pgmq ausente,
   histórico ainda em 6). Só então apliquei com `db push`. Nenhum DDL ad hoc, nenhum
   `migration repair`.
2. **`SECURITY DEFINER` só nos 5 wrappers de fila.** Os helpers de `operations`
   (`claim_operation`, `complete_operation`, `fail_operation`) são **INVOKER**:
   `service_role` já tem SELECT/INSERT/UPDATE naquela tabela desde a 002A, e um DEFINER
   ali seria escalada de privilégio sem problema a resolver. A exceção do mandato §2.2 vale
   para a fronteira da fila, e foi usada só nela.
3. **O claim é um UPDATE condicional, sem leitura prévia.** Checar antes e atualizar depois
   não sobrevive a READ COMMITTED. O predicado no próprio UPDATE é a exclusão mútua: o
   perdedor reavalia depois do row lock, encontra `CLAIMED` recente e não atualiza.
4. **Identidade tripla no claim** (`id` + `organization_id` + `correlation_id`). A mensagem
   vem da fila; acertar um UUID não pode bastar para reivindicar operação alheia. Provado
   com organização errada e correlation errada → `NOT_FOUND`.
5. **`STALE_CLAIM_SECONDS` (900) > visibilidade (60), deliberadamente.** Se a janela de
   retomada fosse menor que a visibilidade, uma operação seria retomada como "claim
   abandonado" enquanto a mensagem original ainda está invisível — e o efeito rodaria duas
   vezes. A relação entre os dois números é o que impede isso.
6. **`updated_at`/`completed_at` com `now()` do banco, dentro dos helpers.** É a disciplina
   server-side que substitui o CHECK temporal removido na 002A, sem trigger.
7. **O contrato do envelope é importado pela Edge Function, não copiado.**
   `job-message.ts` é TS puro sem dependências; o worker o importa por caminho relativo.
   Reescrevê-lo dentro de `functions/` criaria uma terceira definição livre para divergir.
   Há ainda a validação no banco (`is_valid_integration_job_message`), com teste de paridade
   dos tetos.
8. **`supabase/functions` fora do `tsc`/ESLint da aplicação.** Código Deno usa specifier
   `npm:` e import com extensão `.ts`, que o tsconfig do Next não resolve — o typecheck
   falhava por diferença de runtime, não por defeito. A validação da função é o bundle do
   `supabase functions deploy`, que executei e passou.
9. **Ordem "concluir operação → confirmar mensagem".** Se o processo morrer entre as duas, a
   mensagem reaparece e o claim seguinte encontra `ALREADY_SUCCEEDED`, que remove a mensagem
   sem repetir efeito. A ordem inversa perderia o registro do trabalho feito.
10. **Poison message encerra a operação junto.** Arquivar a mensagem e deixar a operação
    `CLAIMED` para sempre esconderia um trabalho que nunca vai acontecer.

---

## 4. Provas

Funcionais — `node scripts/queue-worker-002b.mjs`: **60/60**, com a Edge Function real
invocada remotamente.

| prova | resultado |
| --- | --- |
| `anon` e `authenticated` nos 7 pontos da fronteira (5 wrappers de fila + 2 helpers) | `42501` em todos os 14 |
| `pgmq_public` na Data API | `PGRST106` — schema não exposto |
| browser continua lendo as tabelas de domínio | ok |
| envelope inválido recusado na entrada da fila (8 variações) | `22023` |
| tetos de leitura (quantidade e visibilidade, acima e abaixo) | `22023` |
| `service_role` enfileira pela fronteira | ok |
| mensagem lida fica invisível durante a visibilidade | ok |
| **mensagem não confirmada reaparece após a visibilidade** | ok, `read_ct` 1 → 2 |
| mensagem confirmada é removida e não volta | ok |
| **dois claims concorrentes** | exatamente 1 `CLAIMED`, outro `ALREADY_CLAIMED` |
| `attempt_count` incrementa só no claim vencedor | 1 |
| claim com organização/correlation erradas | `NOT_FOUND` |
| conclusão repetida | `ALREADY_SUCCEEDED` (idempotente) |
| operação `SUCCEEDED` reivindicada de novo | `ALREADY_SUCCEEDED`, `attempt_count` inalterado |
| **worker real: `PENDING → CLAIMED → SUCCEEDED`** | HTTP 200, `outcomes={"succeeded":1}` |
| **mensagem duplicada tardia** | `already_succeeded`; estado final segue uma única `SUCCEEDED` com `attempt_count=1` |
| job de tipo não suportado | arquivado; não reaparece; operação permanece `PENDING`, não executada |
| cleanup | fila ativa/arquivada, operations, organizations e fixtures em zero |

Estruturais — `scripts/sql/queue-worker-002b-catalog.sql`:

| prova | resultado |
| --- | --- |
| migration history | **7**, última `20260823180000` |
| `pgmq` | 1.5.1 instalado |
| fila `integration_jobs` | `q_` e `a_` com `relpersistence='p'` — durável, não unlogged |
| `pgmq_public` | schema inexistente |
| 5 wrappers de fila | owner `postgres`, `SECURITY DEFINER`, `search_path=""`, ACL só `postgres`+`service_role` |
| helpers de `operations` | mesmos owner/`search_path`/ACL, `SECURITY DEFINER = false` |
| fila hardcoded / SQL dinâmico | nome constante nos wrappers; zero `execute` dinâmico |
| `public` | 5 tabelas, todas com RLS; **sem** `public.integration_jobs` |
| `pg_cron` | não instalado — nenhum scheduler criado |
| `supabase_admin` em `public` | 0 objetos |
| `ensure_rls` e defaults 001D | preservados |

---

## 5. Migration/DDL

Uma única migration, histórico **6 → 7**. Nenhuma migration promovida foi modificada.
Nenhum DDL fora da migration.

Rollback: `drop extension pgmq cascade` remove fila e tabelas de mensagem; os wrappers e
helpers são funções novas em `public` e saem por `drop function`. Nada da fundação
promovida 000–002A depende deles.

---

## 6. Configuração remota

- Edge Function `integration-worker` **deployada** (bundle 841 kB).
- `supabase/config.toml` declara `verify_jwt = false` para ela, porque secret key não é JWT;
  a autorização real é `withSupabase({ auth: 'secret' })` dentro da função. Não há caminho
  anônimo.
- **Nenhum segredo humano novo.** A função usa as chaves que o próprio Supabase injeta.
- `api.schemas` continua `["public", "graphql_public"]` — `pgmq_public` não foi adicionado.
- Nenhum gate humano solicitado.

---

## 7. Gates

lint (0 warnings), typecheck da aplicação, `vitest run` (22 arquivos / **491** testes, eram
437) e build — todos verdes. Edge Function validada pelo bundle do deploy. CI na branch/PR.

**Security Advisor:** idêntico ao baseline — WARN conhecido `auth_leaked_password_protection`
e os dois INFO `rls_enabled_no_policy` já aceitos na 002A. **Nenhum ERROR/WARN novo.**

**Performance Advisor:** um INFO — `unindexed_foreign_keys` em
`audit_events.actor_user_id`. Não é regressão desta rodada: o `estado.md` §10.2 já o
registrava como dívida aberta da 002A. Nada de novo foi introduzido pela 002B.

---

## 8. Branch

`claude/rodada-002b-queue-worker-foundation`, criada de `origin/main`. PR draft aberta. Sem
merge na `main`, sem force push.

---

## 9. Pendências, riscos e divergências

1. **Sem scheduler.** A função é invocável mas nada a invoca automaticamente (mandato §5.6).
   A decisão de frequência/custo/frescor é da próxima sub-rodada.
2. **Poison message encerra a operação como `FAILED` com `UNKNOWN_UPSTREAM`.** É a
   classificação menos falsa disponível: não houve provider externo envolvido. Se uma
   categoria interna própria for desejada, é decisão de contrato do GPT.
3. **Lote pequeno e em série** (5 mensagens). Correção antes de concorrência, conforme §5.5.
4. `audit_events.actor_user_id` sem índice — INFO de performance, dívida herdada.
5. `auth_leaked_password_protection` continua hardening pré-produção.
6. Gmail SMTP intocado, App Password segue ativa enquanto necessária.
7. Nenhum webhook, Meta, Ads, IA, UI ou notificação foi iniciado.

---

## 10. Conclusão

A esteira existe e foi provada onde importa: a fila é durável, o redelivery acontece de
verdade quando a mensagem não é confirmada, o claim concorrente tem exatamente um vencedor
decidido pelo banco, e a mesma operação não executa duas vezes nem quando a mensagem é
reentregue depois de concluída. A fronteira da fila é estreita — cinco funções com fila
hardcoded, sem SQL dinâmico, alcançáveis só por `service_role` — e o browser não chega a
nenhuma delas nem quando o usuário é membro ativo do tenant.

O worker é a Edge Function realmente deployada, invocada com secret key, e levou uma
operação de `PENDING` a `SUCCEEDED` no projeto hospedado.

Diferente da 002A, a migration foi validada em transação revertida **antes** de ser
aplicada, e não houve nenhuma correção de schema após a aplicação.

`002B EXECUTADA — AGUARDANDO AUDITORIA GPT`
