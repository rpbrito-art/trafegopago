-- Prova transacional da Correção 004E-02 — mandato §3.1.
--
-- A FK composta da tentativa para `ai_runs` usava `on delete set null` **sem
-- lista de colunas**. Sem a lista, o Postgres tenta zerar todas as colunas
-- referenciadoras — inclusive `organization_id`, que é `not null`. O efeito
-- seria: apagar um run referenciado falharia, e o cascade da organização
-- poderia travar junto. Pior, a intenção nunca foi perder o tenant: era perder
-- só a referência ao run.
--
-- Aqui se prova o comportamento depois da correção: o run some, a tentativa
-- continua sendo daquele negócio.
--
-- Transacional: `begin … rollback`. Nenhuma fixture sobrevive.
--
-- Uso:
--   npx supabase db query --linked --file scripts/sql/review-attempt-run-delete-004e02-proof.sql

begin;

create temporary table ctx (chave text primary key, valor uuid) on commit drop;

create temporary table prova (
  ordem serial,
  nome text,
  esperado text,
  obtido text,
  passou boolean
) on commit drop;

create function pg_temp.registrar(p_nome text, p_esperado text, p_obtido text)
returns void language sql as $$
  insert into prova (nome, esperado, obtido, passou)
  values (p_nome, p_esperado, p_obtido, p_esperado = p_obtido);
$$;

create function pg_temp.id(p_chave text) returns uuid language sql stable as $$
  select valor from ctx where chave = p_chave;
$$;

-- ---------------------------------------------------------------------------
-- 0. A ação da FK é a corrigida
-- ---------------------------------------------------------------------------

-- `confdeltype = 'n'` é SET NULL; `confdelsetcols` lista as colunas zeradas.
-- Vazio ali significaria "todas" — que é exatamente o defeito corrigido.
select pg_temp.registrar('01 acao de delete e SET NULL', 'n',
  (select confdeltype::text from pg_constraint
    where conname = 'declared_context_review_attempts_run_same_tenant'));

select pg_temp.registrar('02 SET NULL zera apenas uma coluna', '1',
  (select coalesce(array_length(confdelsetcols, 1), 0)::text from pg_constraint
    where conname = 'declared_context_review_attempts_run_same_tenant'));

select pg_temp.registrar('03 a coluna zerada e ai_run_id', 'ai_run_id',
  (select a.attname::text
     from pg_constraint c
     join pg_attribute a
       on a.attrelid = c.conrelid and a.attnum = c.confdelsetcols[1]
    where c.conname = 'declared_context_review_attempts_run_same_tenant'));

-- ---------------------------------------------------------------------------
-- 1. Fixtures — organização, run sintético e tentativa concluída
-- ---------------------------------------------------------------------------

do $$
declare
  v_owner uuid;
  v_org uuid;
  v_org_b uuid;
  v_owner_b uuid;
  v_model uuid;
  v_provider uuid;
  v_price uuid;
  v_run uuid;
  v_run_b uuid;
  v_tentativa uuid;
begin
  insert into auth.users (id, instance_id, aud, role, email) values
    (gen_random_uuid(), '00000000-0000-0000-0000-000000000000',
     'authenticated', 'authenticated', 'fixture-004e02-a@example.invalid')
    returning id into v_owner;
  insert into auth.users (id, instance_id, aud, role, email) values
    (gen_random_uuid(), '00000000-0000-0000-0000-000000000000',
     'authenticated', 'authenticated', 'fixture-004e02-b@example.invalid')
    returning id into v_owner_b;

  insert into public.organizations (name) values ('FIXTURE 004E02 A') returning id into v_org;
  insert into public.organizations (name) values ('FIXTURE 004E02 B') returning id into v_org_b;

  insert into public.organization_members (organization_id, user_id, role, status) values
    (v_org, v_owner, 'owner', 'ACTIVE'),
    (v_org_b, v_owner_b, 'owner', 'ACTIVE');

  select m.id, m.provider_id into v_model, v_provider
  from public.ai_models m
  join public.ai_providers p on p.id = m.provider_id
  where p.key = 'google_gemini' and m.model_key = 'gemini-2.5-flash-lite';

  select v.id into v_price
  from public.ai_price_versions v
  where v.ai_model_id = v_model and v.effective_to is null;

  -- Run concluído **com custo**: a constraint `ai_runs_succeeded_requires_cost`
  -- da 004A recusa `SUCCEEDED` sem custo registrado, e é justamente essa
  -- invariante que impede uma chamada paga entrar no ledger como gratuita.
  insert into public.ai_runs (
    organization_id, correlation_id, task_type, task_version, provider_id,
    ai_model_id, ai_price_version_id, tier, prompt_version, schema_version,
    status, input_tokens, output_tokens, estimated_cost, currency, completed_at)
  values (v_org, gen_random_uuid(), 'DECLARED_BUSINESS_CONTEXT_REVIEW', 'v1',
          v_provider, v_model, v_price, 1, 'v1', 'v1',
          'SUCCEEDED', 1200, 300, 0.000240000000, 'USD', now())
  returning id into v_run;

  insert into public.ai_runs (
    organization_id, correlation_id, task_type, task_version, provider_id,
    ai_model_id, ai_price_version_id, tier, prompt_version, schema_version,
    status, input_tokens, output_tokens, estimated_cost, currency, completed_at)
  values (v_org_b, gen_random_uuid(), 'DECLARED_BUSINESS_CONTEXT_REVIEW', 'v1',
          v_provider, v_model, v_price, 1, 'v1', 'v1',
          'SUCCEEDED', 1200, 300, 0.000240000000, 'USD', now())
  returning id into v_run_b;

  -- Tentativa já concluída, apontando para o run do mesmo tenant.
  insert into public.declared_context_review_attempts (
    organization_id, input_fingerprint, task_type, task_version,
    prompt_version, schema_version, status, expires_at, ai_run_id, completed_at)
  values (
    v_org, 'fp-delete', 'DECLARED_BUSINESS_CONTEXT_REVIEW', 'v1', 'v1', 'v1',
    'COMPLETED', now() + interval '2 minutes', v_run, now())
  returning id into v_tentativa;

  insert into ctx values
    ('owner', v_owner), ('org', v_org), ('org_b', v_org_b),
    ('run', v_run), ('run_b', v_run_b), ('tentativa', v_tentativa);
end $$;

-- ---------------------------------------------------------------------------
-- 2. Apagar o run preserva o tenant da tentativa
-- ---------------------------------------------------------------------------

do $$
begin
  delete from public.ai_runs where id = pg_temp.id('run');

  perform pg_temp.registrar('04 apagar o run e permitido', 'true', 'true');
exception when others then
  perform pg_temp.registrar('04 apagar o run e permitido', 'true', 'FALHOU ' || sqlstate);
end $$;

select pg_temp.registrar('05 tentativa sobrevive ao delete do run', '1',
  (select count(*)::text from public.declared_context_review_attempts
    where id = pg_temp.id('tentativa')));

select pg_temp.registrar('06 referencia ao run foi zerada', 'true',
  (select (ai_run_id is null)::text from public.declared_context_review_attempts
    where id = pg_temp.id('tentativa')));

-- O ponto da correção: o tenant permanece.
select pg_temp.registrar('07 organizacao da tentativa foi preservada', 'true',
  (select (organization_id = pg_temp.id('org'))::text
     from public.declared_context_review_attempts
    where id = pg_temp.id('tentativa')));

select pg_temp.registrar('08 demais campos da tentativa intactos', 'fp-delete|COMPLETED',
  (select input_fingerprint || '|' || status
     from public.declared_context_review_attempts
    where id = pg_temp.id('tentativa')));

-- ---------------------------------------------------------------------------
-- 3. Cross-tenant continua impossível
-- ---------------------------------------------------------------------------

do $$
begin
  update public.declared_context_review_attempts
     set ai_run_id = pg_temp.id('run_b'), status = 'COMPLETED'
   where id = pg_temp.id('tentativa');

  perform pg_temp.registrar('09 tentativa nao aponta para run de outro tenant', 'recusado', 'ACEITOU');
exception when others then
  -- Pode vir 42501 (grant por coluna) ou 23503 (FK). Os dois são recusa; o que
  -- não pode é o UPDATE passar.
  perform pg_temp.registrar('09 tentativa nao aponta para run de outro tenant', 'recusado', 'recusado');
end $$;

-- ---------------------------------------------------------------------------
-- 4. Cascade da organização não trava e não deixa resíduo
-- ---------------------------------------------------------------------------

do $$
declare
  v_run uuid;
  v_model uuid;
  v_provider uuid;
  v_price uuid;
begin
  select m.id, m.provider_id into v_model, v_provider
  from public.ai_models m
  join public.ai_providers p on p.id = m.provider_id
  where p.key = 'google_gemini' and m.model_key = 'gemini-2.5-flash-lite';

  select v.id into v_price
  from public.ai_price_versions v
  where v.ai_model_id = v_model and v.effective_to is null;

  -- Novo run e nova tentativa, para o cascade ter o que remover.
  insert into public.ai_runs (
    organization_id, correlation_id, task_type, task_version, provider_id,
    ai_model_id, ai_price_version_id, tier, prompt_version, schema_version,
    status, input_tokens, output_tokens, estimated_cost, currency, completed_at)
  values (pg_temp.id('org'), gen_random_uuid(), 'DECLARED_BUSINESS_CONTEXT_REVIEW', 'v1',
          v_provider, v_model, v_price, 1, 'v1', 'v1',
          'SUCCEEDED', 1200, 300, 0.000240000000, 'USD', now())
  returning id into v_run;

  insert into public.declared_context_review_attempts (
    organization_id, input_fingerprint, task_type, task_version,
    prompt_version, schema_version, status, expires_at, ai_run_id, completed_at)
  values (
    pg_temp.id('org'), 'fp-cascade', 'DECLARED_BUSINESS_CONTEXT_REVIEW', 'v1', 'v1', 'v1',
    'COMPLETED', now() + interval '2 minutes', v_run, now());

  insert into public.declared_context_reviews (
    organization_id, input_fingerprint, task_type, task_version,
    prompt_version, schema_version, ai_run_id, input_snapshot_json, review_json)
  values (
    pg_temp.id('org'), 'fp-cascade', 'DECLARED_BUSINESS_CONTEXT_REVIEW', 'v1', 'v1', 'v1',
    v_run, '{"snapshotVersion":"1","facts":[]}'::jsonb, '{"summary":"ok"}'::jsonb);
end $$;

do $$
begin
  delete from public.organizations where id = pg_temp.id('org');

  perform pg_temp.registrar('10 apagar a organizacao nao trava', 'true', 'true');
exception when others then
  perform pg_temp.registrar('10 apagar a organizacao nao trava', 'true', 'FALHOU ' || sqlstate);
end $$;

select pg_temp.registrar('11 nenhuma tentativa residual do tenant', '0',
  (select count(*)::text from public.declared_context_review_attempts
    where organization_id = pg_temp.id('org')));

select pg_temp.registrar('12 nenhuma revisao residual do tenant', '0',
  (select count(*)::text from public.declared_context_reviews
    where organization_id = pg_temp.id('org')));

select pg_temp.registrar('13 nenhum run residual do tenant', '0',
  (select count(*)::text from public.ai_runs
    where organization_id = pg_temp.id('org')));

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
