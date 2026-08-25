# CORREÇÃO 004E-02 — FINAL PREPAID INVARIANTS

Status: **CORREÇÃO OBRIGATÓRIA DA RODADA 004E**.

Data: 2026-08-25

Origem: `rodadas/gpt/AUDITORIA_004E_01_PREPAID_SAFETY_PROVIDER_CONTRACT.md`.

Branch a continuar:

`claude/rodada-004e-declared-context-review-first-real-ai`

PR #17: manter **draft/open**, não mergear.

## 1. Objetivo

Fechar três invariantes finais encontradas na reauditoria da 004E-01 **antes** de disponibilizar qualquer chave Gemini paga:

1. corrigir a ação de deleção da FK composta tentativa → `ai_runs` sem zerar o tenant;
2. impedir que contagem de tokens ausente seja convertida em custo zero;
3. fazer a eval realmente reprovar ausência/tensão esperadas quando o modelo não as reconhecer.

Esta correção não amplia o produto e não autoriza chamada paga.

Até nova reauditoria GPT:

- NÃO configurar `GEMINI_API_KEY`;
- NÃO chamar Gemini real;
- NÃO executar E2E/eval pagos;
- NÃO mergear/promover PR #17;
- NÃO tocar Meta/003B.

## 2. READ SET OBRIGATÓRIO

Além de `CLAUDE.md`, `estado.md`, mandato 004E e esta correção, ler somente:

1. `rodadas/gpt/AUDITORIA_004E_01_PREPAID_SAFETY_PROVIDER_CONTRACT.md`;
2. `supabase/migrations/20260825260000_create_review_attempt_reservation.sql` — somente leitura; não editar;
3. `src/lib/ai/adapters/gemini.ts`;
4. `src/lib/ai/adapters/gemini.test.ts`;
5. `scripts/eval-declared-context-review.mjs`;
6. `test/support/declared-context-fixtures.ts`.

Sob demanda:

- `scripts/e2e-declared-context-review.mjs`;
- `scripts/sql/review-attempt-reservation-004e01-proof.sql`;
- documentação oficial PostgreSQL para `ON DELETE SET NULL (column_list)`;
- documentação oficial `@google/genai`/Gemini para `UsageMetadata`.

## 3. Correção A — FK composta preserva `organization_id`

A FK remota atual é:

`FOREIGN KEY (ai_run_id, organization_id) REFERENCES ai_runs(id, organization_id) ON DELETE SET NULL`

Como `organization_id` é `NOT NULL`, a ação não pode tentar zerá-la.

Criar migration **aditiva nova** — timestamp/nome seguinte livre e monotônico — que:

1. derrube somente a constraint `declared_context_review_attempts_run_same_tenant`;
2. recrie a mesma FK tenant-safe;
3. use `ON DELETE SET NULL (ai_run_id)` para zerar somente a referência opcional ao run;
4. preserve `organization_id`.

Não editar `20260825260000` nem migrations anteriores.

### 3.1 Prova obrigatória de deleção/cascade

Criar ou ampliar prova SQL transacional, sem provider real, para demonstrar:

- tentativa `COMPLETED` ou `FAILED` associada a um `ai_run` sintético do mesmo tenant;
- apagar o `ai_run` é permitido;
- após o delete, tentativa continua no tenant original;
- `ai_run_id IS NULL`;
- `organization_id` permanece igual;
- apagar a organização remove tentativa/run/artefatos dependentes sem erro e sem resíduo;
- FK cross-tenant continua impossível.

A prova deve usar rollback quando aplicável.

## 4. Correção B — usage obrigatório para custo confiável

Em `normalizarUsage()`:

- não converter ausência de `promptTokenCount` em zero;
- não converter ausência de `candidatesTokenCount` em zero;
- ambos precisam estar presentes e ser inteiros confiáveis para uma resposta bem-sucedida desta task;
- como a task envia prompt não vazio e exige JSON não vazio, zero em `promptTokenCount` ou `candidatesTokenCount` deve falhar fechado;
- negativo/fracionário continua inválido;
- `cachedContentTokenCount` ausente pode significar “não informado”: usar zero somente na subtração interna e devolver `cachedTokens: null`;
- `thoughtsTokenCount` ausente pode ser tratado como zero;
- cache maior que prompt continua inválido.

O efeito esperado é `USAGE_INVALID`, nunca `estimated_cost = 0` por metadata incompleta.

### 4.1 Testes obrigatórios

Adicionar casos explícitos:

- `usageMetadata = {}` → inválido;
- só `promptTokenCount` → inválido;
- só `candidatesTokenCount` → inválido;
- prompt = 0 → inválido;
- candidates = 0 com resposta textual válida → inválido;
- negativo/fracionário → inválido;
- cache > prompt → inválido;
- prompt/candidates válidos + cache ausente → válido com `cachedTokens:null`;
- prompt/candidates válidos + cache informado → normalização e custo corretos.

Não estimar tokens por tamanho do texto.

## 5. Correção C — eval dos 12 casos precisa provar o que declara

A eval paga continua bloqueada, mas o **avaliador** precisa ser comprovável agora.

### 5.1 Ausências

Corrigir a lógica para que cada item em `ausentesEsperados` seja obrigatório na revisão como lacuna coerente.

Não condicionar a falha à existência de alguma outra lacuna. Se `gaps=[]` quando há ausência esperada, o caso deve falhar.

### 5.2 Tensão esperada

Estender a fixture com metadado semântico explícito, por exemplo:

`esperaTensao?: boolean`

No caso 06, marcar a expectativa.

Quando `esperaTensao=true`, a eval deve exigir:

- `review.tensions.length >= 1`;
- `needsHumanConfirmation === true`;
- pelo menos uma tensão ancorada em referências pertinentes do objetivo/foco declarados no caso;
- ausência de veredito causal/mercadológico externo.

Não inferir expectativa a partir do nome textual do caso.

### 5.3 O avaliador precisa ter teste local

A lógica de avaliação deve poder ser exercitada em CI sem Gemini real.

Aceitável:

- extrair `avaliarCaso()` para módulo importável e testá-lo; ou
- estruturar teste equivalente que use outputs sintéticos e prove os mesmos critérios.

Testes mínimos do avaliador:

1. ausência esperada + `gaps=[]` → falha;
2. ausência esperada presente em gap → passa esse critério;
3. tensão esperada + `tensions=[]` → falha;
4. tensão esperada com confirmação e refs pertinentes → passa esse critério;
5. tensão com `needsHumanConfirmation=false` → falha;
6. afirmação externa proibida → falha;
7. output coerente → passa.

A eval real continua: 12 casos, uma chamada por caso, zero retry automático.

## 6. Regressões obrigatórias

Manter verdes:

- reserva atômica e limite 3/h da 004E-01;
- cache tenant-safe;
- grounding;
- Router/ledger/catálogo 004A;
- schema do provider allowlisted;
- `/inicio` e `/revisao` sem chamada no render;
- RLS/ACL de `declared_context_reviews` e `declared_context_review_attempts`;
- multi-org fail-closed;
- 004D journey;
- CI completa.

## 7. Remoto e durabilidade

Se houver migration — esperado para a FK:

1. branch/commit/push antes do `db push`;
2. migration aditiva; nenhuma aplicada é reescrita;
3. aplicar pelo fluxo normal do projeto;
4. provar FK/cascade após aplicação;
5. zero fixtures residuais;
6. Advisors somente para o delta.

## 8. Critérios de conclusão da 004E-02

Devolver ao GPT somente quando:

- FK composta zerar apenas `ai_run_id` e preservar tenant;
- cleanup/cascade estiver provado;
- metadata de usage incompleta falhar fechado e não produzir custo zero;
- eval reprovar ausência e tensão esperadas quando omitidas;
- lógica do avaliador tiver teste local determinístico;
- nenhuma chamada Gemini real tiver ocorrido;
- `GEMINI_API_KEY` continuar ausente;
- migrations/provas e CI estiverem verdes;
- relatório e `estado.md` da branch refletirem o estado real.

Status esperado:

**CORREÇÃO 004E-02 EXECUTADA — AGUARDANDO REAUDITORIA GPT PARA ABERTURA DO GATE PAGO**.

Claude não promove, não mergeia e não pede a chave ao fundador.

## 9. Fora de escopo

Permanece proibido:

- qualquer chamada Gemini real nesta correção;
- configurar/armazenar `GEMINI_API_KEY`;
- trocar provider/modelo;
- segundo provider/fallback;
- tool calling/web search/embeddings;
- Meta/003B;
- Content Intelligence;
- geração de conteúdo;
- Ads/campanhas;
- CRM/leads/WhatsApp;
- alterar automaticamente fatos do negócio;
- qualquer nova capacidade além do fechamento seguro da 004E.