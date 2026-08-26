# AUDITORIA 004E-05 — PAID RESPONSE ACCOUNTING

Status: **REAUDITORIA GPT CONCLUÍDA — CORREÇÃO 004E-05 EXECUTADA, MAS GATE ANTHROPIC AINDA BLOQUEADO**.

Data: 2026-08-26

Branch auditada:

`claude/rodada-004e-declared-context-review-first-real-ai`

PR #17: draft/open/não mergeado.

HEAD auditado:

`cc5b7b7ac0118613de1e7d86b376480565033642`

CI do HEAD:

`32964016218` — **success**; install, lint, typecheck, Edge Functions, testes e build verdes.

## 1. Escopo da reauditoria

Reauditar exclusivamente a Correção 004E-05, publicada em:

`rodadas/gpt/CORRECAO_004E_05_PAID_RESPONSE_ACCOUNTING.md`

Objetivo da 004E-05:

- tratar `stop_reason` da Claude Messages API;
- permitir somente `end_turn` como resposta utilizável;
- falhar fechado em `refusal`, `max_tokens` e motivos inesperados;
- preservar usage de respostas HTTP 200 já cobradas;
- registrar tokens/custo em `ai_runs` FAILED quando conhecidos;
- manter zero chamadas reais durante a correção.

## 2. O que foi corretamente executado

O delta entre o HEAD anterior `22555677c86012bd16293e16bb3e1f3e78c15585` e o HEAD auditado ficou concentrado no contrato do adapter, adapter Anthropic, Router, testes e documentação. Não houve migration, novo provider, novo modelo, mudança de preço, feature, UI ou Meta.

### 2.1 `stop_reason`

O adapter agora:

- considera apenas `end_turn` como caminho normal;
- classifica `refusal` como `PROVIDER_REJECTED`;
- classifica `max_tokens` como `OUTPUT_SCHEMA_INVALID`;
- trata demais motivos/ausência como `UNKNOWN`;
- não propaga texto de recusa nem `stop_details`.

Isso está alinhado com a documentação oficial Anthropic vigente em 2026-08-26.

### 2.2 Falha pós-resposta pode carregar usage

`AIAdapterResult` agora admite `usage` também em `ok: false`.

O Router:

- distingue falha sem resposta confiável de falha após resposta com usage;
- calcula custo da falha usando a mesma versão de preço previamente resolvida;
- persiste input/output/cache/custo/moeda/latência no run `FAILED` quando o usage é conhecido;
- preserva a classe de erro original quando o custo é calculável;
- falha fechado se o custo não puder ser calculado.

A alteração é conceitualmente correta e fecha o defeito apontado pela 004E-04 para respostas pós-provider com usage válido.

### 2.3 CI e estado remoto

CI final do HEAD está verde.

Verificação independente GPT no Supabase remoto confirmou após a execução:

- `declared_context_review_attempts = 0`;
- `declared_context_reviews = 0`;
- `ai_runs` reais da task `DECLARED_BUSINESS_CONTEXT_REVIEW = 0`.

Portanto, **nenhuma chamada Anthropic real ocorreu e nenhum custo real foi gerado**.

## 3. BLOQUEIO ENCONTRADO — refusal oficial com `output_tokens = 0`

A reauditoria voltou à documentação oficial Anthropic, em especial:

- `https://platform.claude.com/docs/en/build-with-claude/refusals-and-fallback`
- `https://platform.claude.com/docs/en/api/typescript/messages`

A própria Anthropic publica como exemplo normal de `refusal` uma resposta HTTP 200 com:

- `input_tokens: 412`;
- `output_tokens: 0`;
- `stop_reason: "refusal"`.

Esse caso é cobrável no input e é parte do contrato real do provider.

### 3.1 O código atual ainda perde esse custo

`normalizarUsage()` exige atualmente que **input e output sejam > 0**.

Logo, a resposta oficial acima:

1. chega com uma cobrança conhecida de input;
2. tem `output_tokens = 0` válido para refusal;
3. é rejeitada por `normalizarUsage()` antes da inspeção de `stop_reason`;
4. retorna `USAGE_INVALID` **sem `usage`**;
5. o Router fecha o run FAILED sem tokens/custo.

Isso reproduz exatamente a lacuna contábil que a 004E-05 pretendia eliminar.

### 3.2 Os testes atuais não capturam o caso real

Os testes de `refusal` usam a fixture comum:

`input_tokens = 1200`, `output_tokens = 300`.

Portanto provam uma recusa com output positivo, mas não a forma explicitamente documentada pela Anthropic com zero output.

O teste antigo ainda afirma que `output_tokens = 0` é sempre metadata inválida, o que deixou de ser uma invariante correta para respostas anormais.

## 4. Veredito

**004E-05 = EXECUTADA E REAUDITADA, MAS NÃO APROVADA PARA ABERTURA DO GATE PAGO.**

A arquitetura de `stop_reason` + usage em falha está correta, porém falta representar uma resposta cobrável com output zero.

O gate Anthropic continua **FECHADO**.

Não disponibilizar `ANTHROPIC_API_KEY`, não executar E2E/eval reais e não mergear/promover PR #17.

## 5. Correção obrigatória

Publicar e executar:

`rodadas/gpt/CORRECAO_004E_06_REFUSAL_ZERO_OUTPUT_ACCOUNTING.md`

A correção deve ser mínima e sem migration.

Próximo ator após publicação no `estado.md`: **Claude Code**.
