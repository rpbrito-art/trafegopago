# CORREÇÃO 004E-06 — REFUSAL ZERO-OUTPUT ACCOUNTING

Status: **CORREÇÃO OBRIGATÓRIA E AUTORIZADA DA RODADA 004E**.

Data: 2026-08-26

Origem:

`rodadas/gpt/AUDITORIA_004E_05_PAID_RESPONSE_ACCOUNTING.md`

Branch a continuar:

`claude/rodada-004e-declared-context-review-first-real-ai`

PR #17: manter **draft/open**, não mergear.

## 1. Objetivo estrito

Fechar a última lacuna conhecida de contabilização pré-paga da 004E:

**uma resposta Anthropic HTTP 200 com `stop_reason = refusal`, `input_tokens > 0` e `output_tokens = 0` precisa ser recusada como conteúdo, mas o usage cobrável de input precisa chegar ao Router e ser registrado no run FAILED.**

A documentação oficial Anthropic vigente em 2026-08-26 publica exatamente esse formato em `Refusals and fallback`.

Esta correção NÃO autoriza chamada real. Não muda provider, modelo, preço, migration, task, prompt, schema de produto, UI ou Meta.

Até reauditoria GPT:

- NÃO usar `ANTHROPIC_API_KEY`;
- NÃO executar E2E/eval pagos;
- NÃO mergear/promover PR #17;
- NÃO tocar Meta/003B.

## 2. Contrato externo que deve ser respeitado

Fontes oficiais:

- `https://platform.claude.com/docs/en/build-with-claude/refusals-and-fallback`
- `https://platform.claude.com/docs/en/api/typescript/messages`

Fatos relevantes:

- `refusal` é resposta HTTP 200;
- pode ser cobrada;
- traz `usage`;
- exemplo oficial atual: `input_tokens = 412`, `output_tokens = 0`;
- `output_tokens = 0` portanto **não é automaticamente usage inválido em uma resposta anormal**;
- em resposta normal `end_turn` desta task, saída zero continua incompatível com sucesso útil e deve falhar fechado.

## 3. Alteração obrigatória no adapter

A lógica de usage precisa separar:

1. **usage contábil da resposta** — suficiente para registrar custo real conhecido;
2. **condição de sucesso da task** — mais estrita.

Implementação esperada, sem impor nome de função:

- `input_tokens` deve existir, ser inteiro e `> 0`;
- `output_tokens` deve existir, ser inteiro e `>= 0` para preservar usage de uma resposta cobrável;
- negativo, fracionário ou ausente continua inválido;
- cache read/creation positivo continua `USAGE_INVALID` nesta rodada;
- `cachedTokens = null` permanece.

Depois de normalizar o usage:

- se `stop_reason !== "end_turn"`, falhar conforme a classificação já aprovada e **carregar usage**, inclusive quando `outputTokens = 0`;
- se `stop_reason === "end_turn"` e `outputTokens = 0`, retornar `USAGE_INVALID` **com o usage preservado**, para que o Router contabilize ao menos o input conhecido e não aceite a resposta como sucesso;
- somente `end_turn` + usage compatível + JSON válido segue ao Router como `ok: true`.

Não estimar token ausente por texto. Não converter zero conhecido em null. Não inventar output token.

## 4. Router/ledger

A infraestrutura adicionada na 004E-05 deve permanecer.

Provar que, para uma falha com:

- `inputTokens = 412`;
- `outputTokens = 0`;
- preço do Haiku vigente;
- classe `PROVIDER_REJECTED`;

o Router fecha o run como `FAILED` contendo:

- `input_tokens = 412`;
- `output_tokens = 0`;
- `estimated_cost` não nulo e reproduzível;
- `currency = USD`;
- `error_class = PROVIDER_REJECTED`.

O custo deve ser exclusivamente o que a fórmula vigente resulta dos tokens conhecidos; zero output não significa custo total zero.

Também provar `end_turn + outputTokens = 0`:

- não vira sucesso;
- termina como falha contábil com usage preservado;
- não inventa output.

Nenhuma mudança de schema/banco é esperada.

## 5. Testes obrigatórios

### Adapter

Adicionar caso que reproduza literalmente a forma oficial da recusa:

- `content: []`;
- `stop_reason: "refusal"`;
- `usage.input_tokens = 412`;
- `usage.output_tokens = 0`.

Esperado:

- `ok = false`;
- `errorClass = PROVIDER_REJECTED`;
- usage preservado `{ inputTokens: 412, outputTokens: 0, cachedTokens: null }`;
- nenhum texto de `stop_details`/recusa vaza.

Adicionar ainda:

- `end_turn` + output zero → `USAGE_INVALID` com usage preservado;
- output negativo/fracionário/ausente continua inválido;
- input zero/negativo/fracionário/ausente continua inválido;
- cache positivo continua inválido.

### Router

Adicionar prova de custo do refusal com output zero, conforme §4.

### Regressão

Executar:

- suíte completa;
- lint;
- typecheck;
- typecheck Edge Functions;
- build;
- gates `e2e:review` e `eval:review` **sem chave**, que devem continuar parando antes de chamada externa.

## 6. Remoto

Não há migration nem mutação remota autorizada nesta correção.

Claude pode fazer somente verificação read-only de que continuam:

- zero tentativas reais;
- zero revisões reais;
- zero runs reais da task.

## 7. Critérios de conclusão

Devolver ao GPT somente quando:

- recusa oficial com output zero preservar usage;
- Router registrar custo input-only correspondente em FAILED;
- `end_turn + output zero` não puder virar sucesso e ainda preservar o usage conhecido;
- demais validações de usage/cache continuarem fail-closed;
- nenhuma chave tiver sido usada;
- nenhuma chamada real tiver ocorrido;
- CI completa estiver verde;
- PR #17 continuar draft/open/não mergeado;
- relatório e `estado.md` da branch refletirem:

**CORREÇÃO 004E-06 EXECUTADA — AGUARDANDO REAUDITORIA GPT PARA ABERTURA DO GATE ANTHROPIC**.

## 8. Fora de escopo

Continua proibido:

- chamada real Anthropic;
- retry/fallback;
- segundo provider ativo;
- alterar modelo/preço;
- migration/DDL;
- prompt caching;
- tools/web search/embeddings/RAG;
- geração de conteúdo;
- Meta/003B;
- qualquer nova capacidade de produto.
