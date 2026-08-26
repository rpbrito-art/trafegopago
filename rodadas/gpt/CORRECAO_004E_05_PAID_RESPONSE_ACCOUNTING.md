# CORREÇÃO 004E-05 — PAID RESPONSE ACCOUNTING

Status: **CORREÇÃO OBRIGATÓRIA E AUTORIZADA DA RODADA 004E**.

Data: 2026-08-26

Origem: `rodadas/gpt/AUDITORIA_004E_04_SWITCH_FIRST_PROVIDER_TO_ANTHROPIC.md`.

Branch a continuar:

`claude/rodada-004e-declared-context-review-first-real-ai`

PR #17: manter **draft/open**, não mergear.

## 1. Objetivo

Fechar dois riscos antes da primeira chamada paga Anthropic:

1. tratar explicitamente `stop_reason` da Messages API;
2. garantir que uma resposta já cobrável que falha depois do HTTP 200 preserve usage/custo no ledger.

Esta correção não amplia produto, não troca provider/modelo/preço, não cria nova capacidade e não reabre Meta.

Até reauditoria GPT:

- NÃO usar `ANTHROPIC_API_KEY`;
- NÃO chamar Claude API real;
- NÃO executar E2E/eval pagos;
- NÃO mergear/promover PR #17;
- NÃO tocar Meta/003B.

## 2. Contrato externo obrigatório

Revalidado pelo GPT em 2026-08-26 na documentação oficial Anthropic:

- toda resposta Messages API possui `stop_reason`;
- `end_turn` = conclusão normal;
- `refusal` = HTTP 200, pode ser cobrado e pode não respeitar structured output;
- `max_tokens` = output pode estar truncado/incompleto;
- outros stop reasons não são esperados nesta task sem tools/stop sequence;
- não criar fallback nesta rodada.

Fontes:

- `https://platform.claude.com/docs/en/build-with-claude/handling-stop-reasons`
- `https://platform.claude.com/docs/pt-BR/build-with-claude/structured-outputs`

## 3. READ SET OBRIGATÓRIO

Além de `CLAUDE.md`, `.gpt/PROJECT_PROMPT.md`, `estado.md`, mandato 004E, correção 004E-04 e esta correção, ler somente:

1. `rodadas/gpt/AUDITORIA_004E_04_SWITCH_FIRST_PROVIDER_TO_ANTHROPIC.md`;
2. `src/lib/ai/contracts.ts`;
3. `src/lib/ai/router.ts`;
4. `src/lib/ai/router.test.ts`;
5. `src/lib/ai/adapters/anthropic.ts`;
6. `src/lib/ai/adapters/anthropic.test.ts`;
7. `src/lib/ai/run-ledger.ts` e testes, se necessários para provar persistência;
8. `src/lib/ai/pricing.ts`;
9. `scripts/e2e-declared-context-review.mjs` e `scripts/eval-declared-context-review.mjs` apenas para manter o gate fechado.

Não alterar migrations aplicadas, catálogo, preço, feature de revisão, snapshot, grounding, UI ou Meta sem dependência concreta.

## 4. `stop_reason` — comportamento obrigatório

No adapter Anthropic, após uma resposta HTTP bem-sucedida e antes de aceitar o output:

### 4.1 `end_turn`

É o único stop reason que pode seguir pelo caminho normal de parse/validação nesta task.

### 4.2 `refusal`

- não persistir revisão;
- classificar como `PROVIDER_REJECTED`;
- preservar `usage` confiável da resposta para contabilização;
- não retry;
- não fallback;
- não expor `stop_details`, texto de recusa ou mensagem externa ao usuário/ledger.

### 4.3 `max_tokens`

- não persistir revisão;
- tratar como falha de output/truncamento (`OUTPUT_SCHEMA_INVALID` é aceitável dentro da taxonomia atual);
- preservar `usage` confiável para contabilização;
- não aumentar `max_tokens` automaticamente;
- não retry.

### 4.4 Outros valores

Como esta task não usa tools, server tools nem `stop_sequences`, qualquer stop reason diferente de `end_turn`/`refusal`/`max_tokens` deve falhar fechado, preservar usage quando confiável e não acionar fallback.

Não criar enum/arquitetura nova de stop reason se a taxonomia atual resolver com clareza suficiente.

## 5. Falha pós-resposta precisa carregar usage

O contrato `AIAdapterResult` deve poder representar:

- falha antes de resposta/sem usage confiável;
- falha depois de resposta com `usage` confiável.

A solução pode adicionar `usage?: AIAdapterUsage` ao ramo `ok: false`, ou desenho equivalente mais seguro. Não duplicar tipos desnecessariamente.

Regras:

- o adapter só anexa usage se a metadata passar por `normalizarUsage()`;
- nunca inventar usage;
- erro de rede, autenticação, timeout etc. sem resposta confiável continua sem usage;
- refusal/max_tokens/output textual inválido após resposta devem carregar usage quando válido.

## 6. Router — contabilização de falha cobrável

Quando o adapter devolver `ok: false`:

### Sem usage confiável

Manter comportamento atual: fechar run FAILED sem inventar tokens/custo.

### Com usage confiável

Antes de fechar o run:

1. calcular custo usando a `AIPriceVersion` já resolvida para aquele run;
2. se cálculo for válido, registrar no FAILED:
   - `input_tokens`;
   - `output_tokens`;
   - `cached_tokens`;
   - `estimated_cost`;
   - `currency`;
   - `latency_ms`;
   - `error_class` original normalizada;
3. se o cálculo falhar apesar de usage fornecido, falhar fechado sem transformar custo em zero; respeitar as invariantes atuais do ledger/taxonomia.

Não chamar outro provider e não retry.

A regra de produto/economia é:

**se o Quoron sabe que houve consumo cobrável e conhece usage + preço, o run FAILED também precisa carregar esse custo.**

## 7. Output inválido depois de resposta

Hoje o adapter Anthropic retorna `OUTPUT_SCHEMA_INVALID` ao não conseguir extrair JSON, descartando usage.

Corrigir para que:

- resposta HTTP bem-sucedida + usage válido + conteúdo ausente/malformado resulte em falha com usage preservado;
- o Router registre custo no run FAILED;
- nenhuma tentativa de reparar JSON seja adicionada;
- nenhum retry seja feito.

A validação Zod do Router continua sendo a autoridade final quando houver JSON parseável.

## 8. Testes obrigatórios

### Adapter

Provar deterministicamente:

1. `end_turn` + JSON válido => sucesso do adapter;
2. `refusal` + usage válido => `PROVIDER_REJECTED` + usage preservado;
3. `max_tokens` + usage válido => falha fechada + usage preservado;
4. stop reason inesperado + usage válido => falha fechada + usage preservado;
5. JSON inválido + usage válido => `OUTPUT_SCHEMA_INVALID` + usage preservado;
6. usage inválido/ausente => não anexar usage inventado;
7. erros externos sem resposta continuam sem usage;
8. mensagens/stop_details/chave não vazam.

### Router/Ledger

Provar pelo menos:

9. falha do adapter com usage válido fecha `ai_run` FAILED com tokens, moeda e custo reproduzível;
10. `PROVIDER_REJECTED` preserva sua classe no ledger mesmo com custo;
11. `OUTPUT_SCHEMA_INVALID` preserva sua classe no ledger mesmo com custo;
12. falha sem usage não inventa custo;
13. sucesso continua inalterado;
14. custo/usage inválidos continuam fail-closed.

### Regressões

Manter verdes:

- adapter Anthropic 004E-04;
- Router/ledger/pricing 004A;
- task/schema/grounding 004E;
- reserva/cache/rate limit 004E-01;
- eval 004E-03;
- jornada 004D;
- CI completa.

## 9. Gate pago continua fechado

Durante esta correção:

- `npm run e2e:review` sem `ANTHROPIC_API_KEY` deve continuar parando antes de chamada externa;
- `npm run eval:review` sem `ANTHROPIC_API_KEY` idem;
- não executar com chave real.

Somente uma nova reauditoria GPT pode abrir o gate Anthropic.

## 10. Documentação operacional

Harmonizar na branch:

- `estado.md`: remover contradição entre “004E-04 autorizada” e seção posterior “004E-04 executada”; o estado corrente deve ficar claro como **004E-05 executada aguardando reauditoria** quando terminar;
- relatório Claude: atualizar o gate inicial para Anthropic e remover formulação que ainda trate `GEMINI_API_KEY` como pendência atual;
- preservar documentos históricos/auditorias, sem reescrevê-los.

## 11. Critérios para devolver ao GPT

Finalizar somente quando:

- `stop_reason` for tratado explicitamente;
- apenas `end_turn` puder seguir normalmente;
- refusal/max_tokens/outro stop reason não persistirem revisão;
- falhas pós-resposta preservarem usage confiável;
- Router registrar custo em run FAILED quando usage+preço forem conhecidos;
- nenhuma chamada real tiver ocorrido;
- `ANTHROPIC_API_KEY` continuar ausente;
- gate E2E/eval continuar fechado;
- CI completa estiver verde;
- relatório e estado da branch estiverem coerentes.

Status esperado:

**CORREÇÃO 004E-05 EXECUTADA — AGUARDANDO REAUDITORIA GPT PARA ABERTURA DO GATE ANTHROPIC**.

Claude não pede chave, não roda prova paga, não mergeia e não promove.

## 12. Fora de escopo

Permanece proibido:

- nova migration/DDL;
- trocar provider/modelo/preço;
- reativar Gemini;
- fallback multi-provider;
- retries automáticos;
- tool calling/web search/embeddings/RAG;
- Meta/003B;
- Content Intelligence;
- geração de conteúdo;
- Ads/campanhas;
- CRM/leads/WhatsApp;
- qualquer nova capacidade além da contabilização segura de respostas pagas.