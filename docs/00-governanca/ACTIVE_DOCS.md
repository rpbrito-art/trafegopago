# ACTIVE DOCS — TRÁFEGO PAGO

Atualizado: 2026-08-23
Última reciclagem: fechamento da Fase 1 após promoção da 001F.
Próximo gatilho ordinário: cinco rodadas substantivas promovidas desde essa reciclagem, fechamento da próxima fase macro ou outro gatilho de `DOCUMENTATION_LIFECYCLE.md`.

## Estado corrente

**Fase 1 encerrada e promovida.**

Rodada vigente: **002A — Operations + Audit Foundation**.

Status: **AUTORIZADA — AGUARDANDO EXECUÇÃO PELO CLAUDE CODE**.

Mandato:

`rodadas/gpt/RODADA_002A_OPERATIONS_AUDIT_FOUNDATION.md`

Branch esperada:

`claude/rodada-002a-operations-audit-foundation`

O estado incorporado continua 000–001F até auditoria/promoção da 002A.

Fonte operacional: `estado.md`.

## HOT — ler sempre

1. `estado.md`
2. `.gpt/PROJECT_PROMPT.md`
3. `docs/00-governanca/ACTIVE_DOCS.md`
4. `rodadas/gpt/RODADA_002A_OPERATIONS_AUDIT_FOUNDATION.md`

## Resumo histórico preferencial

`docs/00-governanca/HISTORY_SUMMARY.md`

O resumo incorpora Rodadas 000–001F e o fechamento da Fase 1. Mandatos, correções, relatórios e auditorias 000–001F são HISTORY / EVIDENCE: abrir somente se surgir dependência concreta.

## READ SET da 002A

Além dos HOT, ler somente:

- `docs/00-governanca/HISTORY_SUMMARY.md` — resumo promovido;
- `docs/00-governanca/IMPLEMENTATION_ROADMAP.md` — regra de interpretação + Fase 2;
- `docs/03-canonical/TECHNICAL_SPEC.md` — §§2, 3.11, 19–28 e 30;
- `docs/03-canonical/DATA_MODEL.md` — §§13–14 e 16–18;
- `docs/03-canonical/API_CONTRACTS.md` — §§1 e 11–13;
- `docs/03-canonical/SECURITY_MODEL.md` — §§3–6, 15, 20 e 23–25;
- migrations 001D/001E somente como padrão de segurança/grants/RLS;
- scripts atuais somente quando necessários para padrão de fixture/limpeza.

Sob demanda: cliente Supabase privilegiado e documentação oficial apenas quando houver dependência concreta.

Não reler relatórios antigos completos nem `docs/02-research/` por ritual.

## Gate de produto

A 002A é infraestrutura interna e não altera produto/UX. Portanto o executor não precisa reler Growth Intelligence para executar o mandato atual.

**Se surgir qualquer proposta de mudança de produto ou experiência, deve parar antes de executá-la e aplicar a leitura integral de `docs/01-produto/GROWTH_INTELLIGENCE_CANONICAL.md`.**

O princípio permanece vinculante: **a complexidade pertence ao sistema, não ao usuário**.

## Escopo ativo 002A

A rodada cria somente:

- `public.operations` — memória de operações idempotentes;
- `public.audit_events` — histórico append-oriented de ações sensíveis;
- grants/RLS internos de privilégio mínimo;
- `correlation_id` e contratos mínimos de status/error/retry;
- uma migration;
- provas automatizadas e CI.

Nenhuma UI é necessária.

## Fora da 002A

Não executar:

- provider/fila real;
- `integration_jobs` persistente;
- worker/Edge Function;
- cron;
- `webhook_events` ou endpoint de webhook;
- Meta/Instagram/OAuth;
- Ads/aprovações;
- IA;
- notificações;
- gestão de membros;
- deploy/produção.

Esses itens não estão autorizados por proximidade com a Fase 2.

## Gate humano

**Nenhum gate humano esperado.**

Claude deve executar a 002A autonomamente e não pedir ao fundador configuração de Supabase, segredo, SQL manual ou transporte de contexto.

## Baseline promovido a preservar

- Auth/recovery real;
- organizations + memberships + business_profiles;
- grants mínimos + RLS + isolamento tenant;
- bootstrap de negócio atômico server-only;
- 5 migrations antes da 002A;
- zero fixtures residuais;
- `public` sem objetos owned por `supabase_admin`;
- defaults endurecidos + `ensure_rls`;
- Security Advisor apenas com WARN conhecido de senha vazada;
- Gmail SMTP de desenvolvimento intocado.

## Próxima ação autorizada

Claude Code pode executar a 002A via `/proxima`.

Fluxo esperado:

`AUTORIZADA → EXECUÇÃO CLAUDE → PR/RELATÓRIO → 002A EXECUTADA — AGUARDANDO AUDITORIA GPT`

Não há autorização para 002B ou restante da Fase 2 após o handoff.

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