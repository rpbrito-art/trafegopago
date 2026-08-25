# DATA MODEL — Quoron MVP

Status: modelo conceitual canônico. O SQL final será produzido em rodada específica e deve respeitar estes contratos.

## 1. Princípios

- UUIDs internos como identificadores primários, salvo justificativa.
- `organization_id` obrigatório em entidades de negócio tenant-scoped.
- external IDs nunca substituem IDs internos.
- timestamps em UTC; apresentação converte para timezone da organização/usuário.
- valores monetários em unidade menor inteira quando adequado (`amount_minor`) + `currency` ISO 4217.
- estados por enum/check controlado ou lookup explícito, não texto livre.
- payload externo bruto em JSONB apenas quando necessário para auditoria/reprocessamento; não usar JSONB para fugir de modelagem relacional.
- PII minimizada e acesso restrito.

## 2. Identidade e tenancy

### organizations

- id
- name
- slug opcional
- status
- timezone
- default_currency
- created_at
- updated_at

### organization_members

- organization_id
- user_id (`auth.users`)
- role (`owner|admin|member` inicialmente)
- status
- created_at

Constraint única `(organization_id, user_id)`.

### business_profiles

- organization_id
- segment
- location_summary
- primary_offer
- average_ticket_minor
- currency
- target_audience
- differentiators
- known_objections
- acquisition_goal
- commercial_goal_json estruturado
- created_at/updated_at

## 3. Integração Meta

### meta_connections

Representa autorização/conexão de uma organização.

- id
- organization_id
- external_business/account identifiers necessários
- status
- granted_scopes
- token_secret_reference ou mecanismo seguro equivalente
- token_expires_at quando aplicável
- api_version_last_verified
- last_health_check_at
- action_required_reason
- connected_by
- connected_at
- disconnected_at

Nunca guardar senha.

### instagram_accounts

- id
- organization_id
- meta_connection_id
- external_instagram_account_id
- username/display metadata permitido
- account_type
- status
- last_synced_at

Unique apropriado por conexão/external id.

### ad_accounts

- id
- organization_id
- meta_connection_id
- external_ad_account_id
- name
- currency
- timezone
- status
- last_synced_at

## 4. Conteúdo

### content_items

- id
- organization_id
- instagram_account_id
- external_media_id nullable para rascunho ainda não publicado
- content_type
- caption
- permalink nullable
- published_at nullable
- lifecycle_status
- storage/media references
- source (`IMPORTED|CREATED_IN_APP`)
- raw_metadata_json nullable
- created_at/updated_at

Unique `(instagram_account_id, external_media_id)` quando external id não nulo.

### content_features

Atributos derivados versionados.

- id
- organization_id
- content_item_id
- feature_version
- theme
- hook
- cta
- offer
- tone
- audience_hint
- promise
- structured_features_json
- ai_run_id nullable
- created_at

Não sobrescrever silenciosamente análise antiga se versão mudar.

### content_metric_snapshots

- id
- organization_id
- content_item_id
- metric_key canônica
- value_numeric
- measured_at
- source_api_version
- raw_metric_name
- raw_payload_json opcional/restrito

Index `(content_item_id, metric_key, measured_at)`.

## 5. Recomendações

### recommendations

- id
- organization_id
- type
- status
- title/summary
- hypothesis
- confidence nullable
- evidence_json com refs internas, não apenas texto
- limitations_json
- target_refs_json ou relações específicas conforme implementação
- rule_version
- prompt_version nullable
- ai_run_id nullable
- created_at
- expires_at nullable
- accepted_at/rejected_at/executed_at nullable

## 6. Aprovações financeiras

### approvals

- id
- organization_id
- approval_type
- target_type
- target_id
- status (`PENDING|APPROVED|REJECTED|REVOKED|EXPIRED|CONSUMED` conforme contrato final)
- requested_amount_minor
- approved_amount_minor nullable
- currency
- approval_scope_json snapshot imutável
- requested_by
- decided_by nullable
- requested_at
- decided_at nullable
- expires_at nullable

Uma aprovação não deve ser reutilizável além de seu escopo.

## 7. Experimentos e publicidade

### experiments

- id
- organization_id
- recommendation_id nullable
- name
- hypothesis
- variable_under_test
- objective
- status
- budget_minor
- currency
- start_at/end_at nullable
- evaluation_policy_version
- external_experiment_id nullable
- meta_api_version_created nullable
- created_by
- created_at/updated_at

### experiment_variants

- id
- organization_id
- experiment_id
- content_item_id nullable
- label
- external_creative_id nullable
- external_ad_id nullable
- metadata_json

### campaigns

- id
- organization_id
- ad_account_id
- experiment_id nullable
- external_campaign_id
- name
- objective
- status_local
- status_external
- budget fields quando aplicável
- currency
- created_by_operation_id nullable
- last_synced_at
- raw_metadata_json opcional

### ad_sets

- id
- organization_id
- campaign_id
- external_ad_set_id
- status_local/status_external
- targeting_summary_json
- placement_summary_json
- optimization_goal
- budget fields quando aplicável
- last_synced_at

### ads

- id
- organization_id
- ad_set_id
- experiment_variant_id nullable
- content_item_id nullable
- external_ad_id
- external_creative_id nullable
- status_local/status_external
- last_synced_at

### ad_metric_snapshots

- id
- organization_id
- entity_type (`CAMPAIGN|AD_SET|AD|EXPERIMENT_VARIANT`)
- entity_id
- metric_key canônica
- value_numeric
- currency nullable
- window_start/window_end
- measured_at
- attribution_context_json quando necessário
- source_api_version
- raw_metric_name/raw_payload restritos

## 8. Winner Engine

### experiment_results

- id
- organization_id
- experiment_id
- result_status (`NOT_ENOUGH_DATA|NO_CLEAR_WINNER|WINNER`)
- winning_variant_id nullable
- evaluation_policy_version
- metrics_snapshot_json/referências
- official_platform_result_json nullable
- limitations_json
- calculated_at

Interpretação narrativa pode referenciar `recommendations/insights`, não substituir este registro.

## 9. Leads

### leads

- id
- organization_id
- external_lead_id nullable
- source_type
- campaign_id/ad_id/content_item_id/experiment_id nullable conforme linhagem disponível
- full_name nullable
- email nullable
- phone nullable
- status (`NEW|CONTACTED|QUALIFIED|OPPORTUNITY|WON|LOST`)
- score nullable
- owner_user_id nullable
- loss_reason_code nullable
- created_at
- updated_at
- won_at/lost_at nullable

PII deve ter acesso tenant-scoped e políticas de retenção.

### lead_events

Append-oriented.

- id
- organization_id
- lead_id
- event_type
- from_status nullable
- to_status nullable
- actor_type (`USER|SYSTEM|META|AI`)
- actor_user_id nullable
- metadata_json
- created_at

### conversions

- id
- organization_id
- lead_id
- conversion_type
- amount_minor nullable
- currency nullable
- occurred_at
- attribution_source (`INTERNAL|META|USER_CONFIRMED|OTHER` etc.)
- external_sync_status
- external_event_id nullable
- created_at

Não fundir atribuição interna e atribuição da Meta em um único booleano.

## 10. Pesquisas

### surveys

Template/configuração.

- id
- organization_id nullable se global template
- survey_type (`WON|LOST` inicialmente)
- version
- status
- definition_json validado
- created_at

### survey_requests

- id
- organization_id
- survey_id
- lead_id
- public_token_hash
- status
- channel
- sent_at nullable
- answered_at nullable
- expires_at nullable
- created_at

Não armazenar token público em texto puro se hash for suficiente para validação.

### survey_responses

- id
- organization_id
- survey_request_id
- structured_answers_json
- free_text nullable
- submitted_at

### survey_response_classifications

- id
- organization_id
- survey_response_id
- taxonomy_version
- categories_json
- sentiment/other derived fields quando úteis
- ai_run_id
- created_at

Resposta original nunca é sobrescrita pela classificação.

## 11. Insights

### insights

- id
- organization_id
- insight_type
- status
- observation
- interpretation
- hypothesis
- recommended_test
- confidence nullable
- evidence_refs_json
- limitations_json
- ai_run_id nullable
- created_at
- supersedes_insight_id nullable

## 12. IA

### ai_providers

- id
- key
- name
- status
- config metadata sem segredos

### ai_models

- id
- provider_id
- model_key externo
- capability_tags
- status
- context/input/output metadata relevante
- effective_from/effective_to nullable

### ai_price_versions

- id
- ai_model_id
- input_price_basis
- output_price_basis
- cached_input_price_basis nullable
- currency
- unit_definition
- effective_from
- effective_to nullable
- source_note

### ai_runs

- id
- organization_id nullable para tarefas globais
- task_type
- task_version
- provider_id
- ai_model_id
- tier
- input_tokens
- output_tokens
- cached_tokens nullable
- estimated_cost_minor/precisão apropriada
- currency
- latency_ms
- status
- confidence nullable
- fallback_from_run_id nullable
- prompt/schema version
- error_class nullable
- created_at

Não persistir prompt com PII sem necessidade. Se for necessário para auditoria, aplicar política específica.

## 13. Operações assíncronas

### operations

Representa intenção mutável/idempotente.

- id
- organization_id
- operation_type
- idempotency_key
- target_type/target_id
- status (`PENDING|CLAIMED|SUCCEEDED|FAILED|ACTION_REQUIRED|UNKNOWN` etc.)
- approval_id nullable
- external_resource_id nullable
- attempt_count
- last_error_class/summary
- correlation_id
- created_at/updated_at/completed_at

Unique por escopo da `idempotency_key`.

### integration_jobs

Se necessário além da infraestrutura de queue para observabilidade persistente:

- id
- organization_id
- job_type
- operation_id nullable
- status
- attempt_count
- scheduled_at
- started_at/completed_at
- last_error
- correlation_id

### webhook_events

- id
- organization_id nullable até resolução do tenant
- provider
- external_event_id nullable
- dedupe_hash
- event_type
- payload_json
- processing_status
- received_at
- processed_at nullable
- error_summary nullable

Unique em chave de dedupe adequada.

## 14. Auditoria

### audit_events

Append-oriented.

- id
- organization_id
- event_type
- actor_type
- actor_user_id nullable
- subject_type/subject_id
- metadata_json minimizado
- correlation_id nullable
- created_at

Nunca armazenar token/segredo em metadata.

## 15. Notificações

### notifications

- id
- organization_id
- user_id nullable conforme audiência
- type
- priority
- subject_type/subject_id
- title/body estruturável
- read_at nullable
- created_at

### notification_deliveries

Opcional quando e-mail/outros canais entrarem:

- notification_id
- channel
- status
- provider_message_id
- sent_at/error

## 16. Constraints essenciais

O SQL final deve garantir, onde aplicável:

- FKs compostas/checagens que evitem relações cross-tenant;
- unique external IDs dentro do contexto correto;
- valores monetários não negativos quando domínio exigir;
- `WON` e `LOST` coerentes com timestamps;
- aprovação consumida não reutilizada indevidamente;
- operation idempotency única;
- webhook dedupe único;
- estado válido por tabela.

## 17. RLS

Cada tabela tenant-scoped deve ter políticas baseadas em membership. Tabelas internas de operações/segredos podem não ser expostas pela Data API ou ter acesso apenas server-side.

Provas de RLS devem incluir no mínimo:

- membro lê org própria;
- membro não lê org alheia;
- membro não escreve org alheia;
- não membro não acessa tenant;
- role restrictions quando implementadas;
- service/server path ainda filtra organization no domínio.

## 18. Evolução

Este modelo é conceitual. Antes da primeira migration, a rodada de schema deve produzir:

1. ERD/relacionamentos finais;
2. migrations;
3. índices;
4. RLS;
5. fixtures de duas organizações;
6. testes de tenancy;
7. prova de rollback/reaplicação conforme processo adotado.
