# AUDITORIA — RODADA 003A — META CONNECTION FOUNDATION

Data inicial: 2026-08-23
Reauditorias: 2026-08-24
PR: #11

Classificação vigente: **003A-04 APROVADA — E2E REAL DE DESCONEXÃO AUTORIZADO — 003A AINDA NÃO PROMOVIDA**.

## 1. Auditoria inicial / Correção 003A-01

A microcorreção cumpriu seu objetivo:

- branch `claude/rodada-003a-meta-connection-foundation` existe;
- PR #11 draft existe;
- relatório foi versionado;
- as migrations remotas `20260823195327`, `20260823195742` e `20260823200706` estão no Git;
- nenhum `migration repair`/reaplicação foi usado para reconciliar;
- CI do handoff passou.

Portanto a falha de handoff foi encerrada.

## 2. Bloqueios encontrados na auditoria inicial

### B1 — desconexão cross-tenant

`disconnectMetaAction` autenticava o usuário, mas `disconnectMeta()` usava cliente privilegiado sem reconfirmar membership na organização alvo.

### B2 — callback não revalidava membership

A membership podia ser removida entre ida e callback.

### B3 — state negado não era consumido

Callback negado pela Meta retornava antes de consumir a intenção, contrariando single-use.

### B4 — `upsert` incompatível com índice único parcial

`upsert(onConflict: organization_id)` não correspondia ao índice único parcial de conexão viva e ameaçava o histórico terminal.

### B5 — ativação podia falhar e ainda retornar sucesso

Token e `ACTIVE` não eram uma transição atômica/confirmada.

### B6 — desconexão não revogava autorização na Meta

A implementação removia apenas o estado local.

### B7 — gate real obrigatório ausente

Não havia OAuth Meta real ponta a ponta.

A Correção 003A-02 foi autorizada para esses deltas.

---

# REAUDITORIA 1 — 2026-08-24

Head auditado: `0b9e10d48cbddbbe63017ea428aa1ab797e21574`
CI: `32742223573` — **success**.

## 3. O que passou

A inspeção independente do código, PR, CI e Supabase remoto confirmou:

- B1 fechado: desconexão reconfirma membership ACTIVE antes de ler/revogar;
- B2 fechado: callback reconfirma membership vigente antes de chamar a Meta;
- B3 fechado: intenção é consumida antes de decidir `DENIED`; replay é recusado;
- B4 fechado: `begin_meta_connection` substitui o `upsert` incompatível e preserva histórico;
- B5 fechado: `activate_meta_connection` grava segredo e marca `ACTIVE` na mesma transação;
- etapa de conexão do B7 comprovada: conexão real `ACTIVE`, organização correta, state consumido e token fora do browser;
- token real identificado por `debug_token` como `SYSTEM_USER`;
- migration history remoto = **13**, última `20260823203915`;
- a conexão real `Teste 003A - conexao Meta` continua `ACTIVE`, expira em 2026-10-23 e ainda possui referência + segredo no Vault;
- `begin_meta_connection`, `activate_meta_connection`, `read_meta_connection_token` e `revoke_meta_connection` são `SECURITY INVOKER`, `search_path=''` e EXECUTE restrito a `postgres/service_role`;
- RLS permanece ativa em `meta_connections` e `meta_oauth_intents`;
- `authenticated` lê estado permitido, mas não lê `token_secret_reference`, `granted_scopes` nem `external_user_id`; `anon` não lê a tabela e intenções OAuth permanecem server-only.

## 4. Bloqueio da leitura do Vault — APROVADO

O bloqueio encontrado após a primeira implementação da revogação foi realmente corrigido.

Antes, `disconnectMeta` ignorava `error` de `read_meta_connection_token`. Agora desestrutura `data` e `error`; qualquer erro retorna `TOKEN_READ_FAILED`, sem chamar a Meta e sem chamar `revoke_meta_connection`.

Dois testes específicos provam a diferença entre:

- `data: null` por ausência real de token;
- `data: null` acompanhado de erro de leitura.

Esse delta está **AUDITADO E APROVADO**.

## 5. Bloqueio encontrado — código Meta 190

A reauditoria do caminho `SYSTEM_USER` encontrou nova violação da invariante fail-closed.

`revokeSystemUserToken()` aceitava `error.code === 190` como sucesso e, com isso, permitia a limpeza local.

Isso não era evidência suficiente. O código 190 pertence à família de falhas de validação/autenticação de access token e não identifica, por si só, que o `revoke_token` específico ficou inativo.

A decisão arquitetural foi exigir pós-condição observável: erro do provider nunca é prova; depois de sucesso explícito, o mesmo token deve ser reinspecionado e só `is_valid=false` libera a limpeza local.

Essa decisão originou a Correção 003A-03.

---

# REAUDITORIA 2 — 2026-08-24

Head auditado: `98db346e1a110f74627ee1c77a8593905591b688`
CI: `32746073927` — **success** em install, lint, typecheck, Edge Functions, testes e build.

## 6. O que a 003A-03 fechou

A implementação foi conferida diretamente no `gateway.ts` e nos testes.

Passou:

- `190` não é mais aceito como sucesso em `oauth/revoke`;
- `190` também não é aceito como sucesso no caminho `/permissions`;
- erro HTTP/rede do provider falha fechado;
- sucesso explícito do endpoint remoto não conclui a desconexão sozinho;
- o mesmo token é reinspecionado depois da revogação;
- token ainda válido depois do sucesso remoto falha fechado;
- falha na pós-inspeção falha fechado;
- resposta de `debug_token` sem `is_valid` booleano falha fechado;
- `is_valid=false` observado para o mesmo token permite a limpeza local;
- erro de leitura do Vault continua impedindo Meta e limpeza local.

O Supabase remoto foi conferido novamente: a conexão `Teste 003A - conexao Meta` continua **ACTIVE**, `disconnected_at` nulo, referência presente e segredo correspondente ainda existente no Vault. Nenhuma revogação real ocorreu.

## 7. Bloqueio encontrado — tipo de token desconhecido ainda disparava mutação

O mandato 003A-03 determinava que falha/UNKNOWN não completasse nem adivinhasse o mecanismo de revogação.

O código da 003A-03 decidia:

- `SYSTEM_USER` → `oauth/revoke`;
- qualquer outro tipo → `/permissions`.

O teste consolidava explicitamente esse comportamento com `type: PAGE`.

Isso não era fail-closed. Quando `debug_token` afirma que o token está **válido**, mas o tipo não é `SYSTEM_USER` nem `USER`, o sistema não conhece a primitive correta e não deve executar uma mutação remota por tentativa.

A pós-condição de invalidez permanece correta e suficiente: depois que o mesmo token foi explicitamente observado como `is_valid=false`, seu `type` já não é necessário para decidir a limpeza local. O `type` é obrigatório apenas para escolher a primitive enquanto o token ainda está válido.

Essa decisão originou a Correção 003A-04.

---

# REAUDITORIA 3 — 2026-08-24

Head auditado: `8332bec58d14c0e6687f02340cfd5c545b34942d`
CI: `32751232306` — **success** em install, lint, typecheck, Edge Functions, testes e build.

## 8. Resultado da 003A-04

A inspeção independente do código e dos testes confirmou:

- token válido `SYSTEM_USER` usa somente `oauth/revoke`;
- token válido `USER` usa somente `DELETE /{user-id}/permissions`;
- token válido de tipo diferente, como `PAGE`, retorna falha antes de chamar qualquer endpoint de revogação;
- token válido sem `type` também falha antes de qualquer endpoint de revogação;
- em ambos os casos desconhecidos, `revoke_meta_connection` não é chamado;
- a pós-verificação continua exigindo `is_valid=false` do mesmo token;
- depois de `is_valid=false`, ausência de `type` não bloqueia a limpeza, porque o tipo já não é necessário para escolher mecanismo algum;
- os testes de erro `190`, falha de provider, pós-verificação e falha de leitura do Vault continuam preservados;
- total informado pelo executor: **83 testes em `src/lib/meta`**.

O Supabase remoto foi reconferido depois da execução da 003A-04:

- conexão `Teste 003A - conexao Meta` = **ACTIVE**;
- `disconnected_at` = `null`;
- referência do token = presente;
- segredo correspondente no Vault = presente;
- expiração = 2026-10-23.

Nenhuma mutação externa real foi executada pela 003A-04.

## 9. Veredicto e autorização do gate final

A 003A-04 está **AUDITADA E APROVADA**.

Não há bloqueio de código conhecido restante antes do gate real de desconexão. O fluxo de desconexão agora sustenta a invariante:

**estado local só é limpo depois que a própria Meta confirma, por pós-verificação do mesmo token, que ele está inválido.**

Fica **AUTORIZADO exclusivamente o E2E REAL DE DESCONEXÃO** da conexão de teste existente `Teste 003A - conexao Meta`, pelo fluxo normal do próprio aplicativo.

Este gate é deliberadamente destrutivo: ele deve revogar a autorização real na Meta e, somente se a pós-verificação confirmar a invalidez, remover o segredo do Vault e marcar a conexão como `REVOKED` localmente.

Ainda não estão autorizados:

- refazer OAuth;
- selecionar ativos;
- revogar pelo painel da Meta como atalho;
- iniciar 003B;
- promover 003A antes da auditoria do resultado real.

Após o E2E, o GPT deve auditar o estado remoto e o resultado observado antes de decidir a promoção da 003A.