# RELATÓRIO — RODADA 004E — DECLARED CONTEXT REVIEW + FIRST REAL AI

Mandato: `rodadas/gpt/RODADA_004E_DECLARED_CONTEXT_REVIEW_FIRST_REAL_AI.md`

Branch: `claude/rodada-004e-declared-context-review-first-real-ai` · base: `main` em `0ad811f`.

Status: **004E IMPLEMENTADA ATÉ GATE DE CREDENCIAL PAGA — AGUARDANDO AÇÃO GPT/FUNDADOR PARA PROVA E2E REAL**.

## 1. Gate de credencial — o que falta

`GEMINI_API_KEY` **não existe** em nenhum runtime alcançável: ambiente do processo, `.env.local` e secrets do repositório foram verificados por presença, sem leitura de valor.

Todo o delta que não depende da chave está executado, publicado e provado. A prova E2E real (§15) é a única pendência, e não foi improvisada: nenhuma chamada ao provider foi feita, nenhum custo foi gerado, nenhum fake substituiu o provider.

O runtime que precisa da variável é o servidor da aplicação (Next.js server-side) e, para a prova, o shell que roda `npm run e2e:review`. Nenhum segredo foi exposto nesta rodada. O GPT conduz a ação manual — este relatório não instrui o fundador.

`scripts/e2e-declared-context-review.mjs` está versionado e pronto: sem a chave, ele para com código 2 e mensagem de gate, sem tentar nada.

## 2. Delta

### 2.1 Migration `20260825250000_create_declared_context_review.sql`

Aditiva; nenhuma migration aplicada foi tocada.

- catálogo real: provider `google_gemini` (`free_tier_authorized: false`), modelo `gemini-2.5-flash-lite` no Tier 1 com as capacidades da task, e preço Standard Paid **USD 0.10 / 0.40 / 0.01** por 1M tokens, com `source_note` citando a URL oficial e a data de verificação;
- `declared_context_reviews`: FK composta `(ai_run_id, organization_id)` → `ai_runs (id, organization_id)`, único por `(organization_id, fingerprint, versões)`, `authenticated` só SELECT, `service_role` sem UPDATE nem DELETE, e trigger que recusa **todo** UPDATE — o artefato nasce pronto.

Os inserts do catálogo são idempotentes (`on conflict do nothing` e `not exists`): reaplicar em outro ambiente não duplica nem altera o que já foi auditado.

### 2.2 Task, prompt e grounding

`DECLARED_BUSINESS_CONTEXT_REVIEW@v1`, prompt `v1`, schema `v1`. Tenant-scoped, Tier 1 apenas, capacidades `STRUCTURED_EXTRACTION` + `JSON_SCHEMA_NATIVE` + `LOW_COST`. Nenhum componente de produto conhece provider ou modelo — há teste que varre `src/app`, `src/components` e `src/lib/review` procurando marca e literal de modelo.

O JSON Schema enviado ao provider é escrito à mão, e não derivado do Zod: conversores genéricos produzem `$ref` e `anyOf` que o provider recusa. O Zod continua sendo a validação que vale.

Grounding: todo `evidenceRef` é conferido contra o snapshot enviado. Uma referência inexistente invalida o output **inteiro** — publicar o resto deixaria o usuário sem saber qual parte tem base. Lacunas podem não ter âncora, de propósito: elas falam do que não está no snapshot, e exigir ref obrigaria o modelo a inventar uma.

### 2.3 Adapter Gemini

`@google/genai` **2.18.0**, fixado exato. Chave lida server-side no momento da chamada; ausente, falha com `PROVIDER_UNAVAILABLE` — sem fake, sem fallback silencioso.

Usage normalizado para o contrato da 004A: `inputTokens = promptTokenCount − cachedContentTokenCount`, porque o contrato define `cachedTokens` disjunto da entrada e o provider a reporta incluída; `outputTokens = candidatesTokenCount + thoughtsTokenCount`, porque raciocínio é cobrado como saída. Contagem incoerente vira `USAGE_INVALID` em vez de estimativa. Raciocínio desabilitado (`thinkingBudget: 0`), saída limitada, timeout explícito, erro traduzido para a taxonomia interna sem repassar mensagem do provider.

### 2.4 Custo e abuso

Nesta ordem: cache por fingerprint → papel (owner/admin) → teto de 3 chamadas não cacheadas por organização por hora, medido em `ai_runs` pelo relógio do servidor → Router. A contagem inclui runs falhos: a chamada já custou, e contar só sucesso deixaria a cota ser queimada por falhas. Falha ao contar **não** libera a chamada.

`/inicio` e `/revisao` não chamam o provider ao renderizar. A única porta é o clique, e a action que a atende não recebe parâmetro algum — nada vindo do formulário influencia o que será revisado.

### 2.5 UX e motor

`/revisao` mostra resumo, o que foi contado, o que falta esclarecer, pontos a confirmar e uma pergunta recomendada, com o aviso estático de que nada além do declarado foi observado — renderizado por código, não pelo campo `limitations` do modelo. O motor da 004D ganhou `REVISAR_CONTEXTO_DECLARADO` e `CONTEXTO_DECLARADO_REVISADO`, decididos por comparação de fingerprint; estado desconhecido para em `BASE_ESTRATEGICA_PRONTA` em vez de supor ausência.

## 3. Provas

| prova | fonte | resultado |
| --- | --- | --- |
| catálogo, artefato, RLS e imutabilidade no remoto | `scripts/sql/declared-context-review-004e-proof.sql` | **25 casos, 25 passaram, 0 falharam** |
| task, schema e grounding | `src/lib/ai/tasks/declared-context-review.test.ts` | 17 casos |
| adapter: usage, erros e ausência de chave | `src/lib/ai/adapters/gemini.test.ts` | 15 casos |
| cache, papel, rate limit e persistência | `src/lib/review/declared-context-review.test.ts` | 14 casos |
| eval sintética em português | `src/lib/review/context-snapshot-builder.test.ts` | 12 fixtures + invariantes |
| motor com os estados novos | `src/lib/growth/journey.test.ts` | 21 casos |
| suíte local | `npx vitest run` | **973/973** em 48 arquivos |
| tipos e lint | `tsc --noEmit`, `eslint` | limpos |
| advisors | MCP Supabase, security | idênticos ao baseline |
| **E2E real paga** | — | **bloqueada pelo gate de credencial** |

A eval não exige frase literal: prova invariantes — ausência vira ausência, campo vazio não vira fato, texto com prompt injection viaja como valor de campo, e o fingerprint muda quando e só quando o contexto muda.

Três testes da 004A foram atualizados. Eles afirmavam "registro de tasks vazio", "nenhum adapter" e "nenhuma marca de provider na camada" — verdades daquela rodada, que a 004E torna falsas por design. As invariantes que continuam valendo foram reescritas de forma mais precisa: o registro tem **um** provider, que é o catalogado; a task é uma, versionada e tenant-scoped; e **quem decide** não conhece marca — Router, catálogo, ledger e preço seguem escolhendo por capacidade, com o nome comercial existindo apenas no adapter e no ato de registrá-lo.

Correção durante a execução: a eval recusava qualquer ocorrência de "meta" e "instagram" no snapshot. Isso derrubava dois casos legítimos — "Meta comercial" é o objetivo que o negócio declarou, e "Meu perfil no Instagram" é o destino que ele escolheu. A asserção passou a proibir o que realmente não pode viajar: ids de conexão, conta de anúncios, página, token e métricas.

## 4. Supabase remoto

Migration aplicada: `20260825250000_create_declared_context_review`, publicada na branch antes do `db push`. Pós-estado verificado pela própria prova: catálogo com uma única versão de preço aberta, sem segredo em `config_metadata`; artefato com RLS, cache único por tenant e imutável; browser sem escrita e sem leitura do catálogo de preços. Zero fixtures residuais — a prova é transacional com rollback.

## 5. Fora de escopo — não feito

Sem Meta, sem segundo provider, sem fallback multi-provider, sem tool calling, sem embeddings, sem geração de conteúdo, sem Content Intelligence, sem CRM, sem App Shell. A `nextQuestion` é orientação: nada do output altera automaticamente objetivo, foco, preço ou oferta.

## 6. Pendências

Uma, e é o gate: **prova E2E real paga**. Depende de `GEMINI_API_KEY` de projeto no Paid Tier existir no runtime. Próximo ator: **GPT**, para conduzir a disponibilização da credencial; depois disso, a prova roda por `npm run e2e:review` e a rodada pode ser fechada.
