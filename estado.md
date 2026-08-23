# ESTADO — Tráfego Pago

Atualizado: 2026-08-23

Este é o **estado operacional canônico**. Estado incorporado = `main` + este arquivo + promoção real.

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
- 001F — Recovery de Acesso + Fechamento da Fase 1;
- 002A — Operations + Audit Foundation;
- **002B — Queue + Worker Foundation, com Correção 002B-01.**

**FASE 1 — FUNDAÇÃO SUPABASE, AUTH E TENANCY: ENCERRADA E PROMOVIDA.**

**FASE 2 — OPERATIONS, AUDIT, QUEUES E SEGURANÇA BASE: EM ANDAMENTO.**

Estado técnico incorporado: **000–002B**.

## 3. Última promoção

Rodada: **002B — Queue + Worker Foundation**

Classificação: **APROVADA COM RESSALVA NÃO BLOQUEANTE E PROMOVIDA**.

- PR #9
- head final auditado: `37961911ce0b8d40cc63519e1820b80562548289`
- merge: `c0af987ebe68cd0eafd80efef6a0e63e4c7d7042`
- CI do head: `32659126388` — success
- reauditoria final: `rodadas/gpt/REAUDITORIA_RODADA_002B_CORRECAO_01.md`

## 4. Baseline técnico após 002B

- migration history = **8**, última `20260823183513`;
- `pgmq` 1.5.1 instalado;
- fila durável `integration_jobs` criada e limpa após as provas;
- `pg_cron` não instalado;
- Edge Function `integration-worker` ACTIVE versão 3;
- `verify_jwt=false` + `withSupabase({ auth: 'secret' })`;
- `@supabase/server` pinado em 1.4.1 + `deno.lock`;
- 5 tabelas `public`;
- `operations`/`audit_events` server-only e sem fixtures;
- `auth.users` = 1 conta real;
- zero objetos `public` owned por `supabase_admin`;
- `pgmq_public` não exposto;
- Security Advisor sem novo ERROR/WARN: WARN conhecido `auth_leaked_password_protection` + INFOs esperados de tabelas internas sem policy;
- Performance Advisor com INFO herdado de `audit_events.actor_user_id` sem índice.

## 5. Rodada corrente autorizada

**002C — WEBHOOK INBOX + OBSERVABILIDADE BASE**

Status: **002C EXECUTADA — AGUARDANDO AUDITORIA GPT**.

Claude não aprova, não promove e não encerra a Fase 2.

Mandato executável:

`rodadas/gpt/RODADA_002C_WEBHOOK_INBOX_OBSERVABILIDADE.md`

Branch esperada:

`claude/rodada-002c-webhook-inbox-observabilidade`

Relatório entregue:

`rodadas/claude/RELATORIO_RODADA_002C_WEBHOOK_INBOX_OBSERVABILIDADE.md`

### Execução (2026-08-23)

Branch criada de `origin/main`. Baseline conferido antes de mutar e idêntico ao §4: 8 migrations, `pgmq` 1.5.1 com fila vazia, `pg_cron` ausente, 5 tabelas `public` todas com RLS, sem fixtures, zero objetos owned por `supabase_admin`. O Performance Advisor pré-migration confirmou o INFO de FK sem índice, condição exigida pelo mandato §5.4.

Entregue:

- migration única `20260823190756_create_webhook_events_inbox.sql` — histórico **8 → 9**, local == remoto;
- `public.webhook_events`: inbox durável server-only, RLS habilitado, **zero policies**, `anon`/`authenticated` sem privilégio, `service_role` com SELECT/INSERT/UPDATE e **sem DELETE**;
- dedupe único `(provider, dedupe_hash)`, com `dedupe_hash` restrito a 64 hex minúsculos; índices por status/recebimento e por organização/recebimento;
- `audit_events_actor_user_id_idx`, eliminando a dívida de performance herdada da 002A;
- `npm run typecheck:functions` como passo próprio da CI, fechando a ressalva da 002B;
- `SECURITY_MODEL.md` §15.1 — matriz de secrets por runtime, no canônico existente;
- `scripts/sql/observability-base.sql` — agregados read-only, sem payload/PII;
- `scripts/sql/webhook-inbox-002c-proof.sql` — prova transacional do delta.

Provas: **40/40, sem falhas**, em transação revertida com zero resíduo. Conforme a regra de eficiência §7, as 82 provas da 002B **não** foram repetidas: fila e worker não foram alterados e aparecem apenas como verificação catalogal (9 migrations, 6 tabelas todas com RLS, `pgmq` presente, `pgmq_public`=0, `pg_cron`=0, **6 funções SECURITY DEFINER — nenhuma nova**).

Gates: `typecheck:functions` local, `git diff --check`, lint e migration history. Suíte completa, typecheck da aplicação e build rodam uma única vez na CI final.

**Advisors:** Security sem novo ERROR/WARN — surgiu o terceiro INFO `rls_enabled_no_policy`, agora em `webhook_events`, previsto pelo §5.3. Performance: o INFO `unindexed_foreign_keys` **desapareceu**; surgiram dois INFO de `unused_index` em índices recém-criados sobre tabelas vazias, que por definição ainda não foram usados — não é regressão.

Nenhuma configuração remota alterada, nenhuma função `SECURITY DEFINER` nova, nenhum segredo novo, nenhum gate humano solicitado, nenhum endpoint de webhook criado.

A autorização do fundador em 2026-08-23 cobre **somente a 002C**. Nenhuma rodada posterior está autorizada.

## 6. Escopo autorizado da 002C

A 002C deve:

- criar `public.webhook_events` como inbox durável server-only;
- usar dedupe único por `(provider, dedupe_hash)`;
- habilitar RLS, zero policies de browser, `anon`/`authenticated` sem acesso;
- dar ao `service_role` somente SELECT/INSERT/UPDATE, sem DELETE;
- criar uma única migration, levando o histórico **8 → 9**;
- adicionar `audit_events_actor_user_id_idx` se o Advisor confirmar a dívida atual;
- adicionar `npm run typecheck:functions` como passo explícito da CI;
- atualizar `SECURITY_MODEL.md` com estratégia curta de secrets/runtime;
- criar observabilidade read-only por agregados, sem payload/PII;
- fazer prova transacional apenas do delta;
- deixar a Fase 2 candidata a encerramento pela auditoria GPT.

Não criar função `SECURITY DEFINER` nova.

## 7. Regra obrigatória de eficiência

A Correção 002B-01 ficou maior do que o delta justificava. Na 002C:

- **não repetir as 82 provas da 002B**;
- reutilizar a 002B promovida como baseline;
- testes locais somente do que mudou;
- nenhuma nova execução remota longa da fila/worker se eles não forem alterados;
- suíte completa **uma única vez na CI final**;
- preferir um único push final;
- relatório Claude alvo **<= 120 linhas**;
- uma falha pequena deve gerar prova/correção proporcional, não reinício ritual da rodada.

Rigor de segurança permanece; repetição sem ganho de evidência é que está proibida.

## 8. Decisões explícitas da 002C

### Sem cron agora

`pg_cron`/scheduler **não entra** nesta rodada. Ainda não existe job real de negócio periódico. Cron volta quando houver necessidade concreta, com frequência escolhida por custo/rate limit/frescor.

### Sem endpoint de webhook

A 002C cria somente a inbox persistente. Challenge, assinatura, raw body, endpoint Meta e processamento entram em fase posterior adequada.

### Ressalva CI da 002B

O comando `npm run typecheck:functions` já existe e funciona, mas ainda não está no workflow. A 002C deve incorporá-lo à CI e provar o passo no job final.

## 9. Fora de escopo imediato

Não autorizado:

- endpoint público de webhook;
- Meta app/OAuth/Instagram connection;
- assinatura/challenge Meta;
- lead fetch/CRM;
- cron/pg_cron;
- nova fila física;
- `public.integration_jobs`;
- conteúdo/publicação;
- Ads/aprovações financeiras;
- IA;
- UI;
- notificações;
- provider pago;
- novo segredo humano.

## 10. Riscos/dívidas abertas

1. `auth_leaked_password_protection` — hardening pré-produção.
2. Gmail SMTP/App Password — desenvolvimento; produção futura.
3. default ACL residual de `supabase_admin` aceito somente enquanto inerte.
4. `HISTORY_SUMMARY.md` ainda pode estar resumido até 002A; incorporar 002B junto do fechamento substantivo da 002C/Fase 2, sem housekeeping isolado.

## 11. Próxima ação autorizada

A Rodada 002C está **executada**. Cumprido pelo executor: preflight contra `origin/main`, branch nova, READ SET mínimo, delta 002C, migration única aplicada e provada, provas proporcionais sem repetir a 002B, push único, PR draft e relatório.

**A próxima ação é do GPT: auditar a 002C e decidir aprovação, promoção e se a Fase 2 pode ser encerrada.**

Claude não promove, não encerra a Fase 2 por conta própria e não inicia a próxima fase.
