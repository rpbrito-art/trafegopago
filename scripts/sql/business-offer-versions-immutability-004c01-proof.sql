-- Prova transacional da Correção 004C-01 — mandato §4.
--
-- Prova as duas camadas separadamente, porque elas protegem contra coisas
-- diferentes:
--
--   `service_role` → recusado por **privilégio de coluna** (42501);
--   dono do banco  → recusado pela **trigger** (55000), que é o que faz a
--                    invariante valer para quem ignora grants.
--
-- Um script que testasse só o primeiro caminho passaria mesmo sem trigger
-- alguma, e o defeito da auditoria continuaria de pé.
--
-- Transacional: `begin … rollback`. Nenhuma fixture sobrevive.
--
-- Uso:
--   npx supabase db query --linked --file scripts/sql/business-offer-versions-immutability-004c01-proof.sql

begin;

create temporary table ctx (chave text primary key, valor uuid) on commit drop;

create temporary table prova (
  ordem serial,
  nome text,
  esperado text,
  obtido text,
  passou boolean
) on commit drop;

grant all on ctx, prova to service_role;
grant all on sequence prova_ordem_seq to service_role;

create function pg_temp.registrar(p_nome text, p_esperado text, p_obtido text)
returns void language sql as $$
  insert into prova (nome, esperado, obtido, passou)
  values (p_nome, p_esperado, p_obtido, p_esperado = p_obtido);
$$;

create function pg_temp.id(p_chave text) returns uuid language sql stable as $$
  select valor from ctx where chave = p_chave;
$$;

grant execute on function pg_temp.registrar(text, text, text) to service_role;
grant execute on function pg_temp.id(text) to service_role;

-- ---------------------------------------------------------------------------
-- Fixtures
-- ---------------------------------------------------------------------------

do $$
declare
  v_owner uuid;
  v_org uuid;
begin
  insert into auth.users (id, instance_id, aud, role, email) values
    (gen_random_uuid(), '00000000-0000-0000-0000-000000000000',
     'authenticated', 'authenticated', 'fixture-004c01-owner@example.invalid')
    returning id into v_owner;

  insert into public.organizations (name) values ('FIXTURE 004C01')
    returning id into v_org;

  insert into public.organization_members (organization_id, user_id, role, status)
    values (v_org, v_owner, 'owner', 'ACTIVE');

  insert into ctx values ('owner', v_owner), ('org', v_org);
end $$;

-- ---------------------------------------------------------------------------
-- 1. O fluxo normal continua funcionando
-- ---------------------------------------------------------------------------

do $$
declare
  v_offer uuid;
  v_repetido uuid;
begin
  v_offer := public.save_business_offer(
    pg_temp.id('owner'), pg_temp.id('org'),
    'Corte de cabelo', 'SERVICE', 'FIXED', null, null, null, 5000, null);

  insert into ctx values ('oferta', v_offer);

  perform pg_temp.registrar('01 save_business_offer cria v1', '1',
    (select count(*)::text from public.business_offer_versions
      where offer_id = v_offer));

  -- Idempotência: o reenvio idêntico não pode virar UPDATE nenhum.
  v_repetido := public.save_business_offer(
    pg_temp.id('owner'), pg_temp.id('org'),
    'Corte de cabelo', 'SERVICE', 'FIXED', v_offer, null, null, 5000, null);

  perform pg_temp.registrar('02 reenvio identico continua idempotente', '1',
    (select count(*)::text from public.business_offer_versions
      where offer_id = v_offer));
  perform pg_temp.registrar('03 reenvio identico devolve a mesma oferta',
    v_offer::text, v_repetido::text);

  -- Edição material: supersede + nova versão, na mesma transação.
  perform public.save_business_offer(
    pg_temp.id('owner'), pg_temp.id('org'),
    'Corte de cabelo', 'SERVICE', 'FIXED', v_offer, null, null, 7000, null);

  perform pg_temp.registrar('04 edicao material cria v2', '2',
    (select count(*)::text from public.business_offer_versions
      where offer_id = v_offer));
  perform pg_temp.registrar('05 v1 ficou superseded', 'true',
    (select (superseded_at is not null)::text
      from public.business_offer_versions
      where offer_id = v_offer and version_no = 1));
  perform pg_temp.registrar('06 existe uma unica versao corrente', '1',
    (select count(*)::text from public.business_offer_versions
      where offer_id = v_offer and superseded_at is null));
  perform pg_temp.registrar('07 conteudo de v1 permanece o original', '5000',
    (select price_min_minor::text from public.business_offer_versions
      where offer_id = v_offer and version_no = 1));

  insert into ctx values
    ('v1', (select id from public.business_offer_versions
             where offer_id = v_offer and version_no = 1)),
    ('v2', (select id from public.business_offer_versions
             where offer_id = v_offer and version_no = 2));
end $$;

-- ---------------------------------------------------------------------------
-- 2. Camada de privilégio — como `service_role`
-- ---------------------------------------------------------------------------

set local role service_role;

do $$
begin
  update public.business_offer_versions set name = 'Reescrito'
   where id = pg_temp.id('v2');

  perform pg_temp.registrar('08 service_role altera nome da versao corrente', '42501', 'ACEITOU');
exception when others then
  perform pg_temp.registrar('08 service_role altera nome da versao corrente', '42501', sqlstate);
end $$;

do $$
begin
  update public.business_offer_versions
     set price_min_minor = 100, currency = 'USD'
   where id = pg_temp.id('v2');

  perform pg_temp.registrar('09 service_role altera preco e moeda', '42501', 'ACEITOU');
exception when others then
  perform pg_temp.registrar('09 service_role altera preco e moeda', '42501', sqlstate);
end $$;

do $$
begin
  update public.business_offer_versions
     set organization_id = pg_temp.id('org'), offer_id = pg_temp.id('oferta'),
         version_no = 9
   where id = pg_temp.id('v2');

  perform pg_temp.registrar('10 service_role altera tenant, oferta ou numero', '42501', 'ACEITOU');
exception when others then
  perform pg_temp.registrar('10 service_role altera tenant, oferta ou numero', '42501', sqlstate);
end $$;

do $$
begin
  update public.business_offer_versions set name = 'Reescrito'
   where id = pg_temp.id('v1');

  perform pg_temp.registrar('11 service_role altera conteudo de versao superseded', '42501', 'ACEITOU');
exception when others then
  perform pg_temp.registrar('11 service_role altera conteudo de versao superseded', '42501', sqlstate);
end $$;

-- O supersede legítimo continua ao alcance do papel que a aplicação usa: o
-- grant por coluna precisa recusar reescrita sem quebrar o fluxo normal.
do $$
declare
  v_offer uuid;
  v_versao uuid;
begin
  v_offer := public.save_business_offer(
    pg_temp.id('owner'), pg_temp.id('org'),
    'Barba', 'SERVICE', 'QUOTE', null, null, null, null, null);

  select id into v_versao from public.business_offer_versions
   where offer_id = v_offer and superseded_at is null;

  update public.business_offer_versions set superseded_at = now()
   where id = v_versao;

  perform pg_temp.registrar('12 service_role arquiva a versao corrente', 'true',
    (select (superseded_at is not null)::text
      from public.business_offer_versions where id = v_versao));
exception when others then
  perform pg_temp.registrar('12 service_role arquiva a versao corrente', 'true',
    'FALHOU ' || sqlstate);
end $$;

reset role;

-- ---------------------------------------------------------------------------
-- 3. Camada da trigger — como dono do banco, que ignora grants
-- ---------------------------------------------------------------------------

do $$
begin
  update public.business_offer_versions set name = 'Reescrito pelo dono'
   where id = pg_temp.id('v2');

  perform pg_temp.registrar('13 dono do banco altera nome da versao corrente', '55000', 'ACEITOU');
exception when others then
  perform pg_temp.registrar('13 dono do banco altera nome da versao corrente', '55000', sqlstate);
end $$;

do $$
begin
  update public.business_offer_versions
     set price_min_minor = 1, price_mode = 'QUOTE', currency = 'USD'
   where id = pg_temp.id('v2');

  perform pg_temp.registrar('14 dono do banco altera preco, modo e moeda', '55000', 'ACEITOU');
exception when others then
  perform pg_temp.registrar('14 dono do banco altera preco, modo e moeda', '55000', sqlstate);
end $$;

do $$
begin
  update public.business_offer_versions set created_at = now(), created_by = null
   where id = pg_temp.id('v2');

  perform pg_temp.registrar('15 dono do banco altera autoria ou data', '55000', 'ACEITOU');
exception when others then
  perform pg_temp.registrar('15 dono do banco altera autoria ou data', '55000', sqlstate);
end $$;

do $$
begin
  update public.business_offer_versions set description = 'Reescrevendo o passado'
   where id = pg_temp.id('v1');

  perform pg_temp.registrar('16 dono do banco altera conteudo de versao superseded', '55000', 'ACEITOU');
exception when others then
  perform pg_temp.registrar('16 dono do banco altera conteudo de versao superseded', '55000', sqlstate);
end $$;

do $$
begin
  update public.business_offer_versions set superseded_at = null
   where id = pg_temp.id('v1');

  perform pg_temp.registrar('17 versao superseded volta a ser corrente', '55000', 'ACEITOU');
exception when others then
  perform pg_temp.registrar('17 versao superseded volta a ser corrente', '55000', sqlstate);
end $$;

-- Alterar conteúdo **e** arquivar na mesma instrução: sem esta recusa, o
-- caminho de reescrita continuaria aberto para quem também mexesse no
-- arquivamento.
do $$
begin
  update public.business_offer_versions
     set name = 'Reescrito junto', superseded_at = now()
   where id = pg_temp.id('v2');

  perform pg_temp.registrar('18 arquivar junto com alteracao de conteudo', '55000', 'ACEITOU');
exception when others then
  perform pg_temp.registrar('18 arquivar junto com alteracao de conteudo', '55000', sqlstate);
end $$;

-- UPDATE que não toca superseded_at nenhum também é recusado.
do $$
begin
  update public.business_offer_versions
     set value_proposition = 'Sem mexer no arquivamento'
   where id = pg_temp.id('v2');

  perform pg_temp.registrar('19 update sem arquivar e recusado', '55000', 'ACEITOU');
exception when others then
  perform pg_temp.registrar('19 update sem arquivar e recusado', '55000', sqlstate);
end $$;

-- A transição permitida continua permitida, inclusive para o dono.
do $$
begin
  update public.business_offer_versions set superseded_at = now()
   where id = pg_temp.id('v2');

  perform pg_temp.registrar('20 superseded_at NULL -> timestamp e permitido', 'true',
    (select (superseded_at is not null)::text
      from public.business_offer_versions where id = pg_temp.id('v2')));
exception when others then
  perform pg_temp.registrar('20 superseded_at NULL -> timestamp e permitido', 'true',
    'FALHOU ' || sqlstate);
end $$;

-- ---------------------------------------------------------------------------
-- 4. Fronteira do browser inalterada
-- ---------------------------------------------------------------------------

select pg_temp.registrar('21 anon continua sem grant algum nas duas tabelas', '0',
  (select count(*)::text from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name in ('business_offers', 'business_offer_versions')
      and grantee = 'anon'));

select pg_temp.registrar('22 authenticated continua somente com SELECT', 'SELECT,SELECT',
  (select string_agg(privilege_type, ',' order by table_name)
     from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name in ('business_offers', 'business_offer_versions')
      and grantee = 'authenticated'));

select pg_temp.registrar('23 service_role escreve apenas superseded_at', 'superseded_at',
  (select string_agg(distinct column_name, ',')
     from information_schema.column_privileges
    where table_schema = 'public'
      and table_name = 'business_offer_versions'
      and grantee = 'service_role'
      and privilege_type = 'UPDATE'));

select pg_temp.registrar('24 RLS continua habilitada nas duas tabelas', '2',
  (select count(*)::text from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in ('business_offers', 'business_offer_versions')
      and c.relrowsecurity));

select pg_temp.registrar('25 policies de leitura continuam sendo duas', '2',
  (select count(*)::text from pg_policies
    where schemaname = 'public'
      and tablename in ('business_offers', 'business_offer_versions')));

-- ---------------------------------------------------------------------------
-- Veredicto — um único resultado, porque o CLI imprime apenas o último.
-- ---------------------------------------------------------------------------

select
  count(*) as casos,
  count(*) filter (where passou) as passaram,
  count(*) filter (where not passou) as falharam,
  string_agg(
    format('%s %s (esperado %s, obtido %s)',
      case when passou then '[OK]' else '[FALHOU]' end, nome, esperado, obtido),
    E'\n' order by ordem
  ) as detalhe
from prova;

rollback;
