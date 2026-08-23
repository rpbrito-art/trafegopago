-- Rodada 001E — Bootstrap de Negócio
-- Mandato: rodadas/gpt/RODADA_001E_BUSINESS_BOOTSTRAP.md
--
-- Primeira entidade de domínio sobre a fundação de tenancy promovida em
-- 001C/001D: `business_profiles`, mais o caminho estreito e server-only que
-- cria organização + membership owner + profile atomicamente.
--
-- Duas camadas continuam separadas, como nas rodadas anteriores: grants (quem
-- alcança o objeto) e RLS (quais linhas). O browser ganha SOMENTE leitura;
-- toda escrita passa pela função desta migration, executável apenas por
-- `service_role`.
--
-- Default privileges relevantes (baseline verificado antes desta migration,
-- projeto cbnxdoxpyioxjwgjhbtq, PostgreSQL 17.6):
--   pg_default_acl role=postgres ns=public objtype=r -> {postgres=arwdDxtm/postgres}
--   pg_default_acl role=postgres ns=public objtype=f -> {postgres=X/postgres}
--   pg_default_acl role=postgres ns=NULL   objtype=f -> {postgres=X/postgres}
-- Ou seja: a tabela e a função nascem SEM privilégio para anon/authenticated e
-- sem EXECUTE herdado de PUBLIC. Os REVOKEs abaixo são declarativos e
-- idempotentes — mantêm a intenção explícita na própria migration em vez de
-- depender de um default que pode mudar.

-- ---------------------------------------------------------------------------
-- 1. public.business_profiles
-- ---------------------------------------------------------------------------

-- `organization_id` é a PK, não uma coluna a mais: o contrato desta fase é um
-- perfil por organização (DATA_MODEL §2). Um `id` próprio só criaria a
-- possibilidade de dois perfis para o mesmo tenant, que teríamos de proibir
-- com um unique redundante.
create table public.business_profiles (
  organization_id uuid primary key
    references public.organizations(id) on delete cascade,

  segment text not null,
  location_summary text not null,
  primary_offer text not null,

  -- Monetário em unidade menor inteira + moeda (DATA_MODEL §1). Nunca float.
  average_ticket_minor bigint,
  currency text not null default 'BRL',

  target_audience text not null,
  differentiators text,
  known_objections text,
  acquisition_goal text not null,

  -- Meta comercial estruturada. JSONB aqui é deliberado e limitado: a forma
  -- final da meta ainda não está decidida pelo produto. Não é porta de entrada
  -- para fugir de modelagem relacional (DATA_MODEL §1).
  commercial_goal_json jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Obrigatórios: não vazios após btrim, com teto explícito.
  constraint business_profiles_segment_not_blank
    check (btrim(segment) <> ''),
  constraint business_profiles_segment_max_length
    check (char_length(segment) <= 120),

  constraint business_profiles_location_summary_not_blank
    check (btrim(location_summary) <> ''),
  constraint business_profiles_location_summary_max_length
    check (char_length(location_summary) <= 160),

  constraint business_profiles_primary_offer_not_blank
    check (btrim(primary_offer) <> ''),
  constraint business_profiles_primary_offer_max_length
    check (char_length(primary_offer) <= 280),

  constraint business_profiles_target_audience_not_blank
    check (btrim(target_audience) <> ''),
  constraint business_profiles_target_audience_max_length
    check (char_length(target_audience) <= 280),

  constraint business_profiles_acquisition_goal_not_blank
    check (btrim(acquisition_goal) <> ''),
  constraint business_profiles_acquisition_goal_max_length
    check (char_length(acquisition_goal) <= 280),

  -- Opcionais: ausência é NULL, não string vazia. Isso mantém "não informado"
  -- distinguível de "informado como vazio" sem lógica de apresentação.
  constraint business_profiles_differentiators_not_blank
    check (differentiators is null or btrim(differentiators) <> ''),
  constraint business_profiles_differentiators_max_length
    check (differentiators is null or char_length(differentiators) <= 1000),

  constraint business_profiles_known_objections_not_blank
    check (known_objections is null or btrim(known_objections) <> ''),
  constraint business_profiles_known_objections_max_length
    check (known_objections is null or char_length(known_objections) <= 1000),

  constraint business_profiles_average_ticket_minor_non_negative
    check (average_ticket_minor is null or average_ticket_minor >= 0),

  -- ISO 4217-like, mesma regra de organizations.default_currency.
  constraint business_profiles_currency_valid
    check (currency ~ '^[A-Z]{3}$'),

  -- Objeto JSON, não array/escalar/string — evita que o campo vire texto livre.
  constraint business_profiles_commercial_goal_json_is_object
    check (
      commercial_goal_json is null
      or jsonb_typeof(commercial_goal_json) = 'object'
    ),
  constraint business_profiles_commercial_goal_json_max_length
    check (
      commercial_goal_json is null
      or char_length(commercial_goal_json::text) <= 4000
    )
);

comment on table public.business_profiles is
  'Perfil de negocio da organizacao. Um por tenant; escrita somente pelo caminho privilegiado server-side.';

-- O event trigger `ensure_rls` (Rodada 001A) já habilitaria RLS aqui. Explícito
-- mesmo assim: a garantia de segurança da migration não pode depender de um
-- trigger externo a ela.
alter table public.business_profiles enable row level security;

-- ---------------------------------------------------------------------------
-- 2. Grants de business_profiles
-- ---------------------------------------------------------------------------

-- `anon` permanece sem qualquer privilégio.
revoke all on table public.business_profiles from anon, authenticated;

-- Browser: somente leitura. Sem INSERT/UPDATE/DELETE o grant já nega a escrita
-- com 42501, antes mesmo da camada RLS.
grant select on table public.business_profiles to authenticated;

-- Caminho server-side privilegiado, explícito e versionado.
grant all on table public.business_profiles to service_role;

-- ---------------------------------------------------------------------------
-- 3. Policy RLS — leitura tenant-scoped
-- ---------------------------------------------------------------------------

-- Lê o perfil somente quem tem membership própria ACTIVE em organização
-- ACTIVE. A autorização vem de `organization_members` + `auth.uid()`, nunca de
-- `user_metadata` ou claim custom (SECURITY_MODEL §4, PROJECT_PROMPT §10).
--
-- Não recursivo: a subquery toca `organization_members` (cuja policy não
-- referencia outra tabela) e `organizations` (cuja policy termina em
-- `organization_members`). A cadeia fecha em `auth.uid()`.
--
-- `role` não participa: nesta rodada owner/admin/member têm exatamente o mesmo
-- direito de leitura, e nenhum tem escrita.
create policy business_profiles_select_by_active_membership
  on public.business_profiles
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

-- Nenhuma policy de INSERT/UPDATE/DELETE. A escrita não existe para o browser.

-- ---------------------------------------------------------------------------
-- 4. Bootstrap atômico da organização inicial
-- ---------------------------------------------------------------------------

-- SECURITY INVOKER, não DEFINER: quem executa já é `service_role`, que tem os
-- grants e o BYPASSRLS necessários. Um DEFINER aqui adicionaria escalada de
-- privilégio permanente para resolver um problema que não existe
-- (SECURITY_MODEL §5, PROJECT_PROMPT §10).
--
-- `search_path = ''` fecha o vetor de captura de nome de objeto: todo
-- identificador abaixo é qualificado.
--
-- `p_user_id` NUNCA vem do browser. A camada de aplicação o obtém de
-- `getClaims()` verificado server-side. A função não deriva autorização de
-- nada além desse argumento e da própria tabela de membership.
create function public.bootstrap_organization_business_profile(
  p_user_id uuid,
  p_organization_name text,
  p_segment text,
  p_location_summary text,
  p_primary_offer text,
  p_target_audience text,
  p_acquisition_goal text,
  p_average_ticket_minor bigint default null,
  p_differentiators text default null,
  p_known_objections text default null,
  p_commercial_goal_json jsonb default null,
  p_timezone text default 'America/Sao_Paulo',
  p_currency text default 'BRL'
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_organization_id uuid;
begin
  if p_user_id is null then
    raise exception 'p_user_id e obrigatorio'
      using errcode = '22023';
  end if;

  -- Serializa o onboarding inicial POR USUÁRIO.
  --
  -- Sem isto, duas submissões concorrentes leem "sem membership" ao mesmo
  -- tempo e criam dois tenants: o EXISTS abaixo é uma checagem de leitura, e
  -- READ COMMITTED não a protege. Não cabe constraint única para "no máximo
  -- uma membership por usuário no mundo" — multi-org é destino declarado do
  -- produto —, então a exclusão mútua precisa ser explícita e escopada ao
  -- onboarding.
  --
  -- `_xact_` e não `_lock`: o lock morre com a transação, inclusive em erro.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'business_bootstrap:' || p_user_id::text, 0
    )
  );

  if exists (
    select 1
    from public.organization_members m
    where m.user_id = p_user_id
  ) then
    raise exception 'usuario ja possui membership'
      using errcode = 'P0001';
  end if;

  insert into public.organizations (name, status, timezone, default_currency)
  values (p_organization_name, 'ACTIVE', p_timezone, p_currency)
  returning id into v_organization_id;

  -- `owner`/`ACTIVE` são literais: papel e status nunca chegam do cliente.
  insert into public.organization_members (
    organization_id, user_id, role, status
  )
  values (v_organization_id, p_user_id, 'owner', 'ACTIVE');

  insert into public.business_profiles (
    organization_id,
    segment,
    location_summary,
    primary_offer,
    average_ticket_minor,
    currency,
    target_audience,
    differentiators,
    known_objections,
    acquisition_goal,
    commercial_goal_json
  )
  values (
    v_organization_id,
    p_segment,
    p_location_summary,
    p_primary_offer,
    p_average_ticket_minor,
    p_currency,
    p_target_audience,
    p_differentiators,
    p_known_objections,
    p_acquisition_goal,
    p_commercial_goal_json
  );

  return v_organization_id;
end;
$$;

comment on function public.bootstrap_organization_business_profile(
  uuid, text, text, text, text, text, text, bigint, text, text, jsonb, text, text
) is
  'Cria organizacao + membership owner + business_profile atomicamente. Executavel somente por service_role, a partir do servidor, com user_id de identidade verificada.';

-- Estar em `public` significa estar exposta como RPC pela Data API. A defesa é
-- o privilégio, não a obscuridade: sem EXECUTE, `anon`/`authenticated` recebem
-- 42501 no PostgREST. Mesmo padrão de `public.rls_auto_enable()` (Rodada 001A).
revoke all on function public.bootstrap_organization_business_profile(
  uuid, text, text, text, text, text, text, bigint, text, text, jsonb, text, text
) from public, anon, authenticated;

grant execute on function public.bootstrap_organization_business_profile(
  uuid, text, text, text, text, text, text, bigint, text, text, jsonb, text, text
) to service_role;
