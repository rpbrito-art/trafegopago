-- Prova transacional da Correção 004D-01 — mandato §4.
--
-- Prova as duas camadas separadamente, porque protegem contra coisas
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
--   npx supabase db query --linked --file scripts/sql/growth-objectives-immutability-004d01-proof.sql

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
     'authenticated', 'authenticated', 'fixture-004d01-owner@example.invalid')
    returning id into v_owner;

  insert into public.organizations (name) values ('FIXTURE 004D01')
    returning id into v_org;

  insert into public.organization_members (organization_id, user_id, role, status)
    values (v_org, v_owner, 'owner', 'ACTIVE');

  insert into ctx values ('owner', v_owner), ('org', v_org);

  insert into ctx values ('oferta', public.save_business_offer(
    v_owner, v_org, 'Corte de cabelo', 'SERVICE', 'FIXED', null, null, null, 5000, null));
end $$;

-- ---------------------------------------------------------------------------
-- 1. O fluxo normal continua funcionando
-- ---------------------------------------------------------------------------

do $$
declare
  v_v1 uuid;
  v_repetido uuid;
  v_v2 uuid;
begin
  v_v1 := public.set_active_growth_objective(
    pg_temp.id('owner'), pg_temp.id('org'), 'LEADS', 'WHATSAPP', 'CONVERSATION_STARTED');

  insert into ctx values ('objetivo_v1', v_v1);

  perform pg_temp.registrar('01 set_active_growth_objective cria o objetivo', '1',
    (select count(*)::text from public.growth_objectives
      where organization_id = pg_temp.id('org') and status = 'ACTIVE'));

  -- Idempotência: reenvio idêntico não pode virar UPDATE nenhum.
  v_repetido := public.set_active_growth_objective(
    pg_temp.id('owner'), pg_temp.id('org'), 'LEADS', 'WHATSAPP', 'CONVERSATION_STARTED');

  perform pg_temp.registrar('02 reenvio identico do objetivo e idempotente',
    v_v1::text, v_repetido::text);

  -- Troca de objetivo: arquiva a versão vigente e cria a próxima.
  v_v2 := public.set_active_growth_objective(
    pg_temp.id('owner'), pg_temp.id('org'), 'SALES', 'WEBSITE', 'PURCHASE');

  insert into ctx values ('objetivo_v2', v_v2);

  perform pg_temp.registrar('03 trocar objetivo arquiva a versao anterior', 'ARCHIVED',
    (select status from public.growth_objectives where id = v_v1));
  perform pg_temp.registrar('04 versao anterior ganhou archived_at', 'true',
    (select (archived_at is not null)::text
      from public.growth_objectives where id = v_v1));
  perform pg_temp.registrar('05 continua existindo um unico ACTIVE', '1',
    (select count(*)::text from public.growth_objectives
      where organization_id = pg_temp.id('org') and status = 'ACTIVE'));
  perform pg_temp.registrar('06 conteudo da versao anterior permanece legivel', 'LEADS',
    (select objective_type from public.growth_objectives where id = v_v1));
end $$;

do $$
declare
  v_v3 uuid;
  v_repetido uuid;
begin
  -- Foco: mesma disciplina, agora pela RPC da 004D.
  v_v3 := public.set_growth_objective_focus(
    pg_temp.id('owner'), pg_temp.id('org'), pg_temp.id('objetivo_v2'),
    'OFFER', pg_temp.id('oferta'));

  insert into ctx values ('objetivo_v3', v_v3);

  perform pg_temp.registrar('07 set_growth_objective_focus cria nova versao', 'true',
    (v_v3 is distinct from pg_temp.id('objetivo_v2'))::text);
  perform pg_temp.registrar('08 versao anterior do foco foi arquivada', 'ARCHIVED',
    (select status from public.growth_objectives where id = pg_temp.id('objetivo_v2')));
  perform pg_temp.registrar('09 objetivo, jornada e sucesso preservados', 'SALES|WEBSITE|PURCHASE',
    (select objective_type || '|' || destination_type || '|' || success_event_type
      from public.growth_objectives where id = v_v3));

  v_repetido := public.set_growth_objective_focus(
    pg_temp.id('owner'), pg_temp.id('org'), v_v3, 'OFFER', pg_temp.id('oferta'));

  perform pg_temp.registrar('10 reenvio identico do foco e idempotente',
    v_v3::text, v_repetido::text);
  perform pg_temp.registrar('11 um unico ACTIVE apos definir foco', '1',
    (select count(*)::text from public.growth_objectives
      where organization_id = pg_temp.id('org') and status = 'ACTIVE'));
end $$;

-- ---------------------------------------------------------------------------
-- 2. Camada de privilégio — como `service_role`
-- ---------------------------------------------------------------------------

set local role service_role;

do $$
begin
  update public.growth_objectives
     set objective_type = 'AUDIENCE', destination_type = 'INSTAGRAM_PROFILE',
         success_event_type = 'PROFILE_ACTION'
   where id = pg_temp.id('objetivo_v3');

  perform pg_temp.registrar('12 service_role altera objetivo, jornada e sucesso', '42501', 'ACEITOU');
exception when others then
  perform pg_temp.registrar('12 service_role altera objetivo, jornada e sucesso', '42501', sqlstate);
end $$;

do $$
begin
  update public.growth_objectives
     set focus_type = 'BUSINESS', focus_offer_id = null
   where id = pg_temp.id('objetivo_v3');

  perform pg_temp.registrar('13 service_role altera o foco direto', '42501', 'ACEITOU');
exception when others then
  perform pg_temp.registrar('13 service_role altera o foco direto', '42501', sqlstate);
end $$;

do $$
begin
  update public.growth_objectives
     set organization_id = pg_temp.id('org'), created_by = null, created_at = now()
   where id = pg_temp.id('objetivo_v3');

  perform pg_temp.registrar('14 service_role altera tenant, autoria ou data', '42501', 'ACEITOU');
exception when others then
  perform pg_temp.registrar('14 service_role altera tenant, autoria ou data', '42501', sqlstate);
end $$;

do $$
begin
  update public.growth_objectives set objective_detail = 'Reescrevendo o passado'
   where id = pg_temp.id('objetivo_v1');

  perform pg_temp.registrar('15 service_role altera conteudo de versao arquivada', '42501', 'ACEITOU');
exception when others then
  perform pg_temp.registrar('15 service_role altera conteudo de versao arquivada', '42501', sqlstate);
end $$;

-- O supersede legítimo continua ao alcance do papel que a aplicação usa: o
-- grant por coluna precisa recusar reescrita sem quebrar o fluxo normal.
do $$
declare
  v_novo uuid;
begin
  v_novo := public.set_active_growth_objective(
    pg_temp.id('owner'), pg_temp.id('org'), 'BOOKINGS', 'WHATSAPP', 'BOOKING_CONFIRMED');

  insert into ctx values ('objetivo_v4', v_novo);

  perform pg_temp.registrar('16 service_role ainda arquiva pela RPC', 'ARCHIVED',
    (select status from public.growth_objectives where id = pg_temp.id('objetivo_v3')));
exception when others then
  perform pg_temp.registrar('16 service_role ainda arquiva pela RPC', 'ARCHIVED',
    'FALHOU ' || sqlstate);
end $$;

reset role;

-- ---------------------------------------------------------------------------
-- 3. Camada da trigger — como dono do banco, que ignora grants
-- ---------------------------------------------------------------------------

do $$
begin
  update public.growth_objectives set objective_type = 'AUDIENCE'
   where id = pg_temp.id('objetivo_v4');

  perform pg_temp.registrar('17 dono do banco altera o objetivo', '55000', 'ACEITOU');
exception when others then
  perform pg_temp.registrar('17 dono do banco altera o objetivo', '55000', sqlstate);
end $$;

do $$
begin
  update public.growth_objectives set focus_type = 'BUSINESS'
   where id = pg_temp.id('objetivo_v4');

  perform pg_temp.registrar('18 dono do banco altera o foco', '55000', 'ACEITOU');
exception when others then
  perform pg_temp.registrar('18 dono do banco altera o foco', '55000', sqlstate);
end $$;

do $$
begin
  update public.growth_objectives set created_by = null, created_at = now()
   where id = pg_temp.id('objetivo_v4');

  perform pg_temp.registrar('19 dono do banco altera autoria ou data', '55000', 'ACEITOU');
exception when others then
  perform pg_temp.registrar('19 dono do banco altera autoria ou data', '55000', sqlstate);
end $$;

do $$
begin
  update public.growth_objectives set success_event_detail = 'Reescrito'
   where id = pg_temp.id('objetivo_v1');

  perform pg_temp.registrar('20 dono do banco altera versao ja arquivada', '55000', 'ACEITOU');
exception when others then
  perform pg_temp.registrar('20 dono do banco altera versao ja arquivada', '55000', sqlstate);
end $$;

do $$
begin
  update public.growth_objectives set status = 'ACTIVE', archived_at = null
   where id = pg_temp.id('objetivo_v1');

  perform pg_temp.registrar('21 versao arquivada volta a ser corrente', '55000', 'ACEITOU');
exception when others then
  perform pg_temp.registrar('21 versao arquivada volta a ser corrente', '55000', sqlstate);
end $$;

-- Alterar conteúdo **e** arquivar na mesma instrução: sem esta recusa, o
-- caminho de reescrita continuaria aberto para quem também mexesse no
-- arquivamento.
do $$
begin
  update public.growth_objectives
     set objective_type = 'AUDIENCE', status = 'ARCHIVED', archived_at = now()
   where id = pg_temp.id('objetivo_v4');

  perform pg_temp.registrar('22 arquivar junto com alteracao de conteudo', '55000', 'ACEITOU');
exception when others then
  perform pg_temp.registrar('22 arquivar junto com alteracao de conteudo', '55000', sqlstate);
end $$;

-- UPDATE que não arquiva também é recusado.
do $$
begin
  update public.growth_objectives set archived_at = now()
   where id = pg_temp.id('objetivo_v4');

  perform pg_temp.registrar('23 preencher archived_at sem arquivar', '55000', 'ACEITOU');
exception when others then
  perform pg_temp.registrar('23 preencher archived_at sem arquivar', '55000', sqlstate);
end $$;

-- A transição permitida continua permitida, inclusive para o dono.
do $$
begin
  update public.growth_objectives set status = 'ARCHIVED', archived_at = now()
   where id = pg_temp.id('objetivo_v4');

  perform pg_temp.registrar('24 ACTIVE/NULL -> ARCHIVED/timestamp e permitido', 'ARCHIVED',
    (select status from public.growth_objectives where id = pg_temp.id('objetivo_v4')));
exception when others then
  perform pg_temp.registrar('24 ACTIVE/NULL -> ARCHIVED/timestamp e permitido', 'ARCHIVED',
    'FALHOU ' || sqlstate);
end $$;

-- ---------------------------------------------------------------------------
-- 4. Fronteira do browser inalterada
-- ---------------------------------------------------------------------------

select pg_temp.registrar('25 anon continua sem grant algum', '0',
  (select count(*)::text from information_schema.role_table_grants
    where table_schema = 'public' and table_name = 'growth_objectives'
      and grantee = 'anon'));

select pg_temp.registrar('26 authenticated continua somente com SELECT', 'SELECT',
  (select string_agg(distinct privilege_type, ',')
     from information_schema.role_table_grants
    where table_schema = 'public' and table_name = 'growth_objectives'
      and grantee = 'authenticated'));

select pg_temp.registrar('27 service_role escreve apenas status e archived_at', 'archived_at,status',
  (select string_agg(distinct column_name, ',' order by column_name)
     from information_schema.column_privileges
    where table_schema = 'public' and table_name = 'growth_objectives'
      and grantee = 'service_role' and privilege_type = 'UPDATE'));

select pg_temp.registrar('28 RLS continua habilitada', 'true',
  (select relrowsecurity::text from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'growth_objectives'));

select pg_temp.registrar('29 policy de leitura continua sendo uma', '1',
  (select count(*)::text from pg_policies
    where schemaname = 'public' and tablename = 'growth_objectives'));

select pg_temp.registrar('30 as RPCs continuam sem EXECUTE para o browser', '0',
  (select count(*)::text from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('set_active_growth_objective', 'set_growth_objective_focus')
      and (has_function_privilege('anon', p.oid, 'EXECUTE')
        or has_function_privilege('authenticated', p.oid, 'EXECUTE'))));

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
