# RELATÓRIO — RODADA 004A: AI Foundation Core

Mandato: `rodadas/gpt/RODADA_004A_AI_FOUNDATION_CORE.md`
Branch: `claude/rodada-004a-ai-foundation-core`, criada a partir da `main` (`5e03418`)

Código e provas locais completos. **A migration não foi aplicada remotamente** — o caminho canônico está bloqueado por um fato que exige decisão do GPT (§5).

## 1. Migration

`supabase/migrations/20260825140000_create_ai_foundation_core.sql` — quatro tabelas internas server-only, no padrão da 002A: RLS habilitado, zero policies, `anon`/`authenticated` sem grant algum, `service_role` com o mínimo.

| tabela | grants a `service_role` | por quê |
| --- | --- | --- |
| `ai_providers` | select, insert, update | catálogo administrável |
| `ai_models` | select, insert, update | idem |
| `ai_price_versions` | select, **insert** | sem UPDATE/DELETE: reescrever preço destrói a reprodutibilidade do custo já registrado |
| `ai_runs` | select, insert, update | sem DELETE: o ledger é a evidência do gasto |

Invariantes no banco, não na aplicação: `tier between 1 and 3` (Tier 0 não chama provider); preços e tokens não negativos; `currency ~ '^[A-Z]{3}$'`; custo exige moeda; `effective_to > effective_from`; **índice único parcial** garantindo no máximo uma versão de preço aberta por modelo; `FAILED` exige `error_class` e `SUCCEEDED` o proíbe.

Cross-tenant no fallback é bloqueado por **FK composta** `(fallback_from_run_id, organization_id) → (id, organization_id)`, com `CHECK` exigindo organização quando há fallback — sem isso, `MATCH SIMPLE` não checaria nada num run global e o vínculo ficaria não verificado.

Preços e custo em `numeric(20,12)` / `numeric(24,12)`: uma chamada Tier 1 custa frações de centavo e duas casas decimais zerariam a operação inteira.

## 2. Módulo `src/lib/ai/`

| arquivo | papel |
| --- | --- |
| `contracts.ts` | vocabulário fechado + `AITaskDefinition`, `AITaskRequest`, contrato de adapter |
| `pricing.ts` | custo em `bigint` de escala fixa |
| `task-registry.ts` | políticas versionadas server-side (`PRODUCTION_TASKS` vazio) |
| `adapter-registry.ts` | resolução por `providerKey` (`PRODUCTION_ADAPTERS` vazio) |
| `catalog.ts` | leitura de candidatos e preços vigentes |
| `run-ledger.ts` | abre `STARTED`, conclui ou falha |
| `router.ts` | orquestra a ordem das decisões |
| `test/support/fake-ai-adapter.ts` | fake determinístico **fora de `src/`** |

Nenhuma dependência nova. `bigint` cobriu o requisito decimal — não foi preciso devolver a decisão do §8 ao GPT.

Decisões que valem registro:

- **Tier 0 não existe no tipo.** `AI_TIERS` é `[1,2,3]`; uma task que só declara tier fora disso não é barata, é determinística no lugar errado.
- **`DEGRADED` continua elegível**, mas perde o desempate para um `ACTIVE` do mesmo tier: degradação é preferência, não ausência de candidato.
- **Ordem determinística** entre candidatos (tier → saúde → `modelKey`). Decidir pela ordem de retorno do banco produziria custo irreprodutível entre execuções idênticas.
- **Cached tokens são disjuntos de input.** Com preço de cache, vão por ele; sem, vão pelo preço de input — cobrar zero afirmaria gratuidade onde o correto é "este provider não distingue cache".
- **Registros de produção vazios.** Sem adapter, o Router falha com `ADAPTER_NOT_REGISTERED` e registra. Cair em fake seria o pior desfecho: a aplicação pareceria funcionar, inventando respostas com custo zero.
- **Nenhuma task de fixture em produção.** Inventar uma "feature de IA" para ter o que registrar produziria trabalho que a próxima rodada desfaria.

## 3. Provas locais

`npx vitest run` → **710/710** (30 arquivos). Da 004A: `pricing.test.ts` 17, `router.test.ts` 38, `boundaries.test.ts` 7.

Cobrem os 15 itens do §10, entre eles: task sem tier de LLM não chega ao catálogo; o pedido não tem onde escrever provider/model; `DEPRECATED`/`DISABLED` e provider `DISABLED` não recebem tarefa; capacidade ausente falha **sem chamar o adapter**; preço ausente e preço ambíguo falham fechado antes da chamada; output válido gera `SUCCEEDED`, inválido gera `FAILED` **com o custo consumido registrado**; exceção do adapter não vaza a mensagem original; `prompt_version`/`schema_version` no run; nenhum input, prompt ou output bruto no ledger; fallback sem organização é recusado; sem adapter não há queda para fake.

`boundaries.test.ts` lê o próprio código-fonte: nenhum arquivo produtivo faz `fetch`, cita marca de provider, lê chave/token, usa `NEXT_PUBLIC_`, ou alcança `test/support`. O runtime que toca banco é `server-only`.

`npx tsc --noEmit` → limpo. `npm run lint` → limpo.

## 4. Custo — exemplo reproduzível

1.234 tokens de input a `0.15`/milhão + 567 de output a `0.60`/milhão = **`0.000525300000` USD**. O mesmo cálculo, com a mesma `ai_price_versions`, devolve o mesmo valor daqui a um ano — inclusive depois de o provider mudar a tabela.

## 5. Bloqueio: a migration não foi aplicada

`supabase db push --linked` recusou:

> `LegacyDbPushMissingLocalError` — Remote migration versions not found in local migrations directory.

Causa: o remoto tem **15 migrations**, e a última — `20260824210000_create_meta_asset_selection` — pertence à **003B, que não foi promovida**. Ela não existe nesta branch, que parte da `main` como o §3 exige.

As saídas disponíveis têm consequências duradouras e diferentes, e nenhuma é escolha de execução:

- **(a)** `supabase migration repair` — proibido sem mandato explícito;
- **(b)** copiar o arquivo da migration da 003B para esta branch — desbloqueia o push, mas o PR da 004A passaria a **carregar a migration da 003B**; se a 004A for promovida antes, o schema Meta entra na `main` sem a 003B ter sido aprovada;
- **(c)** aplicar por `apply_migration` via MCP — funciona e não toca na 003B, mas a versão é gerada pelo servidor e **não bateria** com `20260825140000` do arquivo, deixando divergência permanente entre repositório e histórico do banco;
- **(d)** promover a 003B antes — fora do meu alcance e explicitamente não autorizado.

`DECISÃO ARQUITETURAL NECESSÁRIA — AGUARDANDO GPT`

Consequência: as provas remotas do §11 (constraints, browser sem acesso, preço negativo recusado, uma única versão aberta, isolamento de tenant, rollback da fixture) **não foram executadas**. Elas dependem das tabelas existirem no remoto.

## 6. Invariantes preservadas

Sem provider real, API key, SDK, chamada paga, fallback entre providers, tool calling, embeddings ou UI administrativa. Nenhum catálogo real de provider/modelo/preço inserido. Nada de Meta/Instagram/Ads tocado, e a branch não carrega código da 003B. Nenhum segredo novo.

`AGUARDANDO AUDITORIA GPT`
