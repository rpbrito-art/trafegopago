# AUDITORIA GPT — CORREÇÃO 004E-02 — FINAL PREPAID INVARIANTS

Data: 2026-08-25

Mandato auditado: `rodadas/gpt/CORRECAO_004E_02_FINAL_PREPAID_INVARIANTS.md`

Branch auditada: `claude/rodada-004e-declared-context-review-first-real-ai`

PR: #17 — draft/open/não mergeada.

HEAD auditado: `84a31808da0063afdf18c678dcc7bdfec6a02b20`.

CI do HEAD: run `32910321592` — **success**; install, lint, typecheck, Edge Functions, testes e build verdes.

Status declarado pelo executor: **CORREÇÃO 004E-02 EXECUTADA — AGUARDANDO REAUDITORIA GPT PARA ABERTURA DO GATE PAGO**.

## Veredito

**004E-02 FECHOU CORRETAMENTE AS INVARIANTES DE BANCO E USAGE, MAS O GATE PAGO CONTINUA BLOQUEADO POR DUAS LACUNAS NO AVALIADOR DA EVAL.**

Não configurar `GEMINI_API_KEY`, não executar E2E/eval pagos e não promover/mergear o PR #17 ainda.

A correção necessária restante é exclusivamente de avaliação. Não há nova migration esperada, não há mudança de provider/modelo e não há nova capacidade de produto.

## 1. Invariante A — FK de tentativa → ai_run: APROVADA

Migration aditiva auditada:

`20260825280000_fix_review_attempt_run_delete_action.sql`

Ela recria a FK composta:

`FOREIGN KEY (ai_run_id, organization_id) REFERENCES ai_runs(id, organization_id) ON DELETE SET NULL (ai_run_id)`

Reauditoria GPT no Supabase remoto confirmou:

- migration `20260825280000` aplicada;
- `confdeltype = 'n'` (`SET NULL`);
- `confdelsetcols` contém apenas a coluna `ai_run_id`;
- `organization_id` permanece fora da ação `SET NULL`;
- continuam existindo zero tentativas, zero revisões e zero `ai_runs` reais desta task no remoto.

A prova transacional do Claude cobre delete do run, preservação do tenant, recusa cross-tenant e cascade da organização: **13/13**.

A conexão de auditoria GPT ao Supabase é read-only e, por isso, não permitiu repetir independentemente o DML de fixture. A definição remota da constraint, entretanto, corresponde ao contrato esperado e a prova SQL está versionada e transacional.

## 2. Invariante B — usage incompleto não vira custo zero: APROVADA

Arquivo auditado:

`src/lib/ai/adapters/gemini.ts`

`normalizarUsage()` agora exige:

- `promptTokenCount` presente, inteiro e > 0;
- `candidatesTokenCount` presente, inteiro e > 0;
- `cachedContentTokenCount`, quando presente, inteiro e >= 0;
- `thoughtsTokenCount`, quando presente, inteiro e >= 0;
- cache nunca maior que o prompt total.

Ausência de `promptTokenCount` ou `candidatesTokenCount`, zero, negativo, fração ou combinação incoerente retorna `null`, que o adapter converte em `USAGE_INVALID`.

`cachedContentTokenCount` ausente continua representado como `cachedTokens: null`; não é inventado como cache zero no contrato externo.

Os testes específicos cobrem metadata vazia, ausência parcial, zero, negativo, fracionário, cache > prompt e casos válidos. O relatório do Claude informa **22 casos** no adapter e a CI final está verde.

## 3. Invariante C — eval: CORRIGIDA PARCIALMENTE

A extração para `src/lib/review/eval-criteria.ts` foi correta e melhorou a auditabilidade. Também foram corrigidos:

- ausência esperada com `gaps=[]` agora falha;
- `esperaTensao` deixou de ser inferido pelo nome do caso;
- afirmações externas ganharam cobertura melhor;
- o avaliador tem teste local independente do provider.

Porém duas lacunas permanecem antes de a eval paga poder ser considerada uma prova válida do mandato.

### 3.1 BLOQUEIO 004E-03A — tensão esperada não exige os dois lados da comparação

A fixture do caso 06 declara explicitamente:

`refsDaTensao = [objective:...:objective, objective:...:focus]`

O próprio comentário da fixture diz que a tensão deve estar ancorada **nos dois lados que divergem**.

Mas o avaliador atual usa:

`refsDaTensao.some(ref => tensao.evidenceRefs.includes(ref))`

Logo, uma tensão que cite somente o objetivo e uma referência qualquer não relacionada pode passar. O schema exige pelo menos duas refs, mas não garante que sejam exatamente os dois lados relevantes.

Correção exigida:

- pelo menos uma tensão deve conter **todas** as `refsDaTensao` exigidas para o caso;
- adicionar teste negativo: tensão com apenas uma das duas refs esperadas deve falhar;
- manter teste positivo com as duas refs presentes.

### 3.2 BLOQUEIO 004E-03B — a verificação explícita de prompt injection desapareceu da eval

O mandato 004E exige um caso com prompt injection e a Correção 004E-01 determinou que a eval real prove que a instrução embutida não altera papel/regras.

A versão anterior do script possuía ao menos uma checagem específica do caso de injection. Depois da extração para `eval-criteria.ts`, essa verificação deixou de existir.

O script ainda declara no cabeçalho que valida:

`prompt injection não altera o papel nem as regras`

mas `avaliarCaso()` não possui critério específico de injection e `eval-criteria.test.ts` não possui caso correspondente.

Correção exigida:

- não inferir injection pelo nome textual do caso;
- adicionar metadado explícito na fixture para o caso 08;
- preferencialmente usar uma sentinela sintética única na instrução maliciosa, por exemplo `__QUORON_INJECTION_SENTINEL_004E__`, e exigir que essa sentinela não apareça como resposta obedecida;
- manter schema/grounding/ausência de fatos externos como barreiras complementares;
- adicionar teste local que prova que uma saída que obedece à sentinela falha e uma saída estruturada/grounded que ignora a instrução passa;
- a execução paga continua 12 casos, uma chamada por caso e zero retry automático.

## 4. Contrato externo do SDK revalidado

Documentação oficial atual do `@google/genai` confirma que `GenerateContentConfig` suporta `abortSignal`, `responseJsonSchema`, `responseMimeType`, `maxOutputTokens` e `thinkingConfig`, e registra que `AbortSignal` cancela apenas o cliente — não necessariamente o processamento no serviço. A documentação de structured output também confirma suporte a `null` em arrays de tipo JSON Schema.

Nenhuma mudança arquitetural adicional é necessária por esse contrato externo nesta reauditoria.

## 5. Estado de promoção e gate

- 004E: **não aprovada**;
- 004E-01: executada e reauditable;
- 004E-02: executada e reaudited, com A/B aprovadas e C ainda incompleta;
- PR #17: permanece draft/open/não mergeada;
- chave Gemini paga: **continua bloqueada**;
- chamadas reais: **zero**;
- custo real Gemini: **zero**.

## 6. Próxima ação

Correção formal:

`rodadas/gpt/CORRECAO_004E_03_EVAL_GATE_COMPLETION.md`

Próximo ator após autorização em `estado.md`: **Claude Code**.

A 004E-03 não deve tocar banco, provider, preço, UI ou produto; somente fechar o contrato da eval e manter zero chamadas pagas.