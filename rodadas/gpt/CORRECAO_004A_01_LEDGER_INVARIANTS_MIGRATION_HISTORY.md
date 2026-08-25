# CORREÇÃO 004A-01 — LEDGER, CUSTO, INVARIANTES E HISTÓRICO DE MIGRATIONS

Status: **AUTORIZADA PARA EXECUÇÃO PELO CLAUDE CODE**

Data: 2026-08-25

Rodada-base: `rodadas/gpt/RODADA_004A_AI_FOUNDATION_CORE.md`

Auditoria: `rodadas/gpt/AUDITORIA_RODADA_004A_AI_FOUNDATION_CORE.md`

Branch: `claude/rodada-004a-ai-foundation-core`

## 1. Objetivo

Corrigir apenas os bloqueadores encontrados na auditoria da 004A e concluir a prova remota que ficou bloqueada pelo histórico de migrations.

Preservar a arquitetura-base já aprovada. Não abrir provider real, não adicionar segredo, não criar feature de IA nova e não iniciar a próxima rodada.

## 2. Preflight obrigatório

1. `git fetch`;
2. permanecer na branch `claude/rodada-004a-ai-foundation-core`;
3. reconciliar a branch com a `main` atual, que contém a decisão de nome Quoron, a auditoria 004A e esta correção;
4. não executar a migração de branding Quoron nesta correção — apenas carregar a documentação nova da main;
5. não tocar na branch 003B além de ler/copiar o artefato de migration explicitamente autorizado no §3.

## 3. Reconciliação do histórico de migrations — DECISÃO AUTORIZADA

O Supabase remoto já contém:

`20260824210000_create_meta_asset_selection`

A `main` não contém o arquivo, e isso bloqueia toda migration posterior.

Está autorizado trazer para a branch 004A **somente**:

`supabase/migrations/20260824210000_create_meta_asset_selection.sql`

Fonte obrigatória:

`claude/rodada-003b-meta-asset-discovery-selection`

Regras:

- copiar o arquivo exato, sem qualquer edição;
- provar byte-equivalência/hash entre origem e cópia;
- não copiar nenhum outro arquivo da 003B;
- não trazer código de gateway/UI/discovery/testes da 003B;
- não usar `migration repair`;
- não reaplicar essa migration no remoto — ela já está aplicada;
- não declarar a 003B promovida.

Semântica documental: essa inclusão reconcilia o **histórico versionado do schema já aplicado**. A Rodada 003B continua estacionada e não promovida funcionalmente.

## 4. Ledger fail-closed

Corrigir `src/lib/ai/run-ledger.ts` e `src/lib/ai/router.ts` para que:

- nenhuma execução retorne `ok: true` se a conclusão do ledger não for comprovada;
- `concluir` e `falhar` provem que exatamente uma linha foi alterada;
- mutation terminal só alcance run `STARTED`;
- run tenant-scoped seja filtrado por `id + organization_id`;
- run global seja filtrado por `id + organization_id IS NULL`;
- zero linhas afetadas seja falha, não sucesso;
- segunda tentativa de concluir/falhar run terminal falhe fechado;
- falha de ledger seja devolvida como classe inequívoca, preferencialmente `LEDGER_WRITE_FAILED`.

O Router deve verificar o retorno de `ledger.concluir()` e `ledger.falhar()`.

Se `concluir()` falhar depois de uma chamada de provider, o Router não pode entregar o output como sucesso.

## 5. Custo/usage fail-closed

Hoje `calcularCusto()` pode retornar `ok:false` e o Router ainda concluir `SUCCEEDED` com custo nulo.

Corrigir para que:

- depois que um provider for chamado, usage/preço incapaz de produzir custo confiável encerre a execução como `FAILED`;
- não devolver output ao chamador como sucesso;
- run `SUCCEEDED` sempre tenha custo e moeda;
- uso inválido seja distinguível por classe explícita (`USAGE_INVALID`, `COST_CALCULATION_FAILED` ou equivalente coerente);
- TypeScript e CHECK SQL permaneçam sincronizados.

Não usar float para resolver o problema.

## 6. Coerência provider → model → price

Na migration 004A, tornar impossível no banco gravar combinações cruzadas.

Obrigatório provar:

- `ai_runs.provider_id` corresponde ao provider de `ai_runs.ai_model_id`;
- `ai_runs.ai_price_version_id` pertence ao mesmo `ai_model_id` do run.

Preferir composite unique/FK ou mecanismo relacional equivalente, sem trigger se uma constraint resolve.

Adicionar testes/prova SQL para provider/model mismatch e model/price mismatch.

## 7. Invariantes de estado de `ai_runs`

Alinhar schema ao fluxo real:

- `ai_price_version_id` deve ser obrigatório para run de provider aberto pela 004A, salvo prova de caminho autorizado que justifique nullable;
- `SUCCEEDED` exige `estimated_cost`, `currency` e `completed_at`;
- `FAILED` exige `error_class` e `completed_at`;
- `STARTED` exige `completed_at IS NULL`;
- `SUCCEEDED` continua sem `error_class`;
- `FAILED` pode ter custo nulo quando não houve usage confiável.

Não introduzir timestamp de relógio do cliente em CHECK comparando com `created_at`; preservar a lição da 002A sobre clock skew.

## 8. Vigência de modelos

Como `ai_models` possui `effective_from/effective_to`, aplicar a vigência no catálogo.

Preferência:

- `listarCandidatos(em: Date)` ou contrato equivalente;
- `effective_from <= em`;
- `effective_to IS NULL OR effective_to > em`;
- usar o mesmo relógio injetável do Router para teste determinístico.

Modelo expirado não pode ser selecionado apenas porque o status ainda está `ACTIVE`.

## 9. Input schema

Adicionar classe própria para input inválido, por exemplo:

`INPUT_SCHEMA_INVALID`

Provar que:

- falha antes de catálogo/provider;
- não abre run pago;
- não é confundida com `OUTPUT_SCHEMA_INVALID`.

## 10. Adapter ausente — tornar relatório e comportamento coerentes

Adotar a semântica preferida pela auditoria:

- depois de modelo e preço resolvidos, abrir o run;
- se o adapter não estiver registrado, encerrar o run como `FAILED / ADAPTER_NOT_REGISTERED`;
- nenhuma chamada externa ocorre;
- devolver o `runId` da falha;
- manter `PRODUCTION_ADAPTERS` vazio nesta rodada.

Se houver impedimento técnico real para essa semântica, parar e devolver decisão ao GPT; não alterar silenciosamente o relatório para contornar o gate.

## 11. Provas automatizadas mínimas adicionais

Além de manter todas as provas anteriores:

1. `ledger.concluir=false` não retorna sucesso;
2. `ledger.falhar=false` retorna falha explícita de ledger;
3. update de run inexistente não conta como sucesso;
4. tenant B não conclui/falha run de tenant A;
5. run terminal não é reescrito pelo repository path;
6. usage negativo/fracionário após adapter não gera `SUCCEEDED`;
7. custo inválido não entrega output como sucesso;
8. `SUCCEEDED` sem custo/moeda é recusado pelo banco;
9. terminal sem `completed_at` é recusado;
10. `STARTED` com `completed_at` é recusado;
11. provider/model mismatch recusado;
12. model/price mismatch recusado;
13. modelo expirado não é selecionado;
14. input inválido usa classe própria;
15. adapter ausente gera run FAILED auditável e zero chamada externa;
16. nenhum input/output/prompt bruto entra no ledger;
17. fake continua inacessível à produção.

## 12. Aplicação remota e prova SQL

Depois da correção e da reconciliação do arquivo 003B:

1. validar migrations localmente conforme processo do projeto;
2. rodar `supabase db push --linked`;
3. confirmar que `20260824210000` é reconhecida como já aplicada e **não é reaplicada**;
4. aplicar somente a migration 004A ainda pendente;
5. executar a prova SQL remota do mandato 004A, ampliada com os casos desta correção;
6. provar browser sem SELECT/INSERT/UPDATE/DELETE nas quatro tabelas;
7. provar grants mínimos de `service_role`;
8. provar constraints de tier/status/preço/tokens/custo;
9. provar uma única price version aberta por modelo;
10. provar coerência provider/model/price;
11. provar fallback cross-tenant recusado;
12. rollback/cleanup da fixture deve deixar zero lixo.

Se o classificador do Claude Code pedir autorização humana para `db push`/prova mutável, parar no gate e pedir aprovação ao fundador. Não contornar.

## 13. CI e entrega

Executar:

- suíte completa;
- lint;
- typecheck;
- typecheck Edge Functions;
- build;
- CI do PR #13.

Atualizar o relatório 004A ou criar complemento claro da 004A-01 com:

- novo HEAD;
- resultado dos testes;
- CI;
- migration aplicada;
- resultado da prova remota;
- hash/prova de equivalência do arquivo `20260824210000` copiado da 003B;
- zero secrets/providers reais.

Parar em **AGUARDANDO AUDITORIA GPT**.

## 14. Fora de escopo

- provider real;
- API key;
- SDK de IA;
- chamada paga;
- fallback real entre providers/modelos;
- UI administrativa;
- tool calling;
- embeddings/RAG;
- feature de IA de negócio;
- mudança de marca no runtime para Quoron nesta correção;
- qualquer código Meta da 003B além do arquivo de migration exato autorizado;
- promoção funcional da 003B;
- Fase 4;
- campanha/anúncio/gasto.

## 15. Critério de saída

A 004A só volta para auditoria final quando:

- os bloqueadores A–E da auditoria estiverem corrigidos;
- a taxonomia de input estiver corrigida;
- adapter ausente estiver auditável;
- histórico local de migrations estiver reconciliado sem `repair`;
- migration 004A estiver aplicada remotamente com a versão canônica;
- prova SQL remota estiver verde;
- CI estiver verde;
- nenhum provider real/segredo/gasto tiver sido introduzido.