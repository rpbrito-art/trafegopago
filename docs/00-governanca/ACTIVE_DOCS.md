# ACTIVE DOCS — TRÁFEGO PAGO

Atualizado: 2026-08-23
Última reciclagem: fechamento da Fase 1 após promoção da 001F.
Próximo gatilho ordinário: cinco rodadas substantivas promovidas desde essa reciclagem, fechamento da próxima fase macro ou outro gatilho de `DOCUMENTATION_LIFECYCLE.md`.

## Estado corrente

**Fase 1 encerrada e promovida.**

**Fase 2 — Operations, Audit, Queues e Segurança Base: EM ANDAMENTO.**

Última promoção: **002A — Operations + Audit Foundation**.

Rodada vigente: **002B — Queue + Worker Foundation**.

Status: **BLOQUEADA EM AUDITORIA — CORREÇÃO 002B-01 AUTORIZADA**.

Mandato-base:

`rodadas/gpt/RODADA_002B_QUEUE_WORKER_FOUNDATION.md`

Auditoria vigente:

`rodadas/gpt/AUDITORIA_RODADA_002B_QUEUE_WORKER_FOUNDATION.md`

Correção vigente:

`rodadas/gpt/CORRECAO_RODADA_002B_01_CONTRATO_POISON_EDGE_GATE.md`

Branch:

`claude/rodada-002b-queue-worker-foundation`

PR #9 deve permanecer draft.

O estado incorporado continua 000–002A até reauditoria e promoção real da 002B.

Fonte operacional: `estado.md`.

## HOT — ler sempre na retomada 002B-01

1. `estado.md`
2. `.gpt/PROJECT_PROMPT.md`
3. `docs/00-governanca/ACTIVE_DOCS.md`
4. `rodadas/gpt/RODADA_002B_QUEUE_WORKER_FOUNDATION.md`
5. `rodadas/gpt/AUDITORIA_RODADA_002B_QUEUE_WORKER_FOUNDATION.md`
6. `rodadas/gpt/CORRECAO_RODADA_002B_01_CONTRATO_POISON_EDGE_GATE.md`

## Resumo histórico preferencial

`docs/00-governanca/HISTORY_SUMMARY.md`

O resumo incorpora somente estado promovido 000–002A. Não reler relatórios antigos completos por ritual.

## READ SET específico da Correção 002B-01

Além dos HOT, ler somente o necessário para os três bloqueios:

- `src/lib/operations/contracts.ts`;
- `src/lib/operations/job-message.ts` + testes;
- `supabase/migrations/20260823180000_create_queue_and_worker_foundation.sql`;
- `supabase/functions/integration-worker/index.ts`;
- `scripts/queue-worker-002b.mjs`;
- `scripts/sql/queue-worker-002b-catalog.sql`;
- `supabase/config.toml`;
- documentação Supabase vigente de Edge Function `auth: 'secret'`, secret keys, `deno check` e pinning de dependências.

Abrir canônicos adicionais apenas se surgir dependência concreta. O contrato técnico da 002B continua sendo o mandato-base + correção.

## Gate de produto

A 002B-01 permanece infraestrutura interna e não altera produto/UX. Portanto não exige nova leitura de Growth Intelligence enquanto não houver proposta de produto.

Se surgir proposta que afete experiência, onboarding, conteúdo, Meta, anúncios, leads, mensuração ou IA, parar e aplicar o gate integral de `docs/01-produto/GROWTH_INTELLIGENCE_CANONICAL.md` antes de planejar/implementar.

Princípio permanente: **a complexidade pertence ao sistema, não ao usuário**.

## O que já foi auditado e não deve ser redesenhado

Preservar:

- Supabase Queues / `pgmq` como provider;
- fila física única `integration_jobs`;
- fila durável/logged;
- `pgmq_public` fora da Data API;
- ausência de cron nesta rodada;
- ausência de `public.integration_jobs`;
- cinco wrappers de fila com nome hardcoded, sem SQL dinâmico, `SECURITY DEFINER`, `search_path=''` e EXECUTE somente `service_role`;
- helpers de `operations` como `SECURITY INVOKER`;
- claim por UPDATE condicional;
- identidade `operation_id + organization_id + correlation_id`;
- stale 900 > visibility 60;
- ordem `concluir operation → remover mensagem`;
- lote pequeno em série;
- `withSupabase({ auth: 'secret' })`;
- nenhuma credencial humana nova.

## Bloqueios ativos a corrigir

1. Poison interno não pode usar `UNKNOWN_UPSTREAM`; usar `last_error_class = null` e tratar erro/retorno do `fail_operation` antes de arquivar.
2. Validador SQL precisa impor tipos JSON estritos e equivalentes ao TypeScript; migration corretiva nova leva 7 → 8, sem reescrever migration aplicada.
3. Edge Function precisa de dependência exata pinada, `deno check`, redeploy e provas de auth com `apikey`.

## Fora da Correção 002B-01

Não executar:

- 002C;
- cron/scheduler;
- nova fila;
- `public.integration_jobs`;
- webhook;
- Meta/Instagram/OAuth;
- conteúdo/publicação;
- Ads/aprovações;
- IA;
- notificações;
- UI;
- nova taxonomia de erro;
- `migration repair`;
- reescrita de migration já aplicada;
- novo provider/segredo humano.

## Gate humano

**Nenhum gate humano esperado.**

Se `deno check` não puder ser executado por mecanismo reproduzível já disponível, Claude deve investigar primeiro o caminho oficial do runtime/CLI e, se realmente exigir intervenção nova do fundador, parar para GPT em vez de improvisar instalação ou pedir segredo.

## Próxima ação autorizada

Claude Code pode executar **somente a Correção 002B-01** via `/proxima`, na branch existente.

Fluxo esperado:

`002B BLOQUEADA → CORREÇÃO 002B-01 → PR #9 draft / relatório atualizado → AGUARDANDO REAUDITORIA GPT`

Nenhuma 002C está autorizada.

## Canônicos ativos por área

### Governança

- `docs/00-governanca/PROJECT_CHARTER.md`
- `docs/00-governanca/IMPLEMENTATION_ROADMAP.md`
- `docs/00-governanca/DOCUMENTATION_LIFECYCLE.md`

### Produto

- `docs/01-produto/MVP_CANONICAL.md`
- `docs/01-produto/GROWTH_INTELLIGENCE_CANONICAL.md`

### Arquitetura

- `docs/03-canonical/TECHNICAL_SPEC.md`
- `docs/03-canonical/DATA_MODEL.md`
- `docs/03-canonical/API_CONTRACTS.md`
- `docs/03-canonical/SECURITY_MODEL.md`
- `docs/03-canonical/AI_ARCHITECTURE.md`
