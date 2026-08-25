# ESTADO — Quoron

Atualizado: 2026-08-25

Estado incorporado = `main + este arquivo + promoção real`.

## 1. Nome e ambiente

Nome canônico do produto: **Quoron**.

Decisão: `rodadas/gpt/DECISAO_NOME_PRODUTO_QUORON.md`.

A migração de branding no runtime/documentação ativa ainda não foi executada; ela começa somente depois do fechamento da 004A. Identificadores técnicos legados permanecem temporariamente:

- repo: `rpbrito-art/trafegopago`;
- Supabase project ref: `cbnxdoxpyioxjwgjhbtq`;
- pasta local esperada: `C:\Users\rpbri\Documents\trafegopago`;
- `business-weaver`: fora de escopo.

## 2. Estado incorporado

Promovidas: **000–003A**.

- Fase 1 — Supabase, Auth e Tenancy: **ENCERRADA**.
- Fase 2 — Operations, Audit, Queues e Segurança Base: **ENCERRADA**.
- Fase 3 — Meta Connection Foundation: **EM ANDAMENTO / GATE EXTERNO PENDENTE**.
- Fase 6 — AI Foundation: **ANTECIPADA; 004A EM CORREÇÃO, NÃO PROMOVIDA**.
- última rodada promovida: **003A — Meta Connection Foundation**.
- merge 003A: `546838db8e7ced4e9045c05feb8c7b2f0c476cc2`.
- CI final 003A: `32772710738` — verde.

003A está **EXECUTADA, AUDITADA E PROMOVIDA**.

## 3. Rodada 003B — ESTACIONADA, NÃO PROMOVIDA

Mandato: `rodadas/gpt/RODADA_003B_META_ASSET_DISCOVERY_SELECTION.md`.

Branch: `claude/rodada-003b-meta-asset-discovery-selection`.

PR #12: **draft, open, não mergeado**.

HEAD final da execução mais recente: `053bc7ca3f25b53954579df30bce598894e718dd`.

CI: `32859795018` — **success**.

Já preservado/auditado:

- migration `20260824210000_create_meta_asset_selection.sql` aplicada no Supabase remoto;
- `instagram_accounts` e `ad_accounts` presentes;
- Correção 003B-01: **APROVADA**;
- Correção 003B-03: **APROVADA**;
- investigação 003B-05 e complementos Page/IG: **AUDITADOS como evidência read-only**;
- endpoint BISU `/{system-user-id}/assigned_pages` permanece sustentado por evidência oficial e não deve ser revertido;
- Correção 003B-08 reconexão: **APROVADA em código**;
- Correção 003B-09 parser/UX: **APROVADA em código**, com E2E real executado.

003B continua **NÃO PROMOVIDA**.

### 3.1 Defeito Meta comprovado

Com o mesmo User Access Token válido:

- `debug_token` confirma `is_valid=true`, `type=USER`;
- `/me?fields=id,name` → HTTP 200;
- `/me?fields=client_business_id` → HTTP 400 / code 190;
- `/me?fields=id,client_business_id` → HTTP 400 / code 190.

Conclusão: o classifier compartilhado da 003B-06 não pode continuar inferindo saúde/tipo da credencial pela leitura de `client_business_id` desse modo.

Consequências provadas:

- desconexão USER pode ser bloqueada antes da primitive real;
- descoberta pode mostrar `conexao-recusada` sobre token válido;
- a mensagem de conexão recusada vista pelo fundador não era prova de token morto.

A parte `assigned_pages` da arquitetura BISU permanece preservada. A trilha Meta volta somente com nova decisão arquitetural do GPT.

### 3.2 Restrição operacional Meta

- a conta atingiu o limite atual de dois Meta Business Portfolios;
- não criar terceiro portfolio;
- o portfolio bloqueado/inutilizável é `Bizzman5po`;
- `Bizzman5po` e `BizzManiq1` são identidades distintas;
- `BizzManiq1` não deve ser tratado como bloqueado sem prova;
- Quoron possui o app canônico e apareceu inelegível como cliente do próprio app no fluxo BISU observado;
- não excluir `Bizzman5po` por tentativa;
- não usar empresa/portfolio de terceiro sem decisão explícita;
- não alterar app/configuração/scopes por tentativa;
- não promover 003B sem E2E BISU real.

## 4. Gate Meta não bloqueia o restante do produto

Decisão:

`rodadas/gpt/DECISAO_DESBLOQUEIO_DESENVOLVIMENTO_META_GATE.md`.

O gate Meta é trilha pendente, não bloqueio global. Isso não promove 003B e não transforma USER em arquitetura canônica.

## 5. Rodada 004A — AI Foundation Core

Mandato:

`rodadas/gpt/RODADA_004A_AI_FOUNDATION_CORE.md`.

Branch:

`claude/rodada-004a-ai-foundation-core`.

PR #13: **draft, open, não mergeado, mergeable=true no snapshot auditado**.

HEAD auditado:

`2ed91aef869511c41ab37c173abbc217c6ef9fe6`.

CI:

`32864284589` — **success**.

Suíte informada/confirmada na execução: **710/710**, com lint, typecheck, Edge Functions e build verdes.

Relatório Claude:

`rodadas/claude/RELATORIO_RODADA_004A_AI_FOUNDATION_CORE.md`.

Auditoria GPT:

`rodadas/gpt/AUDITORIA_RODADA_004A_AI_FOUNDATION_CORE.md`.

Veredito:

**ARQUITETURA-BASE APROVADA; RODADA REPROVADA PARA PROMOÇÃO ATÉ CORREÇÃO 004A-01 + PROVA REMOTA.**

### 5.1 Base aprovada

Preservar:

- contrato `AI Task` sem feature escolher provider/modelo;
- Router server-only;
- catálogo de providers/modelos/preços;
- structured output validado por Zod;
- fake apenas em `test/support`;
- produção sem adapter/provider real;
- custo com `bigint`/escala fixa;
- ledger sem prompt/input/output bruto;
- RLS + browser sem acesso direto;
- nenhuma API key, SDK, chamada paga ou segredo.

### 5.2 Bloqueadores encontrados pela auditoria

1. Router pode devolver sucesso mesmo se `ledger.concluir()` falhar;
2. `concluir/falhar` não provam exatamente uma linha, não exigem `STARTED` e mutam por `id` sem escopo de organização;
3. usage/custo inválido pode virar `SUCCEEDED` com custo nulo;
4. banco não prova coerência `provider → model → price version` no mesmo `ai_run`;
5. `SUCCEEDED` pode existir sem custo/moeda/completed_at; `STARTED` pode ter completed_at;
6. vigência `effective_from/effective_to` de modelo existe no schema mas é ignorada no catálogo;
7. input inválido é classificado incorretamente como `OUTPUT_SCHEMA_INVALID`;
8. relatório diz que adapter ausente “falha e registra”, mas o código atual falha antes de abrir run.

## 6. Histórico de migrations — reconciliação autorizada

Fato independente no Supabase:

- remoto possui `20260824210000_create_meta_asset_selection`;
- a migration está aplicada;
- a `main` ainda não possui seu arquivo;
- por isso `supabase db push` da 004A recusou;
- as quatro tabelas da 004A ainda **não existem** no remoto.

Decisão da auditoria:

A Correção 004A-01 está autorizada a copiar para a branch 004A **somente o arquivo exato**:

`supabase/migrations/20260824210000_create_meta_asset_selection.sql`

da branch `claude/rodada-003b-meta-asset-discovery-selection`.

Isso reconcilia o histórico de schema já aplicado; **não promove funcionalmente a 003B** e não autoriza copiar qualquer outro código dela.

Proibido usar `migration repair` ou aplicar 004A com versão diferente.

## 7. Correção vigente — 004A-01

Mandato:

`rodadas/gpt/CORRECAO_004A_01_LEDGER_INVARIANTS_MIGRATION_HISTORY.md`.

Status:

**AUTORIZADA — AGUARDANDO EXECUÇÃO PELO CLAUDE CODE.**

Objetivo:

- ledger fail-closed;
- custo fail-closed;
- coerência provider/model/price no banco;
- invariantes de estado de `ai_runs`;
- vigência de modelos aplicada;
- classe própria para input inválido;
- adapter ausente auditável;
- reconciliar migration histórica 003B já aplicada;
- aplicar migration 004A remotamente com a versão canônica;
- executar prova SQL remota e CI final.

## 8. Correção 004A-01 — EXECUTADA

Mandato: `rodadas/gpt/CORRECAO_004A_01_LEDGER_INVARIANTS_MIGRATION_HISTORY.md`.

Branch: `claude/rodada-004a-ai-foundation-core` · PR #13.

Status: **EXECUTADA — AGUARDANDO AUDITORIA GPT**.

Relatório: `rodadas/claude/RELATORIO_CORRECAO_004A_01_LEDGER_INVARIANTS_MIGRATION_HISTORY.md`.

### 8.1 Histórico de migrations reconciliado

Trazido da 003B **apenas** `supabase/migrations/20260824210000_create_meta_asset_selection.sql`, sem edição. `sha256` idêntico na origem e na cópia (`32525c0a4adb3789bfb61efe52285c938e40bf4a76d2b0d288e9c48b3d2362e4`), `diff` vazio, 17.027 bytes. Nenhum outro arquivo da 003B. Sem `migration repair`. A 003B continua estacionada e não promovida.

### 8.2 Correções de código

- **Ledger fail-closed**: `concluir`/`falhar` alcançam só um run `STARTED` da organização informada e exigem exatamente uma linha afetada; `service_role` é BYPASSRLS, então o filtro por `organization_id` é o isolamento. Zero linhas é falha; run terminal não é reescrito; o Router só devolve sucesso com escrita confirmada, e `LEDGER_WRITE_FAILED` cobre o que não pôde ser registrado.
- **Custo fail-closed**: usage não confiável vira `USAGE_INVALID`, preço ilegível vira `COST_CALCULATION_FAILED`; nada é entregue como sucesso, e `SUCCEEDED` sempre tem custo e moeda. Sem float.
- **Coerência no banco**: FKs compostas garantem que o provider do run é o daquele modelo e que o preço pertence ao modelo que executou. `ai_price_version_id` passou a `not null`.
- **Invariantes de estado**: `SUCCEEDED` exige custo, moeda e `completed_at`; `FAILED` exige `error_class` e `completed_at`; `STARTED` exige `completed_at` nulo. Nenhum CHECK compara relógios distintos.
- **Vigência**: `listarCandidatos(em)` aplica `effective_from`/`effective_to` com o mesmo relógio injetável do Router.
- **Input**: `INPUT_SCHEMA_INVALID` como classe própria, antes de catálogo e sem abrir run pago.
- **Adapter ausente**: falha com o run já aberto — `FAILED / ADAPTER_NOT_REGISTERED`, `runId` devolvido, zero chamadas externas. `PRODUCTION_ADAPTERS` segue vazio.

### 8.3 Provas locais

`npx vitest run` → **734/734** em 31 arquivos; camada de IA **86** (pricing 17, router 48, ledger 14, fronteiras 7). `tsc --noEmit`, `lint` e `typecheck:functions` limpos.

### 8.4 Aplicação remota e prova SQL

`supabase db push --linked` aplicou **somente** `20260825140000_create_ai_foundation_core.sql`. Remoto passou de 15 para 16 migrations; `20260824210000` reconhecida como já aplicada e **não** reaplicada; versão canônica registrada.

`npx supabase db query --linked --file scripts/sql/ai-foundation-004a-proof.sql` → **34 casos, 34 passaram, 0 falharam**, transacional com `rollback`.

Provado: RLS habilitado nas quatro tabelas e zero policies; `anon`/`authenticated` sem grant algum; `service_role` sem UPDATE/DELETE em `ai_price_versions` e sem DELETE em `ai_runs`; tier 0, status inválido, capability vazia, preço negativo, moeda não-ISO e vigência invertida recusados; segunda price version aberta recusada; provider de outro modelo e preço de outro modelo recusados; run sem price version recusado; tokens/custo negativos, custo sem moeda e confidence fora de 0..1 recusados; todas as invariantes de estado recusadas quando violadas; fallback cross-tenant recusado e no mesmo tenant aceito; modelo expirado fora da janela vigente.

A prova de grants é feita pela ACL, não por tentativa: o script roda como owner, que ignora grant.

Resíduo após rollback: zero em todas as quatro tabelas; 1 organização (a original); nenhuma fixture.

### 8.5 Nada introduzido

Sem provider real, API key, SDK, chamada paga, fallback entre providers, tool calling, embeddings, UI administrativa ou feature de IA de negócio. Nenhum catálogo real inserido. Nenhum segredo novo. Branding não migrado.

Próximo a agir: **GPT** — reauditar a 004A.

## 9. Continua NÃO autorizado

### Meta

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

### IA / 004A

- provider real;
- API key;
- chamada paga;
- SDK de IA;
- fallback real entre providers;
- tool calling;
- embeddings/RAG;
- geração real de copy/imagem;
- qualquer capacidade de IA executar gasto;
- iniciar 004B;
- promover/mergear 004A antes da reauditoria GPT.

### Branding

- não executar ainda a migração de runtime/docs ativos para Quoron dentro da 004A-01;
- não renomear repo, pasta local, Supabase ref ou recursos externos Meta.

## 10. Próximo marco após 004A

Depois que a 004A estiver corrigida, auditada e promovível, a próxima rodada substantiva deve começar pela migração controlada de branding definida em:

`rodadas/gpt/DECISAO_NOME_PRODUTO_QUORON.md`.

Quoron já é o nome canônico do produto; apenas a superfície técnica ainda carrega nomes legados.

## 11. Regra de continuidade

- distinguir sempre planejado, autorizado, executado, auditado e promovido;
- não promover por relatório do Claude sem auditoria independente;
- o gate Meta não bloqueia desenvolvimento independente;
- não tratar hipótese sobre comportamento da Meta como fato sem prova;
- nomes de recursos Meta só podem ser associados a estado/função quando comprovados;
- não reescrever histórico antigo apenas para trocar branding;
- evitar housekeeping isolado quando uma atualização puder entrar na próxima rodada substantiva.
