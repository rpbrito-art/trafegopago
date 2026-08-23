-- Rodada 002B — Queue + Worker Foundation
-- Mandato: rodadas/gpt/RODADA_002B_QUEUE_WORKER_FOUNDATION.md
--
-- A 002A criou a memória das operações. Esta rodada cria a esteira interna que
-- pega uma tarefa pendente e a processa sem depender da tela do usuário:
--
--   1. extensão `pgmq` e a fila durável `integration_jobs`;
--   2. wrappers estreitos em `public` para a fronteira da fila;
--   3. helpers de claim/conclusão de `operations` para o worker.
--
-- ## Por que wrappers, e por que SECURITY DEFINER só neles
--
-- O worker precisa operar a fila, mas conceder EXECUTE nas funções de `pgmq`
-- daria acesso a **qualquer** fila e ao schema da extensão. Os wrappers abaixo
-- são a fronteira estreita autorizada pelo mandato §2.2: nome de fila
-- hardcoded, zero SQL dinâmico, parâmetros com teto, `search_path` vazio e
-- EXECUTE apenas para `service_role`.
--
-- Essa exceção vale só aqui. Os helpers de `operations` no fim do arquivo são
-- SECURITY INVOKER: `service_role` já tem os grants necessários naquela tabela
-- desde a 002A, e um DEFINER ali adicionaria escalada de privilégio para
-- resolver um problema que não existe.
--
-- ## O que NÃO está aqui, deliberadamente
--
-- - `pgmq_public` não é exposto e `supabase/config.toml` não ganha esse schema:
--   a fila é server-only (mandato §2.1);
-- - nenhum cron/scheduler (§5.6);
-- - nenhuma `public.integration_jobs` (§5.7): PGMQ já persiste mensagem,
--   read count e timestamps, e `operations` já persiste o estado mutável.
--   Uma terceira tabela duplicaria estado sem necessidade provada.

-- ---------------------------------------------------------------------------
-- 1. Extensão e fila
-- ---------------------------------------------------------------------------

create extension if not exists pgmq;

-- `pgmq.create` cria fila **logged/durável**. `pgmq.create_unlogged` existe e
-- não é usada de propósito: perder jobs num restart do Postgres é exatamente o
-- que uma fila de integração não pode fazer.
select pgmq.create('integration_jobs');

-- ---------------------------------------------------------------------------
-- 2. Envelope da mensagem — validação no próprio banco
-- ---------------------------------------------------------------------------

-- Validar aqui, e não só no TypeScript, porque a fila é a fronteira: o que
-- entra malformado só é descoberto no consumidor, quando já custou uma leitura,
-- um redelivery e uma linha de log. `stable` e sem efeito colateral.
create function public.is_valid_integration_job_message(p_message jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select
    p_message is not null
    and jsonb_typeof(p_message) = 'object'
    -- Versão fechada em 1 nesta rodada: um consumidor que não conhece a
    -- versão futura deve recusar, não adivinhar.
    and p_message ->> 'version' = '1'
    and (p_message ->> 'organizationId') ~
      '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    and (p_message ->> 'correlationId') ~
      '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    and btrim(coalesce(p_message ->> 'jobType', '')) <> ''
    and char_length(p_message ->> 'jobType') <= 120
    -- `operationId` ausente/nulo é válido; presente precisa ser UUID.
    and (
      p_message -> 'operationId' is null
      or jsonb_typeof(p_message -> 'operationId') = 'null'
      or (p_message ->> 'operationId') ~
        '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    )
    -- Payload pequeno e obrigatoriamente objeto: a mensagem referencia
    -- registros persistidos, não os duplica (API_CONTRACTS §11).
    and jsonb_typeof(p_message -> 'payload') = 'object'
    and char_length((p_message -> 'payload')::text) <= 4000;
$$;

comment on function public.is_valid_integration_job_message(jsonb) is
  'Valida o envelope de job antes de entrar na fila. Espelha src/lib/operations/job-message.ts.';

revoke all on function public.is_valid_integration_job_message(jsonb)
  from public, anon, authenticated;
grant execute on function public.is_valid_integration_job_message(jsonb)
  to service_role;

-- ---------------------------------------------------------------------------
-- 3. Fronteira da fila — os únicos pontos que tocam `pgmq`
-- ---------------------------------------------------------------------------

-- Enfileirar.
create function public.enqueue_integration_job(p_message jsonb)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_msg_id bigint;
begin
  if not public.is_valid_integration_job_message(p_message) then
    raise exception 'envelope de job invalido'
      using errcode = '22023';
  end if;

  -- Fila hardcoded. O nome nunca vem de parâmetro: um wrapper genérico daria
  -- ao chamador o poder de operar qualquer fila do projeto.
  -- `pgmq.send` devolve SETOF bigint; a forma escalar evita depender do nome
  -- da coluna implícita da função.
  v_msg_id := (
    select s from pgmq.send('integration_jobs', p_message) as s limit 1
  );

  return v_msg_id;
end;
$$;

comment on function public.enqueue_integration_job(jsonb) is
  'Fronteira de escrita da fila integration_jobs. Valida o envelope antes de enfileirar.';

-- Ler um lote com visibility timeout.
create function public.read_integration_jobs(
  p_visibility_seconds integer,
  p_quantity integer
)
returns table (
  msg_id bigint,
  read_ct integer,
  enqueued_at timestamptz,
  vt timestamptz,
  message jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Tetos explícitos. Sem eles, um lote gigante ou um vt absurdo viraria
  -- negação de serviço contra a própria fila.
  if p_quantity is null or p_quantity < 1 or p_quantity > 10 then
    raise exception 'p_quantity deve estar entre 1 e 10'
      using errcode = '22023';
  end if;

  if p_visibility_seconds is null
     or p_visibility_seconds < 5
     or p_visibility_seconds > 900 then
    raise exception 'p_visibility_seconds deve estar entre 5 e 900'
      using errcode = '22023';
  end if;

  -- Colunas listadas explicitamente: `pgmq.message_record` ganhou `headers` em
  -- versões recentes, e um `select *` acoplaria este contrato à versão da
  -- extensão.
  return query
  select r.msg_id, r.read_ct, r.enqueued_at, r.vt, r.message
  from pgmq.read('integration_jobs', p_visibility_seconds, p_quantity) as r;
end;
$$;

comment on function public.read_integration_jobs(integer, integer) is
  'Le um lote da fila integration_jobs com visibility timeout. Tetos: 1..10 mensagens, 5..900s.';

-- Confirmar conclusão: remove a mensagem em definitivo.
create function public.complete_integration_job(p_msg_id bigint)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_removida boolean;
begin
  if p_msg_id is null then
    raise exception 'p_msg_id e obrigatorio'
      using errcode = '22023';
  end if;

  select pgmq.delete('integration_jobs', p_msg_id) into v_removida;

  return coalesce(v_removida, false);
end;
$$;

comment on function public.complete_integration_job(bigint) is
  'Remove a mensagem concluida da fila integration_jobs.';

-- Arquivar: tira de circulação sem perder o rastro. É o destino de mensagem
-- inválida, de tipo não suportado e de poison message que estourou o teto.
create function public.archive_integration_job(p_msg_id bigint)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_arquivada boolean;
begin
  if p_msg_id is null then
    raise exception 'p_msg_id e obrigatorio'
      using errcode = '22023';
  end if;

  select pgmq.archive('integration_jobs', p_msg_id) into v_arquivada;

  return coalesce(v_arquivada, false);
end;
$$;

comment on function public.archive_integration_job(bigint) is
  'Move a mensagem para o arquivo da fila integration_jobs, sem perder o rastro.';

-- Adiar: devolve a mensagem à circulação depois de N segundos.
create function public.defer_integration_job(
  p_msg_id bigint,
  p_visibility_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_encontrada bigint;
begin
  if p_msg_id is null then
    raise exception 'p_msg_id e obrigatorio'
      using errcode = '22023';
  end if;

  if p_visibility_seconds is null
     or p_visibility_seconds < 0
     or p_visibility_seconds > 900 then
    raise exception 'p_visibility_seconds deve estar entre 0 e 900'
      using errcode = '22023';
  end if;

  select s.msg_id into v_encontrada
  from pgmq.set_vt('integration_jobs', p_msg_id, p_visibility_seconds) as s;

  return v_encontrada is not null;
end;
$$;

comment on function public.defer_integration_job(bigint, integer) is
  'Reagenda a visibilidade de uma mensagem da fila integration_jobs.';

-- ---------------------------------------------------------------------------
-- 4. ACL da fronteira da fila
-- ---------------------------------------------------------------------------

-- Estes wrappers são SECURITY DEFINER e rodam como `postgres`. Deixar EXECUTE
-- para PUBLIC/anon/authenticated transformaria cada um numa porta aberta para
-- a fila. Os REVOKEs são declarativos — os default privileges endurecidos da
-- 001D já nascem sem eles — e ficam explícitos na própria migration.
revoke all on function public.enqueue_integration_job(jsonb)
  from public, anon, authenticated;
revoke all on function public.read_integration_jobs(integer, integer)
  from public, anon, authenticated;
revoke all on function public.complete_integration_job(bigint)
  from public, anon, authenticated;
revoke all on function public.archive_integration_job(bigint)
  from public, anon, authenticated;
revoke all on function public.defer_integration_job(bigint, integer)
  from public, anon, authenticated;

grant execute on function public.enqueue_integration_job(jsonb) to service_role;
grant execute on function public.read_integration_jobs(integer, integer) to service_role;
grant execute on function public.complete_integration_job(bigint) to service_role;
grant execute on function public.archive_integration_job(bigint) to service_role;
grant execute on function public.defer_integration_job(bigint, integer) to service_role;

-- ---------------------------------------------------------------------------
-- 5. Helpers de `operations` para o worker
-- ---------------------------------------------------------------------------

-- SECURITY INVOKER, não DEFINER: quem executa é `service_role`, que já tem
-- SELECT/INSERT/UPDATE em `public.operations` desde a 002A. A exceção de
-- DEFINER autorizada pelo mandato §2.2 vale só para a fronteira da fila.

-- Claim atômico.
--
-- Identidade tripla (`id` + `organization_id` + `correlation_id`) e não só o
-- id: a mensagem vem da fila, e uma mensagem adulterada ou de outro contexto
-- não pode reivindicar operação alheia por acertar um UUID.
--
-- O UPDATE condicional é a exclusão mútua. Dois consumidores concorrentes
-- disputam o row lock; o perdedor reavalia o predicado depois do lock, encontra
-- `CLAIMED` recente e não atualiza. Não há checagem de leitura antes do UPDATE
-- justamente porque READ COMMITTED não a protegeria.
--
-- `p_stale_after_seconds` permite retomar uma operação cujo worker morreu. Tem
-- de ser maior que a visibility timeout usada na leitura — senão a operação
-- seria retomada enquanto a mensagem original ainda está invisível, e o efeito
-- rodaria duas vezes.
create function public.claim_operation(
  p_operation_id uuid,
  p_organization_id uuid,
  p_correlation_id uuid,
  p_stale_after_seconds integer default 900
)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_status text;
  v_atual text;
begin
  if p_operation_id is null
     or p_organization_id is null
     or p_correlation_id is null then
    raise exception 'identificacao da operacao e obrigatoria'
      using errcode = '22023';
  end if;

  if p_stale_after_seconds is null
     or p_stale_after_seconds < 60
     or p_stale_after_seconds > 86400 then
    raise exception 'p_stale_after_seconds deve estar entre 60 e 86400'
      using errcode = '22023';
  end if;

  update public.operations
  set status = 'CLAIMED',
      attempt_count = attempt_count + 1,
      updated_at = pg_catalog.now()
  where id = p_operation_id
    and organization_id = p_organization_id
    and correlation_id = p_correlation_id
    and (
      status = 'PENDING'
      or (
        -- Retomada de crash: só depois da janela de stale.
        status = 'CLAIMED'
        and updated_at < pg_catalog.now()
            - pg_catalog.make_interval(secs => p_stale_after_seconds)
      )
    )
  returning status into v_status;

  if v_status is not null then
    return 'CLAIMED';
  end if;

  -- Não atualizou: dizer **por que** é o que permite ao worker distinguir
  -- "já foi feito" de "alguém está fazendo" de "não existe".
  select status into v_atual
  from public.operations
  where id = p_operation_id
    and organization_id = p_organization_id
    and correlation_id = p_correlation_id;

  if v_atual is null then
    return 'NOT_FOUND';
  elsif v_atual = 'SUCCEEDED' then
    return 'ALREADY_SUCCEEDED';
  elsif v_atual = 'CLAIMED' then
    return 'ALREADY_CLAIMED';
  else
    -- FAILED, ACTION_REQUIRED, UNKNOWN. Estado terminal ou que exige decisão
    -- não é reaberto em silêncio por uma mensagem repetida.
    return 'NOT_CLAIMABLE';
  end if;
end;
$$;

comment on function public.claim_operation(uuid, uuid, uuid, integer) is
  'Claim atomico de operation pelo worker. Retorna CLAIMED, ALREADY_SUCCEEDED, ALREADY_CLAIMED, NOT_CLAIMABLE ou NOT_FOUND.';

-- Conclusão.
--
-- `now()` do banco em `updated_at`/`completed_at`, nunca relógio do chamador:
-- é a disciplina que substitui o CHECK temporal removido na 002A.
create function public.complete_operation(
  p_operation_id uuid,
  p_organization_id uuid,
  p_correlation_id uuid
)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_status text;
  v_atual text;
begin
  if p_operation_id is null
     or p_organization_id is null
     or p_correlation_id is null then
    raise exception 'identificacao da operacao e obrigatoria'
      using errcode = '22023';
  end if;

  update public.operations
  set status = 'SUCCEEDED',
      updated_at = pg_catalog.now(),
      completed_at = pg_catalog.now(),
      last_error_class = null,
      last_error_summary = null
  where id = p_operation_id
    and organization_id = p_organization_id
    and correlation_id = p_correlation_id
    and status = 'CLAIMED'
  returning status into v_status;

  if v_status is not null then
    return 'SUCCEEDED';
  end if;

  select status into v_atual
  from public.operations
  where id = p_operation_id
    and organization_id = p_organization_id
    and correlation_id = p_correlation_id;

  if v_atual is null then
    return 'NOT_FOUND';
  elsif v_atual = 'SUCCEEDED' then
    -- Idempotente de propósito: a segunda entrega da mesma mensagem encontra
    -- o trabalho feito e não o repete.
    return 'ALREADY_SUCCEEDED';
  else
    return 'NOT_COMPLETABLE';
  end if;
end;
$$;

comment on function public.complete_operation(uuid, uuid, uuid) is
  'Conclui operation CLAIMED como SUCCEEDED usando now() do banco. Idempotente para reentrega.';

-- Falha definitiva — usada quando a mensagem estourou o teto de tentativas.
create function public.fail_operation(
  p_operation_id uuid,
  p_organization_id uuid,
  p_correlation_id uuid,
  p_error_class text,
  p_error_summary text
)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_status text;
  v_atual text;
begin
  if p_operation_id is null
     or p_organization_id is null
     or p_correlation_id is null then
    raise exception 'identificacao da operacao e obrigatoria'
      using errcode = '22023';
  end if;

  -- A taxonomia já é fechada pelo CHECK da 002A; aqui só recusamos antes de
  -- gastar o UPDATE. Nenhuma classificação nova é inventada.
  update public.operations
  set status = 'FAILED',
      updated_at = pg_catalog.now(),
      completed_at = pg_catalog.now(),
      last_error_class = p_error_class,
      last_error_summary = p_error_summary
  where id = p_operation_id
    and organization_id = p_organization_id
    and correlation_id = p_correlation_id
    and status in ('PENDING', 'CLAIMED')
  returning status into v_status;

  if v_status is not null then
    return 'FAILED';
  end if;

  select status into v_atual
  from public.operations
  where id = p_operation_id
    and organization_id = p_organization_id
    and correlation_id = p_correlation_id;

  if v_atual is null then
    return 'NOT_FOUND';
  elsif v_atual = 'SUCCEEDED' then
    -- Não rebaixa sucesso já registrado.
    return 'ALREADY_SUCCEEDED';
  else
    return 'NOT_FAILABLE';
  end if;
end;
$$;

comment on function public.fail_operation(uuid, uuid, uuid, text, text) is
  'Encerra operation como FAILED apos teto de tentativas. Nao rebaixa SUCCEEDED.';

-- ---------------------------------------------------------------------------
-- 6. ACL dos helpers de operations
-- ---------------------------------------------------------------------------

revoke all on function public.claim_operation(uuid, uuid, uuid, integer)
  from public, anon, authenticated;
revoke all on function public.complete_operation(uuid, uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.fail_operation(uuid, uuid, uuid, text, text)
  from public, anon, authenticated;

grant execute on function public.claim_operation(uuid, uuid, uuid, integer) to service_role;
grant execute on function public.complete_operation(uuid, uuid, uuid) to service_role;
grant execute on function public.fail_operation(uuid, uuid, uuid, text, text) to service_role;
