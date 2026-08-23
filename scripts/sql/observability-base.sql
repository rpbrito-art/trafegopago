-- Observabilidade operacional base — Rodada 002C §8.
--
-- Somente leitura, somente agregados. Nenhuma coluna de payload, e-mail, token,
-- metadata de evento ou conteúdo de mensagem aparece aqui, por desenho: quem
-- precisa acompanhar a saúde da fila não precisa ver o que trafega nela
-- (SECURITY_MODEL §§13 e 15).
--
-- Não é dashboard, view pública, tabela de métricas nem telemetria externa.
-- É um arquivo que se roda no SQL Editor do projeto quando se quer saber o
-- estado operacional agora.

-- ---------------------------------------------------------------------------
-- 1. Operações por status.
-- ---------------------------------------------------------------------------
select
  status,
  count(*) as total,
  min(created_at) as mais_antiga,
  max(updated_at) as ultima_movimentacao,
  max(attempt_count) as maior_numero_de_tentativas
from public.operations
group by status
order by status;
-- Leitura: `PENDING` crescendo sem `SUCCEEDED` correspondente indica consumidor
-- parado. `CLAIMED` antigo indica worker que morreu no meio.

-- ---------------------------------------------------------------------------
-- 2. Fila `integration_jobs`: ativas e arquivadas.
--
-- Só contagens e tempos. A coluna `message` existe nas duas tabelas e é
-- deliberadamente ignorada.
-- ---------------------------------------------------------------------------
select
  'ativas' as particao,
  count(*) as total,
  min(enqueued_at) as mais_antiga,
  max(read_ct) as maior_numero_de_entregas
from pgmq.q_integration_jobs
union all
select
  'arquivadas' as particao,
  count(*) as total,
  min(enqueued_at) as mais_antiga,
  max(read_ct) as maior_numero_de_entregas
from pgmq.a_integration_jobs;
-- Leitura: `maior_numero_de_entregas` perto do teto do worker sinaliza
-- mensagem prestes a virar poison. Arquivadas crescendo indica entrada
-- inválida ou tipo não suportado sendo produzido em algum lugar.

-- ---------------------------------------------------------------------------
-- 3. Webhook inbox por status de processamento.
-- ---------------------------------------------------------------------------
select
  provider,
  processing_status,
  count(*) as total,
  min(received_at) as mais_antigo,
  max(received_at) as mais_recente,
  count(*) filter (where processed_at is not null) as ja_processados
from public.webhook_events
group by provider, processing_status
order by provider, processing_status;
-- Leitura: `RECEIVED` acumulando significa que nada consome a inbox ainda —
-- o esperado nesta fase, já que o processador é de rodada posterior.

-- ---------------------------------------------------------------------------
-- 4. Trilha de auditoria por tipo — sem `metadata_json`.
-- ---------------------------------------------------------------------------
select
  event_type,
  actor_type,
  count(*) as total,
  max(created_at) as mais_recente
from public.audit_events
group by event_type, actor_type
order by total desc, event_type;

-- ---------------------------------------------------------------------------
-- 5. Panorama de uma linha.
-- ---------------------------------------------------------------------------
select
  (select count(*) from public.operations) as operations,
  (select count(*) from public.operations where status = 'PENDING') as operations_pendentes,
  (select count(*) from public.operations where status = 'FAILED') as operations_falhas,
  (select count(*) from pgmq.q_integration_jobs) as fila_ativa,
  (select count(*) from pgmq.a_integration_jobs) as fila_arquivada,
  (select count(*) from public.webhook_events) as webhook_events,
  (select count(*) from public.webhook_events where processing_status = 'RECEIVED') as webhook_nao_processados,
  (select count(*) from public.audit_events) as audit_events;
