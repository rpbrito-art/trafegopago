-- Rodada 002A — Operations + Audit Foundation
-- Mandato: rodadas/gpt/RODADA_002A_OPERATIONS_AUDIT_FOUNDATION.md
--
-- Primeira rodada da Fase 2. Cria a fundação interna que as integrações
-- futuras vão reutilizar, sem implementar nenhuma delas:
--
--   `operations`    — memória de uma intenção técnica que não pode ser
--                     executada duas vezes por acidente (TECHNICAL_SPEC §22).
--   `audit_events`  — histórico append-oriented de ações sensíveis, onde
--                     correção gera novo evento em vez de reescrever o
--                     anterior (TECHNICAL_SPEC §28, SECURITY_MODEL §20).
--
-- Diferença essencial em relação às tabelas das rodadas 001C–001E: estas duas
-- são **infraestrutura interna server-side**. O browser não as alcança de
-- forma alguma — nem leitura. Por isso não existe policy de `authenticated`
-- aqui: não é omissão, é o contrato (mandato §§4.3 e 4.5).
--
-- As duas camadas continuam separadas, como nas rodadas anteriores: grants
-- decidem quem alcança o objeto, RLS decide quais linhas. Com RLS habilitado e
-- zero policies, `anon`/`authenticated` não leem nada mesmo se um grant
-- escapasse no futuro — e sem grant nenhum eles falham antes, em 42501.
--
-- `service_role` é BYPASSRLS neste projeto (verificado antes desta migration:
-- `pg_roles.rolbypassrls = true`). Logo o append-only de `audit_events` NÃO
-- pode se apoiar em RLS: apoia-se na ausência dos grants de UPDATE/DELETE, que
-- valem inclusive para role que ignora RLS.

-- ---------------------------------------------------------------------------
-- 1. public.operations
-- ---------------------------------------------------------------------------

create table public.operations (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id) on delete cascade,

  -- Que intenção é esta. Texto e não enum: os tipos nascem com cada
  -- integração futura, e um enum obrigaria migration a cada adição.
  operation_type text not null,

  -- Chave da intenção lógica, fornecida por quem cria a operação
  -- (TECHNICAL_SPEC §22.2). Não é o id da linha: dois pedidos idênticos do
  -- mesmo tenant precisam colidir de propósito.
  idempotency_key text not null,

  target_type text,
  target_id uuid,

  -- Estados fechados por CHECK. `UNKNOWN` existe porque uma chamada externa
  -- pode terminar sem resposta conclusiva — e fingir que isso é `FAILED`
  -- autorizaria um retry que talvez duplique o efeito remoto.
  status text not null default 'PENDING',

  -- Identificador opaco devolvido pelo provider. Nunca interpretado aqui.
  external_resource_id text,

  attempt_count integer not null default 0,

  -- Taxonomia interna fechada (API_CONTRACTS §12). O código externo cru não
  -- entra: features não devem depender de código de provider espalhado.
  last_error_class text,

  -- Resumo curto para diagnóstico. Segredo e PII não entram aqui
  -- (SECURITY_MODEL §15).
  last_error_summary text,

  -- Liga registros técnicos da mesma execução (TECHNICAL_SPEC §27). `not null`
  -- com default: uma operação sem correlação seria um buraco na trilha.
  correlation_id uuid not null default gen_random_uuid(),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,

  constraint operations_operation_type_not_blank
    check (btrim(operation_type) <> ''),
  constraint operations_operation_type_max_length
    check (char_length(operation_type) <= 120),

  constraint operations_idempotency_key_not_blank
    check (btrim(idempotency_key) <> ''),
  constraint operations_idempotency_key_max_length
    check (char_length(idempotency_key) <= 200),

  constraint operations_target_type_not_blank
    check (target_type is null or btrim(target_type) <> ''),
  constraint operations_target_type_max_length
    check (target_type is null or char_length(target_type) <= 120),

  constraint operations_external_resource_id_not_blank
    check (external_resource_id is null or btrim(external_resource_id) <> ''),
  constraint operations_external_resource_id_max_length
    check (external_resource_id is null or char_length(external_resource_id) <= 255),

  constraint operations_status_valid
    check (status in (
      'PENDING',
      'CLAIMED',
      'SUCCEEDED',
      'FAILED',
      'ACTION_REQUIRED',
      'UNKNOWN'
    )),

  constraint operations_attempt_count_non_negative
    check (attempt_count >= 0),

  constraint operations_last_error_class_valid
    check (last_error_class is null or last_error_class in (
      'AUTH_REQUIRED',
      'PERMISSION_DENIED',
      'RATE_LIMITED',
      'VALIDATION_FAILED',
      'NOT_FOUND',
      'CONFLICT',
      'TRANSIENT_UPSTREAM',
      'UPSTREAM_UNAVAILABLE',
      'UNKNOWN_UPSTREAM'
    )),

  constraint operations_last_error_summary_not_blank
    check (last_error_summary is null or btrim(last_error_summary) <> ''),
  constraint operations_last_error_summary_max_length
    check (last_error_summary is null or char_length(last_error_summary) <= 2000)

  -- NÃO existe CHECK de coerência entre `updated_at`/`completed_at` e
  -- `created_at`, e a ausência é deliberada.
  --
  -- `created_at` nasce de `now()` no servidor; `updated_at` e `completed_at`
  -- são escritos por quem chama, de outra máquina, com outro relógio. Um
  -- `check (updated_at >= created_at)` compara duas fontes de tempo distintas
  -- e transforma skew de NTP em erro de escrita — medido neste projeto: o
  -- relógio do Supabase estava ~0,6 s à frente do cliente, o bastante para
  -- quebrar o caminho mais comum do worker, que cria `PENDING` e marca
  -- `CLAIMED` logo em seguida.
  --
  -- Coerência temporal aqui só seria correta com `now()` do próprio banco, via
  -- trigger. O projeto não usa triggers e o mandato 002A não os autoriza;
  -- quando um worker existir, essa decisão volta com ele.
  --
  -- Também não há CHECK amarrando `completed_at` a status terminal: a máquina
  -- de estados pertence ao worker, e um CHECK adivinhando transições
  -- bloquearia caminhos ainda não desenhados.
);

comment on table public.operations is
  'Intencao tecnica idempotente. Infraestrutura interna server-only; sem acesso do browser.';

comment on column public.operations.idempotency_key is
  'Chave da intencao logica. Unica por (organization_id, operation_type).';

comment on column public.operations.status is
  'UNKNOWN indica desfecho inconclusivo: nao autoriza retry sem reconciliacao.';

-- Idempotência mínima obrigatória (mandato §4.2). É esta constraint — e não o
-- código da aplicação — que impede a segunda operação, inclusive sob criação
-- concorrente: o segundo INSERT falha com 23505 no próprio banco.
create unique index operations_org_type_idempotency_key_uniq
  on public.operations (organization_id, operation_type, idempotency_key);

-- Fila de trabalho por tenant: "o que está pendente nesta organização".
create index operations_org_status_created_at_idx
  on public.operations (organization_id, status, created_at desc);

-- Trilha de execução: reunir tudo que pertence à mesma correlação.
create index operations_correlation_id_idx
  on public.operations (correlation_id);

alter table public.operations enable row level security;

-- ---------------------------------------------------------------------------
-- 2. Grants de operations
-- ---------------------------------------------------------------------------

-- Browser não alcança esta tabela de nenhuma forma. Declarativo e idempotente:
-- os default privileges endurecidos da 001D já nascem sem estes grants, mas a
-- intenção fica escrita na própria migration em vez de depender de um default.
revoke all on table public.operations from anon, authenticated;

-- Privilégio mínimo do caminho interno atual (mandato §4.3): criar, ler e
-- atualizar. DELETE fica de fora — uma operação registrada é evidência do que
-- foi tentado, e apagá-la destruiria a proteção contra repetição. Remoção de
-- tenant continua funcionando pelo CASCADE da FK.
grant select, insert, update on table public.operations to service_role;

-- Nenhuma policy. Com RLS habilitado e zero policies, qualquer role sem
-- BYPASSRLS lê zero linhas — a segunda tranca, atrás dos grants.

-- ---------------------------------------------------------------------------
-- 3. public.audit_events
-- ---------------------------------------------------------------------------

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id) on delete cascade,

  event_type text not null,

  -- Quem agiu. `AI` é categoria própria de propósito: ação sugerida ou
  -- executada por modelo não pode se confundir com ação humana na trilha.
  actor_type text not null,

  -- `on delete set null` e não `cascade`: o usuário some, o evento fica. Um
  -- histórico de auditoria que se apaga junto com o autor não é auditoria.
  actor_user_id uuid references auth.users(id) on delete set null,

  subject_type text not null,
  subject_id uuid,

  -- Contexto estruturado e minimizado. Nunca token, segredo ou PII
  -- desnecessária (DATA_MODEL §14, SECURITY_MODEL §15 e §20).
  metadata_json jsonb not null default '{}'::jsonb,

  -- Nullable, diferente de `operations`: nem todo evento de negócio nasce
  -- dentro de uma execução técnica correlacionada.
  correlation_id uuid,

  created_at timestamptz not null default now(),

  constraint audit_events_event_type_not_blank
    check (btrim(event_type) <> ''),
  constraint audit_events_event_type_max_length
    check (char_length(event_type) <= 120),

  constraint audit_events_actor_type_valid
    check (actor_type in ('USER', 'SYSTEM', 'PROVIDER', 'AI')),

  constraint audit_events_subject_type_not_blank
    check (btrim(subject_type) <> ''),
  constraint audit_events_subject_type_max_length
    check (char_length(subject_type) <= 120),

  -- Objeto JSON, não array/escalar/string: o campo não pode virar texto livre.
  constraint audit_events_metadata_json_is_object
    check (jsonb_typeof(metadata_json) = 'object'),
  constraint audit_events_metadata_json_max_length
    check (char_length(metadata_json::text) <= 8000)
);

comment on table public.audit_events is
  'Historico append-oriented de acoes sensiveis. Correcao gera novo evento; o caminho normal nao reescreve o passado.';

comment on column public.audit_events.metadata_json is
  'Contexto minimizado. Nunca token, segredo ou PII desnecessaria.';

-- Leitura natural da trilha: eventos de um tenant, do mais recente ao mais
-- antigo.
create index audit_events_org_created_at_idx
  on public.audit_events (organization_id, created_at desc);

-- Parcial: a maioria dos eventos de negócio não terá correlação, e indexar
-- NULL só engordaria o índice sem servir a nenhuma consulta.
create index audit_events_correlation_id_idx
  on public.audit_events (correlation_id)
  where correlation_id is not null;

alter table public.audit_events enable row level security;

-- ---------------------------------------------------------------------------
-- 4. Grants de audit_events — o append-only mora aqui
-- ---------------------------------------------------------------------------

revoke all on table public.audit_events from anon, authenticated;

-- INSERT e SELECT, nada mais (mandato §4.5). A ausência de UPDATE/DELETE é o
-- mecanismo: `service_role` ignora RLS, mas não ignora grant. Tentar corrigir
-- um evento pelo caminho da aplicação falha em 42501 — que é exatamente o
-- comportamento desejado, porque a correção deve nascer como evento novo.
--
-- O owner (`postgres`) continua podendo administrar a tabela por migration.
-- Isso é deliberado: append-only aqui é uma propriedade do caminho normal da
-- aplicação, não uma prisão que impeça manutenção legítima (mandato §4.5).
grant select, insert on table public.audit_events to service_role;

-- Nenhuma policy, pelo mesmo motivo de `operations`.
