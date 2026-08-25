-- Rodada 004A — AI Foundation Core
-- Mandato: rodadas/gpt/RODADA_004A_AI_FOUNDATION_CORE.md
--
-- Fundação interna e auditável da camada de IA, sem provider real, sem chave e
-- sem chamada externa. Quatro tabelas:
--
--   `ai_providers`      — quem pode executar, por chave interna estável;
--   `ai_models`         — o que cada provider oferece, com tier/capabilities;
--   `ai_price_versions` — quanto custava, com vigência, para o custo de uma
--                         chamada continuar reproduzível depois que o preço
--                         mudar (AI_ARCHITECTURE §13);
--   `ai_runs`           — o que de fato aconteceu: tokens, custo, latência,
--                         status, versões de prompt/schema (§12).
--
-- Todas são **infraestrutura interna server-only**, como `operations` e
-- `audit_events` da 002A: o browser não as alcança nem para leitura. A ausência
-- de policy para `authenticated` não é omissão, é o contrato (mandato §6.5).
--
-- Duas camadas, como nas rodadas anteriores: grants decidem quem alcança o
-- objeto, RLS decide quais linhas. Com RLS habilitado e zero policies,
-- `anon`/`authenticated` leem zero linhas mesmo se um grant escapasse — e sem
-- grant falham antes, em 42501.
--
-- `service_role` é BYPASSRLS neste projeto. Logo nenhuma invariante de
-- imutabilidade pode se apoiar em RLS: apoia-se na ausência dos grants de
-- UPDATE/DELETE, que valem inclusive para role que ignora RLS.
--
-- Preços e custo em `numeric` com 12 casas decimais. Uma chamada barata custa
-- frações de centavo, e `numeric(20,2)` transformaria toda a operação Tier 1 em
-- zero. A unidade dos preços é **por 1.000.000 de tokens**, que é como os
-- provedores publicam — converter na ingestão seria perder a origem do número.

-- ---------------------------------------------------------------------------
-- 1. public.ai_providers
-- ---------------------------------------------------------------------------

create table public.ai_providers (
  id uuid primary key default gen_random_uuid(),

  -- Chave interna estável. É por ela que o código registra um adapter; o nome
  -- comercial pode mudar sem quebrar o registro.
  key text not null,

  name text not null,

  -- `DEGRADED` existe separado de `DISABLED` porque degradação é sinal de
  -- roteamento — o Router pode preferir outro candidato — enquanto desativado
  -- é ausência de candidato.
  status text not null default 'ACTIVE',

  -- Configuração **não secreta**: região, versão de API, limites publicados.
  -- Chave, token ou credencial não entram aqui em nenhuma hipótese
  -- (SECURITY_MODEL §15.1: segredo de provider não vive em tabela de domínio).
  config_metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint ai_providers_key_not_blank
    check (btrim(key) <> ''),
  constraint ai_providers_key_max_length
    check (char_length(key) <= 120),

  constraint ai_providers_name_not_blank
    check (btrim(name) <> ''),
  constraint ai_providers_name_max_length
    check (char_length(name) <= 200),

  constraint ai_providers_status_valid
    check (status in ('ACTIVE', 'DEGRADED', 'DISABLED')),

  constraint ai_providers_config_metadata_is_object
    check (jsonb_typeof(config_metadata) = 'object'),
  constraint ai_providers_config_metadata_max_length
    check (char_length(config_metadata::text) <= 8000)
);

comment on table public.ai_providers is
  'Provedores de IA. Infraestrutura interna server-only; sem acesso do browser.';

comment on column public.ai_providers.config_metadata is
  'Configuracao nao secreta. Chave/token de provider nunca entram aqui.';

create unique index ai_providers_key_uniq on public.ai_providers (key);

alter table public.ai_providers enable row level security;

revoke all on table public.ai_providers from anon, authenticated;
grant select, insert, update on table public.ai_providers to service_role;

-- ---------------------------------------------------------------------------
-- 2. public.ai_models
-- ---------------------------------------------------------------------------

create table public.ai_models (
  id uuid primary key default gen_random_uuid(),

  provider_id uuid not null
    references public.ai_providers(id) on delete restrict,

  -- Identificador do modelo **no provider**. Opaco para o domínio: nenhuma
  -- feature deve conhecê-lo (AI_ARCHITECTURE §20).
  model_key text not null,

  -- Tier de custo/capacidade. `0` não existe aqui de propósito: Tier 0 é o
  -- caminho determinístico, que por definição não chama provider
  -- (AI_ARCHITECTURE §3).
  tier smallint not null,

  -- Capacidades declaradas — `STRUCTURED_EXTRACTION`, `LONG_CONTEXT`,
  -- `VISION`. Policies selecionam por capacidade, não por marca (§5).
  capability_tags text[] not null default '{}'::text[],

  status text not null default 'ACTIVE',

  supports_structured_output boolean not null default false,

  context_window_tokens bigint,
  max_output_tokens bigint,

  -- Metadata técnica não secreta: janela de rate limit publicada, notas de
  -- versão. Mesma proibição de `ai_providers.config_metadata`.
  model_metadata jsonb not null default '{}'::jsonb,

  -- Vigência do próprio modelo no catálogo, distinta da vigência de preço.
  effective_from timestamptz not null default now(),
  effective_to timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint ai_models_model_key_not_blank
    check (btrim(model_key) <> ''),
  constraint ai_models_model_key_max_length
    check (char_length(model_key) <= 200),

  -- O intervalo aceito é 1..3, não 0..3.
  constraint ai_models_tier_valid
    check (tier between 1 and 3),

  constraint ai_models_status_valid
    check (status in ('ACTIVE', 'DEGRADED', 'DEPRECATED', 'DISABLED')),

  constraint ai_models_context_window_positive
    check (context_window_tokens is null or context_window_tokens > 0),
  constraint ai_models_max_output_positive
    check (max_output_tokens is null or max_output_tokens > 0),

  constraint ai_models_metadata_is_object
    check (jsonb_typeof(model_metadata) = 'object'),
  constraint ai_models_metadata_max_length
    check (char_length(model_metadata::text) <= 8000),

  constraint ai_models_effective_range_valid
    check (effective_to is null or effective_to > effective_from),

  -- Tag vazia tornaria a seleção por capacidade silenciosamente permissiva.
  -- `&&` (overlap) em vez de subconsulta: `CHECK` não aceita subquery.
  constraint ai_models_capability_tags_not_blank
    check (not (capability_tags && array[''::text]))
);

comment on table public.ai_models is
  'Modelos por provider. Tier 1..3: Tier 0 e determinístico e nao chama provider.';

comment on column public.ai_models.model_key is
  'Identificador do modelo no provider. Nenhuma feature deve conhece-lo.';

-- O mesmo `model_key` pode existir em providers diferentes; dentro de um
-- provider ele é a identidade.
create unique index ai_models_provider_model_key_uniq
  on public.ai_models (provider_id, model_key);

-- Consulta do Router: candidatos ativos de um tier.
create index ai_models_status_tier_idx
  on public.ai_models (status, tier);

-- Filtro por capacidade exigida pela task.
create index ai_models_capability_tags_idx
  on public.ai_models using gin (capability_tags);

alter table public.ai_models enable row level security;

revoke all on table public.ai_models from anon, authenticated;
grant select, insert, update on table public.ai_models to service_role;

-- ---------------------------------------------------------------------------
-- 3. public.ai_price_versions
-- ---------------------------------------------------------------------------

create table public.ai_price_versions (
  id uuid primary key default gen_random_uuid(),

  ai_model_id uuid not null
    references public.ai_models(id) on delete restrict,

  -- Por 1.000.000 de tokens, na unidade em que os provedores publicam.
  -- 12 casas decimais: o custo de uma chamada Tier 1 é subcentavo, e truncar
  -- em centavos zeraria a operação inteira.
  input_price_per_million numeric(20, 12) not null,
  output_price_per_million numeric(20, 12) not null,

  -- Nullable de verdade: nem todo provider cobra cached input, e `0` afirmaria
  -- gratuidade onde o correto é "não se aplica".
  cached_input_price_per_million numeric(20, 12),

  currency text not null,

  effective_from timestamptz not null,
  effective_to timestamptz,

  -- De onde veio o número: página de preços, data da consulta. Sem segredo.
  source_note text,

  created_at timestamptz not null default now(),

  constraint ai_price_versions_input_non_negative
    check (input_price_per_million >= 0),
  constraint ai_price_versions_output_non_negative
    check (output_price_per_million >= 0),
  constraint ai_price_versions_cached_non_negative
    check (cached_input_price_per_million is null
           or cached_input_price_per_million >= 0),

  -- ISO 4217: três letras maiúsculas.
  constraint ai_price_versions_currency_valid
    check (currency ~ '^[A-Z]{3}$'),

  constraint ai_price_versions_range_valid
    check (effective_to is null or effective_to > effective_from),

  constraint ai_price_versions_source_note_not_blank
    check (source_note is null or btrim(source_note) <> ''),
  constraint ai_price_versions_source_note_max_length
    check (source_note is null or char_length(source_note) <= 2000)
);

comment on table public.ai_price_versions is
  'Historico de precos por modelo. Preco vigente na execucao mantem o custo reproduzivel depois da mudanca.';

comment on column public.ai_price_versions.input_price_per_million is
  'Preco por 1.000.000 de tokens, como os provedores publicam.';

-- No máximo **uma** versão aberta por modelo. Sem isto, "o preço vigente"
-- seria ambíguo, e o Router teria de escolher entre duas respostas — o que na
-- prática significa inventar o custo de uma chamada.
create unique index ai_price_versions_one_open_per_model
  on public.ai_price_versions (ai_model_id)
  where effective_to is null;

-- Resolução da versão vigente numa data.
create index ai_price_versions_model_effective_from_idx
  on public.ai_price_versions (ai_model_id, effective_from desc);

alter table public.ai_price_versions enable row level security;

revoke all on table public.ai_price_versions from anon, authenticated;

-- INSERT e SELECT, sem UPDATE e sem DELETE. Histórico de preço reescrito
-- destrói a reprodutibilidade do custo já registrado: mudança de preço nasce
-- como versão nova, e o fechamento de uma versão anterior pertence a uma RPC
-- controlada, não ao caminho normal da aplicação (mandato §6.5).
grant select, insert on table public.ai_price_versions to service_role;

-- ---------------------------------------------------------------------------
-- 4. public.ai_runs
-- ---------------------------------------------------------------------------

create table public.ai_runs (
  id uuid primary key default gen_random_uuid(),

  -- Nullable porque existem tarefas legitimamente globais — manutenção de
  -- catálogo, avaliação interna — que não pertencem a nenhum tenant.
  organization_id uuid
    references public.organizations(id) on delete cascade,

  correlation_id uuid not null default gen_random_uuid(),

  task_type text not null,
  task_version text not null,

  -- `restrict`: apagar um provider/modelo destruiria a explicação de custos já
  -- registrados. Catálogo sai de circulação por `status`, não por DELETE.
  provider_id uuid not null
    references public.ai_providers(id) on delete restrict,
  ai_model_id uuid not null
    references public.ai_models(id) on delete restrict,

  -- Versão de preço efetivamente usada no cálculo. É o que torna o custo
  -- auditável: sem ela, refazer a conta depende de adivinhar qual preço valia.
  ai_price_version_id uuid
    references public.ai_price_versions(id) on delete restrict,

  tier smallint not null,

  input_tokens bigint not null default 0,
  output_tokens bigint not null default 0,
  cached_tokens bigint,

  -- Mesma precisão dos preços. Nullable porque um run que falhou antes de
  -- obter usage não tem custo conhecido — e `0` afirmaria gratuidade.
  estimated_cost numeric(24, 12),
  currency text,

  latency_ms integer,

  status text not null default 'STARTED',

  -- Só quando legitimamente disponível. Confiança fabricada é pior que
  -- ausência de confiança (AI_ARCHITECTURE §17).
  confidence numeric(5, 4),

  fallback_from_run_id uuid,

  prompt_version text not null,
  schema_version text not null,

  -- Taxonomia interna fechada. Código cru de provider não sobe para o domínio.
  error_class text,

  started_at timestamptz not null default now(),
  completed_at timestamptz,

  created_at timestamptz not null default now(),

  constraint ai_runs_task_type_not_blank
    check (btrim(task_type) <> ''),
  constraint ai_runs_task_type_max_length
    check (char_length(task_type) <= 120),

  constraint ai_runs_task_version_not_blank
    check (btrim(task_version) <> ''),
  constraint ai_runs_task_version_max_length
    check (char_length(task_version) <= 60),

  constraint ai_runs_prompt_version_not_blank
    check (btrim(prompt_version) <> ''),
  constraint ai_runs_prompt_version_max_length
    check (char_length(prompt_version) <= 60),

  constraint ai_runs_schema_version_not_blank
    check (btrim(schema_version) <> ''),
  constraint ai_runs_schema_version_max_length
    check (char_length(schema_version) <= 60),

  constraint ai_runs_tier_valid
    check (tier between 1 and 3),

  constraint ai_runs_input_tokens_non_negative
    check (input_tokens >= 0),
  constraint ai_runs_output_tokens_non_negative
    check (output_tokens >= 0),
  constraint ai_runs_cached_tokens_non_negative
    check (cached_tokens is null or cached_tokens >= 0),

  constraint ai_runs_estimated_cost_non_negative
    check (estimated_cost is null or estimated_cost >= 0),

  constraint ai_runs_currency_valid
    check (currency is null or currency ~ '^[A-Z]{3}$'),

  -- Custo sem moeda é um número sem significado.
  constraint ai_runs_cost_requires_currency
    check (estimated_cost is null or currency is not null),

  constraint ai_runs_latency_non_negative
    check (latency_ms is null or latency_ms >= 0),

  constraint ai_runs_status_valid
    check (status in ('STARTED', 'SUCCEEDED', 'FAILED')),

  constraint ai_runs_confidence_range
    check (confidence is null or (confidence >= 0 and confidence <= 1)),

  constraint ai_runs_error_class_valid
    check (error_class is null or error_class in (
      'NO_CANDIDATE_MODEL',
      'NO_PRICE_VERSION',
      'AMBIGUOUS_PRICE_VERSION',
      'ADAPTER_NOT_REGISTERED',
      'PROVIDER_UNAVAILABLE',
      'PROVIDER_RATE_LIMITED',
      'PROVIDER_REJECTED',
      'OUTPUT_SCHEMA_INVALID',
      'TIMEOUT',
      'UNKNOWN'
    )),

  -- Um run que falhou precisa dizer por quê; um que teve sucesso não pode
  -- carregar classe de erro.
  constraint ai_runs_failed_requires_error_class
    check (status <> 'FAILED' or error_class is not null),
  constraint ai_runs_succeeded_has_no_error_class
    check (status <> 'SUCCEEDED' or error_class is null),

  -- Fallback só existe dentro de um tenant nesta sub-rodada. Um run global
  -- encadeado a outro não teria como ser barrado pela FK composta abaixo — com
  -- `organization_id` nulo, `MATCH SIMPLE` não checa nada —, e um encadeamento
  -- não verificado é exatamente o que não pode existir (mandato §6.4).
  constraint ai_runs_fallback_requires_organization
    check (fallback_from_run_id is null or organization_id is not null),

  -- Nenhum run é o próprio fallback.
  constraint ai_runs_fallback_not_self
    check (fallback_from_run_id is null or fallback_from_run_id <> id)
);

-- Alvo da FK composta: é este par que permite exigir a mesma organização nos
-- dois lados do vínculo.
create unique index ai_runs_id_organization_uniq
  on public.ai_runs (id, organization_id);

-- Cross-tenant bloqueado pela constraint, não pela aplicação: encadear um run
-- da organização A a um da B falha no próprio banco (SECURITY_MODEL §4).
alter table public.ai_runs
  add constraint ai_runs_fallback_same_organization
  foreign key (fallback_from_run_id, organization_id)
  references public.ai_runs (id, organization_id)
  on delete restrict;

comment on table public.ai_runs is
  'Ledger de execucoes de IA. Nao guarda prompt, input, output nem PII.';

comment on column public.ai_runs.estimated_cost is
  'Custo calculado pela versao de preco registrada em ai_price_version_id.';

comment on column public.ai_runs.fallback_from_run_id is
  'Vinculo de fallback. Restrito ao mesmo tenant por FK composta.';

-- Custo por tenant ao longo do tempo.
create index ai_runs_org_created_at_idx
  on public.ai_runs (organization_id, created_at desc)
  where organization_id is not null;

-- Custo e volume por task.
create index ai_runs_task_created_at_idx
  on public.ai_runs (task_type, created_at desc);

-- Trilha técnica da mesma execução.
create index ai_runs_correlation_id_idx
  on public.ai_runs (correlation_id);

-- Volume por modelo.
create index ai_runs_model_created_at_idx
  on public.ai_runs (ai_model_id, created_at desc);

alter table public.ai_runs enable row level security;

revoke all on table public.ai_runs from anon, authenticated;

-- SELECT, INSERT e UPDATE — o run nasce `STARTED` e é concluído depois. DELETE
-- fica de fora: o ledger é a evidência do que foi gasto, e apagá-lo removeria
-- a base de qualquer conta de custo (mandato §6.5). Remoção de tenant continua
-- funcionando pelo CASCADE da FK.
grant select, insert, update on table public.ai_runs to service_role;

-- Nenhuma policy em nenhuma das quatro tabelas, pelo mesmo motivo da 002A.
