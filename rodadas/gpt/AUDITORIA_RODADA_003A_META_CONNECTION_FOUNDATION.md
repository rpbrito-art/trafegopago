# AUDITORIA — RODADA 003A — META CONNECTION FOUNDATION

Data: 2026-08-23
Head auditado: `0ee246a83484a9454ccaeb70c48d62d5d626fb4c`
PR: #11

Classificação: **003A-01 APROVADA COMO HANDOFF — 003A BLOQUEADA — CORREÇÃO 003A-02 OBRIGATÓRIA**.

## 1. Correção 003A-01

A microcorreção cumpriu seu objetivo:

- branch `claude/rodada-003a-meta-connection-foundation` existe;
- PR #11 draft existe;
- relatório foi versionado;
- as migrations remotas `20260823195327`, `20260823195742` e `20260823200706` estão no Git;
- nenhum `migration repair`/reaplicação foi usado para reconciliar;
- CI `32664337039` passou em install/lint/typecheck/functions/test/build.

Portanto a falha de handoff está encerrada.

## 2. Supabase remoto

Auditoria independente confirmou:

- 12 migrations, última `20260823200706`;
- `meta_connections` e `meta_oauth_intents` existem, RLS habilitado e sem fixtures residuais;
- `meta_oauth_intents` permanece server-only;
- funções de Vault Meta são INVOKER, owner postgres, `search_path=''`, EXECUTE apenas postgres/service_role;
- zero objetos `public` owned por `supabase_admin`;
- Advisor sem novo ERROR material; WARN conhecido de leaked-password protection permanece.

## 3. Bloqueios encontrados na 003A

### B1 — desconexão cross-tenant

`disconnectMetaAction` autentica o usuário, mas `disconnectMeta()` usa cliente privilegiado e seleciona a conexão somente por `organization_id`. O `userId` recebido não é usado. Um usuário autenticado não pode ser capaz de operar conexão de outra organização apenas conhecendo seu UUID.

### B2 — callback não revalida membership

A intenção prova que o mesmo usuário iniciou o fluxo, mas a membership pode ser removida entre ida e callback. Antes de trocar código/persistir conexão, o callback privilegiado deve confirmar que o usuário ainda é membro ACTIVE da organização da intenção.

### B3 — state negado não é consumido

Quando a Meta retorna `error`, `completeMetaAuthorization()` retorna `DENIED` antes de localizar/consumir a intenção. O contrato é single-use; uma volta válida, inclusive negada, deve encerrar aquela intenção.

### B4 — `upsert` incompatível com índice único parcial

O código usa `.upsert(..., { onConflict: 'organization_id' })`, mas a migration só possui índice único **parcial** em `organization_id` para estados vivos. Esse índice não é um alvo genérico de `ON CONFLICT (organization_id)` sem o mesmo predicado. O caminho real pode falhar exatamente no primeiro OAuth.

A correção deve preservar histórico terminal: localizar/atualizar conexão viva explicitamente ou inserir nova linha quando não houver uma viva; não transformar o índice parcial em unique total apenas para satisfazer o upsert.

### B5 — ativação pode falhar e ainda retornar sucesso

Após guardar o token, o UPDATE para `ACTIVE` ignora `error`/retorno e a função devolve `{ ok: true }`. A ativação do token + estado deve ser atômica ou, no mínimo, o erro precisa impedir sucesso. Preferir uma única transação/RPC para segredo + `ACTIVE`.

### B6 — desconexão não revoga autorização na Meta

O gateway atual apenas remove o segredo local/fecha a linha. O mandato e `SECURITY_MODEL` exigem revogar/remover acesso no provider quando o mecanismo oficial vigente suportar. Revalidar a documentação Meta atual e implementar o mecanismo oficial; não adivinhar endpoint.

Se a revogação exigir ler o token do Vault, criar fronteira mínima server-only/service_role, sem browser/log/relatório. Se a documentação oficial mostrar que o fluxo vigente não oferece revogação aplicável, parar e registrar evidência ao GPT em vez de inventar.

### B7 — gate real obrigatório ausente

O próprio relatório confirma que não houve app Meta configurado nem OAuth real. Assim não foram provados `code → token`, scopes reais e conexão/desconexão ponta a ponta. O critério final do mandato original não foi atendido.

## 4. Decisão

Não promover PR #11 nem iniciar 003B.

A Correção 003A-02 deve corrigir somente esses deltas e concluir o gate real; não repetir as 44 provas SQL nem a bateria anterior por ritual.
