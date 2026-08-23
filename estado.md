# ESTADO — Tráfego Pago

Atualizado: 2026-08-23

Este é o **estado operacional canônico**. Estado incorporado = `main` + este arquivo. Histórico promovido: `docs/00-governanca/HISTORY_SUMMARY.md`.

## 1. Repositório e ambiente

- GitHub: `rpbrito-art/trafegopago`
- Supabase project ref: `cbnxdoxpyioxjwgjhbtq`
- pasta local esperada: `C:\Users\rpbri\Documents\trafegopago`
- `rpbrito-art/business-weaver`: fora de escopo

## 2. Estado incorporado

Promovidas:

- Rodada 000 — Bootstrap Técnico;
- 001A — Baseline Supabase e Segurança;
- 001B — Auth Real;
- 001C — Organizations + Membership;
- 001D — Grants + RLS + Isolamento;
- 001E — Bootstrap de Negócio;
- 001F — Recovery de Acesso + Fechamento da Fase 1, com Correções 001F-01 e 001F-02;
- **002A — Operations + Audit Foundation**.

**FASE 1 — FUNDAÇÃO SUPABASE, AUTH E TENANCY: ENCERRADA E PROMOVIDA.**

**FASE 2 — OPERATIONS, AUDIT, QUEUES E SEGURANÇA BASE: EM ANDAMENTO.**

O estado técnico incorporado é agora **000–002A**.

## 3. Última promoção

Rodada: **002A — Operations + Audit Foundation**

Classificação: **APROVADA COM RESSALVAS NÃO BLOQUEANTES E PROMOVIDA**.

PR #8.

Head auditado: `dcafdf1e6204510b68756bbadd7028a847d250ca`

Merge: `920114d3e04ac1f32c284a6ff867e1c9e53d920b`

CI auditada: `32655237817` — success.

Auditoria:

`rodadas/gpt/AUDITORIA_RODADA_002A_OPERATIONS_AUDIT_FOUNDATION.md`

Relatório:

`rodadas/claude/RELATORIO_RODADA_002A_OPERATIONS_AUDIT_FOUNDATION.md`

## 4. Fundação efetivamente disponível após 002A

Além da Fase 1 já promovida:

- `public.operations` como memória persistente de operações idempotentes;
- unicidade real por `(organization_id, operation_type, idempotency_key)`;
- estados controlados: `PENDING|CLAIMED|SUCCEEDED|FAILED|ACTION_REQUIRED|UNKNOWN`;
- taxonomia de erro e política de retry versionadas em TypeScript;
- `correlation_id` como base de rastreabilidade técnica;
- `public.audit_events` como histórico append-oriented;
- browser (`anon`/`authenticated`) sem acesso direto às duas novas tabelas;
- `service_role` com privilégio mínimo: `operations` = SELECT/INSERT/UPDATE; `audit_events` = SELECT/INSERT;
- RLS habilitado e zero policies nas novas tabelas, deliberadamente server-only;
- nenhuma fila, worker, webhook, Meta, Ads, IA ou UI nova iniciada.

## 5. Provas finais relevantes

Auditoria independente confirmou:

- migration history remoto: **6**, última `20260823160000`;
- 5 tabelas `public`, todas com RLS;
- `operations` e `audit_events` owned por `postgres`;
- zero objetos `public` owned por `supabase_admin`;
- defaults endurecidos da role `postgres` preservados;
- `ensure_rls` ativo;
- baseline de grants/RLS das tabelas da Fase 1 preservado;
- `auth.users`: 1 conta real;
- `operations`: 0 registros residuais;
- `audit_events`: 0 registros residuais;
- Security Advisor: somente o WARN conhecido `auth_leaked_password_protection` + dois INFO esperados `rls_enabled_no_policy` nas tabelas server-only;
- CI: lint, typecheck, **437 testes / 0 falhas**, build verde.

## 6. Ressalvas e dívidas abertas

1. Houve um incidente de execução com uma primeira versão não promovida da migration 002A: o executor desfez tabelas vazias, reparou o histórico da migration e reaplicou a versão corrigida. O estado final ficou coerente e sem drift material detectável, por isso não bloqueou promoção. **Não usar esse caminho como rotina em migrations futuras; preferir teste local/preview antes do remoto.**
2. `audit_events.actor_user_id` não possui índice próprio; o Performance Advisor marcou INFO. Otimização futura, especialmente antes de exclusões em escala.
3. `operations.updated_at` não é mantido automaticamente; a decisão de trigger versus disciplina do worker pertence à rodada que criar o worker.
4. `approval_id` permanece fora de `operations` até a fundação financeira posterior.
5. `auth_leaked_password_protection` continua hardening obrigatório antes de clientes reais/produção.
6. Gmail SMTP é apenas desenvolvimento; SMTP/domínio de produção permanece futuro.
7. App Password do Gmail permanece secreta/ativa enquanto esse SMTP for necessário.
8. Default ACL residual de `supabase_admin` continua aceito apenas enquanto não houver objetos `public` owned por essa role.
9. Funções futuras exigem GRANT EXECUTE explícito.

## 7. Próxima ação autorizada

**Não há nova rodada substantiva autorizada neste momento.**

A 002A está promovida. GPT deve agora planejar a próxima sub-rodada da Fase 2 e apresentar ao fundador um resumo em linguagem simples **antes** de qualquer `/proxima`.

O próximo bloco da Fase 2 deve avançar apenas uma dependência por vez — provavelmente fila/job/worker base ou webhook inbox, conforme refinamento do mandato e contratos canônicos — sem antecipar Meta, Ads ou IA.

Nenhuma 002B foi publicada por esta promoção.

## 8. Continuidade

- `docs/00-governanca/ACTIVE_DOCS.md` contém o working set atual;
- `docs/00-governanca/HISTORY_SUMMARY.md` resume o estado promovido 000–002A;
- relatório/mandato 002A passam a ser histórico/evidência após esta promoção;
- a Fase 2 está em andamento, mas somente sub-rodadas formalmente autorizadas podem ser executadas.
