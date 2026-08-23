# ACTIVE DOCS — TRÁFEGO PAGO

Atualizado: 2026-08-23
Última reciclagem: fechamento da Fase 1 após promoção da 001F.
Próximo gatilho ordinário: cinco rodadas substantivas promovidas desde essa reciclagem, fechamento da próxima fase macro ou outro gatilho de `DOCUMENTATION_LIFECYCLE.md`.

## Estado corrente

**Fase 1 encerrada e promovida.**

**Fase 2 — Operations, Audit, Queues e Segurança Base: EM ANDAMENTO.**

Última promoção: **002A — Operations + Audit Foundation**.

Rodada vigente: **002B — Queue + Worker Foundation**.

Status: **AUTORIZADA — AGUARDANDO EXECUÇÃO PELO CLAUDE CODE**.

Mandato:

`rodadas/gpt/RODADA_002B_QUEUE_WORKER_FOUNDATION.md`

Branch esperada:

`claude/rodada-002b-queue-worker-foundation`

O estado incorporado continua 000–002A até auditoria/promoção da 002B.

Fonte operacional: `estado.md`.

## HOT — ler sempre

1. `estado.md`
2. `.gpt/PROJECT_PROMPT.md`
3. `docs/00-governanca/ACTIVE_DOCS.md`
4. `rodadas/gpt/RODADA_002B_QUEUE_WORKER_FOUNDATION.md`

## Resumo histórico preferencial

`docs/00-governanca/HISTORY_SUMMARY.md`

O resumo incorpora Rodadas 000–002A. Mandatos, relatórios e auditorias promovidos anteriores são HISTORY / EVIDENCE: abrir somente se surgir dependência concreta.

## READ SET da 002B

Além dos HOT, ler somente:

- `docs/00-governanca/HISTORY_SUMMARY.md`;
- `docs/00-governanca/IMPLEMENTATION_ROADMAP.md` — Fase 2;
- `docs/03-canonical/TECHNICAL_SPEC.md` — §§3.11, 19–25, 27 e 30;
- `docs/03-canonical/DATA_MODEL.md` — §§13 e 16–18;
- `docs/03-canonical/API_CONTRACTS.md` — §§1 e 11–13;
- `docs/03-canonical/SECURITY_MODEL.md` — §§3–6, 13, 15, 20 e 23–25;
- migration 002A e `src/lib/operations/contracts.ts`;
- documentação Supabase vigente de Queues/PGMQ e Edge Function auth/secrets.

Não reler relatórios antigos completos nem `docs/02-research/` por ritual.

## Gate de produto

A 002B é infraestrutura interna e não altera produto/UX. Portanto não exige releitura de Growth Intelligence enquanto permanecer dentro do mandato.

Se surgir qualquer proposta de mudança de produto/experiência, parar antes de executá-la e aplicar a leitura integral de `docs/01-produto/GROWTH_INTELLIGENCE_CANONICAL.md`.

Princípio permanente: **a complexidade pertence ao sistema, não ao usuário**.

## Escopo ativo 002B

A rodada cria somente:

- Supabase Queues / extensão `pgmq`;
- fila durável server-only `integration_jobs`;
- wrappers mínimos e estreitos para operar somente essa fila;
- contrato validado de job pequeno e referencial;
- helpers mínimos para claim/conclusão segura de `operations`;
- Edge Function server-side `integration-worker`;
- job interno `SYSTEM_HEALTHCHECK` para provar a infraestrutura;
- redelivery por visibility timeout;
- deduplicação/idempotência pela `operation` já persistida;
- poison message arquivada após limite;
- uma migration, levando 6 → 7 se executada com sucesso;
- provas remotas + testes + CI.

## Decisões técnicas da rodada

- provider: Supabase Queues/PGMQ, sem fornecedor externo novo;
- uma fila física pode atender futuros tipos lógicos de job;
- fila não será exposta via `pgmq_public` ao browser;
- `public.integration_jobs` não será criada agora porque PGMQ + `operations` já cobrem persistência/estado necessários;
- wrappers `SECURITY DEFINER` são exceção autorizada apenas na fronteira estreita da fila: queue hardcoded, `search_path=''`, sem SQL dinâmico, EXECUTE somente `service_role`;
- nenhuma credencial humana nova deve ser necessária;
- não criar cron ainda.

## Fora da 002B

Não executar:

- cron/scheduler automático;
- `public.integration_jobs`;
- webhook inbox/endpoint;
- Meta/Instagram/OAuth;
- conteúdo/publicação;
- Ads/aprovações;
- IA;
- notificações;
- UI;
- provider pago/terceiro.

## Gate humano

**Nenhum gate humano esperado.**

Claude deve executar a 002B autonomamente. Não pedir ao fundador para abrir Supabase, habilitar Queue manualmente, copiar secret, digitar SQL ou transportar mensagens.

Se surgir necessidade de novo segredo humano ou exposição do queue ao browser, parar para GPT.

## Baseline promovido a preservar

- 6 migrations antes da 002B;
- `pgmq` disponível e não instalado no baseline;
- Auth/recovery real;
- organizations + memberships + business_profiles;
- `operations` + `audit_events` promovidos;
- grants mínimos + RLS + isolamento tenant;
- 5 tabelas `public`, todas com RLS;
- zero fixtures residuais;
- `public` sem objetos owned por `supabase_admin`;
- defaults endurecidos + `ensure_rls`;
- Security Advisor sem ERROR, com WARN conhecido e INFOs aceitos;
- Gmail SMTP de desenvolvimento intocado.

## Próxima ação autorizada

Claude Code pode executar **somente a 002B** via `/proxima`.

Fluxo esperado:

`AUTORIZADA → EXECUÇÃO CLAUDE → PR/RELATÓRIO → 002B EXECUTADA — AGUARDANDO AUDITORIA GPT`

Não há autorização para 002C após o handoff.

## Regra reforçada após incidente 002A

Se uma migration 002B já aplicada remotamente revelar falha semântica que exija `DROP`, `migration repair` ou reescrita de histórico para corrigi-la, Claude deve **parar e retornar ao GPT**. Não repetir autonomamente o procedimento usado durante a tentativa não promovida da 002A.

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
