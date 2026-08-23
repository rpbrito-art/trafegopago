# ESTADO — Tráfego Pago

Atualizado: 2026-08-23

Este é o **estado operacional canônico**. Estado incorporado = `main` + este arquivo + promoção real. Histórico promovido: `docs/00-governanca/HISTORY_SUMMARY.md`.

## 1. Repositório e ambiente

- GitHub: `rpbrito-art/trafegopago`
- Supabase project ref: `cbnxdoxpyioxjwgjhbtq`
- pasta local esperada: `C:\Users\rpbri\Documents\trafegopago`
- `rpbrito-art/business-weaver`: fora de escopo

## 2. Estado incorporado

Promovidas:

- 000 — Bootstrap Técnico;
- 001A — Baseline Supabase e Segurança;
- 001B — Auth Real;
- 001C — Organizations + Membership;
- 001D — Grants + RLS + Isolamento;
- 001E — Bootstrap de Negócio;
- 001F — Recovery de Acesso + Fechamento da Fase 1, com Correções 001F-01 e 001F-02;
- 002A — Operations + Audit Foundation.

**FASE 1 — FUNDAÇÃO SUPABASE, AUTH E TENANCY: ENCERRADA E PROMOVIDA.**

**FASE 2 — OPERATIONS, AUDIT, QUEUES E SEGURANÇA BASE: EM ANDAMENTO.**

O estado **incorporado à main continua 000–002A**. A 002B foi executada remotamente, mas **não foi aprovada nem promovida**.

## 3. Última promoção

Rodada: **002A — Operations + Audit Foundation**

Classificação: **APROVADA COM RESSALVAS NÃO BLOQUEANTES E PROMOVIDA**.

- PR #8
- head auditado: `dcafdf1e6204510b68756bbadd7028a847d250ca`
- merge: `920114d3e04ac1f32c284a6ff867e1c9e53d920b`
- CI: `32655237817` — success
- auditoria: `rodadas/gpt/AUDITORIA_RODADA_002A_OPERATIONS_AUDIT_FOUNDATION.md`

## 4. Rodada corrente

**002B — QUEUE + WORKER FOUNDATION**

Status: **002B EXECUTADA COM CORREÇÃO 002B-01 — AGUARDANDO REAUDITORIA GPT**.

Claude não aprova, não promove e não inicia 002C.

Mandato-base:

`rodadas/gpt/RODADA_002B_QUEUE_WORKER_FOUNDATION.md`

Auditoria bloqueante:

`rodadas/gpt/AUDITORIA_RODADA_002B_QUEUE_WORKER_FOUNDATION.md`

Correção vigente:

`rodadas/gpt/CORRECAO_RODADA_002B_01_CONTRATO_POISON_EDGE_GATE.md`

Branch existente:

`claude/rodada-002b-queue-worker-foundation`

PR: **#9 — manter draft**.

Head auditado antes da correção:

`4f47e60cfb0ace958d8ef830d90197623694759f`

CI auditada:

`32657729531` — success (install/lint/typecheck/491 testes/build).

Nenhuma 002C está autorizada.

### Execução da Correção 002B-01 (2026-08-23)

Retomada na mesma branch, reconciliada com `origin/main` (conflito só em `estado.md`, resolvido pela versão da `main`).

**Bloqueio A — poison sem erro externo falso.** `fail_operation` passa a receber `p_error_class = null` e resumo interno curto; a mensagem só é arquivada após desfecho conhecido. A decisão saiu do worker para `src/lib/operations/poison.ts`, com testes cobrindo erro de RPC e retorno desconhecido — ambos preservam a mensagem para o redelivery.

**Bloqueio B — validador SQL estrito.** Migration corretiva nova `20260823183513`, histórico remoto **7 → 8**, com `CREATE OR REPLACE FUNCTION`. A migration `20260823180000` **não** foi reescrita; nenhum `migration repair`; nenhum DDL ad hoc. O predicado agora exige `jsonb_typeof` antes do valor, recusando `version:"1"`, `version:true`, `jobType:123`, `jobType:true`, org numérico, correlation e operationId não-string.

**Bloqueio C — gate da Edge Function.** Pin exato `npm:@supabase/server@1.4.1` (revalidado: continua a última estável; 1.5.0-* são beta/rc). `deno` entrou como devDependency e `npm run typecheck:functions` roda `deno check` de forma reprodutível, inclusive na CI. **O `deno check` revelou um erro de tipo que o bundle do deploy não pegava** — corrigido. Redeploy: função **ACTIVE, versão 2+**. Auth provada remotamente: sem `apikey` → 401; publishable → 401; secret somente em `apikey` → 200 (o `Authorization: Bearer` foi removido do script).

Provas: **82/82** (eram 60), incluindo poison real com `last_error_class` NULL e resumo interno, tipos JSON recusados antes da fila, e as regressões de redelivery, claim concorrente, idempotência, healthcheck remoto e unsupported. Cleanup deixou fila ativa/arquivada, operations, organizations e fixtures em zero.

Gates: lint (0 warnings), typecheck da aplicação, **`deno check`**, `vitest run` (**510** testes, eram 491) e build — verdes. Migration history local == remoto = **8**.

**Advisors:** Security sem novo ERROR/WARN (WARN `auth_leaked_password_protection` + dois INFO `rls_enabled_no_policy` já aceitos). Performance com o INFO herdado de `audit_events.actor_user_id`.

**Limite declarado:** o ramo "poison sem desfecho seguro" não é forçável remotamente sem revogar grants — DDL ad hoc proibido pela correção §8. Está coberto por teste unitário determinístico em `poison.test.ts`, e o worker usa exatamente essa função.

## 5. O que a 002B já executou remotamente

Embora não promovida, a execução atual existe no Supabase e deve ser preservada durante a correção:

- migration `20260823180000_create_queue_and_worker_foundation` aplicada; histórico remoto = 7;
- `pgmq` 1.5.1 instalado;
- fila durável `integration_jobs` criada;
- cinco wrappers estreitos de fila em `public`;
- helpers `claim_operation`, `complete_operation`, `fail_operation`;
- Edge Function `integration-worker` ACTIVE, versão 1;
- `verify_jwt=false` + `withSupabase({ auth: 'secret' })`;
- nenhuma `public.integration_jobs`;
- nenhum cron / `pg_cron` instalado;
- nenhuma Meta, Ads, IA, webhook ou UI iniciada.

A auditoria independente confirmou:

- fila ativa e arquivo vazios após cleanup;
- wrappers PGMQ: owner `postgres`, `SECURITY DEFINER`, `search_path=''`, ACL somente `postgres` + `service_role`;
- helpers de `operations`: `SECURITY INVOKER`, mesma ACL mínima;
- `anon`/`authenticated` sem EXECUTE na fronteira auditada;
- `pgmq_public` não exposto;
- cinco tabelas `public`, todas com RLS;
- zero objetos `public` owned por `supabase_admin`;
- `operations` e `audit_events` sem fixtures;
- logs da Edge Function confirmam invocações reais HTTP 200;
- Security Advisor sem novo ERROR/WARN;
- Performance Advisor só com dívida herdada de `audit_events.actor_user_id` sem índice.

Esses pontos estão **executados e auditados como evidência**, mas só serão incorporados se a correção passar e a PR for promovida.

## 6. Bloqueios da auditoria 002B

### A. Poison message usa classe de erro externa falsa

O worker marca falha interna da fila como `UNKNOWN_UPSTREAM`, embora essa classe represente erro externo de provider. O mandato proibia explicitamente inventar classificação externa falsa.

Correção: poison interno deve usar `last_error_class = null`, resumo interno curto e só arquivar após resultado seguro de `fail_operation`.

### B. Validador SQL é menos estrito que o TypeScript

O predicado SQL aceita tipos JSON que o parser TypeScript rejeita, inclusive:

- `version: "1"`;
- `jobType: 123`;
- `jobType: true`.

Correção: migration nova 7 → 8 com `CREATE OR REPLACE FUNCTION`, impondo os tipos JSON exatos sem reescrever a migration já aplicada.

### C. Gate da Edge Function incompleto

A função usa `npm:@supabase/server@1` e o deploy/bundle foi tratado como typecheck.

Correção:

- pin exato do pacote, baseline auditado `1.4.1` após revalidação;
- `deno check supabase/functions/integration-worker/index.ts` obrigatório;
- redeploy;
- prova de auth sem chave, com publishable key e com secret key somente no header `apikey`.

## 7. Escopo autorizado da Correção 002B-01

Executar apenas:

- migration corretiva do validador SQL, histórico remoto 7 → 8;
- ajuste do poison handler sem classe externa falsa e com tratamento seguro de erro do RPC;
- pin exato da dependência da Edge Function;
- `deno check` real;
- auth da função provada negativamente e positivamente;
- prova real de poison;
- regressões essenciais de redelivery, claim concorrente, idempotência e healthcheck;
- redeploy da Edge Function;
- cleanup, Advisors e CI final.

Não reabrir as decisões já aprovadas da arquitetura da fila.

## 8. Fora de escopo imediato

Não autorizado agora:

- 002C;
- cron/scheduler;
- nova fila física;
- `public.integration_jobs`;
- webhook;
- Meta/Instagram/OAuth;
- conteúdo/publicação;
- Ads/aprovações financeiras;
- IA;
- UI;
- notificações;
- nova taxonomia de erro;
- novo segredo humano;
- `migration repair` ou reescrita da migration 002B aplicada.

## 9. Riscos e dívidas abertas

1. `audit_events.actor_user_id` sem índice próprio — INFO de performance herdado da 002A.
2. `auth_leaked_password_protection` — hardening pré-produção.
3. Gmail SMTP — desenvolvimento; configuração de produção futura.
4. App Password do Gmail permanece secreta/ativa enquanto necessária.
5. Default ACL residual de `supabase_admin` aceito somente enquanto não houver objetos `public` owned por essa role.
6. A 002B só pode ser promovida após reauditoria GPT da Correção 002B-01.

## 10. Próxima ação autorizada

A Correção 002B-01 está **executada**. Cumprido pelo executor: preflight de retomada e reconciliação, leitura da auditoria e da correção, fechamento dos três bloqueios com prova real, migration corretiva 7 → 8 sem reescrever a aplicada, redeploy da Edge Function, gates completos incluindo `deno check`, relatório atualizado e PR #9 mantida draft.

**A próxima ação é do GPT: reauditar a 002B com a Correção 002B-01 e decidir aprovação, correção ou promoção.**

Claude não promove, não inicia 002C e não adiciona cron/webhook/Meta por proximidade.
