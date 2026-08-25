-- Prova transacional da Rodada 004D — mandato §18.
--
-- Cobre coerência do foco no banco, tenant-safety da FK composta, autorização
-- por papel/status, histórico ao trocar de foco e fronteira do browser.
--
-- Transacional: `begin … rollback`. Nenhuma fixture sobrevive.
--
-- Uso:
--   npx supabase db query --linked --file scripts/sql/growth-objective-focus-004d-proof.sql

begin;

create temporary table ctx (chave text primary key, valor uuid) on commit drop;

create temporary table prova (
  ordem serial,
  nome text,
  esperado text,
  obtido text,
  passou boolean
) on commit drop;

-- O papel autenticado precisa alcançar as temporárias para registrar o que viu.
grant all on ctx, prova to authenticated;
grant all on sequence prova_ordem_seq to authenticated;

create function pg_temp.registrar(p_nome text, p_esperado text, p_obtido text)
returns void language sql as $$
  insert into prova (nome, esperado, obtido, passou)
  values (p_nome, p_esperado, p_obtido, p_esperado = p_obtido);
$$;

create function pg_temp.id(p_chave text) returns uuid language sql stable as $$
  select valor from ctx where chave = p_chave;
$$;

-- A migration `..._revoke_global_default_execute_on_functions` tirou o EXECUTE
-- implícito de PUBLIC.
grant execute on function pg_temp.registrar(text, text, text) to authenticated;
grant execute on function pg_temp.id(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Fixtures: duas organizações, papéis e status distintos
-- ---------------------------------------------------------------------------

do $$
declare
  v_owner_a uuid;
  v_member_a uuid;
  v_inativo_a uuid;
  v_owner_b uuid;
  v_owner_inativa uuid;
  v_org_a uuid;
  v_org_b uuid;
  v_org_inativa uuid;
begin
  insert into auth.users (id, instance_id, aud, role, email) values
    (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'fixture-004d-owner-a@example.invalid')
    returning id into v_owner_a;
  insert into auth.users (id, instance_id, aud, role, email) values
    (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'fixture-004d-member-a@example.invalid')
    returning id into v_member_a;
  insert into auth.users (id, instance_id, aud, role, email) values
    (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'fixture-004d-inativo-a@example.invalid')
    returning id into v_inativo_a;
  insert into auth.users (id, instance_id, aud, role, email) values
    (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'fixture-004d-owner-b@example.invalid')
    returning id into v_owner_b;
  insert into auth.users (id, instance_id, aud, role, email) values
    (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'fixture-004d-owner-inativa@example.invalid')
    returning id into v_owner_inativa;

  insert into public.organizations (name) values ('FIXTURE 004D A') returning id into v_org_a;
  insert into public.organizations (name) values ('FIXTURE 004D B') returning id into v_org_b;
  insert into public.organizations (name, status)
    values ('FIXTURE 004D INATIVA', 'INACTIVE') returning id into v_org_inativa;

  insert into public.organization_members (organization_id, user_id, role, status) values
    (v_org_a, v_owner_a, 'owner', 'ACTIVE'),
    (v_org_a, v_member_a, 'member', 'ACTIVE'),
    (v_org_a, v_inativo_a, 'owner', 'INACTIVE'),
    (v_org_b, v_owner_b, 'owner', 'ACTIVE'),
    (v_org_inativa, v_owner_inativa, 'owner', 'ACTIVE');

  insert into ctx values
    ('owner_a', v_owner_a), ('member_a', v_member_a), ('inativo_a', v_inativo_a),
    ('owner_b', v_owner_b), ('owner_inativa', v_owner_inativa),
    ('org_a', v_org_a), ('org_b', v_org_b), ('org_inativa', v_org_inativa);

  -- Objetivo e ofertas do fluxo normal, criados pelas RPCs já promovidas.
  insert into ctx values ('objetivo_a', public.set_active_growth_objective(
    v_owner_a, v_org_a, 'LEADS', 'WHATSAPP', 'CONVERSATION_STARTED'));

  insert into ctx values ('oferta_a1', public.save_business_offer(
    v_owner_a, v_org_a, 'Corte de cabelo', 'SERVICE', 'FIXED', null, null, null, 5000, null));
  insert into ctx values ('oferta_a2', public.save_business_offer(
    v_owner_a, v_org_a, 'Barba', 'SERVICE', 'QUOTE', null, null, null, null, null));

  insert into ctx values ('objetivo_b', public.set_active_growth_objective(
    v_owner_b, v_org_b, 'SALES', 'WEBSITE', 'PURCHASE'));
  insert into ctx values ('oferta_b', public.save_business_offer(
    v_owner_b, v_org_b, 'Produto da concorrente', 'PRODUCT', 'FIXED', null, null, null, 1000, null));
end $$;

-- ---------------------------------------------------------------------------
-- 1. Objetivo promovido sem foco continua válido
-- ---------------------------------------------------------------------------

do $$
begin
  perform pg_temp.registrar('01 objetivo criado pelo fluxo antigo nasce sem foco', 'true',
    (select (focus_type is null and focus_offer_id is null)::text
      from public.growth_objectives where id = pg_temp.id('objetivo_a')));

  perform pg_temp.registrar('02 objetivo sem foco continua ACTIVE', 'ACTIVE',
    (select status from public.growth_objectives where id = pg_temp.id('objetivo_a')));
end $$;

-- ---------------------------------------------------------------------------
-- 2. Constraints de coerência do foco
-- ---------------------------------------------------------------------------

do $$
declare
  v_casos text[][] := array[
    -- nome, focus_type, usa_oferta ('sim' | 'nao')
    array['03 OFFER sem oferta', 'OFFER', 'nao'],
    array['04 BUSINESS com oferta', 'BUSINESS', 'sim'],
    array['05 foco nulo com oferta', null, 'sim'],
    array['06 taxonomia de foco desconhecida', 'PRODUCT_LINE', 'sim']
  ];
  v_caso text[];
begin
  foreach v_caso slice 1 in array v_casos loop
    begin
      insert into public.growth_objectives (
        organization_id, objective_type, destination_type, success_event_type,
        focus_type, focus_offer_id, status, archived_at)
      values (
        pg_temp.id('org_a'), 'LEADS', 'WHATSAPP', 'CONVERSATION_STARTED',
        v_caso[2],
        case when v_caso[3] = 'sim' then pg_temp.id('oferta_a1') else null end,
        'ARCHIVED', now());

      perform pg_temp.registrar(v_caso[1], '23514', 'ACEITOU');
    exception when others then
      perform pg_temp.registrar(v_caso[1], '23514', sqlstate);
    end;
  end loop;
end $$;

-- Foco apontando para oferta de outro tenant: recusado pela FK composta, não
-- por código de aplicação.
do $$
begin
  insert into public.growth_objectives (
    organization_id, objective_type, destination_type, success_event_type,
    focus_type, focus_offer_id, status, archived_at)
  values (
    pg_temp.id('org_a'), 'LEADS', 'WHATSAPP', 'CONVERSATION_STARTED',
    'OFFER', pg_temp.id('oferta_b'), 'ARCHIVED', now());

  perform pg_temp.registrar('07 foco em oferta de outro tenant', '23503', 'ACEITOU');
exception when others then
  perform pg_temp.registrar('07 foco em oferta de outro tenant', '23503', sqlstate);
end $$;

-- Formas válidas são aceitas.
do $$
begin
  insert into public.growth_objectives (
    organization_id, objective_type, destination_type, success_event_type,
    focus_type, focus_offer_id, status, archived_at)
  values
    (pg_temp.id('org_a'), 'LEADS', 'WHATSAPP', 'CONVERSATION_STARTED',
     'BUSINESS', null, 'ARCHIVED', now()),
    (pg_temp.id('org_a'), 'LEADS', 'WHATSAPP', 'CONVERSATION_STARTED',
     'OFFER', pg_temp.id('oferta_a1'), 'ARCHIVED', now());

  perform pg_temp.registrar('08 BUSINESS sem oferta e OFFER com oferta sao aceitos', 'true', 'true');
exception when others then
  perform pg_temp.registrar('08 BUSINESS sem oferta e OFFER com oferta sao aceitos', 'true',
    'FALHOU ' || sqlstate);
end $$;

-- ---------------------------------------------------------------------------
-- 3. RPC de foco — autorização e tenant
-- ---------------------------------------------------------------------------

do $$
declare
  v_casos text[][] := array[
    array['09 member comum nao define foco', 'member_a', 'org_a', 'objetivo_a'],
    array['10 membership INACTIVE nao define foco', 'inativo_a', 'org_a', 'objetivo_a'],
    array['11 organizacao INACTIVE nao define foco', 'owner_inativa', 'org_inativa', 'objetivo_a'],
    array['12 usuario de outra organizacao nao define foco', 'owner_b', 'org_a', 'objetivo_a'],
    array['13 objetivo de outro tenant falha fechado', 'owner_b', 'org_b', 'objetivo_a']
  ];
  v_caso text[];
begin
  foreach v_caso slice 1 in array v_casos loop
    begin
      perform public.set_growth_objective_focus(
        pg_temp.id(v_caso[2]), pg_temp.id(v_caso[3]), pg_temp.id(v_caso[4]),
        'BUSINESS', null);

      perform pg_temp.registrar(v_caso[1], '42501', 'ACEITOU');
    exception when others then
      perform pg_temp.registrar(v_caso[1], '42501', sqlstate);
    end;
  end loop;
end $$;

-- Oferta de outro tenant como foco, pela RPC.
do $$
begin
  perform public.set_growth_objective_focus(
    pg_temp.id('owner_a'), pg_temp.id('org_a'), pg_temp.id('objetivo_a'),
    'OFFER', pg_temp.id('oferta_b'));

  perform pg_temp.registrar('14 oferta de outro tenant como foco', '42501', 'ACEITOU');
exception when others then
  perform pg_temp.registrar('14 oferta de outro tenant como foco', '42501', sqlstate);
end $$;

-- Taxonomia desconhecida recusada antes de qualquer escrita.
do $$
begin
  perform public.set_growth_objective_focus(
    pg_temp.id('owner_a'), pg_temp.id('org_a'), pg_temp.id('objetivo_a'),
    'PRODUCT_LINE', null);

  perform pg_temp.registrar('15 foco desconhecido recusado pela RPC', '22023', 'ACEITOU');
exception when others then
  perform pg_temp.registrar('15 foco desconhecido recusado pela RPC', '22023', sqlstate);
end $$;

-- ---------------------------------------------------------------------------
-- 4. Histórico ao definir e trocar foco
-- ---------------------------------------------------------------------------

do $$
declare
  v_novo uuid;
  v_repetido uuid;
begin
  v_novo := public.set_growth_objective_focus(
    pg_temp.id('owner_a'), pg_temp.id('org_a'), pg_temp.id('objetivo_a'),
    'OFFER', pg_temp.id('oferta_a1'));

  insert into ctx values ('objetivo_v2', v_novo);

  perform pg_temp.registrar('16 definir foco cria nova versao do objetivo', 'true',
    (v_novo is distinct from pg_temp.id('objetivo_a'))::text);

  perform pg_temp.registrar('17 versao anterior foi arquivada com timestamp', 'true',
    (select (status = 'ARCHIVED' and archived_at is not null)::text
      from public.growth_objectives where id = pg_temp.id('objetivo_a')));

  -- Objetivo, jornada e sucesso são copiados: mudar o foco não muda o que o
  -- negócio quer conseguir.
  perform pg_temp.registrar('18 objetivo, jornada e sucesso preservados', 'LEADS|WHATSAPP|CONVERSATION_STARTED',
    (select objective_type || '|' || destination_type || '|' || success_event_type
      from public.growth_objectives where id = v_novo));

  perform pg_temp.registrar('19 novo foco persistido', 'OFFER',
    (select focus_type from public.growth_objectives where id = v_novo));

  perform pg_temp.registrar('20 autoria e de quem decidiu o foco', 'true',
    (select (created_by = pg_temp.id('owner_a'))::text
      from public.growth_objectives where id = v_novo));

  -- Reenvio idêntico não cria histórico falso.
  v_repetido := public.set_growth_objective_focus(
    pg_temp.id('owner_a'), pg_temp.id('org_a'), v_novo,
    'OFFER', pg_temp.id('oferta_a1'));

  perform pg_temp.registrar('21 reenvio identico e idempotente', v_novo::text, v_repetido::text);

  perform pg_temp.registrar('22 um unico objetivo ACTIVE na organizacao', '1',
    (select count(*)::text from public.growth_objectives
      where organization_id = pg_temp.id('org_a') and status = 'ACTIVE'));
end $$;

-- Trocar para outra oferta arquiva de novo e mantém um único ACTIVE.
do $$
declare
  v_terceiro uuid;
begin
  v_terceiro := public.set_growth_objective_focus(
    pg_temp.id('owner_a'), pg_temp.id('org_a'), pg_temp.id('objetivo_v2'),
    'OFFER', pg_temp.id('oferta_a2'));

  perform pg_temp.registrar('23 trocar de foco arquiva a versao anterior', 'ARCHIVED',
    (select status from public.growth_objectives where id = pg_temp.id('objetivo_v2')));

  perform pg_temp.registrar('24 continua existindo um unico ACTIVE', '1',
    (select count(*)::text from public.growth_objectives
      where organization_id = pg_temp.id('org_a') and status = 'ACTIVE'));

  perform pg_temp.registrar('25 historico do foco anterior permanece legivel', 'true',
    (select (focus_offer_id = pg_temp.id('oferta_a1'))::text
      from public.growth_objectives where id = pg_temp.id('objetivo_v2')));

  insert into ctx values ('objetivo_v3', v_terceiro);
end $$;

-- Objetivo já arquivado não recebe foco.
do $$
begin
  perform public.set_growth_objective_focus(
    pg_temp.id('owner_a'), pg_temp.id('org_a'), pg_temp.id('objetivo_v2'),
    'BUSINESS', null);

  perform pg_temp.registrar('26 objetivo arquivado nao recebe foco', '42501', 'ACEITOU');
exception when others then
  perform pg_temp.registrar('26 objetivo arquivado nao recebe foco', '42501', sqlstate);
end $$;

-- Arquivar a oferta em bloco próprio: dentro de um bloco com handler, a
-- exceção esperada do caso seguinte desfaria também este arquivamento, e a
-- prova testaria um estado que não é o que ela afirma testar.
select public.archive_business_offer(
  (select valor from ctx where chave = 'owner_a'),
  (select valor from ctx where chave = 'org_a'),
  (select valor from ctx where chave = 'oferta_a1'));

-- Oferta arquivada não pode virar foco novo.
do $$
begin
  perform public.set_growth_objective_focus(
    pg_temp.id('owner_a'), pg_temp.id('org_a'), pg_temp.id('objetivo_v3'),
    'OFFER', pg_temp.id('oferta_a1'));

  perform pg_temp.registrar('27 oferta arquivada nao vira foco', '55000', 'ACEITOU');
exception when others then
  perform pg_temp.registrar('27 oferta arquivada nao vira foco', '55000', sqlstate);
end $$;

-- Arquivar a oferta não apaga o foco já registrado: o passado continua
-- auditável e a decisão nova continua humana (mandato §7).
do $$
begin
  perform pg_temp.registrar('28 oferta arquivada de fato', 'ARCHIVED',
    (select status from public.business_offers where id = pg_temp.id('oferta_a1')));

  perform pg_temp.registrar('28b arquivar oferta nao apaga o foco registrado', 'true',
    (select (focus_offer_id = pg_temp.id('oferta_a1'))::text
      from public.growth_objectives where id = pg_temp.id('objetivo_v2')));
end $$;

-- ---------------------------------------------------------------------------
-- 5. Fronteira do browser
-- ---------------------------------------------------------------------------

select set_config(
  'request.jwt.claims',
  json_build_object('sub', (select valor from ctx where chave = 'owner_a'),
                    'role', 'authenticated')::text,
  true
);
select set_config(
  'request.jwt.claim.sub',
  (select valor::text from ctx where chave = 'owner_a'),
  true
);

set local role authenticated;

do $$
begin
  perform public.set_growth_objective_focus(
    pg_temp.id('owner_a'), pg_temp.id('org_a'), pg_temp.id('objetivo_v3'),
    'BUSINESS', null);

  perform pg_temp.registrar('29 authenticated nao executa a RPC de foco', '42501', 'ACEITOU');
exception when others then
  perform pg_temp.registrar('29 authenticated nao executa a RPC de foco', '42501', sqlstate);
end $$;

do $$
begin
  update public.growth_objectives set focus_type = 'BUSINESS'
   where id = pg_temp.id('objetivo_v3');

  perform pg_temp.registrar('30 authenticated nao escreve foco direto', '42501', 'ACEITOU');
exception when others then
  perform pg_temp.registrar('30 authenticated nao escreve foco direto', '42501', sqlstate);
end $$;

-- A leitura do próprio tenant continua funcionando com as colunas novas.
select pg_temp.registrar('31 membro ACTIVE le o foco da propria organizacao', '1',
  (select count(*)::text from public.growth_objectives
    where status = 'ACTIVE' and focus_type is not null));

reset role;

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
