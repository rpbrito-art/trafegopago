# DECISÃO ARQUITETURAL 003A-06 — REVOGAÇÃO DO TOKEN DO FACEBOOK LOGIN FOR BUSINESS

Status: **DECISÃO FECHADA — BISU CONFIRMADO — DESCONEXÃO GUIADA EXTERNA É O CONTRATO DA 003A**
Data: 2026-08-24

## 1. Motivo

O E2E real de desconexão da 003A foi executado uma vez e falhou fechado. A Investigação 003A-05 provou que o token continuava válido e descartou falha de leitura do Vault, inspeção inicial e tipo desconhecido.

A implementação então existente usava `oauth/revoke` quando `debug_token.type === SYSTEM_USER`, mas a primeira tentativa real não invalidou a credencial. A arquitetura não poderia continuar por tentativa e erro.

## 2. Distinção de credenciais

A documentação do Facebook Login for Business distingue:

- **User Access Token**;
- **Business Integration System User Access Token (BISU)**, obtido quando a configuração pede `System-user access token` para acesso contínuo aos ativos do negócio cliente;
- System User Access Token clássico gerado/gerido diretamente no Business Manager, que possui ciclo de vida e operações próprias.

`debug_token.type=SYSTEM_USER` não é suficiente, sozinho, para decidir o mecanismo de invalidação.

## 3. Prova factual da credencial real

A Investigação 003A-06A foi executada em leitura e auditada.

O token real respondeu:

`GET /v26.0/me?fields=client_business_id`

com:

- HTTP 200;
- `client_business_id=5301659283195806`;
- `id=122103866379446065`, igual ao `external_user_id` persistido.

A mesma credencial permanece `is_valid=true`, `type=SYSTEM_USER`.

A presença de `client_business_id` fecha a classificação necessária para a 003A: **a credencial real é tratada como BISU do Facebook Login for Business**.

## 4. Contrato documental aplicável

A referência de Facebook Login for Business consultada registra que:

1. BISU é associado ao business portfolio do cliente e é emitido por Authorization Code no fluxo de Facebook Login for Business;
2. `GET /me?fields=client_business_id` é parte do contrato de gerenciamento BISU;
3. `/<CLIENT_BUSINESS_ID>/system_user_access_tokens` é documentado para gerar/buscar tokens BISU;
4. a linha **Token Invalidation** orienta o negócio cliente a invalidar BISU removendo o aplicativo em:

`Business Manager > Settings > Business Settings > Integrations > Connected apps`;

5. a referência BISU consultada não estabelece `oauth/revoke` como mecanismo de invalidação;
6. `DELETE /<APP_SCOPED_SYSTEM_USER_ID>/access_tokens`, documentado no contexto de System User clássico, invalida todos os tokens daquele system user e não será reutilizado por inferência para BISU.

O acesso direto à documentação Meta sofreu rate limiting durante a pesquisa; a decisão usou snapshots versionados que preservam a URL oficial de origem e foi fechada com a prova factual do runtime real.

## 5. DECISÃO ARQUITETURAL

Para a configuração atual do Tráfego Pago, que solicita **System-user access token** via Facebook Login for Business, o fluxo de desconexão de BISU será:

1. servidor lê e inspeciona a credencial sem expô-la;
2. servidor identifica BISU por `client_business_id` enquanto o token estiver válido;
3. **nenhum endpoint mutável de revogação é chamado pelo Tráfego Pago para BISU**;
4. a interface explica, em linguagem simples, que a Meta exige remover o aplicativo em `Business Settings > Integrations > Connected apps`;
5. o usuário executa essa remoção no ambiente Meta por fluxo guiado;
6. ao voltar, o usuário aciona **Verificar desconexão**;
7. o servidor reinspeciona o mesmo token;
8. somente `is_valid=false` autoriza `revoke_meta_connection`, remoção do segredo no Vault e estado local `REVOKED`;
9. se o token continuar válido, ou se a verificação for ambígua/indisponível, nada local é apagado e a interface orienta nova verificação;
10. a UI deve deixar claro que remover o app do negócio pode invalidar a integração daquele app para o business portfolio, não apenas uma linha local do Tráfego Pago.

Isso é uma **desconexão guiada com gate externo + pós-verificação**, não uma revogação automática de um clique.

## 6. Consequência para o código atual

O caminho `oauth/revoke` para a credencial BISU está arquiteturalmente rejeitado para a 003A.

A implementação deve ser corrigida antes de qualquer novo E2E real.

O produto não deve classificar um token como BISU apenas por `debug_token.type`; deve usar o contrato factual do Facebook Login for Business (`client_business_id`) ou falhar fechado.

A primeira versão não precisa persistir `client_business_id` em nova coluna para cumprir o gate, desde que a classificação read-only seja segura e reproduzível. Persistência futura pode ser considerada se houver necessidade substantiva.

## 7. Invariantes obrigatórias

- nunca apagar o token local enquanto ele puder estar válido na Meta;
- nunca usar endpoint mutável não documentado como instrumento de descoberta;
- BISU válido não chama `oauth/revoke` nem `DELETE /{system-user-id}/access_tokens`;
- erro/ambiguidade na classificação ou verificação falha fechado;
- nenhuma credencial aparece no browser, URL ou log;
- a complexidade técnica fica escondida, mas a necessidade de ação externa e seu efeito não podem ser escondidos;
- remover a integração no painel Meta só será pedido ao fundador depois da auditoria do código da correção.

## 8. Próximo mandato

Autorizada a elaboração/execução da:

`rodadas/gpt/CORRECAO_003A_07_DESCONEXAO_BISU_GUIADA.md`

Nenhum novo E2E real fica autorizado pela existência desta decisão.

## 9. Continua proibido até auditoria da 003A-07

- clicar `Desconectar` novamente;
- chamar `oauth/revoke` para o BISU;
- chamar `DELETE /permissions` para o BISU;
- chamar `DELETE /{system-user-id}/access_tokens`;
- remover o app em Connected apps antes do gate GPT;
- limpar estado local;
- refazer OAuth;
- selecionar ativos;
- iniciar 003B;
- promover 003A.

## 10. Estado

`DECISÃO ARQUITETURAL 003A-06 FECHADA — BISU CONFIRMADO — CORREÇÃO 003A-07 AUTORIZADA — E2E AINDA BLOQUEADO`
