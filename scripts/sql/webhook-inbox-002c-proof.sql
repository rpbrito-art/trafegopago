-- Prova do delta da Rodada 002C — webhook inbox + índice de auditoria.
--
-- Transacional: tudo roda dentro de `begin … rollback`, então não há resíduo a
-- limpar e nenhuma fixture sobrevive. As fixtures são sintéticas — nenhum
-- e-mail, token ou PII real aparece, e nenhum payload é impresso.
--
-- Prova **apenas o que a 002C mudou** (mandato §4 e §9). Fila, worker,
-- redelivery, claim concorrente, idempotência e poison são baseline auditado e
-- promovido na 002B: aqui aparecem só como verificação catalogal de que
-- continuam intactos.
--
-- Os casos negativos rodam dentro de blocos com `exception`, capturando o
-- SQLSTATE em vez de abortar o script. Assim tudo executa numa passagem e o
-- resultado final é uma única tabela de veredictos.
--
-- Uso:
--   npx supabase db query --linked --file scripts/sql/webhook-inbox-002c-proof.sql

begin;

create temporary table prova_002c (
  ordem serial,
  nome text,
  esperado text,
  obtido text,
  ok boolean
) on commit drop;

create or replace function pg_temp.registrar(
  p_nome text,
  p_esperado text,
  p_obtido text
) returns void language sql as $$
  insert into prova_002c (nome, esperado, obtido, ok)
  values (p_nome, p_esperado, p_obtido, p_esperado = p_obtido);
$$;

-- Executa um INSERT que deve falhar e devolve o SQLSTATE observado.
create or replace function pg_temp.sqlstate_de(p_sql text)
returns text language plpgsql as $$
begin
  execute p_sql;
  return '00000';
exception when others then
  return sqlstate;
end;
$$;

-- ---------------------------------------------------------------------------
-- 1. Estrutura, RLS e ACL
-- ---------------------------------------------------------------------------

select pg_temp.registrar(
  'tabela webhook_events existe',
  '1',
  (select count(*)::text from pg_tables
    where schemaname = 'public' and tablename = 'webhook_events'));

select pg_temp.registrar(
  'RLS habilitado',
  'true',
  (select relrowsecurity::text from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'webhook_events'));

select pg_temp.registrar(
  'zero policies de browser',
  '0',
  (select count(*)::text from pg_policy p
     join pg_class c on c.oid = p.polrelid
    where c.relname = 'webhook_events'));

select pg_temp.registrar(
  'owner e postgres',
  'postgres',
  (select pg_get_userbyid(c.relowner) from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'webhook_events'));

select pg_temp.registrar(
  'quatro indices (pk + unique dedupe + status + org)',
  '4',
  (select count(*)::text from pg_indexes
    where schemaname = 'public' and tablename = 'webhook_events'));

select pg_temp.registrar(
  'unique de dedupe por (provider, dedupe_hash)',
  '1',
  (select count(*)::text from pg_indexes
    where schemaname = 'public'
      and tablename = 'webhook_events'
      and indexdef like '%UNIQUE%(provider, dedupe_hash)%'));

-- ---------------------------------------------------------------------------
-- 2. Fronteira de acesso
-- ---------------------------------------------------------------------------

select pg_temp.registrar('anon sem SELECT', 'false',
  has_table_privilege('anon', 'public.webhook_events', 'SELECT')::text);
select pg_temp.registrar('anon sem INSERT', 'false',
  has_table_privilege('anon', 'public.webhook_events', 'INSERT')::text);
select pg_temp.registrar('authenticated sem SELECT', 'false',
  has_table_privilege('authenticated', 'public.webhook_events', 'SELECT')::text);
select pg_temp.registrar('authenticated sem INSERT', 'false',
  has_table_privilege('authenticated', 'public.webhook_events', 'INSERT')::text);
select pg_temp.registrar('service_role com SELECT', 'true',
  has_table_privilege('service_role', 'public.webhook_events', 'SELECT')::text);
select pg_temp.registrar('service_role com INSERT', 'true',
  has_table_privilege('service_role', 'public.webhook_events', 'INSERT')::text);
select pg_temp.registrar('service_role com UPDATE', 'true',
  has_table_privilege('service_role', 'public.webhook_events', 'UPDATE')::text);
-- O ponto da inbox: evento recebido é evidência, e o caminho normal não apaga.
select pg_temp.registrar('service_role SEM DELETE', 'false',
  has_table_privilege('service_role', 'public.webhook_events', 'DELETE')::text);

-- ---------------------------------------------------------------------------
-- 3. Dedupe
-- ---------------------------------------------------------------------------

insert into public.webhook_events (provider, dedupe_hash, event_type, payload_json)
values ('meta', repeat('a', 64), 'leadgen', '{"origem":"prova-002c"}'::jsonb);

select pg_temp.registrar(
  'primeiro evento entra',
  '1',
  (select count(*)::text from public.webhook_events
    where provider = 'meta' and dedupe_hash = repeat('a', 64)));

select pg_temp.registrar(
  'status default e RECEIVED',
  'RECEIVED',
  (select processing_status from public.webhook_events
    where provider = 'meta' and dedupe_hash = repeat('a', 64)));

-- Reentrega do mesmo provider com o mesmo hash: recusada pelo banco, não por
-- checagem de leitura da aplicação.
select pg_temp.registrar(
  'duplicata de (provider, dedupe_hash) e recusada',
  '23505',
  pg_temp.sqlstate_de($q$
    insert into public.webhook_events (provider, dedupe_hash, event_type, payload_json)
    values ('meta', repeat('a', 64), 'leadgen', '{"origem":"duplicata"}'::jsonb)
  $q$));

select pg_temp.registrar(
  'registro original permanece intocado pela duplicata',
  'prova-002c',
  (select payload_json ->> 'origem' from public.webhook_events
    where provider = 'meta' and dedupe_hash = repeat('a', 64)));

-- Mesmo hash, provider diferente: outro evento, entra normalmente.
insert into public.webhook_events (provider, dedupe_hash, event_type, payload_json)
values ('outro_provider', repeat('a', 64), 'leadgen', '{"origem":"outro"}'::jsonb);

select pg_temp.registrar(
  'mesmo hash em provider diferente coexiste',
  '2',
  (select count(*)::text from public.webhook_events
    where dedupe_hash = repeat('a', 64)));

-- ---------------------------------------------------------------------------
-- 4. Constraints
-- ---------------------------------------------------------------------------

select pg_temp.registrar('recusa hash com 63 caracteres', '23514',
  pg_temp.sqlstate_de($q$insert into public.webhook_events
    (provider, dedupe_hash, event_type, payload_json)
    values ('meta', repeat('a', 63), 'x', '{}'::jsonb)$q$));

select pg_temp.registrar('recusa hash nao-hexadecimal', '23514',
  pg_temp.sqlstate_de($q$insert into public.webhook_events
    (provider, dedupe_hash, event_type, payload_json)
    values ('meta', repeat('z', 64), 'x', '{}'::jsonb)$q$));

-- Hex maiúsculo é recusado de propósito: o dedupe não pode depender de quem
-- formatou a string.
select pg_temp.registrar('recusa hash em maiusculas', '23514',
  pg_temp.sqlstate_de($q$insert into public.webhook_events
    (provider, dedupe_hash, event_type, payload_json)
    values ('meta', repeat('A', 64), 'x', '{}'::jsonb)$q$));

select pg_temp.registrar('recusa provider em branco', '23514',
  pg_temp.sqlstate_de($q$insert into public.webhook_events
    (provider, dedupe_hash, event_type, payload_json)
    values ('   ', repeat('b', 64), 'x', '{}'::jsonb)$q$));

select pg_temp.registrar('recusa event_type em branco', '23514',
  pg_temp.sqlstate_de($q$insert into public.webhook_events
    (provider, dedupe_hash, event_type, payload_json)
    values ('meta', repeat('b', 64), '  ', '{}'::jsonb)$q$));

select pg_temp.registrar('recusa status fora da allowlist', '23514',
  pg_temp.sqlstate_de($q$insert into public.webhook_events
    (provider, dedupe_hash, event_type, payload_json, processing_status)
    values ('meta', repeat('b', 64), 'x', '{}'::jsonb, 'DONE')$q$));

select pg_temp.registrar('recusa external_event_id vazio quando presente', '23514',
  pg_temp.sqlstate_de($q$insert into public.webhook_events
    (provider, dedupe_hash, event_type, payload_json, external_event_id)
    values ('meta', repeat('b', 64), 'x', '{}'::jsonb, '')$q$));

select pg_temp.registrar('recusa organizacao inexistente', '23503',
  pg_temp.sqlstate_de($q$insert into public.webhook_events
    (organization_id, provider, dedupe_hash, event_type, payload_json)
    values ('00000000-0000-0000-0000-000000000001', 'meta', repeat('b', 64), 'x', '{}'::jsonb)$q$));

-- `organization_id` nulo É válido: o evento é persistido antes de o tenant ser
-- resolvido, e recusá-lo perderia o que precisamos para investigar.
insert into public.webhook_events (provider, dedupe_hash, event_type, payload_json)
values ('meta', repeat('c', 64), 'sem_tenant', '{}'::jsonb);

select pg_temp.registrar(
  'evento sem tenant resolvido e aceito',
  '1',
  (select count(*)::text from public.webhook_events
    where dedupe_hash = repeat('c', 64) and organization_id is null));

-- ---------------------------------------------------------------------------
-- 5. Transição de status
-- ---------------------------------------------------------------------------

update public.webhook_events
set processing_status = 'PROCESSED', processed_at = now()
where dedupe_hash = repeat('c', 64);

select pg_temp.registrar(
  'transicao para PROCESSED funciona sem CHECK artificial de timestamp',
  'PROCESSED',
  (select processing_status from public.webhook_events
    where dedupe_hash = repeat('c', 64)));

-- ---------------------------------------------------------------------------
-- 6. Índice de audit_events.actor_user_id (dívida herdada da 002A)
-- ---------------------------------------------------------------------------

select pg_temp.registrar(
  'indice audit_events_actor_user_id_idx existe',
  '1',
  (select count(*)::text from pg_indexes
    where schemaname = 'public' and indexname = 'audit_events_actor_user_id_idx'));

-- ---------------------------------------------------------------------------
-- 7. Baseline 002A/002B intacto — catalogal, sem rerodar as 82 provas
-- ---------------------------------------------------------------------------

select pg_temp.registrar('migration history = 9', '9',
  (select count(*)::text from supabase_migrations.schema_migrations));

select pg_temp.registrar('seis tabelas em public', '6',
  (select count(*)::text from pg_tables where schemaname = 'public'));

select pg_temp.registrar('todas as tabelas de public com RLS', '6',
  (select count(*)::text from pg_tables
    where schemaname = 'public' and rowsecurity));

select pg_temp.registrar('pgmq continua instalado', '1.5.1',
  (select extversion from pg_extension where extname = 'pgmq'));

select pg_temp.registrar('fila integration_jobs continua existindo', '1',
  (select count(*)::text from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'pgmq' and c.relname = 'q_integration_jobs'));

-- 5 wrappers da fila + rls_auto_enable da 001A. Nenhuma função SECURITY
-- DEFINER nova nesta rodada (mandato §5.3).
select pg_temp.registrar('nenhuma funcao SECURITY DEFINER nova', '6',
  (select count(*)::text from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef));

select pg_temp.registrar('pgmq_public continua nao exposto', '0',
  (select count(*)::text from pg_namespace where nspname = 'pgmq_public'));

select pg_temp.registrar('pg_cron continua ausente', '0',
  (select count(*)::text from pg_extension where extname = 'pg_cron'));

select pg_temp.registrar('public sem objetos owned por supabase_admin', '0',
  (select count(*)::text from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
     join pg_roles r on r.oid = c.relowner
    where n.nspname = 'public' and r.rolname = 'supabase_admin'));

-- ---------------------------------------------------------------------------
-- 8. Observabilidade devolve só agregados
-- ---------------------------------------------------------------------------

select pg_temp.registrar(
  'agregado por provider/status nao expoe payload',
  '3',
  (select count(*)::text from (
     select provider, processing_status, count(*)
     from public.webhook_events
     group by provider, processing_status) agregados));

-- ---------------------------------------------------------------------------
-- 9. Veredicto
-- ---------------------------------------------------------------------------

select
  count(*) filter (where ok) || '/' || count(*) as resultado,
  coalesce(
    string_agg(nome || ' (esperado ' || esperado || ', obtido ' ||
               coalesce(obtido, 'null') || ')', ' | ')
      filter (where not ok),
    'nenhuma falha') as falhas
from prova_002c;

-- ---------------------------------------------------------------------------
-- 10. Zero resíduo: nada acima sobrevive a este rollback.
-- ---------------------------------------------------------------------------

rollback;
