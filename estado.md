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
- rodada corrente: **004E — Declared Context Review + First Real AI — IMPLEMENTADA ATÉ GATE, AUDITADA; 004E-01 EXECUTADA E REAUDITADA; 004E-02 AUTORIZADA; CREDENCIAL PAGA AINDA BLOQUEADA**.

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

HEAD reauditorado da Correção 004E-01:

`70b6176c0e304ab7c2dfa9f58c04eb2de62e6d29`

CI do HEAD:

`32908387052` — **success**; install, lint, typecheck, Edge Functions, testes e build verdes. Suíte da correção reportada em **983/983**.

Relatório Claude:

`rodadas/claude/RELATORIO_RODADA_004E_DECLARED_CONTEXT_REVIEW_FIRST_REAL_AI.md`

Auditorias GPT:

- `rodadas/gpt/AUDITORIA_004E_DECLARED_CONTEXT_REVIEW_FIRST_REAL_AI.md`;
- `rodadas/gpt/AUDITORIA_004E_01_PREPAID_SAFETY_PROVIDER_CONTRACT.md`.

Veredito atual:

**004E NÃO APROVADA NEM PROMOVIDA. 004E-01 FOI EXECUTADA E REAUDITADA, MAS A CREDENCIAL PAGA CONTINUA BLOQUEADA ATÉ A 004E-02.**

### 7.1 O que a 004E/004E-01 já fechou

- task `DECLARED_BUSINESS_CONTEXT_REVIEW@v1`, tenant-scoped, Tier 1;
- feature desacoplada de provider/modelo;
- adapter nativo `@google/genai` 2.18.0, server-only;
- provider `google_gemini` e modelo `gemini-2.5-flash-lite` catalogados;
- preço Standard Paid catalogado: USD 0.10 input / 0.40 output / 0.01 cached input por 1M tokens;
- snapshot declarado mínimo e grounding por `evidenceRef` fail-closed;
- `/revisao` com aviso estático de que não observou mercado/Instagram;
- render não chama provider;
- JSON Schema enviado ao Gemini restrito ao subconjunto oficial, com limites de texto mantidos no Zod;
- reserva atômica antes do Router, serializada por organização;
- mesmo fingerprint concorrente não recebe duas reservas ativas;
- teto de 3 tentativas/h por organização protegido no banco;
- reserva órfã expira e é recuperável;
- mensagem falsa de ausência de cobrança removida;
- E2E preparado para usar o serviço produtivo, persistir artefato, conferir run/custo e provar cache;
- harness pago de eval preparado com 12 casos sintéticos e sem retry automático.

### 7.2 Migrations 004E já aplicadas remotamente — NÃO REESCREVER

- `20260825250000_create_declared_context_review`;
- `20260825260000_create_review_attempt_reservation`;
- `20260825270000_index_review_run_foreign_keys`.

Reauditoria GPT confirmou no remoto:

- tabela de tentativas e RPCs de reserva/finalização presentes;
- fronteira do browser fechada;
- índices finais presentes;
- `declared_context_review_attempts = 0`;
- `declared_context_reviews = 0`;
- `ai_runs` da task = 0;
- nenhuma chamada Gemini real ocorreu.

## 8. Correção 004E-02 — AUTORIZADA

Mandato:

`rodadas/gpt/CORRECAO_004E_02_FINAL_PREPAID_INVARIANTS.md`

Status: **PLANEJADA E AUTORIZADA; AINDA NÃO EXECUTADA**.

Objetivo estrito: fechar três invariantes finais antes do gate pago.

### A — deleção da referência ao `ai_run`

A FK composta atual usa `ON DELETE SET NULL` sem lista de colunas. Como `organization_id` da tentativa é obrigatório, a ação pode tentar zerar também o tenant e quebrar deleção/cleanup.

A 004E-02 deve criar migration **aditiva** que preserve o tenant e zere somente `ai_run_id`, com prova de delete do run e cascade da organização.

### B — custo não pode virar zero por metadado ausente

`normalizarUsage()` ainda pode converter ausência de `promptTokenCount`/`candidatesTokenCount` em zero.

A 004E-02 deve falhar fechado com `USAGE_INVALID` quando essas contagens obrigatórias para uma revisão textual não existirem ou forem zero/inválidas. Nunca estimar custo zero por falta de evidência.

### C — avaliador dos 12 casos precisa reprovar omissões reais

O harness atual ainda pode deixar passar:

- uma ausência esperada quando o modelo devolve `gaps=[]`;
- o caso de tensão esperada quando o modelo devolve `tensions=[]`.

A 004E-02 deve tornar essas expectativas explícitas e testar localmente a lógica do avaliador, sem chamada paga.

## 9. Continua NÃO autorizado

### Gate pago 004E

Até a reauditoria GPT da 004E-02:

- NÃO criar/configurar/usar `GEMINI_API_KEY` no projeto;
- NÃO configurar pagamento para a prova por instrução do Claude;
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

## 10. Correção 004E-02 — EXECUTADA

Mandato: `rodadas/gpt/CORRECAO_004E_02_FINAL_PREPAID_INVARIANTS.md`.

Branch: `claude/rodada-004e-declared-context-review-first-real-ai` · PR #17 mantido aberto, draft, não mergeado.

Status: **CORREÇÃO 004E-02 EXECUTADA — AGUARDANDO REAUDITORIA GPT PARA ABERTURA DO GATE PAGO**.

Relatório: `rodadas/claude/RELATORIO_RODADA_004E_DECLARED_CONTEXT_REVIEW_FIRST_REAL_AI.md` §8.

**Nenhuma chamada paga foi feita.** `GEMINI_API_KEY` continua ausente e só deve ser disponibilizada após a reauditoria desta correção.

### 10.1 Invariantes fechadas

- **A** — a FK composta da tentativa passou a usar `on delete set null (ai_run_id)`: apagar o run zera só a referência e preserva `organization_id`, que é a coluna que sustenta toda a autorização da tabela;
- **B** — `normalizarUsage()` deixou de converter contagem ausente em zero. `promptTokenCount` e `candidatesTokenCount` são obrigatórios e positivos; ausência, zero, negativo ou fracionário viram `USAGE_INVALID`. Cache ausente continua sendo "não informado" (`null`), e raciocínio ausente é zero;
- **C** — o avaliador da eval saiu do script para módulo importável e testável em CI. Ausência esperada com `gaps` vazio agora reprova — antes a checagem era pulada nesse caso —, e a tensão esperada virou metadado explícito da fixture, com âncora exigida nas refs que divergem.

Achado no caminho: o detector de afirmações externas exigia adjacência e usava `\w`, que não casa letra acentuada; "o preço está alto" passava. Padrões corrigidos, com caso de teste para cada um.

### 10.2 Supabase remoto

Migration aplicada nesta correção, aditiva e publicada antes do `db push`:

- `20260825280000_fix_review_attempt_run_delete_action`.

Nenhuma migration anterior foi reescrita.

Prova: `scripts/sql/review-attempt-run-delete-004e02-proof.sql` → **13 casos, 13 passaram, 0 falharam**, transacional com rollback. Cobre catálogo da FK, deleção do run com tenant preservado, cross-tenant recusado e cascade da organização sem resíduo.

### 10.3 Provas locais

- suíte completa **1007/1007** em 49 arquivos;
- 22 casos de usage no adapter, incluindo metadata vazia, contagem faltante e zerada;
- 17 casos do avaliador da eval, com outputs sintéticos determinísticos;
- `tsc --noEmit` e `eslint` limpos;
- `npm run e2e:review` e `npm run eval:review` param no gate com código 2, sem chamar nada.

### 10.4 Próxima ação autorizada

Próximo ator: **GPT auditor**.

Reauditar a Correção 004E-02 no PR #17. **Somente após aprovação** o GPT pode orientar o fundador a criar/configurar a credencial Paid Tier e liberar a primeira prova real.

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