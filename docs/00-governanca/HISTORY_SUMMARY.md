# HISTORY SUMMARY — TRÁFEGO PAGO

Atualizado: 2026-08-23

Este arquivo resume somente estado **auditado e promovido**. Evidências originais permanecem em `rodadas/` e no Git; não devem ser relidas por padrão.

## Fundação documental

- MVP inicial definido para Instagram + Meta Ads + aprendizagem de aquisição;
- arquitetura base: Next.js/TypeScript + Supabase + APIs oficiais Meta + AI Router multi-provedor;
- tenancy por organização, RLS, aprovação humana para gasto, IA sem autonomia financeira e cálculos determinísticos fora de LLM;
- em 2026-08-23, `GROWTH_INTELLIGENCE_CANONICAL.md` generalizou o produto: mídia paga opcional, jornadas configuráveis, conteúdo/criativo/anúncio distintos, oportunidades sem quantidade fixa, personas como hipótese baseada em evidência e Lei da Simplicidade Guiada.

## Rodada 000 — Bootstrap Técnico

Promovido: Next.js 16 + React 19 + TypeScript, App Router, lint/typecheck/Vitest/build, GitHub Actions CI e clientes Supabase browser/server sem antecipar schema de domínio.

Auditoria: `rodadas/gpt/AUDITORIA_RODADA_000_BOOTSTRAP_TECNICO.md` — PR #1 — merge `9f0f6aaa205fe5b774faab92c34e8373e4ef7d6c`.

## Rodada 001A — Baseline Supabase e Segurança

Promovido: hardening de `rls_auto_enable`, `ensure_rls`, privilégios mínimos e prova transacional sem resíduo.

Auditoria: `rodadas/gpt/AUDITORIA_RODADA_001A_BASELINE_SUPABASE_SEGURANCA.md` — PR #2 — merge `fb9bc62e6cf25e03e39255bff7042e330a80e1d6`.

## Rodada 001B — Auth Real

Promovido: auth real por e-mail/senha, confirmação SSR com `token_hash`, sessão em cookies, rota protegida, proteção contra open redirect e E2E real de cadastro/login/logout.

Auditoria: `rodadas/gpt/AUDITORIA_RODADA_001B_AUTH_REAL.md` — PR #3 — merge `4819875007784f9bc016abd57202fe1fe9a7063b`.

## Rodada 001C — Organizations + Membership

Promovido: `organizations` e `organization_members`, constraints, RLS habilitado e base para autorização tenant.

Auditoria: `rodadas/gpt/AUDITORIA_RODADA_001C_ORGANIZATIONS_MEMBERSHIP.md` — PR #4 — merge `a6b2e912f8d54005d1decf69cb4e4bf8335d31ec`.

## Rodada 001D — Grants + RLS + Isolamento

Promovido após Correções 001D-01/02: defaults opt-in, grants mínimos, policies de leitura por membership ACTIVE, zero escrita direta, default global de EXECUTE fechado e prova real 2 usuários × 2 organizações com isolamento 21/21.

Decisão persistente: default ACL residual de `supabase_admin` é aceito apenas enquanto nenhum objeto `public` pertencer a essa role.

Auditoria: `rodadas/gpt/AUDITORIA_RODADA_001D_RLS_TENANCY_ISOLAMENTO.md` — PR #5 — merge `178c2aa0e4ada91ae2bae73d2ff97c21f27c0222`.

## Rodada 001E — Bootstrap de Negócio

Promovido: `business_profiles`, bootstrap atômico organization + owner membership + profile, RPC `SECURITY INVOKER` só para `service_role`, cliente privilegiado server-only, prevenção de dupla submissão e estados explícitos de tenancy em `/conta`.

Auditoria: `rodadas/gpt/AUDITORIA_RODADA_001E_BUSINESS_BOOTSTRAP.md` — PR #6 — merge `7cf7786320f49c1d5b3f486f4ba8ca4919fa2ffd`.

## Rodada 001F — Recovery de Acesso + Fechamento da Fase 1

Promovido com Correções 001F-01 e 001F-02:

- fluxo `entrar → esqueci senha → e-mail real → confirmação SSR → nova senha → login`;
- template recovery versionado/hosted com `type=recovery` e sem `next` arbitrário;
- provider real emite `amr=otp`; guard autorizado usa claims verificadas, `sub`/`email`, `otp|recovery` recente ≤15 min, skew futuro ≤60 s e ausência de `password`;
- `amr` estruturalmente malformado falha fechado;
- resposta pública do pedido de recovery é idêntica para sucesso, inexistente, rate limit e erro do provider após validação sintática;
- logout global explícito após troca; refresh token anterior recusado;
- E2E real **40/40** com e-mail real; suíte final **372 testes**;
- zero migration/DDL; migration history permanece em 5;
- `auth.users` volta a 1 conta real, sem fixture residual;
- Gmail SMTP substituiu Brevo apenas como infraestrutura provisória de desenvolvimento;
- MVP/roadmap harmonizados proporcionalmente com Growth Intelligence.

Decisões persistentes:

- habilitar magic link, phone OTP, invite ou social login exige reabrir o guard de recovery;
- access token já emitido pode sobreviver até `exp`; refresh revogado não pode renovar;
- falha do provider no pedido de recovery permanece pública e deliberadamente neutra; observabilidade futura deve ser server-side;
- a App Password do Gmail permanece necessária enquanto Gmail SMTP for o transporte de recovery em desenvolvimento; revogar/rotacionar quando esse SMTP for substituído ou deixar de ser necessário.

Auditoria: `rodadas/gpt/AUDITORIA_RODADA_001F_RECOVERY_FECHAMENTO_FASE1.md` — PR #7 — merge `7f2a1b9631ce134ec9f39585fa2defa3185fcd05`.

## Fechamento da Fase 1

Com a promoção da 001F, a **Fase 1 — Fundação Supabase, Auth e Tenancy está encerrada**.

A fundação incorporada contém Auth real, recovery real, organizations/memberships, grants/RLS/isolamento, business_profiles e bootstrap atômico server-only.

A Fase 2 existe no roadmap, mas não foi autorizada automaticamente pelo fechamento.

## Pendências transversais abertas

- `auth_leaked_password_protection` antes de clientes reais/produção;
- SMTP/domínio de produção; enquanto isso, Gmail SMTP permanece provisório de desenvolvimento;
- default ACL residual de `supabase_admin` monitorado enquanto inerte;
- funções futuras exigem GRANT EXECUTE explícito;
- ambiente de deploy deverá receber `SUPABASE_SECRET_KEY` quando houver deploy;
- gestão avançada de membros, edição de negócio, multi-org switcher e exclusão continuam posteriores;
- rate limiting/observabilidade próprios permanecem futuros conforme risco;
- futuras fases de produto devem ser revalidadas contra `GROWTH_INTELLIGENCE_CANONICAL.md`.

## Estado atual

Rodadas 000–001F estão promovidas. Fase 1 encerrada. Não há mandato executável novo.

Antes de uma nova rodada de produto, aplicar a leitura integral obrigatória de `GROWTH_INTELLIGENCE_CANONICAL.md`.