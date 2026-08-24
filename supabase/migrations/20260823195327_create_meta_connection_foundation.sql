-- Rodada 003A — Meta Connection Foundation
-- Mandato: rodadas/gpt/RODADA_003A_META_CONNECTION_FOUNDATION.md
--
-- Primeira rodada da Fase 3. Persiste a conexão Meta e o estado OAuth, sem
-- importar conteúdo, criar anúncio ou gastar dinheiro.
--
-- ## Onde o token fica
--
-- Não fica aqui. `meta_connections.token_secret_reference` guarda apenas o id
-- de um segredo do **Supabase Vault**, que armazena o valor cifrado em repouso.
-- Verificado antes desta migration: `service_role` executa
-- `vault.create_secret`/`vault.update_secret` (SECURITY DEFINER do próprio
-- Supabase) e lê `vault.decrypted_secrets` — portanto **nenhuma função
-- privilegiada nossa precisa existir** para o caminho do segredo.
--
-- ## Por que o browser não vê tudo
--
-- A UX precisa mostrar o estado da conexão, mas `token_secret_reference` é a
-- chave que recupera o segredo. Por isso o grant para `authenticated` é
-- **por coluna** — a referência fica de fora — e ainda passa por RLS
-- tenant-scoped. Duas camadas, como nas rodadas anteriores: grants decidem
-- quais colunas, RLS decide quais linhas.
--
-- Nenhuma função `SECURITY DEFINER` nova.

-- ---------------------------------------------------------------------------
-- 1. public.meta_connections
-- ---------------------------------------------------------------------------

create table public.meta_connections (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id) on delete cascade,

  status text not null default 'PENDING',

  -- Escopos efetivamente concedidos pelo usuário, que podem ser menos do que
  -- os pedidos. Guardar o que foi concedido — e não o que foi solicitado — é o
  -- que permite detectar permissão faltante antes de uma chamada falhar.
  granted_scopes text[] not null default '{}',

  -- Id do segredo no Vault. NUNCA o token. Nullable porque a conexão nasce
  -- `PENDING`, antes de existir token.
  token_secret_reference uuid,

  token_expires_at timestamptz,

  -- Versão da Graph API validada nesta conexão. Permite saber quais conexões
  -- precisam ser revalidadas depois de um upgrade (TECHNICAL_SPEC §7.2).
  api_version_last_verified text,

  -- Identificadores externos mínimos. Sem nome, foto ou qualquer PII que a
  -- fundação não precise.
  external_user_id text,
  external_business_id text,

  connected_by uuid references auth.users(id) on delete set null,
  connected_at timestamptz,
  disconnected_at timestamptz,
  last_health_check_at timestamptz,

  -- Motivo legível de por que a conexão exige ação humana. Vai para a UX, então
  -- não carrega código de provider nem detalhe técnico.
  action_required_reason text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint meta_connections_status_valid
    check (status in (
      'PENDING',
      'ACTIVE',
      'ACTION_REQUIRED',
      'EXPIRED',
      'REVOKED',
      'ERROR'
    )),

  -- Conexão ativa exige token. Sem isto, um bug poderia marcar `ACTIVE` uma
  -- conexão sem credencial e o erro só apareceria na primeira chamada à Meta.
  constraint meta_connections_active_requires_token
    check (status <> 'ACTIVE' or token_secret_reference is not null),

  -- Espelho da regra acima: conexão revogada não guarda referência de segredo.
  -- A desconexão remove o segredo do Vault e limpa a referência.
  constraint meta_connections_revoked_has_no_token
    check (status <> 'REVOKED' or token_secret_reference is null),

  constraint meta_connections_external_user_id_not_blank
    check (external_user_id is null or btrim(external_user_id) <> ''),
  constraint meta_connections_external_user_id_max_length
    check (external_user_id is null or char_length(external_user_id) <= 255),

  constraint meta_connections_external_business_id_not_blank
    check (external_business_id is null or btrim(external_business_id) <> ''),
  constraint meta_connections_external_business_id_max_length
    check (external_business_id is null or char_length(external_business_id) <= 255),

  constraint meta_connections_api_version_format
    check (api_version_last_verified is null
           or api_version_last_verified ~ '^v[0-9]+\.[0-9]+$'),

  constraint meta_connections_action_required_reason_not_blank
    check (action_required_reason is null or btrim(action_required_reason) <> ''),
  constraint meta_connections_action_required_reason_max_length
    check (action_required_reason is null or char_length(action_required_reason) <= 500),

  constraint meta_connections_granted_scopes_max
    check (array_length(granted_scopes, 1) is null
           or array_length(granted_scopes, 1) <= 50)
);

comment on table public.meta_connections is
  'Conexao Meta por organizacao. O token vive no Vault; aqui fica so a referencia opaca.';

comment on column public.meta_connections.token_secret_reference is
  'Id do segredo no Supabase Vault. NUNCA o token. Nao e exposto ao browser.';

-- Uma conexão viva por organização. Estados terminais (`REVOKED`, `EXPIRED`,
-- `ERROR`) ficam de fora do índice para preservar o histórico de conexões
-- anteriores sem bloquear uma reconexão.
create unique index meta_connections_one_live_per_org_uniq
  on public.meta_connections (organization_id)
  where status in ('PENDING', 'ACTIVE', 'ACTION_REQUIRED');

create index meta_connections_org_status_idx
  on public.meta_connections (organization_id, status);

create index meta_connections_connected_by_idx
  on public.meta_connections (connected_by);

alter table public.meta_connections enable row level security;

-- ---------------------------------------------------------------------------
-- 2. Grants de meta_connections — leitura por coluna
-- ---------------------------------------------------------------------------

revoke all on table public.meta_connections from anon, authenticated;

-- O browser precisa saber se está conectado e o que fazer a seguir. Não precisa
-- — e não pode — saber por onde o segredo é recuperado. `token_secret_reference`
-- e os identificadores externos ficam fora deste grant.
grant select (
  id,
  organization_id,
  status,
  token_expires_at,
  connected_at,
  disconnected_at,
  last_health_check_at,
  action_required_reason,
  created_at,
  updated_at
) on table public.meta_connections to authenticated;

grant select, insert, update on table public.meta_connections to service_role;

-- Sem DELETE: desconectar muda o status e remove o segredo do Vault. Apagar a
-- linha destruiria o histórico de que a organização já esteve conectada.
-- Remoção de tenant continua pelo CASCADE.

-- Leitura tenant-scoped, mesma cadeia de membership das rodadas 001C–001E.
create policy meta_connections_select_by_active_membership
  on public.meta_connections
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

-- Nenhuma policy de escrita: conectar e desconectar passam pelo caminho
-- server-side, nunca por escrita direta do browser.

-- ---------------------------------------------------------------------------
-- 3. public.meta_oauth_intents
-- ---------------------------------------------------------------------------

-- Estado OAuth de vida curta. Existe para que o callback prove que a volta
-- corresponde a uma ida iniciada por **este** usuário, nesta organização, agora
-- (SECURITY_MODEL §8).
create table public.meta_oauth_intents (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id) on delete cascade,

  user_id uuid not null references auth.users(id) on delete cascade,

  -- SHA-256 em hex do `state`, nunca o `state` em claro. Quem lê esta tabela
  -- não consegue forjar um callback — mesmo padrão do `token_hash` do Supabase.
  state_hash text not null,

  expires_at timestamptz not null,

  -- Uso único: o callback marca aqui, e um replay encontra o valor preenchido.
  consumed_at timestamptz,

  created_at timestamptz not null default now(),

  constraint meta_oauth_intents_state_hash_sha256_hex
    check (state_hash ~ '^[0-9a-f]{64}$'),

  -- Janela curta e limitada. Uma intenção que vivesse horas seria uma janela de
  -- replay aberta pelo mesmo tempo.
  constraint meta_oauth_intents_expires_after_created
    check (expires_at > created_at),
  constraint meta_oauth_intents_max_lifetime
    check (expires_at <= created_at + interval '30 minutes')
);

comment on table public.meta_oauth_intents is
  'Estado OAuth de curta duracao, uso unico. Guarda o hash do state, nunca o state.';

-- O hash é a chave de busca do callback e precisa ser único: dois registros com
-- o mesmo hash tornariam ambíguo qual consumir.
create unique index meta_oauth_intents_state_hash_uniq
  on public.meta_oauth_intents (state_hash);

-- Varredura de expirados, para limpeza futura.
create index meta_oauth_intents_expires_at_idx
  on public.meta_oauth_intents (expires_at)
  where consumed_at is null;

alter table public.meta_oauth_intents enable row level security;

-- ---------------------------------------------------------------------------
-- 4. Grants de meta_oauth_intents — server-only, sem exceção
-- ---------------------------------------------------------------------------

-- O browser não tem nada a fazer com esta tabela: ele recebe o `state` na URL
-- de autorização e o devolve no callback. Ler ou escrever aqui só interessaria
-- a quem quisesse forjar uma volta.
revoke all on table public.meta_oauth_intents from anon, authenticated;

grant select, insert, update on table public.meta_oauth_intents to service_role;

-- Sem DELETE: a intenção consumida é o registro de que aquele `state` já foi
-- usado. Apagá-la reabriria a janela de replay. A limpeza de expirados, quando
-- existir, será decisão de retenção própria.

-- Nenhuma policy: RLS habilitado com zero policies significa que qualquer role
-- sem BYPASSRLS lê zero linhas, atrás da ausência de grant.
