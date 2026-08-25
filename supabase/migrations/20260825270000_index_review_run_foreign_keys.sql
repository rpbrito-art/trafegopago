-- Correção 004E-01 — cobertura das FKs compostas para `ai_runs`
--
-- Os advisors apontaram duas FKs do delta 004E sem índice de cobertura:
--
--   declared_context_reviews_run_same_tenant          (ai_run_id, organization_id)
--   declared_context_review_attempts_run_same_tenant  (ai_run_id, organization_id)
--
-- Os índices criados nas migrations anteriores existiam justamente para
-- cobri-las, mas com as colunas na ordem **inversa** — `(organization_id,
-- ai_run_id)`. Um índice composto só serve a uma verificação de FK quando as
-- colunas dela formam o prefixo dele, então aqueles índices não cobriam nada:
-- um DELETE em `ai_runs` faria varredura sequencial nas duas tabelas.
--
-- Delta aditivo: as migrations `20260825250000` e `20260825260000` já foram
-- aplicadas e **não são reescritas**. Aqui os índices certos são criados e os
-- que não cobrem nada saem — nenhuma consulta do código busca por
-- `(organization_id, ai_run_id)`, então mantê-los seria custo de escrita sem
-- leitura correspondente.

create index declared_context_reviews_run_org_idx
  on public.declared_context_reviews (ai_run_id, organization_id);

drop index if exists public.declared_context_reviews_org_run_idx;

create index declared_context_review_attempts_run_org_idx
  on public.declared_context_review_attempts (ai_run_id, organization_id)
  where ai_run_id is not null;

drop index if exists public.declared_context_review_attempts_org_run_idx;
