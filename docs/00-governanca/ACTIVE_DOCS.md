# ACTIVE DOCS — TRÁFEGO PAGO

Atualizado: 2026-08-23
Última reciclagem: auditoria de eficiência durante a 002C.

## Estado corrente

- Fase 1: encerrada/promovida.
- Fase 2: em andamento.
- Estado incorporado: **000–002B**.
- Rodada vigente: **002C — Webhook Inbox + Observabilidade Base**.
- Status: **AUTORIZADA — AGUARDANDO EXECUÇÃO CLAUDE**.
- Mandato: `rodadas/gpt/RODADA_002C_WEBHOOK_INBOX_OBSERVABILIDADE.md`.
- Branch esperada: `claude/rodada-002c-webhook-inbox-observabilidade`.
- Relatório esperado: `rodadas/claude/RELATORIO_RODADA_002C_WEBHOOK_INBOX_OBSERVABILIDADE.md`.

Fonte operacional: `estado.md`.

## Bootstrap por agente

### GPT / continuidade

1. `.gpt/PROJECT_PROMPT.md`
2. `estado.md`
3. este índice
4. mandato/correção vigente
5. READ SET necessário

### Claude Code

`CLAUDE.md` é carregado automaticamente. Em `/proxima`, ler por padrão apenas:

1. `estado.md`
2. mandato/correção vigente
3. READ SET **OBRIGATÓRIO** do mandato

**Claude não lê este `ACTIVE_DOCS.md`, `PROJECT_PROMPT.md` ou `HISTORY_SUMMARY.md` por padrão a cada rodada.** Abrir somente se o mandato exigir ou surgir dependência concreta.

## READ SET obrigatório da 002C

Além de `estado.md + mandato`:

1. `docs/03-canonical/TECHNICAL_SPEC.md` — §§23, 27, 30, 32–35;
2. `docs/03-canonical/DATA_MODEL.md` — §§13–14, 16–17;
3. `docs/03-canonical/SECURITY_MODEL.md` — §§3–9, 15, 20, 23–25;
4. `.github/workflows/ci.yml` e `package.json`;
5. migration 002A apenas no trecho de `audit_events`.

### Sob demanda

- `API_CONTRACTS.md` §§10–13 se surgir dúvida de webhook/retry;
- migrations/arquivos 002B somente se uma alteração realmente tocar fila/worker;
- `HISTORY_SUMMARY.md` somente para fato histórico não presente em `estado.md`.

## Regras de eficiência vigentes

- estado promovido = baseline;
- provar o delta + raio de impacto real;
- correção pequena não repete bateria anterior sem motivo concreto;
- testes locais somente novos/afetados;
- suíte completa uma única vez na CI final;
- relatório normal ≤100 linhas/~10 KB; microcorreção ≤60 linhas/~6 KB;
- um único push final quando possível;
- READ SET normal: até 5 documentos além de `estado + mandato`.

## Baseline relevante 002B

- 8 migrations, última `20260823183513`;
- PGMQ + `integration_jobs` promovidos e limpos;
- `integration-worker` ACTIVE versão 3;
- `operations`/`audit_events` server-only;
- 5 tabelas `public` com RLS;
- `pg_cron` não instalado;
- zero objetos `public` owned por `supabase_admin`;
- nenhuma Meta/Ads/IA/webhook público iniciada.

## Dívidas que afetam a 002C

1. `typecheck:functions` ainda fora da CI — fechar nesta rodada.
2. `audit_events.actor_user_id` sem índice — fechar se Advisor confirmar.

Continuam futuras: leaked-password protection, SMTP de produção e default ACL residual de `supabase_admin` enquanto inerte.

## Próxima ação

Claude Code pode executar **somente a 002C** via `/proxima`.

Nenhuma rodada posterior está autorizada.