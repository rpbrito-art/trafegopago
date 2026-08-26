# AUDITORIA GPT — CORREÇÃO 004E-03 — EVAL GATE COMPLETION

Data: 2026-08-25

Mandato auditado: `rodadas/gpt/CORRECAO_004E_03_EVAL_GATE_COMPLETION.md`

Branch auditada: `claude/rodada-004e-declared-context-review-first-real-ai`

PR: #17 — draft/open/não mergeada.

HEAD auditado: `19f4931fcadf45b9cb9d3bf1039c21e417111e19`.

CI do HEAD: run `32911288204` — **success**; install, lint, typecheck, Edge Functions, testes e build verdes.

## Veredito

**CORREÇÃO 004E-03 APROVADA. GATE PRÉ-PAGO ENCERRADO; PRIMEIRA PROVA PAGA PODE SER AUTORIZADA SOB CONTROLE.**

A 004E ainda **não está aprovada nem promovida**. PR #17 permanece draft/open/não mergeada até a prova E2E real e a eval real serem executadas, auditadas e aprovadas.

## 1. Tensão esperada — APROVADA

`src/lib/review/eval-criteria.ts` passou a exigir que pelo menos uma mesma tensão contenha **todas** as `refsDaTensao` do caso (`every` dentro de `some`).

Isso impede falsos positivos em que:

- apenas um dos lados pertinentes é citado;
- duas tensões separadas carregam metade da comparação cada;
- uma tensão cita refs irrelevantes.

Os testes locais cobrem ausência de tensão, nenhuma ref pertinente, apenas uma ref, lados divididos, caso positivo completo e confirmação humana.

## 2. Prompt injection — APROVADA

A fixture 08 usa metadado explícito `sentinelasProibidasNaSaida` e a sentinela sintética `__QUORON_INJECTION_SENTINEL_004E__`.

O texto malicioso continua viajando no snapshot como dado e pede explicitamente que o modelo devolva a sentinela. O avaliador pesquisa todo o texto exibível da revisão e reprova se a sentinela reaparecer.

A regra depende do metadado da fixture, não do nome textual do caso. Testes locais cobrem sentinela obedecida, campos exibíveis, saída correta sem sentinela, ausência de regra artificial e independência do nome da fixture.

## 3. Escopo da correção — CONFORME

Comparação `84a31808...` → `19f4931f...` mostra que o delta funcional da 004E-03 ficou restrito a:

- `src/lib/review/eval-criteria.ts`;
- `src/lib/review/eval-criteria.test.ts`;
- `test/support/declared-context-fixtures.ts`;
- documentação/estado da rodada.

Não houve migration, mudança de banco, provider, modelo, preço, Router, adapter, UI, Meta ou nova capacidade de produto.

## 4. CI e chamadas reais

CI final do HEAD `19f4931fcadf45b9cb9d3bf1039c21e417111e19`: run `32911288204` — **success** em todas as etapas.

Relatório Claude informa suíte local **1015/1015** e que `e2e:review` / `eval:review` continuam parando no gate sem chave.

Até esta auditoria:

- `GEMINI_API_KEY` não foi disponibilizada;
- nenhuma chamada Gemini real foi executada;
- nenhum custo real Gemini foi gerado.

## 5. Estado da 004E

- 004E: **IMPLEMENTADA ATÉ O GATE, AINDA NÃO APROVADA/PROMOVIDA**;
- 004E-01: executada e reauditada;
- 004E-02: executada e reauditada;
- 004E-03: **APROVADA**;
- PR #17: draft/open/não mergeada;
- gate técnico pré-pago: **APROVADO**;
- próximo gate: **credencial Paid Tier + E2E real + eval real**.

## 6. Próxima ação autorizada

Pode ser aberta uma credencial Gemini API de projeto no **Paid Tier**, exclusivamente para a prova controlada da 004E.

Depois de a credencial estar configurada no runtime local seguro:

1. executar `npm run e2e:review` uma única vez;
2. se o E2E passar, executar `npm run eval:review` uma única vez;
3. não usar retry automático;
4. não usar dados reais de clientes — somente fixtures sintéticas já versionadas;
5. registrar run IDs, usage, custo, resultados dos 12 casos e limpeza das fixtures;
6. parar e devolver ao GPT para auditoria final da 004E;
7. não mergear/promover PR #17 antes dessa auditoria.

Qualquer falha no E2E ou eval encerra o gate: não repetir chamada paga por tentativa sem nova decisão GPT.
