-- Rodada 003B — Meta Asset Discovery & Selection
-- Mandato: rodadas/gpt/RODADA_003B_META_ASSET_DISCOVERY_SELECTION.md
--
-- A 003A provou a conexão. Esta rodada persiste **a escolha** do ativo que a
-- Fase 4 vai ler: a conta profissional do Instagram e, opcionalmente, uma
-- conta de anúncios.
--
-- ## O que NÃO entra aqui
--
-- Inventário. A lista de candidatos descobertos na Meta vive apenas na
-- resposta server-side que alimenta a tela (mandato §4.6): guardar todas as
-- Páginas e todos os Instagram de um negócio seria copiar dado de terceiros
-- sem necessidade de produto.
--
-- ## Fronteira cross-tenant
--
-- `organization_id` sozinho não basta: uma linha poderia apontar para a
-- conexão de outra organização. As FKs são **compostas**
-- (`organization_id, meta_connection_id`) contra a chave composta de
-- `meta_connections`, de modo que a incoerência é impossível no banco, não
-- apenas improvável no código (`DATA_MODEL.md` §16).
--
-- ## Fronteira do browser
--
-- Mesma disciplina de `meta_connections`: grant **por coluna**. A tela mostra
-- `@username` e nome do negócio; os identificadores externos da Meta ficam
-- fora do grant, porque a interface padrão não os exibe
-- (`GROWTH_INTELLIGENCE_CANONICAL.md` §2.1, mandato §5) e porque external id
-- é chave de chamada externa, não dado de tela.
--
-- Nenhuma policy de escrita: selecionar ativo passa por função server-side que
-- revalida o ativo contra a Meta antes de gravar (mandato §4.5).

-- ---------------------------------------------------------------------------
-- 1. Chave composta em meta_connections
-- ---------------------------------------------------------------------------

-- Redundante com a PK por desenho: é o alvo das FKs compostas abaixo, que são
-- o que impede uma seleção de apontar para a conexão de outro tenant.
alter table public.meta_connections
  add constraint meta_connections_org_id_uniq unique (organization_id, id);

-- ---------------------------------------------------------------------------
-- 2. public.instagram_accounts
-- ---------------------------------------------------------------------------

create table public.instagram_accounts (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id) on delete cascade,

  meta_connection_id uuid not null,

  -- IG User id da conta profissional. String opaca: nunca aritmética, nunca
  -- substituindo o id interno (`DATA_MODEL.md` §1).
  external_instagram_account_id text not null,

  -- A Página pela qual a conta profissional foi descoberta. Guardada porque a
  -- redescoberta futura parte de `/me/accounts`, não do IG User solto.
  external_page_id text not null,

  -- Metadados mínimos de exibição. Nada além do necessário para a pessoa
  -- reconhecer a própria conta.
  username text,
  display_name text,
  account_type text,

  -- `SELECTED` é a escolha vigente; `REPLACED` é a escolha anterior, mantida
  -- como histórico de qual ativo o produto leu em cada período.
  status text not null default 'SELECTED',

  selected_by uuid references auth.users(id) on delete set null,
  selected_at timestamptz not null default now(),

  -- Última vez que o servidor reconfirmou, contra a Meta, que este ativo
  -- continua pertencendo a esta conexão.
  last_verified_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint instagram_accounts_connection_same_org
    foreign key (organization_id, meta_connection_id)
    references public.meta_connections (organization_id, id)
    on delete cascade,

  constraint instagram_accounts_status_valid
    check (status in ('SELECTED', 'REPLACED')),

  constraint instagram_accounts_external_id_not_blank
    check (btrim(external_instagram_account_id) <> ''),
  constraint instagram_accounts_external_id_max_length
    check (char_length(external_instagram_account_id) <= 255),

  constraint instagram_accounts_external_page_id_not_blank
    check (btrim(external_page_id) <> ''),
  constraint instagram_accounts_external_page_id_max_length
    check (char_length(external_page_id) <= 255),

  constraint instagram_accounts_username_not_blank
    check (username is null or btrim(username) <> ''),
  constraint instagram_accounts_username_max_length
    check (username is null or char_length(username) <= 120),

  constraint instagram_accounts_display_name_max_length
    check (display_name is null or char_length(display_name) <= 255),

  constraint instagram_accounts_account_type_max_length
    check (account_type is null or char_length(account_type) <= 60)
);

comment on table public.instagram_accounts is
  'Conta profissional do Instagram escolhida pela organizacao. Somente a escolhida, nao o inventario.';

comment on column public.instagram_accounts.status is
  'SELECTED = escolha vigente; REPLACED = escolha anterior preservada como historico.';

-- Reenviar a mesma seleção não pode criar linha nova: o par conexão + ativo é
-- a identidade natural da escolha, e é o que torna a operação idempotente.
create unique index instagram_accounts_connection_external_uniq
  on public.instagram_accounts (meta_connection_id, external_instagram_account_id);

-- Uma única conta vigente por conexão. Trocar de conta marca a anterior como
-- `REPLACED` em vez de apagá-la.
create unique index instagram_accounts_one_selected_per_connection_uniq
  on public.instagram_accounts (meta_connection_id)
  where status = 'SELECTED';

create index instagram_accounts_org_status_idx
  on public.instagram_accounts (organization_id, status);

alter table public.instagram_accounts enable row level security;

revoke all on table public.instagram_accounts from anon, authenticated;

-- Sem `external_instagram_account_id`, sem `external_page_id`: a tela mostra a
-- conta em linguagem de negócio, e o id externo só interessa a quem for falar
-- com a Meta — o que acontece no servidor.
grant select (
  id,
  organization_id,
  meta_connection_id,
  username,
  display_name,
  account_type,
  status,
  selected_by,
  selected_at,
  last_verified_at,
  created_at,
  updated_at
) on table public.instagram_accounts to authenticated;

grant select, insert, update on table public.instagram_accounts to service_role;

-- Sem DELETE: histórico de qual ativo foi lido não é descartável. A remoção do
-- tenant continua pelo CASCADE.

create policy instagram_accounts_select_by_active_membership
  on public.instagram_accounts
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
-- 3. public.ad_accounts
-- ---------------------------------------------------------------------------

-- Ramo opcional. Ausência de linha aqui é estado válido e não degrada nada do
-- caminho orgânico (`GROWTH_INTELLIGENCE_CANONICAL.md` §7 e §12).
create table public.ad_accounts (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id) on delete cascade,

  meta_connection_id uuid not null,

  -- Vem no formato `act_<numero>`. Tratado como string opaca.
  external_ad_account_id text not null,

  name text,
  currency text,
  timezone_name text,

  -- Status da conta no provider, útil para explicar em linguagem de negócio
  -- por que uma conta não pode receber investimento. Nenhuma decisão de gasto
  -- nesta rodada.
  provider_account_status text,

  status text not null default 'SELECTED',

  selected_by uuid references auth.users(id) on delete set null,
  selected_at timestamptz not null default now(),
  last_verified_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint ad_accounts_connection_same_org
    foreign key (organization_id, meta_connection_id)
    references public.meta_connections (organization_id, id)
    on delete cascade,

  constraint ad_accounts_status_valid
    check (status in ('SELECTED', 'REPLACED')),

  constraint ad_accounts_external_id_not_blank
    check (btrim(external_ad_account_id) <> ''),
  constraint ad_accounts_external_id_max_length
    check (char_length(external_ad_account_id) <= 255),

  constraint ad_accounts_name_max_length
    check (name is null or char_length(name) <= 255),

  -- ISO 4217 quando presente (`DATA_MODEL.md` §1).
  constraint ad_accounts_currency_format
    check (currency is null or currency ~ '^[A-Z]{3}$'),

  constraint ad_accounts_timezone_name_max_length
    check (timezone_name is null or char_length(timezone_name) <= 120),

  constraint ad_accounts_provider_status_max_length
    check (provider_account_status is null
           or char_length(provider_account_status) <= 60)
);

comment on table public.ad_accounts is
  'Conta de anuncios opcional escolhida pela organizacao. Ausencia de linha e estado valido.';

create unique index ad_accounts_connection_external_uniq
  on public.ad_accounts (meta_connection_id, external_ad_account_id);

create unique index ad_accounts_one_selected_per_connection_uniq
  on public.ad_accounts (meta_connection_id)
  where status = 'SELECTED';

create index ad_accounts_org_status_idx
  on public.ad_accounts (organization_id, status);

alter table public.ad_accounts enable row level security;

revoke all on table public.ad_accounts from anon, authenticated;

grant select (
  id,
  organization_id,
  meta_connection_id,
  name,
  currency,
  timezone_name,
  provider_account_status,
  status,
  selected_by,
  selected_at,
  last_verified_at,
  created_at,
  updated_at
) on table public.ad_accounts to authenticated;

grant select, insert, update on table public.ad_accounts to service_role;

create policy ad_accounts_select_by_active_membership
  on public.ad_accounts
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
-- 4. Persistir a seleção — server-only
-- ---------------------------------------------------------------------------

-- A troca de conta e a gravação da escolha precisam acontecer na mesma
-- transação: marcar a anterior como `REPLACED` e inserir a nova em dois passos
-- deixaria uma janela em que a organização não tem conta vigente — e o índice
-- parcial rejeitaria a segunda metade se a ordem invertesse.
--
-- A função **não** decide se o ativo pertence à conexão. Isso é provado antes,
-- contra a Meta, pelo gateway (mandato §4.5): o banco não tem como saber o que
-- a Meta autorizou. O que ela garante é a coerência tenant/conexão e a
-- idempotência do reenvio.
create function public.select_instagram_account(
  p_organization_id uuid,
  p_connection_id uuid,
  p_user_id uuid,
  p_external_instagram_account_id text,
  p_external_page_id text,
  p_username text,
  p_display_name text,
  p_account_type text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if p_organization_id is null
     or p_connection_id is null
     or p_user_id is null
     or p_external_instagram_account_id is null
     or btrim(p_external_instagram_account_id) = ''
     or p_external_page_id is null
     or btrim(p_external_page_id) = '' then
    raise exception 'parametros obrigatorios ausentes' using errcode = '22023';
  end if;

  -- A conexão precisa existir, pertencer a esta organização e estar viva.
  -- Selecionar ativo sobre conexão revogada gravaria uma escolha que ninguém
  -- pode ler. `for update` serializa duas seleções simultâneas.
  perform 1
  from public.meta_connections
  where id = p_connection_id
    and organization_id = p_organization_id
    and status = 'ACTIVE'
  for update;

  if not found then
    raise exception 'conexao inexistente, de outra organizacao ou inativa'
      using errcode = '23503';
  end if;

  -- A escolha anterior sai de cena antes de a nova entrar, para não colidir no
  -- índice parcial de conta vigente.
  update public.instagram_accounts
  set status = 'REPLACED',
      updated_at = pg_catalog.now()
  where meta_connection_id = p_connection_id
    and status = 'SELECTED'
    and external_instagram_account_id <> p_external_instagram_account_id;

  insert into public.instagram_accounts (
    organization_id,
    meta_connection_id,
    external_instagram_account_id,
    external_page_id,
    username,
    display_name,
    account_type,
    status,
    selected_by,
    selected_at,
    last_verified_at
  )
  values (
    p_organization_id,
    p_connection_id,
    p_external_instagram_account_id,
    p_external_page_id,
    p_username,
    p_display_name,
    p_account_type,
    'SELECTED',
    p_user_id,
    pg_catalog.now(),
    pg_catalog.now()
  )
  on conflict (meta_connection_id, external_instagram_account_id) do update
  set external_page_id = excluded.external_page_id,
      username = excluded.username,
      display_name = excluded.display_name,
      account_type = excluded.account_type,
      status = 'SELECTED',
      selected_by = excluded.selected_by,
      selected_at = excluded.selected_at,
      last_verified_at = excluded.last_verified_at,
      updated_at = pg_catalog.now()
  returning id into v_id;

  return v_id;
end;
$$;

comment on function public.select_instagram_account(uuid, uuid, uuid, text, text, text, text, text) is
  'Grava a conta do Instagram escolhida. Idempotente por conexao + external id.';

create function public.select_ad_account(
  p_organization_id uuid,
  p_connection_id uuid,
  p_user_id uuid,
  p_external_ad_account_id text,
  p_name text,
  p_currency text,
  p_timezone_name text,
  p_provider_account_status text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if p_organization_id is null
     or p_connection_id is null
     or p_user_id is null
     or p_external_ad_account_id is null
     or btrim(p_external_ad_account_id) = '' then
    raise exception 'parametros obrigatorios ausentes' using errcode = '22023';
  end if;

  perform 1
  from public.meta_connections
  where id = p_connection_id
    and organization_id = p_organization_id
    and status = 'ACTIVE'
  for update;

  if not found then
    raise exception 'conexao inexistente, de outra organizacao ou inativa'
      using errcode = '23503';
  end if;

  update public.ad_accounts
  set status = 'REPLACED',
      updated_at = pg_catalog.now()
  where meta_connection_id = p_connection_id
    and status = 'SELECTED'
    and external_ad_account_id <> p_external_ad_account_id;

  insert into public.ad_accounts (
    organization_id,
    meta_connection_id,
    external_ad_account_id,
    name,
    currency,
    timezone_name,
    provider_account_status,
    status,
    selected_by,
    selected_at,
    last_verified_at
  )
  values (
    p_organization_id,
    p_connection_id,
    p_external_ad_account_id,
    p_name,
    p_currency,
    p_timezone_name,
    p_provider_account_status,
    'SELECTED',
    p_user_id,
    pg_catalog.now(),
    pg_catalog.now()
  )
  on conflict (meta_connection_id, external_ad_account_id) do update
  set name = excluded.name,
      currency = excluded.currency,
      timezone_name = excluded.timezone_name,
      provider_account_status = excluded.provider_account_status,
      status = 'SELECTED',
      selected_by = excluded.selected_by,
      selected_at = excluded.selected_at,
      last_verified_at = excluded.last_verified_at,
      updated_at = pg_catalog.now()
  returning id into v_id;

  return v_id;
end;
$$;

comment on function public.select_ad_account(uuid, uuid, uuid, text, text, text, text, text) is
  'Grava a conta de anuncios opcional escolhida. Idempotente por conexao + external id.';

-- ---------------------------------------------------------------------------
-- 5. ACL das funções
-- ---------------------------------------------------------------------------

revoke all on function public.select_instagram_account(uuid, uuid, uuid, text, text, text, text, text)
  from public, anon, authenticated;
revoke all on function public.select_ad_account(uuid, uuid, uuid, text, text, text, text, text)
  from public, anon, authenticated;

grant execute on function public.select_instagram_account(uuid, uuid, uuid, text, text, text, text, text)
  to service_role;
grant execute on function public.select_ad_account(uuid, uuid, uuid, text, text, text, text, text)
  to service_role;
