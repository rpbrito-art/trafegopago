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
- 001F — Recovery de Acesso + Fechamento da Fase 1, com Correções 001F-01 e 001F-02.

**FASE 1 — FUNDAÇÃO SUPABASE, AUTH E TENANCY: ENCERRADA E PROMOVIDA.**

O estado técnico incorporado continua **000–001F** até que uma nova rodada seja auditada e promovida.

## 3. Última promoção

Rodada: **001F — Recovery de Acesso + Fechamento da Fase 1**

Classificação: **APROVADA E PROMOVIDA**.

PR #7.

Head auditado: `171516616db8ec11c80f6d9176b2b92101fe1189`

Merge: `7f2a1b9631ce134ec9f39585fa2defa3185fcd05`

CI final do head: `32649608889` — success.

Auditoria: `rodadas/gpt/AUDITORIA_RODADA_001F_RECOVERY_FECHAMENTO_FASE1.md`

## 4. Rodada corrente autorizada

**RODADA 002A — OPERATIONS + AUDIT FOUNDATION**

Status: **002A EXECUTADA — AGUARDANDO AUDITORIA GPT**.

Claude não aprova, não promove e não inicia 002B.

Mandato:

`rodadas/gpt/RODADA_002A_OPERATIONS_AUDIT_FOUNDATION.md`

Branch esperada:

`claude/rodada-002a-operations-audit-foundation`

Relatório entregue:

`rodadas/claude/RELATORIO_RODADA_002A_OPERATIONS_AUDIT_FOUNDATION.md`

### Execução (2026-08-23)

Branch criada a partir de `origin/main`. Baseline confirmado antes de mutar: 5 migrations, última `20260823111051`, 3 tabelas em `public` todas com RLS, zero objetos owned por `supabase_admin`, 1 conta real, zero fixture.

Entregue:

- migration única `20260823160000_create_operations_and_audit_events.sql` — histórico remoto **5 → 6**;
- `public.operations` e `public.audit_events` tenant-scoped, com CHECKs, FKs, índices e o único de idempotência `(organization_id, operation_type, idempotency_key)`;
- grants de privilégio mínimo: `operations` = `service_role` SELECT/INSERT/UPDATE (sem DELETE); `audit_events` = SELECT/INSERT apenas;
- RLS habilitado e **zero policies** nas duas: são infraestrutura interna server-only, sem acesso de browser;
- `src/lib/operations/contracts.ts` — statuses, taxonomia de erro e política de retry, com teste de paridade contra os CHECKs do banco;
- `scripts/operations-audit-002a.mjs` (prova funcional) e `scripts/sql/operations-audit-002a-catalog.sql` (provas estruturais versionadas).

Provas: **42/42** no script funcional, incluindo 6 inserts concorrentes com a mesma chave em que exatamente um sobrevive, e recusa de UPDATE/DELETE em `audit_events` mesmo para `service_role` — que é BYPASSRLS, de modo que o append-only se apoia na ACL e não em policy. Cleanup deixou zero resíduo.

Gates: lint (0 warnings), typecheck, `vitest run` (21 arquivos / **437** testes, eram 372) e build — verdes.

**Advisor:** o WARN de baseline `auth_leaked_password_protection` permanece. Surgiram dois lints novos de nível **INFO** (`rls_enabled_no_policy` em `operations` e `audit_events`), que descrevem o design autorizado — RLS sem policy porque nenhuma role de browser deve alcançar essas tabelas. Não são ERROR nem WARN; o critério §5.18 do mandato está atendido.

**Desvio registrado:** a primeira aplicação da migration incluía dois CHECK de coerência temporal (`updated_at >= created_at` e equivalente para `completed_at`) que eu acrescentei e o mandato não pedia. A prova os reprovou: `created_at` vem de `now()` no servidor e `updated_at` de quem chama, e o skew de relógio (~0,6 s neste projeto) quebrava o update imediato — exatamente o caminho do worker futuro. Com a migration ainda não commitada nem promovida e as tabelas vazias, corrigi na origem: `db query` para remover as tabelas, `migration repair --status reverted` (mecanismo oficial do CLI) e `db push` da versão corrigida. Houve, portanto, manipulação do histórico de migration remoto, sobre migration não promovida. Detalhes na §4 do relatório.

Nenhuma configuração remota alterada, nenhum segredo novo, nenhum gate humano solicitado.

A autorização do fundador em 2026-08-23 inicia a primeira rodada substantiva da Fase 2. **Isso não significa que a Fase 2 inteira está executada ou promovida.**

## 5. Objetivo da 002A

Criar apenas a fundação interna para:

- registrar operações que não podem ser executadas duas vezes por acidente (`operations`);
- registrar histórico de ações sensíveis sem reescrita pelo caminho normal da aplicação (`audit_events`);
- padronizar identificadores de correlação e categorias de erro/retry que serão usados por integrações posteriores.

A rodada deve criar **uma única migration**, passando o histórico remoto de 5 para 6 migrations se aprovada tecnicamente na execução.

## 6. Corte de escopo

Autorizado agora:

- `public.operations`;
- `public.audit_events`;
- grants/RLS internos de privilégio mínimo;
- contratos TypeScript mínimos de status/error/retry;
- script de prova e gates de CI;
- migration da própria 002A.

**Não autorizado:**

- fila real/provider de queue;
- workers/Edge Functions;
- cron;
- `webhook_events` ou endpoint de webhook;
- Meta/Instagram/OAuth;
- Ads/campanhas/aprovações financeiras;
- IA;
- UI nova;
- Fase 2 posterior à 002A.

Nenhum gate humano é esperado. Claude não deve pedir ao fundador configuração, segredo ou operação manual para cumprir esta rodada.

## 7. Baseline que deve ser preservado

Antes da 002A:

- 5 migrations, última `20260823111051`;
- `auth.users`: 1 conta real e zero fixture residual;
- Auth/recovery 001F promovidos;
- `organizations`, `organization_members` e `business_profiles` com grants/RLS/isolamento promovidos;
- `public` com zero objetos owned por `supabase_admin`;
- default privileges endurecidos e `ensure_rls` preservados;
- Security Advisor somente com `auth_leaked_password_protection` como WARN conhecido;
- `SUPABASE_SECRET_KEY` somente server-side;
- Gmail SMTP permanece infraestrutura provisória de desenvolvimento e não deve ser tocado nesta rodada.

## 8. Próxima ação autorizada

A Rodada 002A está **executada**. Cumprido pelo executor: preflight, branch a partir da `main`, READ SET, escopo 002A, migration aplicada e provada, gates e CI, PR draft e relatório.

**A próxima ação é do GPT: auditar a 002A e decidir aprovação, correção ou promoção.**

Claude não promove, não inicia 002B e não decide o restante da Fase 2.

## 9. Riscos e dívidas abertas

1. `auth_leaked_password_protection` continua hardening pré-produção.
2. Gmail SMTP é apenas desenvolvimento; SMTP/domínio de produção permanece futuro.
3. App Password do Gmail permanece secreta/ativa enquanto esse SMTP for necessário.
4. Default ACL residual de `supabase_admin` continua aceito apenas enquanto não houver objetos `public` owned por essa role.
5. Funções futuras exigem GRANT EXECUTE explícito.
6. Gestão avançada de membros, edição ampla, multi-org switcher e exclusão continuam posteriores.
7. Rate limiting/observabilidade próprios continuam futuros conforme endpoint/risco.

## 10. Continuidade

- `docs/00-governanca/ACTIVE_DOCS.md` contém o working set da 002A;
- `docs/00-governanca/HISTORY_SUMMARY.md` resume somente o estado promovido 000–001F;
- 002A está **autorizada**, não executada, auditada ou promovida;
- nenhuma Meta, Ads, IA, fila ou webhook foi iniciado por esta autorização.