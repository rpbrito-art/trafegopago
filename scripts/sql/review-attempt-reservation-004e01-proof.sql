-- Prova transacional da Correção 004E-01 — mandato §4.4.
--
-- O que se prova aqui é o contrato da reserva no banco, que é onde a
-- atomicidade realmente vive: índice único para o in-flight, contagem sob
-- advisory lock, expiração recuperável e autorização por papel.
--
-- Transacional: `begin … rollback`. Nenhuma fixture sobrevive.
--
-- Uso:
--   npx supabase db query --linked --file scripts/sql/review-attempt-reservation-004e01-proof.sql

begin;

create temporary table ctx (chave text primary key, valor uuid) on commit drop;

create temporary table prova (
  ordem serial,
  nome text,
  esperado text,
  obtido text,
  passou boolean
) on commit drop;

grant all on ctx, prova to authenticated, service_role;
grant all on sequence prova_ordem_seq to authenticated, service_role;

create function pg_temp.registrar(p_nome text, p_esperado text, p_obtido text)
returns void language sql as $$
  insert into prova (nome, esperado, obtido, passou)
  values (p_nome, p_esperado, p_obtido, p_esperado = p_obtido);
$$;

create function pg_temp.id(p_chave text) returns uuid language sql stable as $$
  select valor from ctx where chave = p_chave;
$$;

grant execute on function pg_temp.registrar(text, text, text) to authenticated, service_role;
grant execute on function pg_temp.id(text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Fixtures
-- ---------------------------------------------------------------------------

do $$
declare
  v_owner uuid;
  v_member uuid;
  v_owner_b uuid;
  v_org_a uuid;
  v_org_b uuid;
begin
  insert into auth.users (id, instance_id, aud, role, email) values
    (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'fixture-004e01-owner@example.invalid')
    returning id into v_owner;
  insert into auth.users (id, instance_id, aud, role, email) values
    (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'fixture-004e01-member@example.invalid')
    returning id into v_member;
  insert into auth.users (id, instance_id, aud, role, email) values
    (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'fixture-004e01-owner-b@example.invalid')
    returning id into v_owner_b;

  insert into public.organizations (name) values ('FIXTURE 004E01 A') returning id into v_org_a;
  insert into public.organizations (name) values ('FIXTURE 004E01 B') returning id into v_org_b;

  insert into public.organization_members (organization_id, user_id, role, status) values
    (v_org_a, v_owner, 'owner', 'ACTIVE'),
    (v_org_a, v_member, 'member', 'ACTIVE'),
    (v_org_b, v_owner_b, 'owner', 'ACTIVE');

  insert into ctx values
    ('owner', v_owner), ('member', v_member), ('owner_b', v_owner_b),
    ('org_a', v_org_a), ('org_b', v_org_b);
end $$;

-- ---------------------------------------------------------------------------
-- 1. Aquisição, in-flight e teto
-- ---------------------------------------------------------------------------

do $$
declare
  v_outcome text;
  v_id uuid;
begin
  select outcome, attempt_id into v_outcome, v_id
  from public.acquire_declared_context_review_slot(
    pg_temp.id('owner'), pg_temp.id('org_a'), 'fp-1',
    'DECLARED_BUSINESS_CONTEXT_REVIEW', 'v1', 'v1', 'v1');

  perform pg_temp.registrar('01 primeira aquisicao reserva', 'RESERVED', v_outcome);
  perform pg_temp.registrar('02 reserva devolve identificador', 'true', (v_id is not null)::text);

  insert into ctx values ('tentativa_1', v_id);
end $$;

-- Segunda aquisição do **mesmo** contexto, com a primeira ainda em andamento.
do $$
declare
  v_outcome text;
begin
  select outcome into v_outcome
  from public.acquire_declared_context_review_slot(
    pg_temp.id('owner'), pg_temp.id('org_a'), 'fp-1',
    'DECLARED_BUSINESS_CONTEXT_REVIEW', 'v1', 'v1', 'v1');

  perform pg_temp.registrar('03 mesmo contexto em andamento nao reserva de novo',
    'IN_FLIGHT', v_outcome);
end $$;

-- É o índice único, e não a aplicação, que impede duas reservas do mesmo
-- contexto — inclusive por caminho direto.
do $$
begin
  insert into public.declared_context_review_attempts (
    organization_id, input_fingerprint, task_type, task_version,
    prompt_version, schema_version, status, expires_at)
  values (
    pg_temp.id('org_a'), 'fp-1', 'DECLARED_BUSINESS_CONTEXT_REVIEW',
    'v1', 'v1', 'v1', 'RESERVED', now() + interval '2 minutes');

  perform pg_temp.registrar('04 duas reservas in-flight do mesmo contexto', '23505', 'ACEITOU');
exception when others then
  perform pg_temp.registrar('04 duas reservas in-flight do mesmo contexto', '23505', sqlstate);
end $$;

-- Teto da janela: mais dois contextos distintos cabem, o quarto não.
do $$
declare
  v_outcome text;
begin
  select outcome into v_outcome from public.acquire_declared_context_review_slot(
    pg_temp.id('owner'), pg_temp.id('org_a'), 'fp-2',
    'DECLARED_BUSINESS_CONTEXT_REVIEW', 'v1', 'v1', 'v1');
  perform pg_temp.registrar('05 segundo contexto reserva', 'RESERVED', v_outcome);

  select outcome into v_outcome from public.acquire_declared_context_review_slot(
    pg_temp.id('owner'), pg_temp.id('org_a'), 'fp-3',
    'DECLARED_BUSINESS_CONTEXT_REVIEW', 'v1', 'v1', 'v1');
  perform pg_temp.registrar('06 terceiro contexto reserva', 'RESERVED', v_outcome);

  select outcome into v_outcome from public.acquire_declared_context_review_slot(
    pg_temp.id('owner'), pg_temp.id('org_a'), 'fp-4',
    'DECLARED_BUSINESS_CONTEXT_REVIEW', 'v1', 'v1', 'v1');
  perform pg_temp.registrar('07 quarto contexto e recusado pelo teto', 'RATE_LIMITED', v_outcome);
end $$;

-- Tenant B não herda a cota de A.
do $$
declare
  v_outcome text;
begin
  select outcome into v_outcome from public.acquire_declared_context_review_slot(
    pg_temp.id('owner_b'), pg_temp.id('org_b'), 'fp-1',
    'DECLARED_BUSINESS_CONTEXT_REVIEW', 'v1', 'v1', 'v1');

  perform pg_temp.registrar('08 outro tenant tem cota propria', 'RESERVED', v_outcome);
end $$;

-- ---------------------------------------------------------------------------
-- 2. Autorização
-- ---------------------------------------------------------------------------

do $$
begin
  perform public.acquire_declared_context_review_slot(
    pg_temp.id('member'), pg_temp.id('org_a'), 'fp-member',
    'DECLARED_BUSINESS_CONTEXT_REVIEW', 'v1', 'v1', 'v1');

  perform pg_temp.registrar('09 member nao adquire reserva', '42501', 'ACEITOU');
exception when others then
  perform pg_temp.registrar('09 member nao adquire reserva', '42501', sqlstate);
end $$;

do $$
begin
  perform public.acquire_declared_context_review_slot(
    pg_temp.id('owner_b'), pg_temp.id('org_a'), 'fp-cross',
    'DECLARED_BUSINESS_CONTEXT_REVIEW', 'v1', 'v1', 'v1');

  perform pg_temp.registrar('10 usuario de outro tenant nao adquire', '42501', 'ACEITOU');
exception when others then
  perform pg_temp.registrar('10 usuario de outro tenant nao adquire', '42501', sqlstate);
end $$;

-- ---------------------------------------------------------------------------
-- 3. Expiração recuperável
-- ---------------------------------------------------------------------------

-- Reserva órfã — processo morto no meio — não pode travar o contexto. Ao
-- vencer, a próxima aquisição a expira e segue.
do $$
declare
  v_outcome text;
begin
  update public.declared_context_review_attempts
     set expires_at = now() - interval '1 minute'
   where id = pg_temp.id('tentativa_1');

  -- A janela do teto também é recuada, senão o limite mascararia o resultado.
  update public.declared_context_review_attempts
     set reserved_at = now() - interval '2 hours'
   where organization_id = pg_temp.id('org_a');

  select outcome into v_outcome from public.acquire_declared_context_review_slot(
    pg_temp.id('owner'), pg_temp.id('org_a'), 'fp-1',
    'DECLARED_BUSINESS_CONTEXT_REVIEW', 'v1', 'v1', 'v1');

  perform pg_temp.registrar('11 reserva vencida e recuperavel', 'RESERVED', v_outcome);

  perform pg_temp.registrar('12 reserva vencida virou EXPIRED', 'EXPIRED',
    (select status from public.declared_context_review_attempts
      where id = pg_temp.id('tentativa_1')));
end $$;

-- ---------------------------------------------------------------------------
-- 4. Finalização
-- ---------------------------------------------------------------------------

do $$
declare
  v_id uuid;
  v_ok boolean;
begin
  select id into v_id from public.declared_context_review_attempts
   where organization_id = pg_temp.id('org_a') and status = 'RESERVED'
   limit 1;

  v_ok := public.finalize_declared_context_review_attempt(
    v_id, pg_temp.id('org_a'), 'COMPLETED', null);

  perform pg_temp.registrar('13 finalizacao fecha a reserva', 'true', v_ok::text);
  perform pg_temp.registrar('14 status virou COMPLETED', 'COMPLETED',
    (select status from public.declared_context_review_attempts where id = v_id));

  -- Fechar de novo não reabre nem altera: só alcança `RESERVED`.
  v_ok := public.finalize_declared_context_review_attempt(
    v_id, pg_temp.id('org_a'), 'FAILED', null);

  perform pg_temp.registrar('15 refinalizar nao altera desfecho', 'false', v_ok::text);
  perform pg_temp.registrar('16 status permanece COMPLETED', 'COMPLETED',
    (select status from public.declared_context_review_attempts where id = v_id));
end $$;

-- Finalizar tentativa de outro tenant não alcança nada.
do $$
declare
  v_id uuid;
  v_ok boolean;
begin
  select id into v_id from public.declared_context_review_attempts
   where organization_id = pg_temp.id('org_b') limit 1;

  v_ok := public.finalize_declared_context_review_attempt(
    v_id, pg_temp.id('org_a'), 'COMPLETED', null);

  perform pg_temp.registrar('17 finalizar tentativa de outro tenant falha', 'false', v_ok::text);
end $$;

do $$
begin
  perform public.finalize_declared_context_review_attempt(
    pg_temp.id('tentativa_1'), pg_temp.id('org_a'), 'RESERVED', null);

  perform pg_temp.registrar('18 status de finalizacao invalido e recusado', '22023', 'ACEITOU');
exception when others then
  perform pg_temp.registrar('18 status de finalizacao invalido e recusado', '22023', sqlstate);
end $$;

-- ---------------------------------------------------------------------------
-- 5. Fronteira do browser e privilégio
-- ---------------------------------------------------------------------------

set local role service_role;

do $$
begin
  update public.declared_context_review_attempts
     set input_fingerprint = 'reescrito'
   where id = pg_temp.id('tentativa_1');

  perform pg_temp.registrar('19 service_role nao reescreve identidade da tentativa', '42501', 'ACEITOU');
exception when others then
  perform pg_temp.registrar('19 service_role nao reescreve identidade da tentativa', '42501', sqlstate);
end $$;

do $$
begin
  delete from public.declared_context_review_attempts where id = pg_temp.id('tentativa_1');

  perform pg_temp.registrar('20 service_role nao apaga tentativa', '42501', 'ACEITOU');
exception when others then
  perform pg_temp.registrar('20 service_role nao apaga tentativa', '42501', sqlstate);
end $$;

reset role;

select set_config(
  'request.jwt.claims',
  json_build_object('sub', (select valor from ctx where chave = 'owner'),
                    'role', 'authenticated')::text,
  true
);
select set_config(
  'request.jwt.claim.sub',
  (select valor::text from ctx where chave = 'owner'),
  true
);

set local role authenticated;

do $$
begin
  perform 1 from public.declared_context_review_attempts limit 1;

  perform pg_temp.registrar('21 authenticated nao le tentativas', '42501', 'ACEITOU');
exception when others then
  perform pg_temp.registrar('21 authenticated nao le tentativas', '42501', sqlstate);
end $$;

do $$
begin
  perform public.acquire_declared_context_review_slot(
    pg_temp.id('owner'), pg_temp.id('org_a'), 'fp-browser',
    'DECLARED_BUSINESS_CONTEXT_REVIEW', 'v1', 'v1', 'v1');

  perform pg_temp.registrar('22 authenticated nao executa a RPC de reserva', '42501', 'ACEITOU');
exception when others then
  perform pg_temp.registrar('22 authenticated nao executa a RPC de reserva', '42501', sqlstate);
end $$;

do $$
begin
  perform public.finalize_declared_context_review_attempt(
    pg_temp.id('tentativa_1'), pg_temp.id('org_a'), 'COMPLETED', null);

  perform pg_temp.registrar('23 authenticated nao executa a RPC de finalizacao', '42501', 'ACEITOU');
exception when others then
  perform pg_temp.registrar('23 authenticated nao executa a RPC de finalizacao', '42501', sqlstate);
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
from prova;

rollback;
