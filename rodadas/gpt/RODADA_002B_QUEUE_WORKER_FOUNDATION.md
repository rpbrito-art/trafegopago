# RODADA 002B — QUEUE + WORKER FOUNDATION

Status: **AUTORIZADA**
Data: 2026-08-23
Executor esperado: Claude Code
Repositório único: `rpbrito-art/trafegopago`
Supabase project ref: `cbnxdoxpyioxjwgjhbtq`
Branch esperada: `claude/rodada-002b-queue-worker-foundation`
Relatório esperado: `rodadas/claude/RELATORIO_RODADA_002B_QUEUE_WORKER_FOUNDATION.md`

---

## 1. Objetivo

Dar à Fase 2 a primeira capacidade real de processamento assíncrono, reutilizando a fundação promovida na 002A.

Ao final desta rodada o sistema deve possuir:

1. uma fila durável interna no próprio Supabase/Postgres;
2. um contrato pequeno e validado de mensagem de job;
3. um worker server-side invocável que lê jobs, valida, processa e remove mensagens concluídas;
4. redelivery controlado por visibility timeout quando uma mensagem não é concluída;
5. proteção contra execução duplicada da mesma `operation`;
6. limite de tentativas/arquivamento para poison message, sem loop infinito.

Em linguagem simples: a 002A criou a memória das operações; a 002B cria a esteira interna que pega uma tarefa pendente e a processa sem depender da tela do usuário.

A rodada **não** implementa ainda cron automático, webhook, Meta, Instagram, Ads, IA ou tarefa de negócio externa.

---

## 2. Decisão de infraestrutura

Usar **Supabase Queues / `pgmq`**, que já é disponível no Postgres 17.6 deste projeto e ainda não está instalado.

Motivos:

- é nativo do Postgres/Supabase e não exige novo fornecedor;
- persiste mensagens de forma durável;
- oferece `read` com visibility timeout, permitindo redelivery quando o consumidor não conclui;
- mensagem permanece até remoção explícita;
- oferece archive para mensagens que não devem continuar circulando;
- o canônico permite consolidar fisicamente filas desde que `job_type` preserve o isolamento lógico.

Criar uma única fila física inicial:

`integration_jobs`

Ela será **Basic/Durable**, não unlogged.

### 2.1 Não expor a fila ao browser

Não habilitar `pgmq_public` na Data API e não adicionar esse schema a `supabase/config.toml`.

A fila deve continuar server-only. `anon` e `authenticated` não recebem acesso funcional à fila.

### 2.2 Wrapper mínimo e exceção `SECURITY DEFINER`

O worker precisa operar `pgmq`, mas não queremos expor o schema/extensão nem conceder acesso amplo às funções da extensão.

Está autorizada, **somente nesta fronteira estreita**, a criação de wrappers `SECURITY DEFINER` em `public` para:

- enviar job para a fila fixa `integration_jobs`;
- ler um lote da fila fixa com visibility timeout;
- confirmar/remover mensagem concluída;
- arquivar poison/invalid message;
- alterar a visibility timeout de uma mensagem quando necessário.

Requisitos obrigatórios desses wrappers:

- owner `postgres`;
- `SECURITY DEFINER` explícito e justificado;
- `set search_path = ''`;
- todas as referências totalmente qualificadas;
- nome da fila **hardcoded**, nunca vindo do usuário;
- zero SQL dinâmico;
- validação/tetos de parâmetros;
- `REVOKE ALL` de `PUBLIC`, `anon` e `authenticated`;
- `GRANT EXECUTE` somente a `service_role`;
- não retornar payload além do necessário ao worker;
- não criar wrapper genérico que permita operar qualquer fila.

Esse uso não é autorização geral para `SECURITY DEFINER` em rodadas futuras.

---

## 3. Estado incorporado obrigatório antes da execução

Partir somente da `main` após promoção real da 002A.

Confirmar antes de mutar:

- estado incorporado 000–002A;
- Fase 2 em andamento;
- migration history remoto = **6**, última `20260823160000_create_operations_and_audit_events`;
- `pgmq` disponível e **não instalado** no baseline;
- `operations` e `audit_events` vazias após cleanup da 002A;
- `auth.users` = 1 conta real;
- 5 tabelas `public`, todas com RLS;
- zero objetos `public` owned por `supabase_admin`;
- Security Advisor sem ERROR e apenas o WARN conhecido + INFOs já aceitos da 002A.

Se houver divergência material, parar antes da migration.

---

## 4. READ SET

Ler na ordem do método:

1. `estado.md`;
2. `.gpt/PROJECT_PROMPT.md`;
3. `docs/00-governanca/ACTIVE_DOCS.md`;
4. este mandato;
5. `docs/00-governanca/HISTORY_SUMMARY.md` — resumo promovido;
6. `docs/00-governanca/IMPLEMENTATION_ROADMAP.md` — somente Fase 2;
7. `docs/03-canonical/TECHNICAL_SPEC.md` — §§3.11, 19–25, 27 e 30;
8. `docs/03-canonical/DATA_MODEL.md` — §§13 e 16–18;
9. `docs/03-canonical/API_CONTRACTS.md` — §§1 e 11–13;
10. `docs/03-canonical/SECURITY_MODEL.md` — §§3–6, 13, 15, 20 e 23–25;
11. migration 002A e `src/lib/operations/contracts.ts` como fundação de idempotência/retry;
12. documentação Supabase vigente de Queues/PGMQ e Edge Function auth/secrets antes da implementação.

`GROWTH_INTELLIGENCE_CANONICAL.md` não precisa ser relido nesta rodada porque o escopo permanece infraestrutura interna e não altera produto/UX. Se surgir qualquer proposta de produto, parar antes de executar e aplicar o gate de produto.

---

## 5. Escopo obrigatório

### 5.1 Uma única migration nova

Criar exatamente uma migration para a fundação de queue/worker.

Estado final esperado do histórico remoto se aprovada a execução: **6 → 7 migrations**.

A migration deve:

- habilitar `pgmq`;
- criar a fila durável `integration_jobs`;
- criar os wrappers mínimos da §2.2;
- criar somente os helpers de `operations` estritamente necessários para claim/conclusão segura do worker;
- não tocar migrations já promovidas.

### 5.2 Contrato da mensagem

O payload persistido na fila deve ser pequeno e referencial.

Contrato lógico mínimo:

```ts
type IntegrationJobMessage = {
  version: 1;
  organizationId: string;
  jobType: string;
  operationId: string | null;
  correlationId: string;
  payload: Record<string, unknown>;
};
```

O job entregue ao consumidor combina o envelope acima com metadados fornecidos pelo PGMQ:

- `job_id` = `msg_id` do PGMQ;
- `attempt` = `read_ct` do PGMQ;
- `created_at` = `enqueued_at` do PGMQ.

Assim não duplicamos metadados que a fila já fornece.

Regras:

- `version` fechada em `1` nesta rodada;
- `organizationId` e `correlationId` UUID válidos;
- `jobType` não vazio e com teto explícito;
- `operationId` UUID quando não nulo;
- `payload` obrigatoriamente objeto e com teto pequeno explícito;
- nunca colocar token, senha, cookie, secret ou PII desnecessária no payload;
- jobs mutáveis devem referenciar `operationId` persistida.

Criar parser/validator puro compartilhável e testes unitários.

### 5.3 Job type inicial

Implementar apenas um job interno e sem efeito externo:

`SYSTEM_HEALTHCHECK`

Finalidade: provar a infraestrutura real sem antecipar Meta ou qualquer regra de negócio.

Contrato:

- exige `operationId`;
- a `operation` precisa pertencer à mesma organização e correlation id;
- a operação de prova deve ter `operation_type = 'SYSTEM_HEALTHCHECK'`;
- o handler não chama provider externo e não cria gasto;
- sucesso termina a operation como `SUCCEEDED` e confirma a mensagem na fila.

Esse job é interno/diagnóstico; não aparece na UI.

### 5.4 Claim atômico e recuperação de crash

Criar helper server-only de `operations` que permita ao worker reivindicar uma operation de forma atômica.

Requisitos:

- validar `id`, `organization_id` e `correlation_id` juntos;
- somente `service_role` pode executar;
- transição normal: `PENDING → CLAIMED`;
- incremento de `attempt_count` ocorre no mesmo UPDATE;
- `updated_at` deve ser definido com `now()` do banco;
- claim concorrente: somente um consumidor vence;
- uma `CLAIMED` antiga pode ser retomada apenas depois de janela de stale claramente definida e maior que a visibility timeout usada pelo worker;
- operation já `SUCCEEDED` deve ser tratada como já concluída, nunca executada de novo;
- statuses terminais não devem ser reabertos silenciosamente.

Criar helper de conclusão com `CLAIMED → SUCCEEDED`, usando `now()` do banco para `updated_at/completed_at`.

Se for necessário helper de falha para encerrar poison message após teto de tentativas, ele deve ser mínimo, service-only e não inventar classificação externa falsa.

Não criar trigger automático de `updated_at` nesta rodada. A disciplina server-side dos helpers é suficiente para o worker introduzido agora.

### 5.5 Worker real server-side

Criar e versionar Edge Function:

`supabase/functions/integration-worker/index.ts`

Autorização:

- função não é pública para browser;
- usar o modelo vigente de **secret key** das Edge Functions;
- preferir o mecanismo oficial atual recomendado pela documentação Supabase para `auth: 'secret'`;
- se o runtime exigir `verify_jwt = false` para secret key não-JWT, a função deve autorizar explicitamente em código pelo mecanismo oficial, nunca aceitar request anônimo;
- usar os secrets padrão fornecidos pelo próprio Supabase; **nenhum novo segredo humano** deve ser criado nesta rodada.

Comportamento mínimo:

1. autenticar o chamador interno;
2. ler lote pequeno da `integration_jobs` com visibility timeout;
3. validar cada mensagem antes de qualquer efeito;
4. processar `SYSTEM_HEALTHCHECK`;
5. confirmar/remover mensagem somente após conclusão segura;
6. mensagem inválida/unsupported é arquivada, não fica em loop;
7. erro inesperado não remove a mensagem; ela deve poder reaparecer após visibility timeout;
8. após teto pequeno e explícito de leituras/tentativas, poison message deve ser arquivada e a operation associada encerrada de forma coerente quando possível;
9. logs usam apenas IDs, contagens e correlation id; não logar payload bruto, secret ou PII.

O worker pode processar lote pequeno em série nesta rodada. Não otimizar concorrência antes de provar correção.

### 5.6 Sem scheduler automático

**Não criar cron nesta rodada.**

A Edge Function deve ser invocável para prova e por um scheduler futuro, mas a decisão de frequência/custo/frescor fica para a próxima sub-rodada.

Isso mantém a 002B pequena: fila + consumidor correto primeiro, automação periódica depois.

### 5.7 Sem `integration_jobs` em `public`

Não criar a tabela conceitual `public.integration_jobs` nesta rodada.

O `DATA_MODEL` diz que ela existe **se necessária além da infraestrutura de queue para observabilidade persistente**. Nesta fundação:

- PGMQ já persiste job/message/read count/timestamps;
- `operations` já persiste o estado mutável/idempotente;
- `audit_events` já existe para ações sensíveis.

Criar outra tabela agora duplicaria estado sem necessidade provada.

Reabrir essa decisão apenas se surgir lacuna real de observabilidade/consulta.

---

## 6. Provas obrigatórias

Criar prova versionada que use somente fixtures removíveis e deixe zero resíduo.

Provar no mínimo:

1. baseline remoto antes da migration = 6 migrations;
2. migration final = 7 migrations;
3. `pgmq` instalado;
4. fila `integration_jobs` existe, é durável/logged e não `unlogged`;
5. `pgmq_public` não foi exposto ao browser/Data API;
6. wrappers de fila têm owner/search_path/`SECURITY DEFINER`/ACL exatamente como autorizado;
7. `anon` e `authenticated` não conseguem enfileirar, ler, confirmar ou arquivar mensagem;
8. `service_role` consegue enfileirar, ler e confirmar pela fronteira autorizada;
9. envelope inválido é recusado antes de entrar na fila quando criado pelo wrapper;
10. payload acima do teto é recusado;
11. mensagem lida e não confirmada reaparece após visibility timeout, com `read_ct` incrementado;
12. criar uma organization fixture + operation `SYSTEM_HEALTHCHECK` + job; invocar worker remoto e provar `PENDING → CLAIMED → SUCCEEDED` pelo resultado final;
13. `attempt_count` incrementa exatamente no claim;
14. duas mensagens que apontem para a mesma operation não executam duas vezes o efeito lógico; estado final continua uma única `SUCCEEDED`;
15. dois consumidores/claims concorrentes não vencem simultaneamente a mesma operation;
16. operation já `SUCCEEDED` não é reexecutada ao receber mensagem duplicada tardia;
17. mensagem inválida/unsupported é arquivada e não reaparece infinitamente;
18. browser continua lendo apenas as tabelas de domínio já autorizadas, sem alcançar fila/operations internas;
19. `public` continua com zero objetos owned por `supabase_admin`;
20. defaults endurecidos e `ensure_rls` permanecem coerentes;
21. Security Advisor final não ganha novo ERROR/WARN além do baseline conhecido;
22. Performance Advisor é registrado e qualquer novo aviso material avaliado;
23. cleanup remove fixtures, mensagens ativas/arquivadas de prova e deixa `auth.users` na baseline anterior;
24. nenhuma chave/secret aparece em log, relatório ou commit.

Se a Edge Function não puder ser invocada remotamente com os secrets padrão do Supabase sem criar credencial humana nova, **parar e retornar ao GPT**. Não pedir segredo novo ao fundador por improviso.

---

## 7. Gates de código

Como haverá SQL + TypeScript/Edge Function:

- lint;
- typecheck da aplicação;
- testes unitários do contrato/job runtime;
- suíte completa Vitest;
- validação/typecheck da Edge Function pelo mecanismo vigente adequado;
- build Next.js;
- prova remota da função e fila;
- CI final verde na branch/PR.

Preferir um único push final auditável.

---

## 8. Critérios de parada

Parar e retornar ao GPT se ocorrer qualquer um destes:

- necessidade de expor `pgmq_public` ou queue tables ao browser para o worker funcionar;
- necessidade de novo segredo externo/humano;
- necessidade de provider pago/terceiro;
- necessidade de cron para provar a fundação;
- necessidade de criar Meta/webhook/IA para justificar o worker;
- necessidade de privilégio genérico para operar qualquer fila;
- `SECURITY DEFINER` precisar aceitar nome de schema/fila vindo do request;
- migration baseline remoto diferente de 6 antes de mutar;
- alteração ad hoc de schema remoto fora da migration para corrigir erro da própria migration; nesta rodada, se a migration aplicada falhar semanticamente, **não repetir o procedimento incidente da 002A**: parar e retornar ao GPT antes de reescrever histórico/DDL remoto;
- conflito de governança/código não reconciliável com segurança.

---

## 9. Fora de escopo

Não implementar:

- cron/scheduler automático;
- múltiplas filas físicas por domínio;
- `public.integration_jobs`;
- `webhook_events` ou endpoint webhook;
- Meta/Instagram/OAuth;
- publicação de conteúdo;
- Ads/campanhas/aprovações financeiras;
- IA;
- UI/tela nova;
- notificações;
- novo provedor externo;
- deploy da aplicação Next.js em produção.

A Edge Function desta rodada é somente o worker interno de fundação.

---

## 10. Gate humano

**Nenhum gate humano é esperado.**

Claude deve executar autonomamente. Não pedir ao fundador para abrir Supabase, habilitar Queue no Dashboard, copiar secret, digitar SQL ou transportar mensagens entre agentes.

Se surgir intervenção humana inesperada, parar e registrar por que ela é indispensável antes de solicitá-la.

---

## 11. Entrega

Ao concluir:

- branch `claude/rodada-002b-queue-worker-foundation` pushada;
- PR draft aberta;
- relatório compacto em `rodadas/claude/RELATORIO_RODADA_002B_QUEUE_WORKER_FOUNDATION.md`;
- `estado.md` atualizado apenas com fatos de execução;
- nenhuma 002C iniciada.

Conclusão esperada:

`002B EXECUTADA — AGUARDANDO AUDITORIA GPT`

Somente GPT decide aprovação, correção ou promoção.
