# ESTADO — Quoron

Atualizado: 2026-08-25

Estado incorporado = `main + este arquivo + promoção real`.

## 1. Nome e ambiente

Nome canônico do produto: **Quoron**.

Decisão: `rodadas/gpt/DECISAO_NOME_PRODUTO_QUORON.md`.

Identificadores técnicos legados permanecem temporariamente:

- repo: `rpbrito-art/trafegopago`;
- Supabase project ref: `cbnxdoxpyioxjwgjhbtq`;
- pasta local esperada: `C:\Users\rpbri\Documents\trafegopago`;
- `business-weaver`: fora de escopo.

Não renomear repo, pasta local, project ref do Supabase ou recursos Meta apenas por branding enquanto isso trouxer risco operacional sem ganho funcional.

## 2. Estado incorporado

Promovidas: **000–003A, 004A e 004B**.

- Fase 1 — Supabase, Auth e Tenancy: **ENCERRADA**.
- Fase 2 — Operations, Audit, Queues e Segurança Base: **ENCERRADA**.
- Fase 3 — Meta Connection Foundation: **EM ANDAMENTO / 003B ESTACIONADA / GATE EXTERNO PENDENTE**.
- Fase 6 — AI Foundation: **EM ANDAMENTO; 004A FOUNDATION CORE PROMOVIDA**.
- Growth Context / Branding Quoron: **004B PROMOVIDA**.
- última rodada promovida: **004B — Quoron Branding + Growth Context Foundation**.
- rodada corrente: **004C — Offer Catalog + Business Context Foundation — EXECUTADA, AGUARDANDO AUDITORIA GPT**.

## 3. Promoção 004A — AI Foundation Core

PR #13: mergeada.

Merge: `da2862135eab6897fc44ae361da1298c7071a11f`.

Auditoria: `rodadas/gpt/AUDITORIA_FINAL_004A_AI_FOUNDATION_CORE.md`.

Incorporado:

- catálogo interno de providers/modelos/preços;
- contrato `AI Task` sem feature escolher provider/modelo;
- Router server-only;
- structured output validado;
- ledger `ai_runs` auditável;
- custo com precisão fixa;
- ledger/custo fail-closed;
- coerência provider → model → price version;
- vigência de modelos/preços;
- RLS/ACL server-only;
- fake adapter somente em teste.

Ainda não existe provider real, API key, SDK, chamada paga, fallback real, tool calling, embeddings/RAG ou feature de IA de negócio.

## 4. Promoção 004B — Quoron Branding + Growth Context

PR #14: **MERGEADA**.

HEAD final auditado: `fad941e55b3098c72bfa744f2ce681f2368c33c6`.

CI final: `32879374174` — **success**, 803/803 testes, lint/typecheck/Edge Functions/build verdes.

Merge: `8d9abea9fd8e18a8c9ad08052694aa09f03a31e0`.

Auditoria final:

`rodadas/gpt/AUDITORIA_FINAL_004B_QUORON_GROWTH_CONTEXT.md`.

Veredito:

**004B EXECUTADA, CORRIGIDA, AUDITADA, APROVADA E PROMOVIDA.**

### 4.1 Incorporado

- Quoron consolidado como marca nas superfícies ativas e documentação corrente;
- Home/metadata/auth/conta/objetivo/package usando a marca atual;
- onboarding inicial reduzido para quatro campos essenciais;
- `target_audience` e `acquisition_goal` aceitam `NULL` sem apagar dados existentes;
- `targetAudience` preserva `null` até a UI;
- nova entidade `growth_objectives` separada de `business_profiles`;
- um único objetivo `ACTIVE` por organização;
- histórico preservado ao alterar objetivo;
- troca idempotente e serializada por organização;
- escrita server-side por RPC restrita a `service_role`, com owner/admin e organização/membership ACTIVE;
- RLS de leitura e browser sem escrita;
- rota `/objetivo` com três perguntas em linguagem de negócio;
- resultado desejado separado de observabilidade real;
- fluxo multi-organização falha fechado: nenhuma organização é escolhida implicitamente;
- quatro INFO de FK de `ai_runs` da 004A quitados.

### 4.2 Supabase 004B

Migrations incorporadas:

- `20260825180000_create_growth_objectives`;
- `20260825190000_index_growth_objectives_created_by`.

Não reescrever migrations aplicadas.

Snapshot final de auditoria:

- `growth_objectives` com RLS habilitado;
- uma policy SELECT;
- `authenticated` somente SELECT;
- zero grants browser de INSERT/UPDATE/DELETE;
- RPC sem EXECUTE para anon/authenticated e com EXECUTE para service_role;
- zero fixtures 004B/RLS residuais no snapshot final.

O relatório da correção registra prova RLS real 7/7 com papel `authenticated` e rollback. O conector GPT do Supabase não conseguiu repetir mutação transacional por operar read-only; o script foi inspecionado e os pós-estados remotos foram confirmados independentemente.

## 5. Rodada 003B — ESTACIONADA, NÃO PROMOVIDA

Branch: `claude/rodada-003b-meta-asset-discovery-selection`.

PR #12: draft, open, não mergeada.

HEAD conhecido: `053bc7ca3f25b53954579df30bce598894e718dd`.

CI: `32859795018` — success.

Preservado/auditado na trilha:

- schema remoto de `instagram_accounts` e `ad_accounts` existe;
- Correções 003B-01 e 003B-03 aprovadas;
- investigações 003B-05/Page/IG auditadas como evidência read-only;
- endpoint System User `/{system-user-id}/assigned_pages` preservado para BISU;
- 003B-08 reconexão aprovada em código;
- 003B-09 parser/UX aprovada em código, com E2E real executado.

003B continua **NÃO PROMOVIDA**.

### 5.1 Defeito Meta comprovado

Com o mesmo User Access Token válido:

- `debug_token`: `is_valid=true`, `type=USER`;
- `/me?fields=id,name` → 200;
- `/me?fields=client_business_id` → 400 / code 190;
- `/me?fields=id,client_business_id` → 400 / code 190.

O classifier compartilhado da 003B não pode inferir saúde/tipo da credencial por `client_business_id` desse modo.

A parte `assigned_pages` da arquitetura BISU permanece preservada. A trilha Meta só deve voltar com nova decisão arquitetural e condição operacional adequada.

### 5.2 Restrição operacional Meta

Fatos confirmados:

- limite atual de dois Meta Business Portfolios atingido;
- portfolio bloqueado/inutilizável: `Bizzman5po`;
- `Bizzman5po` e `BizzManiq1` são identidades distintas;
- `BizzManiq1` não deve ser tratado como bloqueado nem como cliente BISU sem prova;
- Quoron possui o app canônico e apareceu inelegível como cliente do próprio app no fluxo BISU observado.

Continua proibido por tentativa:

- criar terceiro portfolio;
- excluir `Bizzman5po`;
- usar empresa/portfolio de terceiro;
- alterar app/configuração/scopes;
- promover 003B sem E2E BISU real.

## 6. Gate Meta não bloqueia o restante do produto

Decisão:

`rodadas/gpt/DECISAO_DESBLOQUEIO_DESENVOLVIMENTO_META_GATE.md`.

O gate Meta é trilha pendente, não bloqueio global. Capacidades independentes podem continuar a partir da `main`.

## 7. Continua NÃO autorizado fora do mandato 004C

### Meta

- promover/mergear 003B;
- iniciar importação/publicação real Instagram dependente da arquitetura ainda bloqueada;
- declarar USER arquitetura definitiva;
- remover BISU;
- alterar scopes/app/Business Login Configuration;
- criar/excluir/mover Business Portfolio;
- transferir ativos;
- usar terceiro;
- campanha/anúncio/gasto.

### IA

- provider real;
- API key;
- chamada paga;
- SDK de provider;
- fallback real;
- tool calling;
- embeddings/RAG;
- geração real de copy/imagem;
- IA inferir automaticamente objetivo do usuário;
- qualquer capacidade de IA executar gasto.

### Produto fora da 004C

- vínculo oferta → `growth_objectives`;
- seletor multi-organização;
- Content Intelligence/Oportunidades;
- Financial Approval;
- CRM/leads;
- App Shell/Hoje definitivo;
- e-commerce, estoque, SKU, pedidos ou pagamentos;
- qualquer nova capacidade substantiva além do escopo explícito da 004C.

### Branding técnico externo

- renomear repositório GitHub;
- renomear pasta local;
- recriar/trocar Supabase project ref;
- renomear/mover recursos Meta.

## 8. Rodada 004C — EXECUTADA, AGUARDANDO AUDITORIA

Mandato:

`rodadas/gpt/RODADA_004C_OFFER_CATALOG_BUSINESS_CONTEXT.md`

Branch: `claude/rodada-004c-offer-catalog-business-context`.

Base: `main` em `bd32e2a`, após a promoção da 004B.

Status: **EXECUTADA — AGUARDANDO AUDITORIA GPT**. Não promovida, não mergeada.

Relatório: `rodadas/claude/RELATORIO_RODADA_004C_OFFER_CATALOG_BUSINESS_CONTEXT.md`.

### 8.1 Delta executado

- `business_offers` (identidade) separada de `business_offer_versions` (conteúdo versionado);
- FK composta `(organization_id, offer_id)` impede versão de outro tenant pelo banco;
- no máximo uma versão corrente por oferta; edição material supersede e cria a próxima na mesma transação;
- reenvio idêntico idempotente, inclusive na criação;
- constraints impedem estado contraditório de preço; `QUOTE/FREE/NOT_INFORMED` não persistem número; dinheiro em unidade menor inteira, sem float;
- `save_business_offer` e `archive_business_offer` server-only, `service_role`, owner/admin, organização e membership ACTIVE, serializadas por organização;
- moeda vem de `organizations.default_currency`, lida server-side; o browser não escolhe moeda;
- RLS de leitura por membership ACTIVE; browser sem INSERT/UPDATE/DELETE;
- rota `/ofertas` em português simples, sem enum, uuid ou número de versão na tela; arquivar com confirmação em duas etapas;
- multi-organização segue falhando fechado: nenhuma escrita e nenhuma leitura de catálogo em contexto ambíguo;
- `business_profiles.primary_offer` preservado como sugestão editável, sem conversão automática;
- harmonização documental da centralidade da mídia paga em `MVP_CANONICAL`, `IMPLEMENTATION_ROADMAP`, `.gpt/PROJECT_PROMPT`, `TECHNICAL_SPEC` e `DATA_MODEL`.

### 8.2 Supabase remoto da 004C

Migration aplicada: `20260825210000_create_business_offers`, publicada na branch antes do `db push`.

Snapshot independente:

- RLS habilitado nas duas tabelas, uma policy SELECT em cada;
- `anon` sem grants; `authenticated` somente SELECT;
- `service_role` SELECT/INSERT/UPDATE, sem DELETE;
- RPCs sem EXECUTE para anon/authenticated, com EXECUTE para service_role;
- zero fixtures residuais;
- advisors sem FK do delta descoberta; dois INFO `unused_index` de `created_by`, esperados em tabela vazia.

Esta migration **não deve ser reescrita**.

### 8.3 Provas

- `scripts/sql/business-offers-004c-proof.sql` → **51 casos, 51 passaram, 0 falharam**, transacional com rollback e leitura real sob papel `authenticated`;
- vitest dos arquivos novos e afetados → 87/87;
- `tsc --noEmit` e `eslint` limpos;
- suíte completa na CI final do PR.

## 9. Próxima ação autorizada

Próximo ator: **GPT auditor**.

Auditar a 004C na branch/PR indicados acima. Claude não promove, não mergeia e não declara a rodada aprovada.

## 10. Regra de continuidade

- distinguir planejado, autorizado, executado, auditado, aprovado e promovido;
- estado efetivamente incorporado = `main + estado.md + promoção real`;
- não promover por relatório do Claude sem auditoria independente;
- gate Meta não bloqueia desenvolvimento independente;
- hipótese Meta não vira fato sem prova;
- nomes de recursos Meta só recebem estado/função quando comprovados;
- não reescrever histórico antigo por branding;
- fundador não atua como barramento de contexto entre GPT e Claude;
- ação manual externa deve ser explicada pelo GPT em linguagem simples, uma ação principal por vez.
