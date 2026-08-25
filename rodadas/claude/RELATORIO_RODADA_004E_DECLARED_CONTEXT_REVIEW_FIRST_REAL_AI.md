# RELATÓRIO — RODADA 004E — DECLARED CONTEXT REVIEW + FIRST REAL AI

Mandato: `rodadas/gpt/RODADA_004E_DECLARED_CONTEXT_REVIEW_FIRST_REAL_AI.md`

Branch: `claude/rodada-004e-declared-context-review-first-real-ai` · base: `main` em `0ad811f`.

Status: **CORREÇÃO 004E-02 EXECUTADA — AGUARDANDO REAUDITORIA GPT PARA ABERTURA DO GATE PAGO**.

Auditoria: `rodadas/gpt/AUDITORIA_004E_DECLARED_CONTEXT_REVIEW_FIRST_REAL_AI.md` — cinco bloqueios. Correção: `rodadas/gpt/CORRECAO_004E_01_PREPAID_SAFETY_PROVIDER_CONTRACT.md`, executada nesta mesma branch e registrada na §7 abaixo.

**Nenhuma chamada paga foi feita nesta correção.** A credencial continua bloqueada e só deve ser disponibilizada após a reauditoria.

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
| CI final | `32904274001` no PR #17 | **success**, 973/973, lint/typecheck/Edge Functions/build verdes |
| **E2E real paga** | — | **bloqueada pelo gate de credencial** |

A eval não exige frase literal: prova invariantes — ausência vira ausência, campo vazio não vira fato, texto com prompt injection viaja como valor de campo, e o fingerprint muda quando e só quando o contexto muda.

Três testes da 004A foram atualizados. Eles afirmavam "registro de tasks vazio", "nenhum adapter" e "nenhuma marca de provider na camada" — verdades daquela rodada, que a 004E torna falsas por design. As invariantes que continuam valendo foram reescritas de forma mais precisa: o registro tem **um** provider, que é o catalogado; a task é uma, versionada e tenant-scoped; e **quem decide** não conhece marca — Router, catálogo, ledger e preço seguem escolhendo por capacidade, com o nome comercial existindo apenas no adapter e no ato de registrá-lo.

Correção durante a execução: a eval recusava qualquer ocorrência de "meta" e "instagram" no snapshot. Isso derrubava dois casos legítimos — "Meta comercial" é o objetivo que o negócio declarou, e "Meu perfil no Instagram" é o destino que ele escolheu. A asserção passou a proibir o que realmente não pode viajar: ids de conexão, conta de anúncios, página, token e métricas.

## 4. Supabase remoto

Migration aplicada: `20260825250000_create_declared_context_review`, publicada na branch antes do `db push`. Pós-estado verificado pela própria prova: catálogo com uma única versão de preço aberta, sem segredo em `config_metadata`; artefato com RLS, cache único por tenant e imutável; browser sem escrita e sem leitura do catálogo de preços. Zero fixtures residuais — a prova é transacional com rollback.

## 5. Fora de escopo — não feito

Sem Meta, sem segundo provider, sem fallback multi-provider, sem tool calling, sem embeddings, sem geração de conteúdo, sem Content Intelligence, sem CRM, sem App Shell. A `nextQuestion` é orientação: nada do output altera automaticamente objetivo, foco, preço ou oferta.

## 7. Correção 004E-01 — segurança pré-paga e contrato do provider

Cinco bloqueios, todos fechados sem nenhuma chamada ao provider.

### 7.1 A — JSON Schema no subconjunto oficial

O schema enviado por `responseJsonSchema` usava `maxLength` e `nullable`. Confirmei na documentação oficial vigente (`ai.google.dev/gemini-api/docs/structured-output`, revalidada nesta execução) que nenhuma das duas consta no subconjunto suportado, e que a forma documentada para valor nulo é **união de tipos** — `["string", "null"]` no exemplo oficial.

`maxLength` saiu; os limites de texto continuam no Zod, que é quem recusa de fato, e o provider passou a ser orientado por `description`. `nextQuestion` virou `type: ["object", "null"]`. `KEYWORDS_SUPORTADAS` e uma varredura recursiva no teste derrubam a build se alguém reintroduzir keyword fora da lista.

### 7.2 B — reserva atômica antes da chamada paga

Migration aditiva `20260825260000_create_review_attempt_reservation`: tabela de tentativas e duas RPCs server-only.

`acquire_declared_context_review_slot` decide **num único passo serializado por advisory lock** se há cache, se já existe execução do mesmo contexto em andamento, se o papel autoriza e se ainda há vaga na janela de uma hora. Devolve `CACHE | IN_FLIGHT | RATE_LIMITED | RESERVED`. Quem não adquire não chega ao Router.

Duas garantias vivem no banco, não na aplicação: um índice único parcial impede duas reservas `RESERVED` do mesmo contexto, e a contagem da janela acontece sob o mesmo lock. Reserva órfã expira e é recuperável; tentativa que falhou continua consumindo cota, porque o que custa é ter chegado a chamar.

Os testes de limite passaram a exercitar **concorrência**: `Promise.all` de duas chamadas do mesmo contexto e de quatro contextos distintos. O código auditado passava nos testes sequenciais e falhava nesses.

### 7.3 C — mensagem de custo honesta

A action prometia que "nada foi cobrado" quando a revisão não ficava pronta. Depois que a chamada alcança o provider isso não é garantido — grounding ou persistência podem falhar com a chamada já feita, e abortar do lado do cliente não cancela o processamento no serviço. A mensagem passou a ser neutra: *"Não foi possível concluir a revisão agora."*

### 7.4 D — E2E que prova o caminho produtivo

O script chamava o Router direto e não criava artefato. Agora chama `revisarContextoDeclarado` e verifica em 12 asserções: revisão criada, artefato persistido, tenant do run, modelo do catálogo, usage registrado, custo reproduzível pela versão de preço, segunda chamada em cache, e ausência de segundo run ou segunda tentativa.

### 7.5 E — eval da resposta, não do snapshot

`scripts/eval-declared-context-review.mjs` roda os 12 casos e valida invariantes: schema, refs válidas, ausência de afirmações externas proibidas (mercado, preço alto/baixo, conversão, demanda, percentuais), lacunas para as ausências esperadas, tensão sempre com confirmação humana, injection sem troca de papel e português utilizável. Uma execução por caso, sem retry.

### 7.6 Achado próprio

Os advisors apontaram duas FKs do meu próprio delta sem cobertura: eu criara os índices com as colunas invertidas em relação às FKs compostas, então eles não cobriam nada. Migration `20260825270000` cria os índices na ordem certa e remove os que não serviam.

### 7.7 Provas da correção

| prova | resultado |
| --- | --- |
| `scripts/sql/review-attempt-reservation-004e01-proof.sql` | **23 casos, 23 passaram, 0 falharam** |
| concorrência, cache, teto e reserva | `src/lib/review/declared-context-review.test.ts` — 20 casos |
| allowlist do schema do provider | `src/lib/ai/tasks/declared-context-review.test.ts` — 21 casos |
| suíte local | **983/983** em 48 arquivos |
| advisors | os dois `unindexed_foreign_keys` do delta foram quitados |
| gate dos scripts | `e2e:review` e `eval:review` param com código 2, sem chamar nada |
| CI da correção | `32908302698` — success, 983/983 |

Correção durante a execução: a prova tentava simular reserva vencida movendo só `expires_at` para o passado, e a constraint `expires_at > reserved_at` recusou — corretamente, porque é um estado incoerente. A simulação passou a envelhecer a tentativa inteira.

## 8. Correção 004E-02 — invariantes finais pré-pagas

Três achados da reauditoria, todos fechados sem nenhuma chamada ao provider.

### 8.1 A — a FK não pode zerar o tenant

A FK composta usava `on delete set null` **sem lista de colunas**. Sem a lista, o Postgres zera todas as colunas referenciadoras — e uma delas é `organization_id`, que é `not null`. Apagar um run referenciado falharia, o cascade da organização poderia travar junto, e a intenção nunca foi perder o tenant: era perder só a referência ao run.

Migration aditiva `20260825280000` recria a constraint com `on delete set null (ai_run_id)`. A prova confere o catálogo (`confdeltype` e `confdelsetcols`) e o comportamento: o run é apagado, a tentativa sobrevive com `ai_run_id` nulo e `organization_id` intacto, cross-tenant continua recusado, e o cascade da organização não trava nem deixa resíduo.

### 8.2 B — usage ausente não vira custo zero

`normalizarUsage()` fazia `?? 0`, o que convertia "o provider não informou" em "custou nada" — e uma chamada paga entraria no ledger como gratuita. Numa task que envia prompt não vazio e exige JSON não vazio de volta, entrada ou saída zero são impossíveis: se aparecem, o metadado não é confiável.

`promptTokenCount` e `candidatesTokenCount` passaram a ser obrigatórios e positivos; ausência, zero, negativo ou fracionário resultam em `USAGE_INVALID`. `cachedContentTokenCount` ausente continua significando "não informado" — zero na subtração, `null` no contrato. `thoughtsTokenCount` ausente é legitimamente zero. Nenhuma estimativa por tamanho de texto.

### 8.3 C — a eval precisa reprovar omissão

Duas falhas do avaliador anterior. A checagem de ausência era condicionada a `gaps.length > 0`, então devolver **zero** lacunas — a pior omissão — escapava de toda a verificação. E a expectativa de tensão era inferida do nome do caso, o que quebraria em silêncio numa renomeação.

O avaliador saiu do script para `src/lib/review/eval-criteria.ts`, importável e com teste próprio em CI — a versão anterior só podia ser exercitada junto com a chamada paga, que é como as duas falhas passaram. Ausência esperada com `gaps` vazio agora reprova; tensão virou `esperaTensao` explícito na fixture, com `refsDaTensao` exigindo que a tensão esteja ancorada nos lados que de fato divergem.

Achado no caminho: o detector de afirmações externas exigia adjacência, então "o preço **está** alto" passava; e `\w` não casa letra acentuada. Os padrões foram corrigidos e cada um tem caso de teste.

### 8.4 Provas da correção

| prova | resultado |
| --- | --- |
| `scripts/sql/review-attempt-run-delete-004e02-proof.sql` | **13 casos, 13 passaram, 0 falharam** |
| usage obrigatório e opcionais | `src/lib/ai/adapters/gemini.test.ts` — 22 casos |
| avaliador da eval | `src/lib/review/eval-criteria.test.ts` — 17 casos |
| suíte local | **1007/1007** em 49 arquivos |
| gate dos scripts pagos | `e2e:review` e `eval:review` seguem parando com código 2 |

Correção durante a execução: a fixture da prova criava `ai_runs` com status `SUCCEEDED` sem custo, e a constraint `ai_runs_succeeded_requires_cost` da 004A recusou — corretamente, porque é exatamente a invariante que impede uma chamada paga entrar no ledger como gratuita. A fixture passou a registrar custo, que é o cenário real.

## 9. Handoff

Branch publicada; PR #17 mantido aberto, draft, base `main`, não mergeado.

Branch atualizada com a `main` documental por merge; único conflito em `estado.md`, resolvido pela versão da `main`.

Migrations aplicadas nesta branch, nenhuma reescrita: `20260825250000`, `20260825260000`, `20260825270000` e `20260825280000`.

`estado.md` da branch em **CORREÇÃO 004E-02 EXECUTADA — AGUARDANDO REAUDITORIA GPT PARA ABERTURA DO GATE PAGO**. Working tree limpa.

## 10. Pendências

Uma, e continua sendo o gate: **prova E2E real paga e eval real**. Ambas dependem de `GEMINI_API_KEY` de projeto no Paid Tier, que continua ausente.

Próximo ator: **GPT auditor**, para reauditar a Correção 004E-02. Só depois da aprovação a credencial deve ser disponibilizada; então `npm run e2e:review` e `npm run eval:review` fecham a rodada.
