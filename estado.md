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
- Rodada 001C — Organizations + Membership;
- Auth real por e-mail/senha com confirmação SSR, sessão/cookies e rota protegida;
- `public.organizations` e `public.organization_members` por migration versionada;
- constraints/FKs/índice de membership conforme contrato;
- RLS habilitado nas duas tabelas;
- zero policies de domínio antes da 001D;
- `anon` e `authenticated` sem privilégios funcionais nas duas tabelas atuais;
- `ensure_rls` ativo;
- método documental enxuto e histórico reciclado até a 001C.

Detalhes: `docs/00-governanca/HISTORY_SUMMARY.md`.

## 3. Estado corrente

**RODADA 001D — DEFAULT PRIVILEGES + GRANTS + RLS + ISOLAMENTO**

Status: **EXECUTADA — AGUARDANDO AUDITORIA GPT**.

Executada conforme a Correção 001D-01. Migration aplicada ao project ref autorizado:
`20260823003128_harden_default_privileges_grants_and_rls_policies`.

Entregue:

- default privileges de `role postgres` em `public` endurecidos para tabelas, funções e sequências;
- `authenticated` somente com SELECT nas duas tabelas; `anon` sem acesso; `service_role` preservado por grant explícito;
- duas policies de leitura não recursivas, sem policy de escrita e sem `SECURITY DEFINER` nova;
- prova real 2 usuários × 2 organizações via Auth/JWT/Data API — 21/21, com limpeza e zero resíduo;
- Advisor sem regressão: os dois INFO `rls_enabled_no_policy` desapareceram.

**Pendência bloqueante para decisão do GPT (relatório §9.1):** `ALTER DEFAULT PRIVILEGES ... REVOKE
EXECUTE ON FUNCTIONS FROM PUBLIC` é aceito porém inefetivo neste servidor — não chega a criar linha
em `pg_default_acl`. Funções futuras em `public` continuam executáveis por `anon`/`authenticated` por
herança de PUBLIC. O critério §14 do mandato relativo a funções **não foi atingido** e não foi
contornado. Tabelas e sequências futuras estão efetivamente fechadas.

Mandato-base:

`rodadas/gpt/RODADA_001D_RLS_TENANCY_ISOLAMENTO.md`

Correção vigente, que substitui especificamente as decisões bloqueadas de default privileges:

`rodadas/gpt/CORRECAO_001D_01_DEFAULT_PRIVILEGES_SCOPE.md`

Branch:

`claude/rodada-001d-rls-tenancy-isolamento`

Relatório:

`rodadas/claude/RELATORIO_RODADA_001D_RLS_TENANCY_ISOLAMENTO.md`

A 001D está executada e entregue. `/proxima` **não** tem mandato executável enquanto o GPT não
auditar esta entrega e decidir sobre a pendência do relatório §9.1.

Nenhuma etapa posterior está autorizada.

## 4. Bloqueio anterior e decisão GPT

O executor parou corretamente antes de qualquer mutation porque `postgres` não pode alterar default privileges de `supabase_admin`.

Decisão após auditoria:

1. **não escalar ao suporte Supabase agora**;
2. endurecer de forma reproduzível somente os defaults de `role postgres`, que é o owner real dos objetos do projeto e o papel das migrations;
3. manter o ACL residual de `supabase_admin` documentado como risco de plataforma aceito enquanto `public` tiver **zero objetos owned por `supabase_admin`**;
4. se surgir objeto `public` owned por `supabase_admin` ou exposição real atribuível a esse default, parar e reabrir decisão GPT;
5. para objetos futuros, revogar também `service_role` dos default privileges de `postgres`, seguindo o padrão oficial opt-in;
6. **não retirar** os grants efetivos atuais de `service_role` das tabelas já existentes; futuros grants de `service_role` passam a ser explícitos por feature/migration.

Nenhuma mutation foi aplicada antes desta decisão. O baseline promovido da 001C permaneceu intacto.

## 5. Escopo autorizado para a retomada

Executar o restante da 001D:

- migration versionada com hardening dos default privileges de `postgres` em `public` para tabelas, funções e sequências;
- remover defaults futuros de `anon`, `authenticated` e `service_role`; remover também default EXECUTE de `PUBLIC` em funções;
- grants atuais: `authenticated` com SELECT apenas em `organizations` e `organization_members`; `anon` sem acesso; `service_role` efetivo atual preservado;
- policy `organization_members`: usuário lê somente sua própria membership;
- policy `organizations`: usuário lê somente organização `ACTIVE` com membership própria `ACTIVE`;
- nenhuma policy de escrita;
- nenhuma função `SECURITY DEFINER` persistente;
- prova real 2 usuários × 2 organizações com Auth/JWT/Data API;
- prova de `anon` e de escrita negada inclusive para `owner`;
- probes reversíveis dos novos defaults;
- zero resíduos ao final;
- Security Advisor e CI final.

Não criar novas tabelas de domínio, `business_profiles`, onboarding, convites, UI de Organizations ou etapa posterior.

## 6. Baseline e riscos conhecidos

1. Default ACL residual de `supabase_admin`: aceito enquanto inerte; count de objetos `public` owned por essa role deve permanecer zero.
2. Os INFO `rls_enabled_no_policy` devem desaparecer após as policies da 001D.
3. `public.rls_auto_enable()` deve preservar a ACL segura promovida na 001A; `ensure_rls` deve permanecer ativo.
4. `auth_leaked_password_protection` permanece WARN conhecido de Auth e não bloqueia a 001D se for o único WARN pré-existente.
5. Brevo Free permanece SMTP provisório de desenvolvimento.

## 7. Próxima direção após 001D

Ainda **não autorizada**.

Depois de a 001D ser executada, auditada e promovida, o GPT definirá a próxima etapa substantiva da Fundação Supabase/Auth/Tenancy com base no estado real, considerando `business_profiles` e o fluxo mínimo de conta/organização.

## 8. Continuidade

Descompasso temporário de numeração/documentação é normal e deve ser corrigido na próxima etapa substantiva quando não houver risco operacional.

Branch/relatório existente não significa mudança incorporada. Estado efetivo incorporado continua sendo `main` + promoção real.