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
- auditoria bloqueante original: `rodadas/gpt/AUDITORIA_RODADA_002B_QUEUE_WORKER_FOUNDATION.md`
- correção: `rodadas/gpt/CORRECAO_RODADA_002B_01_CONTRATO_POISON_EDGE_GATE.md`
- reauditoria final: `rodadas/gpt/REAUDITORIA_RODADA_002B_CORRECAO_01.md`

## 4. Baseline técnico após 002B

Supabase remoto confirmado após a promoção:

- migration history = **8**, última `20260823183513`;
- `pgmq` 1.5.1 instalado;
- fila durável `integration_jobs` criada;
- fila ativa = 0 mensagens; arquivo = 0 mensagens após cleanup;
- `pg_cron` não instalado;
- `operations` e `audit_events` sem fixtures;
- `auth.users` = 1 conta real;
- 5 tabelas `public`;
- zero objetos `public` owned por `supabase_admin`;
- `pgmq_public` não exposto;
- Edge Function `integration-worker` ACTIVE, versão 3;
- `verify_jwt=false` + `withSupabase({ auth: 'secret' })`;
- dependência `@supabase/server` pinada em 1.4.1 + `deno.lock`;
- poison interno usa `last_error_class = null`, sem taxonomia externa falsa;
- validador de job exige tipos JSON estritos;
- 82/82 provas remotas do executor passaram;
- 510 testes no head final + lint/typecheck/build verdes.

Advisors:

- Security: WARN conhecido `auth_leaked_password_protection` + dois INFO `rls_enabled_no_policy` em `operations`/`audit_events`; nenhum ERROR/WARN novo;
- Performance: INFO herdado `audit_events.actor_user_id` sem índice.

## 5. Ressalva aberta da 002B

O comando reprodutível `npm run typecheck:functions` existe e executa `deno check`, mas **o workflow atual da CI ainda não chama esse comando**.

Isso não bloqueou a promoção da função atual, já validada/deployada/provada, mas deve ser corrigido **na próxima rodada substantiva antes de ampliar Edge Functions**.

Não criar uma rodada isolada só para isso.

## 6. Próxima etapa planejada

**002C — Webhook Inbox + Observabilidade Base**

Status: **PLANEJADA — NÃO AUTORIZADA**.

Plano:

`rodadas/gpt/PLANO_RODADA_002C_WEBHOOK_INBOX_OBSERVABILIDADE.md`

Objetivo proposto:

- criar `webhook_events` server-only com dedupe;
- fechar a ressalva da CI da 002B;
- formalizar estratégia de secrets/runtime;
- estabelecer observabilidade mínima sem UI/provider externo;
- avaliar encerramento da Fase 2 na própria auditoria da 002C.

Decisão planejada: **não criar cron agora**, porque ainda não existe job de negócio periódico. Cron retorna quando houver trabalho real que exija agendamento.

## 7. Eficiência para a próxima rodada

A execução da Correção 002B-01 foi mais extensa do que o tamanho conceitual da correção justificava.

Na 002C e em correções futuras, aplicar por padrão:

- prova por **delta**;
- reutilizar evidência já auditada como baseline;
- não repetir E2E remoto longo de capacidade não alterada;
- testes locais apenas novos/relevantes;
- suíte completa em **uma única CI final**;
- relatório Claude alvo <= 120 linhas na 002C;
- não devolver ao Claude uma nova microcorreção quando o GPT puder classificar com segurança uma divergência não funcional como ressalva/debt.

Rigor de segurança e correção permanece; o que reduz é repetição sem ganho de evidência.

## 8. Fora de escopo imediato

Não autorizado agora:

- 002C executável;
- cron/pg_cron;
- endpoint público de webhook;
- Meta/Instagram/OAuth;
- publicação/conteúdo;
- Ads/aprovações;
- IA;
- UI;
- notificações;
- provider pago;
- novo segredo humano.

## 9. Riscos e dívidas abertas

1. `typecheck:functions` ainda fora do workflow CI — fechar na próxima rodada substantiva.
2. `audit_events.actor_user_id` sem índice próprio — INFO de performance; candidato a fechamento na 002C.
3. `auth_leaked_password_protection` — hardening pré-produção.
4. Gmail SMTP é desenvolvimento; SMTP/domínio de produção continuam futuros.
5. App Password do Gmail permanece secreta/ativa enquanto necessária.
6. Default ACL residual de `supabase_admin` continua aceito somente enquanto não houver objetos `public` owned por essa role.

## 10. Próxima ação autorizada

**Nenhuma implementação nova está autorizada.**

O fundador deve avaliar o plano da 002C.

`/proxima` deve **parar**, porque não existe mandato executável 002C.

Se o fundador autorizar explicitamente a 002C, o GPT deve transformar/refinar o plano em mandato, atualizar `ACTIVE_DOCS.md`/`estado.md` e só então liberar `/proxima`.

## 11. Continuidade documental

- `docs/00-governanca/HISTORY_SUMMARY.md` pode permanecer temporariamente até 002A e incorporar 002B junto da próxima etapa substantiva, sem criar housekeeping isolado;
- `ACTIVE_DOCS.md` deve refletir 002B promovida e 002C apenas planejada;
- nenhuma 002C está autorizada.