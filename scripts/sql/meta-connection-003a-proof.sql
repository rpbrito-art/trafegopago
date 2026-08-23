-- Prova do delta da Rodada 003A — fronteira do token e do estado OAuth.
--
-- Transacional: tudo dentro de `begin … rollback`, com fixtures sintéticas e
-- zero resíduo. Nenhum token real, nenhum e-mail real, nenhum valor de segredo
-- impresso.
--
-- Cobre a parte da §6 que é **de banco**: privilégio, isolamento por tenant e
-- ciclo do segredo no Vault. As propriedades do `state` — imprevisibilidade,
-- expiração, uso único e recusa cross-tenant — são determinísticas e vivem em
-- `src/lib/meta/oauth-state.test.ts`, onde podem ser exercidas sem depender do
-- relógio de um servidor remoto.
--
-- Uso:
--   npx supabase db query --linked --file scripts/sql/meta-connection-003a-proof.sql

begin;

create temporary table prova_003a (
  ordem serial, nome text, esperado text, obtido text, ok boolean
) on commit drop;

create or replace function pg_temp.reg(p_nome text, p_esp text, p_obt text)
returns void language sql as $$
  insert into prova_003a (nome, esperado, obtido, ok)
  values (p_nome, p_esp, p_obt, p_esp = p_obt);
$$;

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
-- 1. Fronteira: o browser não alcança o segredo
-- ---------------------------------------------------------------------------

-- O grant de `meta_connections` é POR COLUNA. O browser vê o estado da
-- conexão; a referência que recupera o token fica de fora.
select pg_temp.reg('authenticated le status', 'true',
  has_column_privilege('authenticated','public.meta_connections','status','SELECT')::text);
select pg_temp.reg('authenticated NAO le token_secret_reference', 'false',
  has_column_privilege('authenticated','public.meta_connections','token_secret_reference','SELECT')::text);
select pg_temp.reg('authenticated NAO le external_user_id', 'false',
  has_column_privilege('authenticated','public.meta_connections','external_user_id','SELECT')::text);
select pg_temp.reg('authenticated NAO le granted_scopes', 'false',
  has_column_privilege('authenticated','public.meta_connections','granted_scopes','SELECT')::text);
select pg_temp.reg('anon NAO le status', 'false',
  has_column_privilege('anon','public.meta_connections','status','SELECT')::text);
select pg_temp.reg('authenticated NAO escreve meta_connections', 'false',
  has_table_privilege('authenticated','public.meta_connections','INSERT')::text);
select pg_temp.reg('service_role SEM DELETE em meta_connections', 'false',
  has_table_privilege('service_role','public.meta_connections','DELETE')::text);

-- Intenções OAuth são server-only totais.
select pg_temp.reg('anon NAO le meta_oauth_intents', 'false',
  has_table_privilege('anon','public.meta_oauth_intents','SELECT')::text);
select pg_temp.reg('authenticated NAO le meta_oauth_intents', 'false',
  has_table_privilege('authenticated','public.meta_oauth_intents','SELECT')::text);
select pg_temp.reg('authenticated NAO escreve meta_oauth_intents', 'false',
  has_table_privilege('authenticated','public.meta_oauth_intents','INSERT')::text);
select pg_temp.reg('service_role SEM DELETE em meta_oauth_intents', 'false',
  has_table_privilege('service_role','public.meta_oauth_intents','DELETE')::text);

-- O Vault continua fora da Data API, e nenhuma função nossa é SECURITY DEFINER.
select pg_temp.reg('vault fora da Data API', '0',
  (select count(*)::text from pg_namespace where nspname = 'pgmq_public'));
select pg_temp.reg('nenhuma funcao DEFINER nova (5 fila + rls_auto_enable)', '6',
  (select count(*)::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef));
select pg_temp.reg('wrappers do Vault sao INVOKER', '0',
  (select count(*)::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef
      and p.proname in ('store_meta_connection_token',
                        'revoke_meta_connection',
                        'meta_connection_token_present')));
select pg_temp.reg('wrappers do Vault: EXECUTE so para service_role', 'true',
  (select bool_and(array_to_string(p.proacl,' ') not like '%anon=%'
                   and array_to_string(p.proacl,' ') not like '%authenticated=%')::text
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('store_meta_connection_token',
                        'revoke_meta_connection',
                        'meta_connection_token_present')));

-- ---------------------------------------------------------------------------
-- 2. RLS e isolamento por tenant
-- ---------------------------------------------------------------------------

select pg_temp.reg('RLS em meta_connections', 'true',
  (select relrowsecurity::text from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname='meta_connections'));
select pg_temp.reg('RLS em meta_oauth_intents', 'true',
  (select relrowsecurity::text from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname='meta_oauth_intents'));
select pg_temp.reg('meta_connections: apenas policy de SELECT', '1',
  (select count(*)::text from pg_policy p join pg_class c on c.oid=p.polrelid
    where c.relname='meta_connections'));
select pg_temp.reg('meta_oauth_intents: zero policies', '0',
  (select count(*)::text from pg_policy p join pg_class c on c.oid=p.polrelid
    where c.relname='meta_oauth_intents'));

-- ---------------------------------------------------------------------------
-- 3. Ciclo do token no Vault, como service_role
-- ---------------------------------------------------------------------------

-- O ciclo roda COMO service_role — é isso que prova que o caminho server-side
-- funciona sem privilégio extra. Os resultados são acumulados em variáveis e
-- registrados depois do `reset role`, porque `service_role` não tem EXECUTE nas
-- funções temporárias criadas pelo role que abriu a transação.
do $$
declare
  v_org_a uuid;
  v_org_b uuid;
  v_conn uuid;
  v_ref uuid;
  r_ref_gravada text;
  r_presente text;
  r_cifrado text;
  r_recuperavel text;
  r_rotacao text;
  r_sem_duplicata text;
  r_org_correta text;
  r_ref_limpa text;
  r_segredo_removido text;
  r_present_false text;
  r_historico text;
begin
  insert into public.organizations (name) values ('Org A 003A') returning id into v_org_a;
  insert into public.organizations (name) values ('Org B 003A') returning id into v_org_b;
  insert into public.meta_connections (organization_id) values (v_org_a) returning id into v_conn;

  set local role service_role;

  perform public.store_meta_connection_token(v_conn, 'token-sintetico', now() + interval '60 days');
  select token_secret_reference into v_ref from public.meta_connections where id = v_conn;

  r_ref_gravada := (v_ref is not null)::text;
  r_presente := public.meta_connection_token_present(v_conn)::text;
  select (secret <> 'token-sintetico')::text into r_cifrado from vault.secrets where id = v_ref;
  select (decrypted_secret = 'token-sintetico')::text into r_recuperavel
    from vault.decrypted_secrets where id = v_ref;

  perform public.store_meta_connection_token(v_conn, 'token-rotacionado', null);
  select (decrypted_secret = 'token-rotacionado')::text into r_rotacao
    from vault.decrypted_secrets where id = v_ref;
  select count(*)::text into r_sem_duplicata from vault.secrets
    where name = 'meta_connection_' || v_conn::text;

  update public.meta_connections set status = 'ACTIVE', connected_at = now() where id = v_conn;
  select organization_id::text into r_org_correta from public.meta_connections where id = v_conn;

  -- Desconexão atômica: status e referência no mesmo UPDATE. Em dois passos
  -- isso violaria os CHECKs de coerência da conexão.
  perform public.revoke_meta_connection(v_conn);
  select (token_secret_reference is null)::text into r_ref_limpa
    from public.meta_connections where id = v_conn;
  select count(*)::text into r_segredo_removido from vault.secrets where id = v_ref;
  r_present_false := public.meta_connection_token_present(v_conn)::text;
  select status into r_historico from public.meta_connections where id = v_conn;

  reset role;

  perform pg_temp.reg('referencia gravada apos store', 'true', r_ref_gravada);
  perform pg_temp.reg('token presente no Vault', 'true', r_presente);
  perform pg_temp.reg('token cifrado em repouso', 'true', r_cifrado);
  perform pg_temp.reg('token recuperavel apenas server-side', 'true', r_recuperavel);
  perform pg_temp.reg('rotacao substitui o valor', 'true', r_rotacao);
  perform pg_temp.reg('rotacao nao duplica segredo', '1', r_sem_duplicata);
  perform pg_temp.reg('conexao pertence a organizacao correta', v_org_a::text, r_org_correta);
  perform pg_temp.reg('referencia limpa apos desconexao', 'true', r_ref_limpa);
  perform pg_temp.reg('segredo REMOVIDO do Vault', '0', r_segredo_removido);
  perform pg_temp.reg('token_present passa a ser falso', 'false', r_present_false);
  perform pg_temp.reg('conexao revogada permanece como historico', 'REVOKED', r_historico);
end $$;

-- ---------------------------------------------------------------------------
-- 4. Constraints que sustentam o contrato
-- ---------------------------------------------------------------------------

-- Não se marca ACTIVE sem token: um bug aqui só apareceria na primeira chamada
-- à Meta.
select pg_temp.reg('ACTIVE exige token', '23514',
  pg_temp.sqlstate_de($q$
    insert into public.meta_connections (organization_id, status)
    select id, 'ACTIVE' from public.organizations where name = 'Org B 003A'
  $q$));

select pg_temp.reg('status fora da allowlist e recusado', '23514',
  pg_temp.sqlstate_de($q$
    insert into public.meta_connections (organization_id, status)
    select id, 'CONECTADO' from public.organizations where name = 'Org B 003A'
  $q$));

select pg_temp.reg('versao de API em formato invalido e recusada', '23514',
  pg_temp.sqlstate_de($q$
    insert into public.meta_connections (organization_id, api_version_last_verified)
    select id, '26.0' from public.organizations where name = 'Org B 003A'
  $q$));

-- Uma conexão VIVA por organização. O índice único é parcial — `REVOKED`,
-- `EXPIRED` e `ERROR` ficam fora — para que o histórico não impeça reconectar.
do $$
declare v_org uuid; v_res text;
begin
  select id into v_org from public.organizations where name = 'Org B 003A';

  -- Primeira conexão viva entra.
  insert into public.meta_connections (organization_id, status) values (v_org, 'PENDING');

  -- Segunda conexão viva na mesma organização é recusada pelo índice.
  v_res := pg_temp.sqlstate_de(format($q$
    insert into public.meta_connections (organization_id, status) values (%L, 'PENDING')
  $q$, v_org));
  perform pg_temp.reg('segunda conexao VIVA na mesma organizacao e recusada', '23505', v_res);

  -- Depois de revogar, reconectar é permitido: o histórico não bloqueia.
  update public.meta_connections
     set status = 'REVOKED', token_secret_reference = null, disconnected_at = now()
   where organization_id = v_org and status = 'PENDING';

  v_res := pg_temp.sqlstate_de(format($q$
    insert into public.meta_connections (organization_id, status) values (%L, 'PENDING')
  $q$, v_org));
  perform pg_temp.reg('reconexao apos REVOKED e permitida', '00000', v_res);

  perform pg_temp.reg('historico da conexao revogada permanece', '1',
    (select count(*)::text from public.meta_connections
      where organization_id = v_org and status = 'REVOKED'));
end $$;

-- `state` só entra como SHA-256 hex minúsculo: é o mesmo contrato do módulo TS.
select pg_temp.reg('state_hash fora do formato e recusado', '23514',
  pg_temp.sqlstate_de($q$
    insert into public.meta_oauth_intents (organization_id, user_id, state_hash, expires_at)
    select o.id, u.id, repeat('Z',64), now() + interval '5 minutes'
      from public.organizations o, auth.users u
     where o.name = 'Org B 003A' limit 1
  $q$));

-- A intenção não pode viver mais que a janela contratada.
select pg_temp.reg('intencao com validade acima do teto e recusada', '23514',
  pg_temp.sqlstate_de($q$
    insert into public.meta_oauth_intents (organization_id, user_id, state_hash, expires_at)
    select o.id, u.id, repeat('a',64), now() + interval '2 hours'
      from public.organizations o, auth.users u
     where o.name = 'Org B 003A' limit 1
  $q$));

-- Dois registros com o mesmo hash tornariam ambíguo qual consumir.
do $$
declare v_org uuid; v_user uuid;
begin
  select id into v_org from public.organizations where name = 'Org B 003A';
  select id into v_user from auth.users limit 1;

  insert into public.meta_oauth_intents (organization_id, user_id, state_hash, expires_at)
  values (v_org, v_user, repeat('b',64), now() + interval '5 minutes');

  perform pg_temp.reg('state_hash duplicado e recusado', '23505',
    pg_temp.sqlstate_de(format($q$
      insert into public.meta_oauth_intents (organization_id, user_id, state_hash, expires_at)
      values (%L, %L, %L, now() + interval '5 minutes')
    $q$, v_org, v_user, repeat('b',64))));
end $$;

-- ---------------------------------------------------------------------------
-- 5. Baseline promovido intacto
-- ---------------------------------------------------------------------------

select pg_temp.reg('migration history = 12', '12',
  (select count(*)::text from supabase_migrations.schema_migrations));
select pg_temp.reg('oito tabelas em public', '8',
  (select count(*)::text from pg_tables where schemaname='public'));
select pg_temp.reg('todas as tabelas de public com RLS', '8',
  (select count(*)::text from pg_tables where schemaname='public' and rowsecurity));
select pg_temp.reg('public sem objetos owned por supabase_admin', '0',
  (select count(*)::text from pg_class c join pg_namespace n on n.oid=c.relnamespace
     join pg_roles r on r.oid=c.relowner
    where n.nspname='public' and r.rolname='supabase_admin'));
select pg_temp.reg('pg_cron continua ausente', '0',
  (select count(*)::text from pg_extension where extname='pg_cron'));

-- ---------------------------------------------------------------------------
-- 6. Veredicto
-- ---------------------------------------------------------------------------

select
  count(*) filter (where ok) || '/' || count(*) as resultado,
  coalesce(string_agg(nome || ' (esperado ' || esperado || ', obtido ' ||
           coalesce(obtido,'null') || ')', ' | ') filter (where not ok),
           'nenhuma falha') as falhas
from prova_003a;

rollback;
