# ESTADO — Tráfego Pago

Atualizado: 2026-08-23

Estado incorporado = `main + este arquivo + promoção real`.

## 1. Repositório e ambiente

- GitHub: `rpbrito-art/trafegopago`
- Supabase project ref: `cbnxdoxpyioxjwgjhbtq`
- pasta local esperada: `C:\Users\rpbri\Documents\trafegopago`
- `rpbrito-art/business-weaver`: fora de escopo

## 2. Estado incorporado

Promovidas:

- 000 — Bootstrap Técnico;
- 001A — Baseline Supabase e Segurança;
- 001B — Auth Real;
- 001C — Organizations + Membership;
- 001D — Grants + RLS + Isolamento;
- 001E — Bootstrap de Negócio;
- 001F — Recovery de Acesso + fechamento da Fase 1;
- 002A — Operations + Audit Foundation;
- 002B — Queue + Worker Foundation, com Correção 002B-01.

**Fase 1 encerrada e promovida.**

**Fase 2 — Operations, Audit, Queues e Segurança Base: EM ANDAMENTO.**

Estado técnico incorporado: **000–002B**.

Última promoção: 002B, PR #9, merge `c0af987ebe68cd0eafd80efef6a0e63e4c7d7042`.

## 3. Baseline relevante após 002B

- migration history = 8, última `20260823183513`;
- `pgmq` 1.5.1 + fila durável `integration_jobs` promovidos;
- fila limpa após provas;
- Edge Function `integration-worker` ACTIVE versão 3;
- `operations`/`audit_events` server-only;
- 5 tabelas `public` com RLS;
- `pgmq_public` não exposto;
- `pg_cron` não instalado;
- zero objetos `public` owned por `supabase_admin`;
- nenhum Meta/OAuth/Ads/IA/webhook público iniciado.

Dívidas relevantes:

- `typecheck:functions` ainda fora da CI;
- `audit_events.actor_user_id` sem índice;
- leaked-password protection pré-produção;
- SMTP/App Password de desenvolvimento;
- default ACL residual de `supabase_admin` aceito enquanto inerte.

## 4. Rodada corrente

**002C — WEBHOOK INBOX + OBSERVABILIDADE BASE**

Status: **AUTORIZADA — AGUARDANDO EXECUÇÃO PELO CLAUDE CODE**.

Mandato:

`rodadas/gpt/RODADA_002C_WEBHOOK_INBOX_OBSERVABILIDADE.md`

Branch esperada:

`claude/rodada-002c-webhook-inbox-observabilidade`

Relatório esperado:

`rodadas/claude/RELATORIO_RODADA_002C_WEBHOOK_INBOX_OBSERVABILIDADE.md`

A autorização cobre **somente 002C**.

## 5. Escopo 002C em uma linha

`webhook_events server-only + dedupe + observabilidade agregada + typecheck:functions na CI + secrets/runtime canônico + índice audit_events se Advisor confirmar`

Sem cron, endpoint público, Meta/OAuth, IA, Ads ou UI.

## 6. Governança de eficiência incorporada em 2026-08-23

Auditoria de documentos identificou excesso de leitura e prova repetida.

Regra vigente:

- Claude Code carrega `CLAUDE.md` automaticamente;
- `/proxima` lê por padrão **estado.md + mandato + READ SET obrigatório**;
- `PROJECT_PROMPT.md`, `ACTIVE_DOCS.md`, `HISTORY_SUMMARY.md` e histórico deixam de ser leitura ritual do Claude;
- READ SET normal: até 5 documentos além de estado+mandato;
- estado promovido é baseline;
- provas são por delta e raio de impacto;
- correção pequena não repete bateria anterior sem motivo concreto;
- testes locais somente novos/afetados;
- suíte completa uma única vez na CI final;
- relatório normal ≤100 linhas/~10 KB; microcorreção ≤60 linhas/~6 KB;
- um único push final quando possível.

A redução é de repetição, não de rigor de segurança.

## 7. Próxima ação autorizada

Claude Code deve executar **somente a 002C** via `/proxima`.

Fluxo esperado:

`AUTORIZADA → EXECUÇÃO CLAUDE → PR/RELATÓRIO → 002C EXECUTADA — AGUARDANDO AUDITORIA GPT`

Claude não promove, não encerra a Fase 2 sozinho e não inicia etapa seguinte.