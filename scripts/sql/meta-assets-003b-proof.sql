-- Prova do delta da Rodada 003B — seleção de ativos Meta.
--
-- Transacional: tudo dentro de `begin … rollback`, com fixtures sintéticas e
-- zero resíduo. Nenhum token, e-mail ou identificador real.
--
-- Cobre a parte da §6 do mandato que é **de banco**: privilégio por coluna,
-- isolamento por tenant, impossibilidade de relação cross-tenant, unicidade e
-- idempotência da seleção. O que depende de resposta da Meta — redescoberta,
-- recusa de id arbitrário, paginação — vive em `src/lib/meta/assets.test.ts`.
--
-- Uso:
--   npx supabase db query --linked --file scripts/sql/meta-assets-003b-proof.sql

begin;

create temporary table prova_003b (
  ordem serial, nome text, esperado text, obtido text, ok boolean
) on commit drop;

create or replace function pg_temp.reg(p_nome text, p_esp text, p_obt text)
returns void language sql as $$
  insert into prova_003b (nome, esperado, obtido, ok)
  values (p_nome, p_esp, p_obt, p_esp = p_obt);
$$;

create or replace function pg_temp.sqlstate_de(p_sql text)
returns text language plpgsql as $$
begin
  execute p_sql;
  return '00000';
exception when others then
  return sqlstate;
end;
$$;

-- ---------------------------------------------------------------------------
-- 1. Fronteira do browser — grant por coluna
-- ---------------------------------------------------------------------------

-- A tela mostra `@username` e nome. O identificador externo é chave de chamada
-- à Meta, não dado de interface: fica fora do grant.
select pg_temp.reg('authenticated le username', 'true',
  has_column_privilege('authenticated','public.instagram_accounts','username','SELECT')::text);
select pg_temp.reg('authenticated NAO le external_instagram_account_id', 'false',
  has_column_privilege('authenticated','public.instagram_accounts','external_instagram_account_id','SELECT')::text);
select pg_temp.reg('authenticated NAO le external_page_id', 'false',
  has_column_privilege('authenticated','public.instagram_accounts','external_page_id','SELECT')::text);
select pg_temp.reg('authenticated NAO le external_ad_account_id', 'false',
  has_column_privilege('authenticated','public.ad_accounts','external_ad_account_id','SELECT')::text);
select pg_temp.reg('authenticated le moeda da conta de anuncios', 'true',
  has_column_privilege('authenticated','public.ad_accounts','currency','SELECT')::text);

select pg_temp.reg('anon NAO le instagram_accounts', 'false',
  has_table_privilege('anon','public.instagram_accounts','SELECT')::text);
select pg_temp.reg('anon NAO le ad_accounts', 'false',
  has_table_privilege('anon','public.ad_accounts','SELECT')::text);

-- Seleção passa por função server-side que revalida o ativo contra a Meta.
-- Escrita direta do browser tornaria essa revalidação contornável.
select pg_temp.reg('authenticated NAO escreve instagram_accounts', 'false',
  has_table_privilege('authenticated','public.instagram_accounts','INSERT')::text);
select pg_temp.reg('authenticated NAO atualiza instagram_accounts', 'false',
  has_table_privilege('authenticated','public.instagram_accounts','UPDATE')::text);
select pg_temp.reg('authenticated NAO escreve ad_accounts', 'false',
  has_table_privilege('authenticated','public.ad_accounts','INSERT')::text);
select pg_temp.reg('service_role SEM DELETE em instagram_accounts', 'false',
  has_table_privilege('service_role','public.instagram_accounts','DELETE')::text);
select pg_temp.reg('service_role SEM DELETE em ad_accounts', 'false',
  has_table_privilege('service_role','public.ad_accounts','DELETE')::text);

-- ---------------------------------------------------------------------------
-- 2. RLS e ACL das funções
-- ---------------------------------------------------------------------------

select pg_temp.reg('RLS em instagram_accounts', 'true',
  (select relrowsecurity::text from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname='instagram_accounts'));
select pg_temp.reg('RLS em ad_accounts', 'true',
  (select relrowsecurity::text from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname='ad_accounts'));
select pg_temp.reg('instagram_accounts: apenas policy de SELECT', '1',
  (select count(*)::text from pg_policy p join pg_class c on c.oid=p.polrelid
    where c.relname='instagram_accounts'));
select pg_temp.reg('ad_accounts: apenas policy de SELECT', '1',
  (select count(*)::text from pg_policy p join pg_class c on c.oid=p.polrelid
    where c.relname='ad_accounts'));

-- Nenhuma função nova SECURITY DEFINER: as de seleção rodam como invoker, e
-- `service_role` já tem o privilégio de que precisam.
select pg_temp.reg('funcoes de selecao sao INVOKER', '0',
  (select count(*)::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname='public' and p.prosecdef
      and p.proname in ('select_instagram_account','select_ad_account')));
select pg_temp.reg('selecao: EXECUTE nunca para anon/authenticated', 'true',
  (select bool_and(array_to_string(p.proacl,' ') not like '%anon=%'
                   and array_to_string(p.proacl,' ') not like '%authenticated=%')::text
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname='public'
      and p.proname in ('select_instagram_account','select_ad_account')));

-- ---------------------------------------------------------------------------
-- 3. Ciclo da seleção, como service_role
-- ---------------------------------------------------------------------------

do $$
declare
  v_org_a uuid;
  v_org_b uuid;
  v_conn_a uuid;
  v_conn_b uuid;
  v_ig uuid;
  v_ig_reenvio uuid;
  r_org text;
  r_status text;
  r_linhas_apos_reenvio text;
  r_uma_viva text;
  r_anterior text;
  r_ad_opcional text;
begin
  insert into public.organizations (name) values ('Org A 003B') returning id into v_org_a;
  insert into public.organizations (name) values ('Org B 003B') returning id into v_org_b;

  -- Conexões ACTIVE exigem token; o CHECK da 003A continua valendo, então a
  -- fixture usa uma referência sintética de segredo.
  insert into public.meta_connections (organization_id, status, token_secret_reference)
  values (v_org_a, 'ACTIVE', gen_random_uuid()) returning id into v_conn_a;
  insert into public.meta_connections (organization_id, status, token_secret_reference)
  values (v_org_b, 'ACTIVE', gen_random_uuid()) returning id into v_conn_b;

  set local role service_role;

  v_ig := public.select_instagram_account(
    v_org_a, v_conn_a, null, 'ig-1', 'page-1', 'perfil_a', 'Negócio A', null);

  select organization_id::text, status into r_org, r_status
  from public.instagram_accounts where id = v_ig;

  -- Reenviar a mesma escolha é idempotente: mesma linha, sem duplicata.
  v_ig_reenvio := public.select_instagram_account(
    v_org_a, v_conn_a, null, 'ig-1', 'page-1', 'perfil_a', 'Negócio A', null);

  select count(*)::text into r_linhas_apos_reenvio
  from public.instagram_accounts where meta_connection_id = v_conn_a;

  -- Trocar de conta preserva a anterior como histórico e mantém uma só viva.
  perform public.select_instagram_account(
    v_org_a, v_conn_a, null, 'ig-2', 'page-2', 'perfil_b', 'Negócio A2', null);

  select count(*)::text into r_uma_viva
  from public.instagram_accounts
  where meta_connection_id = v_conn_a and status = 'SELECTED';

  select status into r_anterior from public.instagram_accounts where id = v_ig;

  -- Nenhuma conta de anúncios: estado válido, não pendência.
  select count(*)::text into r_ad_opcional
  from public.ad_accounts where meta_connection_id = v_conn_a;

  reset role;

  perform pg_temp.reg('selecao gravada na organizacao correta', v_org_a::text, r_org);
  perform pg_temp.reg('selecao nasce vigente', 'SELECTED', r_status);
  perform pg_temp.reg('reenvio devolve a mesma linha', v_ig::text, v_ig_reenvio::text);
  perform pg_temp.reg('reenvio nao duplica conta', '1', r_linhas_apos_reenvio);
  perform pg_temp.reg('troca mantem uma unica conta vigente', '1', r_uma_viva);
  perform pg_temp.reg('conta anterior vira historico', 'REPLACED', r_anterior);
  perform pg_temp.reg('ausencia de conta de anuncios e valida', '0', r_ad_opcional);
end $$;

-- ---------------------------------------------------------------------------
-- 4. Cross-tenant é impossível, não improvável
-- ---------------------------------------------------------------------------

do $$
declare
  v_org_a uuid;
  v_org_b uuid;
  v_conn_b uuid;
  v_conn_revogada uuid;
begin
  select id into v_org_a from public.organizations where name = 'Org A 003B';
  select id into v_org_b from public.organizations where name = 'Org B 003B';
  select id into v_conn_b from public.meta_connections where organization_id = v_org_b;

  -- A FK composta recusa: a conexão existe, mas é de outra organização.
  perform pg_temp.reg('conexao de outra org nao aceita selecao', '23503',
    pg_temp.sqlstate_de(format($q$
      insert into public.instagram_accounts
        (organization_id, meta_connection_id, external_instagram_account_id, external_page_id)
      values (%L, %L, 'ig-invasor', 'page-invasor')
    $q$, v_org_a, v_conn_b)));

  -- E pelo caminho oficial, a função recusa antes de qualquer escrita.
  set local role service_role;
  perform pg_temp.reg('funcao recusa conexao de outra org', '23503',
    pg_temp.sqlstate_de(format($q$
      select public.select_instagram_account(%L, %L, null, 'ig-x', 'page-x', null, null, null)
    $q$, v_org_a, v_conn_b)));
  reset role;

  -- Selecionar ativo sobre conexão encerrada gravaria escolha que ninguém lê.
  insert into public.meta_connections (organization_id, status, disconnected_at)
  values (v_org_b, 'REVOKED', now()) returning id into v_conn_revogada;

  set local role service_role;
  perform pg_temp.reg('conexao revogada nao aceita selecao', '23503',
    pg_temp.sqlstate_de(format($q$
      select public.select_instagram_account(%L, %L, null, 'ig-y', 'page-y', null, null, null)
    $q$, v_org_b, v_conn_revogada)));
  reset role;
end $$;

-- ---------------------------------------------------------------------------
-- 5. Constraints que sustentam o contrato
-- ---------------------------------------------------------------------------

do $$
declare
  v_org_b uuid;
  v_conn_b uuid;
begin
  select id into v_org_b from public.organizations where name = 'Org B 003B';
  select id into v_conn_b from public.meta_connections
    where organization_id = v_org_b and status = 'ACTIVE';

  perform pg_temp.reg('status fora da allowlist e recusado', '23514',
    pg_temp.sqlstate_de(format($q$
      insert into public.instagram_accounts
        (organization_id, meta_connection_id, external_instagram_account_id,
         external_page_id, status)
      values (%L, %L, 'ig-z', 'page-z', 'ESCOLHIDA')
    $q$, v_org_b, v_conn_b)));

  perform pg_temp.reg('external id em branco e recusado', '23514',
    pg_temp.sqlstate_de(format($q$
      insert into public.instagram_accounts
        (organization_id, meta_connection_id, external_instagram_account_id, external_page_id)
      values (%L, %L, '   ', 'page-z')
    $q$, v_org_b, v_conn_b)));

  perform pg_temp.reg('moeda fora do ISO 4217 e recusada', '23514',
    pg_temp.sqlstate_de(format($q$
      insert into public.ad_accounts
        (organization_id, meta_connection_id, external_ad_account_id, currency)
      values (%L, %L, 'act_1', 'reais')
    $q$, v_org_b, v_conn_b)));

  insert into public.instagram_accounts
    (organization_id, meta_connection_id, external_instagram_account_id, external_page_id)
  values (v_org_b, v_conn_b, 'ig-dup', 'page-dup');

  perform pg_temp.reg('mesmo ativo duas vezes na mesma conexao e recusado', '23505',
    pg_temp.sqlstate_de(format($q$
      insert into public.instagram_accounts
        (organization_id, meta_connection_id, external_instagram_account_id, external_page_id)
      values (%L, %L, 'ig-dup', 'page-dup')
    $q$, v_org_b, v_conn_b)));

  perform pg_temp.reg('duas contas vigentes na mesma conexao e recusado', '23505',
    pg_temp.sqlstate_de(format($q$
      insert into public.instagram_accounts
        (organization_id, meta_connection_id, external_instagram_account_id, external_page_id)
      values (%L, %L, 'ig-outra', 'page-outra')
    $q$, v_org_b, v_conn_b)));
end $$;

-- ---------------------------------------------------------------------------
-- 5b. RLS exercida como `authenticated`, não apenas declarada
-- ---------------------------------------------------------------------------

-- Grant e policy são coisas diferentes: o primeiro decide colunas, a segunda
-- decide linhas. Aqui a policy é exercida de fato, com `auth.uid()` real.
do $$
declare
  v_user uuid;
  v_org_a uuid;
  v_org_b uuid;
  v_conn_b uuid;
  r_le_propria text;
  r_le_alheia text;
  r_escreve text;
begin
  -- Um usuário existente basta: a prova é sobre membership, não sobre quem é.
  select id into v_user from auth.users limit 1;

  if v_user is null then
    perform pg_temp.reg('RLS exercida (sem usuario para a fixture)', 'true', 'false');
    return;
  end if;

  select id into v_org_a from public.organizations where name = 'Org A 003B';
  select id into v_org_b from public.organizations where name = 'Org B 003B';
  select id into v_conn_b from public.meta_connections
    where organization_id = v_org_b and status = 'ACTIVE';

  -- Membro de A, e de mais nenhuma organização desta transação.
  insert into public.organization_members (organization_id, user_id, role)
  values (v_org_a, v_user, 'owner');

  -- A seleção viva em B veio da seção anterior: este usuário não deve
  -- enxergá-la.
  set local role authenticated;
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_user::text, 'role', 'authenticated')::text, true);

  select count(*)::text into r_le_propria
  from public.instagram_accounts
  where organization_id = v_org_a and status = 'SELECTED';

  select count(*)::text into r_le_alheia
  from public.instagram_accounts where organization_id = v_org_b;

  begin
    insert into public.instagram_accounts
      (organization_id, meta_connection_id, external_instagram_account_id, external_page_id)
    values (v_org_a, v_conn_b, 'ig-forjado', 'page-forjada');
    r_escreve := '00000';
  exception when others then
    r_escreve := sqlstate;
  end;

  reset role;
  perform set_config('request.jwt.claims', '', true);

  perform pg_temp.reg('membro le a selecao da propria org', '1', r_le_propria);
  perform pg_temp.reg('membro NAO le a selecao de outra org', '0', r_le_alheia);
  -- 42501 = privilégio insuficiente: não há grant de INSERT para o browser.
  perform pg_temp.reg('membro NAO escreve selecao direto', '42501', r_escreve);
end $$;

-- ---------------------------------------------------------------------------
-- 6. Baseline promovido intacto
-- ---------------------------------------------------------------------------

select pg_temp.reg('migration history = 15', '15',
  (select count(*)::text from supabase_migrations.schema_migrations));
select pg_temp.reg('dez tabelas em public', '10',
  (select count(*)::text from pg_tables where schemaname='public'));
select pg_temp.reg('todas as tabelas de public com RLS', '10',
  (select count(*)::text from pg_tables where schemaname='public' and rowsecurity));
select pg_temp.reg('nenhuma funcao DEFINER nova (6 do baseline)', '6',
  (select count(*)::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname='public' and p.prosecdef));
select pg_temp.reg('public sem objetos owned por supabase_admin', '0',
  (select count(*)::text from pg_class c join pg_namespace n on n.oid=c.relnamespace
     join pg_roles r on r.oid=c.relowner
    where n.nspname='public' and r.rolname='supabase_admin'));

-- ---------------------------------------------------------------------------
-- 7. Veredicto
-- ---------------------------------------------------------------------------

select
  count(*) filter (where ok) || '/' || count(*) as resultado,
  coalesce(string_agg(nome || ' (esperado ' || esperado || ', obtido ' ||
           coalesce(obtido,'null') || ')', ' | ') filter (where not ok),
           'nenhuma falha') as falhas
from prova_003b;

rollback;
