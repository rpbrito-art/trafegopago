-- Correção 004E-01 — Reserva atômica antes da chamada paga
-- Mandato: rodadas/gpt/CORRECAO_004E_01_PREPAID_SAFETY_PROVIDER_CONTRACT.md §4
--
-- O fluxo auditado era `cache → contar → provider → inserir`, com as etapas
-- separadas. Duas requisições simultâneas para o mesmo contexto encontravam o
-- mesmo "sem cache" e a mesma contagem abaixo do teto, chamavam o provider as
-- duas, e só competiam depois — no índice único da revisão, com o dinheiro já
-- gasto. Quatro requisições simultâneas furavam o teto de 3/h pelo mesmo
-- motivo.
--
-- O botão desabilitado do formulário evita duplo clique acidental. Não é
-- controle de concorrência: requisições paralelas, replay e abas duplicadas
-- passam por ele.
--
-- A correção move a decisão para uma **reserva**, adquirida numa transação
-- serializada por organização, antes de qualquer chamada. Quem não adquire não
-- chega ao Router.
--
-- Delta aditivo. `20260825250000_create_declared_context_review.sql` já foi
-- aplicada e **não é reescrita**.

-- ---------------------------------------------------------------------------
-- 1. public.declared_context_review_attempts
-- ---------------------------------------------------------------------------

create table public.declared_context_review_attempts (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id) on delete cascade,

  -- O mesmo fingerprint do artefato: é por ele que duas tentativas do mesmo
  -- contexto se reconhecem.
  input_fingerprint text not null,

  task_type text not null,
  task_version text not null,
  prompt_version text not null,
  schema_version text not null,

  -- `RESERVED` é a única que impede outra tentativa do mesmo fingerprint. As
  -- demais são desfechos, e todas contam para o teto da janela: o que custa é
  -- ter chegado a chamar, não ter dado certo.
  status text not null default 'RESERVED',

  reserved_at timestamptz not null default now(),

  -- Reserva órfã — processo morto, timeout, deploy no meio — não pode travar o
  -- contexto para sempre. Depois desta hora ela é expirável por qualquer nova
  -- aquisição.
  expires_at timestamptz not null,

  ai_run_id uuid,
  completed_at timestamptz,

  constraint declared_context_review_attempts_status_valid
    check (status in ('RESERVED', 'COMPLETED', 'FAILED', 'EXPIRED')),

  -- Estado e timestamp andam juntos: `COMPLETED` sem hora não diz quando, e
  -- `RESERVED` com hora de conclusão é contradição.
  constraint declared_context_review_attempts_completed_has_timestamp
    check (status not in ('COMPLETED', 'FAILED') or completed_at is not null),
  constraint declared_context_review_attempts_reserved_has_no_completion
    check (status <> 'RESERVED' or completed_at is null),

  -- Só uma tentativa concluída com sucesso aponta para um run.
  constraint declared_context_review_attempts_run_only_when_finished
    check (ai_run_id is null or status in ('COMPLETED', 'FAILED')),

  constraint declared_context_review_attempts_expires_after_reserve
    check (expires_at > reserved_at),

  constraint declared_context_review_attempts_fingerprint_not_blank
    check (btrim(input_fingerprint) <> ''),
  constraint declared_context_review_attempts_fingerprint_max_length
    check (char_length(input_fingerprint) <= 128),

  -- O run pertence ao mesmo tenant da tentativa. Mesma ordem de colunas do
  -- índice `ai_runs_id_organization_uniq` da 004A.
  constraint declared_context_review_attempts_run_same_tenant
    foreign key (ai_run_id, organization_id)
    references public.ai_runs (id, organization_id)
    on delete set null
);

comment on table public.declared_context_review_attempts is
  'Reserva de execucao da revisao. Adquirida antes de qualquer chamada paga; serializa por organizacao.';

comment on column public.declared_context_review_attempts.status is
  'RESERVED bloqueia o mesmo fingerprint. Todos os desfechos contam para o teto horario.';

-- **A** garantia contra duplicidade: uma única tentativa in-flight por
-- contexto e versões. Não é a aplicação que decide isso — é o índice.
create unique index declared_context_review_attempts_one_inflight
  on public.declared_context_review_attempts (
    organization_id, input_fingerprint, task_version, prompt_version, schema_version
  )
  where status = 'RESERVED';

-- Contagem da janela móvel de uma hora.
create index declared_context_review_attempts_org_reserved_at_idx
  on public.declared_context_review_attempts (organization_id, reserved_at desc);

-- Cobertura da FK composta para `ai_runs`.
create index declared_context_review_attempts_org_run_idx
  on public.declared_context_review_attempts (organization_id, ai_run_id)
  where ai_run_id is not null;

alter table public.declared_context_review_attempts enable row level security;

-- Tabela interna de execução: o browser não a lê nem a escreve. Sem grant e
-- sem policy, ela não existe para `anon`/`authenticated` — mesma forma de
-- `ai_runs`.
revoke all on table public.declared_context_review_attempts from anon, authenticated;

grant select, insert on table public.declared_context_review_attempts to service_role;

-- UPDATE apenas nas colunas do desfecho: identidade, tenant, fingerprint e
-- versões da tentativa não se reescrevem.
grant update (status, ai_run_id, completed_at)
  on table public.declared_context_review_attempts to service_role;

-- ---------------------------------------------------------------------------
-- 2. public.acquire_declared_context_review_slot
-- ---------------------------------------------------------------------------

-- Adquire — ou recusa — o direito de chamar o provider.
--
-- Tudo acontece sob o mesmo advisory lock por organização, e é isso que torna
-- a decisão atômica: entre verificar o cache, contar a janela e criar a
-- reserva, nenhuma outra transação da mesma organização entra.
--
-- `security invoker`: quem chama é `service_role`, que já tem os grants. Um
-- DEFINER acrescentaria escalada de privilégio sem resolver nada.
--
-- Desfechos, todos fechados:
--
--   CACHE        — já existe revisão para este contexto; não chame ninguém;
--   IN_FLIGHT    — outra requisição já está executando este mesmo contexto;
--   RATE_LIMITED — o teto da janela foi atingido;
--   RESERVED     — pode chamar, e esta é a sua reserva.
create function public.acquire_declared_context_review_slot(
  p_user_id uuid,
  p_organization_id uuid,
  p_input_fingerprint text,
  p_task_type text,
  p_task_version text,
  p_prompt_version text,
  p_schema_version text,
  p_max_per_hour integer default 3,
  p_ttl_seconds integer default 120
)
returns table (outcome text, attempt_id uuid)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_agora timestamptz := now();
  v_janela timestamptz;
  v_usadas integer;
  v_id uuid;
begin
  if p_user_id is null or p_organization_id is null
     or p_input_fingerprint is null or btrim(p_input_fingerprint) = ''
  then
    raise exception 'parametros obrigatorios ausentes' using errcode = '22023';
  end if;

  if p_max_per_hour is null or p_max_per_hour < 1
     or p_ttl_seconds is null or p_ttl_seconds < 1
  then
    raise exception 'limites invalidos' using errcode = '22023';
  end if;

  -- Serializa **toda** a decisão desta organização. Sem ele, duas transações
  -- leem a mesma contagem e as duas concluem que há vaga.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'declared_context_review:' || p_organization_id::text, 0
    )
  );

  -- Autorização lida do banco, não recebida por parâmetro. Só quem pode
  -- alterar a direção do negócio gera custo novo.
  if not exists (
    select 1
    from public.organization_members m
    join public.organizations o on o.id = m.organization_id
    where m.user_id = p_user_id
      and m.organization_id = p_organization_id
      and m.status = 'ACTIVE'
      and o.status = 'ACTIVE'
      and m.role in ('owner', 'admin')
  ) then
    raise exception 'usuario nao autorizado a pedir revisao'
      using errcode = '42501';
  end if;

  -- Reservas vencidas viram `EXPIRED` antes de qualquer decisão: uma tentativa
  -- interrompida não pode travar o contexto para sempre.
  update public.declared_context_review_attempts
     set status = 'EXPIRED'
   where organization_id = p_organization_id
     and status = 'RESERVED'
     and expires_at <= v_agora;

  -- Cache vence tudo — inclusive uma reserva em andamento. Se a revisão já
  -- existe, ninguém precisa chamar o provider.
  if exists (
    select 1
    from public.declared_context_reviews r
    where r.organization_id = p_organization_id
      and r.input_fingerprint = p_input_fingerprint
      and r.task_version = p_task_version
      and r.prompt_version = p_prompt_version
      and r.schema_version = p_schema_version
  ) then
    return query select 'CACHE'::text, null::uuid;
    return;
  end if;

  if exists (
    select 1
    from public.declared_context_review_attempts a
    where a.organization_id = p_organization_id
      and a.input_fingerprint = p_input_fingerprint
      and a.task_version = p_task_version
      and a.prompt_version = p_prompt_version
      and a.schema_version = p_schema_version
      and a.status = 'RESERVED'
  ) then
    return query select 'IN_FLIGHT'::text, null::uuid;
    return;
  end if;

  -- Janela móvel de uma hora, contada por `reserved_at`. Conta **todos** os
  -- desfechos: o que consome cota é ter adquirido o direito de chamar, não o
  -- resultado da chamada.
  v_janela := v_agora - make_interval(secs => 3600);

  select count(*) into v_usadas
  from public.declared_context_review_attempts a
  where a.organization_id = p_organization_id
    and a.reserved_at >= v_janela;

  if v_usadas >= p_max_per_hour then
    return query select 'RATE_LIMITED'::text, null::uuid;
    return;
  end if;

  insert into public.declared_context_review_attempts (
    organization_id, input_fingerprint, task_type, task_version,
    prompt_version, schema_version, status, reserved_at, expires_at
  )
  values (
    p_organization_id, p_input_fingerprint, p_task_type, p_task_version,
    p_prompt_version, p_schema_version, 'RESERVED', v_agora,
    v_agora + make_interval(secs => p_ttl_seconds)
  )
  returning id into v_id;

  return query select 'RESERVED'::text, v_id;
end;
$$;

comment on function public.acquire_declared_context_review_slot(
  uuid, uuid, text, text, text, text, text, integer, integer
) is
  'Decide atomicamente se uma revisao pode chamar o provider. CACHE|IN_FLIGHT|RATE_LIMITED|RESERVED.';

revoke all on function public.acquire_declared_context_review_slot(
  uuid, uuid, text, text, text, text, text, integer, integer
) from public, anon, authenticated;

grant execute on function public.acquire_declared_context_review_slot(
  uuid, uuid, text, text, text, text, text, integer, integer
) to service_role;

-- ---------------------------------------------------------------------------
-- 3. public.finalize_declared_context_review_attempt
-- ---------------------------------------------------------------------------

-- Fecha a reserva. Só alcança uma tentativa `RESERVED` da própria organização:
-- uma reserva já expirada ou concluída não volta atrás.
create function public.finalize_declared_context_review_attempt(
  p_attempt_id uuid,
  p_organization_id uuid,
  p_status text,
  p_ai_run_id uuid default null
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_afetadas integer;
begin
  if p_attempt_id is null or p_organization_id is null then
    raise exception 'parametros obrigatorios ausentes' using errcode = '22023';
  end if;

  if p_status not in ('COMPLETED', 'FAILED') then
    raise exception 'status de finalizacao invalido' using errcode = '22023';
  end if;

  update public.declared_context_review_attempts
     set status = p_status,
         ai_run_id = p_ai_run_id,
         completed_at = now()
   where id = p_attempt_id
     and organization_id = p_organization_id
     and status = 'RESERVED';

  get diagnostics v_afetadas = row_count;

  return v_afetadas = 1;
end;
$$;

comment on function public.finalize_declared_context_review_attempt(uuid, uuid, text, uuid) is
  'Fecha a reserva como COMPLETED ou FAILED. Alcanca apenas RESERVED da propria organizacao.';

revoke all on function public.finalize_declared_context_review_attempt(uuid, uuid, text, uuid)
  from public, anon, authenticated;

grant execute on function public.finalize_declared_context_review_attempt(uuid, uuid, text, uuid)
  to service_role;
