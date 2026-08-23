# HISTORY SUMMARY — TRÁFEGO PAGO

Atualizado: 2026-08-23

Resume somente estado auditado/promovido e decisões estruturais persistentes. Evidência completa permanece em `rodadas/` e no Git.

## Fundação do produto

- SaaS para inteligência de crescimento com Instagram + Meta Ads;
- mídia paga é opcional;
- jornada, resultado e quantidade de oportunidades são configuráveis;
- conteúdo orgânico, criativo e anúncio são conceitos distintos;
- personas são hipóteses apoiadas por evidência;
- simplicidade guiada: complexidade técnica fica no sistema, não no usuário.

## Fase 0 — Bootstrap

Promovida em PR #1. Base Next.js/React/TypeScript, CI e clientes Supabase.

## Fase 1 — Supabase, Auth e Tenancy

Encerrada/promovida após 001F.

Entregue:

- Auth real e recovery real;
- organizations/memberships;
- RLS/grants/isolamento;
- business_profiles;
- bootstrap de negócio server-only.

Decisões persistentes:

- default ACL residual de `supabase_admin` é aceito apenas enquanto nenhum objeto `public` pertencer à role;
- Gmail SMTP permanece provisório de desenvolvimento;
- novos métodos Auth exigem reabrir o guard de recovery.

PRs #2–#7.

## Fase 2 — Operations, Audit, Queues e Segurança Base

**ENCERRADA E PROMOVIDA em 2026-08-23 após a 002C.**

### 002A — Operations + Audit

- `operations` idempotentes;
- correlation IDs;
- taxonomia de erro/retry;
- `audit_events` append-oriented;
- tabelas internas server-only.

PR #8.

### 002B — Queue + Worker Foundation

- Supabase Queues/PGMQ 1.5.1;
- fila `integration_jobs`;
- wrappers estreitos;
- claim/conclusão/falha de operations;
- Edge Function `integration-worker`;
- redelivery, concorrência e idempotência;
- poison interno sem taxonomia externa falsa;
- contrato SQL/TypeScript alinhado;
- dependências da função pinadas.

PR #9 — merge `c0af987ebe68cd0eafd80efef6a0e63e4c7d7042`.

### 002C — Webhook Inbox + Observabilidade

- `public.webhook_events` server-only;
- dedupe `(provider, dedupe_hash)`;
- `service_role` sem DELETE;
- índice de `audit_events.actor_user_id`;
- observabilidade agregada sem payload/PII;
- matriz de secrets/runtime;
- `typecheck:functions` na CI;
- 9 migrations no total;
- CI final verde com 510 testes.

Auditoria: `rodadas/gpt/AUDITORIA_RODADA_002C_WEBHOOK_INBOX_OBSERVABILIDADE.md` — PR #10.

## Governança de eficiência

Decisão persistente de 2026-08-23:

- Claude: `CLAUDE.md → estado.md → mandato → READ SET mínimo`;
- estado promovido é baseline;
- prova por delta e raio de impacto;
- correção pequena não repete bateria anterior sem risco concreto;
- suíte completa uma vez na CI final por padrão;
- `ACTIVE_DOCS` deixa de duplicar rodada/status;
- documentação canônica só muda quando seu contrato muda;
- CI de branch passa a rodar pelo PR, evitando duplicação `push + pull_request` do mesmo commit;
- relatório normal ≤100 linhas; microcorreção ≤60.

## Próxima macrofase

**Fase 3 — Meta Connection Foundation.**

A primeira rodada planejada é 003A, ainda não autorizada.

## Pendências transversais

- leaked-password protection antes de produção;
- SMTP/domínio de produção;
- default ACL residual de `supabase_admin` enquanto inerte;
- gestão avançada de membros e multi-org posteriores;
- rate limiting conforme exposição real;
- App Review/Business Verification ficam para hardening/comercialização quando aplicável.