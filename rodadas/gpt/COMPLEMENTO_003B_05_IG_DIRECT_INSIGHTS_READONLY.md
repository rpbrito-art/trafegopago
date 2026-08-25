# COMPLEMENTO 003B-05 — IG USER + INSIGHTS DIRETOS, READ-ONLY

Status: **AUTORIZADO dentro do experimento 003B-05**.

Natureza: complementação diagnóstica mínima, somente leitura. **Não é correção de código de produto, não é decisão arquitetural e não promove a 003B.**

## Contexto já auditado

Está provado com o User Access Token corrente:

- token válido, tipo USER, identidade e scopes esperados;
- `/me/accounts` → HTTP 200 com zero Pages;
- Page Quoron `1356474050873300` → HTTP 200 por acesso direto;
- a Page direta expõe `instagram_business_account.id = 17841429590351285`;
- `/me/adaccounts` enxerga 3 contas;
- conexão permanece ACTIVE e nenhuma seleção foi persistida.

A documentação oficial Meta atual para Instagram API with Facebook Login admite Facebook User Access Token para leitura/Insights com `instagram_basic`, `instagram_manage_insights` e `pages_read_engagement`, registrando que em certos arranjos via Business Manager podem ser exigidos também `ads_management` + `ads_read`. Essa condição deve ser **provada**, nunca presumida.

## Objetivo único

Determinar se, apesar da falha de enumeração em `/me/accounts`, o **mesmo User Access Token corrente** consegue ler diretamente o Instagram profissional já identificado e a capacidade mínima de Insights necessária à Fase 4.

O IG ID conhecido é usado apenas como **fixture diagnóstica**. Não transformar isso em descoberta por ID fixo no produto.

## Executar somente

Criar uma sonda temporária/read-only em `scripts/` ou adaptar uma sonda exclusivamente diagnóstica sem tocar código de produto.

Usar a conexão ACTIVE `655da6e6-9056-456d-a81d-5e2570da5faf`, o token pelo caminho server-side existente e Graph API v26.0.

### A. IG User direto

`GET /17841429590351285?fields=id,username,media_count,followers_count`

Registrar somente:

- HTTP;
- `id`;
- `username`;
- `media_count`;
- `followers_count`.

### B. Insights direto

Somente se A retornar HTTP 200:

`GET /17841429590351285/insights?metric=reach&period=day`

Registrar somente:

- HTTP;
- quantidade de métricas retornadas;
- nomes/períodos das métricas;
- não é necessário registrar valores históricos individuais.

Em qualquer erro Meta, registrar apenas `code`, `error_subcode` e `type`. Não registrar `message`, URL ou credencial.

## Proibições

- NÃO repetir `debug_token`, `/me`, `/me/accounts`, `/me/adaccounts` ou a prova direta da Page.
- NÃO alterar `.env.local`.
- NÃO iniciar OAuth.
- NÃO revogar/desconectar token.
- NÃO alterar permissões ou configuração Meta.
- NÃO adicionar `business_management`, `ads_management` ou qualquer scope.
- NÃO pedir, imprimir ou persistir Page Access Token.
- NÃO persistir Instagram/Ad Account.
- NÃO editar código de produto.
- NÃO importar conteúdo.
- NÃO iniciar Fase 4.
- NÃO promover/mergear 003B.

## Resultado esperado

Entregar relatório curto em `rodadas/claude/` com A e B, conclusão estritamente factual e parar em:

`AGUARDANDO AUDITORIA GPT`

Se A ou B falhar, não tentar corrigir a Meta nem ampliar scopes; devolver apenas a falha sanitizada.
