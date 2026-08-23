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

**RODADA 001D — DEFAULT PRIVILEGES + GRANTS + RLS + ISOLAMENTO**

Status: **APROVADA E PROMOVIDA**.

PR: #5
Merge: `178c2aa0e4ada91ae2bae73d2ff97c21f27c0222`
Head técnico Claude: `055b411db15355515d7cb5cb35a3fd724058f589`
Head final auditado/CI: `ca1fe3b54890834ba16b9126ccee7c6c4ed4ef77`
CI final: run `32635190849` — success
Auditoria: `rodadas/gpt/AUDITORIA_RODADA_001D_RLS_TENANCY_ISOLAMENTO.md`

Migrations da 001D:
- `20260823003128_harden_default_privileges_grants_and_rls_policies.sql`;
- `20260823103521_revoke_global_default_execute_on_functions.sql`.

Não há mandato executável pendente.

`/proxima` deve **parar aguardando nova autorização explícita**.

## 4. Provas consolidadas da 001D

- migration history local/remota fechada em 4 migrations;
- RLS ativo em `organizations` e `organization_members`;
- `authenticated` com SELECT e sem INSERT/UPDATE/DELETE;
- `anon` sem SELECT;
- `service_role` com grants atuais explícitos;
- duas policies SELECT: própria membership e organização ACTIVE com membership própria ACTIVE;
- nenhuma policy de escrita;
- nenhuma nova `SECURITY DEFINER`;
- prova real Auth/JWT/Data API: 21/21;
- cross-tenant negado/vazio;
- membership/org INACTIVE retiram acesso;
- `owner` não ganha bypass de escrita;
- fixtures removidas: organizations=0, memberships=0 e apenas 1 usuário real no Auth;
- default global de funções de `postgres` = `{postgres=X/postgres}`;
- 50 funções owned por `postgres` atuais com ACL explícita;
- `rls_auto_enable()` preserva ACL segura da 001A;
- `ensure_rls` ativo;
- `supabase_admin` possui zero objetos owned em `public`;
- Advisor final apenas com WARN conhecido de leaked password protection;
- CI final verde.

## 5. Pendências e riscos conhecidos

1. `auth_leaked_password_protection` permanece desabilitado: hardening obrigatório antes de clientes reais/produção.
2. Brevo Free permanece SMTP provisório de desenvolvimento; SMTP/domínio de produção ainda não definido.
3. Default ACL residual de `supabase_admin` permanece risco de plataforma aceito enquanto `public` tiver zero objetos owned por essa role. Se surgir objeto owned por `supabase_admin`, reabrir decisão GPT.
4. Funções futuras que precisem ser chamadas por Data API/server roles devem receber `GRANT EXECUTE` explícito em migration.
5. Policies de escrita/gestão de Organizations/Membership ainda não foram desenhadas.
6. `business_profiles` ainda não foi criado.
7. Rate limiting próprio permanece futuro conforme `SECURITY_MODEL.md`.

## 6. Próxima direção planejável, ainda não autorizada

A Fundação Supabase/Auth/Tenancy já possui autenticação, schema mínimo, grants e isolamento de leitura.

A próxima etapa substantiva deve ser **planejada** a partir do roadmap e do estado real, considerando principalmente:
- `business_profiles` / perfil mínimo do negócio;
- fluxo mínimo de conta → organização → negócio;
- mecanismo autorizado para criação/gestão de organization/membership sem abrir escrita insegura no browser.

A numeração e o recorte exato da próxima rodada devem ser definidos pelo GPT antes da execução.

Nenhuma próxima rodada está autorizada neste momento.

## 7. Continuidade

Descompasso temporário de numeração/documentação é normal e não exige housekeeping isolado.

Branch/relatório/commit só entram no produto após auditoria e promoção. A Rodada 001D está incorporada; qualquer trabalho posterior depende de novo mandato explícito.