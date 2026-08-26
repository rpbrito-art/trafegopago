-- Prova transacional da Rodada 004E — mandato §§7, 8 e 13.
--
-- Cobre o catálogo real (provider/modelo/preço), a coerência entre catálogo e
-- adapter registrado, o artefato tenant-safe, imutabilidade, cache por
-- fingerprint e fronteira do browser.
--
-- Transacional: `begin … rollback`. Nenhuma fixture sobrevive.
--
-- Uso:
--   npx supabase db query --linked --file scripts/sql/declared-context-review-004e-proof.sql

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
-- 1. Catálogo real
-- ---------------------------------------------------------------------------

select pg_temp.registrar('01 provider real catalogado e ACTIVE', 'ACTIVE',
  (select status from public.ai_providers where key = 'google_gemini'));

-- Nenhum segredo em tabela de domínio: a chave vive em variável de ambiente.
select pg_temp.registrar('02 config do provider nao contem segredo', 'false',
  (select (config_metadata::text ~* '(api[_-]?key|secret|token|bearer)')::text
     from public.ai_providers where key = 'google_gemini'));

select pg_temp.registrar('03 provider nao autoriza free tier', 'false',
  (select config_metadata->>'free_tier_authorized'
     from public.ai_providers where key = 'google_gemini'));

select pg_temp.registrar('04 modelo real catalogado no tier 1', '1',
  (select m.tier::text from public.ai_models m
     join public.ai_providers p on p.id = m.provider_id
    where p.key = 'google_gemini' and m.model_key = 'gemini-2.5-flash-lite'));

select pg_temp.registrar('05 modelo suporta structured output', 'true',
  (select m.supports_structured_output::text from public.ai_models m
     join public.ai_providers p on p.id = m.provider_id
    where p.key = 'google_gemini' and m.model_key = 'gemini-2.5-flash-lite'));

-- As capacidades exigidas pela task precisam existir no catálogo, ou o Router
-- não encontraria candidato e a feature falharia sem ter chamado ninguém.
select pg_temp.registrar('06 modelo declara as capacidades da task', 'true',
  (select (m.capability_tags @> array['STRUCTURED_EXTRACTION','JSON_SCHEMA_NATIVE','LOW_COST'])::text
     from public.ai_models m
     join public.ai_providers p on p.id = m.provider_id
    where p.key = 'google_gemini' and m.model_key = 'gemini-2.5-flash-lite'));

select pg_temp.registrar('07 preco vigente em USD por 1M tokens', '0.100000000000|0.400000000000|0.010000000000|USD',
  (select v.input_price_per_million::text || '|' || v.output_price_per_million::text
       || '|' || v.cached_input_price_per_million::text || '|' || v.currency
     from public.ai_price_versions v
     join public.ai_models m on m.id = v.ai_model_id
     join public.ai_providers p on p.id = m.provider_id
    where p.key = 'google_gemini' and m.model_key = 'gemini-2.5-flash-lite'
      and v.effective_to is null));

select pg_temp.registrar('08 preco cita a fonte oficial e a data de verificacao', 'true',
  (select (v.source_note like '%ai.google.dev%' and v.source_note like '%2026-08-25%')::text
     from public.ai_price_versions v
     join public.ai_models m on m.id = v.ai_model_id
     join public.ai_providers p on p.id = m.provider_id
    where p.key = 'google_gemini' and m.model_key = 'gemini-2.5-flash-lite'
      and v.effective_to is null));

-- Uma única versão aberta: duas tornariam o custo desta chamada uma escolha em
-- vez de um cálculo, e o Router falha fechado nesse caso.
select pg_temp.registrar('09 uma unica versao de preco aberta', '1',
  (select count(*)::text from public.ai_price_versions v
     join public.ai_models m on m.id = v.ai_model_id
     join public.ai_providers p on p.id = m.provider_id
    where p.key = 'google_gemini' and v.effective_to is null));

-- ---------------------------------------------------------------------------
-- 2. Fixtures do artefato
-- ---------------------------------------------------------------------------

do $$
declare
  v_owner uuid;
  v_org_a uuid;
  v_org_b uuid;
  v_owner_b uuid;
  v_model uuid;
  v_provider uuid;
  v_price uuid;
  v_run_a uuid;
  v_run_b uuid;
begin
  insert into auth.users (id, instance_id, aud, role, email) values
    (gen_random_uuid(), '00000000-0000-0000-0000-000000000000',
     'authenticated', 'authenticated', 'fixture-004e-a@example.invalid')
    returning id into v_owner;
  insert into auth.users (id, instance_id, aud, role, email) values
    (gen_random_uuid(), '00000000-0000-0000-0000-000000000000',
     'authenticated', 'authenticated', 'fixture-004e-b@example.invalid')
    returning id into v_owner_b;

  insert into public.organizations (name) values ('FIXTURE 004E A') returning id into v_org_a;
  insert into public.organizations (name) values ('FIXTURE 004E B') returning id into v_org_b;

  insert into public.organization_members (organization_id, user_id, role, status) values
    (v_org_a, v_owner, 'owner', 'ACTIVE'),
    (v_org_b, v_owner_b, 'owner', 'ACTIVE');

  select m.id, m.provider_id into v_model, v_provider
  from public.ai_models m
  join public.ai_providers p on p.id = m.provider_id
  where p.key = 'google_gemini' and m.model_key = 'gemini-2.5-flash-lite';

  select v.id into v_price
  from public.ai_price_versions v
  where v.ai_model_id = v_model and v.effective_to is null;

  -- Dois runs reais de ledger, um por organização.
  insert into public.ai_runs (
    organization_id, correlation_id, task_type, task_version, provider_id,
    ai_model_id, ai_price_version_id, tier, prompt_version, schema_version, status)
  values (v_org_a, gen_random_uuid(), 'DECLARED_BUSINESS_CONTEXT_REVIEW', 'v1',
          v_provider, v_model, v_price, 1, 'v1', 'v1', 'STARTED')
  returning id into v_run_a;

  insert into public.ai_runs (
    organization_id, correlation_id, task_type, task_version, provider_id,
    ai_model_id, ai_price_version_id, tier, prompt_version, schema_version, status)
  values (v_org_b, gen_random_uuid(), 'DECLARED_BUSINESS_CONTEXT_REVIEW', 'v1',
          v_provider, v_model, v_price, 1, 'v1', 'v1', 'STARTED')
  returning id into v_run_b;

  insert into ctx values
    ('owner_a', v_owner), ('owner_b', v_owner_b),
    ('org_a', v_org_a), ('org_b', v_org_b),
    ('run_a', v_run_a), ('run_b', v_run_b);
end $$;

-- ---------------------------------------------------------------------------
-- 3. Artefato: tenant-safety e cache
-- ---------------------------------------------------------------------------

do $$
declare
  v_id uuid;
begin
  insert into public.declared_context_reviews (
    organization_id, input_fingerprint, task_type, task_version,
    prompt_version, schema_version, ai_run_id, input_snapshot_json, review_json)
  values (
    pg_temp.id('org_a'), 'fingerprint-a', 'DECLARED_BUSINESS_CONTEXT_REVIEW',
    'v1', 'v1', 'v1', pg_temp.id('run_a'),
    '{"snapshotVersion":"1","facts":[]}'::jsonb,
    '{"summary":"ok"}'::jsonb)
  returning id into v_id;

  insert into ctx values ('review_a', v_id);

  perform pg_temp.registrar('10 revisao criada para a organizacao', '1',
    (select count(*)::text from public.declared_context_reviews
      where organization_id = pg_temp.id('org_a')));
end $$;

-- Mesmo fingerprint e mesmas versões na mesma organização: o índice único é o
-- que garante que o cache tenha uma resposta só.
do $$
begin
  insert into public.declared_context_reviews (
    organization_id, input_fingerprint, task_type, task_version,
    prompt_version, schema_version, ai_run_id, input_snapshot_json, review_json)
  values (
    pg_temp.id('org_a'), 'fingerprint-a', 'DECLARED_BUSINESS_CONTEXT_REVIEW',
    'v1', 'v1', 'v1', pg_temp.id('run_a'),
    '{"snapshotVersion":"1","facts":[]}'::jsonb,
    '{"summary":"duplicada"}'::jsonb);

  perform pg_temp.registrar('11 mesmo fingerprint nao duplica revisao', '23505', 'ACEITOU');
exception when others then
  perform pg_temp.registrar('11 mesmo fingerprint nao duplica revisao', '23505', sqlstate);
end $$;

-- O mesmo fingerprint em outra organização é outra revisão: cache nunca cruza
-- tenant.
do $$
begin
  insert into public.declared_context_reviews (
    organization_id, input_fingerprint, task_type, task_version,
    prompt_version, schema_version, ai_run_id, input_snapshot_json, review_json)
  values (
    pg_temp.id('org_b'), 'fingerprint-a', 'DECLARED_BUSINESS_CONTEXT_REVIEW',
    'v1', 'v1', 'v1', pg_temp.id('run_b'),
    '{"snapshotVersion":"1","facts":[]}'::jsonb,
    '{"summary":"da organizacao B"}'::jsonb);

  perform pg_temp.registrar('12 mesmo fingerprint em outro tenant e permitido', '2',
    (select count(*)::text from public.declared_context_reviews
      where input_fingerprint = 'fingerprint-a'));
exception when others then
  perform pg_temp.registrar('12 mesmo fingerprint em outro tenant e permitido', '2',
    'FALHOU ' || sqlstate);
end $$;

-- Revisão de um tenant apontando para o run de outro: recusado pela FK
-- composta, não por código de aplicação.
do $$
begin
  insert into public.declared_context_reviews (
    organization_id, input_fingerprint, task_type, task_version,
    prompt_version, schema_version, ai_run_id, input_snapshot_json, review_json)
  values (
    pg_temp.id('org_a'), 'fingerprint-cross', 'DECLARED_BUSINESS_CONTEXT_REVIEW',
    'v1', 'v1', 'v1', pg_temp.id('run_b'),
    '{"snapshotVersion":"1","facts":[]}'::jsonb,
    '{"summary":"cross tenant"}'::jsonb);

  perform pg_temp.registrar('13 revisao apontando para run de outro tenant', '23503', 'ACEITOU');
exception when others then
  perform pg_temp.registrar('13 revisao apontando para run de outro tenant', '23503', sqlstate);
end $$;

-- Forma do artefato.
do $$
declare
  v_casos text[][] := array[
    array['14 snapshot que nao e objeto', '"texto"', '{"summary":"ok"}'],
    array['15 review que nao e objeto', '{"facts":[]}', '["lista"]']
  ];
  v_caso text[];
begin
  foreach v_caso slice 1 in array v_casos loop
    begin
      insert into public.declared_context_reviews (
        organization_id, input_fingerprint, task_type, task_version,
        prompt_version, schema_version, ai_run_id, input_snapshot_json, review_json)
      values (
        pg_temp.id('org_a'), 'fp-' || v_caso[1], 'DECLARED_BUSINESS_CONTEXT_REVIEW',
        'v1', 'v1', 'v1', pg_temp.id('run_a'),
        v_caso[2]::jsonb, v_caso[3]::jsonb);

      perform pg_temp.registrar(v_caso[1], '23514', 'ACEITOU');
    exception when others then
      perform pg_temp.registrar(v_caso[1], '23514', sqlstate);
    end;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 4. Imutabilidade do artefato
-- ---------------------------------------------------------------------------

do $$
begin
  update public.declared_context_reviews set review_json = '{"summary":"reescrito"}'::jsonb
   where id = pg_temp.id('review_a');

  perform pg_temp.registrar('16 dono do banco reescreve a revisao', '55000', 'ACEITOU');
exception when others then
  perform pg_temp.registrar('16 dono do banco reescreve a revisao', '55000', sqlstate);
end $$;

do $$
begin
  update public.declared_context_reviews set input_fingerprint = 'outro'
   where id = pg_temp.id('review_a');

  perform pg_temp.registrar('17 dono do banco altera o fingerprint', '55000', 'ACEITOU');
exception when others then
  perform pg_temp.registrar('17 dono do banco altera o fingerprint', '55000', sqlstate);
end $$;

set local role service_role;

do $$
begin
  update public.declared_context_reviews set review_json = '{"summary":"reescrito"}'::jsonb
   where id = pg_temp.id('review_a');

  perform pg_temp.registrar('18 service_role reescreve a revisao', '42501', 'ACEITOU');
exception when others then
  perform pg_temp.registrar('18 service_role reescreve a revisao', '42501', sqlstate);
end $$;

do $$
begin
  delete from public.declared_context_reviews where id = pg_temp.id('review_a');

  perform pg_temp.registrar('19 service_role apaga a revisao', '42501', 'ACEITOU');
exception when others then
  perform pg_temp.registrar('19 service_role apaga a revisao', '42501', sqlstate);
end $$;

reset role;

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

-- Sem `where organization_id = ...`: quem restringe é a policy.
select pg_temp.registrar('20 membro le a revisao da propria organizacao', '1',
  (select count(*)::text from public.declared_context_reviews r
     join ctx c on c.chave = 'org_a' and r.organization_id = c.valor));

select pg_temp.registrar('21 membro nao le revisao de outra organizacao', '0',
  (select count(*)::text from public.declared_context_reviews r
     join ctx c on c.chave = 'org_b' and r.organization_id = c.valor));

do $$
begin
  insert into public.declared_context_reviews (
    organization_id, input_fingerprint, task_type, task_version,
    prompt_version, schema_version, ai_run_id, input_snapshot_json, review_json)
  values (
    pg_temp.id('org_a'), 'pelo-browser', 'DECLARED_BUSINESS_CONTEXT_REVIEW',
    'v1', 'v1', 'v1', pg_temp.id('run_a'),
    '{"snapshotVersion":"1"}'::jsonb, '{"summary":"x"}'::jsonb);

  perform pg_temp.registrar('22 authenticated nao insere revisao', '42501', 'ACEITOU');
exception when others then
  perform pg_temp.registrar('22 authenticated nao insere revisao', '42501', sqlstate);
end $$;

do $$
begin
  update public.declared_context_reviews set review_json = '{"summary":"x"}'::jsonb
   where id = pg_temp.id('review_a');

  perform pg_temp.registrar('23 authenticated nao atualiza revisao', '42501', 'ACEITOU');
exception when others then
  perform pg_temp.registrar('23 authenticated nao atualiza revisao', '42501', sqlstate);
end $$;

do $$
begin
  delete from public.declared_context_reviews where id = pg_temp.id('review_a');

  perform pg_temp.registrar('24 authenticated nao apaga revisao', '42501', 'ACEITOU');
exception when others then
  perform pg_temp.registrar('24 authenticated nao apaga revisao', '42501', sqlstate);
end $$;

-- O catálogo de IA continua invisível para o browser: preço e modelo são
-- assunto interno.
do $$
begin
  perform 1 from public.ai_price_versions limit 1;

  perform pg_temp.registrar('25 authenticated nao le o catalogo de precos', '42501', 'ACEITOU');
exception when others then
  perform pg_temp.registrar('25 authenticated nao le o catalogo de precos', '42501', sqlstate);
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
