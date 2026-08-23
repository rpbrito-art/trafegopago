# RODADA 002C — WEBHOOK INBOX + OBSERVABILIDADE BASE

Status: **AUTORIZADA**
Data: 2026-08-23
Executor: Claude Code
Branch: `claude/rodada-002c-webhook-inbox-observabilidade`
Relatório: `rodadas/claude/RELATORIO_RODADA_002C_WEBHOOK_INBOX_OBSERVABILIDADE.md`
Supabase project ref: `cbnxdoxpyioxjwgjhbtq`

A autorização cobre **somente a 002C**.

## 1. Objetivo

Fechar as capacidades restantes da Fase 2 sem iniciar Meta:

1. criar `public.webhook_events` como inbox durável server-only;
2. provar dedupe e fronteira de acesso;
3. colocar `typecheck:functions` na CI;
4. registrar estratégia de secrets/runtime no `SECURITY_MODEL.md`;
5. criar observabilidade mínima read-only sem payload/PII;
6. adicionar índice de `audit_events.actor_user_id` se o Advisor confirmar a dívida;
7. deixar a Fase 2 candidata a encerramento pela auditoria GPT.

Não criar endpoint HTTP de webhook.

## 2. READ SET

Após `CLAUDE.md` automático, preflight e leitura de `estado.md` + deste mandato:

### OBRIGATÓRIO

1. `docs/03-canonical/TECHNICAL_SPEC.md` — §§23, 27, 30, 32–35;
2. `docs/03-canonical/DATA_MODEL.md` — §§13–14, 16–17;
3. `docs/03-canonical/SECURITY_MODEL.md` — §§3–9, 15, 20, 23–25;
4. `.github/workflows/ci.yml` + `package.json`;
5. migration 002A apenas no trecho que cria `audit_events`.

### SOB DEMANDA

- `API_CONTRACTS.md` §§10–13 se surgir dúvida real de webhook/retry;
- migrations/arquivos 002B somente se o delta tocar fila/worker;
- `HISTORY_SUMMARY.md`, `ACTIVE_DOCS.md` ou `PROJECT_PROMPT.md` somente diante de dependência histórica/governança não resolvida por `estado + mandato`.

### NÃO LER POR PADRÃO

Relatórios/auditorias antigos, plano 002C, `docs/02-research/`, roadmap completo e canônicos fora das seções acima.

## 3. Baseline bloqueante antes de mutar

Confirmar de forma agrupada:

- repo e branch corretos;
- project ref exato;
- migration history = 8, última `20260823183513`;
- 5 tabelas `public`;
- `integration_jobs` presente e sem fixtures;
- `pg_cron` ausente;
- `integration-worker` ACTIVE;
- `operations`/`audit_events` sem fixtures;
- zero objetos `public` owned por `supabase_admin`;
- Advisors compatíveis com `estado.md`.

Se houver divergência material, parar antes de mutar.

## 4. Orçamento de prova da 002C

Classificação: **Risco B com fronteira de segurança server-only**.

Provar somente o delta. **Não repetir 82/82 da 002B.**

- sem E2E remoto longo da fila/worker se eles não mudarem;
- testes locais somente novos/afetados;
- `npm ci` local só se dependências/lockfile mudarem ou ambiente exigir;
- suíte completa uma única vez na CI final;
- consultas Supabase agrupadas;
- relatório alvo **≤100 linhas/~10 KB**;
- um único push final quando possível.

Correção pequena durante a 002C testa defeito + raio de impacto direto; não reinicia a rodada por ritual.

## 5. Migration única — histórico 8 → 9

Criar uma única migration nova. Não editar migration aplicada, não usar `migration repair` e não fazer DDL ad hoc para corrigir a própria migration depois do push.

Validar integralmente em transação revertida antes de aplicar quando o caminho vigente permitir.

### 5.1 `public.webhook_events`

Campos:

- `id uuid primary key default gen_random_uuid()`;
- `organization_id uuid null references public.organizations(id) on delete cascade`;
- `provider text not null`;
- `external_event_id text null`;
- `dedupe_hash text not null`;
- `event_type text not null`;
- `payload_json jsonb not null`;
- `processing_status text not null default 'RECEIVED'`;
- `received_at timestamptz not null default now()`;
- `processed_at timestamptz null`;
- `error_summary text null`.

Constraints:

- `provider`: trim não vazio, <=80;
- `external_event_id`: quando presente, trim não vazio, <=255;
- `dedupe_hash`: SHA-256 hexadecimal, exatamente 64 caracteres;
- `event_type`: trim não vazio, <=120;
- `payload_json`: representação serializada <=262144 caracteres;
- `processing_status`: `RECEIVED|QUEUED|PROCESSING|PROCESSED|FAILED|IGNORED`;
- `error_summary`: quando presente, trim não vazio, <=2000.

Não criar coerência artificial status/timestamp antes de existir processador.

### 5.2 Dedupe e índices

Criar:

- unique `(provider, dedupe_hash)`;
- índice `(processing_status, received_at)`;
- índice `(organization_id, received_at desc)`.

Se o Advisor pré-migration confirmar o INFO conhecido, criar também:

`audit_events_actor_user_id_idx` em `public.audit_events(actor_user_id)`.

### 5.3 Segurança

- RLS explícito;
- zero policies de browser;
- `REVOKE ALL` de `anon` e `authenticated`;
- `service_role`: somente `SELECT, INSERT, UPDATE`; sem DELETE;
- nenhum grant a PUBLIC;
- nenhuma função `SECURITY DEFINER` nova;
- nenhuma view/tabela pública de observabilidade.

INFO `rls_enabled_no_policy` em `webhook_events` é esperado por desenho.

## 6. CI

Adicionar passo explícito após typecheck da aplicação:

`npm run typecheck:functions`

Não alterar `integration-worker` se esse gate já passar.

CI final deve mostrar, uma única vez:

`install → lint → typecheck app → typecheck functions → tests → build`

Não declarar o gate na CI sem evidência do job final.

## 7. Secrets/runtime

Atualizar **somente `SECURITY_MODEL.md` existente** com matriz curta:

- browser: publishable/public credentials somente;
- Next/server/scripts: secret key apenas server-side;
- Edge/workers: secrets do runtime, nunca client-side;
- futuros tokens Meta: armazenamento/referência server-side, nunca browser/log;
- Vault apenas se o próprio Postgres realmente precisar consumir segredo;
- nenhum privilegiado em `NEXT_PUBLIC_*`;
- secrets distintos por ambiente antes de produção;
- rotação/revogação;
- redaction de logs;
- pinning/lockfile de dependências sensíveis.

Não criar segredo/Vault/token/provider novo.

## 8. Observabilidade mínima

Criar `scripts/sql/observability-base.sql` ou equivalente, **somente leitura**, retornando sem payload/PII/secret:

- operations por status;
- profundidade ativa/arquivada de `integration_jobs`;
- webhook_events por processing_status;
- timestamps agregados úteis.

Sem dashboard, view pública, tabela de métricas ou telemetria externa.

## 9. Prova SQL transacional do delta

Criar `scripts/sql/webhook-inbox-002c-proof.sql` ou equivalente, com fixtures sintéticas e rollback/zero resíduo.

Provar:

1. schema/defaults/constraints/índices;
2. RLS e zero policies;
3. anon/authenticated sem acesso;
4. service_role SELECT/INSERT/UPDATE e sem DELETE;
5. primeiro provider/hash entra;
6. duplicata mesmo provider/hash é recusada;
7. mesmo hash com provider diferente entra;
8. duplicata não altera original;
9. constraints essenciais funcionam;
10. observabilidade expõe somente agregados;
11. índice actor_user_id existe se baseline autorizou;
12. fila/worker continuam presentes por checagem catalogal simples;
13. zero resíduo.

Não criar usuários Auth se roles/transação bastarem.

## 10. Advisors e gates finais

Após aplicação:

- migration local == remoto = 9;
- `git diff --check`;
- prova SQL verde;
- observabilidade validada;
- `npm run typecheck:functions` local, pois é delta da CI;
- não rerodar suíte completa local;
- Security Advisor sem novo ERROR/WARN material;
- Performance Advisor sem INFO de actor_user_id se índice criado;
- zero objetos `public` owned por `supabase_admin`;
- CI final única verde;
- working tree limpa;
- push/PR draft final.

## 11. Parar se surgir

- endpoint público/Meta/OAuth/challenge/assinatura;
- novo segredo humano/provider pago;
- cron;
- nova `SECURITY DEFINER`;
- baseline material divergente;
- migration aplicada exigindo DROP/rewrite/repair;
- necessidade de payload/PII em log;
- mudança arquitetural fora deste mandato.

## 12. Fora de escopo

Meta/OAuth, endpoint público, lead fetch/CRM, cron, nova fila, `public.integration_jobs`, conteúdo/publicação, Ads/aprovações, IA, UI, notificações e provider pago.

## 13. Entrega

- branch/PR draft;
- relatório ≤100 linhas/~10 KB;
- `estado.md` da branch atualizado só com fatos de execução;
- nenhuma etapa seguinte iniciada.

Estado esperado:

`002C EXECUTADA — AGUARDANDO AUDITORIA GPT`

Somente GPT promove e decide se a Fase 2 pode ser encerrada.