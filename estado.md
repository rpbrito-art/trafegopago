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

Status: **AUTORIZADA — AGUARDANDO EXECUÇÃO PELO CLAUDE CODE**.

Mandato:

`rodadas/gpt/RODADA_002B_QUEUE_WORKER_FOUNDATION.md`

Branch esperada:

`claude/rodada-002b-queue-worker-foundation`

Relatório esperado:

`rodadas/claude/RELATORIO_RODADA_002B_QUEUE_WORKER_FOUNDATION.md`

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

Claude Code deve executar **somente a Rodada 002B** a partir da `main` atual.

Ao receber `/proxima`, deve:

1. fazer o preflight previsto no `PROJECT_PROMPT.md`;
2. criar/usar a branch `claude/rodada-002b-queue-worker-foundation` a partir da `main` atual;
3. ler o READ SET do mandato;
4. executar somente o escopo 002B;
5. criar/aplicar uma única migration, levando o histórico de 6 para 7 se tecnicamente aprovada na execução;
6. versionar e implantar a Edge Function `integration-worker` sem novo segredo humano;
7. provar fila, redelivery, idempotência do worker, segurança e cleanup;
8. rodar gates e CI;
9. abrir PR draft e entregar relatório;
10. parar em `002B EXECUTADA — AGUARDANDO AUDITORIA GPT`.

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
