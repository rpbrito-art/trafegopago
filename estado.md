# ESTADO — Tráfego Pago

Atualizado: 2026-08-22

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
- Next.js 16.3.2 + React 19.2.8 + TypeScript;
- App Router;
- lint, typecheck, Vitest, build e GitHub Actions CI;
- clientes Supabase browser/server com `@supabase/ssr`;
- migration `20260822212544_harden_rls_auto_enable_privileges.sql` aplicada/versionada;
- `ensure_rls` ativo;
- autenticação real por e-mail/senha;
- confirmação SSR via `/auth/confirm` + `token_hash` + `verifyOtp`;
- sessão SSR/cookies, `proxy.ts`, guard server-side com `getClaims()`;
- fluxo real cadastro → confirmação → sessão → logout → login validado;
- SMTP Brevo Free apenas como infraestrutura provisória de desenvolvimento;
- schema `public` ainda sem tabelas de domínio antes da execução da 001C;
- `/proxima`, `.gitattributes` e método documental enxuto versionados.

Detalhes: `docs/00-governanca/HISTORY_SUMMARY.md`.

## 3. Estado corrente

**RODADA 001C — ORGANIZATIONS + MEMBERSHIP**

Status: **AUTORIZADA — AGUARDANDO EXECUÇÃO PELO CLAUDE CODE**.

Mandato vigente:

`rodadas/gpt/RODADA_001C_ORGANIZATIONS_MEMBERSHIP.md`

Branch esperada:

`claude/rodada-001c-organizations-membership`

Relatório esperado:

`rodadas/claude/RELATORIO_RODADA_001C_ORGANIZATIONS_MEMBERSHIP.md`

`/proxima` está autorizado a executar **somente a Rodada 001C**.

Nenhuma 001D está autorizada.

## 4. Escopo autorizado da 001C

Criar somente a fundação relacional de tenancy:

- `public.organizations`;
- `public.organization_members`;
- constraints, FKs e índice por `user_id`;
- migration versionada/aplicada;
- RLS explicitamente habilitado nas duas tabelas;
- zero policies ao final desta rodada;
- acesso funcional de `anon`/`authenticated` fechado até a 001D;
- provas transacionais das constraints sem resíduos.

Não criar `business_profiles`, onboarding, policies de membership, UI de organizações, convites ou funções `SECURITY DEFINER`.

## 5. Pendências não bloqueantes conhecidas

1. `auth_leaked_password_protection` desabilitado no Advisor — hardening antes de clientes reais/produção; não é regressão da 001C se permanecer inalterado.
2. Brevo Free é apenas SMTP provisório de desenvolvimento.
3. Default privileges para funções próprias devem ser resolvidos imediatamente antes da primeira função sensível em schema exposto; a 001C não cria funções próprias.
4. Rate limiting próprio permanece futuro conforme `SECURITY_MODEL.md`.

## 6. Próxima direção após 001C

Planejada, mas **não autorizada**:

Rodada 001D — grants + RLS policies + prova adversarial 2 usuários × 2 organizações.

Ela só poderá iniciar após execução, auditoria e promoção da 001C, seguida de nova autorização explícita.

## 7. Continuidade

Descompasso temporário de numeração/documentação é normal e deve ser corrigido na próxima etapa substantiva quando não houver risco operacional.

Branch/relatório existente não significa mudança incorporada. Estado efetivo continua sendo `main` + este arquivo + promoção real.