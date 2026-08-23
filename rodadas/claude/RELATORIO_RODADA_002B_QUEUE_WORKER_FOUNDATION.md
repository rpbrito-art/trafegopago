# RELATÓRIO — RODADA 002B + CORREÇÃO 002B-01 — QUEUE + WORKER FOUNDATION

Executor: Claude Code
Data: 2026-08-23
Branch: `claude/rodada-002b-queue-worker-foundation`

Status: **002B + CORREÇÃO 002B-01 EXECUTADAS — AGUARDANDO REAUDITORIA GPT**

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

## 1-A. Correção 002B-01 — os três bloqueios da auditoria

Retomada na mesma branch, reconciliada com `origin/main` (conflito só em `estado.md`,
resolvido pela versão da `main`).

### Bloqueio A — poison com taxonomia externa falsa

O worker marcava exaustão de fila como `UNKNOWN_UPSTREAM`. Nenhum provider foi chamado:
rotular assim inventa um erro externo e envenena qualquer política de retry que leia
`last_error_class`.

Agora `fail_operation` recebe `p_error_class = null` e um resumo interno curto, e a
mensagem **só é arquivada após desfecho conhecido**. A decisão saiu do worker para
`src/lib/operations/poison.ts`, com testes — erro de RPC e retorno desconhecido preservam
a mensagem, e a visibility timeout a devolve.

**Limite declarado:** o ramo "sem desfecho seguro" não é forçável remotamente sem revogar
grants (DDL ad hoc, proibido pela §8). Está coberto de forma determinística nos testes
unitários, e o worker usa exatamente essa função — não uma cópia.

### Bloqueio B — validador SQL menos estrito que o TypeScript

O predicado lia os campos com `->>`, que converte qualquer escalar para texto: `version: "1"`,
`jobType: 123` e `jobType: true` passavam na fila e só seriam recusados no consumidor.

Migration corretiva **nova** (`20260823183513`, histórico 7 → 8), com
`CREATE OR REPLACE FUNCTION` — a migration `20260823180000` **não** foi reescrita e nenhum
`migration repair` foi usado. O predicado agora exige `jsonb_typeof` antes de olhar o valor.
Validado em transação revertida, com os casos da auditoria, antes de aplicar.

### Bloqueio C — gate da Edge Function

- pin exato `npm:@supabase/server@1.4.1`. Revalidei: 1.4.1 continua a última estável
  (1.5.0-beta/rc não são). Sem mudança material, segui sem parar.
- `deno check` real, agora reproduzível: `deno` entrou como devDependency e
  `npm run typecheck:functions` roda o gate — inclusive na CI. `supabase/functions/deno.json`
  existe para o Deno resolver o specifier `npm:` do mesmo modo que o bundle.
- **O `deno check` encontrou um erro de tipo que o bundle do deploy não pegava**: minha
  anotação de `ctx` conflitava com `SupabaseContext`. Corrigido com uma ponte de tipo única
  e comentada, em vez de casts espalhados. É exatamente o defeito que este gate existia para
  revelar.
- redeploy: função **ACTIVE, versão 2+**, `verify_jwt=false`.
- auth provada remotamente: sem `apikey` → **401**; publishable key → **401**; secret key
  somente em `apikey` → **200**. O `Authorization: Bearer` foi removido do script.

---

## 2. Arquivos

Novos:

- `supabase/migrations/20260823180000_create_queue_and_worker_foundation.sql`;
- `supabase/functions/integration-worker/index.ts`;
- `src/lib/operations/job-message.ts` + `job-message.test.ts`;
- `scripts/queue-worker-002b.mjs` — prova funcional;
- `scripts/sql/queue-worker-002b-catalog.sql` — provas estruturais versionadas.

Da Correção 002B-01:

- `supabase/migrations/20260823183513_tighten_integration_job_message_types.sql` (novo);
- `src/lib/operations/poison.ts` + `poison.test.ts` (novos);
- `supabase/functions/deno.json` e `deno.lock` (novos);
- `supabase/functions/integration-worker/index.ts` (pin, poison, tipagem);
- `scripts/queue-worker-002b.mjs` e `scripts/sql/queue-worker-002b-catalog.sql` (provas novas);
- `package.json` (`deno` + script `typecheck:functions`), `.gitignore`.

Alterados na 002B: `supabase/config.toml` (declara a função com `verify_jwt = false`),
`tsconfig.json` e `eslint.config.mjs` (excluem `supabase/functions` — ver §3.8),
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
   falhava por diferença de runtime, não por defeito. O gate próprio da função é
   `npm run typecheck:functions` (`deno check`), acrescentado pela Correção 002B-01. O
   bundle do deploy **não** substitui esse gate: ele deixou passar um erro de tipo que o
   `deno check` pegou.
9. **Ordem "concluir operação → confirmar mensagem".** Se o processo morrer entre as duas, a
   mensagem reaparece e o claim seguinte encontra `ALREADY_SUCCEEDED`, que remove a mensagem
   sem repetir efeito. A ordem inversa perderia o registro do trabalho feito.
10. **Poison message encerra a operação junto.** Arquivar a mensagem e deixar a operação
    `CLAIMED` para sempre esconderia um trabalho que nunca vai acontecer.

---

## 4. Provas

Funcionais — `node scripts/queue-worker-002b.mjs`: **82/82** após a Correção 002B-01, com a
Edge Function real invocada remotamente.

| prova | resultado |
| --- | --- |
| `anon` e `authenticated` nos **9** pontos da fronteira (5 wrappers de fila + 4 funções: claim/complete/fail/validador) | `42501` em todos os 18 |
| **auth da Edge Function**: sem `apikey` / publishable / secret só em `apikey` | **401 / 401 / 200** |
| **tipos JSON inválidos** recusados antes da fila (`version:"1"`, `version:true`, `jobType:123`, `jobType:true`, org numérico, correlation não-string, operationId não-string) | `22023` em todos |
| nenhum envelope inválido entrou na fila | 0 mensagens |
| envelope válido continua aceito após o endurecimento | ok |
| **poison real**: `read_ct` acima do teto → arquivada | `archived_poison` |
| operação da poison termina `FAILED` com **`last_error_class = NULL`** | ok |
| `last_error_summary` interno, sem citar erro externo | "mensagem excedeu 3 entregas na fila interna" |
| poison arquivada não reaparece | `read=0` |
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
| migration history | **8**, última `20260823183513` (local == remoto) |
| validador estrito | `version:"1"`, `jobType:123`, org numérico → `false`; envelope válido → `true` |
| validador continua INVOKER | `search_path=""`, ACL só `postgres`+`service_role` |
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

Duas migrations no total desta rodada: a fundação `20260823180000` (**6 → 7**) e a corretiva
`20260823183513` (**7 → 8**), criada pelo comando vigente da CLI com
`CREATE OR REPLACE FUNCTION`.

**A migration já aplicada não foi reescrita**, e não houve `migration repair` nem DDL ad hoc
— exatamente a restrição da §8 e do `estado.md` §10.1. Ambas foram validadas em transação
revertida antes de aplicar.

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

lint (0 warnings), typecheck da aplicação, **`deno check` da Edge Function**, `vitest run`
(**510** testes, eram 491) e build — todos verdes. Migration history local == remoto = **8**.
Edge Function **ACTIVE, versão 2+** após redeploy. CI na branch/PR.

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
2. **Poison encerra a operação como `FAILED` com `last_error_class = NULL`** (corrigido pela
   002B-01). Se uma categoria interna própria for desejada no futuro, é decisão de contrato
   do GPT — esta correção não podia criar taxonomia nova.
3. **O ramo "poison sem desfecho seguro" não tem prova remota.** Forçá-lo exigiria revogar
   grants no banco, que é DDL ad hoc proibido. Está coberto por teste unitário determinístico
   em `poison.test.ts`, e o worker usa exatamente essa função.
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

Diferente da 002A, as migrations foram validadas em transação revertida **antes** de serem
aplicadas, e não houve nenhuma correção de schema após a aplicação.

Os três bloqueios da auditoria estão fechados com prova real: o poison não inventa mais erro
externo e só arquiva após desfecho conhecido; o validador SQL recusa os tipos JSON que antes
passavam, antes da fila; e a Edge Function tem dependência pinada, `deno check` reprodutível
— que, aliás, revelou um erro de tipo que o bundle do deploy não pegava — e auth provada
negativa e positivamente.

`002B + CORREÇÃO 002B-01 EXECUTADAS — AGUARDANDO REAUDITORIA GPT`
