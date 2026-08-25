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

Promovidas: **000–003A, 004A, 004B, 004C e 004D**.

- Fase 1 — Supabase, Auth e Tenancy: **ENCERRADA**.
- Fase 2 — Operations, Audit, Queues e Segurança Base: **ENCERRADA**.
- Fase 3 — Meta Connection Foundation: **EM ANDAMENTO / 003B ESTACIONADA / GATE EXTERNO PENDENTE**.
- Fase 6 — AI Foundation: **EM ANDAMENTO; 004A FOUNDATION CORE PROMOVIDA; 004E AINDA NÃO PROMOVIDA**.
- Growth Context / Branding Quoron: **004B PROMOVIDA**.
- Offer Catalog / Business Context: **004C PROMOVIDA**.
- Guided Growth Journey / Focus Foundation: **004D PROMOVIDA**.
- última rodada promovida: **004D — Guided Growth Journey Foundation**.
- rodada corrente: **004E — Declared Context Review + First Real AI — IMPLEMENTADA ATÉ GATE, AUDITADA E BLOQUEADA ANTES DA CREDENCIAL PAGA; CORREÇÃO 004E-01 AUTORIZADA**.

## 3. Promoções recentes incorporadas

### 004A — AI Foundation Core

PR #13 mergeada em `da2862135eab6897fc44ae361da1298c7071a11f`.

Incorporado:

- catálogo interno de providers/modelos/preços;
- contrato `AI Task` desacoplado de provider/modelo;
- Router server-only;
- structured output validado;
- ledger `ai_runs` auditável;
- custo com precisão fixa e versão de preço;
- RLS/ACL server-only;
- fake adapter apenas em teste.

No estado promovido até 004D ainda não há chamada paga de IA.

### 004B — Quoron Branding + Growth Context

PR #14 mergeada em `8d9abea9fd8e18a8c9ad08052694aa09f03a31e0`.

Incorporado:

- marca Quoron;
- onboarding inicial reduzido;
- `growth_objectives` versionado;
- objetivo/jornada/sucesso separados do perfil;
- RLS e multi-org fail-closed.

### 004C — Offer Catalog + Business Context

PR #15 mergeada em `bafdc7a327ec9f67ab99065b4cb1405a5695a57c`.

Incorporado:

- `business_offers` + `business_offer_versions`;
- preço estruturado em unidade menor inteira;
- histórico imutável;
- edição por supersede + nova versão;
- browser sem escrita;
- `/ofertas` em linguagem simples.

Correção 004C-01 protege imutabilidade no banco. Provas: 25/25 + regressão 51/51.

### 004D — Guided Growth Journey Foundation

PR #16 mergeada em `678c78cc9f9fc29b276d534c46ef4375277a2bd4`.

Auditoria final: `rodadas/gpt/AUDITORIA_FINAL_004D_GUIDED_GROWTH_JOURNEY_FOUNDATION.md`.

Incorporado:

- foco atual `BUSINESS | OFFER | NULL`;
- foco versionado e tenant-safe;
- `/inicio` como entrada autenticada guiada;
- `/foco` para decisão humana;
- motor determinístico `decideJourneyStep()` sem IA;
- memória estratégica de `growth_objectives` protegida contra reescrita privilegiada.

Provas da correção 004D-01: 30/30 + regressão 32/32.

## 4. Visão de produto canônica

Canônico: `docs/01-produto/AGENTIC_PRODUCT_CANONICAL.md`.

Tese central:

**Quoron é um agente de inteligência de crescimento para profissionais liberais e pequenos negócios, operado por uma plataforma SaaS nativa.**

Fluxo conceitual:

`compreender → observar → confrontar → diagnosticar → ensinar → recomendar → decidir → executar → medir → aprender → próximo passo`

Leis vigentes:

- a complexidade pertence ao sistema, não ao usuário;
- o usuário não precisa dominar marketing digital para usar o Quoron;
- o sistema ensina o necessário para preservar soberania humana;
- aprendizagem material deve ter evidência e separar fato, interpretação e hipótese.

## 5. Rodada 003B — ESTACIONADA, NÃO PROMOVIDA

Branch: `claude/rodada-003b-meta-asset-discovery-selection`.

PR #12: draft/open/não mergeada.

HEAD conhecido: `053bc7ca3f25b53954579df30bce598894e718dd`.

CI: `32859795018` — success.

Defeito comprovado com o mesmo User Access Token válido:

- `debug_token`: válido / USER;
- `/me?fields=id,name` → 200;
- `/me?fields=client_business_id` → 400 / code 190;
- `/me?fields=id,client_business_id` → 400 / code 190.

O classifier da 003B não pode inferir saúde/tipo da credencial por `client_business_id` desse modo.

Restrição operacional Meta:

- limite atual de dois Business Portfolios atingido;
- portfolio bloqueado/inutilizável: `Bizzman5po`;
- `Bizzman5po` e `BizzManiq1` são distintos;
- não criar terceiro portfolio;
- não excluir `Bizzman5po` por tentativa;
- não usar portfolio de terceiro;
- não alterar app/scopes/configuração por tentativa;
- não promover 003B sem E2E real.

## 6. Onboarding Meta guiado — requisito canônico, execução bloqueada

Canônico: `docs/01-produto/META_ONBOARDING_CANONICAL.md`.

Princípio:

**A configuração técnica da Meta pertence ao Quoron; ao usuário pertencem identidade, consentimento, propriedade dos ativos e decisões financeiras.**

Status:

**REQUISITO CANÔNICO / PLANEJADO, MAS NÃO AUTORIZADO PARA IMPLEMENTAÇÃO E BLOQUEADO PELO GATE EXTERNO META.**

Quando o fundador informar que o problema do portfolio restrito foi resolvido, GPT deve primeiro rever documentação oficial Meta vigente e decidir a arquitetura comercial antes de nova rodada.

## 7. Rodada 004E — ESTADO CORRENTE

Mandato:

`rodadas/gpt/RODADA_004E_DECLARED_CONTEXT_REVIEW_FIRST_REAL_AI.md`

Branch:

`claude/rodada-004e-declared-context-review-first-real-ai`

PR #17: **draft/open/não mergeada**.

HEAD auditado:

`72510c595518aefe72301dd88b4e1362fb8d89b6`

CI auditada:

`32904274001` — **success**; 973/973, lint, typecheck, Edge Functions e build verdes.

Relatório Claude:

`rodadas/claude/RELATORIO_RODADA_004E_DECLARED_CONTEXT_REVIEW_FIRST_REAL_AI.md`

Auditoria GPT:

`rodadas/gpt/AUDITORIA_004E_DECLARED_CONTEXT_REVIEW_FIRST_REAL_AI.md`

Veredito:

**004E IMPLEMENTADA PARCIALMENTE E AUDITADA, MAS NÃO APROVADA NEM PROMOVIDA. CREDENCIAL PAGA AINDA BLOQUEADA.**

### 7.1 O que já está correto

- task `DECLARED_BUSINESS_CONTEXT_REVIEW@v1`, tenant-scoped, Tier 1;
- feature continua desacoplada de provider/modelo;
- adapter nativo `@google/genai` 2.18.0, server-only;
- provider `google_gemini` e modelo `gemini-2.5-flash-lite` catalogados;
- preço Standard Paid catalogado: USD 0.10 input / 0.40 output / 0.01 cached input por 1M tokens;
- snapshot declarado mínimo;
- grounding por `evidenceRef` fail-closed;
- `/revisao` com aviso estático de que não observou mercado/Instagram;
- render não chama provider;
- migration `20260825250000_create_declared_context_review` aplicada remotamente;
- `declared_context_reviews` tenant-safe, browser sem escrita e imutável;
- remoto confirmado com 1 provider, 1 modelo, 1 preço aberto e zero runs/reviews reais da task;
- nenhuma chave foi configurada e nenhuma chamada Gemini real ocorreu.

**A migration `20260825250000` já aplicada não pode ser reescrita.**

### 7.2 Bloqueios da auditoria

#### A — schema do provider

O JSON Schema enviado por `responseJsonSchema` contém `maxLength` e `nullable`, keywords que não constam no subconjunto suportado pela documentação oficial atual do Gemini/SDK. A primeira chamada real pode ser rejeitada.

#### B — concorrência/custo

Fluxo atual `cache → count → provider → insert` não reserva atomicamente a chamada. Requisições concorrentes podem duplicar custo para o mesmo fingerprint ou ultrapassar o limite de 3/h.

#### C — mensagem de custo falsa

`requestContextReviewAction` afirma que “nada foi cobrado” quando uma revisão não fica pronta. Isso não é garantido após provider chamado, grounding/persistência falhos ou timeout. O SDK informa que abortar no cliente não necessariamente cancela processamento/cobrança no serviço.

#### D — E2E incompleto

`scripts/e2e-declared-context-review.mjs` chama diretamente o Router e não persiste `declared_context_reviews`, embora o §15 exija artefato real.

#### E — eval incompleta

As 12 fixtures atuais avaliam snapshot/fingerprint, não a resposta da task. Falta avaliar schema/refs/fatos externos/lacunas/tensões/prompt injection/linguagem da saída real.

## 8. Correção 004E-01 — AUTORIZADA

Mandato:

`rodadas/gpt/CORRECAO_004E_01_PREPAID_SAFETY_PROVIDER_CONTRACT.md`

Objetivo:

- corrigir JSON Schema para o subconjunto oficial do Gemini;
- tornar cache + rate limit atômicos contra concorrência antes de qualquer chamada paga;
- remover promessa falsa de ausência de cobrança;
- preparar E2E que realmente persista artefato + prove cache;
- preparar eval real das 12 fixtures;
- manter **zero chamadas pagas** durante a correção.

Se precisar de banco, criar migration aditiva nova; nunca editar `20260825250000` nem anteriores.

Status esperado do Claude:

**CORREÇÃO 004E-01 EXECUTADA — AGUARDANDO REAUDITORIA GPT ANTES DO GATE DE CREDENCIAL PAGA**.

## 9. Continua NÃO autorizado

### Gate pago 004E

Até reauditoria GPT da 004E-01:

- NÃO criar/configurar/usar `GEMINI_API_KEY` no projeto;
- NÃO executar chamada Gemini real;
- NÃO rodar eval paga;
- NÃO rodar E2E pago;
- NÃO mergear/promover PR #17.

### Meta

- promover/mergear 003B;
- iniciar importação/publicação real Instagram dependente da arquitetura bloqueada;
- implementar onboarding Meta guiado antes da abertura do gate;
- alterar scopes/app/Business Login Configuration;
- criar/excluir/mover Business Portfolio;
- transferir ativos;
- usar terceiro;
- campanha/anúncio/gasto.

### IA fora da 004E

- segundo provider real;
- fallback real multi-provider;
- web search/grounding externo;
- tool calling;
- embeddings/RAG;
- geração real de copy/imagem;
- Content Intelligence;
- IA alterar automaticamente objetivo, foco, preço ou oferta;
- qualquer capacidade de IA executar gasto ou ação externa;
- Free Tier Gemini com dados reais de clientes.

### Produto

- seletor multi-organização;
- personas/públicos observados;
- Financial Approval;
- Ads/experimentos/scale;
- CRM/leads;
- WhatsApp/e-mail automatizado;
- surveys/conversões;
- Strategic Insights;
- App Shell/Hoje definitivo;
- notificações;
- múltiplos focos simultâneos;
- e-commerce/estoque/SKU/pedidos/pagamentos;
- score/gamificação.

### Branding técnico externo

- renomear repositório GitHub;
- renomear pasta local;
- recriar/trocar Supabase project ref;
- renomear/mover recursos Meta.

## 10. Correção 004E-01 — EXECUTADA

Mandato: `rodadas/gpt/CORRECAO_004E_01_PREPAID_SAFETY_PROVIDER_CONTRACT.md`.

Branch: `claude/rodada-004e-declared-context-review-first-real-ai` · PR #17 mantido aberto, draft, não mergeado.

Status: **CORREÇÃO 004E-01 EXECUTADA — AGUARDANDO REAUDITORIA GPT ANTES DO GATE DE CREDENCIAL PAGA**.

Relatório: `rodadas/claude/RELATORIO_RODADA_004E_DECLARED_CONTEXT_REVIEW_FIRST_REAL_AI.md` §7.

**Nenhuma chamada paga foi feita.** `GEMINI_API_KEY` continua ausente e não deve ser disponibilizada antes da reauditoria.

### 10.1 Bloqueios fechados

- **A** — o JSON Schema enviado ao provider passou a usar só o subconjunto oficial: `maxLength` e `nullable` removidos, `nextQuestion` como união de tipos `["object","null"]`, limites mantidos no Zod, e teste de allowlist recursiva que falha se alguém reintroduzir keyword;
- **B** — reserva atômica por RPC serializada por advisory lock decide cache/in-flight/papel/teto num único passo; índice único parcial impede duas reservas do mesmo contexto; reserva órfã expira e é recuperável; tentativa falha continua consumindo cota;
- **C** — a promessa de que "nada foi cobrado" saiu da UI: depois de chamar o provider não há como garanti-la;
- **D** — o E2E passou a chamar o serviço produtivo e provar artefato, tenant, modelo, usage, custo reproduzível e cache;
- **E** — harness de eval avalia a resposta da task nos 12 casos por invariantes, uma execução por caso, sem retry.

Achado próprio: duas FKs do delta 004E estavam sem cobertura porque os índices tinham as colunas invertidas. Migration `20260825270000` corrige.

### 10.2 Supabase remoto

Migrations aplicadas nesta correção, ambas aditivas e publicadas antes do `db push`:

- `20260825260000_create_review_attempt_reservation`;
- `20260825270000_index_review_run_foreign_keys`.

Nenhuma migration anterior foi reescrita.

Prova: `scripts/sql/review-attempt-reservation-004e01-proof.sql` → **23 casos, 23 passaram, 0 falharam**, transacional com rollback e zero fixtures residuais. Os dois `unindexed_foreign_keys` do delta foram quitados.

### 10.3 Provas locais

- suíte completa **983/983** em 48 arquivos;
- testes de concorrência com chamadas simultâneas, não sequenciais;
- `tsc --noEmit` e `eslint` limpos;
- `npm run e2e:review` e `npm run eval:review` param no gate com código 2, sem chamar nada.

### 10.4 Próxima ação autorizada

Próximo ator: **GPT auditor**.

Reauditar a Correção 004E-01 no PR #17. **Somente após aprovação** o GPT pode orientar o fundador a criar/configurar a credencial Paid Tier e liberar a prova real.

Claude não promove, não mergeia e não pede a chave ao fundador.

## 11. Regra de continuidade

- distinguir planejado, autorizado, executado, auditado, aprovado e promovido;
- estado efetivamente incorporado = `main + estado.md + promoção real`;
- migration remota não equivale a promoção;
- não promover por relatório do Claude sem auditoria independente;
- gate Meta não bloqueia desenvolvimento independente;
- hipótese Meta não vira fato sem prova;
- fundador não atua como barramento de contexto entre GPT e Claude;
- ação manual externa deve ser explicada pelo GPT em linguagem simples, uma ação principal por vez.