-- Rodada 001C — Organizations + Membership
-- Mandato: rodadas/gpt/RODADA_001C_ORGANIZATIONS_MEMBERSHIP.md
--
-- Objetivo
-- --------
-- Fundação relacional mínima de tenancy: `organizations` e
-- `organization_members`, com constraints, FKs e índice por `user_id`.
--
-- Esta rodada define ESTRUTURA, não autorização de domínio. Nenhuma policy
-- é criada aqui: grants funcionais + RLS policies + prova adversarial
-- 2 usuários x 2 organizações pertencem à Rodada 001D.
--
-- Baseline auditado antes desta migration
-- ---------------------------------------
-- `pg_default_acl` do schema `public` concede, para novas tabelas (objtype
-- 'r'), `arwdDxtm` (ALL) a `anon` e `authenticated` — tanto no default do
-- role `postgres` quanto no de `supabase_admin`:
--   {postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,
--    authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}
--
-- Ou seja: sem intervenção explícita, as duas tabelas nasceriam com
-- privilégios de tabela concedidos aos papéis do browser. RLS sem policies
-- já negaria as linhas, mas grants e RLS são camadas distintas neste projeto
-- (PROJECT_PROMPT §10) e a fundação deve ficar fechada nas duas camadas até
-- a 001D. Por isso o REVOKE abaixo é obrigatório, não decorativo.
--
-- O REVOKE é escopado às duas tabelas desta rodada. Os default privileges
-- globais do schema NÃO são alterados aqui: mexer neles afeta toda tabela
-- futura e é decisão de arquitetura que pertence à 001D, junto com o desenho
-- final de grants.

-- ---------------------------------------------------------------------------
-- 1. public.organizations
-- ---------------------------------------------------------------------------

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'ACTIVE',
  timezone text not null default 'America/Sao_Paulo',
  default_currency text not null default 'BRL',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- `name` não pode ser vazio nem só espaços; limite de tamanho razoável,
  -- sem regra comercial adicional.
  constraint organizations_name_not_blank check (btrim(name) <> ''),
  constraint organizations_name_max_length check (char_length(name) <= 160),

  constraint organizations_status_valid check (status in ('ACTIVE', 'INACTIVE')),

  -- ISO 4217-like: três letras maiúsculas. A validação do código em si
  -- pertence ao domínio, não ao banco.
  constraint organizations_default_currency_valid
    check (default_currency ~ '^[A-Z]{3}$')
);

comment on table public.organizations is
  'Tenant raiz. Toda entidade de negócio é escopada por organization_id.';

-- `updated_at` é mantido explicitamente pelo domínio na mutação. Nenhum
-- trigger é criado nesta rodada: o mandato proíbe funções próprias aqui, e a
-- pendência de default privileges para funções deve ser resolvida
-- imediatamente antes da primeira função sensível em schema exposto.

-- ---------------------------------------------------------------------------
-- 2. public.organization_members
-- ---------------------------------------------------------------------------

create table public.organization_members (
  organization_id uuid not null
    references public.organizations(id) on delete cascade,
  user_id uuid not null
    references auth.users(id) on delete cascade,
  role text not null default 'member',
  status text not null default 'ACTIVE',
  created_at timestamptz not null default now(),

  -- PK composta satisfaz a unicidade canônica (organization_id, user_id)
  -- do DATA_MODEL §2 sem índice unique redundante.
  primary key (organization_id, user_id),

  constraint organization_members_role_valid
    check (role in ('owner', 'admin', 'member')),
  constraint organization_members_status_valid
    check (status in ('ACTIVE', 'INACTIVE'))
);

comment on table public.organization_members is
  'Membership é a fonte de autorização humana. Policies chegam na 001D.';

-- A PK composta indexa (organization_id, user_id) nessa ordem, o que não
-- serve ao lookup "quais orgs este usuário tem" — caminho quente do guard de
-- sessão. Índice dedicado por user_id.
create index organization_members_user_id_idx
  on public.organization_members (user_id);

-- ---------------------------------------------------------------------------
-- 3. RLS explícito
-- ---------------------------------------------------------------------------

-- O event trigger `ensure_rls` (Rodada 001A) já habilitaria RLS aqui, mas
-- permanece defesa em profundidade: a migration não depende dele.
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;

-- Zero policies nesta rodada. Com RLS habilitado e nenhuma policy, todo
-- acesso não-BYPASSRLS é negado por padrão.

-- ---------------------------------------------------------------------------
-- 4. Fechar os papéis do browser até a 001D
-- ---------------------------------------------------------------------------

-- Neutraliza os default privileges descritos no cabeçalho. Idempotente:
-- REVOKE de privilégio inexistente é no-op no Postgres.
revoke all on table public.organizations from anon, authenticated;
revoke all on table public.organization_members from anon, authenticated;
