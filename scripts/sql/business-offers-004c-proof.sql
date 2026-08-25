-- Prova transacional da Rodada 004C — mandato §§12.1, 12.2 e 13.
--
-- Cobre constraints de preço e texto, versionamento, idempotência,
-- autorização por papel/status e RLS real com papel `authenticated`.
--
-- A leitura sob RLS acontece de verdade: `set local role authenticated`,
-- `auth.uid()` simulado por `request.jwt.claims` e consulta **sem filtro de
-- organização** — quem restringe é a policy. Avaliar a expressão da policy
-- como owner reproduziria a condição em SQL sem atravessar a RLS.
--
-- Transacional: `begin … rollback`. Nenhuma fixture sobrevive.
--
-- Uso:
--   npx supabase db query --linked --file scripts/sql/business-offers-004c-proof.sql

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
-- implícito de PUBLIC; sem estes grants os casos executados sob o papel
-- `authenticated` não conseguiriam registrar o que viram.
grant execute on function pg_temp.registrar(text, text, text) to authenticated;
grant execute on function pg_temp.id(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Fixtures: duas organizações, cinco usuários, papéis e status distintos
-- ---------------------------------------------------------------------------

do $$
declare
  v_owner_a uuid;
  v_admin_a uuid;
  v_member_a uuid;
  v_inativo_a uuid;
  v_owner_b uuid;
  v_org_a uuid;
  v_org_b uuid;
  v_org_inativa uuid;
  v_owner_inativa uuid;
begin
  insert into auth.users (id, instance_id, aud, role, email) values
    (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'fixture-004c-owner-a@example.invalid')
    returning id into v_owner_a;
  insert into auth.users (id, instance_id, aud, role, email) values
    (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'fixture-004c-admin-a@example.invalid')
    returning id into v_admin_a;
  insert into auth.users (id, instance_id, aud, role, email) values
    (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'fixture-004c-member-a@example.invalid')
    returning id into v_member_a;
  insert into auth.users (id, instance_id, aud, role, email) values
    (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'fixture-004c-inativo-a@example.invalid')
    returning id into v_inativo_a;
  insert into auth.users (id, instance_id, aud, role, email) values
    (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'fixture-004c-owner-b@example.invalid')
    returning id into v_owner_b;
  insert into auth.users (id, instance_id, aud, role, email) values
    (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'fixture-004c-owner-inativa@example.invalid')
    returning id into v_owner_inativa;

  insert into public.organizations (name) values ('FIXTURE 004C A') returning id into v_org_a;
  insert into public.organizations (name) values ('FIXTURE 004C B') returning id into v_org_b;
  insert into public.organizations (name, status)
    values ('FIXTURE 004C INATIVA', 'INACTIVE') returning id into v_org_inativa;

  insert into public.organization_members (organization_id, user_id, role, status) values
    (v_org_a, v_owner_a, 'owner', 'ACTIVE'),
    (v_org_a, v_admin_a, 'admin', 'ACTIVE'),
    (v_org_a, v_member_a, 'member', 'ACTIVE'),
    (v_org_a, v_inativo_a, 'owner', 'INACTIVE'),
    (v_org_b, v_owner_b, 'owner', 'ACTIVE'),
    (v_org_inativa, v_owner_inativa, 'owner', 'ACTIVE');

  insert into ctx values
    ('owner_a', v_owner_a), ('admin_a', v_admin_a), ('member_a', v_member_a),
    ('inativo_a', v_inativo_a), ('owner_b', v_owner_b),
    ('owner_inativa', v_owner_inativa),
    ('org_a', v_org_a), ('org_b', v_org_b), ('org_inativa', v_org_inativa);
end $$;

-- ---------------------------------------------------------------------------
-- 1. Criação, versionamento e idempotência
-- ---------------------------------------------------------------------------

do $$
declare
  v_offer uuid;
  v_versoes integer;
  v_currency text;
begin
  v_offer := public.save_business_offer(
    pg_temp.id('owner_a'), pg_temp.id('org_a'),
    'Corte de cabelo', 'SERVICE', 'FIXED', null, null, null, 5000, null);

  insert into ctx values ('oferta_a', v_offer);

  select count(*) into v_versoes
  from public.business_offer_versions where offer_id = v_offer;

  perform pg_temp.registrar('01 cria oferta com uma versao v1', '1', v_versoes::text);

  perform pg_temp.registrar(
    '02 v1 e a versao corrente', 'true',
    (exists (select 1 from public.business_offer_versions
      where offer_id = v_offer and version_no = 1 and superseded_at is null))::text);

  -- A moeda persistida é a da organização, e não um parâmetro: a RPC nem
  -- aceita moeda.
  select currency into v_currency
  from public.business_offer_versions where offer_id = v_offer;

  perform pg_temp.registrar('03 moeda persistida e a da organizacao',
    (select default_currency from public.organizations where id = pg_temp.id('org_a')),
    v_currency);
end $$;

do $$
declare
  v_offer uuid;
  v_versoes integer;
begin
  -- Reenvio idêntico: mesma oferta, mesmo conteúdo.
  v_offer := public.save_business_offer(
    pg_temp.id('owner_a'), pg_temp.id('org_a'),
    'Corte de cabelo', 'SERVICE', 'FIXED', pg_temp.id('oferta_a'), null, null, 5000, null);

  select count(*) into v_versoes
  from public.business_offer_versions where offer_id = pg_temp.id('oferta_a');

  perform pg_temp.registrar('04 reenvio identico nao cria versao falsa', '1', v_versoes::text);
  perform pg_temp.registrar('05 reenvio identico devolve a mesma oferta',
    pg_temp.id('oferta_a')::text, v_offer::text);
end $$;

do $$
declare
  v_versoes integer;
  v_correntes integer;
begin
  -- Edição material: muda o preço.
  perform public.save_business_offer(
    pg_temp.id('owner_a'), pg_temp.id('org_a'),
    'Corte de cabelo', 'SERVICE', 'FIXED', pg_temp.id('oferta_a'), null, null, 7000, null);

  select count(*) into v_versoes
  from public.business_offer_versions where offer_id = pg_temp.id('oferta_a');

  select count(*) into v_correntes
  from public.business_offer_versions
  where offer_id = pg_temp.id('oferta_a') and superseded_at is null;

  perform pg_temp.registrar('06 edicao material cria v2', '2', v_versoes::text);
  perform pg_temp.registrar('07 existe exatamente uma versao corrente', '1', v_correntes::text);

  perform pg_temp.registrar('08 v1 foi arquivada com timestamp', 'true',
    (exists (select 1 from public.business_offer_versions
      where offer_id = pg_temp.id('oferta_a') and version_no = 1
        and superseded_at is not null))::text);

  -- O passado continua legível: é para isso que a tabela de versões existe.
  perform pg_temp.registrar('09 preco anterior permanece legivel em v1', '5000',
    (select price_min_minor::text from public.business_offer_versions
      where offer_id = pg_temp.id('oferta_a') and version_no = 1));

  perform pg_temp.registrar('10 versao corrente e a v2', '2',
    (select version_no::text from public.business_offer_versions
      where offer_id = pg_temp.id('oferta_a') and superseded_at is null));
end $$;

-- Duas versões correntes na mesma oferta são impossíveis no banco.
do $$
begin
  insert into public.business_offer_versions (
    organization_id, offer_id, version_no, name, offer_type, price_mode,
    price_min_minor, currency)
  values (pg_temp.id('org_a'), pg_temp.id('oferta_a'), 99, 'Duplicata',
    'SERVICE', 'FIXED', 100, 'BRL');

  perform pg_temp.registrar('11 duas versoes correntes na mesma oferta', '23505', 'ACEITOU');
exception when others then
  perform pg_temp.registrar('11 duas versoes correntes na mesma oferta', '23505', sqlstate);
end $$;

-- Versão apontando para oferta de outro tenant.
--
-- `version_no` alto e `superseded_at` preenchido de propósito: com número 1 a
-- unique de versão dispararia primeiro, e o caso passaria sem nunca ter
-- exercitado a FK composta que se quer provar.
do $$
begin
  insert into public.business_offer_versions (
    organization_id, offer_id, version_no, name, offer_type, price_mode,
    price_min_minor, currency, superseded_at)
  values (pg_temp.id('org_b'), pg_temp.id('oferta_a'), 77, 'Cross tenant',
    'SERVICE', 'FIXED', 100, 'BRL', now());

  perform pg_temp.registrar('12 versao aponta para oferta de outro tenant', '23503', 'ACEITOU');
exception when others then
  perform pg_temp.registrar('12 versao aponta para oferta de outro tenant', '23503', sqlstate);
end $$;

-- ---------------------------------------------------------------------------
-- 2. Constraints de preço, texto e taxonomia
-- ---------------------------------------------------------------------------

do $$
declare
  v_casos text[][] := array[
    -- nome do caso, offer_type, price_mode, min, max
    array['13 FIXED com maximo', 'SERVICE', 'FIXED', '5000', '9000'],
    array['14 FIXED sem valor', 'SERVICE', 'FIXED', null, null],
    array['15 STARTING_AT com maximo', 'SERVICE', 'STARTING_AT', '5000', '9000'],
    array['16 STARTING_AT sem valor', 'SERVICE', 'STARTING_AT', null, null],
    array['17 RANGE sem maximo', 'SERVICE', 'RANGE', '5000', null],
    array['18 RANGE invertida', 'SERVICE', 'RANGE', '9000', '5000'],
    array['19 QUOTE com valor', 'SERVICE', 'QUOTE', '5000', null],
    array['20 FREE com valor', 'SERVICE', 'FREE', '0', null],
    array['21 NOT_INFORMED com valor', 'SERVICE', 'NOT_INFORMED', '5000', null],
    array['22 valor negativo', 'SERVICE', 'FIXED', '-1', null],
    array['23 taxonomia de tipo desconhecida', 'SKU', 'FIXED', '5000', null],
    array['24 taxonomia de preco desconhecida', 'SERVICE', 'NEGOTIABLE', '5000', null],
    array['25 valor acima do teto', 'SERVICE', 'FIXED', '100000000001', null]
  ];
  v_caso text[];
  v_offer uuid;
begin
  foreach v_caso slice 1 in array v_casos loop
    begin
      insert into public.business_offers (organization_id, created_by)
      values (pg_temp.id('org_a'), pg_temp.id('owner_a'))
      returning id into v_offer;

      insert into public.business_offer_versions (
        organization_id, offer_id, version_no, name, offer_type, price_mode,
        price_min_minor, price_max_minor, currency)
      values (pg_temp.id('org_a'), v_offer, 1, 'Caso invalido',
        v_caso[2], v_caso[3], v_caso[4]::bigint, v_caso[5]::bigint, 'BRL');

      perform pg_temp.registrar(v_caso[1], '23514', 'ACEITOU');
    exception when others then
      perform pg_temp.registrar(v_caso[1], '23514', sqlstate);
    end;
  end loop;
end $$;

-- Formas válidas de preço são aceitas — a constraint recusa o contraditório,
-- não o legítimo.
do $$
declare
  v_offer uuid;
  v_aceitos integer := 0;
begin
  -- RANGE com extremos iguais, STARTING_AT com mínimo, e os três modos sem
  -- valor numérico.
  v_offer := public.save_business_offer(
    pg_temp.id('owner_a'), pg_temp.id('org_a'),
    'Consultoria', 'SERVICE', 'RANGE', null, null, null, 10000, 10000);
  if v_offer is not null then v_aceitos := v_aceitos + 1; end if;

  v_offer := public.save_business_offer(
    pg_temp.id('owner_a'), pg_temp.id('org_a'),
    'Mentoria', 'PACKAGE', 'STARTING_AT', null, null, null, 30000, null);
  if v_offer is not null then v_aceitos := v_aceitos + 1; end if;

  v_offer := public.save_business_offer(
    pg_temp.id('owner_a'), pg_temp.id('org_a'),
    'Projeto sob medida', 'OTHER', 'QUOTE', null, null, null, null, null);
  if v_offer is not null then v_aceitos := v_aceitos + 1; end if;

  v_offer := public.save_business_offer(
    pg_temp.id('owner_a'), pg_temp.id('org_a'),
    'Diagnostico inicial', 'SERVICE', 'FREE', null, null, null, null, null);
  if v_offer is not null then v_aceitos := v_aceitos + 1; end if;

  v_offer := public.save_business_offer(
    pg_temp.id('owner_a'), pg_temp.id('org_a'),
    'Produto novo', 'PRODUCT', 'NOT_INFORMED', null, null, null, null, null);
  if v_offer is not null then v_aceitos := v_aceitos + 1; end if;

  perform pg_temp.registrar('26 formas validas de preco sao aceitas', '5', v_aceitos::text);
end $$;

-- Texto em branco não passa por nenhum caminho.
do $$
begin
  perform public.save_business_offer(
    pg_temp.id('owner_a'), pg_temp.id('org_a'),
    '   ', 'SERVICE', 'QUOTE', null, null, null, null, null);

  perform pg_temp.registrar('27 nome em branco recusado pela RPC', '22023', 'ACEITOU');
exception when others then
  perform pg_temp.registrar('27 nome em branco recusado pela RPC', '22023', sqlstate);
end $$;

do $$
declare
  v_offer uuid;
begin
  insert into public.business_offers (organization_id, created_by)
  values (pg_temp.id('org_a'), pg_temp.id('owner_a'))
  returning id into v_offer;

  insert into public.business_offer_versions (
    organization_id, offer_id, version_no, name, offer_type, price_mode,
    description, currency)
  values (pg_temp.id('org_a'), v_offer, 1, 'Nome', 'SERVICE', 'QUOTE', '', 'BRL');

  perform pg_temp.registrar('28 descricao vazia recusada pela constraint', '23514', 'ACEITOU');
exception when others then
  perform pg_temp.registrar('28 descricao vazia recusada pela constraint', '23514', sqlstate);
end $$;

-- Estado e timestamp de arquivamento andam juntos.
do $$
begin
  update public.business_offers
     set status = 'ARCHIVED'
   where id = pg_temp.id('oferta_a');

  perform pg_temp.registrar('29 ARCHIVED sem archived_at', '23514', 'ACEITOU');
exception when others then
  perform pg_temp.registrar('29 ARCHIVED sem archived_at', '23514', sqlstate);
end $$;

do $$
begin
  update public.business_offers
     set archived_at = now()
   where id = pg_temp.id('oferta_a');

  perform pg_temp.registrar('30 ACTIVE com archived_at', '23514', 'ACEITOU');
exception when others then
  perform pg_temp.registrar('30 ACTIVE com archived_at', '23514', sqlstate);
end $$;

-- ---------------------------------------------------------------------------
-- 3. Autorização por papel, status e tenant
-- ---------------------------------------------------------------------------

do $$
declare
  v_offer uuid;
begin
  -- admin ACTIVE pode revisar.
  v_offer := public.save_business_offer(
    pg_temp.id('admin_a'), pg_temp.id('org_a'),
    'Corte de cabelo premium', 'SERVICE', 'FIXED', pg_temp.id('oferta_a'),
    null, null, 8000, null);

  perform pg_temp.registrar('31 admin ACTIVE revisa a oferta',
    pg_temp.id('oferta_a')::text, v_offer::text);
end $$;

do $$
declare
  v_casos text[][] := array[
    array['32 member comum nao escreve', 'member_a', 'org_a'],
    array['33 membership INACTIVE nao escreve', 'inativo_a', 'org_a'],
    array['34 organizacao INACTIVE nao escreve', 'owner_inativa', 'org_inativa'],
    array['35 usuario de outra organizacao nao escreve', 'owner_b', 'org_a']
  ];
  v_caso text[];
begin
  foreach v_caso slice 1 in array v_casos loop
    begin
      perform public.save_business_offer(
        pg_temp.id(v_caso[2]), pg_temp.id(v_caso[3]),
        'Tentativa', 'SERVICE', 'QUOTE', null, null, null, null, null);

      perform pg_temp.registrar(v_caso[1], '42501', 'ACEITOU');
    exception when others then
      perform pg_temp.registrar(v_caso[1], '42501', sqlstate);
    end;
  end loop;
end $$;

-- Cross-tenant por id arbitrário: owner de B tentando revisar oferta de A,
-- usando a própria organização.
do $$
begin
  perform public.save_business_offer(
    pg_temp.id('owner_b'), pg_temp.id('org_b'),
    'Sequestro', 'SERVICE', 'QUOTE', pg_temp.id('oferta_a'), null, null, null, null);

  perform pg_temp.registrar('36 revisar oferta de outro tenant por id', '42501', 'ACEITOU');
exception when others then
  perform pg_temp.registrar('36 revisar oferta de outro tenant por id', '42501', sqlstate);
end $$;

-- Arquivamento: idempotente, e oferta arquivada não volta a ser revisada.
do $$
declare
  v_primeira timestamptz;
  v_segunda timestamptz;
begin
  perform public.archive_business_offer(
    pg_temp.id('owner_a'), pg_temp.id('org_a'), pg_temp.id('oferta_a'));

  select archived_at into v_primeira
  from public.business_offers where id = pg_temp.id('oferta_a');

  perform pg_temp.registrar('37 arquivar marca status e timestamp', 'ARCHIVED',
    (select status from public.business_offers where id = pg_temp.id('oferta_a')));

  perform public.archive_business_offer(
    pg_temp.id('owner_a'), pg_temp.id('org_a'), pg_temp.id('oferta_a'));

  select archived_at into v_segunda
  from public.business_offers where id = pg_temp.id('oferta_a');

  perform pg_temp.registrar('38 arquivar de novo e idempotente', 'true',
    (v_primeira = v_segunda)::text);

  -- As versões sobrevivem ao arquivamento.
  perform pg_temp.registrar('39 versoes permanecem apos arquivar', '3',
    (select count(*)::text from public.business_offer_versions
      where offer_id = pg_temp.id('oferta_a')));
end $$;

do $$
begin
  perform public.save_business_offer(
    pg_temp.id('owner_a'), pg_temp.id('org_a'),
    'Revivendo', 'SERVICE', 'QUOTE', pg_temp.id('oferta_a'), null, null, null, null);

  perform pg_temp.registrar('40 oferta arquivada nao e revisada', '55000', 'ACEITOU');
exception when others then
  perform pg_temp.registrar('40 oferta arquivada nao e revisada', '55000', sqlstate);
end $$;

-- ---------------------------------------------------------------------------
-- 4. RLS real, com papel authenticated
-- ---------------------------------------------------------------------------

-- Uma oferta em cada organização, para que "não vê a outra" tenha o que não
-- ver.
do $$
begin
  insert into ctx values ('oferta_b', public.save_business_offer(
    pg_temp.id('owner_b'), pg_temp.id('org_b'),
    'Oferta da concorrente', 'PRODUCT', 'FIXED', null, null, null, 12345, null));
end $$;

select set_config(
  'request.jwt.claims',
  json_build_object('sub', (select valor from ctx where chave = 'member_a'),
                    'role', 'authenticated')::text,
  true
);
select set_config(
  'request.jwt.claim.sub',
  (select valor::text from ctx where chave = 'member_a'),
  true
);

set local role authenticated;

-- Sem `where organization_id = ...`: quem restringe é a policy.
select pg_temp.registrar('41 membro ACTIVE le ofertas da propria organizacao', 'true',
  (select (count(*) > 0)::text from public.business_offers o
    join ctx c on c.chave = 'org_a' and o.organization_id = c.valor));

select pg_temp.registrar('42 membro nao le ofertas de outra organizacao', '0',
  (select count(*)::text from public.business_offers o
    join ctx c on c.chave = 'org_b' and o.organization_id = c.valor));

select pg_temp.registrar('43 membro nao le versoes de outra organizacao', '0',
  (select count(*)::text from public.business_offer_versions v
    join ctx c on c.chave = 'org_b' and v.organization_id = c.valor));

do $$
begin
  insert into public.business_offers (organization_id)
  values (pg_temp.id('org_a'));

  perform pg_temp.registrar('44 authenticated nao insere oferta', '42501', 'ACEITOU');
exception when others then
  perform pg_temp.registrar('44 authenticated nao insere oferta', '42501', sqlstate);
end $$;

do $$
begin
  insert into public.business_offer_versions (
    organization_id, offer_id, version_no, name, offer_type, price_mode, currency)
  values (pg_temp.id('org_a'), pg_temp.id('oferta_a'), 90, 'Direto',
    'SERVICE', 'QUOTE', 'BRL');

  perform pg_temp.registrar('45 authenticated nao insere versao', '42501', 'ACEITOU');
exception when others then
  perform pg_temp.registrar('45 authenticated nao insere versao', '42501', sqlstate);
end $$;

do $$
begin
  update public.business_offer_versions set name = 'Alterado'
   where offer_id = pg_temp.id('oferta_a');

  perform pg_temp.registrar('46 authenticated nao atualiza versao', '42501', 'ACEITOU');
exception when others then
  perform pg_temp.registrar('46 authenticated nao atualiza versao', '42501', sqlstate);
end $$;

do $$
begin
  delete from public.business_offers where id = pg_temp.id('oferta_a');

  perform pg_temp.registrar('47 authenticated nao apaga oferta', '42501', 'ACEITOU');
exception when others then
  perform pg_temp.registrar('47 authenticated nao apaga oferta', '42501', sqlstate);
end $$;

do $$
begin
  perform public.save_business_offer(
    pg_temp.id('member_a'), pg_temp.id('org_a'),
    'Pelo browser', 'SERVICE', 'QUOTE', null, null, null, null, null);

  perform pg_temp.registrar('48 authenticated nao executa save_business_offer', '42501', 'ACEITOU');
exception when others then
  perform pg_temp.registrar('48 authenticated nao executa save_business_offer', '42501', sqlstate);
end $$;

do $$
begin
  perform public.archive_business_offer(
    pg_temp.id('member_a'), pg_temp.id('org_a'), pg_temp.id('oferta_a'));

  perform pg_temp.registrar('49 authenticated nao executa archive_business_offer', '42501', 'ACEITOU');
exception when others then
  perform pg_temp.registrar('49 authenticated nao executa archive_business_offer', '42501', sqlstate);
end $$;

reset role;

-- Membership INACTIVE e organização INACTIVE não leem.
update public.organization_members m set status = 'INACTIVE'
 where m.user_id = pg_temp.id('member_a');

set local role authenticated;

select pg_temp.registrar('50 membership INACTIVE nao le nada', '0',
  (select count(*)::text from public.business_offers));

reset role;

update public.organization_members m set status = 'ACTIVE'
 where m.user_id = pg_temp.id('member_a');

update public.organizations o set status = 'INACTIVE'
 where o.id = pg_temp.id('org_a');

set local role authenticated;

select pg_temp.registrar('51 organizacao INACTIVE nao le nada', '0',
  (select count(*)::text from public.business_offers));

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
