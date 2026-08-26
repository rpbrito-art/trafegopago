# ESTADO — Quoron

Atualizado: 2026-08-26

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
- rodada corrente: **004E — Declared Context Review + First Real AI — 004E-03 APROVADA; CAMINHO GEMINI PAGO SUSPENSO; 004E-04 ANTHROPIC AUTORIZADA; NENHUMA CHAMADA REAL DE IA AINDA**.

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

O gate Meta **não bloqueia desenvolvimento independente** de contexto declarado, IA foundation e outras capacidades que não dependam de observação/execução Meta real.

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

Último HEAD reauditorado antes da troca de provider:

`19f4931fcadf45b9cb9d3bf1039c21e417111e19`

CI correspondente:

`32911288204` — **success**; install, lint, typecheck, Edge Functions, testes e build verdes. Suíte local reportada em **1015/1015**.

Auditorias GPT já concluídas:

- `rodadas/gpt/AUDITORIA_004E_DECLARED_CONTEXT_REVIEW_FIRST_REAL_AI.md`;
- `rodadas/gpt/AUDITORIA_004E_01_PREPAID_SAFETY_PROVIDER_CONTRACT.md`;
- `rodadas/gpt/AUDITORIA_004E_02_FINAL_PREPAID_INVARIANTS.md`;
- `rodadas/gpt/AUDITORIA_004E_03_EVAL_GATE_COMPLETION.md`.

Veredito atual:

**004E AINDA NÃO APROVADA NEM PROMOVIDA. O CAMINHO GEMINI PAGO FOI SUSPENSO ANTES DE QUALQUER CHAMADA REAL. A TROCA CONTROLADA PARA ANTHROPIC É A ÚNICA EXECUÇÃO AUTORIZADA AGORA.**

### 7.1 O que já está preservado da 004E

- task `DECLARED_BUSINESS_CONTEXT_REVIEW@v1`, tenant-scoped, Tier 1;
- feature desacoplada de provider/modelo;
- snapshot declarado mínimo e grounding por `evidenceRef` fail-closed;
- `/revisao` com aviso de que não observou mercado/Instagram;
- render não chama provider;
- reserva atômica antes do Router;
- mesmo fingerprint concorrente não recebe duas reservas ativas;
- teto de 3 tentativas/h por organização;
- reserva órfã expira e é recuperável;
- E2E preparado para persistir artefato, conferir run/custo e provar cache;
- FK tentativa → `ai_runs` preserva `organization_id` e zera somente `ai_run_id` no delete;
- usage incompleto não pode virar custo zero;
- avaliador da eval é importável/testável sem provider;
- ausência esperada com `gaps=[]` reprova;
- tensão esperada exige todas as refs pertinentes dentro da mesma tensão;
- prompt injection possui sentinela explícita;
- eval real permanece 12 casos, uma chamada por caso, sem retry automático.

### 7.2 Migrations 004E já aplicadas remotamente — NÃO REESCREVER

- `20260825250000_create_declared_context_review`;
- `20260825260000_create_review_attempt_reservation`;
- `20260825270000_index_review_run_foreign_keys`;
- `20260825280000_fix_review_attempt_run_delete_action`.

Elas incluem a configuração inicial do Google Gemini. Essa história deve ser preservada. A 004E-04 deve usar nova migration aditiva para tornar Gemini inelegível e catalogar Anthropic; nunca editar/deletar migrations aplicadas.

Antes da decisão de troca:

- `declared_context_review_attempts = 0`;
- `declared_context_reviews = 0`;
- `ai_runs` reais desta task = 0;
- nenhuma chamada Gemini real ocorreu;
- nenhum custo Gemini foi gerado.

## 8. Correções 004E — estado de auditoria

### 004E-01

**EXECUTADA E REAUDITADA.** Fechou schema do provider, reserva atômica/rate limit, mensagem de custo, E2E produtivo e harness real da eval.

### 004E-02

**EXECUTADA E REAUDITADA.** Fechou delete da FK preservando tenant, usage obrigatório para custo confiável e omissões básicas do avaliador.

### 004E-03

**EXECUTADA, REAUDITADA E APROVADA.** Fechou comparação completa da tensão e verificação explícita de prompt injection.

### 004E-04 — TROCA PARA ANTHROPIC

Mandato:

`rodadas/gpt/CORRECAO_004E_04_SWITCH_FIRST_PROVIDER_TO_ANTHROPIC.md`

Status: **PLANEJADA E AUTORIZADA; AINDA NÃO EXECUTADA**.

Decisão:

- não ativar/pagar Gemini neste momento;
- primeiro provider real efetivamente testado será Claude API da Anthropic;
- modelo fixo: `claude-haiku-4-5-20251001`;
- SDK oficial: `@anthropic-ai/sdk@0.120.0`;
- preço catalogado: USD 1.00/M input e USD 5.00/M output;
- `ANTHROPIC_API_KEY` somente server-side;
- retries automáticos devem ser zerados;
- timeout 45s;
- prompt caching não entra nesta rodada;
- nenhuma chamada real é autorizada durante a implementação da 004E-04.

## 9. Gate de credencial e prova real — TEMPORARIAMENTE FECHADO

O gate que havia sido aberto para Gemini foi **superseded pela decisão de troca de provider**.

Até a reauditoria GPT da 004E-04:

- NÃO pagar/ativar Gemini para a 004E;
- NÃO criar/configurar `GEMINI_API_KEY` para o projeto;
- NÃO colocar `ANTHROPIC_API_KEY` no projeto ainda;
- NÃO executar chamada Anthropic real;
- NÃO rodar E2E/eval pagos;
- NÃO mergear/promover PR #17.

Depois de a 004E-04 ser executada e reaudited, o GPT poderá abrir um novo gate controlado para o fundador disponibilizar a chave Anthropic localmente e executar as provas reais uma única vez.

## 10. Continua NÃO autorizado

### IA fora da troca 004E-04

- segundo provider ativo ou fallback real multi-provider;
- web search/grounding externo;
- tool calling;
- embeddings/RAG;
- geração real de copy/imagem;
- Content Intelligence;
- IA alterar automaticamente objetivo, foco, preço ou oferta;
- qualquer capacidade de IA executar gasto ou ação externa.

### Meta

- promover/mergear 003B;
- iniciar importação/publicação real Instagram dependente da arquitetura bloqueada;
- implementar onboarding Meta guiado antes da abertura do gate externo;
- alterar scopes/app/Business Login Configuration;
- criar/excluir/mover Business Portfolio;
- transferir ativos;
- usar terceiro;
- campanha/anúncio/gasto.

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

## 11. Correção 004E-04 — EXECUTADA

Mandato: `rodadas/gpt/CORRECAO_004E_04_SWITCH_FIRST_PROVIDER_TO_ANTHROPIC.md`.

Branch: `claude/rodada-004e-declared-context-review-first-real-ai` · PR #17 mantido aberto, draft, não mergeado.

Status: **CORREÇÃO 004E-04 EXECUTADA — AGUARDANDO REAUDITORIA GPT PARA ABERTURA DO GATE ANTHROPIC**.

Relatório: `rodadas/claude/RELATORIO_RODADA_004E_DECLARED_CONTEXT_REVIEW_FIRST_REAL_AI.md` §10.

**Nenhuma chamada Anthropic real foi feita** e `ANTHROPIC_API_KEY` não foi adicionada a nenhum runtime. Nenhum custo Gemini foi gerado em momento algum.

### 11.1 Delta executado

- migration aditiva `20260826120000_switch_first_provider_to_anthropic`;
- provider `anthropic_claude` e modelo `claude-haiku-4-5-20251001` catalogados no Tier 1, com 200K de contexto e 64K de saída;
- preço Standard USD 1.00 input / 5.00 output por 1M tokens, com fonte oficial e data de verificação 2026-08-26; `cached_input_price_per_million` fica **NULL** porque o contrato de custo da 004A não decompõe leitura e criação de cache;
- Gemini inelegível — provider e modelo `DISABLED`, vigência e preço aberto encerrados — e **preservado**: nada foi apagado;
- adapter nativo com `@anthropic-ai/sdk@0.120.0` fixado, `maxRetries: 0` e timeout de 45s no cliente e na chamada;
- structured output pelo mesmo JSON Schema versionado da task, sem tools, sem busca externa e sem thinking;
- usage falha fechado em contagem ausente/zerada/inválida e em tokens de cache;
- adapter Gemini e `@google/genai` removidos: nenhum segundo provider operacional fica escondido;
- `AI_ARCHITECTURE.md`, roadmap e `.env.example` harmonizados;
- E2E e eval migrados para `ANTHROPIC_API_KEY` e ainda bloqueados sem chave.

**Nenhuma feature mudou.** A troca custou uma migration e um adapter, que é o que a indireção do Router existe para permitir.

### 11.2 Supabase remoto

Migration aplicada, aditiva e publicada antes do `db push`. Nenhuma anterior reescrita.

Prova: `scripts/sql/anthropic-catalog-004e04-proof.sql` → **20 casos, 20 passaram, 0 falharam**, transacional com rollback e sem criar fixture. Ela reproduz o filtro de candidatos do Router e confirma que existe **um único** elegível Tier 1 — não confia no desempate alfabético. Confirma também: zero runs, zero revisões e zero tentativas reais.

Advisors idênticos ao baseline.

### 11.3 Provas locais

- 25 casos do adapter Anthropic, incluindo ausência de chave, config do cliente real, usage inválido, cache inesperado e não vazamento de credencial em erro;
- suíte completa **1018/1018** em 49 arquivos;
- `tsc --noEmit` e `eslint` limpos;
- `npm run e2e:review` e `npm run eval:review` param no gate com código 2.

### 11.4 Próxima ação autorizada

Próximo ator: **GPT auditor**.

Reauditar a Correção 004E-04 no PR #17. **Somente após aprovação** o GPT pode abrir o gate para o fundador disponibilizar `ANTHROPIC_API_KEY` no ambiente local e executar as provas reais.

Claude não promove, não mergeia e não pede a chave ao fundador.

## 12. Regra de continuidade

- distinguir planejado, autorizado, executado, auditado, aprovado e promovido;
- estado efetivamente incorporado = `main + estado.md + promoção real`;
- migration remota não equivale a promoção;
- não promover por relatório do Claude sem auditoria independente;
- gate Meta não bloqueia desenvolvimento independente;
- hipótese Meta não vira fato sem prova;
- fundador não atua como barramento de contexto entre GPT e Claude;
- ação manual externa deve ser explicada pelo GPT em linguagem simples, uma ação principal por vez.