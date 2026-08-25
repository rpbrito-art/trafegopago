-- Rodada 004D — Guided Growth Journey Foundation
-- Mandato: rodadas/gpt/RODADA_004D_GUIDED_GROWTH_JOURNEY_FOUNDATION.md
--
-- O objetivo do negócio passa a registrar **o que está sendo priorizado agora**:
-- uma oferta específica do catálogo, ou o negócio como um todo.
--
-- Delta aditivo. As migrations `20260825180000_create_growth_objectives.sql`,
-- `20260825210000_create_business_offers.sql` e
-- `20260825220000_enforce_offer_version_immutability.sql` já foram aplicadas e
-- **não são reescritas**.
--
-- O foco aponta para `business_offers` — a identidade estável —, nunca para
-- `business_offer_versions`. Priorizar uma oferta é uma decisão sobre a oferta,
-- não sobre a redação que ela tinha naquele dia; o histórico de versões
-- continua sendo assunto da 004C.

-- ---------------------------------------------------------------------------
-- 1. Colunas de foco
-- ---------------------------------------------------------------------------

alter table public.growth_objectives
  add column focus_type text,
  add column focus_offer_id uuid;

-- `focus_type` NÃO é `not null`: os objetivos já promovidos existem sem foco, e
-- isso é contexto progressivamente incompleto, não dado inválido
-- (`GROWTH_INTELLIGENCE_CANONICAL.md` §3.1). Forçar um valor agora exigiria
-- escolher um foco em nome de quem nunca foi perguntado.
comment on column public.growth_objectives.focus_type is
  'BUSINESS, OFFER ou NULL quando o foco ainda nao foi confirmado pelo usuario.';

comment on column public.growth_objectives.focus_offer_id is
  'Identidade da oferta priorizada. Nunca aponta para uma versao de oferta.';

-- É esta FK composta — e não código de aplicação — que impede o objetivo de uma
-- organização apontar para oferta de outra.
--
-- `on delete cascade` porque o único DELETE que alcança `business_offers` no
-- fluxo real é o cascade de `organizations`: o produto arquiva ofertas, e
-- `service_role` não tem grant de DELETE na tabela. Com `no action`, esse
-- cascade poderia falhar por ordem de avaliação; o cenário em que a regra
-- apagaria um objetivo é o mesmo em que a organização inteira está sendo
-- removida.
alter table public.growth_objectives
  add constraint growth_objectives_focus_offer_same_tenant
  foreign key (organization_id, focus_offer_id)
  references public.business_offers (organization_id, id)
  on delete cascade;

alter table public.growth_objectives
  add constraint growth_objectives_focus_type_valid
  check (focus_type is null or focus_type in ('BUSINESS', 'OFFER'));

-- Cada estado de foco admite exatamente uma forma. Sem isto seria possível
-- gravar "foco no negócio" apontando para uma oferta, ou "foco em oferta" sem
-- dizer qual — estados que a UI teria de adivinhar como apresentar.
alter table public.growth_objectives
  add constraint growth_objectives_focus_shape
  check (
    case
      when focus_type is null then focus_offer_id is null
      when focus_type = 'BUSINESS' then focus_offer_id is null
      else focus_offer_id is not null
    end
  );

-- Cobertura da FK composta, na mesma ordem das colunas. Parcial: a maioria dos
-- objetivos não tem foco em oferta, e indexar NULL engordaria o índice sem
-- servir a nenhuma verificação.
create index growth_objectives_focus_offer_idx
  on public.growth_objectives (organization_id, focus_offer_id)
  where focus_offer_id is not null;

-- ---------------------------------------------------------------------------
-- 2. public.set_growth_objective_focus
-- ---------------------------------------------------------------------------

-- Definir foco é mudança estratégica material: não reescreve o objetivo vigente
-- em place. Arquiva a linha atual e cria a próxima com os mesmos campos de
-- objetivo/jornada/sucesso e o foco novo, na mesma transação — a mesma
-- disciplina que `set_active_growth_objective` já usa para a troca de objetivo.
--
-- `security invoker`: quem chama é `service_role`, que já tem os grants
-- necessários. Um DEFINER acrescentaria escalada de privilégio sem resolver
-- nada.
--
-- `p_user_id` NUNCA vem do browser: a aplicação o obtém de `getClaims()`
-- verificado server-side. Papel e status são lidos aqui, da membership.
-- `p_objective_id` e `p_focus_offer_id` podem vir do formulário — e por isso
-- são validados contra a organização resolvida no servidor antes de qualquer
-- escrita.
create function public.set_growth_objective_focus(
  p_user_id uuid,
  p_organization_id uuid,
  p_objective_id uuid,
  p_focus_type text,
  p_focus_offer_id uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_current public.growth_objectives%rowtype;
  v_offer_status text;
  v_focus_offer_id uuid;
  v_id uuid;
begin
  if p_user_id is null or p_organization_id is null or p_objective_id is null then
    raise exception 'p_user_id, p_organization_id e p_objective_id sao obrigatorios'
      using errcode = '22023';
  end if;

  if p_focus_type is null or p_focus_type not in ('BUSINESS', 'OFFER') then
    raise exception 'foco desconhecido' using errcode = '22023';
  end if;

  -- `BUSINESS` ignora a oferta enviada em vez de recusar em silêncio o pedido
  -- inteiro: quem trocou "esta oferta" por "meu negócio" no formulário não
  -- deve receber erro por causa do valor que ficou no rádio anterior.
  v_focus_offer_id := case when p_focus_type = 'OFFER' then p_focus_offer_id else null end;

  if p_focus_type = 'OFFER' and v_focus_offer_id is null then
    raise exception 'foco em oferta exige uma oferta' using errcode = '22023';
  end if;

  -- **Mesma chave** de `set_active_growth_objective`: as duas operações
  -- disputam a única linha ACTIVE da organização, e um lock diferente deixaria
  -- uma troca de objetivo e uma troca de foco correrem em paralelo sobre ela.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'growth_objective:' || p_organization_id::text, 0
    )
  );

  -- Autorização lida do banco, não recebida por parâmetro.
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
    raise exception 'usuario nao autorizado a definir o foco'
      using errcode = '42501';
  end if;

  -- O objetivo precisa ser o ACTIVE desta organização. Um id de outro tenant,
  -- ou de uma versão já arquivada, simplesmente não é encontrado — e a
  -- mensagem não distingue os casos para não confirmar existência.
  select * into v_current
  from public.growth_objectives g
  where g.id = p_objective_id
    and g.organization_id = p_organization_id
    and g.status = 'ACTIVE';

  if not found then
    raise exception 'objetivo ativo nao encontrado nesta organizacao'
      using errcode = '42501';
  end if;

  if v_focus_offer_id is not null then
    select o.status into v_offer_status
    from public.business_offers o
    where o.id = v_focus_offer_id
      and o.organization_id = p_organization_id;

    if v_offer_status is null then
      raise exception 'oferta nao encontrada nesta organizacao'
        using errcode = '42501';
    end if;

    -- Arquivada não vira foco novo: priorizar algo que o negócio parou de
    -- oferecer produziria recomendação sobre uma oferta que não existe mais.
    if v_offer_status <> 'ACTIVE' then
      raise exception 'oferta arquivada nao pode ser o foco'
        using errcode = '55000';
    end if;
  end if;

  -- Reenvio idêntico é idempotente: devolve o objetivo vigente em vez de
  -- arquivá-lo e recriá-lo. Sem isto, um duplo clique produziria duas linhas
  -- dizendo a mesma coisa e um "histórico" de mudança que nunca houve.
  if v_current.focus_type is not distinct from p_focus_type
     and v_current.focus_offer_id is not distinct from v_focus_offer_id
  then
    return v_current.id;
  end if;

  update public.growth_objectives
     set status = 'ARCHIVED',
         archived_at = now()
   where id = v_current.id;

  -- Objetivo, jornada e sucesso são copiados: mudar o foco não é mudar o que o
  -- negócio quer conseguir. `created_by` é quem decidiu o foco novo.
  insert into public.growth_objectives (
    organization_id,
    status,
    objective_type,
    objective_detail,
    destination_type,
    success_event_type,
    success_event_detail,
    focus_type,
    focus_offer_id,
    created_by
  )
  values (
    p_organization_id,
    'ACTIVE',
    v_current.objective_type,
    v_current.objective_detail,
    v_current.destination_type,
    v_current.success_event_type,
    v_current.success_event_detail,
    p_focus_type,
    v_focus_offer_id,
    p_user_id
  )
  returning id into v_id;

  return v_id;
end;
$$;

comment on function public.set_growth_objective_focus(uuid, uuid, uuid, text, uuid) is
  'Define o foco do objetivo ativo, arquivando a versao anterior na mesma transacao. Somente service_role, com user_id de identidade verificada.';

-- Estar em `public` significa estar exposta como RPC pela Data API. A defesa é
-- o privilégio: sem EXECUTE, `anon`/`authenticated` recebem 42501.
revoke all on function public.set_growth_objective_focus(uuid, uuid, uuid, text, uuid)
  from public, anon, authenticated;

grant execute on function public.set_growth_objective_focus(uuid, uuid, uuid, text, uuid)
  to service_role;
