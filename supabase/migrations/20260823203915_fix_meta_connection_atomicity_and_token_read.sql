-- Correção 003A-02 — atomicidade da conexão e fronteira de leitura do token
-- Mandato: rodadas/gpt/CORRECAO_003A_02_AUTORIZACAO_ATOMICIDADE_OAUTH_REAL.md
--
-- Fecha três bloqueios da auditoria. Nenhuma migration anterior é editada.
--
-- §3.4 — `upsert(onConflict: organization_id)` não funciona contra o índice
--   único **parcial** `meta_connections_one_live_per_org_uniq`: `ON CONFLICT`
--   exige um índice que cubra a especificação, e o parcial não cobre. Pior, se
--   funcionasse, colidiria também com linhas terminais e destruiria o histórico
--   que o índice parcial existe para preservar. A decisão "atualizar a viva ou
--   inserir uma nova" vira SQL explícito aqui.
--
-- §3.5 — guardar o token e falhar ao marcar `ACTIVE` deixava a conexão em
--   estado incoerente enquanto o gateway retornava sucesso. As duas coisas
--   passam a acontecer na mesma transação.
--
-- §3.6 — a revogação oficial na Meta (`DELETE /{user-id}/permissions`) precisa
--   do token. Esta é a única função que o devolve, e ela é server-only.

-- ---------------------------------------------------------------------------
-- 1. Abrir/retomar a conexão sem upsert
-- ---------------------------------------------------------------------------

create function public.begin_meta_connection(
  p_organization_id uuid,
  p_user_id uuid,
  p_api_version text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if p_organization_id is null or p_user_id is null then
    raise exception 'organizacao e usuario sao obrigatorios' using errcode = '22023';
  end if;

  -- Reconexão sobre a conexão viva, se houver. `for update` serializa duas
  -- autorizações simultâneas da mesma organização.
  select id into v_id
  from public.meta_connections
  where organization_id = p_organization_id
    and status in ('PENDING', 'ACTIVE', 'ACTION_REQUIRED')
  for update;

  if found then
    -- Volta a `PENDING` preservando o token atual: se a nova autorização
    -- falhar no meio, a conexão anterior não é destruída sem substituto.
    update public.meta_connections
    set status = 'PENDING',
        connected_by = p_user_id,
        api_version_last_verified = p_api_version,
        action_required_reason = null,
        disconnected_at = null,
        updated_at = pg_catalog.now()
    where id = v_id;

    return v_id;
  end if;

  -- Sem conexão viva: linha nova. As terminais anteriores continuam como
  -- histórico, e o índice parcial permite exatamente isso.
  insert into public.meta_connections (
    organization_id, status, connected_by, api_version_last_verified
  )
  values (p_organization_id, 'PENDING', p_user_id, p_api_version)
  returning id into v_id;

  return v_id;
end;
$$;

comment on function public.begin_meta_connection(uuid, uuid, text) is
  'Abre ou retoma a conexao viva da organizacao, sem upsert e preservando historico.';

-- ---------------------------------------------------------------------------
-- 2. Ativar em uma única transação
-- ---------------------------------------------------------------------------

-- Segredo, referência, escopos, identidade e status mudam juntos. Antes, um
-- erro entre "guardar o token" e "marcar ACTIVE" deixava a conexão `PENDING`
-- com token — e o gateway respondia sucesso.
create function public.activate_meta_connection(
  p_connection_id uuid,
  p_token text,
  p_expires_at timestamptz,
  p_scopes text[],
  p_external_user_id text
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
  where id = p_connection_id
  for update;

  if not found then
    raise exception 'conexao inexistente' using errcode = '23503';
  end if;

  v_nome := 'meta_connection_' || p_connection_id::text;

  if v_referencia is null then
    v_referencia := vault.create_secret(
      p_token, v_nome, 'Token Meta da conexao ' || p_connection_id::text
    );
  else
    perform vault.update_secret(v_referencia, p_token);
  end if;

  -- Um único UPDATE: o CHECK `meta_connections_active_requires_token` vê a
  -- linha final, com token e status coerentes.
  update public.meta_connections
  set token_secret_reference = v_referencia,
      token_expires_at = p_expires_at,
      granted_scopes = coalesce(p_scopes, '{}'),
      external_user_id = p_external_user_id,
      status = 'ACTIVE',
      connected_at = pg_catalog.now(),
      last_health_check_at = pg_catalog.now(),
      action_required_reason = null,
      updated_at = pg_catalog.now()
  where id = p_connection_id;
end;
$$;

comment on function public.activate_meta_connection(uuid, text, timestamptz, text[], text) is
  'Grava o segredo no Vault e marca ACTIVE na mesma transacao. Sucesso parcial deixa de existir.';

-- ---------------------------------------------------------------------------
-- 3. Ler o token — única fronteira que o devolve
-- ---------------------------------------------------------------------------

-- Existe por uma razão específica: revogar de verdade na Meta exige apresentar
-- o token (`DELETE /{user-id}/permissions`). Sem isso, "desconectar" limparia
-- só o estado local e deixaria o app autorizado do lado do provider.
--
-- `security invoker` basta: `service_role` já lê `vault.decrypted_secrets`.
-- EXECUTE só para `service_role`; o retorno nunca vai a log, browser, fila,
-- audit metadata ou relatório (`SECURITY_MODEL.md` §15.1).
create function public.read_meta_connection_token(p_connection_id uuid)
returns text
language sql
stable
security invoker
set search_path = ''
as $$
  select s.decrypted_secret
  from public.meta_connections c
  join vault.decrypted_secrets s on s.id = c.token_secret_reference
  where c.id = p_connection_id;
$$;

comment on function public.read_meta_connection_token(uuid) is
  'Devolve o token Meta para o caminho server-side de revogacao. Nunca exposto ao browser.';

-- ---------------------------------------------------------------------------
-- 4. ACL
-- ---------------------------------------------------------------------------

revoke all on function public.begin_meta_connection(uuid, uuid, text)
  from public, anon, authenticated;
revoke all on function public.activate_meta_connection(uuid, text, timestamptz, text[], text)
  from public, anon, authenticated;
revoke all on function public.read_meta_connection_token(uuid)
  from public, anon, authenticated;

grant execute on function public.begin_meta_connection(uuid, uuid, text) to service_role;
grant execute on function public.activate_meta_connection(uuid, text, timestamptz, text[], text) to service_role;
grant execute on function public.read_meta_connection_token(uuid) to service_role;
