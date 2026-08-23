-- Rodada 001D — Default privileges + Grants + RLS + Isolamento
-- Mandato:  rodadas/gpt/RODADA_001D_RLS_TENANCY_ISOLAMENTO.md
-- Correção: rodadas/gpt/CORRECAO_001D_01_DEFAULT_PRIVILEGES_SCOPE.md
--
-- Fecha a fundação de autorização multi-tenant sobre as tabelas promovidas na
-- 001C, em três camadas distintas: default privileges (exposição futura),
-- grants (quem alcança a tabela) e RLS (quais linhas).
--
-- Escopo de default privileges — decisão da Correção 001D-01
-- ----------------------------------------------------------
-- `pg_default_acl` em `public` tem entradas para DUAS roles criadoras:
-- `postgres` e `supabase_admin`. Esta migration trata **somente `postgres`**.
--
-- `postgres` não é superuser neste projeto e não é membro de `supabase_admin`,
-- portanto `ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin` falha com
-- `42501 permission denied to change default privileges` — inclusive pelo SQL
-- Editor do Dashboard, que também executa como `postgres`. O caminho oficial
-- vigente do Supabase (guides/api/securing-your-api) prescreve exclusivamente
-- `for role postgres`.
--
-- O default ACL de `supabase_admin` fica registrado como risco residual de
-- plataforma aceito, e permanece inerte enquanto `public` tiver zero objetos
-- owned por essa role — condição verificada e reprovada a cada auditoria.
-- Todos os objetos de `public` são owned por `postgres`, que é também o papel
-- que executa as migrations deste repositório.

-- ---------------------------------------------------------------------------
-- 1. Default privileges de `postgres` em `public` — exposição futura opt-in
-- ---------------------------------------------------------------------------

-- Baseline revogado aqui (todos concedidos por `postgres`):
--   tabelas    (r): anon/authenticated/service_role = arwdDxtm
--   sequências (S): anon/authenticated/service_role = rwU
--   funções    (f): anon/authenticated/service_role = X
--
-- `service_role` também entra no REVOKE por decisão da Correção 001D-01 §2:
-- o padrão oficial é opt-in. Isso governa apenas objetos FUTUROS; os grants
-- efetivos já concedidos às tabelas da 001C não são tocados (ver §2 abaixo).
--
-- Daqui em diante, toda tabela/função/sequência que precise ser alcançada pela
-- Data API ou por caminho server-side deve trazer o GRANT explícito na
-- migration da própria feature.

alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  revoke all on functions from anon, authenticated, service_role;

-- Funções nascem com EXECUTE para PUBLIC pelo default do Postgres, e
-- `anon`/`authenticated`/`service_role` herdam desse PUBLIC. O comando abaixo é
-- o prescrito pela documentação oficial do Supabase para fechar isso.
--
-- ATENÇÃO — provado inefetivo neste servidor (PostgreSQL 17.6, projeto
-- `cbnxdoxpyioxjwgjhbtq`): o comando é aceito sem erro, mas descartado. Em um
-- schema virgem, `REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC` não chega a criar a
-- linha correspondente em `pg_default_acl`, e a função criada em seguida nasce
-- com `proacl` nulo — isto é, com o EXECUTE de PUBLIC intacto. O mesmo vale
-- para a variante `REVOKE ALL ... FROM PUBLIC`.
--
-- Consequência: os REVOKEs acima removem os grants NOMINAIS de
-- `anon`/`authenticated`/`service_role` (efeito real e verificado), mas uma
-- função futura em `public` continuará executável por esses papéis por herança
-- de PUBLIC. Até decisão do GPT, a proteção efetiva de cada função nova é o
-- REVOKE explícito na migration que a cria — o padrão já aplicado a
-- `public.rls_auto_enable()` na Rodada 001A.
--
-- O comando é mantido por ser o caminho oficial e por ser inócuo: se a
-- plataforma passar a honrá-lo, o default fica correto sem nova migration.
alter default privileges for role postgres in schema public
  revoke execute on functions from public;

-- ---------------------------------------------------------------------------
-- 2. Grants das tabelas atuais
-- ---------------------------------------------------------------------------

-- `anon` permanece sem qualquer privilégio. REVOKE de privilégio inexistente é
-- no-op: idempotente e declarativo.
revoke all on table public.organizations from anon;
revoke all on table public.organization_members from anon;

-- `authenticated` recebe SOMENTE leitura. A criação/mutação de organização e
-- membership será desenhada em etapa própria; nesta rodada o browser é
-- read-only sobre a fundação de tenancy. Sem INSERT/UPDATE/DELETE, a escrita
-- direta é negada no grant (42501), antes mesmo da camada RLS.
grant select on table public.organizations to authenticated;
grant select on table public.organization_members to authenticated;

-- `service_role`: preserva o acesso efetivo atual (`arwdDxtm`), que veio do
-- default privilege agora revogado. Torná-lo explícito e versionado impede que
-- o caminho server-side dependa de um default que deixou de existir.
grant all on table public.organizations to service_role;
grant all on table public.organization_members to service_role;

-- ---------------------------------------------------------------------------
-- 3. Policies RLS — leitura, não recursivas
-- ---------------------------------------------------------------------------

-- RLS já está habilitado nas duas tabelas desde a 001C.

-- 3.1 `organization_members`: o usuário lê somente a própria linha.
--
-- Deliberadamente NÃO lista os demais membros da própria organização: essa
-- policy pertence a uma etapa posterior. A condição não referencia
-- `organizations` nem a própria tabela, o que ancora a não-recursão de 3.2.
create policy organization_members_select_own
  on public.organization_members
  for select
  to authenticated
  using ( user_id = (select auth.uid()) );

-- 3.2 `organizations`: o usuário lê somente organização ACTIVE na qual possui
-- membership ACTIVE.
--
-- `IN (subquery)` em vez de EXISTS correlacionado: a subquery é avaliada uma
-- vez por statement e usa `organization_members_user_id_idx`, em vez de rodar
-- por linha da tabela externa.
--
-- Não recursivo: esta policy consulta `organization_members`, cuja policy (3.1)
-- não volta a `organizations`. A cadeia termina em um predicado sobre
-- `auth.uid()`.
--
-- `role` (owner|admin|member) não participa: nesta rodada qualquer membership
-- ativa concede exatamente o mesmo direito de leitura, e nenhuma concede
-- escrita.
create policy organizations_select_by_active_membership
  on public.organizations
  for select
  to authenticated
  using (
    status = 'ACTIVE'
    and id in (
      select m.organization_id
      from public.organization_members m
      where m.user_id = (select auth.uid())
        and m.status = 'ACTIVE'
    )
  );

-- Nenhuma policy de INSERT/UPDATE/DELETE nesta rodada.
-- Nenhuma função SECURITY DEFINER: o desenho acima não precisa de uma.
