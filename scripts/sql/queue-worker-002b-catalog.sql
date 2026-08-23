-- Provas estruturais da Rodada 002B — Queue + Worker Foundation.
--
-- Complementa `scripts/queue-worker-002b.mjs`, que prova comportamento pela
-- Data API e pela Edge Function real mas não alcança `pg_catalog`. Read-only;
-- reproduzível no SQL Editor do projeto `cbnxdoxpyioxjwgjhbtq`.
--
-- Resultado esperado descrito acima de cada bloco.

-- ---------------------------------------------------------------------------
-- 1. Migration history: 7 migrations, a última desta rodada.
-- ---------------------------------------------------------------------------
select count(*) as total, max(version) as ultima
from supabase_migrations.schema_migrations;
-- esperado: total = 7, ultima = 20260823180000

-- ---------------------------------------------------------------------------
-- 2. `pgmq` instalado e fila DURÁVEL.
--
-- `relpersistence = 'p'` (permanent/logged) é o ponto: `pgmq.create_unlogged`
-- produziria 'u', e uma fila unlogged perde jobs num restart do Postgres.
-- ---------------------------------------------------------------------------
select
  (select extversion from pg_extension where extname = 'pgmq') as pgmq_versao,
  c.relname,
  c.relpersistence,
  pg_get_userbyid(c.relowner) as owner
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'pgmq' and c.relkind = 'r'
order by c.relname;
-- esperado: pgmq_versao = 1.5.1
--           q_integration_jobs e a_integration_jobs com relpersistence = 'p'

-- ---------------------------------------------------------------------------
-- 3. `pgmq_public` NÃO existe — a fila é server-only.
-- ---------------------------------------------------------------------------
select count(*) as schema_pgmq_public
from pg_namespace
where nspname = 'pgmq_public';
-- esperado: 0
-- Conferir também que `supabase/config.toml` mantém
-- api.schemas = ["public", "graphql_public"], sem pgmq_public.

-- ---------------------------------------------------------------------------
-- 4. Fronteira da fila: owner, SECURITY DEFINER, search_path e ACL.
--
-- Os cinco wrappers de fila são SECURITY DEFINER por exceção autorizada
-- (mandato §2.2). Os helpers de `operations` são INVOKER: `service_role` já
-- tem os grants necessários naquela tabela desde a 002A.
-- ---------------------------------------------------------------------------
select
  p.proname,
  pg_get_userbyid(p.proowner) as owner,
  p.prosecdef as security_definer,
  coalesce(array_to_string(p.proconfig, ','), '(sem config)') as config,
  coalesce(array_to_string(p.proacl, ' | '), '(sem acl)') as acl
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
order by p.proname;
-- esperado, para os 5 wrappers de fila (enqueue_/read_/complete_/archive_/
--   defer_integration_job): owner=postgres, security_definer=t,
--   config=search_path="", acl SOMENTE postgres e service_role
-- esperado, para claim_operation / complete_operation / fail_operation /
--   is_valid_integration_job_message: security_definer=f, mesmo search_path e
--   mesma ACL
-- esperado em todas: anon e authenticated AUSENTES da acl

-- ---------------------------------------------------------------------------
-- 5. Nenhum wrapper genérico: o nome da fila é constante no corpo.
-- ---------------------------------------------------------------------------
select p.proname,
       (position('integration_jobs' in pg_get_functiondef(p.oid)) > 0) as fila_hardcoded,
       (position('execute' in lower(pg_get_functiondef(p.oid))) > 0) as tem_sql_dinamico
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname like '%integration_job%'
order by p.proname;
-- esperado: fila_hardcoded = t nos wrappers; tem_sql_dinamico = f em todos

-- ---------------------------------------------------------------------------
-- 6. Baseline da fundação preservado.
-- ---------------------------------------------------------------------------
select
  (select count(*) from pg_tables where schemaname = 'public') as tabelas_public,
  (select count(*) from pg_tables where schemaname = 'public' and rowsecurity) as com_rls,
  (select count(*) from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
     join pg_roles r on r.oid = c.relowner
     where n.nspname = 'public' and r.rolname = 'supabase_admin') as owned_supabase_admin,
  (select count(*) from auth.users) as usuarios,
  (select count(*) from public.operations) as operations,
  (select count(*) from public.audit_events) as audit_events,
  (select count(*) from pgmq.q_integration_jobs) as mensagens_ativas,
  (select count(*) from pgmq.a_integration_jobs) as mensagens_arquivadas;
-- esperado: 5 tabelas em public, todas com RLS; 0 owned por supabase_admin;
--           1 conta real; operations/audit_events/fila zerados apos cleanup.
-- `public.integration_jobs` NÃO deve existir (mandato §5.7).

-- ---------------------------------------------------------------------------
-- 7. Default privileges endurecidos e `ensure_rls` continuam.
-- ---------------------------------------------------------------------------
select
  pg_get_userbyid(d.defaclrole) as role,
  coalesce(n.nspname, '(global)') as schema,
  d.defaclobjtype as tipo,
  array_to_string(d.defaclacl, ' | ') as acl
from pg_default_acl d
left join pg_namespace n on n.oid = d.defaclnamespace
where pg_get_userbyid(d.defaclrole) = 'postgres'
order by role, schema, tipo;
-- esperado: nenhuma concessão default a anon/authenticated

select evtname, evtenabled
from pg_event_trigger
where evtname = 'ensure_rls';
-- esperado: presente e habilitado ('O')

-- ---------------------------------------------------------------------------
-- 8. Nenhum cron foi criado nesta rodada (mandato §5.6).
-- ---------------------------------------------------------------------------
select count(*) as pg_cron_instalado
from pg_extension
where extname = 'pg_cron';
-- esperado: 0
