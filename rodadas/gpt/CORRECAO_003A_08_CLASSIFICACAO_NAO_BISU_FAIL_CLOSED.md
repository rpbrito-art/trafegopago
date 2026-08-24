# CORREÇÃO 003A-08 — CLASSIFICAÇÃO NÃO-BISU FAIL-CLOSED

Status: **AUTORIZADA PARA EXECUÇÃO PELO CLAUDE CODE**
Data: 2026-08-24
Branch: `claude/rodada-003a-meta-connection-foundation`
PR: #11 draft

## 1. Origem

A reauditoria da 003A-07 aprovou a arquitetura BISU guiada, a pós-verificação e a UI, mas encontrou um único desvio do mandato fail-closed: `classificarCredencial()` aceita um corpo HTTP 200 ambíguo como `bisu=false` e pode liberar o caminho USER.

## 2. Objetivo

Fechar somente a ambiguidade da classificação antes de qualquer mutação USER.

## 3. READ SET

Ler antes de alterar:

- `.gpt/PROJECT_PROMPT.md`;
- `estado.md`;
- `rodadas/gpt/CORRECAO_003A_07_DESCONEXAO_BISU_GUIADA.md`;
- `rodadas/gpt/REAUDITORIA_003A_07_DESCONEXAO_BISU_GUIADA.md`;
- `src/lib/meta/gateway.ts` e testes afetados.

## 4. Contrato obrigatório

A classificação por `GET /me?fields=client_business_id` deve:

1. exigir corpo objeto;
2. exigir `id` string não vazia;
3. tratar `client_business_id` presente e string não vazia como BISU;
4. tratar `client_business_id` presente, porém vazio ou de tipo inválido, como resposta ambígua → falha fechada;
5. somente considerar não-BISU quando `client_business_id` estiver realmente ausente e a identidade `id` estiver válida;
6. se `external_user_id` persistido existir, exigir que `id` devolvido coincida antes de permitir qualquer caminho USER;
7. em `{}`, corpo sem `id`, identidade divergente ou `client_business_id` inválido: não chamar `/permissions`, não chamar outro endpoint mutável e não limpar o estado local.

Não reintroduzir `oauth/revoke` nem `/access_tokens`.

## 5. Testes mínimos

Adicionar/ajustar testes para provar:

- `{}` HTTP 200 falha fechado;
- `{ id: ausente }` falha fechado;
- `client_business_id: ""` falha fechado também quando `debug_token.type=USER`;
- `client_business_id` de tipo inválido falha fechado;
- `id` divergente do `external_user_id` falha fechado;
- USER legítimo com `id` coerente e `client_business_id` ausente continua usando `/permissions` + pós-verificação;
- BISU legítimo continua retornando `EXTERNAL_ACTION_REQUIRED` sem mutação;
- regressões da 003A-07 permanecem verdes.

## 6. Execução/provas

Executar testes afetados, lint, typecheck, build e CI da branch uma vez.

Nenhum E2E real, nenhuma alteração no painel Meta, nenhuma migration.

## 7. Handoff

Atualizar o relatório da 003A e a PR #11. Parar em:

`003A-08 EXECUTADA — AGUARDANDO AUDITORIA GPT — E2E REAL AINDA NÃO EXECUTADO`
