# ESTADO — Tráfego Pago

Atualizado: 2026-08-23

Este é o **estado operacional canônico**. Estado incorporado = `main` + este arquivo. Histórico promovido: `docs/00-governanca/HISTORY_SUMMARY.md`.

## 1. Repositório e ambiente

- GitHub: `rpbrito-art/trafegopago`
- Supabase project ref: `cbnxdoxpyioxjwgjhbtq`
- pasta local esperada: `C:\Users\rpbri\Documents\trafegopago`
- `rpbrito-art/business-weaver`: fora de escopo

## 2. Estado incorporado

Promovidas:

- Rodada 000 — Bootstrap Técnico;
- 001A — Baseline Supabase e Segurança;
- 001B — Auth Real;
- 001C — Organizations + Membership;
- 001D — Grants + RLS + Isolamento;
- 001E — Bootstrap de Negócio;
- 001F — Recovery de Acesso + Fechamento da Fase 1, com Correções 001F-01 e 001F-02;
- 002A — Operations + Audit Foundation.

**FASE 1 — FUNDAÇÃO SUPABASE, AUTH E TENANCY: ENCERRADA E PROMOVIDA.**

**FASE 2 — OPERATIONS, AUDIT, QUEUES E SEGURANÇA BASE: EM ANDAMENTO.**

O estado técnico incorporado continua **000–002A** até auditoria/promoção de nova rodada.

## 3. Última promoção

Rodada: **002A — Operations + Audit Foundation**

Classificação: **APROVADA COM RESSALVAS NÃO BLOQUEANTES E PROMOVIDA**.

PR #8.

Head auditado: `dcafdf1e6204510b68756bbadd7028a847d250ca`

Merge: `920114d3e04ac1f32c284a6ff867e1c9e53d920b`

CI auditada: `32655237817` — success.

Auditoria:

`rodadas/gpt/AUDITORIA_RODADA_002A_OPERATIONS_AUDIT_FOUNDATION.md`

## 4. Rodada corrente autorizada

**RODADA 002B — QUEUE + WORKER FOUNDATION**

Status: **002B EXECUTADA — AGUARDANDO AUDITORIA GPT**.

Claude não aprova, não promove e não inicia 002C.

Mandato:

`rodadas/gpt/RODADA_002B_QUEUE_WORKER_FOUNDATION.md`

Branch esperada:

`claude/rodada-002b-queue-worker-foundation`

Relatório entregue:

`rodadas/claude/RELATORIO_RODADA_002B_QUEUE_WORKER_FOUNDATION.md`

### Execução (2026-08-23)

Branch criada de `origin/main`. Baseline confirmado antes de mutar: 6 migrations (última `20260823160000`), `pgmq` disponível 1.5.1 e **não instalado**, `pg_cron` não instalado, 5 tabelas `public` todas com RLS, `operations`/`audit_events` vazias, 1 conta real, zero objetos owned por `supabase_admin`.

Entregue:

- migration única `20260823180000_create_queue_and_worker_foundation.sql` — histórico remoto **6 → 7**;
- `pgmq` 1.5.1 instalado e fila `integration_jobs` **durável** (`relpersistence='p'`);
- cinco wrappers de fila em `public`, `SECURITY DEFINER`, `search_path=""`, owner `postgres`, fila hardcoded, sem SQL dinâmico, EXECUTE só para `service_role`;
- helpers `claim_operation` / `complete_operation` / `fail_operation` como **SECURITY INVOKER** — a exceção de DEFINER do mandato §2.2 foi usada apenas na fronteira da fila;
- `src/lib/operations/job-message.ts` (contrato do envelope, importado também pela Edge Function) e validação equivalente no banco;
- Edge Function `integration-worker` deployada, autorizada por `withSupabase({ auth: 'secret' })`, com `verify_jwt = false` declarado em `config.toml`;
- `scripts/queue-worker-002b.mjs` (prova funcional) e `scripts/sql/queue-worker-002b-catalog.sql` (provas estruturais versionadas).

Provas: **60/60**, com a Edge Function real invocada remotamente. Entre elas: redelivery efetivo após a visibility timeout com `read_ct` 1 → 2; dois claims concorrentes com exatamente um vencedor; mensagem duplicada tardia reconhecida como já concluída, mantendo uma única `SUCCEEDED` e `attempt_count=1`; job de tipo não suportado arquivado sem reaparecer; `anon` e `authenticated` recusados (`42501`) nos sete pontos da fronteira; `pgmq_public` não exposto (`PGRST106`). Cleanup deixou fila ativa e arquivada, operations, organizations e fixtures em zero.

Gates: lint (0 warnings), typecheck da aplicação, `vitest run` (22 arquivos / **491** testes, eram 437) e build — verdes. Edge Function validada pelo bundle do deploy.

**Advisors:** Security idêntico ao baseline (WARN `auth_leaked_password_protection` + os dois INFO `rls_enabled_no_policy` já aceitos na 002A); nenhum ERROR/WARN novo. Performance com um INFO, `unindexed_foreign_keys` em `audit_events.actor_user_id`, que a §10.2 deste estado já registrava como dívida da 002A — não é regressão da 002B.

**Sem repetir o incidente da 002A:** a migration foi validada rodando o arquivo inteiro em `begin; … rollback;` antes de aplicar, com confirmação de que nada persistiu. Só então `db push`. Nenhum DDL ad hoc e nenhum `migration repair` nesta rodada.

Nenhum cron criado (`pg_cron` continua não instalado), nenhuma `public.integration_jobs`, nenhum segredo humano novo, nenhum gate humano solicitado.

A autorização do fundador em 2026-08-23 autoriza **somente a 002B**. Não autoriza 002C nem o restante da Fase 2.

## 5. Resumo simples da 002B

A 002B cria a infraestrutura interna para tarefas em segundo plano:

- uma fila durável no próprio Supabase/Postgres;
- um formato seguro e pequeno de mensagem;
- um worker server-side invocável que lê, valida e processa jobs;
- redelivery quando uma mensagem não é concluída;
- proteção para a mesma operação não executar duas vezes;
- limite/arquivamento de mensagem problemática para evitar loop infinito.

Para provar o mecanismo sem antecipar produto, o único job inicial será `SYSTEM_HEALTHCHECK`, sem chamada externa, sem gasto e sem UI.

Não haverá cron automático nesta rodada. Primeiro será provado que fila + consumidor funcionam corretamente; scheduler fica posterior.

## 6. Decisão técnica autorizada

Provider de fila: **Supabase Queues / `pgmq`**.

Baseline confirmado antes da autorização:

- Postgres remoto 17.6;
- `pgmq` disponível e ainda não instalado;
- `pg_cron` disponível e ainda não instalado;
- migration history = 6;
- a 002B não precisa de fornecedor pago ou segredo humano novo.

A fila será `integration_jobs`, Basic/Durable, e permanecerá server-only. `pgmq_public` não deve ser exposto ao browser.

A rodada pode usar wrappers `SECURITY DEFINER` apenas na fronteira estreita da fila, com queue hardcoded, search path vazio, sem SQL dinâmico e EXECUTE somente para `service_role`, conforme o mandato.

## 7. Baseline a preservar

Antes da 002B:

- 6 migrations, última `20260823160000`;
- `auth.users`: 1 conta real;
- 5 tabelas `public`, todas com RLS;
- `operations` e `audit_events` vazias após cleanup;
- zero objetos `public` owned por `supabase_admin`;
- defaults endurecidos + `ensure_rls` preservados;
- Security Advisor sem ERROR, com WARN conhecido `auth_leaked_password_protection` e dois INFO aceitos de `rls_enabled_no_policy`;
- Gmail SMTP permanece intocado;
- nenhuma Meta, Ads, IA, webhook ou UI iniciada.

## 8. Próxima ação autorizada

A Rodada 002B está **executada**. Cumprido pelo executor: preflight, branch a partir da `main`, READ SET, escopo 002B, migration única aplicada e provada, Edge Function versionada e implantada sem segredo novo, provas de fila/redelivery/idempotência/segurança/cleanup, gates e CI, PR draft e relatório.

**A próxima ação é do GPT: auditar a 002B e decidir aprovação, correção ou promoção.**

Claude não promove, não inicia 002C e não adiciona cron/webhook/Meta por proximidade.

## 9. Fora de escopo imediato

Não autorizado agora:

- cron/scheduler automático;
- `public.integration_jobs`;
- webhook inbox/endpoint;
- Meta/Instagram/OAuth;
- publicação de conteúdo;
- Ads/aprovações financeiras;
- IA;
- UI nova;
- notificações;
- provider externo pago.

## 10. Riscos e dívidas abertas

1. Não repetir o incidente de migration da 002A: se a migration remota aplicada precisar ser desfeita/regravada por falha semântica, parar para GPT antes de DDL ad hoc ou repair de histórico.
2. `audit_events.actor_user_id` sem índice próprio continua INFO de performance futuro.
3. `auth_leaked_password_protection` continua hardening pré-produção.
4. Gmail SMTP é apenas desenvolvimento; SMTP/domínio de produção permanece futuro.
5. App Password do Gmail permanece secreta/ativa enquanto necessária.
6. Default ACL residual de `supabase_admin` continua aceito somente enquanto não houver objetos `public` owned por essa role.

## 11. Continuidade

- `docs/00-governanca/ACTIVE_DOCS.md` contém o working set da 002B;
- `docs/00-governanca/HISTORY_SUMMARY.md` resume somente estado promovido 000–002A;
- 002B está **autorizada**, não executada, auditada ou promovida;
- nenhuma 002C está autorizada.
