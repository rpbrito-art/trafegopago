-- Prova RLS focada — Correção 004B-01 §6.
--
-- A prova da 004B verificou a expressão da policy **como owner**, o que na
-- prática reproduzia a condição em SQL sem atravessar a RLS. Aqui a leitura
-- acontece de verdade: papel `authenticated`, `auth.uid()` simulado por
-- `request.jwt.claims`, e a consulta a `growth_objectives` sem nenhum filtro
-- de organização — quem filtra é a policy.
--
-- Transacional: `begin … rollback`. Nenhuma fixture sobrevive.
--
-- Uso:
--   npx supabase db query --linked --file scripts/sql/growth-objectives-rls-004b01-proof.sql

begin;

create temporary table ctx_004b01 (chave text primary key, valor uuid) on commit drop;

create temporary table prova_rls (
  ordem serial,
  nome text,
  esperado text,
  obtido text,
  passou boolean
) on commit drop;

-- O papel autenticado precisa alcançar as temporárias para registrar o que viu.
grant all on ctx_004b01, prova_rls to authenticated;
grant all on sequence prova_rls_ordem_seq to authenticated;

do $$
declare
  usuario_a uuid;
  usuario_b uuid;
  org_a uuid;
  org_b uuid;
begin
  insert into auth.users (id, instance_id, aud, role, email)
    values (gen_random_uuid(), '00000000-0000-0000-0000-000000000000',
            'authenticated', 'authenticated', 'fixture-rls-a@example.invalid')
    returning id into usuario_a;
  insert into auth.users (id, instance_id, aud, role, email)
    values (gen_random_uuid(), '00000000-0000-0000-0000-000000000000',
            'authenticated', 'authenticated', 'fixture-rls-b@example.invalid')
    returning id into usuario_b;

  insert into public.organizations (name) values ('FIXTURE RLS A') returning id into org_a;
  insert into public.organizations (name) values ('FIXTURE RLS B') returning id into org_b;

  insert into public.organization_members (organization_id, user_id, role, status)
    values (org_a, usuario_a, 'owner', 'ACTIVE'),
           (org_b, usuario_b, 'owner', 'ACTIVE');

  -- Um objetivo em cada organização. O de B é o que o usuário A não pode ver.
  perform public.set_active_growth_objective(
    usuario_a, org_a, 'LEADS', 'WHATSAPP', 'CONVERSATION_STARTED');
  perform public.set_active_growth_objective(
    usuario_b, org_b, 'SALES', 'WEBSITE', 'PURCHASE');

  insert into ctx_004b01 values
    ('usuario_a', usuario_a), ('usuario_b', usuario_b),
    ('org_a', org_a), ('org_b', org_b);
end $$;

-- ---------------------------------------------------------------------------
-- Leitura real sob RLS, como usuário A
-- ---------------------------------------------------------------------------

select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', (select valor from ctx_004b01 where chave = 'usuario_a'),
    'role', 'authenticated'
  )::text,
  true
);
select set_config(
  'request.jwt.claim.sub',
  (select valor::text from ctx_004b01 where chave = 'usuario_a'),
  true
);

set local role authenticated;

-- Sem `where organization_id = ...`: quem restringe é a policy. Se a RLS não
-- estivesse funcionando, este count devolveria os dois objetivos.
insert into prova_rls (nome, esperado, obtido, passou)
select 'usuario A ve exatamente 1 objetivo (o seu)', '1', count(*)::text, count(*) = 1
  from public.growth_objectives;

insert into prova_rls (nome, esperado, obtido, passou)
select 'o objetivo visto pertence a organizacao A', '1', count(*)::text, count(*) = 1
  from public.growth_objectives g
  join ctx_004b01 c on c.chave = 'org_a' and g.organization_id = c.valor;

insert into prova_rls (nome, esperado, obtido, passou)
select 'usuario A nao ve objetivo da organizacao B', '0', count(*)::text, count(*) = 0
  from public.growth_objectives g
  join ctx_004b01 c on c.chave = 'org_b' and g.organization_id = c.valor;

reset role;

-- ---------------------------------------------------------------------------
-- Membership de A fica INACTIVE — a leitura deve zerar
-- ---------------------------------------------------------------------------

update public.organization_members m
   set status = 'INACTIVE'
  from ctx_004b01 c
 where c.chave = 'usuario_a' and m.user_id = c.valor;

set local role authenticated;

insert into prova_rls (nome, esperado, obtido, passou)
select 'membership INACTIVE nao le nada', '0', count(*)::text, count(*) = 0
  from public.growth_objectives;

reset role;

-- ---------------------------------------------------------------------------
-- Organização inativa também zera a leitura
-- ---------------------------------------------------------------------------

update public.organization_members m
   set status = 'ACTIVE'
  from ctx_004b01 c
 where c.chave = 'usuario_a' and m.user_id = c.valor;

update public.organizations o
   set status = 'INACTIVE'
  from ctx_004b01 c
 where c.chave = 'org_a' and o.id = c.valor;

set local role authenticated;

insert into prova_rls (nome, esperado, obtido, passou)
select 'organizacao INACTIVE nao le nada', '0', count(*)::text, count(*) = 0
  from public.growth_objectives;

-- Escrita direta pelo browser deve falhar por ausência de grant, mesmo com a
-- membership restaurada.
do $$
begin
  insert into public.growth_objectives (
    organization_id, objective_type, destination_type, success_event_type)
  select c.valor, 'SALES', 'WEBSITE', 'PURCHASE'
    from ctx_004b01 c where c.chave = 'org_a';

  insert into prova_rls (nome, esperado, obtido, passou)
    values ('authenticated nao insere em growth_objectives','42501','ACEITOU',false);
exception when others then
  insert into prova_rls (nome, esperado, obtido, passou)
    values ('authenticated nao insere em growth_objectives','42501',sqlstate,sqlstate='42501');
end $$;

-- A RPC também não é alcançável pelo browser.
do $$
begin
  perform public.set_active_growth_objective(
    (select valor from ctx_004b01 where chave = 'usuario_a'),
    (select valor from ctx_004b01 where chave = 'org_a'),
    'SALES', 'WEBSITE', 'PURCHASE');

  insert into prova_rls (nome, esperado, obtido, passou)
    values ('authenticated nao executa a RPC','42501','ACEITOU',false);
exception when others then
  insert into prova_rls (nome, esperado, obtido, passou)
    values ('authenticated nao executa a RPC','42501',sqlstate,sqlstate='42501');
end $$;

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
from prova_rls;

rollback;
