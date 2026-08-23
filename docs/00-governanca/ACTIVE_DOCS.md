# ACTIVE DOCS — TRÁFEGO PAGO

Atualizado: 2026-08-23
Última reciclagem: fechamento da Fase 1 após promoção da 001F.

## Estado corrente

**Fase 1 encerrada e promovida.**

**Fase 2 — Operations, Audit, Queues e Segurança Base: EM ANDAMENTO.**

Última promoção: **002B — Queue + Worker Foundation**, com Correção 002B-01.

Estado incorporado: **000–002B**.

Rodada vigente: **002C — Webhook Inbox + Observabilidade Base**.

Status: **AUTORIZADA — AGUARDANDO EXECUÇÃO PELO CLAUDE CODE**.

Mandato:

`rodadas/gpt/RODADA_002C_WEBHOOK_INBOX_OBSERVABILIDADE.md`

Branch esperada:

`claude/rodada-002c-webhook-inbox-observabilidade`

Relatório esperado:

`rodadas/claude/RELATORIO_RODADA_002C_WEBHOOK_INBOX_OBSERVABILIDADE.md`

Fonte operacional: `estado.md`.

## HOT — ler sempre na 002C

1. `estado.md`
2. `.gpt/PROJECT_PROMPT.md`
3. `docs/00-governanca/ACTIVE_DOCS.md`
4. `rodadas/gpt/RODADA_002C_WEBHOOK_INBOX_OBSERVABILIDADE.md`

## Histórico promovido

Resumo preferencial:

`docs/00-governanca/HISTORY_SUMMARY.md`

A 002B está promovida. O resumo histórico pode ser reciclado junto do fechamento da 002C/Fase 2; não criar housekeeping isolado antes disso.

## READ SET da 002C

Somente o conjunto indicado pelo mandato:

- `HISTORY_SUMMARY.md`;
- `IMPLEMENTATION_ROADMAP.md` — Fase 2;
- `TECHNICAL_SPEC.md` — §§3.11, 19–25, 27, 30, 32–35;
- `DATA_MODEL.md` — §§13, 14, 16–18;
- `API_CONTRACTS.md` — §§10–13, 17–19;
- `SECURITY_MODEL.md` — §§3–9, 13, 15, 19–25;
- `.github/workflows/ci.yml`;
- migrations/arquivos 002A/002B estritamente necessários ao baseline.

Não reler relatórios antigos completos por ritual.

## Escopo ativo 002C

- criar `public.webhook_events` server-only com dedupe `provider + dedupe_hash`;
- RLS habilitado, zero policies de browser, `anon`/`authenticated` sem acesso;
- `service_role` somente SELECT/INSERT/UPDATE;
- nenhuma função `SECURITY DEFINER` nova;
- adicionar `audit_events_actor_user_id_idx` se o INFO de performance continuar no baseline;
- adicionar `npm run typecheck:functions` como passo explícito da CI;
- atualizar `SECURITY_MODEL.md` com matriz curta de secrets/runtime;
- criar observabilidade read-only por agregados, sem payload/PII;
- provar somente o delta e deixar a Fase 2 candidata a encerramento.

## Regra de eficiência da rodada

A 002C **não repete as 82 provas da 002B**.

- baseline auditado 002B é reutilizado;
- testes locais somente do delta;
- não rerodar E2E remoto da fila/worker se eles não forem alterados;
- suíte completa apenas na CI final;
- preferir um único push final;
- relatório Claude alvo <= 120 linhas;
- divergência não funcional pequena deve ser classificada proporcionalmente na auditoria, não gerar microciclo automático.

## Baseline a preservar

- 8 migrations, última `20260823183513`;
- `pgmq` 1.5.1 e fila `integration_jobs` vazia após cleanup;
- Edge Function `integration-worker` ACTIVE versão 3;
- `pgmq_public` não exposto;
- `pg_cron` não instalado;
- 5 tabelas `public` com RLS;
- `operations`/`audit_events` server-only e sem fixtures;
- zero objetos `public` owned por `supabase_admin`;
- Auth/recovery/tenancy da Fase 1 preservados;
- nenhuma Meta, Ads, IA ou webhook público iniciados.

## Dívidas a tratar na 002C

1. `typecheck:functions` ainda fora da CI — **obrigatório fechar**.
2. `audit_events.actor_user_id` sem índice — fechar se o Advisor confirmar o baseline.

Continuam futuras/não bloqueantes:

- `auth_leaked_password_protection` antes de produção;
- SMTP/domínio de produção;
- default ACL residual de `supabase_admin` enquanto inerte.

## Gate de produto

A 002C é infraestrutura interna. Não exige nova leitura integral de Growth Intelligence enquanto permanecer sem endpoint Meta/OAuth/lead/conteúdo/mensuração/UX.

Se o escopo tocar qualquer um desses temas, parar antes de ampliar e retornar ao GPT.

## Fora da 002C

Não executar:

- endpoint público de webhook;
- Meta/Instagram/OAuth;
- challenge/assinatura;
- lead fetch/CRM;
- cron/pg_cron;
- nova fila;
- IA;
- Ads;
- conteúdo/publicação;
- UI;
- notificações;
- provider pago;
- novo segredo humano.

## Próxima ação autorizada

Claude Code pode executar **somente a Rodada 002C** via `/proxima`.

Fluxo esperado:

`AUTORIZADA → EXECUÇÃO CLAUDE → PR/RELATÓRIO → 002C EXECUTADA — AGUARDANDO AUDITORIA GPT`

Nenhuma rodada posterior está autorizada.