# AUDITORIA 004E-06 — REFUSAL ZERO-OUTPUT ACCOUNTING

Data: 2026-08-26

Branch auditada: `claude/rodada-004e-declared-context-review-first-real-ai`

PR: #17 — draft/open/não mergeada.

HEAD auditado: `3ed3e586903aac9f31c5cb0bb57402a6619b1c9c`.

## 1. Veredito

**APROVADA PARA ABERTURA DO GATE ANTHROPIC CONTROLADO.**

A 004E continua **NÃO PROMOVIDA**. A aprovação desta auditoria autoriza somente a prova real controlada descrita no §7 deste documento.

## 2. Escopo efetivamente alterado

Comparação independente entre o HEAD reauditorado da 004E-05 (`cc5b7b7ac0118613de1e7d86b376480565033642`) e o HEAD atual confirmou delta restrito a:

- `src/lib/ai/adapters/anthropic.ts`;
- testes do adapter e do Router;
- documentação/estado/relatório da própria correção.

Sem migration, sem mudança de provider/modelo/preço, sem UI, sem Meta e sem nova capacidade de produto.

## 3. Defeito corrigido

A versão anterior exigia `output_tokens > 0` para aceitar o usage da Anthropic. A documentação oficial vigente mostra recusa com:

- `stop_reason = refusal`;
- `content = []`;
- `input_tokens = 412`;
- `output_tokens = 0`.

A correção separou duas perguntas que não podem ser confundidas:

1. quanto a resposta consumiu;
2. se a resposta pode ser usada pelo produto.

Agora:

- `input_tokens` continua obrigatório, inteiro e `> 0`;
- `output_tokens` é obrigatório, inteiro e pode ser `0`;
- negativo/fracionário/ausente continua inválido;
- cache inesperado continua falhando fechado;
- `refusal` com saída zero preserva usage e falha como `PROVIDER_REJECTED`;
- `end_turn` com saída zero **não** vira sucesso: falha como `USAGE_INVALID`, preservando usage conhecido;
- o Router consegue fechar o run `FAILED` com tokens/custo estimado quando o usage é confiável.

## 4. Provas

O relatório Claude registra:

- recusa literal 412/0 preservada;
- `end_turn` + output zero não vira sucesso;
- custo input-only reproduzível no Router;
- suíte local `1047/1047`;
- lint/typecheck/Deno/build verdes;
- gates pagos sem chave encerrando antes de chamada.

Verificação independente GPT da CI do HEAD:

- workflow `32966958426` — **success**;
- install — success;
- lint — success;
- typecheck — success;
- Edge Functions — success;
- testes — success;
- build — success.

## 5. Remoto

Consulta independente GPT no Supabase canônico após a execução confirmou:

- `declared_context_review_attempts = 0`;
- `declared_context_reviews = 0`;
- `ai_runs` da task `DECLARED_BUSINESS_CONTEXT_REVIEW = 0`.

Portanto, até esta auditoria:

**nenhuma chamada real Gemini ou Anthropic ocorreu e nenhum custo real de IA foi gerado.**

O estado do catálogo Anthropic/Gemini permanece o já aprovado na 004E-04: Anthropic Haiku 4.5 é o único candidato elegível e Gemini permanece histórico/inelegível.

## 6. Nuance de cobrança — dívida não bloqueadora

A documentação oficial Anthropic vigente esclarece que uma recusa que chega **antes de qualquer output** não é cobrada, embora `usage` seja informado e conte para rate limit. Uma recusa no meio da geração é cobrada pelo input e pelo output já produzido.

O ledger atual guarda `estimated_cost`, não `billed_cost`. No caso pré-output 412/0, a regra genérica de preço pode registrar uma estimativa conservadora positiva mesmo quando a fatura final da Anthropic for zero.

Decisão desta auditoria:

- **não bloquear o primeiro E2E por isso**;
- preservar usage é correto e mais seguro que descartá-lo;
- tratar essa diferença como dívida explícita de reconciliação de cobrança, não como fato de faturamento;
- se a prova real retornar `refusal`, parar sem retry e devolver ao GPT; a auditoria final deverá confrontar o ledger com a regra de cobrança aplicável antes de promoção.

Não introduzir agora `billed_cost`, fallback ou nova modelagem apenas para um caso que ainda não ocorreu na prova real.

## 7. Gate Anthropic controlado — AUTORIZADO

Está autorizado somente:

1. fundador disponibilizar `ANTHROPIC_API_KEY` **somente no ambiente local seguro**, nunca no chat/GitHub/documentação;
2. executar `npm run e2e:review` **uma única vez**;
3. se e somente se o E2E passar, executar `npm run eval:review` **uma única vez**;
4. usar somente fixtures sintéticas versionadas;
5. zero retry automático e zero retry manual por tentativa;
6. registrar run IDs, usage, custo estimado, resultado dos 12 casos e limpeza das fixtures;
7. se E2E ou eval falhar, **parar sem repetir chamada** e devolver ao GPT;
8. depois das duas provas, parar e devolver ao GPT para auditoria final da 004E.

## 8. Continua proibido

- merge/promover PR #17 antes da auditoria final;
- segundo provider/fallback;
- Gemini pago;
- web search/tool calling/embeddings/RAG;
- geração de copy/imagem;
- Content Intelligence;
- IA alterando automaticamente objetivo/foco/preço/oferta;
- qualquer gasto/ação externa por IA;
- qualquer avanço Meta/003B dependente do gate externo.

## 9. Próximo ator

**Fundador, orientado pelo GPT, para configurar a chave local sem expô-la.**

Depois da chave estar presente apenas no ambiente local seguro, o próximo ator será **Claude Code**, exclusivamente para executar o E2E uma vez e, somente se ele passar, a eval uma vez. Claude não mergeia nem promove.
