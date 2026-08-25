-- Rodada 004B — índice de cobertura da FK `growth_objectives_created_by_fkey`.
--
-- A migration anterior desta rodada quitou os quatro INFO de FK de `ai_runs`,
-- mas a própria `growth_objectives` introduziu um novo: `created_by` referencia
-- `auth.users` e nasceu sem índice. Sem ele, remover um usuário faz varredura
-- sequencial na tabela para verificar a constraint.
--
-- Parcial: `created_by` é nullable — a linha sobrevive ao usuário que a criou,
-- por `on delete set null` — e indexar os NULL engordaria o índice sem servir
-- à verificação da FK.
create index growth_objectives_created_by_idx
  on public.growth_objectives (created_by)
  where created_by is not null;
