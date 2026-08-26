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

Fatos relevantes já provados:

- mesmo User Access Token válido;
- `/me?fields=id,name` funciona;
- leitura de `client_business_id` falha com code 190;
- o classifier da 003B não pode inferir saúde/tipo da credencial por esse campo;
- limite atual de dois Business Portfolios já atingido;
- portfolio bloqueado/inutilizável: `Bizzman5po`;
- `Bizzman5po` e `BizzManiq1` são distintos.

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

HEAD final auditado da 004E-04:

`22555677c86012bd16293e16bb3e1f3e78c15585`

CI final do HEAD:

`32961935875` — **success**; install, lint, typecheck, Edge Functions, testes e build verdes.

Status geral:

**004E AINDA NÃO APROVADA NEM PROMOVIDA. A TROCA GEMINI → ANTHROPIC FOI EXECUTADA E AUDITADA, MAS O GATE ANTHROPIC CONTINUA FECHADO ATÉ A CORREÇÃO 004E-05.**

### 5.1 Correções já concluídas

- 004E-01 — **EXECUTADA E REAUDITADA**: schema do provider, reserva atômica/rate limit, mensagem de custo, E2E produtivo e harness real da eval.
- 004E-02 — **EXECUTADA E REAUDITADA**: FK de tentativa/run, usage obrigatório e invariantes finais pré-pagas.
- 004E-03 — **EXECUTADA, REAUDITADA E APROVADA**: tensão ancorada em todos os lados pertinentes e prompt injection com sentinela explícita.
- 004E-04 — **EXECUTADA E REAUDITADA; TROCA DE PROVIDER APROVADA, GATE PAGO AINDA BLOQUEADO**.

Auditoria 004E-04:

`rodadas/gpt/AUDITORIA_004E_04_SWITCH_FIRST_PROVIDER_TO_ANTHROPIC.md`

### 5.2 Estado efetivo do provider após 004E-04

Migration aditiva aplicada remotamente:

`20260826120000_switch_first_provider_to_anthropic`

Não reescrever migrations 004E já aplicadas:

- `20260825250000_create_declared_context_review`;
- `20260825260000_create_review_attempt_reservation`;
- `20260825270000_index_review_run_foreign_keys`;
- `20260825280000_fix_review_attempt_run_delete_action`;
- `20260826120000_switch_first_provider_to_anthropic`.

Verificação independente GPT no Supabase remoto confirmou:

- `anthropic_claude` = ACTIVE;
- `claude-haiku-4-5-20251001` = ACTIVE / Tier 1;
- capacidades: structured extraction, JSON Schema nativo, baixo custo e rápido;
- contexto 200K; saída máxima do modelo 64K;
- preço vigente: USD 1.00/M input e USD 5.00/M output;
- cache price nulo nesta rodada;
- `google_gemini` = DISABLED;
- `gemini-2.5-flash-lite` = DISABLED e vigência/preço encerrados;
- existe **um único candidato Tier 1 elegível** para a task atual: Anthropic Haiku 4.5;
- `declared_context_review_attempts = 0`;
- `declared_context_reviews = 0`;
- `ai_runs` reais da task = 0.

Portanto:

**nenhuma chamada real Gemini ou Anthropic ocorreu e nenhum custo real de IA foi gerado até esta auditoria.**

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
- prompt injection testado;
- Gemini não permanece como segundo provider operacional escondido;
- produção usa somente adapter Anthropic.

## 6. BLOQUEIO ATUAL — 004E-05

A reauditoria 004E-04 revalidou a documentação oficial Anthropic e encontrou um risco antes da primeira chamada paga.

A Messages API devolve `stop_reason` em respostas HTTP 200. Em especial:

- `refusal` pode ser cobrado e não respeitar o schema;
- `max_tokens` pode entregar output truncado/incompleto.

O adapter atual não trata `stop_reason` explicitamente.

Além disso, o contrato atual do adapter carrega `usage` somente em `ok: true`. Se o provider já respondeu e a falha acontece depois — por refusal, truncamento ou JSON inválido — o Router pode fechar o run como FAILED sem tokens/custo mesmo quando o consumo é conhecido.

Isso precisa ser corrigido antes de disponibilizar a chave.

Correção autorizada:

`rodadas/gpt/CORRECAO_004E_05_PAID_RESPONSE_ACCOUNTING.md`

Objetivo restrito:

1. somente `end_turn` segue pelo caminho normal;
2. `refusal`, `max_tokens` e stop reasons inesperados falham fechado;
3. falhas pós-resposta preservam usage confiável;
4. Router registra custo em run FAILED quando usage + preço forem conhecidos;
5. nenhuma chamada real durante a correção;
6. nenhuma nova migration/provider/modelo/preço/fallback.

## 7. Gate Anthropic — FECHADO

Até reauditoria GPT da 004E-05:

- **NÃO disponibilizar `ANTHROPIC_API_KEY` ao projeto/Claude**;
- NÃO executar chamada real Anthropic;
- NÃO rodar `npm run e2e:review` com chave;
- NÃO rodar `npm run eval:review` com chave;
- NÃO retry/fallback;
- NÃO mergear/promover PR #17;
- NÃO pagar/ativar Gemini para a 004E.

Os scripts podem ser executados somente sem chave para provar que o gate bloqueia antes de qualquer chamada externa.

## 8. Continua NÃO autorizado

### IA fora da 004E-05

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

`rodadas/gpt/CORRECAO_004E_05_PAID_RESPONSE_ACCOUNTING.md`

Status esperado ao devolver:

**CORREÇÃO 004E-05 EXECUTADA — AGUARDANDO REAUDITORIA GPT PARA ABERTURA DO GATE ANTHROPIC**.

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