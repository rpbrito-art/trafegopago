-- Correção 004E-04 — Troca do primeiro provider real para Anthropic
-- Mandato: rodadas/gpt/CORRECAO_004E_04_SWITCH_FIRST_PROVIDER_TO_ANTHROPIC.md
--
-- O provider Google Gemini foi catalogado na 004E, mas o nível pago exigiria
-- pré-pagamento mínimo que o projeto não vai fazer agora. **Nenhuma chamada
-- Gemini real chegou a acontecer**, e nenhum custo foi gerado.
--
-- Esta migration troca o primeiro provider real efetivamente usado para a
-- Claude API da Anthropic, sem apagar a história: o catálogo Gemini permanece
-- registrado e passa a ser inelegível. Falsificar que ele nunca existiu
-- apagaria a decisão que as auditorias 004E-01 a 004E-03 documentaram.
--
-- Delta aditivo. As migrations `20260825250000` a `20260825280000` já foram
-- aplicadas e **não são reescritas**.

-- ---------------------------------------------------------------------------
-- 1. Gemini vira configuração histórica inelegível
-- ---------------------------------------------------------------------------

-- `DISABLED` é o estado que o Router não considera para tarefa nova
-- (`aceitaTarefaNova()` aceita apenas ACTIVE e DEGRADED). O registro continua
-- existindo, legível e auditável.
update public.ai_providers
   set status = 'DISABLED',
       config_metadata = config_metadata || jsonb_build_object(
         'retired_at', '2026-08-26',
         'retired_reason',
           'nivel pago nao ativado; nenhuma chamada real ocorreu antes da troca'
       ),
       updated_at = now()
 where key = 'google_gemini';

update public.ai_models m
   set status = 'DISABLED',
       -- Vigência encerrada além do status: a 004A trata as duas coisas como
       -- filtros independentes, e um modelo retirado de serviço precisa sair
       -- pelos dois caminhos.
       effective_to = now(),
       model_metadata = m.model_metadata || jsonb_build_object(
         'retired_at', '2026-08-26',
         'retired_reason', 'substituido por claude-haiku-4-5-20251001 antes de qualquer chamada real'
       ),
       updated_at = now()
  from public.ai_providers p
 where p.id = m.provider_id
   and p.key = 'google_gemini'
   and m.model_key = 'gemini-2.5-flash-lite';

-- Preço encerrado na mesma data. O histórico permanece; o que deixa de existir
-- é a versão **aberta**, que é o que o Router resolveria numa execução.
update public.ai_price_versions v
   set effective_to = now()
  from public.ai_models m
  join public.ai_providers p on p.id = m.provider_id
 where v.ai_model_id = m.id
   and p.key = 'google_gemini'
   and m.model_key = 'gemini-2.5-flash-lite'
   and v.effective_to is null;

-- ---------------------------------------------------------------------------
-- 2. Provider real — Anthropic Claude API
-- ---------------------------------------------------------------------------

-- `config_metadata` guarda **apenas** configuração não secreta. A chave vive em
-- `ANTHROPIC_API_KEY`, server-only, e não tem representação aqui
-- (`SECURITY_MODEL.md` §15.1).
insert into public.ai_providers (key, name, status, config_metadata)
values (
  'anthropic_claude',
  'Anthropic Claude',
  'ACTIVE',
  jsonb_build_object(
    'api', 'claude_api',
    'endpoint', 'api.anthropic.com',
    'sdk', '@anthropic-ai/sdk',
    'sdk_version', '0.120.0',
    -- A política de retenção da Claude API informa que dados retidos não são
    -- usados para treinamento sem permissão expressa. Mesmo assim, a prova
    -- desta rodada usa somente fixtures sintéticas.
    'docs', 'https://platform.claude.com/docs/en/manage-claude/api-and-data-retention',
    'verified_at', '2026-08-26'
  )
)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- 3. Modelo real — Claude Haiku 4.5
-- ---------------------------------------------------------------------------

-- Snapshot fixo, não alias móvel: o alias `claude-haiku-4-5` pode passar a
-- apontar para outro snapshot, e o custo de um run precisa continuar
-- reproduzível anos depois.
insert into public.ai_models (
  provider_id,
  model_key,
  tier,
  capability_tags,
  status,
  supports_structured_output,
  context_window_tokens,
  max_output_tokens,
  model_metadata
)
select
  p.id,
  'claude-haiku-4-5-20251001',
  1,
  -- Capacidades, não marca: é por estas tags que o Router escolhe, e é isso
  -- que permitiu trocar o provider desta task sem tocar em feature alguma
  -- (`AI_ARCHITECTURE.md` §§5 e 20).
  array['STRUCTURED_EXTRACTION', 'JSON_SCHEMA_NATIVE', 'LOW_COST', 'FAST']::text[],
  'ACTIVE',
  true,
  200000,
  64000,
  jsonb_build_object(
    'verified_at', '2026-08-26',
    'docs', 'https://platform.claude.com/docs/en/about-claude/models/overview',
    'structured_outputs', 'output_config.format type json_schema',
    'thinking', 'nao habilitado nesta task',
    'prompt_caching', 'nao habilitado nesta rodada'
  )
from public.ai_providers p
where p.key = 'anthropic_claude'
on conflict (provider_id, model_key) do nothing;

-- ---------------------------------------------------------------------------
-- 4. Preço vigente — Standard Claude API, por 1M tokens
-- ---------------------------------------------------------------------------

-- `cached_input_price_per_million` fica **NULL** de propósito: a Anthropic
-- cobra leitura de cache e criação de cache com preços distintos, e o contrato
-- de custo da 004A tem um único campo para cache. Registrar um dos dois seria
-- escolher qual metade da conta contar. Prompt caching não é habilitado nesta
-- rodada, e o adapter falha fechado se o provider relatar tokens de cache.
insert into public.ai_price_versions (
  ai_model_id,
  input_price_per_million,
  output_price_per_million,
  cached_input_price_per_million,
  currency,
  effective_from,
  source_note
)
select
  m.id,
  1.00,
  5.00,
  null,
  'USD',
  '2026-08-26T00:00:00Z'::timestamptz,
  'https://platform.claude.com/docs/en/about-claude/pricing — Standard Claude API, verificado em 2026-08-26'
from public.ai_models m
join public.ai_providers p on p.id = m.provider_id
where p.key = 'anthropic_claude'
  and m.model_key = 'claude-haiku-4-5-20251001'
  and not exists (
    select 1 from public.ai_price_versions v
    where v.ai_model_id = m.id and v.effective_to is null
  );
