# ESTADO — Quoron

Atualizado: 2026-08-26

Estado efetivamente incorporado = `main + este arquivo + promoção real`.

## 1. Identidade e ambiente

Nome canônico: **Quoron**.

Identificadores técnicos legados preservados enquanto renomear trouxer risco sem ganho funcional:

- repo: `rpbrito-art/trafegopago`;
- Supabase project ref: `cbnxdoxpyioxjwgjhbtq`;
- pasta local esperada: `C:\Users\rpbri\Documents\trafegopago`;
- `business-weaver`: fora de escopo.

Não renomear repo, pasta local, Supabase project ref ou recursos Meta apenas por branding.

## 2. Estado incorporado

Promovidas: **000–003A, 004A, 004B, 004C e 004D**.

- Fase 1 — Supabase/Auth/Tenancy: **ENCERRADA**.
- Fase 2 — Operations/Audit/Queues/Segurança Base: **ENCERRADA**.
- Fase 3 — Meta Connection Foundation: **EM ANDAMENTO / 003B ESTACIONADA / GATE EXTERNO PENDENTE**.
- Fase 6 — AI Foundation: **EM ANDAMENTO; 004A CORE PROMOVIDA; 004E AINDA NÃO PROMOVIDA**.
- 004B — Quoron Branding + Growth Context: **PROMOVIDA**.
- 004C — Offer Catalog + Business Context: **PROMOVIDA**.
- 004D — Guided Growth Journey Foundation: **PROMOVIDA**.
- última rodada promovida: **004D**.

A existência de migration remota, branch, relatório ou PR não equivale a promoção.

## 3. Visão de produto vigente

Canônico principal: `docs/01-produto/AGENTIC_PRODUCT_CANONICAL.md`.

Tese:

**Quoron é um agente de inteligência de crescimento para profissionais liberais e pequenos negócios, operado por uma plataforma SaaS nativa.**

Ciclo:

`compreender → observar → confrontar → diagnosticar → ensinar → recomendar → decidir → executar → medir → aprender → próximo passo`

Leis vigentes:

- a complexidade pertence ao sistema, não ao usuário;
- o usuário não precisa dominar marketing digital para usar o Quoron;
- o sistema ensina o necessário para preservar soberania humana;
- aprendizagem material precisa de evidência;
- distinguir fato, interpretação, hipótese e recomendação.

## 4. Rodada 003B — META ESTACIONADA, NÃO PROMOVIDA

Branch: `claude/rodada-003b-meta-asset-discovery-selection`.

PR #12: draft/open/não mergeada.

HEAD conhecido: `053bc7ca3f25b53954579df30bce598894e718dd`.

CI conhecida: `32859795018` — success.

Gate externo permanece pendente por bloqueio do Business Portfolio Meta.

Até nova decisão GPT baseada em documentação Meta vigente:

- não criar terceiro portfolio;
- não excluir/mover portfolio por tentativa;
- não usar portfolio de terceiro;
- não alterar app/scopes/Business Login Configuration por tentativa;
- não promover/mergear 003B;
- não iniciar leitura/publicação/Ads reais dependentes desse gate.

**O gate Meta não bloqueia desenvolvimento independente** de contexto declarado, fundação de IA e outras capacidades que não dependam de observação/execução Meta real.

## 5. Rodada 004E — ESTADO CORRENTE

Mandato base:

`rodadas/gpt/RODADA_004E_DECLARED_CONTEXT_REVIEW_FIRST_REAL_AI.md`

Branch:

`claude/rodada-004e-declared-context-review-first-real-ai`

PR #17: **draft/open/não mergeada**.

HEAD reauditorado da 004E-06:

`3ed3e586903aac9f31c5cb0bb57402a6619b1c9c`

CI do HEAD:

`32966958426` — **success**; install, lint, typecheck, Edge Functions, testes e build verdes.

Status geral:

**004E AINDA NÃO APROVADA NEM PROMOVIDA. 004E-06 FOI EXECUTADA, REAUDITADA E APROVADA PARA ABERTURA DO GATE ANTHROPIC CONTROLADO. E2E/EVAL REAIS AINDA PENDENTES.**

### 5.1 Correções concluídas

- 004E-01 — **EXECUTADA E REAUDITADA**.
- 004E-02 — **EXECUTADA E REAUDITADA**.
- 004E-03 — **EXECUTADA, REAUDITADA E APROVADA**.
- 004E-04 — **EXECUTADA E REAUDITADA; TROCA GEMINI → ANTHROPIC APROVADA**.
- 004E-05 — **EXECUTADA E REAUDITADA; stop_reason e contabilização de falhas pós-resposta implementados**.
- 004E-06 — **EXECUTADA, REAUDITADA E APROVADA PARA O GATE PAGO CONTROLADO**.

Auditorias relevantes:

- `rodadas/gpt/AUDITORIA_004E_04_SWITCH_FIRST_PROVIDER_TO_ANTHROPIC.md`;
- `rodadas/gpt/AUDITORIA_004E_05_PAID_RESPONSE_ACCOUNTING.md`;
- `rodadas/gpt/AUDITORIA_004E_06_REFUSAL_ZERO_OUTPUT_ACCOUNTING.md`.

### 5.2 Estado efetivo do provider

Migration aditiva já aplicada remotamente:

`20260826120000_switch_first_provider_to_anthropic`

Não reescrever migrations 004E já aplicadas:

- `20260825250000_create_declared_context_review`;
- `20260825260000_create_review_attempt_reservation`;
- `20260825270000_index_review_run_foreign_keys`;
- `20260825280000_fix_review_attempt_run_delete_action`;
- `20260826120000_switch_first_provider_to_anthropic`.

Verificação independente GPT confirmou no remoto:

- `anthropic_claude` = ACTIVE;
- `claude-haiku-4-5-20251001` = ACTIVE / Tier 1;
- preço vigente: USD 1.00/M input e USD 5.00/M output;
- `google_gemini` e `gemini-2.5-flash-lite` = DISABLED;
- existe um único candidato Tier 1 elegível para a task atual: Anthropic Haiku 4.5;
- `declared_context_review_attempts = 0`;
- `declared_context_reviews = 0`;
- `ai_runs` reais da task = 0.

Portanto:

**nenhuma chamada real Gemini ou Anthropic ocorreu e nenhum custo real de IA foi gerado até a aprovação deste gate.**

### 5.3 O que a 004E preserva

- task `DECLARED_BUSINESS_CONTEXT_REVIEW@v1`, tenant-scoped, Tier 1;
- feature desacoplada de provider/modelo;
- snapshot mínimo de contexto declarado;
- grounding por `evidenceRef` fail-closed;
- `/revisao` não afirma observação de mercado/Instagram;
- render não chama provider;
- reserva atômica antes do Router;
- teto de 3 tentativas não cacheadas por organização/hora;
- cache por fingerprint e versões;
- artefato imutável e tenant-safe;
- E2E preparado para persistência + ledger + custo + cache;
- eval com 12 fixtures sintéticas, uma chamada por caso, sem retry automático;
- produção usa somente adapter Anthropic;
- `stop_reason` tratado explicitamente;
- falha pós-resposta pode carregar usage/custo para o run FAILED;
- recusa com `output_tokens = 0` preserva usage;
- `end_turn + output zero` nunca vira sucesso.

### 5.4 Dívida conhecida de billing em refusal pré-output

A documentação Anthropic vigente esclarece:

- recusa antes de qualquer output: `usage` é informado, conta para rate limit, mas a solicitação não é cobrada;
- recusa mid-stream: input e output já gerado são cobrados.

O ledger atual guarda `estimated_cost`. Para uma recusa pré-output com usage informativo, a regra genérica pode superestimar o custo real da fatura.

Decisão GPT:

- **dívida explícita, não bloqueadora do primeiro E2E**;
- preservar usage é obrigatório;
- não tratar `estimated_cost` como `billed_cost` nesse caso;
- se uma prova real retornar `refusal`, parar sem retry e devolver ao GPT para reconciliação antes de qualquer promoção.

## 6. Gate Anthropic controlado — ABERTO

Está autorizado somente o seguinte fluxo:

1. fundador disponibilizar `ANTHROPIC_API_KEY` **somente no ambiente local seguro**;
2. a chave nunca pode aparecer no chat, GitHub, relatório, fixture, log ou documentação;
3. depois da configuração local, Claude Code executa `npm run e2e:review` **uma única vez**;
4. somente se o E2E passar, Claude Code executa `npm run eval:review` **uma única vez**;
5. usar somente fixtures sintéticas versionadas;
6. zero retry automático e zero retry manual;
7. registrar run IDs, usage, custo estimado, resultado dos 12 casos e limpeza das fixtures;
8. se E2E ou eval falhar, **parar imediatamente e não repetir chamada**;
9. depois das provas, parar e devolver ao GPT para auditoria final da 004E.

## 7. Continua NÃO autorizado

### IA

- merge/promover PR #17 antes da auditoria final;
- segundo provider ativo/fallback multi-provider;
- pagar/ativar Gemini para a 004E;
- web search/grounding externo;
- tool calling;
- embeddings/RAG;
- geração real de copy/imagem;
- Content Intelligence;
- IA alterar automaticamente objetivo, foco, preço ou oferta;
- qualquer IA executar gasto ou ação externa.

### Meta

- promover/mergear 003B;
- iniciar Instagram real dependente do gate;
- implementar onboarding Meta guiado antes da abertura do gate externo;
- alterar scopes/app/configuração Meta por tentativa;
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

## 8. Próxima ação autorizada

Próximo ator: **fundador, orientado pelo GPT**.

Ação: disponibilizar `ANTHROPIC_API_KEY` apenas no arquivo local seguro do projeto, sem expor a chave ao chat ou ao repositório.

Depois disso o próximo ator será **Claude Code**, exclusivamente para o E2E uma vez e, se ele passar, a eval uma vez. Claude não mergeia nem promove.

## 9. Regra de continuidade

- distinguir sempre planejado, autorizado, executado, auditado, aprovado e promovido;
- estado incorporado = `main + estado.md + promoção real`;
- migration remota não equivale a promoção;
- branch/relatório/PR não equivalem a promoção;
- não promover por relatório do Claude sem auditoria independente;
- gate Meta não bloqueia desenvolvimento independente;
- hipótese externa não vira fato sem prova;
- fundador não atua como barramento de contexto entre GPT e Claude;
- ação manual externa deve ser explicada em linguagem simples, uma ação principal por vez.
