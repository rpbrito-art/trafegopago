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

Status: **AUDITORIA GPT PARCIAL — CORREÇÃO 001B-01 AUTORIZADA**.

Branch corrente:

`claude/rodada-001b-auth-real`

Mandato original:

`rodadas/gpt/RODADA_001B_AUTH_REAL.md`

Correção vigente:

`rodadas/gpt/CORRECAO_RODADA_001B_01_FECHAR_AUTH_REAL.md`

Relatório:

`rodadas/claude/RELATORIO_RODADA_001B_AUTH_REAL.md`

O comando `/proxima` está autorizado a executar **somente a correção 001B-01**.

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

## 5. Gaps bloqueantes antes da promoção

1. **Template remoto de Confirm signup não aplicado** no projeto hospedado. Sem isso, o e-mail real do usuário não percorre `/auth/confirm` como exige o fluxo SSR implementado.
2. O script `scripts/smoke-auth.mjs` é um **smoke de integração real**, mas cria o usuário com `admin.generateLink()` e não executa o cadastro/login/logout pelas telas/Server Actions reais do produto. Falta uma passagem E2E real pela UI + e-mail.

Esses pontos são fechados pela correção 001B-01. Não são motivo para iniciar nova fase.

## 6. Regra para a correção

- Não usar `supabase config push` amplo.
- Ajustar o template versionado ao padrão oficial atual `type=email` se necessário.
- Aplicar manualmente apenas o template Confirm signup no Dashboard do projeto correto.
- Fazer uma passagem humana única pela UI: cadastro → e-mail real → confirmação → `/conta` → logout → bloqueio → login posterior → `/conta`.
- Não revelar senha, token ou link no relatório/chat.
- Manter relatório compacto.

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
