# ESTADO — Tráfego Pago

Atualizado: 2026-08-25

Estado incorporado = `main + este arquivo + promoção real`.

## 1. Ambiente

- repo: `rpbrito-art/trafegopago`
- Supabase project ref: `cbnxdoxpyioxjwgjhbtq`
- pasta local esperada: `C:\Users\rpbri\Documents\trafegopago`
- `business-weaver`: fora de escopo

## 2. Estado incorporado

Promovidas: **000–003A**.

- Fase 1 — Supabase, Auth e Tenancy: **ENCERRADA**.
- Fase 2 — Operations, Audit, Queues e Segurança Base: **ENCERRADA**.
- Fase 3 — Meta Connection Foundation: **EM ANDAMENTO / GATE EXTERNO PENDENTE**.
- última rodada promovida: **003A — Meta Connection Foundation**.
- merge 003A: `546838db8e7ced4e9045c05feb8c7b2f0c476cc2`.
- CI final 003A: `32772710738` — verde.

003A está **EXECUTADA, AUDITADA E PROMOVIDA**.

## 3. Rodada 003B — ESTACIONADA, NÃO PROMOVIDA

Mandato: `rodadas/gpt/RODADA_003B_META_ASSET_DISCOVERY_SELECTION.md`

Branch: `claude/rodada-003b-meta-asset-discovery-selection`

PR #12: **draft, open, não mergeado**.

HEAD final da execução mais recente: `053bc7ca3f25b53954579df30bce598894e718dd`.

CI: `32859795018` — **success**.

Já preservado/auditado:

- migration `20260824210000_create_meta_asset_selection.sql` aplicada;
- `instagram_accounts` e `ad_accounts` presentes;
- Correção 003B-01: **APROVADA**;
- Correção 003B-03: **APROVADA**;
- investigação 003B-05 e complementos Page/IG: **AUDITADOS como evidência read-only**;
- endpoint BISU `/{system-user-id}/assigned_pages` permanece sustentado por evidência oficial e não deve ser revertido;
- reconciliações e UI anteriores permanecem preservadas onde não contraditas por prova real;
- Correção 003B-08 reconexão: **APROVADA em código**;
- Correção 003B-09 parser/UX: **APROVADA em código**, com E2E real executado.

003B continua **NÃO PROMOVIDA**.

## 4. Correção 003B-09 — RESULTADO REAL

Auditoria final:

`rodadas/gpt/AUDITORIA_CORRECAO_003B_09_RESET_E2E_CONEXAO_META.md`

Relatório Claude:

`rodadas/claude/RELATORIO_CORRECAO_003B_09_RESET_E2E_CONEXAO_META.md`

O E2E real de desconexão foi finalmente executado com autorização humana explícita.

Resultado:

- `disconnectMeta()` falhou fechado na etapa `CLASSIFICACAO`;
- Meta respondeu HTTP 400 / code 190 antes de `/permissions`;
- nenhuma revogação foi executada;
- nenhuma limpeza local foi simulada.

Snapshot independente do GPT no Supabase após o E2E:

- conexão `655da6e6-9056-456d-a81d-5e2570da5faf` continua `ACTIVE`;
- `scope_count=6`;
- referência de token presente;
- `token_expires_at` preenchido;
- `disconnected_at=null`;
- `external_disconnect_pending_at=null`.

O reset não foi concluído, mas a causa foi isolada.

## 5. Defeito Meta agora comprovado

Com o mesmo User Access Token válido:

- `debug_token` confirma `is_valid=true`, `type=USER`;
- `/me?fields=id,name` → HTTP 200;
- `/me?fields=client_business_id` → HTTP 400 / code 190;
- `/me?fields=id,client_business_id` → HTTP 400 / code 190.

Conclusão:

**o classifier compartilhado da 003B-06 não pode continuar inferindo saúde/tipo da credencial pela leitura de `client_business_id` desse modo.**

Consequências provadas:

- desconexão USER pode ser bloqueada antes da primitive real;
- descoberta pode mostrar `conexao-recusada` sobre token válido;
- a mensagem de conexão recusada vista pelo fundador não era prova de token morto.

A parte `assigned_pages` da arquitetura BISU permanece preservada. O defeito está no classifier USER/BISU compartilhado.

A correção futura do classifier deve ser pesquisada/decidida pelo GPT antes de retomar a 003B. Não tratar `190` genérico como semântica de “é USER” sem prova oficial suficiente.

## 6. Restrição operacional Meta

Fatos confirmados:

- a conta já atingiu o limite atual de **dois Meta Business Portfolios**;
- não é possível criar terceiro portfolio agora;
- o portfolio bloqueado/inutilizável é **`Bizzman5po`**;
- `Bizzman5po` e `BizzManiq1` são identidades distintas;
- `BizzManiq1` não deve ser tratado como bloqueado sem prova;
- Quoron possui o app canônico e apareceu inelegível como cliente do próprio app no fluxo BISU observado.

Continua proibido:

- criar terceiro portfolio;
- excluir `Bizzman5po` por tentativa;
- usar empresa/portfolio de terceiro sem decisão explícita;
- alterar app/configuração/scopes por tentativa;
- promover 003B sem E2E BISU real.

## 7. Decisão de desbloqueio do desenvolvimento

Decisão aprovada pelo fundador:

`rodadas/gpt/DECISAO_DESBLOQUEIO_DESENVOLVIMENTO_META_GATE.md`

O gate Meta é **trilha pendente**, não bloqueio global.

Isso não promove 003B e não transforma USER em arquitetura canônica.

Capacidades independentes podem avançar em branches próprias a partir da `main`.

## 8. Próxima rodada autorizada — 004A

Rodada:

**004A — AI Foundation Core**

Mandato:

`rodadas/gpt/RODADA_004A_AI_FOUNDATION_CORE.md`

Status:

**PLANEJADA E AUTORIZADA — CLAUDE PODE EXECUTAR AGORA.**

Objetivo resumido:

- catálogo interno de providers/modelos/preços;
- `ai_runs` e custo reproduzível;
- contrato único de AI Task;
- Router server-only;
- seleção por tier/capability/status;
- structured output validado;
- fake adapter apenas em testes;
- nenhuma API paga, chave, SDK ou chamada externa de IA nesta rodada.

Base obrigatória:

- partir da **`main` atual**;
- não continuar da branch 003B;
- criar branch `claude/rodada-004a-ai-foundation-core`.

## 9. Rodada 004A — EXECUTADA EM CÓDIGO, MIGRATION REMOTA BLOQUEADA

Mandato: `rodadas/gpt/RODADA_004A_AI_FOUNDATION_CORE.md`.

Branch: `claude/rodada-004a-ai-foundation-core`, criada a partir da `main` (`5e03418`).

Status: **EXECUTADA — AGUARDANDO AUDITORIA GPT**, com a prova remota do §11 **não executada**.

Relatório: `rodadas/claude/RELATORIO_RODADA_004A_AI_FOUNDATION_CORE.md`.

### 9.1 Entregue

Migration `20260825140000_create_ai_foundation_core.sql` — `ai_providers`, `ai_models`, `ai_price_versions`, `ai_runs`; RLS habilitado, zero policies, `anon`/`authenticated` sem grant, `service_role` no mínimo. `ai_price_versions` sem UPDATE/DELETE; `ai_runs` sem DELETE. Tier 1..3, preços/tokens não negativos, moeda ISO, índice único parcial para uma só versão de preço aberta por modelo, e FK composta `(fallback_from_run_id, organization_id)` impedindo fallback cross-tenant.

Módulo `src/lib/ai/`: `contracts`, `pricing`, `task-registry`, `adapter-registry`, `catalog`, `run-ledger`, `router`. Fake adapter em `test/support/`, fora de `src/`. Nenhuma dependência nova — `bigint` cobriu o requisito decimal do §8.

Registros de produção **vazios** de propósito: sem adapter, o Router falha com `ADAPTER_NOT_REGISTERED` e registra, em vez de cair em fake.

### 9.2 Provas locais

`npx vitest run` → **710/710** em 30 arquivos. Da 004A: pricing 17, router 38, boundaries 7. `tsc --noEmit` e `lint` limpos.

Cobrem os 15 itens do §10. `boundaries.test.ts` inspeciona o próprio código: nenhum arquivo produtivo faz `fetch`, cita marca de provider, lê chave/token ou usa `NEXT_PUBLIC_`.

### 9.3 Bloqueio — decisão do GPT

`supabase db push --linked` recusou com `LegacyDbPushMissingLocalError`: o remoto tem 15 migrations e a última, `20260824210000_create_meta_asset_selection`, é da **003B não promovida** — não existe nesta branch, que parte da `main` como o §3 exige.

Saídas, todas com consequência duradoura:

- **(a)** `migration repair` — proibido sem mandato explícito;
- **(b)** copiar o arquivo da migration 003B para esta branch — o PR da 004A passaria a carregar a migration da 003B, e promover a 004A antes levaria schema Meta para a `main` sem a 003B aprovada;
- **(c)** aplicar por MCP `apply_migration` — não toca na 003B, mas a versão gerada pelo servidor não bateria com `20260825140000`, deixando divergência permanente entre repositório e histórico do banco;
- **(d)** promover a 003B antes — não autorizado.

`DECISÃO ARQUITETURAL NECESSÁRIA — AGUARDANDO GPT`

Consequência: as provas remotas do §11 não foram executadas — dependem das tabelas existirem no remoto.

### 9.4 Não tocado

Sem provider real, API key, SDK, chamada paga, fallback entre providers, tool calling, embeddings ou UI administrativa. Nenhum catálogo real inserido. Nada de Meta/Instagram/Ads, e a branch não carrega código da 003B. Nenhum segredo novo.

Próximo a agir: **GPT** — auditar o delta e decidir como reconciliar o histórico de migrations.

## 10. Continua NÃO autorizado

Na trilha Meta:

- promover/mergear 003B;
- iniciar Fase 4 com importação real Instagram;
- declarar USER arquitetura definitiva;
- remover BISU;
- adicionar/remover scopes por tentativa;
- alterar Meta App/Business Login Configuration;
- criar/excluir/mover Business Portfolio;
- transferir Page/Instagram/Ad Account/app;
- usar terceiro;
- campanha/anúncio/gasto.

Na 004A:

- provider real de IA;
- API key;
- chamada paga;
- SDK de IA;
- fallback real entre providers;
- tool calling;
- embeddings/RAG;
- geração real de copy/imagem;
- qualquer capacidade de IA executar gasto.

## 11. Gate BISU permanece pendente

Ainda falta provar em E2E real BISU:

1. classificação de credencial corrigida sem inferência insegura;
2. `assigned_pages` com BISU ativo do fluxo real;
3. permissões exigidas pelo edge;
4. expansão `instagram_business_account`;
5. descoberta/seleção completa em entidade cliente elegível.

Esse gate será retomado quando houver condição operacional e decisão arquitetural adequada.

## 12. Regra de continuidade

- distinguir sempre planejado, autorizado, executado, auditado e promovido;
- não promover por relatório do Claude sem auditoria independente;
- o gate Meta não bloqueia desenvolvimento independente;
- não tratar hipótese sobre comportamento da Meta como fato sem prova;
- nomes de recursos Meta só podem ser associados a estado/função quando comprovados;
- evitar housekeeping isolado apenas para alinhar numeração/documentação.
