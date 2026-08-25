# REAUDITORIA GPT — CORREÇÃO 004E-01 — PREPAID SAFETY + PROVIDER CONTRACT

Data: 2026-08-25

Rodada: `004E — Declared Context Review + First Real AI`

Correção auditada: `rodadas/gpt/CORRECAO_004E_01_PREPAID_SAFETY_PROVIDER_CONTRACT.md`

Branch: `claude/rodada-004e-declared-context-review-first-real-ai`

PR #17: **draft/open/não mergeada**.

HEAD reauditorado: `70b6176c0e304ab7c2dfa9f58c04eb2de62e6d29`.

CI do HEAD: run `32908387052` — **success**; install, lint, typecheck, Edge Functions, testes e build verdes. A suíte reportada pela correção está em 983/983.

## Veredito

**CORREÇÃO 004E-01 PARCIALMENTE APROVADA, MAS A 004E CONTINUA BLOQUEADA ANTES DO GATE DE CREDENCIAL PAGA.**

Os quatro bloqueios originais da auditoria 004E foram materialmente corrigidos: schema do provider, reserva atômica, mensagem de custo e E2E produtivo. Porém esta reauditoria encontrou três microbloqueios adicionais que precisam ser fechados antes de disponibilizar `GEMINI_API_KEY`.

Não configurar chave paga, não executar Gemini real, não rodar E2E/eval pagos e não mergear/promover o PR #17 ainda.

## 1. O que foi confirmado como correto

### 1.1 Contrato atual do Gemini

Documentação oficial revalidada em 2026-08-25 confirma:

- `responseJsonSchema` aceita apenas subconjunto documentado de JSON Schema;
- `type` pode incluir `null` por união, por exemplo `["object", "null"]`;
- `maxLength` não integra a lista documentada de keywords aceitas por `responseJsonSchema`;
- `gemini-2.5-flash-lite` continua modelo estável disponível e compatível com structured output;
- preço Standard Paid continua USD 0.10 input / USD 0.40 output / USD 0.01 cached input por 1M tokens;
- Paid Tier permanece marcado como não usado para melhoria dos produtos, salvo compartilhamento voluntário de dados/logs.

Fontes oficiais revalidadas:

- `https://googleapis.github.io/js-genai/release_docs/interfaces/types.GenerateContentConfig.html`
- `https://ai.google.dev/gemini-api/docs/structured-output`
- `https://ai.google.dev/gemini-api/docs/pricing`
- `https://ai.google.dev/gemini-api/docs/models`
- `https://ai.google.dev/gemini-api/docs/thinking`
- `https://ai.google.dev/api/generate-content`

A correção removeu `maxLength`/`nullable` do schema enviado ao provider, manteve limites no Zod e usa `type: ["object", "null"]` para `nextQuestion`.

### 1.2 Reserva antes da chamada paga

Migration aplicada:

`20260825260000_create_review_attempt_reservation`

Confirmado no remoto:

- tabela `declared_context_review_attempts` existe;
- RPC `acquire_declared_context_review_slot` existe;
- RPC `finalize_declared_context_review_attempt` existe;
- `authenticated` não recebeu acesso à tabela/RPCs;
- `service_role` possui somente as permissões necessárias;
- índice parcial impede duas reservas `RESERVED` do mesmo fingerprint/versões;
- aquisição usa advisory lock transacional por organização;
- cache, in-flight e limite de 3/h são decididos antes do Router;
- reserva vencida é recuperável;
- zero tentativas/revisões/runs reais permanecem no remoto.

Prova reportada pelo Claude: **23/23**.

### 1.3 Índices das FKs

Migration aplicada:

`20260825270000_index_review_run_foreign_keys`

Os índices com ordem de colunas inadequada foram substituídos pelos índices coerentes com `(ai_run_id, organization_id)`.

### 1.4 UX e E2E preparados

- saiu a promessa falsa de que uma revisão malsucedida necessariamente não teve custo;
- estado `em-andamento` não chama provider novamente;
- E2E preparado agora atravessa `revisarContextoDeclarado`, persiste artefato, lê `ai_run`, reproduz custo e repete o contexto para provar cache;
- `e2e:review` e `eval:review` continuam bloqueados sem chave e não fizeram chamada paga.

## 2. BLOQUEIO 004E-02A — FK composta usa `ON DELETE SET NULL` sobre coluna NOT NULL

Migration de origem:

`20260825260000_create_review_attempt_reservation.sql`

Constraint remota confirmada:

`FOREIGN KEY (ai_run_id, organization_id) REFERENCES ai_runs(id, organization_id) ON DELETE SET NULL`

`organization_id` em `declared_context_review_attempts` é `NOT NULL`.

No PostgreSQL, quando `SET NULL` não recebe uma lista de colunas, **todas as colunas da FK são zeradas**. O próprio PostgreSQL documenta o caso multi-tenant: sem `SET NULL (coluna_nullable)`, a coluna tenant também é colocada em `NULL`, colidindo com `NOT NULL`.

O remoto confirma `confdelsetcols = NULL`, portanto a ação atual pretende zerar todas as colunas da FK.

Consequência:

- apagar um `ai_run` referenciado por tentativa pode falhar por tentar zerar `organization_id`;
- cascades/cleanup de organização não devem depender da ordem de triggers para funcionar;
- o E2E real ainda não rodou e poderia descobrir isso apenas durante cleanup.

Correção obrigatória: migration aditiva que substitua apenas essa FK por uma ação que preserve tenant. Preferência:

`ON DELETE SET NULL (ai_run_id)`

PostgreSQL remoto é 17.6 e suporta lista de colunas no `ON DELETE SET NULL`.

Provar sem provider pago:

1. tentativa associada a `ai_run` sintético;
2. delete do run mantém a tentativa, mantém `organization_id` e zera somente `ai_run_id`;
3. delete da organização faz cascade completo sem resíduo.

Não reescrever migrations `250000`, `260000` ou `270000`.

## 3. BLOQUEIO 004E-02B — usage ausente pode virar custo zero

Arquivo:

`src/lib/ai/adapters/gemini.ts`

`normalizarUsage()` usa hoje:

- `promptTokenCount ?? 0`;
- `candidatesTokenCount ?? 0`.

A documentação/tipos atuais do SDK declaram essas contagens como opcionais. Portanto `usageMetadata` pode existir sem uma dessas propriedades. No estado atual, ausência pode ser interpretada como zero e seguir para cálculo de custo.

Isso viola a regra da AI Foundation: **custo desconhecido deve falhar fechado; nunca virar zero por ausência de evidência**.

Correção obrigatória:

- `promptTokenCount` e `candidatesTokenCount` precisam existir e ser inteiros confiáveis para uma resposta de texto considerada sucesso;
- nesta task, prompt e output estruturado são não vazios, logo zero/missing nesses campos deve falhar como `USAGE_INVALID` em vez de custo zero;
- `cachedContentTokenCount` e `thoughtsTokenCount` continuam opcionais e podem ser tratados como ausência/zero apenas para a aritmética específica, preservando `cachedTokens: null` quando não informado;
- adicionar testes para metadata `{}`, somente prompt, somente candidates, zero indevido, negativos/fracionários e caso válido.

## 4. BLOQUEIO 004E-02C — harness de eval ainda não prova dois critérios do próprio mandato

Arquivo:

`scripts/eval-declared-context-review.mjs`

### 4.1 Ausências esperadas

A lógica atual só acusa uma ausência não reportada se `review.gaps.length > 0`:

`if (!virouLacuna && review.gaps.length > 0)`

Assim, se o modelo devolver **zero lacunas**, um caso como “público ausente” pode passar justamente sem reconhecer a ausência esperada.

O mandato exige que ausências esperadas apareçam como lacuna.

### 4.2 Tensão esperada

O caso 06 foi criado como “objetivo e foco aparentemente tensionados”, mas a fixture não carrega um marcador explícito de tensão esperada e o avaliador apenas verifica que, **se** houver tensão, `needsHumanConfirmation` é true.

Portanto o modelo pode devolver `tensions: []` nesse caso e ainda passar.

O mandato exige que o caso de tensão produza tensão quando esperado.

Correção obrigatória:

- ausência esperada deve falhar sempre que não for reconhecida, inclusive quando `gaps=[]`;
- fixtures devem declarar explicitamente expectativa de tensão quando aplicável;
- o caso de tensão deve exigir ao menos uma tensão ancorada em refs pertinentes e `needsHumanConfirmation=true`;
- extrair/estruturar a lógica do avaliador de forma testável ou adicionar teste determinístico equivalente, para a CI provar o próprio harness sem chamada paga;
- manter uma execução por caso e zero retry automático.

## 5. Estado remoto independente

Reauditoria GPT confirmou no Supabase:

- migrations `20260825250000`, `20260825260000` e `20260825270000` aplicadas;
- provider/modelo/preço permanecem catalogados;
- tabela/RPCs da reserva existem;
- índices finais existem;
- `declared_context_review_attempts = 0`;
- `declared_context_reviews = 0`;
- `ai_runs` da task = 0;
- nenhuma chamada real ocorreu.

## 6. Estado de promoção

**004E NÃO APROVADA. NÃO PROMOVIDA. PR #17 permanece draft/open.**

A credencial paga continua bloqueada.

Próxima correção formal:

`rodadas/gpt/CORRECAO_004E_02_FINAL_PREPAID_INVARIANTS.md`

Depois de executada, o próximo ator volta a ser GPT para uma última reauditoria pré-gate.