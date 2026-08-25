# COMPLEMENTO 003B-05 — PROVA DIRETA DA PAGE QUORON

Status: **AUTORIZADO dentro do experimento 003B-05 já autorizado**.

Natureza: **complementação read-only mínima**. Não repetir a investigação anterior. Não é correção de código, não é decisão arquitetural e não promove 003B.

## Contexto já auditado

A investigação `RELATORIO_INVESTIGACAO_003B_05_PAGE_ZERO.md` provou:

- User Access Token válido, tipo USER, do app corrente e da identidade esperada;
- escopos efetivamente concedidos corretos;
- `/me/accounts` vazio tanto com quanto sem `instagram_business_account`;
- `/me/adaccounts` retorna 3 contas;
- ausência de `target_ids` em granular scopes não explica sozinha o comportamento, porque `ads_read` também não trouxe `target_ids` e ainda assim enumera Ad Accounts.

Ficou ausente a prova direta da Page `1356474050873300`, acrescentada ao mandato depois de a execução anterior já ter começado.

## Objetivo único

Distinguir entre:

1. o User Access Token não consegue ler diretamente o objeto Page Quoron; e
2. o User Access Token consegue ler a Page diretamente, mas o edge `/me/accounts` não a enumera.

## Executar somente

Usando o mesmo token corrente da conexão ACTIVE, pela mesma sonda sanitizada/server-side:

1. `GET /1356474050873300?fields=id,name`
2. Se a primeira retornar HTTP 200: `GET /1356474050873300?fields=id,name,instagram_business_account`

Registrar somente:

- HTTP;
- `id` e `name`;
- `instagram_business_account.id`, se presente;
- em erro: apenas `code`, `error_subcode`, `type`.

## Proibições

- NÃO repetir `debug_token`, `/me`, `/me/accounts` ou `/me/adaccounts`.
- NÃO alterar `.env.local`.
- NÃO iniciar OAuth.
- NÃO revogar ou desconectar token.
- NÃO alterar permissões Meta ou acesso da Page.
- NÃO adicionar `business_management`, `ads_management` ou qualquer escopo.
- NÃO pedir, imprimir ou persistir Page Access Token.
- NÃO editar código de produto.
- NÃO fazer escrita em tabelas de produto no Supabase.
- NÃO promover/mergear 003B.

## Resultado esperado

Adicionar um relatório curto em `rodadas/claude/` contendo apenas as duas chamadas acima e uma conclusão factual.

Depois parar e aguardar auditoria GPT.
