-- Correção 004C-01 — Imutabilidade das versões de oferta
-- Mandato: rodadas/gpt/CORRECAO_004C_01_IMUTABILIDADE_VERSOES_OFERTA.md
--
-- `business_offer_versions` é memória histórica, mas a migration aplicada
-- concedeu `UPDATE` amplo a `service_role` e não deixou nenhuma guarda no
-- banco. Enquanto isso valer, o histórico depende da disciplina de quem chama:
-- qualquer caminho privilegiado futuro pode reescrever `name`, preço, moeda ou
-- `version_no` de uma versão já criada, sem criar versão nova — destruindo em
-- silêncio exatamente a evidência que a 004C existe para preservar.
--
-- Delta aditivo. A migration `20260825210000_create_business_offers.sql` já foi
-- aplicada remotamente e **não é reescrita**.
--
-- Duas camadas, de propósito:
--
--   1. privilégio por coluna — `service_role` só pode escrever `superseded_at`;
--   2. trigger — a invariante vale inclusive para quem ignora grants (owner do
--      banco, migrations, sessão de manutenção).
--
-- A primeira sozinha não basta: privilégio não alcança o dono da tabela. A
-- segunda sozinha bastaria, mas deixaria de pé um grant maior do que o
-- trabalho exige, e menor privilégio é a regra do `SECURITY_MODEL.md` §5.

-- ---------------------------------------------------------------------------
-- 1. Privilégio de escrita reduzido ao mínimo necessário
-- ---------------------------------------------------------------------------

-- O único UPDATE do fluxo normal é o supersede feito por `save_business_offer`.
-- INSERT e SELECT permanecem como estavam; `anon` e `authenticated` não são
-- tocados aqui — seus grants e a policy de leitura continuam idênticos.
revoke update on table public.business_offer_versions from service_role;

grant update (superseded_at) on table public.business_offer_versions to service_role;

-- ---------------------------------------------------------------------------
-- 2. Guarda de banco: conteúdo de versão é imutável
-- ---------------------------------------------------------------------------

-- `55000` (object_not_in_prerequisite_state) nas três recusas, o mesmo código
-- que `save_business_offer` usa para oferta arquivada: é a mesma família de
-- recusa — alterar algo que já é passado — e a aplicação já o traduz numa
-- mensagem correta caso um dia chegue por lá.
create function public.enforce_business_offer_version_immutability()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_old jsonb;
  v_new jsonb;
begin
  -- Versão já arquivada é passado: nem conteúdo, nem reativação.
  if old.superseded_at is not null then
    raise exception 'versao de oferta ja arquivada nao pode ser alterada'
      using errcode = '55000';
  end if;

  -- A única transição permitida é `NULL -> timestamp`. Recusar `NULL -> NULL`
  -- fecha o caminho de quem tenta alterar conteúdo sem mexer no arquivamento.
  if new.superseded_at is null then
    raise exception 'a unica alteracao permitida e arquivar a versao corrente'
      using errcode = '55000';
  end if;

  -- Comparação da linha inteira, com `superseded_at` neutralizado nos dois
  -- lados. Campo a campo seria mais legível e mais frágil: uma coluna
  -- acrescentada depois nasceria fora da guarda, e o esquecimento não
  -- apareceria em lugar nenhum até alguém reescrever histórico.
  v_old := pg_catalog.jsonb_set(
    pg_catalog.to_jsonb(old), '{superseded_at}'::text[], 'null'::jsonb);
  v_new := pg_catalog.jsonb_set(
    pg_catalog.to_jsonb(new), '{superseded_at}'::text[], 'null'::jsonb);

  if v_old is distinct from v_new then
    raise exception 'conteudo de versao de oferta e imutavel; crie uma nova versao'
      using errcode = '55000';
  end if;

  return new;
end;
$$;

comment on function public.enforce_business_offer_version_immutability() is
  'Recusa qualquer UPDATE em business_offer_versions que nao seja superseded_at NULL -> timestamp.';

-- Trigger function não precisa de EXECUTE para o papel que dispara o UPDATE: o
-- privilégio é verificado na criação do trigger, não na execução. Sem grant
-- algum, ela continua rodando e não vira uma função chamável pela Data API.
revoke all on function public.enforce_business_offer_version_immutability()
  from public, anon, authenticated;

create trigger business_offer_versions_immutable
  before update on public.business_offer_versions
  for each row
  execute function public.enforce_business_offer_version_immutability();

comment on trigger business_offer_versions_immutable
  on public.business_offer_versions is
  'Imutabilidade do historico de ofertas (Correcao 004C-01). Falha fechado inclusive em chamada privilegiada.';
