# AUDITORIA FINAL — 004A AI FOUNDATION CORE

Data: 2026-08-25

Rodada: `rodadas/gpt/RODADA_004A_AI_FOUNDATION_CORE.md`

Correção: `rodadas/gpt/CORRECAO_004A_01_LEDGER_INVARIANTS_MIGRATION_HISTORY.md`

PR: #13

HEAD auditado: `880a7e4665f827fc7ea5707d863fb00299f56811`

Merge de promoção: `da2862135eab6897fc44ae361da1298c7071a11f`

## Veredito

**004A APROVADA, AUDITADA E PROMOVIDA.**

A arquitetura-base da fundação de IA e a Correção 004A-01 cumprem os gates materiais. A rodada passa a integrar a `main`.

A Fase 6 continua **EM ANDAMENTO**: a 004A entrega o núcleo interno, mas ainda não existe provider real, adapter produtivo, chave, chamada paga, fallback real ou feature de IA de negócio.

## Evidência independente

### Código / ledger

- `run-ledger.ts` restringe conclusão/falha a `id + organization_id + status=STARTED` e exige exatamente uma linha retornada;
- run global usa `organization_id IS NULL`;
- o Router não devolve `ok:true` se `ledger.concluir()` falhar;
- falha que não pode ser persistida vira `LEDGER_WRITE_FAILED`;
- input inválido usa `INPUT_SCHEMA_INVALID` antes de catálogo/provider;
- adapter ausente abre run e encerra `FAILED / ADAPTER_NOT_REGISTERED` sem chamada externa;
- custo/usage inválido depois da chamada não pode terminar `SUCCEEDED`;
- modelo expirado fica fora de `listarCandidatos(em)`.

### Banco remoto

No Supabase `cbnxdoxpyioxjwgjhbtq` foi confirmado:

- migrations `20260824210000_create_meta_asset_selection` e `20260825140000_create_ai_foundation_core` presentes, nesta ordem;
- quatro tabelas da IA presentes: `ai_providers`, `ai_models`, `ai_price_versions`, `ai_runs`;
- RLS habilitado nas quatro;
- zero policies nas quatro, por desenho server-only;
- `anon` e `authenticated` sem SELECT/INSERT/UPDATE/DELETE;
- `service_role` com grants mínimos esperados;
- `ai_price_versions` sem UPDATE/DELETE para `service_role`;
- `ai_runs` sem DELETE para `service_role`;
- FKs compostas reais `ai_runs_model_belongs_to_provider` e `ai_runs_price_belongs_to_model`;
- invariantes de `STARTED / SUCCEEDED / FAILED`, custo, moeda, erro, tier e fallback presentes;
- tabelas da IA com zero registros após a fixture transacional.

### Histórico de migration 003B

A cópia de `20260824210000_create_meta_asset_selection.sql` na 004A possui o mesmo blob SHA GitHub da origem na branch 003B: `887b46977577748d88cafb97e1a237657da3b8fd`.

Isso reconcilia o histórico de schema já aplicado. **Não promove funcionalmente a 003B.**

### CI

Run `32873495263`: **success**.

Job único verde em:

- install;
- lint;
- typecheck;
- typecheck Edge Functions;
- testes;
- build.

Vitest no log da CI: **31 arquivos, 734/734 testes passando**.

## Advisors

Security advisor: nenhum achado novo de ERROR. Os quatro `rls_enabled_no_policy` da IA são INFO e correspondem ao desenho server-only com grants revogados.

Performance advisor: há INFO de FKs sem índice de cobertura em `ai_runs`, além de débitos já existentes. Não é bloqueio de correção, segurança ou promoção porque as tabelas estão vazias e nenhuma feature produtiva usa a camada ainda.

**Dívida registrada:** na próxima rodada substantiva que tocar schema/IA, avaliar índices de cobertura para `ai_runs_fallback_same_organization`, `ai_runs_model_belongs_to_provider`, `ai_runs_price_belongs_to_model` e `ai_runs_provider_id_fkey`, sem rodada isolada de housekeeping.

## Limites preservados

A 004A não introduziu:

- provider real;
- API key;
- SDK de IA;
- chamada paga;
- fallback real entre providers/modelos;
- tool calling;
- embeddings/RAG;
- geração de copy/imagem;
- feature de negócio baseada em IA;
- gasto externo;
- mudança Meta além do arquivo histórico autorizado.

## Promoção

PR #13 promovida para `main` em `da2862135eab6897fc44ae361da1298c7071a11f`.

Próxima rodada substantiva deve incorporar a decisão de branding `Quoron` antes de ampliar novas superfícies de produto. A 003B continua estacionada e não promovida.
