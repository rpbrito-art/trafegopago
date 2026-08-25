-- Correção 004E-02 — a FK da tentativa não pode zerar o tenant
-- Mandato: rodadas/gpt/CORRECAO_004E_02_FINAL_PREPAID_INVARIANTS.md §3
--
-- A FK criada em `20260825260000` é composta e usa `on delete set null` **sem
-- lista de colunas**:
--
--   foreign key (ai_run_id, organization_id)
--     references public.ai_runs (id, organization_id)
--     on delete set null
--
-- Sem a lista, o Postgres tenta zerar **todas** as colunas referenciadoras. Uma
-- delas é `organization_id`, que é `not null` — então apagar um `ai_run`
-- referenciado falharia com violação de not-null, e o cascade da organização
-- poderia travar junto. Pior: a intenção era perder a referência ao run, não o
-- vínculo com o tenant, que é o que sustenta toda a autorização da tabela.
--
-- A forma correta nomeia a coluna: `on delete set null (ai_run_id)`. O run some,
-- a tentativa continua sendo daquele negócio.
--
-- Delta aditivo: `20260825260000` já foi aplicada e **não é reescrita**. Aqui
-- apenas a constraint é substituída.

alter table public.declared_context_review_attempts
  drop constraint declared_context_review_attempts_run_same_tenant;

alter table public.declared_context_review_attempts
  add constraint declared_context_review_attempts_run_same_tenant
  foreign key (ai_run_id, organization_id)
  references public.ai_runs (id, organization_id)
  on delete set null (ai_run_id);

comment on constraint declared_context_review_attempts_run_same_tenant
  on public.declared_context_review_attempts is
  'Run do mesmo tenant. Apagar o run zera apenas ai_run_id; organization_id e preservado.';
