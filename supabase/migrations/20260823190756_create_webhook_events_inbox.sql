-- Rodada 002C — Webhook Inbox + Observabilidade Base
-- Mandato: rodadas/gpt/RODADA_002C_WEBHOOK_INBOX_OBSERVABILIDADE.md
--
-- Cria a caixa de entrada durável onde eventos externos futuros poderão ser
-- persistidos **antes** de qualquer processamento (TECHNICAL_SPEC §23). Não há
-- endpoint, assinatura, challenge ou provider nesta rodada: só a caixa.
--
-- Persistir primeiro e processar depois é o que torna o webhook recuperável:
-- se o processamento falhar, o evento continua ali; se o provider reenviar, o
-- dedupe reconhece.
--
-- `webhook_events` é a tabela mais sensível criada até aqui — o payload vem de
-- fora e pode conter PII (SECURITY_MODEL §13). Por isso ela é server-only, sem
-- policy de browser e sem DELETE no caminho normal.
--
-- Nenhuma função `SECURITY DEFINER` nova (mandato §5.3).

-- ---------------------------------------------------------------------------
-- 1. public.webhook_events
-- ---------------------------------------------------------------------------

create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),

  -- Nullable de propósito: o evento chega antes de o tenant ser resolvido, e
  -- recusá-lo por isso perderia justamente o que precisamos guardar para
  -- investigar (DATA_MODEL §13).
  organization_id uuid references public.organizations(id) on delete cascade,

  provider text not null,

  -- Identificador do provider, quando ele fornece um. Não é a chave de
  -- dedupe: nem todo provider envia, e o hash cobre os dois casos.
  external_event_id text,

  -- SHA-256 em hex do que identifica unicamente a entrega. Quem calcula é
  -- quem recebe — esta rodada não define a semântica de raw body/assinatura
  -- nem cria função de hashing.
  dedupe_hash text not null,

  event_type text not null,

  -- Sem restrição de object/array: o envelope externo é do provider, e impor
  -- forma agora seria adivinhar um contrato que ainda não existe.
  payload_json jsonb not null,

  processing_status text not null default 'RECEIVED',

  received_at timestamptz not null default now(),
  processed_at timestamptz,
  error_summary text,

  constraint webhook_events_provider_not_blank
    check (btrim(provider) <> ''),
  constraint webhook_events_provider_max_length
    check (char_length(provider) <= 80),

  constraint webhook_events_external_event_id_not_blank
    check (external_event_id is null or btrim(external_event_id) <> ''),
  constraint webhook_events_external_event_id_max_length
    check (external_event_id is null or char_length(external_event_id) <= 255),

  -- 64 hex exatos. Um hash truncado ou de outro algoritmo enfraqueceria o
  -- dedupe sem que nada quebrasse visivelmente.
  constraint webhook_events_dedupe_hash_sha256_hex
    check (dedupe_hash ~ '^[0-9a-f]{64}$'),

  constraint webhook_events_event_type_not_blank
    check (btrim(event_type) <> ''),
  constraint webhook_events_event_type_max_length
    check (char_length(event_type) <= 120),

  -- Teto generoso porque payload de provider é grande, mas ainda um teto:
  -- sem ele um envio anômalo entraria sem limite.
  constraint webhook_events_payload_json_max_length
    check (char_length(payload_json::text) <= 262144),

  constraint webhook_events_processing_status_valid
    check (processing_status in (
      'RECEIVED',
      'QUEUED',
      'PROCESSING',
      'PROCESSED',
      'FAILED',
      'IGNORED'
    )),

  constraint webhook_events_error_summary_not_blank
    check (error_summary is null or btrim(error_summary) <> ''),
  constraint webhook_events_error_summary_max_length
    check (error_summary is null or char_length(error_summary) <= 2000)

  -- Sem CHECK amarrando `processed_at`/`error_summary` a status: o processador
  -- ainda não existe, e uma regra adivinhada bloquearia transições legítimas —
  -- a mesma lição da 002A.
);

comment on table public.webhook_events is
  'Inbox durave de eventos externos. Server-only; payload pode conter PII e nao e exposto ao browser.';

comment on column public.webhook_events.organization_id is
  'Nulo ate o tenant ser resolvido: o evento e persistido antes de ser interpretado.';

comment on column public.webhook_events.dedupe_hash is
  'SHA-256 em hex do identificador de entrega. Calculado por quem recebe.';

-- ---------------------------------------------------------------------------
-- 2. Dedupe e índices
-- ---------------------------------------------------------------------------

-- O dedupe real. Reentrega do mesmo provider colide no banco, e não numa
-- checagem de leitura da aplicação que READ COMMITTED não protegeria.
-- Escopado por `provider`: dois providers podem gerar o mesmo hash sem que um
-- silencie o evento do outro.
create unique index webhook_events_provider_dedupe_hash_uniq
  on public.webhook_events (provider, dedupe_hash);

-- Fila de trabalho do processador futuro: "o que ainda não foi processado".
create index webhook_events_status_received_at_idx
  on public.webhook_events (processing_status, received_at);

-- Leitura por tenant, do mais recente ao mais antigo.
create index webhook_events_org_received_at_idx
  on public.webhook_events (organization_id, received_at desc);

alter table public.webhook_events enable row level security;

-- ---------------------------------------------------------------------------
-- 3. Grants
-- ---------------------------------------------------------------------------

-- Browser não alcança esta tabela de forma alguma. É a mais sensível criada
-- até aqui: o conteúdo vem de fora e pode conter PII.
revoke all on table public.webhook_events from anon, authenticated;

-- SELECT/INSERT/UPDATE apenas. Sem DELETE no caminho normal: um evento
-- recebido é evidência do que o provider enviou, e apagá-lo pela aplicação
-- destruiria a trilha de investigação. Remoção de tenant continua funcionando
-- pelo CASCADE da FK.
grant select, insert, update on table public.webhook_events to service_role;

-- Nenhuma policy: com RLS habilitado e zero policies, qualquer role sem
-- BYPASSRLS lê zero linhas. O INFO `rls_enabled_no_policy` que o Advisor
-- emitirá é o desenho sendo reportado, não um defeito — criar uma policy
-- artificial só para silenciá-lo seria o erro.

-- ---------------------------------------------------------------------------
-- 4. Dívida de performance herdada da 002A
-- ---------------------------------------------------------------------------

-- FK sem índice de cobertura: o Performance Advisor aponta isso desde a 002A,
-- e o baseline pré-migration desta rodada confirmou que o INFO continua igual
-- (mandato §5.4). Sem o índice, remover um usuário de `auth.users` faria varredura
-- sequencial em `audit_events` para validar o `on delete set null`.
create index audit_events_actor_user_id_idx
  on public.audit_events (actor_user_id);
