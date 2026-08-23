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
- `ensure_rls` ativo;
- método documental enxuto e histórico reciclado até a 001C.

Detalhes: `docs/00-governanca/HISTORY_SUMMARY.md`.

## 3. Estado corrente

**RODADA 001D — DEFAULT PRIVILEGES + GRANTS + RLS + ISOLAMENTO**

Status: **CORREÇÃO 001D-02 AUTORIZADA — AGUARDANDO RETOMADA PELO CLAUDE CODE**.

Mandato-base:

`rodadas/gpt/RODADA_001D_RLS_TENANCY_ISOLAMENTO.md`

Correções vigentes:

- `rodadas/gpt/CORRECAO_001D_01_DEFAULT_PRIVILEGES_SCOPE.md`
- `rodadas/gpt/CORRECAO_001D_02_GLOBAL_FUNCTION_DEFAULT_EXECUTE.md`

Branch:

`claude/rodada-001d-rls-tenancy-isolamento`

`/proxima` está autorizado a **retomar somente a Rodada 001D conforme a Correção 001D-02**.

Nenhuma etapa posterior está autorizada.

## 4. Estado técnico já executado da 001D

Migration aplicada:

`20260823003128_harden_default_privileges_grants_and_rls_policies`.

Já comprovado e preservado:

- defaults de `postgres` por schema para tabelas/sequências endurecidos;
- grants nominais futuros de funções para `anon`/`authenticated`/`service_role` removidos;
- `authenticated` somente SELECT nas duas tabelas atuais;
- `anon` sem acesso;
- `service_role` atual preservado por grant explícito;
- duas policies SELECT não recursivas por membership ativa;
- nenhuma policy de escrita;
- nenhuma nova `SECURITY DEFINER`;
- isolamento real 2 usuários × 2 organizações via Auth/JWT/Data API: 21/21;
- limpeza sem resíduo;
- Advisor sem os dois INFO `rls_enabled_no_policy`.

A prova 21/21 não precisa ser repetida na 001D-02 se policies/grants de tabela não mudarem.

## 5. Causa do bloqueio e decisão GPT

A migration 001D usou `ALTER DEFAULT PRIVILEGES ... IN SCHEMA public ... REVOKE EXECUTE ... FROM PUBLIC`.

O PostgreSQL 17 documenta que um `REVOKE` por schema não pode remover privilégios concedidos pelo default **global**. Portanto, o efeito observado pelo Claude era esperado; a conclusão de que o privilégio seria inexpressável estava incorreta.

Correção autorizada:

`ALTER DEFAULT PRIVILEGES FOR ROLE postgres REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC`.

Sem `IN SCHEMA`.

Antes de aplicar, o Claude deve provar esse comando em transação revertida com função `SECURITY INVOKER` de probe. Se a prova falhar, parar e devolver ao GPT.

Se funcionar, criar **nova migration**; não reescrever SQL executável da migration já aplicada `20260823003128_*`.

O efeito global sobre funções futuras owned por `postgres` é aceito: funções atuais owned por `postgres` já possuem ACL explícita e `ALTER DEFAULT PRIVILEGES` não altera objetos existentes. Funções futuras que precisem de execução devem receber `GRANT EXECUTE` explícito por migration.

## 6. Riscos conhecidos

1. Default ACL residual de `supabase_admin`: aceito enquanto `public` tiver zero objetos owned por essa role; se deixar de ser zero, reabrir decisão GPT.
2. `public.rls_auto_enable()` deve preservar ACL segura da 001A e `ensure_rls` permanecer ativo.
3. `auth_leaked_password_protection` permanece WARN conhecido de Auth e não bloqueia a 001D se for o único WARN.
4. Brevo Free permanece SMTP provisório de desenvolvimento.

## 7. Próxima direção após 001D

Ainda **não autorizada**.

Depois de a 001D ser executada, auditada e promovida, o GPT definirá a próxima etapa substantiva da Fundação Supabase/Auth/Tenancy com base no estado real.

## 8. Continuidade

Branch/relatório existente não significa mudança incorporada. Estado efetivo incorporado continua sendo `main` + promoção real.