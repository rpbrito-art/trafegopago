# AUDITORIA — RODADA 003A — META CONNECTION FOUNDATION

Data inicial: 2026-08-23
Reauditoria: 2026-08-24
PR: #11

Classificação vigente: **CORREÇÃO 003A-02 PARCIALMENTE APROVADA — 003A AINDA BLOQUEADA — CORREÇÃO 003A-03 OBRIGATÓRIA**.

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

# REAUDITORIA — 2026-08-24

Head auditado: `0b9e10d48cbddbbe63017ea428aa1ab797e21574`
CI: `32742223573` — **success**.

## 3. O que passou

A inspeção independente do código, PR, CI e Supabase remoto confirma:

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

## 5. Novo bloqueio — código Meta 190 não prova token alvo revogado

A reauditoria do caminho `SYSTEM_USER` encontrou uma nova violação da mesma invariante fail-closed.

`revokeSystemUserToken()` aceita `error.code === 190` como sucesso e, com isso, permite a limpeza local.

Isso não é evidência suficiente. O código 190 pertence à família de falhas de validação/autenticação de access token e não identifica, por si só, que o `revoke_token` específico ficou inativo. No `oauth/revoke` existem duas credenciais relevantes (`revoke_token` e `access_token`), portanto um erro genérico de autenticação não demonstra qual delas causou a falha.

Consequência possível:

`token alvo ainda válido → oauth/revoke falha com 190 por outro motivo → código interpreta como já revogado → revoke_meta_connection apaga segredo/referência local`.

Isso reproduziria exatamente a classe de risco que a 003A deve impedir: estado local dizendo “revogado” sem prova suficiente no provider.

A consulta à documentação Meta confirmou o mecanismo `oauth/revoke` para system-user token, mas não foi encontrada garantia oficial de que qualquer `190` nesse endpoint equivalha a "revoke_token já revogado". Exemplos públicos do próprio ecossistema mostram 190 associado a múltiplas falhas de token, portanto a inferência é insegura.

## 6. Decisão arquitetural GPT

A desconexão deve usar **pós-condição observável**, não interpretação genérica de código de erro:

1. se `debug_token` antes da revogação já devolver `is_valid=false`, o token está inativo e a limpeza local pode ocorrer;
2. se o token estiver válido, executar o mecanismo oficial aplicável;
3. qualquer erro do provider, inclusive 190, falha fechado;
4. após sucesso explícito da revogação, verificar novamente o mesmo token com `debug_token`;
5. só permitir limpeza local quando a pós-verificação confirmar `is_valid=false`;
6. falha, UNKNOWN ou token ainda válido preservam o segredo local para nova tentativa.

Essa decisão está formalizada em:

`rodadas/gpt/CORRECAO_003A_03_REVOGACAO_SYSTEM_USER_FAIL_CLOSED.md`.

## 7. Veredicto

**NÃO APROVADA PARA E2E REAL AINDA.**

- Correção de autorização/atomicidade/OAuth/conexão: executada e majoritariamente auditada;
- correção fail-closed da leitura do Vault: **aprovada**;
- revogação `SYSTEM_USER`: mecanismo implementado, mas ainda possui o bloqueio 190;
- desconexão real: **não autorizada**;
- 003A: **não promovida**;
- 003B: **não autorizada**.

Próxima ação autorizada: Claude Code executar **somente a Correção 003A-03**, atualizar a mesma branch/PR e parar para nova reauditoria GPT.
