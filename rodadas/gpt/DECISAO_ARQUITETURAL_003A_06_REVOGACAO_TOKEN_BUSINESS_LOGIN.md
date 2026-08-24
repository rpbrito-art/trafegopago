# DECISÃO ARQUITETURAL 003A-06 — REVOGAÇÃO DO TOKEN DO FACEBOOK LOGIN FOR BUSINESS

Status: **PESQUISA DOCUMENTAL GPT AVANÇADA — PROVA FACTUAL 003A-06A AUTORIZADA — E2E DE DESCONEXÃO BLOQUEADO**
Data: 2026-08-24

## 1. Motivo

O E2E real de desconexão da 003A foi executado uma vez e falhou fechado. A Investigação 003A-05 comprovou que o token continua válido na Meta e eliminou como causa a leitura do Vault, a inspeção inicial e o reconhecimento do tipo `SYSTEM_USER`.

Restou materialmente incerto o contrato de revogação externa usado pelo software.

A implementação atual usa `oauth/revoke` quando `debug_token.type === SYSTEM_USER`. Uma nova chamada destrutiva não pode ser usada como mecanismo de descoberta arquitetural.

## 2. Distinção obrigatória de tipos de credencial

Não assumir que todo token que `debug_token` chama de `SYSTEM_USER` possui o mesmo ciclo de vida.

A documentação do ecossistema Meta distingue:

- **System User Access Token clássico**: associado a system user criado/gerido no Business Manager para server-to-server;
- **Business Integration System User Access Token (BISU)**: emitido a partir de Facebook Login for Business para uma integração de Tech Provider com o negócio cliente;
- **User Access Token**: associado ao usuário humano.

A conexão real da 003A foi obtida por **Facebook Login for Business**, mediante authorization code, com configuração que escolheu **System-user access token** e expiração de 60 dias.

## 3. Pesquisa documental GPT — resultado atual

### 3.1 Facebook Login for Business classifica o token de integração como BISU

A página oficial de Facebook Login for Business, preservada em snapshots documentais com a URL de origem Meta, declara que o produto pode emitir:

- `Business Integration System User access tokens`; ou
- `User access tokens`.

Na criação da configuração, a opção apresentada como `System-user access token` corresponde ao fluxo de Business Integration System User. Esse fluxo usa Authorization Code e é voltado a acesso contínuo aos ativos do negócio cliente.

A mesma documentação descreve que o BISU é associado ao business portfolio do cliente, e não à conta pessoal de um usuário.

### 3.2 O contrato BISU possui identificador próprio

A seção **Business Integration System User Access Token Management API** estabelece que um BISU inclui um `client_business_id` e documenta:

`GET /me?fields=client_business_id`

como forma de recuperar o negócio cliente a partir do próprio BISU.

Também documenta `/<CLIENT_BUSINESS_ID>/system_user_access_tokens` para:

- gerar tokens granulares a partir de BISU existente;
- buscar tokens BISU existentes.

A operação documentada é de geração/busca; nessa referência não aparece uma operação de revogação individual do BISU.

### 3.3 Invalidação documentada para BISU

Na tabela de comparação do Facebook Login for Business, a linha **Token Invalidation** diz que o negócio cliente pode invalidar Business Integration System User access tokens removendo o app em:

`Business Manager > Settings > Business Settings > Integrations > Connected apps`

Portanto, a evidência documental encontrada até aqui aponta para **remoção da integração pelo negócio cliente** como mecanismo explícito de invalidação do BISU.

### 3.4 Não confundir com System User clássico

Documentação Meta para System User clássico registra a possibilidade de invalidar **todos os access tokens de um system user** com:

`DELETE /<APP_SCOPED_SYSTEM_USER_ID>/access_tokens`

Esse contrato aparece no contexto de system users clássicos do Business Manager e tem blast radius de todos os tokens daquele system user. Não há base suficiente para promovê-lo a mecanismo de desconexão individual do BISU emitido pelo Facebook Login for Business.

Portanto esse DELETE permanece **não autorizado**.

### 3.5 `oauth/revoke` não está estabelecido como contrato BISU

A pesquisa GPT não encontrou `oauth/revoke` documentado na referência de Facebook Login for Business/BISU consultada. Além disso, a primeira tentativa real da 003A usando esse mecanismo não invalidou o token.

Isso não prova sozinho que o endpoint jamais possa aceitar alguma variante dessa credencial, mas é suficiente para rejeitar a continuação da arquitetura por tentativa e erro.

### 3.6 Limitação da pesquisa externa

Durante esta pesquisa, o acesso direto ao site `developers.facebook.com` sofreu rate limiting. Para não inventar semântica, foram usados snapshots versionados de páginas da documentação Meta que preservam a URL oficial de origem, além de documentação Meta recente de autenticação. A decisão final continuará exigindo prova do runtime da nossa credencial concreta.

## 4. Hipótese arquitetural líder

Se o token real da 003A for confirmado como BISU, a arquitetura mais aderente à documentação encontrada é:

1. o aplicativo inicia uma **solicitação de desconexão**;
2. o usuário é orientado a remover a integração Quoron/Tráfego Pago em `Business Manager > Integrations > Connected apps`;
3. enquanto a remoção externa não for comprovada, o sistema mantém o token no Vault e não finge estar desconectado;
4. após a ação do usuário, o servidor reinspeciona o mesmo token;
5. somente `is_valid=false` permite apagar o segredo local e marcar a conexão `REVOKED`;
6. falha/ambiguidade preserva o estado e oferece nova verificação.

Isso transforma `Desconectar` em um **fluxo guiado de revogação externa + verificação**, em vez de uma mutação remota não documentada.

Esta hipótese ainda não está promovida a decisão final até a 003A-06A provar a classe concreta do token.

## 5. Prova factual necessária — 003A-06A

Claude Code fica autorizado **somente** a provar, em leitura:

`GET /v26.0/me?fields=client_business_id`

usando o token real existente via fronteira server-side.

A investigação deve responder:

- HTTP status;
- se `client_business_id` existe e é não vazio;
- valor do `client_business_id`;
- `id` retornado;
- se esse `id` coincide com o `external_user_id` já persistido;
- nenhuma credencial exposta e nenhuma mutação executada.

Mandato:

`rodadas/gpt/INVESTIGACAO_003A_06A_CLASSIFICAR_TOKEN_BISU.md`

## 6. Invariantes para a decisão final

A solução de desconexão deve garantir:

1. não apagar estado local enquanto a autorização externa puder continuar ativa;
2. não tratar `SYSTEM_USER` como classificação suficiente da origem da credencial;
3. não usar endpoint mutável não documentado como experimento;
4. explicar ao usuário quando a Meta exige ação no ambiente externo;
5. verificar pós-condição antes da limpeza local;
6. deixar claro o blast radius se a remoção da integração invalidar todos os BISU daquele app/negócio;
7. preservar simplicidade guiada: a complexidade técnica fica no sistema, mas a necessidade de ação externa não pode ser escondida.

## 7. Proibições enquanto a decisão não for fechada

Não está autorizado:

- clicar `Desconectar` novamente;
- chamar `oauth/revoke` novamente;
- testar `DELETE /{system-user-id}/access_tokens` ou qualquer outro endpoint mutável;
- revogar pelo painel Meta antes de autorização explícita do gate;
- limpar segredo/referência local;
- refazer OAuth;
- selecionar ativos;
- iniciar 003B;
- promover 003A.

Claude Code não deve pesquisar e escolher a arquitetura de revogação. Está autorizado apenas à prova factual 003A-06A acima.

## 8. Estado

`DECISÃO ARQUITETURAL 003A-06 — PESQUISA GPT AVANÇADA — AGUARDANDO PROVA BISU 003A-06A`
