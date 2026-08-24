# REAUDITORIA 003A-07 — DESCONEXÃO BISU GUIADA

Status: **PARCIALMENTE APROVADA — 1 BLOQUEIO FAIL-CLOSED REMANESCENTE**
Data: 2026-08-24
Branch auditada: `claude/rodada-003a-meta-connection-foundation`
Head auditado: `df172e007ecb1bafb89b9d1392fe58ba7d677332`
PR: #11 draft
CI: `32761502278` — verde em install, lint, typecheck, Edge Functions, testes e build.

## 1. O que passou

A 003A-07 implementou corretamente o desenho BISU decidido na 003A-06:

- o caminho BISU não usa `oauth/revoke`;
- a classificação consulta `GET /me?fields=client_business_id`;
- BISU válido retorna `EXTERNAL_ACTION_REQUIRED` sem endpoint Meta mutável e sem limpeza local;
- `/permissions` ficou isolado ao caminho de User Access Token;
- `DELETE /{system-user-id}/access_tokens` não foi introduzido;
- existe ação separada `checkMetaDisconnection`;
- a verificação usa somente inspeção read-only do mesmo token;
- `is_valid=true` devolve `STILL_ACTIVE` e preserva o estado;
- falha/ambiguidade de inspeção devolve `UNVERIFIED` e preserva o estado;
- somente `is_valid=false` permite `revoke_meta_connection`;
- a UI explica `Integrações > Aplicativos conectados` e oferece `Já removi — verificar`;
- erro genérico não é convertido em instrução externa;
- o script diagnóstico deixou de imprimir `data.error` bruto;
- testes afetados existem e a CI do HEAD está verde.

O Supabase real foi reconferido após a execução: a conexão `Teste 003A - conexao Meta` continua `ACTIVE`, `updated_at` inalterado, `disconnected_at` nulo, referência presente e segredo ainda no Vault. Nenhum E2E real foi executado.

## 2. Bloqueio encontrado — classificação não-BISU ainda aceita corpo ambíguo

O mandato 003A-07 §4.1 determinou que ausência/erro/ambiguidade na classificação não pode virar tentativa alternativa e deve falhar fechado.

A função `classificarCredencial()` atualmente considera qualquer JSON-objeto HTTP 200 classificável, mesmo quando não contém identidade válida. Exemplos como `{}` ou `{ client_business_id: <valor inválido> }` retornam `ok: true, bisu: false`.

Se, ao mesmo tempo, `debug_token.type === USER`, o gateway então pode seguir para `DELETE /{user-id}/permissions`.

Isso cria o seguinte caminho proibido:

`resposta /me incompleta/ambígua → interpretada como não-BISU → tipo USER → mutação externa`

A existência do teste com `null` não fecha esse caso: `null` falha fechado, mas um objeto vazio ainda passa pela classificação.

## 3. Correção exigida

Antes de classificar uma resposta como não-BISU e permitir o caminho USER, exigir prova positiva de identidade da resposta de `/me`.

Baseline mínimo:

1. corpo deve ser objeto;
2. `id` deve existir como string não vazia;
3. se `client_business_id` estiver presente, só é BISU se for string não vazia; presença com tipo inválido/vazio é ambígua e deve falhar fechado;
4. se `external_user_id` persistido existir, a identidade devolvida por `/me` deve coincidir com ele antes de qualquer mutação USER;
5. corpo `{}`, corpo sem `id`, `client_business_id` inválido ou identidade divergente devem parar sem `/permissions` e sem limpeza local.

Não ampliar escopo além desse endurecimento.

## 4. Veredicto

- Arquitetura BISU guiada: **APROVADA**.
- Pós-verificação: **APROVADA**.
- UI principal: **APROVADA**.
- Sanitização diagnóstica: **APROVADA**.
- Classificação não-BISU fail-closed: **BLOQUEADA**.

Portanto a 003A-07 ainda não libera o gate humano. Nova ação externa na Meta continua proibida até a microcorreção ser executada e auditada.
