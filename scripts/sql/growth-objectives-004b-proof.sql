-- Prova do delta da Rodada 004B — growth_objectives, onboarding progressivo e
-- índices de cobertura das FKs de ai_runs.
--
-- Transacional: tudo roda dentro de `begin … rollback`, então não há resíduo a
-- limpar e nenhuma fixture sobrevive. As fixtures são sintéticas — nenhum dado
-- real, nenhuma PII, nenhum segredo.
--
-- Os casos negativos rodam em blocos com `exception`, capturando o SQLSTATE em
-- vez de abortar o script. O resultado final é uma única tabela de veredictos.
--
-- Uso:
--   npx supabase db query --linked --file scripts/sql/growth-objectives-004b-proof.sql

begin;

create temporary table prova_004b (
  ordem serial,
  nome text,
  esperado text,
  obtido text,
  passou boolean
) on commit drop;

do $$
declare
  org_a uuid;
  org_b uuid;
  org_inativa uuid;
  dono uuid;
  admin_id uuid;
  membro uuid;
  estranho uuid;
  obj_1 uuid;
  obj_2 uuid;
  obj_repetido uuid;
  achados int;
begin
  -- ---------------------------------------------------------------- fixtures
  --
  -- Usuários sintéticos em `auth.users`. Só o id importa: nenhum e-mail real,
  -- nenhuma credencial.
  insert into auth.users (id, instance_id, aud, role, email)
    values (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated',
            'authenticated', 'fixture-004b-dono@example.invalid')
    returning id into dono;
  insert into auth.users (id, instance_id, aud, role, email)
    values (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated',
            'authenticated', 'fixture-004b-admin@example.invalid')
    returning id into admin_id;
  insert into auth.users (id, instance_id, aud, role, email)
    values (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated',
            'authenticated', 'fixture-004b-membro@example.invalid')
    returning id into membro;
  insert into auth.users (id, instance_id, aud, role, email)
    values (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated',
            'authenticated', 'fixture-004b-estranho@example.invalid')
    returning id into estranho;

  insert into public.organizations (name) values ('FIXTURE 004B A') returning id into org_a;
  insert into public.organizations (name) values ('FIXTURE 004B B') returning id into org_b;
  insert into public.organizations (name, status)
    values ('FIXTURE 004B INATIVA', 'INACTIVE') returning id into org_inativa;

  insert into public.organization_members (organization_id, user_id, role, status)
    values (org_a, dono, 'owner', 'ACTIVE'),
           (org_a, admin_id, 'admin', 'ACTIVE'),
           (org_a, membro, 'member', 'ACTIVE'),
           (org_b, estranho, 'owner', 'ACTIVE'),
           (org_inativa, dono, 'owner', 'ACTIVE');

  -- ------------------------------------------------- onboarding progressivo
  begin
    insert into public.business_profiles (
      organization_id, segment, location_summary, primary_offer, currency
    ) values (org_a, 'Odontologia', 'Campinas, SP', 'Implantes', 'BRL');
    insert into prova_004b (nome,esperado,obtido,passou)
      values ('perfil sem publico/objetivo aceito','ok','ok',true);
  exception when others then
    insert into prova_004b (nome,esperado,obtido,passou)
      values ('perfil sem publico/objetivo aceito','ok',sqlstate,false);
  end;

  -- String vazia continua recusada: ausência é NULL, não `''`.
  begin
    update public.business_profiles set target_audience = '' where organization_id = org_a;
    insert into prova_004b (nome,esperado,obtido,passou)
      values ('publico como string vazia recusado','23514','ACEITOU',false);
  exception when others then
    insert into prova_004b (nome,esperado,obtido,passou)
      values ('publico como string vazia recusado','23514',sqlstate,sqlstate='23514');
  end;

  -- ------------------------------------------------------------ autorização
  begin
    obj_1 := public.set_active_growth_objective(
      dono, org_a, 'LEADS', 'WHATSAPP', 'CONVERSATION_STARTED');
    insert into prova_004b (nome,esperado,obtido,passou)
      values ('owner ACTIVE define objetivo','ok','ok',obj_1 is not null);
  exception when others then
    insert into prova_004b (nome,esperado,obtido,passou)
      values ('owner ACTIVE define objetivo','ok',sqlstate,false);
  end;

  begin
    obj_2 := public.set_active_growth_objective(
      admin_id, org_a, 'BOOKINGS', 'WEBSITE', 'BOOKING_CONFIRMED');
    insert into prova_004b (nome,esperado,obtido,passou)
      values ('admin ACTIVE altera objetivo','ok','ok',obj_2 is not null and obj_2 <> obj_1);
  exception when others then
    insert into prova_004b (nome,esperado,obtido,passou)
      values ('admin ACTIVE altera objetivo','ok',sqlstate,false);
  end;

  begin
    perform public.set_active_growth_objective(
      membro, org_a, 'SALES', 'WEBSITE', 'PURCHASE');
    insert into prova_004b (nome,esperado,obtido,passou)
      values ('member comum nao altera','42501','ACEITOU',false);
  exception when others then
    insert into prova_004b (nome,esperado,obtido,passou)
      values ('member comum nao altera','42501',sqlstate,sqlstate='42501');
  end;

  begin
    perform public.set_active_growth_objective(
      estranho, org_a, 'SALES', 'WEBSITE', 'PURCHASE');
    insert into prova_004b (nome,esperado,obtido,passou)
      values ('usuario de outra organizacao nao altera','42501','ACEITOU',false);
  exception when others then
    insert into prova_004b (nome,esperado,obtido,passou)
      values ('usuario de outra organizacao nao altera','42501',sqlstate,sqlstate='42501');
  end;

  begin
    perform public.set_active_growth_objective(
      dono, org_inativa, 'SALES', 'WEBSITE', 'PURCHASE');
    insert into prova_004b (nome,esperado,obtido,passou)
      values ('organizacao inativa nao altera','42501','ACEITOU',false);
  exception when others then
    insert into prova_004b (nome,esperado,obtido,passou)
      values ('organizacao inativa nao altera','42501',sqlstate,sqlstate='42501');
  end;

  -- ------------------------------------------------- histórico e unicidade
  select count(*) into achados
    from public.growth_objectives
   where organization_id = org_a and status = 'ACTIVE';

  insert into prova_004b (nome,esperado,obtido,passou)
    values ('apenas um ACTIVE por organizacao','1',achados::text,achados=1);

  select count(*) into achados
    from public.growth_objectives
   where organization_id = org_a and status = 'ARCHIVED' and archived_at is not null;

  insert into prova_004b (nome,esperado,obtido,passou)
    values ('alteracao arquivou o anterior','1',achados::text,achados=1);

  select count(*) into achados
    from public.growth_objectives where organization_id = org_a;

  insert into prova_004b (nome,esperado,obtido,passou)
    values ('historico preservado, nada apagado','2',achados::text,achados=2);

  -- Reenvio idêntico não cria versão nova: um duplo clique produziria duas
  -- linhas dizendo a mesma coisa e um "histórico" de mudanças que não houve.
  begin
    obj_repetido := public.set_active_growth_objective(
      admin_id, org_a, 'BOOKINGS', 'WEBSITE', 'BOOKING_CONFIRMED');
    insert into prova_004b (nome,esperado,obtido,passou)
      values ('reenvio identico e idempotente','mesmo id',
              case when obj_repetido = obj_2 then 'mesmo id' else 'id novo' end,
              obj_repetido = obj_2);
  exception when others then
    insert into prova_004b (nome,esperado,obtido,passou)
      values ('reenvio identico e idempotente','mesmo id',sqlstate,false);
  end;

  select count(*) into achados from public.growth_objectives where organization_id = org_a;
  insert into prova_004b (nome,esperado,obtido,passou)
    values ('idempotencia nao inflou o historico','2',achados::text,achados=2);

  -- Dois ACTIVE por escrita direta: barrado pelo índice único parcial.
  begin
    insert into public.growth_objectives (
      organization_id, status, objective_type, destination_type, success_event_type)
      values (org_a, 'ACTIVE', 'SALES', 'WEBSITE', 'PURCHASE');
    insert into prova_004b (nome,esperado,obtido,passou)
      values ('segundo ACTIVE recusado pelo indice','23505','ACEITOU',false);
  exception when others then
    insert into prova_004b (nome,esperado,obtido,passou)
      values ('segundo ACTIVE recusado pelo indice','23505',sqlstate,sqlstate='23505');
  end;

  -- ------------------------------------------------------------ invariantes
  begin
    insert into public.growth_objectives (
      organization_id, status, objective_type, destination_type, success_event_type)
      values (org_b, 'ARCHIVED', 'SALES', 'WEBSITE', 'PURCHASE');
    insert into prova_004b (nome,esperado,obtido,passou)
      values ('ARCHIVED sem archived_at recusado','23514','ACEITOU',false);
  exception when others then
    insert into prova_004b (nome,esperado,obtido,passou)
      values ('ARCHIVED sem archived_at recusado','23514',sqlstate,sqlstate='23514');
  end;

  begin
    insert into public.growth_objectives (
      organization_id, status, objective_type, destination_type, success_event_type, archived_at)
      values (org_b, 'ACTIVE', 'SALES', 'WEBSITE', 'PURCHASE', now());
    insert into prova_004b (nome,esperado,obtido,passou)
      values ('ACTIVE com archived_at recusado','23514','ACEITOU',false);
  exception when others then
    insert into prova_004b (nome,esperado,obtido,passou)
      values ('ACTIVE com archived_at recusado','23514',sqlstate,sqlstate='23514');
  end;

  begin
    insert into public.growth_objectives (
      organization_id, objective_type, destination_type, success_event_type)
      values (org_b, 'VENDER_MUITO', 'WEBSITE', 'PURCHASE');
    insert into prova_004b (nome,esperado,obtido,passou)
      values ('objective_type desconhecido recusado','23514','ACEITOU',false);
  exception when others then
    insert into prova_004b (nome,esperado,obtido,passou)
      values ('objective_type desconhecido recusado','23514',sqlstate,sqlstate='23514');
  end;

  begin
    insert into public.growth_objectives (
      organization_id, objective_type, destination_type, success_event_type)
      values (org_b, 'SALES', 'TELEGRAM', 'PURCHASE');
    insert into prova_004b (nome,esperado,obtido,passou)
      values ('destination_type desconhecido recusado','23514','ACEITOU',false);
  exception when others then
    insert into prova_004b (nome,esperado,obtido,passou)
      values ('destination_type desconhecido recusado','23514',sqlstate,sqlstate='23514');
  end;

  begin
    insert into public.growth_objectives (
      organization_id, objective_type, destination_type, success_event_type)
      values (org_b, 'SALES', 'WEBSITE', 'CLIQUE');
    insert into prova_004b (nome,esperado,obtido,passou)
      values ('success_event_type desconhecido recusado','23514','ACEITOU',false);
  exception when others then
    insert into prova_004b (nome,esperado,obtido,passou)
      values ('success_event_type desconhecido recusado','23514',sqlstate,sqlstate='23514');
  end;

  begin
    insert into public.growth_objectives (
      organization_id, objective_type, objective_detail, destination_type, success_event_type)
      values (org_b, 'OTHER', '   ', 'WEBSITE', 'PURCHASE');
    insert into prova_004b (nome,esperado,obtido,passou)
      values ('detalhe em branco recusado','23514','ACEITOU',false);
  exception when others then
    insert into prova_004b (nome,esperado,obtido,passou)
      values ('detalhe em branco recusado','23514',sqlstate,sqlstate='23514');
  end;

  begin
    insert into public.growth_objectives (
      organization_id, objective_type, objective_detail, destination_type, success_event_type)
      values (org_b, 'OTHER', repeat('a', 281), 'WEBSITE', 'PURCHASE');
    insert into prova_004b (nome,esperado,obtido,passou)
      values ('detalhe acima do limite recusado','23514','ACEITOU',false);
  exception when others then
    insert into prova_004b (nome,esperado,obtido,passou)
      values ('detalhe acima do limite recusado','23514',sqlstate,sqlstate='23514');
  end;

  -- ---------------------------------------------------------- tenancy/RLS
  --
  -- O isolamento é verificado pela própria expressão da policy, avaliada para
  -- cada usuário. Rodar como owner ignoraria RLS e não provaria nada.
  select count(*) into achados
    from public.growth_objectives g
   where g.organization_id in (
     select m.organization_id
       from public.organization_members m
       join public.organizations o on o.id = m.organization_id
      where m.user_id = membro and m.status = 'ACTIVE' and o.status = 'ACTIVE'
   );

  insert into prova_004b (nome,esperado,obtido,passou)
    values ('membro ACTIVE le objetivos da propria organizacao','2',achados::text,achados=2);

  select count(*) into achados
    from public.growth_objectives g
   where g.organization_id in (
     select m.organization_id
       from public.organization_members m
       join public.organizations o on o.id = m.organization_id
      where m.user_id = estranho and m.status = 'ACTIVE' and o.status = 'ACTIVE'
   );

  insert into prova_004b (nome,esperado,obtido,passou)
    values ('outra organizacao nao ve o historico','0',achados::text,achados=0);

  -- Membership INACTIVE não lê, mesmo pertencendo à organização.
  update public.organization_members set status = 'INACTIVE'
   where organization_id = org_a and user_id = membro;

  select count(*) into achados
    from public.growth_objectives g
   where g.organization_id in (
     select m.organization_id
       from public.organization_members m
       join public.organizations o on o.id = m.organization_id
      where m.user_id = membro and m.status = 'ACTIVE' and o.status = 'ACTIVE'
   );

  insert into prova_004b (nome,esperado,obtido,passou)
    values ('membership INACTIVE nao le','0',achados::text,achados=0);

  -- ------------------------------------------------------------ grants/RLS
  select count(*) into achados
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    cross join lateral aclexplode(c.relacl) x
    join pg_roles r on r.oid = x.grantee
   where n.nspname = 'public' and c.relname = 'growth_objectives'
     and r.rolname in ('anon','authenticated')
     and x.privilege_type in ('INSERT','UPDATE','DELETE');

  insert into prova_004b (nome,esperado,obtido,passou)
    values ('browser sem INSERT/UPDATE/DELETE','0',achados::text,achados=0);

  select count(*) into achados
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    cross join lateral aclexplode(c.relacl) x
    join pg_roles r on r.oid = x.grantee
   where n.nspname = 'public' and c.relname = 'growth_objectives'
     and r.rolname = 'anon';

  insert into prova_004b (nome,esperado,obtido,passou)
    values ('anon sem grant algum','0',achados::text,achados=0);

  select count(*) into achados
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relname = 'growth_objectives' and c.relrowsecurity;

  insert into prova_004b (nome,esperado,obtido,passou)
    values ('RLS habilitado','1',achados::text,achados=1);

  select count(*) into achados
    from pg_policies
   where schemaname = 'public' and tablename = 'growth_objectives' and cmd <> 'SELECT';

  insert into prova_004b (nome,esperado,obtido,passou)
    values ('nenhuma policy de escrita para browser','0',achados::text,achados=0);

  -- A RPC não é executável pelo browser.
  select count(*) into achados
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    cross join lateral aclexplode(p.proacl) x
    join pg_roles r on r.oid = x.grantee
   where n.nspname = 'public' and p.proname = 'set_active_growth_objective'
     and r.rolname in ('anon','authenticated');

  insert into prova_004b (nome,esperado,obtido,passou)
    values ('RPC nao executavel por anon/authenticated','0',achados::text,achados=0);

  -- ------------------------------------------- índices de FK — dívida 004A
  select count(*) into achados
    from pg_indexes
   where schemaname = 'public' and tablename = 'ai_runs'
     and indexname in (
       'ai_runs_fallback_from_run_id_idx',
       'ai_runs_model_provider_idx',
       'ai_runs_price_model_idx',
       'ai_runs_provider_id_idx'
     );

  insert into prova_004b (nome,esperado,obtido,passou)
    values ('quatro indices de cobertura de FK criados','4',achados::text,achados=4);
end $$;

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
from prova_004b;

-- Nada sobrevive: o rollback desfaz fixtures e escritas. A ausência de resíduo
-- é conferida por leitura separada, depois desta transação.
rollback;
