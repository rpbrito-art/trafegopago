# ACTIVE DOCS — TRÁFEGO PAGO

Atualizado: 2026-08-23
Última reciclagem: fechamento da Fase 1 após promoção da 001F.

## Estado corrente

**Fase 1 encerrada e promovida.**

**Fase 2 — Operations, Audit, Queues e Segurança Base: EM ANDAMENTO.**

Última promoção: **002B — Queue + Worker Foundation**, com Correção 002B-01.

Estado incorporado: **000–002B**.

Próxima etapa: **002C — Webhook Inbox + Observabilidade Base**.

Status: **PLANEJADA — NÃO AUTORIZADA**.

Plano:

`rodadas/gpt/PLANO_RODADA_002C_WEBHOOK_INBOX_OBSERVABILIDADE.md`

Não existe mandato executável 002C. `/proxima` deve parar.

Fonte operacional: `estado.md`.

## HOT — ler agora

1. `estado.md`
2. `.gpt/PROJECT_PROMPT.md`
3. `docs/00-governanca/ACTIVE_DOCS.md`
4. `rodadas/gpt/PLANO_RODADA_002C_WEBHOOK_INBOX_OBSERVABILIDADE.md` somente para discussão/avaliação — não para executar

## Histórico promovido relevante

Resumo preferencial:

`docs/00-governanca/HISTORY_SUMMARY.md`

A reauditoria final da última rodada está em:

`rodadas/gpt/REAUDITORIA_RODADA_002B_CORRECAO_01.md`

O `HISTORY_SUMMARY.md` pode incorporar 002B junto da próxima etapa substantiva; não criar housekeeping isolado só para alinhamento.

## Baseline técnico a preservar

- 8 migrations, última `20260823183513`;
- `pgmq` 1.5.1 instalado;
- fila durável `integration_jobs` vazia após cleanup;
- Edge Function `integration-worker` ACTIVE versão 3;
- 5 wrappers PGMQ `SECURITY DEFINER`, fila hardcoded, ACL apenas `postgres` + `service_role`;
- helpers/validador `SECURITY INVOKER` com ACL mínima;
- `pgmq_public` não exposto;
- `pg_cron` não instalado;
- 5 tabelas `public` com RLS;
- `operations`/`audit_events` server-only;
- zero fixtures e zero objetos `public` owned por `supabase_admin`;
- auth/recovery/tenancy da Fase 1 preservados;
- nenhuma Meta, Ads, IA, webhook público ou UI de integração iniciada.

## Ressalvas/dívidas abertas

1. `typecheck:functions` ainda não roda no workflow CI; fechar na próxima rodada substantiva antes de ampliar Edge Functions.
2. `audit_events.actor_user_id` sem índice próprio — INFO de performance.
3. WARN `auth_leaked_password_protection` — hardening pré-produção.
4. Gmail SMTP/App Password continuam apenas para desenvolvimento.
5. default ACL residual de `supabase_admin` é aceito somente enquanto não houver objetos `public` owned por essa role.

## Planejamento 002C

Objetivo proposto:

- `webhook_events` como inbox durável server-only;
- dedupe por provider/hash;
- observabilidade mínima por contagens/status sem payload/PII;
- estratégia canônica de secrets/runtime;
- encadear `typecheck:functions` à CI;
- possivelmente encerrar a Fase 2 na própria auditoria da 002C.

Decisão planejada: **não criar cron ainda**. Não existe job de negócio periódico; scheduler entra quando houver necessidade real.

## Regra de eficiência reforçada

Para 002C e correções futuras:

- provar o delta, não repetir capacidades já auditadas;
- suíte completa em uma única CI final;
- testes locais apenas novos/relevantes;
- não rerodar o E2E remoto de 82 casos da 002B se fila/worker não forem alterados;
- relatório Claude alvo <= 120 linhas;
- o GPT deve absorver divergência não funcional auditável como ressalva quando for seguro, em vez de devolver microcorreção sem ganho real.

## Gate de produto

A 002C planejada é infraestrutura interna. Enquanto permanecer nesse escopo, não exige releitura de `GROWTH_INTELLIGENCE_CANONICAL.md`.

Se o escopo tocar endpoint Meta, OAuth, conteúdo, Ads, leads, mensuração, IA ou UX, aplicar o gate integral de produto antes de planejar/autorizar.

## Fora de escopo atual

Não autorizado:

- 002C executável;
- cron/pg_cron;
- endpoint público de webhook;
- Meta/Instagram/OAuth;
- conteúdo/publicação;
- Ads/aprovações;
- IA;
- UI;
- notificações;
- provider pago;
- novo segredo humano.

## Próxima ação

O fundador avalia o plano 002C.

Somente autorização explícita permite ao GPT publicar o mandato executável e liberar `/proxima`.