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
- cadastro, confirmação, logout, bloqueio de rota e login posterior validados em E2E humano real;
- SMTP Brevo Free configurado apenas como infraestrutura provisória de desenvolvimento;
- schema `public` sem tabelas de domínio;
- `/proxima`, `.gitattributes` e método documental enxuto versionados.

Detalhes: `docs/00-governanca/HISTORY_SUMMARY.md`.

## 3. Estado corrente

**RODADA 001B — AUTH REAL**

Status: **APROVADA E PROMOVIDA**.

PR: #3
Merge: `4819875007784f9bc016abd57202fe1fe9a7063b`
Auditoria: `rodadas/gpt/AUDITORIA_RODADA_001B_AUTH_REAL.md`

Não há mandato executável pendente.

`/proxima` deve parar aguardando nova autorização.

Nenhuma 001C está autorizada.

## 4. Provas consolidadas da 001B

- head final auditado: `ea886def6face318e032f2ae940a7044a1ce0552`;
- CI run `32605498009`: success;
- template versionado/remoto: `type=email`;
- fluxo real: cadastro → e-mail → confirmação → `/conta` → logout → bloqueio → login → `/conta`, 9/9;
- logs Supabase: signup 200 e verify 200 no teste final;
- `auth.users` na auditoria final: 1 usuário total, 1 confirmado, 0 smoke users, 0 não confirmados;
- nenhuma tabela/tenancy/domínio criada.

## 5. Pendências não bloqueantes

1. `auth_leaked_password_protection` está desabilitado e aparece como WARN no Security Advisor. Tratar como hardening antes de clientes reais/produção.
2. Brevo Free é somente SMTP provisório de desenvolvimento. Antes de deploy, decidir provedor definitivo, domínio autenticado e política de e-mail transacional.
3. Definir default privileges para futuras funções próprias antes da primeira função sensível em schema exposto.
4. Rate limiting próprio continua futuro conforme `SECURITY_MODEL.md` quando houver necessidade além do provider.

## 6. Próxima direção planejada, ainda não autorizada

Rodada 001C — Organizations + Membership, com fundação de tenancy e preparação para RLS de domínio.

A 001C deve ser planejada e explicitamente autorizada antes de `/proxima` executar qualquer implementação.

## 7. Continuidade

Descompasso temporário de numeração/documentação é normal e deve ser corrigido na próxima etapa substantiva quando não houver risco operacional.

Branch/relatório existente não significa mudança incorporada. Estado efetivo continua sendo `main` + este arquivo + promoção real.
