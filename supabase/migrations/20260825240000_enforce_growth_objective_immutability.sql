-- Correção 004D-01 — Imutabilidade de growth_objectives
-- Mandato: rodadas/gpt/CORRECAO_004D_01_IMUTABILIDADE_GROWTH_OBJECTIVES.md
--
-- `growth_objectives` guarda memória estratégica versionada — o que o negócio
-- queria conseguir, para onde levava as pessoas, o que contava como sucesso e o
-- que estava priorizando em cada período. Mas `service_role` mantinha `UPDATE`
-- amplo e a tabela não tinha guarda alguma: um caminho privilegiado fora das
-- RPCs podia reescrever objetivo, jornada, sucesso, foco, tenant, autoria ou
-- datas sem criar versão nova.
--
-- É o mesmo defeito que a correção 004C-01 fechou em `business_offer_versions`,
-- e a forma da solução é deliberadamente a mesma — duas entidades históricas
-- com invariantes divergentes seriam duas regras para lembrar em vez de uma.
--
-- Delta aditivo. Nenhuma migration já aplicada é reescrita.
--
-- Duas camadas:
--
--   1. privilégio por coluna — `service_role` só escreve `status`/`archived_at`;
--   2. trigger — a invariante vale inclusive para quem ignora grants (dono do
--      banco, migration, sessão de manutenção).
--
-- A primeira sozinha não alcança o dono da tabela. A segunda sozinha bastaria,
-- mas deixaria de pé um grant maior do que o trabalho exige, e menor privilégio
-- é a regra do `SECURITY_MODEL.md` §5.

-- ---------------------------------------------------------------------------
-- 1. Privilégio de escrita reduzido ao mínimo necessário
-- ---------------------------------------------------------------------------

-- O único UPDATE do fluxo normal é o supersede: `set_active_growth_objective` e
-- `set_growth_objective_focus` arquivam a linha vigente antes de inserir a
-- próxima. INSERT e SELECT permanecem como estavam; `anon` e `authenticated`
-- não são tocados aqui — seus grants e a policy de leitura continuam idênticos.
revoke update on table public.growth_objectives from service_role;

grant update (status, archived_at) on table public.growth_objectives to service_role;

-- ---------------------------------------------------------------------------
-- 2. Guarda de banco: conteúdo estratégico é imutável
-- ---------------------------------------------------------------------------

-- `55000` (object_not_in_prerequisite_state) nas recusas, o mesmo código que a
-- guarda de `business_offer_versions` usa: a família de recusa é a mesma —
-- alterar algo que já é passado.
create function public.enforce_growth_objective_immutability()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_old jsonb;
  v_new jsonb;
begin
  -- Linha já arquivada é passado: nem conteúdo, nem reativação.
  if old.status <> 'ACTIVE' or old.archived_at is not null then
    raise exception 'objetivo ja arquivado nao pode ser alterado'
      using errcode = '55000';
  end if;

  -- A única transição permitida é `ACTIVE/NULL -> ARCHIVED/timestamp`. Recusar
  -- `ACTIVE -> ACTIVE` fecha o caminho de quem tenta alterar conteúdo sem mexer
  -- no arquivamento.
  if new.status <> 'ARCHIVED' or new.archived_at is null then
    raise exception 'a unica alteracao permitida e arquivar a versao corrente'
      using errcode = '55000';
  end if;

  -- Comparação da linha inteira, com `status` e `archived_at` neutralizados nos
  -- dois lados. Campo a campo seria mais legível e mais frágil: uma coluna
  -- acrescentada depois — como `focus_type` e `focus_offer_id` foram — nasceria
  -- fora da guarda, e o esquecimento só apareceria quando alguém já tivesse
  -- reescrito histórico.
  v_old := pg_catalog.jsonb_set(
    pg_catalog.jsonb_set(
      pg_catalog.to_jsonb(old), '{status}'::text[], 'null'::jsonb),
    '{archived_at}'::text[], 'null'::jsonb);

  v_new := pg_catalog.jsonb_set(
    pg_catalog.jsonb_set(
      pg_catalog.to_jsonb(new), '{status}'::text[], 'null'::jsonb),
    '{archived_at}'::text[], 'null'::jsonb);

  if v_old is distinct from v_new then
    raise exception 'conteudo de objetivo e imutavel; crie uma nova versao'
      using errcode = '55000';
  end if;

  return new;
end;
$$;

comment on function public.enforce_growth_objective_immutability() is
  'Recusa qualquer UPDATE em growth_objectives que nao seja ACTIVE/NULL -> ARCHIVED/timestamp.';

-- Trigger function não precisa de EXECUTE para o papel que dispara o UPDATE: o
-- privilégio é verificado na criação do trigger, não na execução. Sem grant
-- algum, ela continua rodando e não vira uma função chamável pela Data API.
revoke all on function public.enforce_growth_objective_immutability()
  from public, anon, authenticated;

create trigger growth_objectives_immutable
  before update on public.growth_objectives
  for each row
  execute function public.enforce_growth_objective_immutability();

comment on trigger growth_objectives_immutable on public.growth_objectives is
  'Imutabilidade da memoria estrategica (Correcao 004D-01). Falha fechado inclusive em chamada privilegiada.';
