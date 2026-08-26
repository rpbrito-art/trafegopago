# RELATÓRIO — CORREÇÃO 004E-06 — REFUSAL ZERO-OUTPUT ACCOUNTING

Branch: `claude/rodada-004e-declared-context-review-first-real-ai` · PR #17 (draft/open, não mergeada)

Mandato: `rodadas/gpt/CORRECAO_004E_06_REFUSAL_ZERO_OUTPUT_ACCOUNTING.md`

## 1. Preflight

Working tree limpo; `origin/main` avançou e foi mergeada na branch (conflito só em `estado.md`, resolvido pela versão da `main`, soberana). Nenhuma migration, nenhuma mutação remota, `ANTHROPIC_API_KEY` ausente do runtime durante toda a execução.

## 2. Defeito

`normalizarUsage` exigia `output_tokens > 0` para os **dois** campos. A recusa oficial da Anthropic chega com `input_tokens: 412` e `output_tokens: 0`, então o usage era descartado antes de o stop reason ser classificado e o input consumido não chegava ao Router — run `FAILED` sem custo.

A causa é conceitual: uma única função respondia "quanto consumiu" e "isso serve?". São perguntas distintas, e a segunda é mais estrita.

## 3. Delta (5 arquivos, zero migration)

| Arquivo | Mudança |
|---|---|
| `src/lib/ai/adapters/anthropic.ts` | `input_tokens` continua `> 0`; `output_tokens` aceita `0`; ausente/negativo/fracionário segue inválido nos dois; cache positivo segue `USAGE_INVALID`. Novo check em `execute`: `end_turn` + saída zero → `USAGE_INVALID` **com usage preservado** |
| `src/lib/ai/adapters/anthropic.test.ts` | 4 casos novos (§5) |
| `src/lib/ai/router.test.ts` | 2 casos novos (§4) |

`calcularCusto` já aceitava `outputTokens >= 0` e `ai_runs_output_tokens_non_negative` já permitia `0` — nada a alterar em pricing, Router de produção ou banco.

## 4. Provas

| Prova | Fonte | Resultado |
|---|---|---|
| Recusa oficial (`content: []`, `refusal`, 412/0) preserva usage | `anthropic.test.ts` | `PROVIDER_REJECTED` + `{412, 0, null}`; `stop_details` não vaza |
| `end_turn` + saída zero não é sucesso | idem | `USAGE_INVALID` com usage preservado |
| Custo input-only no run FAILED, preço Haiku vigente | `router.test.ts` | `412 × 1,00/1M = 0.000412000000` USD, `error_class = PROVIDER_REJECTED` |
| Suíte completa | `npm test` | 1047/1047 (era 1041) |
| Lint / typecheck / Deno / build | scripts npm | verdes |
| Gates pagos sem chave | `npm run e2e:review`, `eval:review` | ambos exit **2**, antes de qualquer chamada |
| Zero execução real | `supabase db query` read-only | runs da task 0 · revisões 0 · tentativas 0 |

Ambos os casos novos do adapter são load-bearing: sem o check em `execute`, `content: []` cairia em `OUTPUT_SCHEMA_INVALID`, não `USAGE_INVALID`.

## 5. Fato divergente do mandato — para o GPT decidir

O mandato §2 afirma que a recusa "pode ser cobrada". A documentação oficial vigente é mais específica:

> "You are not billed for a refusal that arrives before any output. `content` is empty, and token counts appear in `usage` but are not charged. The request still counts against your rate limits. A mid-stream refusal bills the input tokens and the output already streamed at normal rates."

Ou seja: a recusa **pré-output** (exatamente a do exemplo 412/0) não é cobrada; a **mid-stream** é. Isso não altera o delta — preservar o consumo conhecido está correto em qualquer hipótese, e o campo é `estimated_cost`, estimativa a partir de consumo e preço vigentes. Mas significa que o custo registrado nesse caso específico tende a **superestimar** a fatura.

Não decidi nada a respeito: registrar consumo e deixar a fatura corrigir a estimativa é conservador; descartar o consumo não é. Se o GPT quiser distinguir recusa cobrada de não cobrada no ledger, isso é decisão de modelagem, não de execução. Ajustei apenas os comentários do adapter que afirmavam que toda resposta 200 é cobrada.

## 6. Pendências

Gate Anthropic segue **fechado**. Nenhuma chamada real ocorreu em nenhuma rodada 004E. PR #17 continua draft/open.
