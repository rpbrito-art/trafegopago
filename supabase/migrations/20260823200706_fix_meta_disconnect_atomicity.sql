-- Rodada 003A — desconexão atômica da conexão Meta
--
-- ## O defeito que esta migration corrige
--
-- `delete_meta_connection_token`, criada em `20260823195742`, limpava
-- `token_secret_reference` num UPDATE e deixava o status para o chamador. Isso
-- não funciona, e a prova da rodada expôs o motivo:
--
--   * `meta_connections_active_requires_token` exige token quando `ACTIVE`;
--   * `meta_connections_revoked_has_no_token` exige ausência quando `REVOKED`.
--
-- Não existe ordem possível em dois passos. Limpar a referência com a conexão
-- ainda `ACTIVE` viola o primeiro CHECK; marcar `REVOKED` antes de limpar viola
-- o segundo. **A transição precisa acontecer num único UPDATE** — que é
-- exatamente o que os dois CHECKs, juntos, estavam pedindo.
--
-- Os CHECKs estão certos e permanecem: eles impedem que uma conexão exista em
-- estado incoerente. O que estava errado era a função tentar chegar lá em duas
-- etapas.
--
-- A migration `20260823195742` **não** é reescrita. A função defeituosa é
-- removida e substituída por uma que expressa a operação real — desconectar, e
-- não "apagar um campo".

drop function if exists public.delete_meta_connection_token(uuid);

-- ---------------------------------------------------------------------------
-- Desconectar: um único UPDATE, depois o segredo
-- ---------------------------------------------------------------------------

create function public.revoke_meta_connection(p_connection_id uuid)
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

  -- Status e referência mudam juntos. Os dois CHECKs veem a linha final, não um
  -- estado intermediário incoerente.
  update public.meta_connections
  set status = 'REVOKED',
      token_secret_reference = null,
      token_expires_at = null,
      granted_scopes = '{}',
      action_required_reason = null,
      disconnected_at = pg_catalog.now(),
      updated_at = pg_catalog.now()
  where id = p_connection_id;

  -- O segredo sai por último. Se o processo morrer aqui, sobra um segredo órfão
  -- no Vault — inofensivo, porque nada mais o referencia — em vez de uma
  -- conexão que parece ativa apontando para um segredo que já não existe.
  if v_referencia is not null then
    delete from vault.secrets where id = v_referencia;
  end if;
end;
$$;

comment on function public.revoke_meta_connection(uuid) is
  'Desconecta a Meta: marca REVOKED e limpa a referencia no mesmo UPDATE, depois remove o segredo do Vault.';

revoke all on function public.revoke_meta_connection(uuid)
  from public, anon, authenticated;
grant execute on function public.revoke_meta_connection(uuid) to service_role;
