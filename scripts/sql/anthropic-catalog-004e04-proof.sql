-- Prova transacional da Correção 004E-04 — mandato §9.4.
--
-- O que se prova aqui é a consequência que importa: depois da troca, **um
-- único** candidato Tier 1 é elegível para a task. Não basta Anthropic existir
-- no catálogo — se Gemini continuasse elegível, a escolha ficaria por conta do
-- desempate alfabético do Router, que ordena por `modelKey`. E `claude-...`
-- vem antes de `gemini-...`: passaria por acidente, não por decisão.
--
-- Transacional: `begin … rollback`. Nenhuma fixture é criada.
--
-- Uso:
--   npx supabase db query --linked --file scripts/sql/anthropic-catalog-004e04-proof.sql

begin;

create temporary table prova (
  ordem serial,
  nome text,
  esperado text,
  obtido text,
  passou boolean
) on commit drop;

create function pg_temp.registrar(p_nome text, p_esperado text, p_obtido text)
returns void language sql as $$
  insert into prova (nome, esperado, obtido, passou)
  values (p_nome, p_esperado, p_obtido, p_esperado = p_obtido);
$$;

-- ---------------------------------------------------------------------------
-- 1. Anthropic catalogado
-- ---------------------------------------------------------------------------

select pg_temp.registrar('01 provider Anthropic ACTIVE', 'ACTIVE',
  (select status from public.ai_providers where key = 'anthropic_claude'));

select pg_temp.registrar('02 config do provider nao contem segredo', 'false',
  (select (config_metadata::text ~* '(api[_-]?key|secret|token|bearer|sk-ant)')::text
     from public.ai_providers where key = 'anthropic_claude'));

select pg_temp.registrar('03 modelo Haiku 4.5 no tier 1', '1',
  (select m.tier::text from public.ai_models m
     join public.ai_providers p on p.id = m.provider_id
    where p.key = 'anthropic_claude' and m.model_key = 'claude-haiku-4-5-20251001'));

select pg_temp.registrar('04 janela e saida conforme documentacao', '200000|64000',
  (select m.context_window_tokens::text || '|' || m.max_output_tokens::text
     from public.ai_models m
     join public.ai_providers p on p.id = m.provider_id
    where p.key = 'anthropic_claude' and m.model_key = 'claude-haiku-4-5-20251001'));

select pg_temp.registrar('05 modelo declara as capacidades da task', 'true',
  (select (m.capability_tags @> array['STRUCTURED_EXTRACTION','JSON_SCHEMA_NATIVE','LOW_COST'])::text
     from public.ai_models m
     join public.ai_providers p on p.id = m.provider_id
    where p.key = 'anthropic_claude' and m.model_key = 'claude-haiku-4-5-20251001'));

select pg_temp.registrar('06 preco Standard em USD por 1M tokens', '1.000000000000|5.000000000000|USD',
  (select v.input_price_per_million::text || '|' || v.output_price_per_million::text
       || '|' || v.currency
     from public.ai_price_versions v
     join public.ai_models m on m.id = v.ai_model_id
     join public.ai_providers p on p.id = m.provider_id
    where p.key = 'anthropic_claude' and v.effective_to is null));

-- Prompt caching não entra nesta rodada: o contrato de custo da 004A tem um
-- único campo de cache, e a Anthropic cobra leitura e criação com preços
-- distintos. Registrar um dos dois seria escolher metade da conta.
select pg_temp.registrar('07 preco de cache permanece nulo', 'true',
  (select (v.cached_input_price_per_million is null)::text
     from public.ai_price_versions v
     join public.ai_models m on m.id = v.ai_model_id
     join public.ai_providers p on p.id = m.provider_id
    where p.key = 'anthropic_claude' and v.effective_to is null));

select pg_temp.registrar('08 preco cita fonte oficial e data', 'true',
  (select (v.source_note like '%platform.claude.com%' and v.source_note like '%2026-08-26%')::text
     from public.ai_price_versions v
     join public.ai_models m on m.id = v.ai_model_id
     join public.ai_providers p on p.id = m.provider_id
    where p.key = 'anthropic_claude' and v.effective_to is null));

-- ---------------------------------------------------------------------------
-- 2. Gemini inelegível, mas preservado
-- ---------------------------------------------------------------------------

select pg_temp.registrar('09 provider Gemini continua registrado', '1',
  (select count(*)::text from public.ai_providers where key = 'google_gemini'));

select pg_temp.registrar('10 provider Gemini ficou DISABLED', 'DISABLED',
  (select status from public.ai_providers where key = 'google_gemini'));

select pg_temp.registrar('11 modelo Gemini continua registrado e DISABLED', 'DISABLED',
  (select m.status from public.ai_models m
     join public.ai_providers p on p.id = m.provider_id
    where p.key = 'google_gemini' and m.model_key = 'gemini-2.5-flash-lite'));

-- Status e vigência são filtros independentes no catálogo da 004A; um modelo
-- retirado de serviço precisa sair pelos dois.
select pg_temp.registrar('12 vigencia do modelo Gemini foi encerrada', 'true',
  (select (m.effective_to is not null)::text from public.ai_models m
     join public.ai_providers p on p.id = m.provider_id
    where p.key = 'google_gemini' and m.model_key = 'gemini-2.5-flash-lite'));

select pg_temp.registrar('13 nenhum preco Gemini aberto', '0',
  (select count(*)::text from public.ai_price_versions v
     join public.ai_models m on m.id = v.ai_model_id
     join public.ai_providers p on p.id = m.provider_id
    where p.key = 'google_gemini' and v.effective_to is null));

select pg_temp.registrar('14 historico de preco Gemini preservado', 'true',
  (select (count(*) > 0)::text from public.ai_price_versions v
     join public.ai_models m on m.id = v.ai_model_id
     join public.ai_providers p on p.id = m.provider_id
    where p.key = 'google_gemini'));

-- ---------------------------------------------------------------------------
-- 3. Um único candidato elegível para a task
-- ---------------------------------------------------------------------------

-- Reproduz exatamente o filtro de `criarAICatalog().listarCandidatos()`:
-- status elegível no modelo e no provider, vigência aberta, e as capacidades
-- que a task exige.
create temporary view pg_temp.candidatos as
select m.model_key, p.key as provider_key, m.tier
from public.ai_models m
join public.ai_providers p on p.id = m.provider_id
where m.status in ('ACTIVE', 'DEGRADED')
  and p.status in ('ACTIVE', 'DEGRADED')
  and m.effective_from <= now()
  and (m.effective_to is null or m.effective_to > now())
  and m.capability_tags @> array['STRUCTURED_EXTRACTION','JSON_SCHEMA_NATIVE','LOW_COST'];

select pg_temp.registrar('15 existe exatamente um candidato elegivel', '1',
  (select count(*)::text from pg_temp.candidatos where tier = 1));

select pg_temp.registrar('16 o candidato e o Haiku 4.5 da Anthropic',
  'anthropic_claude|claude-haiku-4-5-20251001',
  (select provider_key || '|' || model_key from pg_temp.candidatos where tier = 1));

select pg_temp.registrar('17 Gemini nao aparece entre os candidatos', '0',
  (select count(*)::text from pg_temp.candidatos where provider_key = 'google_gemini'));

-- ---------------------------------------------------------------------------
-- 4. Nenhuma execução real aconteceu
-- ---------------------------------------------------------------------------

select pg_temp.registrar('18 nenhum run real da task', '0',
  (select count(*)::text from public.ai_runs
    where task_type = 'DECLARED_BUSINESS_CONTEXT_REVIEW'));

select pg_temp.registrar('19 nenhuma revisao real', '0',
  (select count(*)::text from public.declared_context_reviews));

select pg_temp.registrar('20 nenhuma tentativa real', '0',
  (select count(*)::text from public.declared_context_review_attempts));

-- ---------------------------------------------------------------------------
-- Veredicto — um único resultado, porque o CLI imprime apenas o último.
-- ---------------------------------------------------------------------------

select
  count(*) as casos,
  count(*) filter (where passou) as passaram,
  count(*) filter (where not passou) as falharam,
  string_agg(
    format('%s %s (esperado %s, obtido %s)',
      case when passou then '[OK]' else '[FALHOU]' end, nome, esperado, obtido),
    E'\n' order by ordem
  ) as detalhe
from prova;

rollback;
