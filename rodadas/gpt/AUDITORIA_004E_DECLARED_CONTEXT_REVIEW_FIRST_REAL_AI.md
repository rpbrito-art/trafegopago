# AUDITORIA GPT — RODADA 004E — DECLARED CONTEXT REVIEW + FIRST REAL AI

Data: 2026-08-25

Mandato: `rodadas/gpt/RODADA_004E_DECLARED_CONTEXT_REVIEW_FIRST_REAL_AI.md`

Branch auditada: `claude/rodada-004e-declared-context-review-first-real-ai`

PR: #17 — draft, open, não mergeada.

HEAD auditado: `72510c595518aefe72301dd88b4e1362fb8d89b6`.

CI auditada: `32904274001` — **success**; lint, typecheck, Edge Functions, 973/973 testes e build verdes.

Status declarado pelo executor: **IMPLEMENTADA ATÉ GATE DE CREDENCIAL PAGA**.

## Veredito

**004E IMPLEMENTADA PARCIALMENTE E AUDITADA, MAS BLOQUEADA ANTES DO GATE DE CREDENCIAL PAGA.**

Não configurar `GEMINI_API_KEY`, não executar chamada paga e não promover/mergear o PR #17 ainda.

A maior parte da arquitetura está correta, mas quatro bloqueios precisam ser fechados antes de expor uma credencial paga ao caminho produtivo.

## 1. O que foi aprovado nesta auditoria

Foram confirmados:

- task produtiva tenant-scoped, Tier 1, atrás do Router da 004A;
- feature não escolhe provider/modelo diretamente;
- `@google/genai` fixado em `2.18.0`;
- segredo previsto exclusivamente como `GEMINI_API_KEY` server-side;
- catálogo real por migration aditiva;
- preço vigente catalogado em USD 0.10 input / 0.40 output / 0.01 cached input por 1M tokens;
- migration remota `20260825250000_create_declared_context_review` aplicada; **não pode ser reescrita**;
- `declared_context_reviews` tenant-scoped, browser sem escrita e artefato imutável;
- FK composta entre revisão e `ai_runs` do mesmo tenant;
- grounding fail-closed por `evidenceRef`;
- snapshot mínimo sem e-mail, user id ou credencial;
- chamada somente por gesto explícito; render de `/inicio` e `/revisao` não chama provider;
- multi-organização permanece fail-closed;
- aviso estático de que a revisão considera apenas conteúdo declarado;
- remoto sem execuções reais da task até a auditoria: `declared_context_reviews=0` e `ai_runs` desta task = 0;
- provider/modelo/preço reais presentes uma única vez no remoto;
- RLS/grants e trigger de imutabilidade confirmados independentemente no Supabase.

A documentação oficial atual do Google também confirma o preço usado e que `gemini-2.5-flash-lite` continua sendo opção paga de baixo custo.

## 2. BLOQUEIO 004E-01A — JSON Schema enviado ao provider usa keywords não suportadas

Arquivo:

`src/lib/ai/tasks/declared-context-review.ts`

O adapter usa:

`responseJsonSchema: declaredContextReviewJsonSchema`

Porém o schema contém repetidamente:

- `maxLength`;
- `nullable: true`.

A documentação oficial atual do `@google/genai` / Gemini para `responseJsonSchema` lista explicitamente o subconjunto aceito. Entre os keywords suportados estão `type`, `properties`, `required`, `items`, `minItems`, `maxItems`, `anyOf`, etc.; **`maxLength` e `nullable` não constam como suportados**.

Fontes revalidadas em 2026-08-25:

- `https://googleapis.github.io/js-genai/release_docs/interfaces/types.GenerateContentConfig.html`
- `https://ai.google.dev/api/generate-content`
- `https://ai.google.dev/gemini-api/docs/structured-output`

Consequência: a primeira chamada paga pode ser rejeitada por contrato do provider antes de produzir qualquer revisão.

Correção exigida:

- o JSON Schema enviado ao provider deve usar somente o subconjunto oficialmente suportado;
- limites de tamanho de texto continuam obrigatórios no Zod/server-side, mesmo que não sejam enviados como keyword ao provider;
- `nextQuestion` nulo deve ser representado por JSON Schema suportado, por exemplo `anyOf` entre objeto e `null`, conforme documentação vigente;
- criar teste que percorra o schema enviado ao provider e falhe se surgir keyword fora da allowlist suportada nesta integração.

## 3. BLOQUEIO 004E-01B — cache e rate limit não são atômicos contra concorrência

Arquivo principal:

`src/lib/review/declared-context-review.ts`

O fluxo atual é:

`buscar cache → contar ai_runs → chamar Router/provider → inserir revisão`.

Essas etapas são separadas e não existe reserva atômica antes da chamada paga.

Duas requisições concorrentes para o mesmo fingerprint podem:

1. ambas não encontrar cache;
2. ambas enxergar a mesma contagem abaixo de 3;
3. ambas chamar o provider e gerar custo;
4. somente depois competir no índice único da revisão.

Do mesmo modo, quatro chamadas concorrentes podem todas observar uma contagem inferior ao limite e ultrapassar o contrato de **3 chamadas não cacheadas por organização por hora**.

O botão `pending` reduz duplo clique acidental, mas não é controle server-side contra concorrência, replay ou requisições paralelas.

Isto viola os §§8.1 e 9 do mandato: mesmo fingerprint deve evitar nova chamada, e o limite 3/h precisa valer no servidor.

Correção exigida:

- criar reserva/idempotência server-side **antes** do Router;
- a aquisição da permissão para uma nova chamada deve ser atômica por organização/fingerprint;
- somente uma execução não cacheada pode ficar em voo para o mesmo fingerprint/versões;
- o orçamento de 3 tentativas não cacheadas por hora deve ser alocado atomicamente, de modo que concorrência não ultrapasse 3;
- um processo interrompido não pode deixar bloqueio eterno: definir expiração/recuperação segura da reserva em prazo coerente com o timeout do provider;
- request concorrente que encontrar execução em voo não chama provider e recebe estado honesto (`em-processamento` ou equivalente);
- a migration já aplicada `20260825250000` não pode ser editada; qualquer estrutura/RPC necessária nasce em migration aditiva nova;
- provar concorrência real ou simulada de forma suficiente: mesmo fingerprint concorrente gera no máximo uma ida ao adapter; 4 requisições concorrentes permitem no máximo 3 reservas pagas na janela.

## 4. BLOQUEIO 004E-01C — mensagem afirma ausência de cobrança quando pode haver custo real

Arquivo:

`src/app/actions/review.ts`

Mensagem atual:

> “Não foi possível revisar seu contexto agora. Nada foi cobrado por uma revisão que não ficou pronta...”

A afirmação não é garantida.

Casos em que o provider pode ter sido chamado/cobrado e a revisão não ficar pronta incluem:

- output rejeitado depois pelo schema/grounding;
- falha ao persistir o artefato depois de um run sucedido;
- timeout no cliente.

A documentação oficial do SDK alerta especificamente que cancelar por `AbortSignal` é operação do cliente e **não cancela a solicitação no serviço; uso aplicável ainda pode ser cobrado**.

Fonte:

`https://googleapis.github.io/js-genai/release_docs/interfaces/types.GenerateContentConfig.html`

Correção exigida:

- remover qualquer promessa de “nada foi cobrado” que o sistema não consiga provar;
- usar mensagem neutra e verdadeira, por exemplo “Não foi possível concluir a revisão agora”; 
- o ledger continua registrando custo conhecido quando houver usage e custo `null`/desconhecido quando o provider não devolver usage confiável; não inventar zero.

## 5. BLOQUEIO 004E-01D — a prova chamada E2E não cria o artefato exigido pelo mandato

Arquivo:

`scripts/e2e-declared-context-review.mjs`

O próprio script declara provar:

`catálogo → Router → adapter Gemini → structured output → ai_run → grounding → artefato persistido`.

Mas o código chama diretamente `router.run(...)`, valida grounding e lê `ai_runs`. Ele **não chama o serviço de revisão nem insere `declared_context_reviews`**.

O §15 do mandato exige expressamente:

- `ai_run` real;
- **artefato de revisão real**;
- arquitetura produtiva;
- custo reproduzível;
- cleanup da fixture.

Correção exigida:

- a prova paga deve atravessar o serviço produtivo `revisarContextoDeclarado` ou caminho equivalente que realmente persista o artefato depois de grounding;
- provar que `declared_context_reviews.ai_run_id` aponta para o run real do mesmo tenant;
- repetir o mesmo contexto e provar cache sem segundo `ai_run`/segunda chamada paga;
- conferir custo registrado e reproduzível pela versão de preço;
- cleanup controlado da fixture.

## 6. Achado adicional — “eval” atual não avalia a resposta da IA

O relatório chama `context-snapshot-builder.test.ts` de “eval sintética com 12 fixtures”. Porém esse teste valida montagem de snapshot e fingerprint. Ele não produz/revisa outputs da task e, portanto, não verifica os invariantes do §14 sobre:

- schema da resposta;
- refs válidas na resposta;
- ausência de fatos externos na resposta;
- classificação de lacunas/tensões;
- linguagem utilizável.

A Correção 004E-01 deve transformar as 12 fixtures em uma eval real da task. Como há gate de credencial, o harness pode ser preparado sem segredo agora e executado com o provider pago somente depois que o GPT liberar a credencial. O conjunto deve continuar 100% sintético e ter execução limitada/determinística, sem loop aberto de custo.

## 7. Estado de promoção

**Não aprovada. Não promovida. PR #17 deve permanecer draft/open.**

Não há necessidade de rollback da migration remota já aplicada: o delta de banco aprovado permanece e a correção será aditiva.

## 8. Próxima ação

Correção formal:

`rodadas/gpt/CORRECAO_004E_01_PREPAID_SAFETY_PROVIDER_CONTRACT.md`

Próximo ator após autorização em `estado.md`: **Claude Code**.

A credencial paga continua bloqueada até a correção ser reaudita pelo GPT.