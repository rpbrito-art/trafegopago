# ESTADO — Tráfego Pago

Atualizado: 2026-08-23

Este é o **estado operacional canônico da execução corrente**. Para histórico promovido, usar `docs/00-governanca/HISTORY_SUMMARY.md`; não reler relatórios antigos por padrão.

## 1. Repositório e ambiente autorizados

- GitHub: `rpbrito-art/trafegopago`
- Pasta local esperada: `C:\Users\rpbri\Documents\trafegopago`
- `rpbrito-art/business-weaver`: **fora de escopo**
- Supabase project ref: `cbnxdoxpyioxjwgjhbtq`

## 2. Estado incorporado à main

Promovido e disponível:

- Rodada 000 — Bootstrap Técnico;
- Rodada 001A — Baseline Supabase e Segurança;
- Rodada 001B — Auth Real;
- Rodada 001C — Organizations + Membership;
- Rodada 001D — Default privileges + Grants + RLS + Isolamento;
- Auth real por e-mail/senha com confirmação SSR, sessão/cookies e rota protegida;
- `public.organizations` e `public.organization_members` com constraints e RLS;
- `authenticated` com SELECT apenas nas duas tabelas de tenancy atuais;
- `anon` sem acesso às duas tabelas;
- `service_role` preservado por grants explícitos;
- policies SELECT não recursivas por membership própria ativa;
- escrita direta do browser fechada nesta fundação;
- default privileges futuros de tabelas/sequências de `postgres` em `public` endurecidos;
- default global de EXECUTE de funções futuras owned por `postgres` fechado;
- `ensure_rls` ativo;
- isolamento tenant provado com sessões reais 2 usuários × 2 organizações.

Detalhes históricos: `docs/00-governanca/HISTORY_SUMMARY.md`.

## 3. Estado corrente

**RODADA 001E — BOOTSTRAP DE NEGÓCIO**

Status: **EXECUTADA — AGUARDANDO AUDITORIA GPT**.

Mandato:

`rodadas/gpt/RODADA_001E_BUSINESS_BOOTSTRAP.md`

Branch entregue:

`claude/rodada-001e-business-bootstrap`

Relatório entregue:

`rodadas/claude/RELATORIO_RODADA_001E_BUSINESS_BOOTSTRAP.md`

Commit: resolver pelo head da branch no GitHub (push único, conforme
`PROJECT_PROMPT.md` §5.2).

Migration aplicada no project ref `cbnxdoxpyioxjwgjhbtq`:
`20260823111051_create_business_profiles_and_bootstrap.sql`.

Gates executados: `git diff --check`, lint, typecheck, 236 testes, build,
`supabase migration list` (5 local = 5 remoto), 24/24 provas reais de
banco/Data API, Security Advisor sem regressão, zero resíduo remoto.

Bloqueios: nenhum.

Nenhuma etapa posterior está autorizada. A 001F não foi aberta.

## 4. Objetivo autorizado da 001E

Construir o primeiro fluxo real de domínio após autenticação:

`conta autenticada → organização inicial → membership owner → business_profile → resumo em /conta`

A rodada deve:

- criar `public.business_profiles` conforme o modelo canônico mínimo;
- manter `anon` sem acesso;
- conceder a `authenticated` somente SELECT no profile, protegido por membership ACTIVE + organização ACTIVE;
- preservar escrita direta do browser fechada em `organizations`, `organization_members` e `business_profiles`;
- introduzir cliente Supabase privilegiado exclusivamente server-side usando `SUPABASE_SECRET_KEY`;
- usar função `SECURITY INVOKER` chamável somente por `service_role` para criar organização + owner membership + profile atomicamente;
- provar que `anon`/`authenticated` não conseguem invocar a RPC;
- impedir dupla submissão concorrente de criar dois tenants para o onboarding inicial;
- transformar `/conta` em onboarding/resumo mínimo, sem redesign amplo;
- preservar todos os invariantes e hardenings promovidos na 001D.

## 5. Fora de escopo da 001E

- recuperação/reset de senha;
- convite/gestão de membros;
- alteração de role/status/ownership;
- edição ampla de organização/profile;
- múltiplas organizações / tenant switcher;
- delete account/organization;
- limites financeiros;
- Meta/Instagram;
- Operations/Audit/Queues da Fase 2;
- IA.

## 6. Baseline e riscos conhecidos

1. `auth_leaked_password_protection` permanece desabilitado: hardening obrigatório antes de clientes reais/produção.
2. Brevo Free permanece SMTP provisório de desenvolvimento.
3. Default ACL residual de `supabase_admin` continua aceito somente enquanto `public` tiver zero objetos owned por essa role.
4. Funções futuras que precisem de execução exigem GRANT EXECUTE explícito.
5. A secret key Supabase nunca pode ir para `NEXT_PUBLIC_*`, browser, logs, respostas ou relatório.
6. `service_role` bypassa RLS; o caminho privilegiado desta rodada deve ser estreito, server-only e receber identidade exclusivamente do `getClaims()` verificado.
7. A Fase 1 ainda não será considerada encerrada após esta autorização; recovery e demais itens pendentes serão avaliados depois da auditoria da 001E.

## 7. Próxima ação autorizada

Rodada 001E executada e parada em:

`RODADA 001E — EXECUTADA — AGUARDANDO AUDITORIA GPT`

Próximo agente: **GPT**, auditando independentemente a branch
`claude/rodada-001e-business-bootstrap` — diff, CI, migration aplicada, grants,
policy de `business_profiles`, ACL da função de bootstrap, provas de isolamento
e de dupla submissão, ausência de secret em código cliente e resíduo remoto.

Claude Code não pode aprovar, promover nem iniciar 001F.

## 8. Continuidade

Descompasso temporário de numeração/documentação é normal e não exige housekeeping isolado.

Branch/relatório/commit não significam incorporação. O estado promovido continua 000–001D até auditoria e promoção formal da 001E.
