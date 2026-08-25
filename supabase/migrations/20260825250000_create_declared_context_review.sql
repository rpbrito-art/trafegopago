-- Rodada 004E — Declared Context Review + First Real AI
-- Mandato: rodadas/gpt/RODADA_004E_DECLARED_CONTEXT_REVIEW_FIRST_REAL_AI.md
--
-- Dois deltas, ambos aditivos:
--
--   1. o primeiro provider/modelo/preço **reais** entram no catálogo da 004A;
--   2. `declared_context_reviews` guarda o artefato auditável de cada revisão.
--
-- Nenhuma migration aplicada é reescrita.
--
-- O catálogo é povoado por migration, e não pelo caminho de execução, pela
-- mesma razão da 004A: um Router capaz de criar preço poderia inventar o custo
-- da própria chamada.

-- ---------------------------------------------------------------------------
-- 1. Provider real — Google Gemini Developer API
-- ---------------------------------------------------------------------------

-- `config_metadata` guarda **apenas** configuração não secreta. A chave da API
-- vive em variável de ambiente server-only e não tem representação aqui
-- (`SECURITY_MODEL.md` §15.1).
--
-- `on conflict` pela chave estável: reaplicar a migration num ambiente que já
-- a tenha não pode duplicar provider nem alterar o que já foi auditado.
insert into public.ai_providers (key, name, status, config_metadata)
values (
  'google_gemini',
  'Google Gemini',
  'ACTIVE',
  jsonb_build_object(
    'api', 'gemini_developer_api',
    'billing_tier', 'paid',
    'sdk', '@google/genai',
    -- O nível gratuito informa usar conteúdo para melhorar produtos; o pago,
    -- não. Por isso o produto só opera no pago com dado real de cliente
    -- (mandato §2).
    'free_tier_authorized', false
  )
)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- 2. Modelo real — gemini-2.5-flash-lite
-- ---------------------------------------------------------------------------

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
  'gemini-2.5-flash-lite',
  1,
  -- Capacidades, não marca: é por estas tags que o Router escolhe, e é isso
  -- que permite trocar o modelo desta capacidade sem tocar em feature alguma
  -- (`AI_ARCHITECTURE.md` §§5 e 20).
  array['STRUCTURED_EXTRACTION', 'JSON_SCHEMA_NATIVE', 'LOW_COST', 'FAST']::text[],
  'ACTIVE',
  true,
  1048576,
  65536,
  jsonb_build_object(
    'verified_at', '2026-08-25',
    'docs', 'https://ai.google.dev/gemini-api/docs/models',
    'thinking', 'desabilitado nesta task'
  )
from public.ai_providers p
where p.key = 'google_gemini'
on conflict (provider_id, model_key) do nothing;

-- ---------------------------------------------------------------------------
-- 3. Preço vigente — Standard Paid, por 1M tokens
-- ---------------------------------------------------------------------------

-- Preço na moeda em que o provider publica. Converter para BRL aqui
-- transformaria uma cotação do dia em fato histórico do catálogo.
--
-- O índice único parcial da 004A já garante no máximo uma versão aberta por
-- modelo; o `not exists` evita a violação em reaplicação.
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
  0.10,
  0.40,
  0.01,
  'USD',
  '2026-08-25T00:00:00Z'::timestamptz,
  'https://ai.google.dev/gemini-api/docs/pricing — Standard Paid, verificado em 2026-08-25'
from public.ai_models m
join public.ai_providers p on p.id = m.provider_id
where p.key = 'google_gemini'
  and m.model_key = 'gemini-2.5-flash-lite'
  and not exists (
    select 1 from public.ai_price_versions v
    where v.ai_model_id = m.id and v.effective_to is null
  );

-- ---------------------------------------------------------------------------
-- 4. public.declared_context_reviews
-- ---------------------------------------------------------------------------

-- O artefato da revisão, e não só o run.
--
-- `ai_runs` responde "quanto custou e o que aconteceu"; esta tabela responde
-- "o que foi revisado, a partir de quais fatos, e o que o sistema respondeu".
-- Sem ela, reexibir a revisão exigiria chamar o provider de novo a cada
-- visualização — que é exatamente o desperdício que `AI_ARCHITECTURE.md` §15
-- manda evitar.
create table public.declared_context_reviews (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id) on delete cascade,

  -- Hash determinístico do snapshot canônico + versões de task/prompt/schema.
  -- É a chave do cache: mesmo contexto e mesmas versões não chamam o provider
  -- outra vez.
  input_fingerprint text not null,

  task_type text not null,
  task_version text not null,
  prompt_version text not null,
  schema_version text not null,

  -- O run que produziu esta revisão. A FK composta com `organization_id`
  -- impede que a revisão de um tenant aponte para o run de outro.
  ai_run_id uuid not null,

  -- JSONB aqui é artefato versionado de IA, não fuga de modelagem: o formato
  -- pertence à versão do schema da task e muda junto com ela.
  input_snapshot_json jsonb not null,
  review_json jsonb not null,

  created_at timestamptz not null default now(),

  -- Ordem das colunas igual à do índice `ai_runs_id_organization_uniq` da
  -- 004A, para a FK apoiar-se nele sem depender de o planejador aceitar uma
  -- permutação.
  constraint declared_context_reviews_run_same_tenant
    foreign key (ai_run_id, organization_id)
    references public.ai_runs (id, organization_id)
    on delete cascade,

  constraint declared_context_reviews_fingerprint_not_blank
    check (btrim(input_fingerprint) <> ''),
  constraint declared_context_reviews_fingerprint_max_length
    check (char_length(input_fingerprint) <= 128),

  constraint declared_context_reviews_task_type_not_blank
    check (btrim(task_type) <> ''),
  constraint declared_context_reviews_versions_not_blank
    check (btrim(task_version) <> ''
       and btrim(prompt_version) <> ''
       and btrim(schema_version) <> ''),

  -- Objeto, não array nem escalar: o consumidor lê campos nomeados.
  constraint declared_context_reviews_snapshot_is_object
    check (jsonb_typeof(input_snapshot_json) = 'object'),
  constraint declared_context_reviews_review_is_object
    check (jsonb_typeof(review_json) = 'object'),

  -- Teto de tamanho: o snapshot é mínimo por contrato, e a revisão tem
  -- cardinalidades limitadas. Sem teto, um bug de montagem viraria linha
  -- gigante persistida.
  constraint declared_context_reviews_snapshot_max_length
    check (char_length(input_snapshot_json::text) <= 60000),
  constraint declared_context_reviews_review_max_length
    check (char_length(review_json::text) <= 40000)
);

comment on table public.declared_context_reviews is
  'Revisao do contexto declarado. Artefato versionado e imutavel; cache por input_fingerprint.';

comment on column public.declared_context_reviews.input_fingerprint is
  'Hash do snapshot canonico + versoes. Mesmo valor reutiliza a revisao em vez de chamar o provider.';

-- Cache por organização: a busca é sempre `(organization_id, fingerprint)`, e
-- nunca só pelo fingerprint — reutilizar entre tenants vazaria contexto de um
-- negócio para outro (`AI_ARCHITECTURE.md` §15).
create unique index declared_context_reviews_org_fingerprint_uniq
  on public.declared_context_reviews (organization_id, input_fingerprint, task_version, prompt_version, schema_version);

-- Revisão mais recente do tenant.
create index declared_context_reviews_org_created_at_idx
  on public.declared_context_reviews (organization_id, created_at desc);

-- Cobertura da FK composta para `ai_runs`.
create index declared_context_reviews_org_run_idx
  on public.declared_context_reviews (organization_id, ai_run_id);

alter table public.declared_context_reviews enable row level security;

-- ---------------------------------------------------------------------------
-- 5. Grants e RLS
-- ---------------------------------------------------------------------------

revoke all on table public.declared_context_reviews from anon, authenticated;

-- Browser: somente leitura da própria organização. A escrita acontece
-- server-side, depois de o run ter sucedido e o grounding ter sido validado.
grant select on table public.declared_context_reviews to authenticated;

-- Sem UPDATE nem DELETE: uma revisão é um registro do que o sistema respondeu
-- num instante, com as versões daquele instante. Reescrevê-la apagaria a
-- evidência de que a resposta anterior existiu.
grant select, insert on table public.declared_context_reviews to service_role;

create policy declared_context_reviews_select_by_active_membership
  on public.declared_context_reviews
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
-- 6. Imutabilidade do artefato
-- ---------------------------------------------------------------------------

-- Mesma disciplina das correções 004C-01 e 004D-01: privilégio ausente não
-- alcança o dono do banco, então a invariante também vive numa guarda.
--
-- Aqui não existe transição legítima alguma — a revisão nasce pronta —, então
-- a trigger recusa **todo** UPDATE.
create function public.enforce_declared_context_review_immutability()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'revisao de contexto e imutavel; gere uma nova revisao'
    using errcode = '55000';
end;
$$;

comment on function public.enforce_declared_context_review_immutability() is
  'Recusa qualquer UPDATE em declared_context_reviews. O artefato nasce pronto.';

revoke all on function public.enforce_declared_context_review_immutability()
  from public, anon, authenticated;

create trigger declared_context_reviews_immutable
  before update on public.declared_context_reviews
  for each row
  execute function public.enforce_declared_context_review_immutability();

comment on trigger declared_context_reviews_immutable
  on public.declared_context_reviews is
  'Imutabilidade do artefato de revisao (Rodada 004E). Falha fechado inclusive em chamada privilegiada.';
