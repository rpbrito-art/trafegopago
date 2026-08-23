# AUDITORIA GPT — RODADA 002A — OPERATIONS + AUDIT FOUNDATION

Data: 2026-08-23
Resultado: **APROVADA COM RESSALVAS NÃO BLOQUEANTES E PROMOVIDA**
PR: #8
Head auditado: `dcafdf1e6204510b68756bbadd7028a847d250ca`
Merge: `920114d3e04ac1f32c284a6ff867e1c9e53d920b`

## 1. Escopo auditado

A auditoria verificou diretamente GitHub, CI e Supabase do projeto `cbnxdoxpyioxjwgjhbtq`.

Arquivos alterados no PR: somente `estado.md`, relatório 002A, migration 002A, contratos/tests de operations e scripts de prova. Nenhuma UI, Meta, Ads, IA, fila, worker, webhook ou Fase 2 posterior entrou no diff.

## 2. Banco e segurança

Confirmado no Supabase hospedado:

- migration history = **6**, última `20260823160000_create_operations_and_audit_events`;
- `public.operations` e `public.audit_events` existem e estão owned por `postgres`;
- RLS habilitado nas 5 tabelas `public`;
- zero policies nas duas novas tabelas, conforme desenho server-only autorizado;
- ACL real de `operations`: `service_role=arw`, sem DELETE;
- ACL real de `audit_events`: `service_role=ar`, sem UPDATE/DELETE;
- `anon` e `authenticated` sem privilégio direto nas novas tabelas;
- `service_role` é BYPASSRLS, portanto o append-only de `audit_events` depende corretamente da ACL, não de policy;
- `public` continua com zero objetos owned por `supabase_admin`;
- defaults da role `postgres` em `public` continuam endurecidos;
- `ensure_rls` continua habilitado;
- tabelas promovidas da Fase 1 preservaram grants/RLS/policies;
- `auth.users` = 1 conta real;
- `operations` = 0 e `audit_events` = 0 após cleanup.

A unicidade `(organization_id, operation_type, idempotency_key)` está efetivamente garantida por índice UNIQUE no banco. Para o contrato atual, isso é equivalente à exigência funcional de unicidade da rodada.

## 3. Contratos e testes

O módulo `src/lib/operations/contracts.ts` mantém:

- os 6 estados autorizados de operation;
- a taxonomia de erro do contrato canônico;
- política explícita de retry;
- default conservador para mutação externa sem proteção de idempotência;
- estado `UNKNOWN` sem retry automático.

O teste de paridade cobre os conjuntos fechados do banco e a política de retry.

CI do PR `32655237817`: **success**.

Job final confirmou:

- lint verde;
- typecheck verde;
- **21 arquivos / 437 testes / 0 falhas**;
- build verde.

O script funcional do executor registrou 42/42 provas, e a auditoria confirmou independentemente no catálogo remoto os pontos críticos que essas provas deveriam produzir: ACL, RLS, índices, constraints, owners, migrations e ausência de resíduo.

## 4. Advisors

Security Advisor final:

- `auth_leaked_password_protection` — WARN já conhecido;
- `rls_enabled_no_policy` em `operations` — INFO esperado;
- `rls_enabled_no_policy` em `audit_events` — INFO esperado.

Os dois INFO novos descrevem o próprio desenho autorizado de tabelas server-only e não são regressão de segurança.

Performance Advisor trouxe um INFO novo: FK `audit_events.actor_user_id` sem índice próprio. Não bloqueia esta fundação porque o mandato exigia apenas índices de organização/data e correlação. Registrar como otimização futura quando o volume de auditoria justificar ou antes de fluxos de exclusão em escala.

## 5. Desvio de migration durante a execução

O executor aplicou inicialmente uma versão ainda não promovida da migration com dois CHECKs temporais extras, detectou falha real por skew de relógio, removeu as tabelas vazias, marcou a migration como reverted no histórico e reaplicou a versão corrigida.

A documentação oficial do Supabase confirma que `migration repair` altera somente a tabela de histórico e recomenda que mudanças remotas de schema sejam feitas por migrations. A execução incluiu um `drop table` direto para desfazer a tentativa intermediária, portanto houve um desvio do fluxo ideal de migration-only.

A auditoria **não bloqueia** por esse incidente porque:

- a migration ainda não estava commitada/promovida;
- as tabelas estavam vazias e sem dependentes;
- nenhuma migration 000–001F foi alterada;
- o histórico final está coerente em 6 migrations;
- o schema remoto final coincide com a migration versionada auditada nos objetos relevantes;
- não há drift material ou resíduo detectável.

Regra para próximas rodadas: isso não vira procedimento normal. Preferir testar migration local/preview antes do remoto. Se uma migration remota já aplicada precisar ser reescrita de forma que exija DDL ad hoc, o executor deve tratar como incidente e parar para auditoria/decisão quando houver risco de drift ou dados.

## 6. Ressalvas não bloqueantes

1. `scripts/sql/operations-audit-002a-catalog.sql` manteve um comentário antigo dizendo esperar CHECK temporal que foi removido da migration final. O comentário será corrigido no fechamento documental; não altera prova nem schema.
2. O `estado.md` da branch ainda continha no fechamento uma frase residual dizendo que 002A estava “autorizada, não executada”. O estado canônico será substituído no fechamento da promoção.
3. `updated_at` de `operations` não é automático. A decisão pertence ao worker futuro e não foi antecipada nesta rodada.
4. `approval_id` permanece deliberadamente fora da 002A e entra somente com a fundação financeira posterior.
5. FK `audit_events.actor_user_id` sem índice próprio é otimização futura, não falha funcional atual.

## 7. Decisão

**002A APROVADA E PROMOVIDA.**

A Rodada 002A passa a integrar o estado incorporado do projeto.

A Fase 2 fica **em andamento**, mas nenhuma 002B ou rodada posterior é autorizada automaticamente por esta promoção.
