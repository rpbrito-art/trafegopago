# ESTADO — Quoron

Atualizado: 2026-08-25

Estado incorporado = `main + este arquivo + promoção real`.

## 1. Nome e ambiente

Nome canônico do produto: **Quoron**.

Identificadores técnicos legados permanecem temporariamente:

- repo: `rpbrito-art/trafegopago`;
- Supabase project ref: `cbnxdoxpyioxjwgjhbtq`;
- pasta local esperada: `C:\Users\rpbri\Documents\trafegopago`;
- `business-weaver`: fora de escopo.

Não renomear repo, pasta local, project ref do Supabase ou recursos Meta apenas por branding enquanto isso trouxer risco operacional sem ganho funcional.

## 2. Estado incorporado

Promovidas: **000–003A, 004A, 004B e 004C**.

- Fase 1 — Supabase, Auth e Tenancy: **ENCERRADA**.
- Fase 2 — Operations, Audit, Queues e Segurança Base: **ENCERRADA**.
- Fase 3 — Meta Connection Foundation: **EM ANDAMENTO / 003B ESTACIONADA / GATE EXTERNO PENDENTE**.
- Fase 6 — AI Foundation: **EM ANDAMENTO; 004A FOUNDATION CORE PROMOVIDA**.
- Growth Context / Branding Quoron: **004B PROMOVIDA**.
- Offer Catalog / Business Context: **004C PROMOVIDA**.
- última rodada promovida: **004C — Offer Catalog + Business Context Foundation**.
- rodada corrente: **004D — Guided Growth Journey Foundation — PLANEJADA E AUTORIZADA, AINDA NÃO EXECUTADA**.

## 3. Promoção 004A — AI Foundation Core

PR #13 mergeada em `da2862135eab6897fc44ae361da1298c7071a11f`.

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

PR #14 mergeada.

Merge: `8d9abea9fd8e18a8c9ad08052694aa09f03a31e0`.

Auditoria: `rodadas/gpt/AUDITORIA_FINAL_004B_QUORON_GROWTH_CONTEXT.md`.

Incorporado:

- Quoron consolidado como marca ativa;
- onboarding inicial reduzido a quatro campos essenciais;
- `target_audience` e `acquisition_goal` podem ser nulos sem perda de dado existente;
- `growth_objectives` separada de `business_profiles`;
- um único objetivo ACTIVE por organização, histórico preservado e troca idempotente/serializada;
- escrita server-side owner/admin e RLS de leitura;
- rota `/objetivo` com linguagem de negócio;
- resultado desejado separado de observabilidade real;
- multi-organização fail-closed.

## 5. Promoção 004C — Offer Catalog + Business Context

Mandato: `rodadas/gpt/RODADA_004C_OFFER_CATALOG_BUSINESS_CONTEXT.md`.

PR #15: **MERGEADA**.

HEAD final reauditorado: `0339bfb1b5fc1060e108fb73a0c4a5cad399584a`.

Merge: `bafdc7a327ec9f67ab99065b4cb1405a5695a57c`.

CI final do HEAD do PR: `32888062131` — **success**.

CI pós-merge na `main`: `32889061946` — **success**; lint, typecheck, Edge Functions, testes e build verdes.

Auditoria inicial: `rodadas/gpt/AUDITORIA_004C_OFFER_CATALOG_BUSINESS_CONTEXT.md`.

Correção: `rodadas/gpt/CORRECAO_004C_01_IMUTABILIDADE_VERSOES_OFERTA.md`.

Auditoria final: `rodadas/gpt/AUDITORIA_FINAL_004C_OFFER_CATALOG_BUSINESS_CONTEXT.md`.

Veredito:

**004C EXECUTADA, CORRIGIDA, REAUDITADA, APROVADA E PROMOVIDA.**

### 5.1 Incorporado

- `business_offers` como identidade estável da oferta;
- `business_offer_versions` como conteúdo versionado;
- FK composta tenant-safe entre versão e oferta;
- uma única versão corrente por oferta;
- edição material preserva a versão anterior e cria nova versão;
- reenvio idêntico idempotente;
- dinheiro em unidade menor inteira, sem float;
- formas de preço estruturadas e constraints de coerência;
- criação/edição/arquivamento server-side com owner/admin, organização e membership ACTIVE;
- RLS de leitura; browser sem escrita;
- multi-organização fail-closed;
- rota `/ofertas` em português simples;
- `business_profiles.primary_offer` preservado apenas como sugestão editável, sem conversão automática para fato estruturado.

### 5.2 Correção 004C-01 — memória histórica protegida

Migration aditiva:

- `20260825220000_enforce_offer_version_immutability`.

A migration aplicada anteriormente `20260825210000_create_business_offers` não foi reescrita.

A correção garante no banco:

- `service_role` só pode atualizar `superseded_at` em `business_offer_versions`;
- conteúdo de uma versão não pode ser reescrito em place;
- versão já superseded não pode ser alterada nem reativada;
- alterar conteúdo junto com o supersede é recusado;
- a única transição normal de UPDATE é `superseded_at: NULL -> timestamp`;
- trigger faz a invariante valer inclusive contra caminho privilegiado que ignore grants.

Provas específicas: **25/25** na correção e **51/51** na regressão da 004C.

## 6. Visão de produto canônica

Canônico: `docs/01-produto/AGENTIC_PRODUCT_CANONICAL.md`.

Tese central vigente:

**Quoron é um agente de inteligência de crescimento para profissionais liberais e pequenos negócios, operado por uma plataforma SaaS nativa.**

O produto deve compreender progressivamente o negócio, observar evidências reais, confrontar declarado x observado, diagnosticar, ensinar, recomendar, pedir decisão humana quando necessária, executar o autorizado, medir e aprender.

Fluxo conceitual:

`compreender → observar → confrontar → diagnosticar → ensinar → recomendar → decidir → executar → medir → aprender → próximo passo`

Leis complementares:

- a complexidade pertence ao sistema, não ao usuário;
- o usuário não precisa dominar marketing digital para usar o Quoron;
- o sistema deve ensinar o necessário para preservar soberania humana sobre decisões do negócio;
- aprendizagem deve permanecer baseada em evidência, separando fato, interpretação e hipótese.

## 7. Rodada 003B — ESTACIONADA, NÃO PROMOVIDA

Branch: `claude/rodada-003b-meta-asset-discovery-selection`.

PR #12: draft, open, não mergeada.

HEAD conhecido: `053bc7ca3f25b53954579df30bce598894e718dd`.

CI: `32859795018` — success.

### 7.1 Defeito Meta comprovado

Com o mesmo User Access Token válido:

- `debug_token`: `is_valid=true`, `type=USER`;
- `/me?fields=id,name` → 200;
- `/me?fields=client_business_id` → 400 / code 190;
- `/me?fields=id,client_business_id` → 400 / code 190.

O classifier compartilhado da 003B não pode inferir saúde/tipo da credencial por `client_business_id` desse modo.

A arquitetura BISU/System User preservada na 003B continua evidência técnica, não arquitetura comercial definitiva.

### 7.2 Restrição operacional Meta

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

## 8. Onboarding Meta guiado — requisito central, execução bloqueada

Canônico: `docs/01-produto/META_ONBOARDING_CANONICAL.md`.

A experiência futura deve esconder do pequeno negócio a complexidade técnica da Meta sempre que possível.

Princípio:

**A configuração técnica da Meta pertence ao Quoron; ao usuário pertencem identidade, consentimento, propriedade dos ativos e decisões financeiras.**

Status:

**REQUISITO CANÔNICO / PLANEJADO, MAS NÃO AUTORIZADO PARA IMPLEMENTAÇÃO E BLOQUEADO PELO GATE EXTERNO META.**

Só retomar depois que o fundador informar que resolveu o problema do portfólio empresarial restrito ou que existe nova condição operacional comprovadamente utilizável. Antes de nova implementação, o GPT deve rever a documentação oficial Meta vigente e decidir a arquitetura comercial de onboarding.

## 9. Rodada corrente 004D — AUTORIZADA PARA EXECUÇÃO

Mandato:

`rodadas/gpt/RODADA_004D_GUIDED_GROWTH_JOURNEY_FOUNDATION.md`

Status: **PLANEJADA E AUTORIZADA; AINDA NÃO EXECUTADA**.

Base: `main` após a promoção da 004C e consolidação do `AGENTIC_PRODUCT_CANONICAL.md`.

Branch sugerida:

`claude/rodada-004d-guided-growth-journey`

Objetivo resumido:

- criar o **foco atual** do objetivo: uma oferta específica ou o negócio como um todo;
- preservar histórico ao definir/mudar foco, sem reescrever objetivo vigente silenciosamente;
- criar motor determinístico de próximo passo, sem IA real;
- criar `/inicio` como entrada autenticada guiada inicial, sem ser App Shell/Hoje definitivo;
- criar escolha simples de foco;
- conduzir `negócio → objetivo → ofertas → foco → base estratégica pronta`;
- manter multi-organização fail-closed, RLS e escrita server-side segura;
- não tocar Meta, provider real de IA, Ads, CRM ou demais capacidades externas.

A 004D é a primeira rodada autorizada a criar o vínculo oferta → objetivo, exclusivamente por meio do conceito de **foco** definido no mandato.

## 10. Continua NÃO autorizado fora do mandato 004D

### Meta

- promover/mergear 003B;
- iniciar importação/publicação real Instagram dependente da arquitetura bloqueada;
- implementar onboarding Meta guiado antes da abertura do gate;
- declarar USER ou BISU como arquitetura comercial definitiva sem nova decisão;
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
- IA inferir automaticamente objetivo, foco ou próximo passo;
- qualquer capacidade de IA executar gasto.

### Produto fora da 004D

- seletor multi-organização;
- Content Intelligence/Oportunidades;
- personas/públicos;
- crítica/geração real de conteúdo;
- Financial Approval;
- Ads/experimentos/scale;
- CRM/leads;
- WhatsApp/e-mail automatizado;
- pesquisas com clientes;
- conversões;
- Strategic Insights;
- App Shell/Hoje definitivo;
- notificações;
- múltiplos focos simultâneos;
- e-commerce, estoque, SKU, pedidos ou pagamentos;
- score de maturidade/gamificação;
- qualquer capacidade substantiva além do escopo explícito da 004D.

### Branding técnico externo

- renomear repositório GitHub;
- renomear pasta local;
- recriar/trocar Supabase project ref;
- renomear/mover recursos Meta.

## 11. Próxima ação autorizada

Próximo ator: **Claude Code**.

O fundador pode ativá-lo pelo fluxo normal do projeto (`/proxima`).

Claude deve:

1. partir da `main` atualizada;
2. ler `estado.md`;
3. ler `rodadas/gpt/RODADA_004D_GUIDED_GROWTH_JOURNEY_FOUNDATION.md`;
4. cumprir integralmente o READ SET obrigatório do mandato;
5. criar `claude/rodada-004d-guided-growth-journey` e executar somente o delta autorizado;
6. publicar migration/provas antes de eventual mutação remota e parar em qualquer gate humano/de segurança;
7. manter Meta e IA real intocados;
8. finalizar com relatório, PR, CI e `estado.md` da branch em **004D EXECUTADA — AGUARDANDO AUDITORIA GPT**.

Claude não deve promover nem mergear a rodada.

Depois da execução, o próximo ator volta a ser o **GPT auditor**.

## 12. Regra de continuidade

- distinguir planejado, autorizado, executado, auditado, aprovado e promovido;
- estado efetivamente incorporado = `main + estado.md + promoção real`;
- não promover por relatório do Claude sem auditoria independente;
- gate Meta não bloqueia desenvolvimento independente;
- hipótese Meta não vira fato sem prova;
- nomes de recursos Meta só recebem estado/função quando comprovados;
- fundador não atua como barramento de contexto entre GPT e Claude;
- ação manual externa deve ser explicada pelo GPT em linguagem simples, uma ação principal por vez.
