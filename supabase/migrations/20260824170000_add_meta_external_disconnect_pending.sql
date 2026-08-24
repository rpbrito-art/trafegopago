-- Correção 003A-10 — remoção externa pendente sobrevive à sessão
-- Mandato: rodadas/gpt/CORRECAO_003A_10_VERIFICACAO_BISU_POS_REMOCAO.md
--
-- A credencial BISU é encerrada em `Configurações do negócio > Apps
-- conectados`, fora do nosso produto. Entre pedir a desconexão e a remoção
-- acontecer lá, existe um intervalo — e ele pode durar dias, atravessar
-- logout, troca de dispositivo e nova sessão.
--
-- Até aqui esse intervalo só existia na query string (`?meta=externo`). Um
-- reload apagava a trilha e a tela voltava a dizer "Meta conectada", como se
-- nada tivesse começado. Estado de processo não pode morar na URL.
--
-- Nenhuma migration anterior é editada.

-- ---------------------------------------------------------------------------
-- 1. O marcador
-- ---------------------------------------------------------------------------

alter table public.meta_connections
  add column external_disconnect_pending_at timestamptz;

comment on column public.meta_connections.external_disconnect_pending_at is
  'Quando a remocao externa da integracao BISU foi pedida. Nulo = nao ha remocao pendente.';

-- O browser precisa saber que existe uma remoção em curso para mostrar a
-- trilha. Saber *quando* foi pedida não expõe nada: não é credencial, não é
-- identificador externo, não recupera segredo.
grant select (external_disconnect_pending_at)
  on table public.meta_connections to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Marcar a remoção como pendente
-- ---------------------------------------------------------------------------

-- Idempotente de propósito: clicar `Desconectar` de novo enquanto a remoção
-- está pendente não deve reiniciar a contagem nem produzir efeito novo.
create function public.mark_meta_external_disconnect_pending(p_connection_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_connection_id is null then
    raise exception 'p_connection_id e obrigatorio' using errcode = '22023';
  end if;

  update public.meta_connections
  set external_disconnect_pending_at =
        coalesce(external_disconnect_pending_at, pg_catalog.now()),
      updated_at = pg_catalog.now()
  where id = p_connection_id
    and status in ('PENDING', 'ACTIVE', 'ACTION_REQUIRED');

  if not found then
    raise exception 'conexao viva inexistente' using errcode = '23503';
  end if;
end;
$$;

comment on function public.mark_meta_external_disconnect_pending(uuid) is
  'Registra que a remocao externa da integracao foi pedida. Idempotente; nao toca no token.';

-- ---------------------------------------------------------------------------
-- 3. A limpeza final também encerra o marcador
-- ---------------------------------------------------------------------------

-- `create or replace` sobre a função da `20260823200706`: mesmo contrato, mais
-- uma coluna zerada. A alternativa — deixar `external_disconnect_pending_at`
-- preenchido numa linha `REVOKED` — faria uma reconexão futura nascer com uma
-- remoção pendente herdada do ciclo anterior.
create or replace function public.revoke_meta_connection(p_connection_id uuid)
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
      external_disconnect_pending_at = null,
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

-- ---------------------------------------------------------------------------
-- 4. ACL
-- ---------------------------------------------------------------------------

revoke all on function public.mark_meta_external_disconnect_pending(uuid)
  from public, anon, authenticated;

grant execute on function public.mark_meta_external_disconnect_pending(uuid)
  to service_role;
