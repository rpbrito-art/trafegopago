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
- Next.js 16.3.2 + React 19.2.8 + TypeScript;
- App Router;
- lint, typecheck, Vitest, build e GitHub Actions CI;
- clientes Supabase browser/server com `@supabase/ssr`;
- migration `20260822212544_harden_rls_auto_enable_privileges.sql` aplicada/versionada;
- `ensure_rls` ativo e Security Advisor sem achados após 001A;
- schema `public` sem tabelas de domínio;
- `/proxima` e `.gitattributes` versionados.

Detalhes: `docs/00-governanca/HISTORY_SUMMARY.md`.

## 3. Estado corrente

**RODADA 001B — AUTH REAL**

Status: **001B EXECUTADA COM CORREÇÃO — AGUARDANDO AUDITORIA GPT**.

Branch corrente:

`claude/rodada-001b-auth-real`

Mandato original:

`rodadas/gpt/RODADA_001B_AUTH_REAL.md`

Correção vigente:

`rodadas/gpt/CORRECAO_RODADA_001B_01_FECHAR_AUTH_REAL.md`

Relatório:

`rodadas/claude/RELATORIO_RODADA_001B_AUTH_REAL.md`

A correção 001B-01 foi executada. Não há mandato executável pendente: `/proxima` deve
parar até o GPT auditar.

Nenhuma 001C está autorizada.

## 4. Resultado da auditoria parcial

Confirmado independentemente pelo GPT:

- branch correta e sem antecipação de Organizations/tenancy/domínio;
- CI final do head `a18210bbfeee8817248b011548844acd87f7dbc0` verde em install/lint/typecheck/test/build;
- 188 testes informados e estrutura de Auth coerente;
- padrão atual `@supabase/ssr` + Next.js 16 `proxy.ts` implementado;
- identidade protegida server-side com `getClaims()`, sem confiar em `getSession()`;
- endpoint `/auth/confirm` usa `verifyOtp` e redirect sanitizado/allowlisted;
- rota `/conta` faz guard server-side independente do Proxy;
- logs reais do Supabase confirmam signup/verify/login/logout/revogação exercitados no smoke;
- schema `public` continua sem tabelas de domínio;
- Security Advisor continua sem achados.

## 5. Gaps da auditoria parcial — fechados pela correção 001B-01

1. **Template remoto de Confirm signup** — aplicado no projeto `cbnxdoxpyioxjwgjhbtq` no
   padrão oficial `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`.
   Template versionado ajustado de `type=signup` para `type=email`.
2. **E2E real pela UI** — passagem humana única concluída: cadastro → e-mail real →
   confirmação → `/conta` → logout → bloqueio → login posterior → `/conta`, 9/9 passos.
   Correlacionada nos logs de Auth do Supabase. `scripts/smoke-auth.mjs` permanece como
   prova complementar, agora declarado smoke de integração, não E2E da UI.

Evidências no adendo do relatório. A verificação final pertence ao GPT.

## 6. Pendências abertas para a auditoria

1. **SMTP Brevo Free** configurado no projeto como SMTP provisório de desenvolvimento,
   para viabilizar a entrega real do e-mail. Não estava previsto no mandato, não é
   configuração versionada e exige decisão do GPT antes da promoção (provedor de
   produção, domínio remetente, limites).
2. Security Advisor deixou de estar zerado: 1 WARN `auth_leaked_password_protection`.
   Não é regressão de código; aparece com o Auth em uso real. Hardening, não bloqueante.
3. Usuários de teste remanescentes no projeto. Limpeza sugerida para a próxima rodada
   substantiva; não removidos por estarem fora do escopo autorizado.

Gates executados na correção: lint, typecheck, 188/188 testes. Build e `npm ci` não
executados por nenhum código executável ter mudado; a CI do head final é a prova limpa.

## 7. Fora de escopo

Continua fora da 001B e da correção:

- organizations/memberships/profiles próprios;
- migrations/RLS de domínio;
- onboarding;
- Meta/Instagram;
- campanhas/leads;
- IA;
- pagamentos;
- deploy;
- MFA, recuperação de senha, social login.

## 8. Continuidade

Descompasso temporário de numeração/documentação é normal e deve ser corrigido na próxima etapa substantiva quando não houver risco operacional.

Branch/relatório existente não significa mudança incorporada. Estado promovido continua sendo a `main`; esta branch permanece em auditoria até a correção ser fechada e reaudita pelo GPT.
