-- Rodada 003A — fronteira do token Meta sobre o Supabase Vault
-- Mandato: rodadas/gpt/RODADA_003A_META_CONNECTION_FOUNDATION.md §4.3
--
-- ## O problema que estas funções resolvem
--
-- O token precisa ir para o Vault, mas o schema `vault` **não** está exposto na
-- Data API (`api.schemas = ["public", "graphql_public"]`) — e expô-lo seria
-- abrir a caixa de segredos ao PostgREST. Sem um caminho em `public`, o
-- servidor Node não alcança `vault.create_secret`.
--
-- ## Por que INVOKER e não DEFINER
--
-- Verificado antes desta migration: `service_role` já tem USAGE no schema
-- `vault` e EXECUTE em `vault.create_secret`/`vault.update_secret` — que são
-- SECURITY DEFINER do **próprio Supabase**, não nossas. Logo um wrapper
-- SECURITY INVOKER executado por `service_role` funciona sem nenhuma escalada
-- de privilégio adicional.
--
-- Não há função `SECURITY DEFINER` nova neste projeto por causa da Meta.
--
-- ## O que o browser vê
--
-- Nada. EXECUTE apenas para `service_role`, e a referência do segredo já está
-- fora do grant por coluna de `meta_connections`.

-- ---------------------------------------------------------------------------
-- 1. Guardar o token
-- ---------------------------------------------------------------------------

create function public.store_meta_connection_token(
  p_connection_id uuid,
  p_token text,
  p_expires_at timestamptz default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_referencia uuid;
  v_nome text;
begin
  if p_connection_id is null then
    raise exception 'p_connection_id e obrigatorio' using errcode = '22023';
  end if;

  if p_token is null or btrim(p_token) = '' then
    raise exception 'token vazio' using errcode = '22023';
  end if;

  select token_secret_reference into v_referencia
  from public.meta_connections
  where id = p_connection_id;

  if not found then
    raise exception 'conexao inexistente' using errcode = '23503';
  end if;

  -- Nome derivado do id da conexão: estável, único e sem PII. Não é segredo —
  -- o segredo é o valor, que o Vault cifra em repouso.
  v_nome := 'meta_connection_' || p_connection_id::text;

  if v_referencia is null then
    v_referencia := vault.create_secret(
      p_token,
      v_nome,
      'Token Meta da conexao ' || p_connection_id::text
    );
  else
    -- Reconexão sobre a mesma linha: substitui o valor em vez de acumular
    -- segredos órfãos no Vault.
    perform vault.update_secret(v_referencia, p_token);
  end if;

  update public.meta_connections
  set token_secret_reference = v_referencia,
      token_expires_at = p_expires_at,
      updated_at = pg_catalog.now()
  where id = p_connection_id;
end;
$$;

comment on function public.store_meta_connection_token(uuid, text, timestamptz) is
  'Guarda o token Meta no Vault e registra apenas a referencia opaca na conexao.';

-- ---------------------------------------------------------------------------
-- 2. Remover o token
-- ---------------------------------------------------------------------------

-- Desconectar precisa eliminar o segredo de verdade, não só marcar a linha:
-- uma referência limpa com o segredo vivo no Vault seria um token esquecido.
create function public.delete_meta_connection_token(p_connection_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_referencia uuid;
begin
  if p_connection_id is null then
    raise exception 'p_connection_id e obrigatorio' using errcode = '22023';
  end if;

  select token_secret_reference into v_referencia
  from public.meta_connections
  where id = p_connection_id;

  if not found then
    raise exception 'conexao inexistente' using errcode = '23503';
  end if;

  -- Limpa a referência ANTES de remover o segredo: se o processo morrer entre
  -- as duas operações, sobra um segredo órfão no Vault — inofensivo e
  -- detectável — em vez de uma referência apontando para o nada, que faria a
  -- conexão parecer válida.
  update public.meta_connections
  set token_secret_reference = null,
      token_expires_at = null,
      updated_at = pg_catalog.now()
  where id = p_connection_id;

  if v_referencia is not null then
    delete from vault.secrets where id = v_referencia;
  end if;
end;
$$;

comment on function public.delete_meta_connection_token(uuid) is
  'Remove o token Meta do Vault e limpa a referencia. Usado na desconexao.';

-- ---------------------------------------------------------------------------
-- 3. Saúde do segredo, sem devolvê-lo
-- ---------------------------------------------------------------------------

-- Health mínimo (mandato §4.4) sem criar uma função que retorne token. Nesta
-- rodada nada precisa ler o valor de volta: a troca `code → token` acontece no
-- servidor e o token vai direto para o Vault. Uma função de leitura entra
-- quando houver chamada real à Meta, e será decidida junto com ela.
create function public.meta_connection_token_present(p_connection_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1
    from public.meta_connections c
    join vault.secrets s on s.id = c.token_secret_reference
    where c.id = p_connection_id
  );
$$;

comment on function public.meta_connection_token_present(uuid) is
  'Indica se o segredo referenciado existe no Vault. Nunca devolve o token.';

-- ---------------------------------------------------------------------------
-- 4. ACL
-- ---------------------------------------------------------------------------

revoke all on function public.store_meta_connection_token(uuid, text, timestamptz)
  from public, anon, authenticated;
revoke all on function public.delete_meta_connection_token(uuid)
  from public, anon, authenticated;
revoke all on function public.meta_connection_token_present(uuid)
  from public, anon, authenticated;

grant execute on function public.store_meta_connection_token(uuid, text, timestamptz)
  to service_role;
grant execute on function public.delete_meta_connection_token(uuid)
  to service_role;
grant execute on function public.meta_connection_token_present(uuid)
  to service_role;
