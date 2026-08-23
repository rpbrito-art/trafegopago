# HISTORY SUMMARY — TRÁFEGO PAGO

Atualizado: 2026-08-23

Resume somente estado **auditado e promovido** e decisões de governança duradouras. Evidência completa permanece em `rodadas/`/Git e não deve ser relida por padrão.

## Fundação documental

- produto: Instagram + Meta Ads + aprendizagem de aquisição, com mídia paga opcional;
- arquitetura: Next.js/TypeScript + Supabase + APIs oficiais Meta + AI Router multi-provedor;
- invariantes: tenancy/RLS, aprovação humana de gasto, IA sem autonomia financeira, cálculos determinísticos fora de LLM;
- `GROWTH_INTELLIGENCE_CANONICAL.md` tornou jornadas configuráveis, separou conteúdo/criativo/anúncio, removeu quantidade fixa de oportunidades e definiu personas como hipóteses baseadas em evidência.

## 000 — Bootstrap Técnico

Next.js 16/React 19/TypeScript, App Router, Vitest, lint/typecheck/build, CI e clientes Supabase base.

Auditoria: `rodadas/gpt/AUDITORIA_RODADA_000_BOOTSTRAP_TECNICO.md` — PR #1 — merge `9f0f6aaa205fe5b774faab92c34e8373e4ef7d6c`.

## 001A — Baseline Supabase e Segurança

Hardening de `rls_auto_enable`, `ensure_rls`, privilégios mínimos e prova transacional.

PR #2 — merge `fb9bc62e6cf25e03e39255bff7042e330a80e1d6`.

## 001B — Auth Real

Cadastro/login/logout reais, confirmação SSR por e-mail, cookies, rota protegida e open-redirect protection.

PR #3 — merge `4819875007784f9bc016abd57202fe1fe9a7063b`.

## 001C — Organizations + Membership

`organizations` + `organization_members`, constraints, RLS habilitado e base tenant.

PR #4 — merge `a6b2e912f8d54005d1decf69cb4e4bf8335d31ec`.

## 001D — Grants + RLS + Isolamento

Defaults opt-in, grants mínimos, policies por membership ACTIVE, zero escrita direta e isolamento real 2 usuários × 2 organizações.

Decisão persistente: default ACL residual de `supabase_admin` só é aceito enquanto nenhum objeto `public` pertencer a essa role.

PR #5 — merge `178c2aa0e4ada91ae2bae73d2ff97c21f27c0222`.

## 001E — Bootstrap de Negócio

`business_profiles`, bootstrap atômico organization + owner membership + profile, RPC server-only e prevenção de dupla submissão.

PR #6 — merge `7cf7786320f49c1d5b3f486f4ba8ca4919fa2ffd`.

## 001F — Recovery + Fechamento da Fase 1

Recovery real por e-mail, guard por claims verificadas, resposta anti-enumeração, logout global após troca, refresh anterior revogado e E2E real. Gmail SMTP permanece provisório de desenvolvimento.

Decisão persistente: novos métodos Auth exigem reabrir o guard de recovery.

PR #7 — merge `7f2a1b9631ce134ec9f39585fa2defa3185fcd05`.

### Fase 1 encerrada

Auth/recovery, organizations/memberships, RLS/isolamento, business_profiles e bootstrap server-only estão promovidos.

## 002A — Operations + Audit Foundation

Promovido:

- `operations` idempotentes por organization/type/key;
- estados/correlation ids;
- taxonomia de erro/retry;
- `audit_events` append-oriented;
- tabelas internas server-only com grants mínimos;
- migration history 5 → 6.

Dívidas: `audit_events.actor_user_id` sem índice; `approval_id` reservado para fundação financeira posterior.

Incidente histórico: versão não promovida da migration foi corrigida/reaplicada; `migration repair` não vira padrão.

PR #8 — merge `920114d3e04ac1f32c284a6ff867e1c9e53d920b`.

## 002B — Queue + Worker Foundation

Promovida com Correção 002B-01:

- Supabase Queues/PGMQ 1.5.1;
- fila durável `integration_jobs`;
- wrappers PGMQ estreitos server-only;
- claim/conclusão/falha de `operations`;
- `integration-worker` Edge Function com autenticação por secret key;
- redelivery, claim concorrente e idempotência provados;
- poison interno sem falsa taxonomia externa;
- validador SQL estrito alinhado ao contrato TypeScript;
- `@supabase/server` pinado + `deno.lock`;
- migration history 6 → 8;
- fila/fixtures limpas após provas.

Ressalva incorporada à 002C: `npm run typecheck:functions` existia, mas ainda não estava encadeado à CI.

Auditoria final: `rodadas/gpt/REAUDITORIA_RODADA_002B_CORRECAO_01.md` — PR #9 — merge `c0af987ebe68cd0eafd80efef6a0e63e4c7d7042`.

## Governança de eficiência — decisão de 2026-08-23

Auditoria do método identificou excesso de contexto e prova repetida: `/proxima`, prompt canônico, estado, ACTIVE_DOCS e mandatos repetiam regras; correções pequenas repetiam regressões promovidas.

Contrato permanente adotado:

- Claude Code recebe regras curtas automaticamente em `CLAUDE.md`;
- bootstrap normal do executor = `estado.md + mandato + READ SET obrigatório`;
- `PROJECT_PROMPT`, `ACTIVE_DOCS`, `HISTORY_SUMMARY` e evidência antiga não são leitura ritual do Claude;
- READ SET normal: até 5 documentos além de estado+mandato;
- estado promovido é baseline;
- prova por delta + raio de impacto;
- correção pequena não reprova toda a rodada anterior sem risco concreto;
- testes locais somente novos/afetados;
- suíte completa uma única vez na CI final por padrão;
- relatório normal ≤100 linhas/~10 KB; microcorreção ≤60 linhas/~6 KB;
- um único handoff/push final quando possível.

A redução é de repetição, não de rigor de segurança.

## Estado da Fase 2

**EM ANDAMENTO.**

002A e 002B estão promovidas. Restam `webhook_events`, observabilidade mínima e fechamento da estratégia de runtime/secrets antes de a fase poder ser auditada como concluída.

## Pendências transversais

- leaked-password protection antes de produção;
- SMTP/domínio de produção;
- default ACL residual de `supabase_admin` enquanto inerte;
- gestão avançada de membros/edição/multi-org/exclusão posteriores;
- rate limiting conforme risco;
- futuras fases de produto devem ser revalidadas contra `GROWTH_INTELLIGENCE_CANONICAL.md`.
