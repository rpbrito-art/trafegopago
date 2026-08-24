# HISTORY SUMMARY — TRÁFEGO PAGO

Atualizado: 2026-08-24

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

## Fase 3 — Meta Connection Foundation

**EM ANDAMENTO. 003A PROMOVIDA em 2026-08-24 pela PR #11.**

### 003A — conexão Meta segura + desconexão BISU real

Entregue e provado:

- Facebook Login for Business com Graph API v26.0;
- `meta_connections` e intenções OAuth de uso único;
- token somente no Supabase Vault, sem exposição no browser;
- callback seguro e reconferência de membership;
- conexão real de conta de teste;
- classificação do token real como BISU por `client_business_id`;
- fluxo de desconexão BISU guiado por **Configurações do negócio > Apps conectados**;
- estado persistente de remoção externa, sobrevivendo a reload/login;
- prova fail-closed: erro genérico `190` não prova revogação;
- assinatura pós-remoção `190/464` só é aceita no contexto BISU previamente marcado, com app token saudável e controles adicionais;
- desconexão real ponta a ponta: linha `REVOKED`, `disconnected_at` gravado, referência do token nula e segredo removido do Vault;
- migration `20260824170000` aplicada; histórico remoto com 14 migrations;
- CI final `32772710738` verde no head reconciliado `046c2e7583e823fb18d5667973680874c387eadb`;
- merge da PR #11: `546838db8e7ced4e9045c05feb8c7b2f0c476cc2`.

Decisões persistentes:

- `debug_token.type=SYSTEM_USER` não distingue BISU de system user clássico; classificação usa contrato observável (`client_business_id`);
- BISU não é revogado pelo produto via `oauth/revoke`, `/permissions` ou `/access_tokens`;
- enquanto a remoção externa não estiver comprovada, token/estado local são preservados;
- a superfície correta da Meta para remover a integração instalada é **Apps conectados**, não `Contas > Apps`;
- logger de desenvolvimento do Next ainda pode registrar URL de callback com `code`/`state`; tratar redaction antes de produção.

A Fase 3 ainda não está encerrada porque o roadmap também exige seleção/descoberta de Instagram e conta de anúncios. A próxima rodada substantiva esperada é 003B.

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

## Próxima macrocapacidade

Continuar a **Fase 3** com seleção/descoberta dos ativos Meta necessários. Depois do fechamento da Fase 3, a próxima macrofase é **Fase 4 — Instagram Content Read**.

## Pendências transversais

- leaked-password protection antes de produção;
- SMTP/domínio de produção;
- default ACL residual de `supabase_admin` enquanto inerte;
- gestão avançada de membros e multi-org posteriores;
- rate limiting conforme exposição real;
- redaction de callback/log antes de produção;
- App Review/Business Verification ficam para hardening/comercialização quando aplicável.