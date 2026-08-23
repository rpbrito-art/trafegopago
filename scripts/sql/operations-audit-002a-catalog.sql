-- Provas estruturais da Rodada 002A — Operations + Audit Foundation.
--
-- Complementa `scripts/operations-audit-002a.mjs`, que prova comportamento
-- pela Data API mas não alcança `pg_catalog`. Estas consultas são read-only e
-- podem ser rodadas no SQL Editor do projeto `cbnxdoxpyioxjwgjhbtq` para
-- reproduzir as provas de schema, privilégio e isolamento sem depender do
-- relatório.
--
-- Resultado esperado descrito acima de cada bloco.

-- ---------------------------------------------------------------------------
-- 1. Migration history: 6 migrations, a última desta rodada.
-- ---------------------------------------------------------------------------
select count(*) as total, max(version) as ultima
from supabase_migrations.schema_migrations;
-- esperado: total = 6, ultima = 20260823160000

-- ---------------------------------------------------------------------------
-- 2. Owner, RLS e ACL das tabelas novas.
--
-- O append-only de `audit_events` NÃO se apoia em RLS: `service_role` é
-- BYPASSRLS. Apoia-se na ACL — `ar` (INSERT+SELECT) e nada mais.
-- ---------------------------------------------------------------------------
select
  c.relname as tabela,
  pg_get_userbyid(c.relowner) as owner,
  c.relrowsecurity as rls_habilitado,
  (select count(*) from pg_policy p where p.polrelid = c.oid) as policies,
  coalesce(array_to_string(c.relacl, ' | '), '(sem acl)') as acl
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by c.relname;
-- esperado para operations   : owner=postgres, rls=t, policies=0,
--                              acl inclui service_role=arw  (sem d)
-- esperado para audit_events : owner=postgres, rls=t, policies=0,
--                              acl inclui service_role=ar   (sem w, sem d)
-- esperado em ambas          : anon e authenticated AUSENTES da acl
-- esperado nas 3 tabelas de dominio promovidas: inalteradas

-- ---------------------------------------------------------------------------
-- 3. `service_role` é BYPASSRLS — por isso o grant é a tranca que vale.
-- ---------------------------------------------------------------------------
select rolname, rolbypassrls
from pg_roles
where rolname in ('service_role', 'authenticated', 'anon')
order by rolname;
-- esperado: service_role = t; authenticated e anon = f

-- ---------------------------------------------------------------------------
-- 4. Constraints das tabelas novas.
-- ---------------------------------------------------------------------------
select c.relname as tabela, con.conname, con.contype,
       pg_get_constraintdef(con.oid) as definicao
from pg_constraint con
join pg_class c on c.oid = con.conrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname in ('operations', 'audit_events')
order by c.relname, con.contype, con.conname;
-- esperado operations   : CHECKs de status, last_error_class, attempt_count >= 0,
--                         not_blank/max_length de operation_type, idempotency_key,
--                         target_type, external_resource_id, last_error_summary,
--                         coerencia de updated_at/completed_at;
--                         FK organization_id -> organizations ON DELETE CASCADE
-- esperado audit_events : CHECKs de actor_type, metadata objeto + teto,
--                         not_blank/max_length de event_type e subject_type;
--                         FK organization_id -> organizations ON DELETE CASCADE;
--                         FK actor_user_id -> auth.users ON DELETE SET NULL

-- ---------------------------------------------------------------------------
-- 5. Índices, incluindo o único que garante idempotência.
-- ---------------------------------------------------------------------------
select tablename, indexname, indexdef
from pg_indexes
where schemaname = 'public' and tablename in ('operations', 'audit_events')
order by tablename, indexname;
-- esperado operations   : pkey; UNIQUE (organization_id, operation_type,
--                         idempotency_key); (organization_id, status,
--                         created_at DESC); (correlation_id)
-- esperado audit_events : pkey; (organization_id, created_at DESC);
--                         (correlation_id) WHERE correlation_id IS NOT NULL

-- ---------------------------------------------------------------------------
-- 6. Baseline da fundação: `public` sem objetos owned por `supabase_admin`.
-- ---------------------------------------------------------------------------
select count(*) as objetos_supabase_admin
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
join pg_roles r on r.oid = c.relowner
where n.nspname = 'public' and r.rolname = 'supabase_admin';
-- esperado: 0

-- ---------------------------------------------------------------------------
-- 7. Default privileges endurecidos da 001D permanecem.
-- ---------------------------------------------------------------------------
select
  pg_get_userbyid(d.defaclrole) as role,
  coalesce(n.nspname, '(global)') as schema,
  d.defaclobjtype as tipo,
  array_to_string(d.defaclacl, ' | ') as acl
from pg_default_acl d
left join pg_namespace n on n.oid = d.defaclnamespace
order by role, schema, tipo;
-- esperado: nenhuma concessao default para anon/authenticated

-- ---------------------------------------------------------------------------
-- 8. RLS habilitado em todas as tabelas de `public`.
-- ---------------------------------------------------------------------------
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;
-- esperado: 5 tabelas, todas com rowsecurity = t

-- ---------------------------------------------------------------------------
-- 9. Event trigger `ensure_rls` da Rodada 001A continua ativo.
-- ---------------------------------------------------------------------------
select evtname, evtenabled, evtevent
from pg_event_trigger
order by evtname;
-- esperado: ensure_rls presente e habilitado
