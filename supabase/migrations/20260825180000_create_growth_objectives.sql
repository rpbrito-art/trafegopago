-- Rodada 004B — Quoron Branding + Growth Context Foundation
-- Mandato: rodadas/gpt/RODADA_004B_QUORON_GROWTH_CONTEXT.md
--
-- Três deltas, todos aditivos:
--
--   1. `business_profiles` deixa de exigir `target_audience` e
--      `acquisition_goal` no primeiro formulário — o onboarding passa a pedir
--      só o contexto essencial e o resto é completado progressivamente
--      (GROWTH_INTELLIGENCE §3.1);
--   2. `growth_objectives` nasce como entidade própria, com histórico e uma
--      única versão ativa por organização;
--   3. índices de cobertura para as FKs de `ai_runs`, quitando os INFO de
--      performance registrados na auditoria da 004A.
--
-- Nenhum dado existente é apagado ou convertido. O `acquisition_goal` que já
-- estiver gravado permanece como contexto livre legado — migrá-lo para um
-- objetivo estruturado transformaria texto ambíguo em fato declarado.

-- ---------------------------------------------------------------------------
-- 1. Onboarding progressivo em business_profiles
-- ---------------------------------------------------------------------------

-- Os CHECKs `..._not_blank` continuam valendo e não precisam mudar: em SQL,
-- `btrim(null) <> ''` avalia para NULL, e um CHECK que resulta em NULL é
-- satisfeito. Ou seja, eles seguem recusando string vazia e passam a tolerar
-- ausência — que é exatamente a distinção que o produto precisa.
alter table public.business_profiles
  alter column target_audience drop not null;

alter table public.business_profiles
  alter column acquisition_goal drop not null;

comment on column public.business_profiles.target_audience is
  'Publico presumido. Opcional: preenchido progressivamente, nao no primeiro formulario.';

comment on column public.business_profiles.acquisition_goal is
  'Contexto livre legado. NAO e a fonte canonica do objetivo: ver public.growth_objectives.';

-- ---------------------------------------------------------------------------
-- 2. public.growth_objectives
-- ---------------------------------------------------------------------------

create table public.growth_objectives (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id) on delete cascade,

  -- Só dois estados. Alterar o objetivo não reescreve o anterior: arquiva e
  -- cria versão nova, porque saber o que o negócio queria em cada período é
  -- parte da evidência que sustenta recomendação futura.
  status text not null default 'ACTIVE',

  -- O que o negócio quer conseguir agora. Taxonomia interna: a UI traduz para
  -- português simples e nunca mostra estes identificadores.
  objective_type text not null,
  objective_detail text,

  -- Para onde a pessoa é levada. A jornada não é fixa e não termina
  -- necessariamente em venda (GROWTH_INTELLIGENCE §4).
  destination_type text not null,

  -- Que ação conta como sucesso. **Resultado desejado, não resultado
  -- observável**: registrar isto não afirma que o produto já consegue medi-lo
  -- (mandato §9).
  success_event_type text not null,
  success_event_detail text,

  -- `set null` e não `cascade`: o usuário sai, o objetivo do negócio fica.
  created_by uuid references auth.users(id) on delete set null,

  created_at timestamptz not null default now(),
  archived_at timestamptz,

  constraint growth_objectives_status_valid
    check (status in ('ACTIVE', 'ARCHIVED')),

  -- Estado e timestamp andam juntos: um `ARCHIVED` sem hora de arquivamento
  -- não diz quando o negócio mudou de ideia, e um `ACTIVE` com ela é uma
  -- contradição.
  constraint growth_objectives_archived_requires_timestamp
    check (status <> 'ARCHIVED' or archived_at is not null),
  constraint growth_objectives_active_has_no_archived_at
    check (status <> 'ACTIVE' or archived_at is null),

  constraint growth_objectives_objective_type_valid
    check (objective_type in (
      'SALES',
      'LEADS',
      'CONVERSATIONS',
      'BOOKINGS',
      'REGISTRATIONS',
      'STORE_VISITS',
      'AUDIENCE',
      'OTHER'
    )),

  constraint growth_objectives_destination_type_valid
    check (destination_type in (
      'WHATSAPP',
      'WEBSITE',
      'META_FORM',
      'APP',
      'PHYSICAL_STORE',
      'INSTAGRAM_PROFILE',
      'OTHER'
    )),

  constraint growth_objectives_success_event_type_valid
    check (success_event_type in (
      'PURCHASE',
      'LEAD_CREATED',
      'CONVERSATION_STARTED',
      'QUOTE_REQUESTED',
      'BOOKING_CONFIRMED',
      'FORM_SUBMITTED',
      'ACCOUNT_CREATED',
      'STORE_VISIT',
      'PROFILE_ACTION',
      'OTHER'
    )),

  -- Detalhe ausente é NULL; string vazia seria um detalhe que não existe
  -- fingindo existir.
  constraint growth_objectives_objective_detail_not_blank
    check (objective_detail is null or btrim(objective_detail) <> ''),
  constraint growth_objectives_objective_detail_max_length
    check (objective_detail is null or char_length(objective_detail) <= 280),

  constraint growth_objectives_success_detail_not_blank
    check (success_event_detail is null or btrim(success_event_detail) <> ''),
  constraint growth_objectives_success_detail_max_length
    check (success_event_detail is null or char_length(success_event_detail) <= 280)
);

comment on table public.growth_objectives is
  'Objetivo atual do negocio, versionado. Resultado desejado; nao afirma observabilidade.';

comment on column public.growth_objectives.success_event_type is
  'O que o negocio considera sucesso. Nao implica que o produto ja consiga medir.';

-- Uma organização nunca tem dois objetivos ativos. É esta constraint — e não o
-- código da aplicação — que garante isso, inclusive sob escrita concorrente.
create unique index growth_objectives_one_active_per_organization
  on public.growth_objectives (organization_id)
  where status = 'ACTIVE';

-- Histórico do tenant, do mais recente ao mais antigo.
create index growth_objectives_org_created_at_idx
  on public.growth_objectives (organization_id, created_at desc);

alter table public.growth_objectives enable row level security;

-- ---------------------------------------------------------------------------
-- 3. Grants e RLS de growth_objectives
-- ---------------------------------------------------------------------------

revoke all on table public.growth_objectives from anon, authenticated;

-- Browser: somente leitura, e só a da própria organização. A escrita passa
-- obrigatoriamente pela RPC — sem grant de INSERT/UPDATE/DELETE, nenhuma
-- policy de escrita poderia sequer ser exercida.
grant select on table public.growth_objectives to authenticated;

grant select, insert, update on table public.growth_objectives to service_role;

-- Mesma forma da policy de `business_profiles`: membership ACTIVE numa
-- organização ACTIVE. Um membro desativado, ou de organização suspensa, não lê.
create policy growth_objectives_select_by_active_membership
  on public.growth_objectives
  for select
  to authenticated
  using (
    organization_id in (
      select m.organization_id
      from public.organization_members m
      join public.organizations o on o.id = m.organization_id
      where m.user_id = (select auth.uid())
        and m.status = 'ACTIVE'
        and o.status = 'ACTIVE'
    )
  );

-- ---------------------------------------------------------------------------
-- 4. public.set_active_growth_objective
-- ---------------------------------------------------------------------------

-- Trocar o objetivo é uma operação composta — arquivar o atual e criar o novo
-- — que precisa ser atômica e serializada. Feita em duas chamadas a partir da
-- aplicação, duas submissões concorrentes deixariam a organização com dois
-- ativos ou com nenhum.
--
-- `security invoker`: quem chama é `service_role`, que já tem os grants
-- necessários. Um DEFINER aqui adicionaria escalada de privilégio sem resolver
-- nada — mesmo raciocínio do bootstrap da 001E.
--
-- `p_user_id` NUNCA vem do browser: a aplicação o obtém de `getClaims()`
-- verificado server-side. Papel e status também não chegam do cliente — são
-- lidos aqui, da tabela de membership.
create function public.set_active_growth_objective(
  p_user_id uuid,
  p_organization_id uuid,
  p_objective_type text,
  p_destination_type text,
  p_success_event_type text,
  p_objective_detail text default null,
  p_success_event_detail text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_existing public.growth_objectives%rowtype;
  v_id uuid;
begin
  if p_user_id is null or p_organization_id is null then
    raise exception 'p_user_id e p_organization_id sao obrigatorios'
      using errcode = '22023';
  end if;

  -- Serializa por organização. O índice único parcial já impediria dois
  -- ativos, mas sem o lock a segunda transação falharia com 23505 em vez de
  -- esperar e produzir a nova versão corretamente.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'growth_objective:' || p_organization_id::text, 0
    )
  );

  -- Autorização lida do banco, não recebida por parâmetro. Organização precisa
  -- estar ACTIVE, membership precisa estar ACTIVE, e o papel precisa permitir
  -- alterar a direção do negócio.
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
    raise exception 'usuario nao autorizado a definir objetivo'
      using errcode = '42501';
  end if;

  select * into v_existing
  from public.growth_objectives
  where organization_id = p_organization_id
    and status = 'ACTIVE';

  -- Reenvio idêntico é idempotente: devolve o objetivo vigente em vez de
  -- criar uma versão nova. Sem isto, um duplo clique produziria duas linhas
  -- dizendo a mesma coisa e um "histórico" de mudanças que nunca houve.
  if found
     and v_existing.objective_type = p_objective_type
     and v_existing.destination_type = p_destination_type
     and v_existing.success_event_type = p_success_event_type
     and v_existing.objective_detail is not distinct from p_objective_detail
     and v_existing.success_event_detail is not distinct from p_success_event_detail
  then
    return v_existing.id;
  end if;

  -- Arquivar e inserir na mesma transação: nenhum instante em que a
  -- organização fica sem objetivo por causa de uma troca.
  if found then
    update public.growth_objectives
       set status = 'ARCHIVED',
           archived_at = now()
     where id = v_existing.id;
  end if;

  insert into public.growth_objectives (
    organization_id,
    status,
    objective_type,
    objective_detail,
    destination_type,
    success_event_type,
    success_event_detail,
    created_by
  )
  values (
    p_organization_id,
    'ACTIVE',
    p_objective_type,
    p_objective_detail,
    p_destination_type,
    p_success_event_type,
    p_success_event_detail,
    p_user_id
  )
  returning id into v_id;

  return v_id;
end;
$$;

comment on function public.set_active_growth_objective(
  uuid, uuid, text, text, text, text, text
) is
  'Define o objetivo ativo, arquivando o anterior na mesma transacao. Somente service_role, com user_id de identidade verificada.';

-- Estar em `public` significa estar exposta como RPC pela Data API. A defesa é
-- o privilégio: sem EXECUTE, `anon`/`authenticated` recebem 42501.
revoke all on function public.set_active_growth_objective(
  uuid, uuid, text, text, text, text, text
) from public, anon, authenticated;

grant execute on function public.set_active_growth_objective(
  uuid, uuid, text, text, text, text, text
) to service_role;

-- ---------------------------------------------------------------------------
-- 5. Índices de cobertura das FKs de ai_runs — dívida da 004A
-- ---------------------------------------------------------------------------

-- Os INFO da auditoria 004A apontam FKs sem índice de cobertura. Sem eles, um
-- DELETE ou UPDATE no lado referenciado faz varredura sequencial em `ai_runs`
-- para verificar a constraint — barato hoje, com a tabela vazia, e caro
-- exatamente quando o ledger tiver crescido.
--
-- Os índices existentes NÃO são removidos por aparecerem como `unused_index`:
-- numa tabela recém-criada e vazia, "não usado" significa "ainda não houve
-- consulta", não "desnecessário".

-- FK ai_runs_fallback_same_organization — (fallback_from_run_id, organization_id).
-- Parcial: a maioria dos runs não é fallback, e indexar NULL engordaria o
-- índice sem servir a nenhuma verificação.
create index ai_runs_fallback_from_run_id_idx
  on public.ai_runs (fallback_from_run_id, organization_id)
  where fallback_from_run_id is not null;

-- FK ai_runs_model_belongs_to_provider — (ai_model_id, provider_id).
create index ai_runs_model_provider_idx
  on public.ai_runs (ai_model_id, provider_id);

-- FK ai_runs_price_belongs_to_model — (ai_price_version_id, ai_model_id).
create index ai_runs_price_model_idx
  on public.ai_runs (ai_price_version_id, ai_model_id);

-- FK simples ai_runs_provider_id_fkey.
create index ai_runs_provider_id_idx
  on public.ai_runs (provider_id);
