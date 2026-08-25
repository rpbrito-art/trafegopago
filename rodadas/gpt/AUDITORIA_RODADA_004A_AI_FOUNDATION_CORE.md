# AUDITORIA — RODADA 004A: AI FOUNDATION CORE

Data: 2026-08-25

Mandato: `rodadas/gpt/RODADA_004A_AI_FOUNDATION_CORE.md`

Branch auditada: `claude/rodada-004a-ai-foundation-core`

PR: #13

HEAD auditado: `2ed91aef869511c41ab37c173abbc217c6ef9fe6`

CI: `32864284589` — **success**.

Veredito: **ARQUITETURA-BASE APROVADA; RODADA REPROVADA PARA PROMOÇÃO ATÉ CORREÇÃO 004A-01 + PROVA REMOTA.**

---

## 1. O que está correto e deve ser preservado

A auditoria independente confirma como boas decisões:

- branch própria a partir da `main`, sem carregar o código não promovido da 003B;
- módulo `src/lib/ai/` server-only nas fronteiras que executam/tocam banco;
- feature entrega `AI Task`, não escolhe provider/modelo;
- task registry e adapter registry desacoplados;
- fake adapter fora de `src/`, apenas em `test/support/`;
- produção nasce sem provider/adapters reais;
- nenhum SDK, API key ou chamada de rede de IA;
- Tier 0 fora da camada de provider;
- seleção por tier/capability/status, sem `DEPRECATED`/`DISABLED`;
- structured output tratado como `unknown` até Zod;
- custo calculado com `bigint`/escala fixa, sem float para persistência financeira;
- `ai_price_versions` versiona preço com precisão subcentavo;
- `ai_runs` abre antes da chamada ao provider;
- input/output/prompt bruto não são persistidos no ledger;
- fallback cross-tenant recebeu proteção por FK composta;
- RLS habilitado e browser sem acesso direto às quatro tabelas internas;
- `ai_runs` sem DELETE e `ai_price_versions` sem DELETE no caminho normal.

CI real do HEAD auditado executou lint, typecheck, typecheck das Edge Functions, testes e build, todos verdes. A suíte informada pelo executor é 710/710.

Nada no delta cria provider real, credencial, gasto, Meta/Instagram/Ads, tool calling, embeddings ou UI administrativa.

---

## 2. Bloqueio remoto confirmado independentemente

O executor não aplicou a migration da 004A, e isso está correto: o `db push` recusou porque o histórico remoto contém uma migration que a `main` não contém.

Snapshot independente do Supabase:

- histórico remoto termina em `20260824210000_create_meta_asset_selection`;
- essa migration pertence à 003B e já foi aplicada no banco;
- a `main` atual não contém o arquivo correspondente;
- `public.ai_providers`, `public.ai_models`, `public.ai_price_versions` e `public.ai_runs` **ainda não existem** no remoto.

Portanto a prova remota exigida pelo §11 do mandato 004A ainda não aconteceu.

### Decisão de reconciliação

A solução correta não é `migration repair`, não é criar migration com versão diferente via MCP e não é promover a 003B inteira.

A Correção 004A-01 autoriza trazer para a branch 004A **somente o arquivo exato já aplicado**:

`supabase/migrations/20260824210000_create_meta_asset_selection.sql`

fonte obrigatória:

`claude/rodada-003b-meta-asset-discovery-selection`

O conteúdo deve ser byte-equivalente ao arquivo da branch 003B; não reescrever, editar nem recriar.

Razão: o banco já incorporou essa migration e ela já foi provada no remoto na trilha 003B. Colocar o artefato exato no histórico local apenas reconcilia `main/repositório ↔ histórico real do Supabase` e desbloqueia migrations posteriores.

Isso **não promove a Rodada 003B** e não incorpora seu código de discovery/UX/gateway. Incorpora somente o artefato de schema que já existe no banco e que precisa fazer parte do histórico versionado para qualquer desenvolvimento posterior ser promovível.

---

## 3. BLOQUEADOR A — sucesso pode escapar mesmo se o ledger falhar

Arquivo: `src/lib/ai/run-ledger.ts` + `src/lib/ai/router.ts`.

### Problema

`AIRunLedger.concluir()` e `falhar()` retornam `boolean`, mas o Router ignora o resultado.

Exemplo do caminho de sucesso:

1. provider responde;
2. output passa no schema;
3. Router chama `ledger.concluir(...)`;
4. mesmo que a conclusão do run falhe, o Router devolve `ok: true` ao chamador.

Isso viola diretamente o contrato canônico: **toda chamada produtiva precisa registrar `ai_run` e custo**. Uma resposta não pode ser considerada sucesso quando a camada responsável por registrar o gasto falhou.

Há um segundo problema no repositório do ledger: os `UPDATE`s filtram apenas por `id` e retornam `true` sempre que o PostgREST não devolve erro. Um `UPDATE` que afetou zero linhas pode, portanto, ser interpretado como conclusão bem-sucedida.

### Correção obrigatória

- o Router deve falhar fechado quando `concluir()`/`falhar()` não conseguirem comprovar a escrita;
- o ledger deve comprovar que **exatamente um** run foi alterado;
- conclusão/falha deve aceitar apenas run ainda `STARTED`;
- para run tenant-scoped, a mutação privilegiada deve filtrar também a `organization_id` esperada;
- para run global, deve provar explicitamente `organization_id is null`;
- nenhuma mutation privilegiada tenant-scoped pode depender apenas do UUID do run.

A taxonomia pode ganhar classe explícita como `LEDGER_WRITE_FAILED` se isso for a solução mais clara; se o executor propuser outra nomenclatura, deve manter semântica inequívoca e teste próprio.

---

## 4. BLOQUEADOR B — custo inválido pode virar sucesso com custo nulo

Arquivo: `src/lib/ai/router.ts` + `src/lib/ai/pricing.ts`.

### Problema

`calcularCusto()` corretamente rejeita usage/preço inválido. Porém o Router faz:

- `estimatedCost: custo.ok ? custo.custo : null`;
- `currency: custo.ok ? custo.currency : null`;
- e continua podendo concluir o run como `SUCCEEDED` e devolver `ok: true`.

Logo um adapter defeituoso que devolva token negativo/fracionário, ou qualquer inconsistência de custo, pode produzir uma resposta funcional com **custo desconhecido**.

Isso é incompatível com a razão de existir da 004A: contabilizar uso e custo de forma reproduzível.

### Correção obrigatória

Depois que um provider foi realmente chamado:

- custo/usage inválido deve ser desfecho **FAILED**, nunca `SUCCEEDED` com custo nulo;
- registrar usage sanitizado quando for confiável;
- não devolver output ao chamador como sucesso;
- adicionar teste específico provando que usage inválido não produz `ok: true`;
- um run `SUCCEEDED` deve sempre possuir custo e moeda persistidos.

Pode ser criada uma classe explícita como `COST_CALCULATION_FAILED` ou `USAGE_INVALID`; a nomenclatura final deve continuar coerente entre TypeScript e CHECK SQL.

---

## 5. BLOQUEADOR C — banco permite combinações incoerentes de provider/modelo/preço

Arquivo: `supabase/migrations/20260825140000_create_ai_foundation_core.sql`.

### Problema

Hoje `ai_runs` tem FKs independentes:

- `provider_id → ai_providers`;
- `ai_model_id → ai_models`;
- `ai_price_version_id → ai_price_versions`.

Mas o banco não prova que:

- o `ai_model_id` pertence ao `provider_id` gravado no mesmo run;
- o `ai_price_version_id` pertence ao `ai_model_id` gravado no mesmo run.

Um caminho server-side defeituoso poderia, portanto, registrar:

`provider A + modelo B + preço do modelo C`

com todas as FKs individualmente válidas.

Isso destrói a reprodutibilidade do custo justamente na tabela criada para auditá-lo.

### Correção obrigatória

Adicionar constraints relacionais no banco, preferencialmente por chaves/FKs compostas, para tornar impossível:

- provider/model mismatch;
- model/price-version mismatch.

A prova deve inserir combinações cruzadas e obter recusa do Postgres.

---

## 6. BLOQUEADOR D — estado terminal de `ai_runs` está frouxo demais

Na migration atual:

- `ai_price_version_id` é nullable, apesar de o Router só abrir run depois de resolver preço;
- `SUCCEEDED` pode existir com `estimated_cost = null`;
- `SUCCEEDED` pode existir com `completed_at = null`;
- `STARTED` pode existir com `completed_at` preenchido.

### Correção obrigatória

Alinhar as constraints ao fluxo real da 004A:

- todo run aberto para provider deve referenciar a versão de preço usada;
- `SUCCEEDED` exige custo + moeda + `completed_at`;
- `FAILED` exige `error_class` + `completed_at`;
- `STARTED` não deve estar concluído;
- manter a possibilidade de `FAILED` sem custo quando a falha ocorreu antes de usage confiável.

Se houver razão concreta para preservar `ai_price_version_id nullable`, o executor deve demonstrar um caminho autorizado da 004A que crie run sem preço. No código auditado esse caminho não existe.

---

## 7. BLOQUEADOR E — vigência do modelo existe no schema, mas é ignorada no Router

`ai_models` possui `effective_from/effective_to`, porém `catalog.listarCandidatos()` não filtra esses campos.

Consequência: um modelo com `status=ACTIVE` mas `effective_to` no passado pode continuar elegível.

Correção obrigatória: ou a vigência é parte real do modelo e deve ser aplicada na consulta de candidatos, ou os campos devem ser removidos antes da migration ser aplicada. Não manter regra declarada no schema que o runtime ignora.

Preferência da auditoria: manter os campos e filtrar por intervalo `[effective_from, effective_to)` usando o mesmo instante injetável da execução.

---

## 8. CORREÇÃO SEMÂNTICA NECESSÁRIA — input inválido não é output inválido

Hoje input que falha no `inputSchema` retorna `OUTPUT_SCHEMA_INVALID`.

Isso prejudica diagnóstico e futura política de fallback: `AI_ARCHITECTURE.md` determina que input inválido não deve escalar para modelo melhor.

Criar classe explícita `INPUT_SCHEMA_INVALID` ou equivalente inequívoco e provar que:

- falha antes de catálogo/provider;
- não abre run pago;
- não é confundida com output inválido do provider.

---

## 9. Inconsistência factual no relatório/PR

O relatório e o PR afirmam, em essência, que sem adapter o Router “falha e registra”.

No código auditado, o adapter é resolvido **antes** de `ledger.abrir()` e `ADAPTER_NOT_REGISTERED` retorna `runId=null`.

A Correção 004A-01 deve escolher e documentar uma das duas semânticas:

1. adapter ausente é preflight e **não** cria run — então relatório/comentários devem dizer isso; ou
2. como provider/modelo/preço já foram resolvidos, abrir run e encerrá-lo como `ADAPTER_NOT_REGISTERED` para tornar a falha auditável.

Preferência da auditoria: opção 2, porque o mandato exige falha explícita/auditável para adapter ausente e todos os identificadores necessários já são conhecidos nesse ponto. Nenhuma chamada externa ocorre.

---

## 10. Provas exigidas na Correção 004A-01

Além das provas já existentes, incluir pelo menos:

1. `ledger.concluir=false` nunca devolve sucesso;
2. `ledger.falhar=false` produz falha explícita de ledger;
3. UPDATE de run inexistente não conta como sucesso;
4. run tenant A não pode ser concluído/falhado pelo escopo tenant B;
5. run terminal não pode ser concluído/falhado de novo pelo repository path;
6. usage inválido após chamada ao adapter não gera `SUCCEEDED`;
7. `SUCCEEDED` sem custo/moeda é recusado no banco;
8. `SUCCEEDED/FAILED` sem `completed_at` é recusado;
9. `STARTED` com `completed_at` é recusado;
10. provider/model mismatch recusado pelo banco;
11. model/price mismatch recusado pelo banco;
12. modelo fora da vigência não é candidato;
13. input inválido recebe classe própria e não chama provider;
14. adapter ausente segue a semântica auditável escolhida e documentada;
15. todos os testes anteriores continuam verdes.

---

## 11. Gate remoto após correção

Depois de reconciliar o arquivo exato `20260824210000_create_meta_asset_selection.sql` e corrigir a 004A:

1. merge/reconcile latest `main` na branch;
2. `supabase db push --linked` deve reconhecer 003B como migration já aplicada e aplicar **somente** a nova migration 004A ainda pendente;
3. executar a prova SQL remota do mandato;
4. confirmar zero fixture residual;
5. CI final verde;
6. parar em `AGUARDANDO AUDITORIA GPT`.

Não usar `migration repair` e não aplicar a migration 004A com uma versão diferente.

---

## 12. Estado da rodada

- planejada: **sim**;
- autorizada: **sim**;
- código inicial executado: **sim**;
- CI local/PR: **verde**;
- migration remota 004A: **não aplicada**;
- prova remota: **não executada**;
- arquitetura-base: **aprovada para correção incremental**;
- auditoria final: **reprovada por enquanto**;
- promoção: **não autorizada**;
- próxima ação: **Correção 004A-01 pelo Claude Code**.

A decisão canônica de nome permanece separada: **Quoron** é o nome do produto, mas a migração de branding só começa depois que a 004A estiver efetivamente auditada e promovível.