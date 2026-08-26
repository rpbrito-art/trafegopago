# CORREÇÃO 004E-04 — SWITCH FIRST PROVIDER TO ANTHROPIC

Status: **CORREÇÃO OBRIGATÓRIA E AUTORIZADA DA RODADA 004E**.

Data: 2026-08-26

Origem: decisão do fundador após o Google AI Studio exigir pré-pagamento mínimo de R$ 200 para ativar o nível pago do projeto Quoron. O fundador já possui credencial/créditos utilizáveis na API oficial da Anthropic.

Branch a continuar:

`claude/rodada-004e-declared-context-review-first-real-ai`

PR #17: manter **draft/open**, não mergear.

## 1. Objetivo

Trocar o **primeiro provider real efetivamente usado** pela 004E de Google Gemini para a **Claude API oficial da Anthropic**, preservando a arquitetura desacoplada da 004A e todo o trabalho já aprovado da 004E-01/02/03.

A feature continua pedindo somente a task:

`DECLARED_BUSINESS_CONTEXT_REVIEW@v1`

A feature NÃO pode conhecer Anthropic, Claude, modelo, SDK, endpoint ou chave. O Router continua resolvendo provider/modelo pelo catálogo.

Esta correção NÃO reabre Meta, NÃO amplia o produto e NÃO autoriza ainda nenhuma chamada paga. Primeiro o código precisa ser corrigido, provado sem provider real e reaudited pelo GPT. Somente depois o fundador disponibilizará a chave Anthropic no ambiente local seguro.

Até nova reauditoria GPT:

- NÃO usar `ANTHROPIC_API_KEY`;
- NÃO chamar Claude API real;
- NÃO executar E2E/eval pagos;
- NÃO mergear/promover PR #17;
- NÃO tocar 003B/Meta.

## 2. Contrato externo fechado pelo GPT em 2026-08-26

Fonte oficial Anthropic vigente:

- provider: **Claude API** (`api.anthropic.com`);
- modelo: **Claude Haiku 4.5**;
- usar o snapshot fixo, não alias móvel: `claude-haiku-4-5-20251001`;
- contexto: 200K tokens;
- máximo do modelo: 64K tokens de saída;
- preço Standard Claude API: **USD 1.00 / 1M input tokens** e **USD 5.00 / 1M output tokens**;
- structured outputs: disponível para Haiku 4.5 por `output_config.format` com `type: "json_schema"`;
- SDK TypeScript oficial: `@anthropic-ai/sdk`;
- versão a fixar nesta correção: **0.120.0**;
- o SDK faz **2 retries automáticos por padrão**: nesta task deve ser explicitamente `maxRetries: 0`;
- timeout padrão do SDK é muito maior que o interativo do Quoron: manter timeout explícito de **45 segundos**;
- a política comercial da Claude API informa que dados retidos não são usados para treinamento sem permissão expressa; a prova paga desta rodada continuará usando somente fixtures sintéticas.

Fontes a registrar no código/migration onde aplicável:

- `https://platform.claude.com/docs/en/about-claude/models/overview`
- `https://platform.claude.com/docs/pt-BR/about-claude/pricing`
- `https://platform.claude.com/docs/pt-BR/build-with-claude/structured-outputs`
- `https://platform.claude.com/docs/pt-BR/cli-sdks-libraries/sdks/typescript`
- `https://platform.claude.com/docs/en/manage-claude/api-and-data-retention`

Se a documentação oficial divergir materialmente durante a execução, Claude deve PARAR e devolver ao GPT; não escolher outro modelo/preço por conta própria.

## 3. READ SET OBRIGATÓRIO

Além de `CLAUDE.md`, `.gpt/PROJECT_PROMPT.md`, `estado.md`, mandato 004E e esta correção, ler:

1. `rodadas/gpt/AUDITORIA_004E_03_EVAL_GATE_COMPLETION.md`;
2. `src/lib/ai/router.ts`;
3. `src/lib/ai/catalog.ts`;
4. `src/lib/ai/adapter-registry.ts`;
5. `src/lib/ai/adapters/gemini.ts` e teste — como implementação a substituir, não como contrato futuro;
6. `src/lib/ai/tasks/declared-context-review.ts`;
7. `src/lib/ai/prompts/declared-context-review.ts`;
8. `src/lib/ai/pricing.ts`;
9. `scripts/e2e-declared-context-review.mjs`;
10. `scripts/eval-declared-context-review.mjs`;
11. `supabase/migrations/20260825250000_create_declared_context_review.sql` — SOMENTE LEITURA; já aplicada remotamente.

Não reescrever migrations `20260825250000` a `20260825280000`.

## 4. Catálogo — migration aditiva obrigatória

Criar nova migration monotônica posterior a `20260825280000`.

### 4.1 Anthropic

Adicionar ao catálogo:

Provider estável:

- key: `anthropic_claude`;
- name: `Anthropic Claude`;
- status: `ACTIVE`;
- metadata não secreta indicando Claude API direta e SDK oficial.

Modelo:

- model_key: `claude-haiku-4-5-20251001`;
- Tier: 1;
- capabilities no mínimo equivalentes às exigidas pela task atual: `STRUCTURED_EXTRACTION`, `JSON_SCHEMA_NATIVE`, `LOW_COST`, `FAST`;
- `supports_structured_output = true`;
- context window = `200000`;
- max output = `64000`;
- metadata com data/fontes oficiais.

Preço vigente:

- input: `1.00` USD / 1M;
- output: `5.00` USD / 1M;
- **não habilitar prompt caching nesta rodada**;
- `cached_input_price_per_million` deve permanecer `NULL` para este modelo na 004E, porque o contrato atual do ledger não representa separadamente cache read e cache creation da Anthropic;
- fonte e data devem ficar versionadas no `source_note`.

### 4.2 Gemini vira configuração histórica inelegível

O catálogo Gemini já foi aplicado remotamente e NÃO pode ser apagado nem reescrito retroativamente.

Na nova migration:

- tornar `google_gemini` inelegível para novas tasks (`DISABLED`, respeitando os valores permitidos pelo schema atual);
- tornar `gemini-2.5-flash-lite` inelegível para novas tasks;
- encerrar vigência operacional/preço aberto de forma coerente com o schema, se o modelo de dados exigir isso para representar retirada de serviço;
- não deletar provider/modelo/preço;
- não criar run artificial;
- registrar que a configuração Gemini foi preparada, mas nenhuma chamada real ocorreu antes da troca.

Ao fim da migration deve existir **um único candidato Tier 1 elegível** para a task atual: Anthropic Haiku 4.5. Não confiar no desempate alfabético do Router para escolher provider.

## 5. Adapter Anthropic

Criar adapter server-only usando `@anthropic-ai/sdk@0.120.0`.

Chave:

`ANTHROPIC_API_KEY`

Regras:

- nunca `NEXT_PUBLIC_`;
- nunca banco, log, mensagem de erro, relatório, fixture ou commit;
- ausência => `PROVIDER_UNAVAILABLE`, sem fake e sem chamada;
- produção não pode ler `GEMINI_API_KEY` para esta task.

### 5.1 Request

Usar Messages API oficial.

Contrato mínimo:

- `model` vem de `request.modelKey` do Router;
- `system` usa o system prompt já versionado da task;
- `messages` contém o prompt do usuário já produzido pela 004E;
- `max_tokens = 2048` para esta task, mesmo que o modelo suporte mais;
- structured output via `output_config.format = { type: "json_schema", schema: ... }`;
- sem tools;
- sem web search;
- sem citations;
- sem thinking/extended thinking nesta task;
- `maxRetries: 0` obrigatoriamente;
- timeout 45s obrigatoriamente.

Não duplicar schema manualmente se o schema JSON já versionado puder ser reutilizado com segurança. A validação Zod do Router continua sendo a segunda barreira local.

### 5.2 Response

Extrair somente bloco textual estruturado esperado. Conteúdo inesperado/faltante falha fechado.

O output sobe como `unknown` e continua sendo validado pela task no Router.

### 5.3 Usage e custo

Para resposta bem-sucedida desta task:

- `usage.input_tokens` deve existir, ser inteiro e > 0;
- `usage.output_tokens` deve existir, ser inteiro e > 0;
- mapear para `inputTokens` e `outputTokens` do contrato 004A;
- `cachedTokens = null` nesta rodada.

Como prompt caching NÃO será habilitado, se a resposta indicar `cache_read_input_tokens > 0` ou `cache_creation_input_tokens > 0`, falhar fechado com `USAGE_INVALID` em vez de fingir custo que o ledger atual não consegue decompor corretamente.

Não estimar tokens por tamanho do texto.

### 5.4 Erros e retries

Mapear erros Anthropic para a taxonomia interna sem propagar mensagem do provider/chave.

Cobrir no mínimo:

- autenticação/permissão;
- 429;
- timeout;
- 5xx/indisponibilidade;
- request inválida;
- erro desconhecido.

**Nenhum retry automático nesta rodada.** O SDK deve ser criado/configurado com `maxRetries: 0` ou opção equivalente comprovada por teste.

## 6. Remover dependência produtiva do Gemini na 004E

Como a branch ainda não foi promovida e não houve chamada Gemini real:

- remover `@google/genai` do `package.json`/lock se nenhum outro código promovível depender dele;
- remover o adapter Gemini do `PRODUCTION_ADAPTERS`;
- o código morto do adapter Gemini pode ser removido da branch se não houver dependência concreta; não manter um segundo provider operacional escondido;
- preservar migrations já aplicadas e documentos de auditoria anteriores como história — não falsificar que Gemini nunca foi preparado;
- harmonizar `AI_ARCHITECTURE.md`, roadmap, `.env.example`, relatório Claude e demais docs alteradas pela própria 004E para dizer que o primeiro provider real efetivamente selecionado para a prova será Anthropic Haiku 4.5, e que Gemini ficou apenas como tentativa de configuração não ativada.

Não transformar esta correção em implementação de fallback multi-provider.

## 7. Testes obrigatórios sem chamada real

Adicionar testes determinísticos para o adapter Anthropic:

1. ausência de chave => nenhuma chamada e `PROVIDER_UNAVAILABLE`;
2. `model` é exatamente o recebido do Router;
3. request usa `output_config.format` JSON Schema;
4. `max_tokens = 2048`;
5. `maxRetries = 0` comprovado pela configuração do cliente/request;
6. timeout = 45s;
7. resposta JSON válida é entregue como `unknown` ao Router;
8. input/output usage válidos são normalizados corretamente;
9. usage ausente, zero, negativo ou fracionário => `USAGE_INVALID`;
10. cache read/creation positivo => `USAGE_INVALID` nesta rodada;
11. resposta sem bloco textual esperado => `OUTPUT_SCHEMA_INVALID`;
12. erros do provider são normalizados e mensagem externa não vaza;
13. nenhuma credencial aparece em logs/erro/test snapshot.

Regressões:

- task/schema/grounding 004E;
- reserva atômica, cache e 3/h;
- ledger e custo 004A;
- E2E/eval preparados;
- avaliador 004E-03;
- jornada 004D;
- multi-org fail-closed;
- CI completa.

## 8. E2E e eval — preparar, NÃO executar ainda

Atualizar os dois scripts para o gate Anthropic:

- `npm run e2e:review` exige `ANTHROPIC_API_KEY`;
- `npm run eval:review` exige `ANTHROPIC_API_KEY`;
- remover dependência operacional de `GEMINI_API_KEY`;
- sem chave, ambos param antes de chamada externa;
- E2E continua uma execução produtiva sintética + persistência + ledger + custo + cache;
- eval continua 12 casos sintéticos, uma chamada por caso, zero retry automático;
- se uma chamada real falhar futuramente, não repetir por tentativa sem voltar ao GPT.

Nesta correção os scripts devem ser testados apenas no **gate sem chave**, comprovando zero chamadas.

## 9. Remoto e durabilidade

A nova migration deve seguir o protocolo normal:

1. commit/push da branch antes de aplicar remotamente;
2. migration aditiva; nenhuma anterior reescrita;
3. aplicar no projeto Supabase canônico;
4. prova read-only/SQL transacional de que:
   - Anthropic provider/model/preço existem;
   - Anthropic é o único candidato elegível da task;
   - Gemini ficou inelegível sem ser apagado;
   - não surgiu `ai_run` real;
   - não surgiu revisão/tentativa real;
5. Advisors somente para o delta.

## 10. Critérios de conclusão da 004E-04

Devolver ao GPT somente quando:

- Anthropic Haiku 4.5 estiver catalogado por migration aditiva e Gemini inelegível;
- adapter Anthropic estiver registrado como provider produtivo da task;
- `@anthropic-ai/sdk@0.120.0` estiver fixado;
- retry automático estiver explicitamente zerado;
- timeout 45s estiver explícito;
- structured output estiver usando o contrato atual oficial;
- usage/custo falharem fechado em metadata incompleta ou cache inesperado;
- E2E/eval estiverem migrados para `ANTHROPIC_API_KEY` e ainda bloqueados sem chave;
- nenhuma chamada Anthropic real tiver ocorrido;
- nenhuma chave tiver sido adicionada ao projeto;
- CI completa estiver verde;
- relatório/estado da branch refletirem o provider correto.

Status esperado:

**CORREÇÃO 004E-04 EXECUTADA — AGUARDANDO REAUDITORIA GPT PARA ABERTURA DO GATE ANTHROPIC**.

Claude não pede a chave ao fundador, não roda prova paga, não mergeia e não promove.

## 11. Fora de escopo

Permanece proibido:

- chamada real Anthropic durante esta correção;
- qualquer pagamento/ativação Gemini;
- reativar Gemini como fallback;
- segundo provider ativo/fallback automático;
- alterar o Router para seleção por marca;
- tool calling/web search/embeddings/RAG;
- Meta/003B;
- Content Intelligence;
- geração de conteúdo;
- Ads/campanhas;
- CRM/leads/WhatsApp;
- alterar automaticamente fatos do negócio;
- qualquer nova capacidade além da troca segura do primeiro provider real.