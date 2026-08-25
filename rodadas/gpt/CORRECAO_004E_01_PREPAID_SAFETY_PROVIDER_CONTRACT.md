# CORREÇÃO 004E-01 — PREPAID SAFETY + PROVIDER CONTRACT

Status: **CORREÇÃO OBRIGATÓRIA DA RODADA 004E**.

Data: 2026-08-25

Origem: `rodadas/gpt/AUDITORIA_004E_DECLARED_CONTEXT_REVIEW_FIRST_REAL_AI.md`.

Branch a continuar: `claude/rodada-004e-declared-context-review-first-real-ai`.

PR: #17 — manter draft/open e não mergear.

## 1. Objetivo

Fechar os bloqueios encontrados antes de disponibilizar qualquer `GEMINI_API_KEY` paga ao runtime.

Esta correção **não amplia o produto**. Ela apenas torna a 004E segura e compatível com o provider real já escolhido.

Até a reauditoria GPT desta correção:

- NÃO configurar nem usar chave paga;
- NÃO fazer chamada Gemini real;
- NÃO promover/mergear a 004E;
- NÃO tocar Meta/003B.

## 2. READ SET OBRIGATÓRIO

Além de `CLAUDE.md`, `estado.md`, o mandato 004E e esta correção, ler apenas:

1. `rodadas/gpt/AUDITORIA_004E_DECLARED_CONTEXT_REVIEW_FIRST_REAL_AI.md`;
2. `src/lib/ai/tasks/declared-context-review.ts`;
3. `src/lib/ai/adapters/gemini.ts`;
4. `src/lib/review/declared-context-review.ts`;
5. `scripts/e2e-declared-context-review.mjs`.

Sob demanda:

- `src/app/actions/review.ts`;
- `src/lib/ai/router.ts` / `run-ledger.ts`;
- migration `20260825250000_create_declared_context_review.sql` apenas para dependências — **não editar**;
- documentação oficial Gemini apenas para confirmar o contrato vigente de `responseJsonSchema`/usage/abort.

## 3. Correção A — schema oficial do Gemini

O JSON Schema enviado via `responseJsonSchema` deve conter apenas keywords suportadas pela documentação oficial vigente do SDK/API.

No estado auditado, `maxLength` e `nullable` não são suportados por esse campo.

Obrigatório:

- remover do schema enviado ao provider keywords não suportadas;
- manter todos os limites de string/cardinalidade no Zod e na validação server-side;
- representar `nextQuestion` nulo com construção suportada pelo JSON Schema vigente (`anyOf` objeto/null ou equivalente oficialmente aceito);
- manter `responseMimeType = application/json`;
- adicionar teste de allowlist recursiva dos keywords do schema efetivamente enviado ao provider;
- teste deve falhar se alguém reintroduzir keyword não suportada;
- não afrouxar o Zod só para acomodar o provider.

Fontes de autoridade:

- `https://googleapis.github.io/js-genai/release_docs/interfaces/types.GenerateContentConfig.html`
- `https://ai.google.dev/api/generate-content`
- `https://ai.google.dev/gemini-api/docs/structured-output`

Se essas fontes tiverem mudado materialmente, registrar o que mudou e parar para GPT apenas se a decisão arquitetural necessária sair do escopo desta correção.

## 4. Correção B — reserva atômica antes da chamada paga

O caminho atual de cache/count/provider/insert não é suficiente contra concorrência.

Criar mecanismo server-side persistente e atômico que garanta simultaneamente:

1. mesmo `(organization_id, fingerprint, task/prompt/schema)` não dispara duas chamadas não cacheadas concorrentes;
2. no máximo **3 novas tentativas pagas/reservadas por organização por janela móvel de 1 hora** podem adquirir permissão para chegar ao Router;
3. a decisão não depende do browser;
4. reserva antiga/interrompida não bloqueia para sempre.

### 4.1 Estrutura

A migration `20260825250000_create_declared_context_review.sql` já foi aplicada remotamente e **NÃO pode ser reescrita**.

Criar migration aditiva nova, se necessário, para uma entidade/RPC de reserva de execução. Nome exato é livre, desde que o contrato seja claro.

Uma implementação aceitável é uma pequena tabela append/oriented de tentativas/reservas, por exemplo:

- id;
- organization_id;
- input_fingerprint;
- task_type/version;
- prompt/schema version;
- status (`RESERVED|COMPLETED|FAILED|EXPIRED` ou equivalente);
- reserved_at;
- expires_at;
- ai_run_id nullable;
- completed_at nullable.

Pode usar solução equivalente já existente no domínio (`operations`) **somente se** ela preservar explicitamente as mesmas garantias e não misturar semânticas de forma frágil.

### 4.2 Aquisição

A aquisição deve ocorrer em uma transação/RPC server-only que:

- serializa por organização de forma segura (lock/advisory lock transacional ou mecanismo equivalente);
- verifica se já há revisão cacheada atual;
- verifica se existe reserva válida/in-flight para o mesmo fingerprint;
- expira logicamente reservas antigas segundo janela coerente com o timeout;
- conta reservas/tentativas da organização na última hora;
- cria a nova reserva somente se houver vaga;
- retorna estado fechado: `CACHE | RESERVED | IN_FLIGHT | RATE_LIMITED | ERROR` ou equivalente.

O browser não executa essa RPC diretamente.

### 4.3 Finalização

Depois do Router:

- sucesso + grounding + persistência do artefato → marcar reserva concluída e associar `ai_run_id`;
- falha do provider/schema/grounding/persistência → marcar a tentativa como falha quando possível;
- tentativa que chegou a autorização de chamada continua contando no limite da janela, mesmo se falhar;
- timeout/crash deve ser recuperável por expiração, sem permitir duas chamadas simultâneas do mesmo fingerprint durante a validade da reserva.

Não é necessário criar fila/worker nesta correção.

### 4.4 Provas obrigatórias

Adicionar testes que provem concorrência, não apenas sequência:

- duas chamadas simultâneas do mesmo fingerprint → no máximo 1 chega ao adapter;
- quatro chamadas simultâneas com fingerprints distintos na mesma organização → no máximo 3 adquirem reserva;
- tenant B não consome cota nem reserva de tenant A;
- reserva vencida pode ser recuperada com segurança;
- cache existente vence a reserva e nunca chama provider;
- falha ao adquirir/contar reserva falha fechado.

Se tecnicamente viável, incluir prova SQL/remota do contrato da RPC/constraints; usar rollback e sem fixtures residuais.

## 5. Correção C — mensagem de custo honesta

Remover da UI/action qualquer frase que prometa que uma tentativa sem revisão pronta não teve custo.

Em especial, substituir o texto equivalente a:

> “Nada foi cobrado por uma revisão que não ficou pronta.”

por mensagem neutra e verdadeira, por exemplo:

> “Não foi possível concluir a revisão agora. Tente novamente em instantes.”

Motivo: depois que a chamada alcançou o provider, pode haver custo mesmo que grounding/persistência falhe. O SDK também informa que `AbortSignal` cancela o cliente, não necessariamente o processamento no serviço, e a operação ainda pode ser cobrada.

Não inventar custo zero. Quando usage não estiver disponível, ledger permanece sem custo conhecido em vez de afirmar gratuidade.

## 6. Correção D — E2E produtivo precisa persistir o artefato

Reescrever `scripts/e2e-declared-context-review.mjs` para provar o caminho exigido no §15 do mandato.

Quando a credencial paga for liberada futuramente, o script deve:

1. criar fixture sintética temporária;
2. montar snapshot sintético;
3. chamar o **serviço produtivo de revisão** (`revisarContextoDeclarado` ou equivalente que inclua reserva + Router + grounding + persistência);
4. provar que o resultado é `criada`;
5. localizar o `declared_context_reviews` criado;
6. provar que `ai_run_id` pertence ao mesmo tenant e que o modelo usado foi o catalogado;
7. provar usage e custo registrado/reproduzível pela versão de preço;
8. chamar novamente com o mesmo contexto;
9. provar resultado de cache e que não surgiu segundo `ai_run`/segunda tentativa paga para o fingerprint;
10. limpar a fixture de forma controlada.

O script pode continuar parando com código específico de gate quando `GEMINI_API_KEY` não existir.

**Nesta correção, não executar a parte paga.** Preparar e testar sem segredo; a chamada real só acontecerá após reauditoria GPT e nova orientação ao fundador.

## 7. Correção E — eval real da task, não apenas do snapshot

As 12 fixtures do §14 devem avaliar a **resposta da task**, não somente o snapshot.

Criar harness de eval que, quando a credencial paga estiver liberada, rode os 12 casos sintéticos de maneira limitada e controlada e valide programaticamente, por caso, pelo menos:

- output passa no schema;
- grounding refs válidas;
- nenhum fato externo proibido;
- ausências esperadas aparecem como lacuna, sem preenchimento inventado;
- caso de tensão produz tensão quando esperado, sempre com confirmação humana;
- preço sob consulta não recebe julgamento externo;
- prompt injection não altera o papel/regras;
- linguagem é português utilizável em critérios objetivos simples, sem exigir frase literal.

Não criar loop de retry ilimitado. Uma execução por caso é o padrão; eventual retry técnico deve ser explicitamente limitado.

O harness não é chamado pela aplicação e usa somente dados sintéticos.

A execução paga da eval continua bloqueada até GPT liberar a credencial.

## 8. Regressões que devem permanecer verdes

- Router/ledger/catálogo 004A;
- grounding da task;
- snapshot/fingerprint;
- RLS/imutabilidade de `declared_context_reviews`;
- `/inicio` e `/revisao` sem chamada no render;
- multi-org fail-closed;
- 004D journey;
- CI completa.

## 9. DDL / remoto

Se houver migration aditiva:

1. commit/push na branch antes de aplicar remotamente;
2. nunca editar `20260825250000` nem anteriores;
3. aplicar via fluxo normal do projeto;
4. provar constraints/grants/RLS/RPC;
5. conferir zero fixtures residuais;
6. Advisors somente para novo delta.

## 10. Critérios para devolver ao GPT

Claude deve finalizar quando:

- schema enviado ao Gemini estiver compatível com allowlist oficial e testado;
- reserva/cache/rate limit estiverem atômicos contra concorrência;
- mensagem falsa de cobrança tiver sido removida;
- E2E estiver preparado para persistir artefato + provar cache;
- eval real de 12 casos estiver preparada;
- nenhuma chamada paga tiver sido feita;
- CI estiver verde;
- migration aditiva, se houver, estiver aplicada e provada;
- relatório e `estado.md` da branch disserem explicitamente que a correção foi executada e **a credencial paga continua bloqueada aguardando reauditoria GPT**.

Status esperado:

**CORREÇÃO 004E-01 EXECUTADA — AGUARDANDO REAUDITORIA GPT ANTES DO GATE DE CREDENCIAL PAGA**.

Claude não promove, não mergeia e não pede a chave ao fundador.

## 11. Fora de escopo

Permanece proibido:

- qualquer chamada real Gemini nesta correção;
- configurar/armazenar `GEMINI_API_KEY`;
- segundo provider/fallback;
- tool calling/web search/embeddings;
- Meta/003B;
- Content Intelligence;
- geração de conteúdo;
- Ads/campanhas;
- CRM/leads/WhatsApp;
- alterar automaticamente fatos do negócio;
- nova capacidade de produto além do fechamento seguro da 004E.