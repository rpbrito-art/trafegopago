-- Rodada 001D — Correção 001D-02
-- Mandato: rodadas/gpt/CORRECAO_001D_02_GLOBAL_FUNCTION_DEFAULT_EXECUTE.md
--
-- Fecha o default EXECUTE de PUBLIC sobre funções futuras criadas por `postgres`.
--
-- Causa raiz (PostgreSQL 17): default privileges declarados com `IN SCHEMA` são
-- ADICIONADOS aos defaults globais e não conseguem revogar um privilégio concedido
-- pelo default global embutido (`acldefault('f', owner)` inclui `=X/owner`). Por isso
-- o `revoke ... in schema public` da migration 20260823003128 foi aceito e descartado.
-- A remoção só é expressável no default GLOBAL, sem `IN SCHEMA`.
--
-- Escopo do efeito: funções FUTURAS criadas por `postgres` em qualquer schema deste
-- banco. Aceito pela correção §3 — `ALTER DEFAULT PRIVILEGES` não altera objetos
-- existentes, e todas as funções atuais owned por `postgres` já possuem ACL explícita.
--
-- Consequência operacional permanente: toda função futura que precise ser chamada por
-- `anon`, `authenticated`, `service_role` ou PUBLIC deve receber `GRANT EXECUTE`
-- explícito e versionado na migration da própria feature.
--
-- Não altera defaults de `supabase_admin` (correção §3) nem reescreve a migration
-- 20260823003128, que permanece na história aplicada.

alter default privileges for role postgres
  revoke execute on functions from public;
