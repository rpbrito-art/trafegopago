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

HEAD reauditorado da 004E-05:

`cc5b7b7ac0118613de1e7d86b376480565033642`

CI do HEAD:

`32964016218` — **success**; install, lint, typecheck, Edge Functions, testes e build verdes.

Status geral:

**004E AINDA NÃO APROVADA NEM PROMOVIDA. 004E-05 FOI EXECUTADA E REAUDITADA, MAS O GATE ANTHROPIC CONTINUA FECHADO. 004E-06 ESTÁ AUTORIZADA.**

### 5.1 Correções já concluídas

- 004E-01 — **EXECUTADA E REAUDITADA**.
- 004E-02 — **EXECUTADA E REAUDITADA**.
- 004E-03 — **EXECUTADA, REAUDITADA E APROVADA**.
- 004E-04 — **EXECUTADA E REAUDITADA; TROCA GEMINI → ANTHROPIC APROVADA, GATE PAGO BLOQUEADO**.
- 004E-05 — **EXECUTADA E REAUDITADA; stop_reason e custo de falha pós-resposta implementados, MAS AINDA BLOQUEADA POR REFUSAL OFICIAL COM OUTPUT ZERO**.

Auditorias relevantes:

- `rodadas/gpt/AUDITORIA_004E_04_SWITCH_FIRST_PROVIDER_TO_ANTHROPIC.md`;
- `rodadas/gpt/AUDITORIA_004E_05_PAID_RESPONSE_ACCOUNTING.md`.

### 5.2 Estado efetivo do provider

Migration aditiva aplicada remotamente:

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

**nenhuma chamada real Gemini ou Anthropic ocorreu e nenhum custo real de IA foi gerado até esta reauditoria.**

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
- `stop_reason` passou a ser tratado explicitamente na 004E-05;
- falha pós-resposta pode carregar usage/custo para o run FAILED.

## 6. BLOQUEIO ATUAL — 004E-06

A reauditoria da 004E-05 confirmou na documentação oficial Anthropic um caso que os testes não cobriram.

A Anthropic publica um exemplo normal de `refusal` com:

- `stop_reason = refusal`;
- `input_tokens = 412`;
- `output_tokens = 0`;
- HTTP 200.

O adapter atual exige `output_tokens > 0` para normalizar usage. Portanto, nesse caso real e cobrável:

- o input consumido é conhecido;
- o usage é descartado antes da classificação do stop reason;
- o Router pode fechar o run FAILED sem registrar o custo conhecido de input.

Correção autorizada:

`rodadas/gpt/CORRECAO_004E_06_REFUSAL_ZERO_OUTPUT_ACCOUNTING.md`

Objetivo restrito:

1. permitir `output_tokens = 0` como usage contábil de resposta anormal;
2. preservar input/output conhecidos em `refusal`;
3. registrar custo input-only no run FAILED;
4. `end_turn + output zero` continua proibido como sucesso, mas precisa preservar usage conhecido;
5. zero chamadas reais durante a correção;
6. nenhuma migration/provider/modelo/preço/fallback.

## 7. Gate Anthropic — FECHADO

Até reauditoria GPT da 004E-06:

- **NÃO disponibilizar `ANTHROPIC_API_KEY` ao projeto/Claude**;
- NÃO executar chamada real Anthropic;
- NÃO rodar `npm run e2e:review` com chave;
- NÃO rodar `npm run eval:review` com chave;
- NÃO retry/fallback;
- NÃO mergear/promover PR #17;
- NÃO pagar/ativar Gemini para a 004E.

Os scripts podem ser executados somente sem chave para provar que o gate bloqueia antes de qualquer chamada externa.

## 8. Continua NÃO autorizado

### IA fora da 004E-06

- segundo provider ativo;
- fallback multi-provider;
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

## 9. Próxima ação autorizada

Próximo ator: **Claude Code**.

Claude deve continuar na mesma branch e no PR #17 e executar **somente**:

`rodadas/gpt/CORRECAO_004E_06_REFUSAL_ZERO_OUTPUT_ACCOUNTING.md`

Status esperado ao devolver:

**CORREÇÃO 004E-06 EXECUTADA — AGUARDANDO REAUDITORIA GPT PARA ABERTURA DO GATE ANTHROPIC**.

Claude não pede a chave, não faz chamada paga, não mergeia e não promove.

Depois disso o próximo ator volta a ser GPT.

## 10. Regra de continuidade

- distinguir sempre planejado, autorizado, executado, auditado, aprovado e promovido;
- estado incorporado = `main + estado.md + promoção real`;
- migration remota não equivale a promoção;
- branch/relatório/PR não equivalem a promoção;
- não promover por relatório do Claude sem auditoria independente;
- gate Meta não bloqueia desenvolvimento independente;
- hipótese externa não vira fato sem prova;
- fundador não atua como barramento de contexto entre GPT e Claude;
- ação manual externa deve ser explicada em linguagem simples, uma ação principal por vez.
