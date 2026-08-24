# CORREÇÃO 003A-07 — DESCONEXÃO BISU GUIADA E PÓS-VERIFICADA

Status: **AUTORIZADA PARA EXECUÇÃO PELO CLAUDE CODE**
Data: 2026-08-24
Branch: `claude/rodada-003a-meta-connection-foundation`
PR: #11 draft

## 1. Origem

A Decisão Arquitetural 003A-06 foi fechada depois da prova factual 003A-06A:

- a credencial real responde `client_business_id`;
- portanto é tratada como **Business Integration System User Access Token (BISU)** do Facebook Login for Business;
- a documentação de Facebook Login for Business aponta a remoção do app em `Business Settings > Integrations > Connected apps` como mecanismo de invalidação BISU;
- `oauth/revoke` não é o contrato adotado para BISU na 003A.

## 2. Objetivo

Substituir o caminho destrutivo incorreto/indocumentado de desconexão BISU por um fluxo seguro de:

`identificar BISU → pedir ação externa guiada → verificar invalidez → só então limpar local`

Nenhuma ação real na Meta é autorizada nesta correção.

## 3. READ SET obrigatório

Antes de alterar código, ler:

- `.gpt/PROJECT_PROMPT.md`;
- `estado.md`;
- `rodadas/gpt/DECISAO_ARQUITETURAL_003A_06_REVOGACAO_TOKEN_BUSINESS_LOGIN.md`;
- `rodadas/gpt/REAUDITORIA_003A_06A_CLASSIFICACAO_BISU.md`;
- mandato original `RODADA_003A_META_CONNECTION_FOUNDATION.md`;
- código atual de `src/lib/meta/gateway.ts`, actions e UI de Conta;
- testes atuais de Meta.

## 4. Contrato funcional obrigatório

### 4.1 Início da desconexão

Ao usuário pedir para desconectar uma conexão com token presente:

1. membership ACTIVE continua sendo revalidada;
2. token continua sendo lido apenas pela fronteira server-side;
3. `debug_token` continua distinguindo `is_valid=false` de falha/ambiguidade;
4. se o token já estiver explicitamente inválido, a limpeza local pode seguir;
5. se estiver válido, o gateway deve classificar a credencial por chamada read-only compatível com o contrato BISU, usando `GET /me?fields=client_business_id`;
6. `client_business_id` presente e não vazio significa **BISU** para este fluxo;
7. BISU válido retorna um resultado explícito equivalente a `EXTERNAL_ACTION_REQUIRED` e **não chama nenhum endpoint Meta mutável e não limpa estado local**;
8. ausência/erro/ambiguidade na classificação não deve virar tentativa alternativa: falhar fechado.

### 4.2 UI guiada

Para BISU válido, a interface deve explicar em linguagem comum:

- a Meta exige concluir a remoção no ambiente dela;
- o usuário deve abrir as configurações do negócio Meta e remover o aplicativo em **Integrações > Aplicativos conectados**;
- o Tráfego Pago manterá a conexão e o token protegidos até confirmar que a Meta realmente removeu o acesso;
- depois da ação externa, há uma ação clara **Verificar desconexão**.

Não expor token, App Secret, `client_business_id`, system user ID ou jargão técnico no fluxo padrão.

Pode existir link para a área de Business Settings/Connected apps se houver destino estável e seguro; não inventar deep link dependente de ID sem prova.

### 4.3 Verificação após ação externa

Implementar ação separada de verificação ou contrato funcional equivalente que:

1. autentica usuário e reconfirma membership;
2. lê a conexão viva e o token server-side;
3. chama somente `debug_token`/inspeção read-only;
4. se `is_valid=false`, chama a limpeza local atômica já existente (`revoke_meta_connection`), remove segredo e conclui `REVOKED`;
5. se `is_valid=true`, mantém tudo intacto e informa que a Meta ainda mostra a integração como ativa;
6. se rede/HTTP/resposta ambígua falhar, mantém tudo intacto e permite tentar verificar depois.

A verificação não deve chamar `oauth/revoke`, `/permissions`, `/access_tokens` ou outro endpoint mutável.

### 4.4 Caminhos antigos

Para a credencial BISU:

- remover/desativar o uso de `oauth/revoke`;
- não usar `DELETE /{system-user-id}/access_tokens`;
- não usar `/permissions` como fallback;
- não inferir BISU apenas de `debug_token.type=SYSTEM_USER`.

Se o código mantiver suporte a `USER` por razão legítima, ele deve ficar isolado e não ser selecionado para BISU. Não ampliar escopo para redesenhar User Access Token além do necessário.

## 5. Testes mínimos obrigatórios

Adicionar/ajustar testes que provem, no mínimo:

1. BISU válido (`client_business_id` presente) retorna ação externa necessária;
2. nesse caso não há chamada a `oauth/revoke`;
3. não há chamada a `/permissions`;
4. não há chamada a `/access_tokens`;
5. `revoke_meta_connection` não é chamado antes da invalidez externa;
6. classificação BISU falhando/ambígua falha fechado;
7. verificação com token ainda válido não limpa local;
8. verificação com token explicitamente inválido limpa local;
9. falha de rede/HTTP na verificação não limpa local;
10. UI mostra instrução externa e ação de verificação sem expor dados técnicos/segredos;
11. regressões anteriores de Vault, cross-tenant, state single-use e pós-condição continuam protegidas.

## 6. Dívida adjacente permitida

No mesmo delta substantivo, sanitizar/remover do script `scripts/meta-diagnose-003a-05.mjs` qualquer impressão de `data.error` bruto que possa carregar conteúdo não controlado. Não ampliar a rodada além disso.

## 7. Provas de execução

Executar apenas o necessário para o delta e, ao final:

- testes afetados de Meta/UI;
- lint;
- typecheck;
- build;
- CI da branch uma vez.

Não executar E2E destrutivo nem tocar no painel Meta.

## 8. Proibições

Durante a execução da 003A-07, NÃO:

- clicar `Desconectar` real;
- remover o app no painel Meta;
- chamar `oauth/revoke` com o token real;
- chamar qualquer endpoint mutável para descobrir comportamento;
- refazer OAuth;
- selecionar ativos;
- iniciar 003B;
- promover/mergear a 003A.

## 9. Handoff

Atualizar o relatório da 003A e a PR #11. Parar em:

`003A-07 EXECUTADA — AGUARDANDO AUDITORIA GPT — NENHUM E2E REAL EXECUTADO`

Somente depois da auditoria GPT poderá existir um gate humano para remover a integração no Meta Business Settings e provar a pós-condição real.
