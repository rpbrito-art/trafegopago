-- Rodada 004C — Offer Catalog + Business Context Foundation
-- Mandato: rodadas/gpt/RODADA_004C_OFFER_CATALOG_BUSINESS_CONTEXT.md
--
-- O que o negócio oferece deixa de ser uma linha de texto em
-- `business_profiles.primary_offer` e passa a ser estrutura com histórico.
--
-- Duas tabelas, e não uma, porque são duas perguntas diferentes:
--
--   `business_offers`         — esta oferta existe e ainda é oferecida?
--   `business_offer_versions` — como ela era apresentada em cada período?
--
-- Guardar as duas coisas na mesma linha obrigaria a sobrescrever o passado a
-- cada edição de preço ou de proposta de valor. A memória de como a empresa
-- apresentava sua oferta quando um resultado aconteceu é justamente o que
-- sustenta análise futura sem adivinhação (mandato §5).
--
-- `business_profiles.primary_offer` NÃO é migrado aqui. Converter texto livre
-- em fato estruturado sem confirmação humana inventaria tipo, preço e proposta
-- de valor que ninguém declarou (mandato §8).

-- ---------------------------------------------------------------------------
-- 1. public.business_offers — identidade estável da oferta
-- ---------------------------------------------------------------------------

create table public.business_offers (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id) on delete cascade,

  -- Só dois estados. O fluxo normal nunca usa DELETE: arquivar preserva a
  -- identidade e todas as versões, apagar destruiria o histórico que a tabela
  -- de versões existe para guardar.
  status text not null default 'ACTIVE',

  -- `set null` e não `cascade`: quem cadastrou pode sair da empresa; a oferta
  -- é do negócio.
  created_by uuid references auth.users(id) on delete set null,

  created_at timestamptz not null default now(),
  archived_at timestamptz,

  constraint business_offers_status_valid
    check (status in ('ACTIVE', 'ARCHIVED')),

  -- Estado e timestamp andam juntos: `ARCHIVED` sem hora não diz quando o
  -- negócio parou de oferecer, e `ACTIVE` com hora é contradição.
  constraint business_offers_archived_requires_timestamp
    check (status <> 'ARCHIVED' or archived_at is not null),
  constraint business_offers_active_has_no_archived_at
    check (status <> 'ACTIVE' or archived_at is null),

  -- Redundante como chave — `id` já é único —, mas é o alvo da FK composta das
  -- versões. É ele que torna impossível, no banco, uma versão apontar para
  -- oferta de outro tenant (`SECURITY_MODEL.md` §4).
  constraint business_offers_tenant_identity
    unique (organization_id, id)
);

comment on table public.business_offers is
  'Identidade de uma oferta do negocio ao longo do tempo. Conteudo fica em business_offer_versions.';

comment on column public.business_offers.status is
  'ACTIVE ou ARCHIVED. Arquivar preserva identidade e versoes; o fluxo normal nao usa DELETE.';

-- Catálogo do tenant, do mais recente ao mais antigo.
create index business_offers_org_status_created_at_idx
  on public.business_offers (organization_id, status, created_at desc);

-- Cobertura da FK `created_by` — mesma dívida que os INFO de `ai_runs` da 004A
-- geraram; aqui ela já nasce quitada.
create index business_offers_created_by_idx
  on public.business_offers (created_by)
  where created_by is not null;

alter table public.business_offers enable row level security;

-- ---------------------------------------------------------------------------
-- 2. public.business_offer_versions — conteúdo versionado
-- ---------------------------------------------------------------------------

create table public.business_offer_versions (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id) on delete cascade,

  offer_id uuid not null,

  -- Começa em 1 e só cresce. Serve à leitura humana do histórico; a UI não o
  -- mostra (mandato §9.3).
  version_no integer not null,

  name text not null,

  -- Taxonomia interna. A UI traduz para português simples e nunca exibe estes
  -- identificadores (`GROWTH_INTELLIGENCE_CANONICAL.md` §2.1).
  offer_type text not null,

  description text,
  value_proposition text,

  -- Como o preço é apresentado ao cliente — não é o mesmo que ter um número.
  -- "Sob orçamento" e "prefiro não informar" são respostas legítimas, e
  -- distintas de preço zero.
  price_mode text not null,

  -- Unidade menor inteira (`DATA_MODEL.md` §1). Nenhum caminho até esta coluna
  -- passa por ponto flutuante: a conversão do texto digitado é textual, em
  -- `src/lib/business/money.ts`.
  price_min_minor bigint,
  price_max_minor bigint,

  -- Vem de `organizations.default_currency`, lida server-side pela RPC. O
  -- browser não escolhe moeda nesta rodada (mandato §4.4).
  currency text not null,

  created_by uuid references auth.users(id) on delete set null,

  created_at timestamptz not null default now(),

  -- NULL = esta é a versão corrente. Preenchido, a versão virou histórico e
  -- não volta a ser alterada.
  superseded_at timestamptz,

  -- É esta FK composta — e não código de aplicação — que impede uma versão de
  -- apontar para oferta de outra organização.
  constraint business_offer_versions_offer_same_tenant
    foreign key (organization_id, offer_id)
    references public.business_offers (organization_id, id)
    on delete cascade,

  constraint business_offer_versions_version_no_positive
    check (version_no >= 1),

  -- Duas versões com o mesmo número na mesma oferta seriam um histórico que
  -- não pode ser ordenado.
  constraint business_offer_versions_version_unique
    unique (offer_id, version_no),

  constraint business_offer_versions_offer_type_valid
    check (offer_type in ('PRODUCT', 'SERVICE', 'PACKAGE', 'OTHER')),

  constraint business_offer_versions_price_mode_valid
    check (price_mode in (
      'FIXED',
      'STARTING_AT',
      'RANGE',
      'QUOTE',
      'FREE',
      'NOT_INFORMED'
    )),

  constraint business_offer_versions_currency_valid
    check (currency ~ '^[A-Z]{3}$'),

  -- Nome é a única resposta obrigatória de conteúdo. String vazia é recusada:
  -- um nome em branco não identifica oferta alguma.
  constraint business_offer_versions_name_not_blank
    check (btrim(name) <> ''),
  constraint business_offer_versions_name_max_length
    check (char_length(name) <= 120),

  -- Ausência é NULL. String vazia seria informação inexistente fingindo
  -- existir — mesma regra dos detalhes de `growth_objectives`.
  constraint business_offer_versions_description_not_blank
    check (description is null or btrim(description) <> ''),
  constraint business_offer_versions_description_max_length
    check (description is null or char_length(description) <= 600),

  constraint business_offer_versions_value_proposition_not_blank
    check (value_proposition is null or btrim(value_proposition) <> ''),
  constraint business_offer_versions_value_proposition_max_length
    check (value_proposition is null or char_length(value_proposition) <= 400),

  constraint business_offer_versions_amounts_not_negative
    check (
      (price_min_minor is null or price_min_minor >= 0)
      and (price_max_minor is null or price_max_minor >= 0)
    ),

  -- Mesmo teto de `money.ts` (R$ 1 bilhão em centavos): um erro de digitação
  -- não vira número absurdo persistido.
  constraint business_offer_versions_amounts_within_ceiling
    check (
      (price_min_minor is null or price_min_minor <= 100000000000)
      and (price_max_minor is null or price_max_minor <= 100000000000)
    ),

  -- Cada modo de preço admite exatamente uma forma. Sem isto seria possível
  -- gravar "sob orçamento" com valor, ou "faixa" com um extremo só — estados
  -- que a UI teria de adivinhar como apresentar.
  constraint business_offer_versions_price_shape
    check (
      case price_mode
        when 'FIXED' then
          price_min_minor is not null and price_max_minor is null
        when 'STARTING_AT' then
          price_min_minor is not null and price_max_minor is null
        when 'RANGE' then
          price_min_minor is not null
          and price_max_minor is not null
          and price_max_minor >= price_min_minor
        else
          price_min_minor is null and price_max_minor is null
      end
    )
);

comment on table public.business_offer_versions is
  'Conteudo versionado de uma oferta. superseded_at nulo = versao corrente; versao antiga nao e alterada.';

comment on column public.business_offer_versions.price_mode is
  'Como o preco e apresentado. QUOTE/FREE/NOT_INFORMED nao persistem valor numerico.';

comment on column public.business_offer_versions.currency is
  'Moeda padrao da organizacao, lida server-side. O browser nao escolhe moeda.';

-- Uma oferta nunca tem duas versões correntes. É esta constraint — e não a
-- aplicação — que garante isso, inclusive sob escrita concorrente.
create unique index business_offer_versions_one_current_per_offer
  on public.business_offer_versions (offer_id)
  where superseded_at is null;

-- Histórico de uma oferta, e cobertura do prefixo `(organization_id, offer_id)`
-- exigido pela FK composta.
create index business_offer_versions_org_offer_version_idx
  on public.business_offer_versions (organization_id, offer_id, version_no desc);

create index business_offer_versions_created_by_idx
  on public.business_offer_versions (created_by)
  where created_by is not null;

alter table public.business_offer_versions enable row level security;

-- ---------------------------------------------------------------------------
-- 3. Grants e RLS
-- ---------------------------------------------------------------------------

revoke all on table public.business_offers from anon, authenticated;
revoke all on table public.business_offer_versions from anon, authenticated;

-- Browser: somente leitura, e só a da própria organização. A escrita passa
-- obrigatoriamente pelas RPCs — sem grant de INSERT/UPDATE/DELETE, nenhuma
-- policy de escrita poderia sequer ser exercida.
grant select on table public.business_offers to authenticated;
grant select on table public.business_offer_versions to authenticated;

-- Sem DELETE nem para `service_role`: arquivar é a operação de retirada, e o
-- histórico não deve ter caminho de apagamento no fluxo normal.
grant select, insert, update on table public.business_offers to service_role;
grant select, insert, update on table public.business_offer_versions to service_role;

-- Mesma forma da policy de `growth_objectives`: membership ACTIVE numa
-- organização ACTIVE. Membro desativado, ou organização suspensa, não lê.
create policy business_offers_select_by_active_membership
  on public.business_offers
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

create policy business_offer_versions_select_by_active_membership
  on public.business_offer_versions
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
-- 4. public.save_business_offer
-- ---------------------------------------------------------------------------

-- Criar e revisar são a mesma operação de domínio vista em dois momentos: o
-- usuário preenche o mesmo formulário. Separá-las em duas RPCs duplicaria
-- autorização, normalização e comparação de idempotência.
--
-- A operação é composta — supersede a versão corrente e insere a próxima — e
-- precisa ser atômica. Feita em duas chamadas a partir da aplicação, duas
-- submissões concorrentes deixariam a oferta com duas versões correntes ou com
-- nenhuma.
--
-- `security invoker`: quem chama é `service_role`, que já tem os grants
-- necessários. Um DEFINER acrescentaria escalada de privilégio sem resolver
-- nada — mesmo raciocínio de `set_active_growth_objective`.
--
-- `p_user_id` NUNCA vem do browser: a aplicação o obtém de `getClaims()`
-- verificado server-side. Papel e status são lidos aqui, da membership.
-- `p_offer_id` pode vir do formulário — e por isso é validado contra a
-- organização resolvida no servidor antes de qualquer escrita.
create function public.save_business_offer(
  p_user_id uuid,
  p_organization_id uuid,
  p_name text,
  p_offer_type text,
  p_price_mode text,
  p_offer_id uuid default null,
  p_description text default null,
  p_value_proposition text default null,
  p_price_min_minor bigint default null,
  p_price_max_minor bigint default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_name text;
  v_description text;
  v_value_proposition text;
  v_currency text;
  v_offer_id uuid;
  v_offer_status text;
  v_current public.business_offer_versions%rowtype;
  v_next_version integer;
begin
  if p_user_id is null or p_organization_id is null then
    raise exception 'p_user_id e p_organization_id sao obrigatorios'
      using errcode = '22023';
  end if;

  -- Normalização na fronteira do domínio. Feita antes da comparação de
  -- idempotência de propósito: ' Corte ' e 'Corte' são o mesmo nome, e sem
  -- isto o reenvio de um espaço a mais criaria uma versão nova sem mudança
  -- real.
  v_name := btrim(coalesce(p_name, ''));
  v_description := nullif(btrim(coalesce(p_description, '')), '');
  v_value_proposition := nullif(btrim(coalesce(p_value_proposition, '')), '');

  if v_name = '' then
    raise exception 'nome da oferta e obrigatorio' using errcode = '22023';
  end if;

  -- Serializa por organização. Mais forte do que o exigido — o mandato pede
  -- serialização por oferta —, e mais simples: o índice único parcial já
  -- impediria duas versões correntes, mas sem o lock a segunda transação
  -- falharia com 23505 em vez de esperar e produzir a próxima versão
  -- corretamente. O mesmo lock cobre a criação, onde ainda não existe oferta
  -- para travar.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'business_offer:' || p_organization_id::text, 0
    )
  );

  -- Autorização lida do banco, não recebida por parâmetro. Organização ACTIVE,
  -- membership ACTIVE e papel que possa alterar o que a empresa oferece.
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
    raise exception 'usuario nao autorizado a manter ofertas'
      using errcode = '42501';
  end if;

  -- A moeda é do negócio, não do formulário.
  select o.default_currency into v_currency
  from public.organizations o
  where o.id = p_organization_id;

  if v_currency is null then
    raise exception 'organizacao sem moeda padrao definida' using errcode = '22023';
  end if;

  if p_offer_id is not null then
    -- Cross-tenant falha fechado, e falha igual a "não existe": o filtro por
    -- `organization_id` faz um id de outra empresa não ser encontrado, e a
    -- mensagem não distingue os dois casos para não confirmar existência.
    select o.id, o.status into v_offer_id, v_offer_status
    from public.business_offers o
    where o.id = p_offer_id
      and o.organization_id = p_organization_id;

    if v_offer_id is null then
      raise exception 'oferta nao encontrada nesta organizacao'
        using errcode = '42501';
    end if;

    -- Oferta arquivada não é revisada silenciosamente: retomar uma oferta é
    -- decisão do usuário, não efeito colateral de salvar um formulário.
    if v_offer_status <> 'ACTIVE' then
      raise exception 'oferta arquivada nao pode ser revisada'
        using errcode = '55000';
    end if;

    select * into v_current
    from public.business_offer_versions v
    where v.offer_id = v_offer_id
      and v.superseded_at is null;
  else
    -- Criação. Antes de inserir, procura uma oferta ativa cuja versão corrente
    -- diga exatamente a mesma coisa: é o duplo clique em "Adicionar oferta".
    -- Sem isto o catálogo nasceria com duas linhas idênticas e o usuário
    -- teria de arquivar uma delas.
    select v.* into v_current
    from public.business_offer_versions v
    join public.business_offers o on o.id = v.offer_id
    where v.organization_id = p_organization_id
      and v.superseded_at is null
      and o.status = 'ACTIVE'
      and v.name = v_name
      and v.offer_type = p_offer_type
      and v.price_mode = p_price_mode
      and v.description is not distinct from v_description
      and v.value_proposition is not distinct from v_value_proposition
      and v.price_min_minor is not distinct from p_price_min_minor
      and v.price_max_minor is not distinct from p_price_max_minor
      and v.currency = v_currency
    limit 1;

    if found then
      return v_current.offer_id;
    end if;

    insert into public.business_offers (organization_id, created_by)
    values (p_organization_id, p_user_id)
    returning id into v_offer_id;

    v_current := null;
  end if;

  -- Reenvio idêntico é idempotente: devolve a oferta sem criar versão nova.
  -- Sem isto, salvar duas vezes produziria um "histórico" de uma mudança que
  -- nunca houve.
  if v_current.id is not null
     and v_current.name = v_name
     and v_current.offer_type = p_offer_type
     and v_current.price_mode = p_price_mode
     and v_current.description is not distinct from v_description
     and v_current.value_proposition is not distinct from v_value_proposition
     and v_current.price_min_minor is not distinct from p_price_min_minor
     and v_current.price_max_minor is not distinct from p_price_max_minor
     and v_current.currency = v_currency
  then
    return v_offer_id;
  end if;

  -- Supersede e insere na mesma transação: nenhum instante em que a oferta
  -- fica sem versão corrente.
  if v_current.id is not null then
    update public.business_offer_versions
       set superseded_at = now()
     where id = v_current.id;

    v_next_version := v_current.version_no + 1;
  else
    v_next_version := 1;
  end if;

  insert into public.business_offer_versions (
    organization_id,
    offer_id,
    version_no,
    name,
    offer_type,
    description,
    value_proposition,
    price_mode,
    price_min_minor,
    price_max_minor,
    currency,
    created_by
  )
  values (
    p_organization_id,
    v_offer_id,
    v_next_version,
    v_name,
    p_offer_type,
    v_description,
    v_value_proposition,
    p_price_mode,
    p_price_min_minor,
    p_price_max_minor,
    v_currency,
    p_user_id
  );

  return v_offer_id;
end;
$$;

comment on function public.save_business_offer(
  uuid, uuid, text, text, text, uuid, text, text, bigint, bigint
) is
  'Cria ou revisa uma oferta, arquivando a versao corrente na mesma transacao. Somente service_role, com user_id de identidade verificada.';

-- Estar em `public` significa estar exposta como RPC pela Data API. A defesa é
-- o privilégio: sem EXECUTE, `anon`/`authenticated` recebem 42501.
revoke all on function public.save_business_offer(
  uuid, uuid, text, text, text, uuid, text, text, bigint, bigint
) from public, anon, authenticated;

grant execute on function public.save_business_offer(
  uuid, uuid, text, text, text, uuid, text, text, bigint, bigint
) to service_role;

-- ---------------------------------------------------------------------------
-- 5. public.archive_business_offer
-- ---------------------------------------------------------------------------

-- Separada de propósito: arquivar não recebe conteúdo e não deve poder alterar
-- nenhum campo da oferta por engano. As versões permanecem intactas — inclusive
-- a corrente, que continua sendo o último conteúdo apresentado.
create function public.archive_business_offer(
  p_user_id uuid,
  p_organization_id uuid,
  p_offer_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_status text;
begin
  if p_user_id is null or p_organization_id is null or p_offer_id is null then
    raise exception 'p_user_id, p_organization_id e p_offer_id sao obrigatorios'
      using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'business_offer:' || p_organization_id::text, 0
    )
  );

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
    raise exception 'usuario nao autorizado a manter ofertas'
      using errcode = '42501';
  end if;

  select o.status into v_status
  from public.business_offers o
  where o.id = p_offer_id
    and o.organization_id = p_organization_id;

  if v_status is null then
    raise exception 'oferta nao encontrada nesta organizacao'
      using errcode = '42501';
  end if;

  -- Arquivar de novo não é erro nem altera `archived_at`: a hora registrada é
  -- a da decisão original.
  if v_status = 'ARCHIVED' then
    return p_offer_id;
  end if;

  update public.business_offers
     set status = 'ARCHIVED',
         archived_at = now()
   where id = p_offer_id;

  return p_offer_id;
end;
$$;

comment on function public.archive_business_offer(uuid, uuid, uuid) is
  'Arquiva uma oferta preservando todas as versoes. Idempotente. Somente service_role.';

revoke all on function public.archive_business_offer(uuid, uuid, uuid)
  from public, anon, authenticated;

grant execute on function public.archive_business_offer(uuid, uuid, uuid)
  to service_role;
