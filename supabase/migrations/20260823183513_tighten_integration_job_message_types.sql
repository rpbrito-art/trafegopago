-- Correção 002B-01 — contrato SQL estrito e equivalente ao TypeScript
-- Mandato: rodadas/gpt/CORRECAO_RODADA_002B_01_CONTRATO_POISON_EDGE_GATE.md §4
-- Auditoria: rodadas/gpt/AUDITORIA_RODADA_002B_QUEUE_WORKER_FOUNDATION.md
--
-- ## O defeito
--
-- A versão anterior de `is_valid_integration_job_message` validava os campos
-- pelo **texto** extraído com `->>`, sem olhar o tipo JSON. `->>` converte
-- qualquer escalar para texto, então:
--
--   {"version": "1"}     -> '1'    passava, mas o parser TS recusa
--   {"jobType": 123}     -> '123'  passava, mas o parser TS recusa
--   {"jobType": true}    -> 'true' passava, mas o parser TS recusa
--
-- Resultado: a fila aceitava envelopes que o consumidor recusaria, e o defeito
-- só apareceria no worker — depois de custar uma entrega e um redelivery.
--
-- ## A correção
--
-- Exigir o tipo JSON antes de olhar o valor, espelhando exatamente o que
-- `src/lib/operations/job-message.ts` faz. `CREATE OR REPLACE` porque a
-- migration `20260823180000` já foi aplicada e não pode ser reescrita
-- (correção §4, estado.md §8).
--
-- Owner, volatilidade, `search_path` e ACL são reafirmados abaixo: `CREATE OR
-- REPLACE` preserva os privilégios existentes, mas deixá-los implícitos faria
-- a garantia depender de um estado que esta migration não declara.

create or replace function public.is_valid_integration_job_message(p_message jsonb)
returns boolean
language sql
immutable
security invoker
set search_path = ''
as $$
  select
    p_message is not null
    and jsonb_typeof(p_message) = 'object'

    -- `version` é número JSON e vale exatamente 1. A forma textual "1" deixa
    -- de passar: versão que chega como string é envelope de outro produtor.
    and jsonb_typeof(p_message -> 'version') = 'number'
    and (p_message -> 'version')::text = '1'

    -- Identificadores são string JSON **e** UUID. O teste de tipo vem antes
    -- porque `->>` sobre um número devolveria texto que casaria com o regex.
    and jsonb_typeof(p_message -> 'organizationId') = 'string'
    and (p_message ->> 'organizationId') ~
      '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'

    and jsonb_typeof(p_message -> 'correlationId') = 'string'
    and (p_message ->> 'correlationId') ~
      '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'

    and jsonb_typeof(p_message -> 'jobType') = 'string'
    and btrim(p_message ->> 'jobType') <> ''
    and char_length(p_message ->> 'jobType') <= 120

    -- `operationId` ausente ou null continua válido; presente precisa ser
    -- string JSON com UUID.
    and (
      p_message -> 'operationId' is null
      or jsonb_typeof(p_message -> 'operationId') = 'null'
      or (
        jsonb_typeof(p_message -> 'operationId') = 'string'
        and (p_message ->> 'operationId') ~
          '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
      )
    )

    and jsonb_typeof(p_message -> 'payload') = 'object'
    and char_length((p_message -> 'payload')::text) <= 4000;
$$;

comment on function public.is_valid_integration_job_message(jsonb) is
  'Valida o envelope de job antes de entrar na fila, exigindo os tipos JSON exatos. Espelha src/lib/operations/job-message.ts.';

-- Reafirmação declarativa da ACL mínima.
revoke all on function public.is_valid_integration_job_message(jsonb)
  from public, anon, authenticated;
grant execute on function public.is_valid_integration_job_message(jsonb)
  to service_role;
