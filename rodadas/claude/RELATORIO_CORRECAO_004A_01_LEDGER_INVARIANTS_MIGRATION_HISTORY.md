# RELATÓRIO — CORREÇÃO 004A-01: ledger, custo, invariantes e histórico de migrations

Mandato: `rodadas/gpt/CORRECAO_004A_01_LEDGER_INVARIANTS_MIGRATION_HISTORY.md`
Branch: `claude/rodada-004a-ai-foundation-core` · PR #13
Complementa `RELATORIO_RODADA_004A_AI_FOUNDATION_CORE.md`, cujo §5 registrava o bloqueio agora resolvido.

## 1. Histórico de migrations reconciliado (§3)

Trazido da 003B **apenas** `supabase/migrations/20260824210000_create_meta_asset_selection.sql`, sem edição.

| prova | resultado |
| --- | --- |
| `sha256` na origem (`origin/claude/rodada-003b-…`) | `32525c0a4adb3789bfb61efe52285c938e40bf4a76d2b0d288e9c48b3d2362e4` |
| `sha256` na cópia (004A) | **idêntico** |
| `diff` origem × cópia | vazio |
| tamanho | 17.027 bytes |

Nenhum outro arquivo da 003B foi copiado — sem gateway, UI, discovery ou testes. Sem `migration repair`. A 003B continua estacionada e não promovida; o que foi reconciliado é o histórico versionado do schema **já aplicado**.

## 2. Ledger fail-closed (§4)

`concluir` e `falhar` agora alcançam **apenas** um run `STARTED` da organização informada, e exigem exatamente uma linha afetada. `service_role` é BYPASSRLS, então o filtro por `organization_id` **é** o isolamento — sem ele, um `runId` vazado bastaria para reescrever o ledger de outro tenant. Run global filtra por `IS NULL`.

Zero linhas é falha. O Router confere o retorno: sem confirmação de escrita não há `ok: true`, porque entregar o output afirmaria uma execução que o sistema não consegue provar. Falha que não pôde ser registrada devolve `LEDGER_WRITE_FAILED` — o problema mais grave dos dois.

## 3. Custo fail-closed (§5)

Depois que o provider foi chamado, custo desconhecido encerra a execução: `USAGE_INVALID` para usage não confiável, `COST_CALCULATION_FAILED` para preço ilegível. Nada é entregue como sucesso, e `SUCCEEDED` sempre carrega custo e moeda — agora também exigido por `CHECK`. Nenhum float foi usado.

## 4. Coerência e invariantes no banco (§§6 e 7)

FKs compostas, não triggers: `(ai_model_id, provider_id) → ai_models(id, provider_id)` e `(ai_price_version_id, ai_model_id) → ai_price_versions(id, ai_model_id)`. Sem elas, um run poderia atribuir a um provider a chamada de outro, ou explicar o custo de um modelo caro com o preço de um barato.

`ai_price_version_id` passou a `not null`. Invariantes de estado: `SUCCEEDED` exige custo, moeda e `completed_at`; `FAILED` exige `error_class` e `completed_at`; `STARTED` exige `completed_at IS NULL`. Nenhum `CHECK` compara relógios distintos — a lição de clock skew da 002A está preservada.

## 5. Vigência, input e adapter (§§8, 9, 10)

`listarCandidatos(em)` aplica `effective_from`/`effective_to` com o **mesmo relógio injetável** do Router: modelo expirado não é selecionado só porque o status continua `ACTIVE`.

`INPUT_SCHEMA_INVALID` é classe própria — erro de quem chamou, antes de qualquer gasto, que não abre run pago e não se confunde com `OUTPUT_SCHEMA_INVALID`.

Adapter ausente agora falha **com o run já aberto**: `FAILED / ADAPTER_NOT_REGISTERED`, `runId` devolvido, zero chamadas externas. `PRODUCTION_ADAPTERS` segue vazio.

## 6. Provas locais

`npx vitest run` → **734/734** (31 arquivos). Da camada de IA: **86** — pricing 17, router 48, ledger 14, fronteiras 7.

Cobrem os 17 itens do §11 que são verificáveis em código, incluindo: conclusão não confirmada não vira sucesso; falha não registrada devolve `LEDGER_WRITE_FAILED`; run inexistente não conta como sucesso; tenant B não conclui nem falha run do tenant A; escopo global não alcança run de tenant; run terminal não é reescrito na segunda tentativa; usage negativo/fracionário não gera `SUCCEEDED`; preço ilegível não entrega output; adapter ausente gera run auditável; nenhum input/output/prompt bruto no ledger; fake inacessível à produção.

`tsc --noEmit`, `npm run lint` e `npm run typecheck:functions` → limpos.

## 7. Aplicação remota e prova SQL (§12)

`supabase db push --linked` aplicou **somente** `20260825140000_create_ai_foundation_core.sql`. O remoto passou de 15 para 16 migrations; `20260824210000` foi reconhecida como já aplicada e **não** foi reaplicada. A versão registrada é a canônica do arquivo.

`npx supabase db query --linked --file scripts/sql/ai-foundation-004a-proof.sql` → **34 casos, 34 passaram, 0 falharam**, transacional com `rollback`.

Entre eles: tier 0 recusado; status inválido de modelo e de provider recusados; capability vazia recusada; preço negativo, moeda fora de ISO 4217 e vigência invertida recusados; segunda price version aberta recusada (`23505`); `service_role` sem UPDATE/DELETE em `ai_price_versions` e sem DELETE em `ai_runs`; `anon`/`authenticated` sem grant algum nas quatro tabelas; RLS habilitado nas quatro e zero policies; provider de outro modelo e preço de outro modelo recusados (`23503`); run sem price version recusado (`23502`); tokens/custo negativos, custo sem moeda, tier 0 em run e confidence fora de 0..1 recusados; `SUCCEEDED` sem custo, terminal sem `completed_at`, `STARTED` com `completed_at`, `FAILED` sem `error_class`, `SUCCEEDED` com `error_class` e `error_class` fora da taxonomia recusados; fallback cross-tenant recusado (`23503`) e no mesmo tenant aceito; fallback em run global recusado; modelo expirado fora da janela vigente.

Um detalhe de honestidade: a prova de grants é feita **pela ACL**, não por tentativa de escrita. O script roda como owner, que ignora grant — um `update` bem-sucedido ali não provaria nada sobre `service_role`.

Resíduo após o rollback: `ai_providers` 0, `ai_models` 0, `ai_price_versions` 0, `ai_runs` 0, organizações 1 (a original), fixtures 0.

## 8. Nada introduzido

Sem provider real, API key, SDK, chamada paga, fallback entre providers, tool calling, embeddings, UI administrativa ou feature de IA de negócio. Nenhum catálogo real inserido. Nenhum segredo novo. Branding não migrado. Nenhum código Meta além do arquivo de migration autorizado.

`AGUARDANDO AUDITORIA GPT`
