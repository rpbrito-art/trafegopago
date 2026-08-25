# AUDITORIA GPT — CORREÇÃO 003B-06: DISCOVERY SENSÍVEL À CREDENCIAL

Data: 2026-08-25

## Veredito

**APROVADA NO NÍVEL DE CÓDIGO/ARQUITETURA DOCUMENTADA; NÃO É PROVA E2E BISU.**

A execução do Claude não deve ser revertida.

## Evidência verificada

- HEAD da branch: `c1b3ba01abd44503777adaf6b5ea4507063bce34`.
- Relatório: `rodadas/claude/RELATORIO_CORRECAO_003B_06_DISCOVERY_CREDENTIAL_AWARE.md`.
- A correção centraliza a classificação em `src/lib/meta/credential.ts`, preservando a semântica fail-closed já auditada na 003A.
- `src/lib/meta/assets.ts` mantém USER em `/me/accounts` e roteia BISU para `/{system-user-id}/assigned_pages` somente após classificação positiva.
- Classificação inconclusiva não consulta edge por tentativa; BISU sem identidade não faz fallback; identidade divergente falha fechado.
- Ads não foi alterado.
- Nenhuma migration, RPC ou UI foi alterada na 003B-06.

## Fonte oficial/primária suficiente para o edge

O SDK oficial da Meta `facebook-nodejs-business-sdk`, objeto `SystemUser`, implementa `getAssignedPages()` usando explicitamente o edge `/assigned_pages` e retornando objetos `Page`.

Isso é evidência primária suficiente para aceitar que `/{system-user-id}/assigned_pages` é um edge oficial de Pages atribuídas a System User. A afirmação anterior do GPT de que `assigned_pages` era apenas hipótese fica superada.

## Limites que permanecem

A auditoria NÃO prova que o fluxo BISU real do projeto funciona de ponta a ponta:

1. não existe BISU ativo no experimento corrente para chamar o edge real;
2. as permissões efetivamente exigidas por `assigned_pages` não foram exercitadas no ambiente real;
3. a expansão `instagram_business_account` nesse edge ainda não foi confirmada contra a Meta real;
4. o portfólio Quoron continua inelegível como cliente do próprio app no E2E BISU testado.

Portanto, a correção é arquiteturalmente válida, mas não encerra o gate E2E da 003B.

## Estado de integração

O PR #12 permanece draft e não mergeado. A branch divergiu da `main` porque o GPT atualizou documentação enquanto o Claude executava. O PR está atualmente não mergeável e o HEAD `c1b3ba0...` não tem workflow CI associado.

Isso não reprova o código, mas impede promoção.

## Próxima ação autorizada

Claude deve apenas:

1. reconciliar a branch 003B com a `main` atual, preservando a decisão desta auditoria no conflito de `estado.md`;
2. não alterar o comportamento da 003B-06 salvo correção estritamente necessária para a reconciliação;
3. rodar testes Meta relevantes, typecheck e lint;
4. publicar o novo HEAD remoto e aguardar CI;
5. entregar handoff com HEAD, status do PR e CI;
6. parar em `AGUARDANDO AUDITORIA GPT`.

Não autoriza novo OAuth, mudança Meta, novos scopes, Page Access Token, E2E BISU, merge/promoção ou Fase 4.
