# CORREÇÃO 003A-10 — VERIFICAÇÃO BISU PÓS-REMOÇÃO + CONTINUIDADE DO FLUXO

Status: **AUTORIZADA PARA EXECUÇÃO PELO CLAUDE CODE**
Data: 2026-08-24
Branch: `claude/rodada-003a-meta-connection-foundation`
PR: #11 draft

## 1. Origem

A integração BISU correta foi removida em **Business Settings > Apps conectados**. Depois disso, a Meta deixou de aceitar o token alvo, mas não passou a responder `debug_token.is_valid=false`:

- `debug_token` do alvo: HTTP 400, code 100, sem `data`;
- app token de controle: válido;
- `/me` com o alvo: HTTP 400, OAuth 190/subcode 464.

A implementação atual preserva corretamente o local, porém não consegue concluir a desconexão.

Além disso, um novo login/reload perde o estado visual `?meta=externo`, fazendo o usuário voltar a ver `Meta conectada` mesmo depois de ter iniciado a remoção externa.

## 2. Objetivo

Fechar o fluxo BISU de forma persistente e contextual, sem voltar à regra insegura `190 => revogado`.

## 3. Contrato obrigatório

### 3.1 Persistir o fluxo BISU externo

Quando `disconnectMeta` comprovar token válido + BISU por `client_business_id`:

- persistir um marcador explícito e seguro de **remoção externa pendente** na conexão;
- preservar token, referência Vault e autorização local;
- não chamar endpoint Meta mutável;
- devolver `EXTERNAL_ACTION_REQUIRED`.

O marcador deve sobreviver a reload, logout/login e nova sessão. Preferência arquitetural: coluna dedicada, por exemplo `external_disconnect_pending_at timestamptz`, com migration aditiva. Não usar query string ou texto humano como única fonte de estado.

A UI deve derivar o estado pendente da conexão persistida e continuar mostrando a trilha de remoção mesmo depois de novo login.

### 3.2 Caminho correto na interface Meta

Corrigir a orientação do produto para a superfície comprovada:

**Configurações do negócio > Apps conectados**.

Não instruir `Contas > Apps` e não usar `Integrações > Aplicativos conectados` como caminho literal.

Pode oferecer link oficial seguro para `https://business.facebook.com/latest/settings/connected_apps/`, sem inventar parâmetros não conhecidos.

### 3.3 Pós-verificação BISU contextual

`checkMetaDisconnection` deve continuar somente leitura no provider até a limpeza local final.

Somente para uma conexão com marcador persistido de remoção externa BISU:

1. ler o mesmo token do Vault;
2. tentar `debug_token`;
3. `HTTP 200 + is_valid=false` continua sendo prova suficiente;
4. se o alvo reproduzir a assinatura pós-remoção observada (`debug_token` não utilizável/HTTP 400), executar prova composta read-only:
   - confirmar que o app token está saudável por inspeção própria;
   - chamar um endpoint read-only estável com o **token alvo** (`GET /me` com campos mínimos seguros);
   - aceitar como confirmação da remoção **somente** a assinatura real observada e testada: HTTP 400, `OAuthException`, code 190, subcode 464;
5. apenas após essa prova composta, chamar a limpeza local atômica (`revoke_meta_connection` ou equivalente), remover segredo/referência, marcar `REVOKED`, `disconnected_at` e limpar o marcador pendente.

### 3.4 O que continua proibido

- `190` genérico não prova revogação;
- subcode diferente de 464 não prova a pós-condição nesta rodada;
- 190/464 sem marcador BISU pendente não autoriza limpeza;
- falha do app token de controle não autoriza limpeza;
- rede, timeout, 5xx, corpo ambíguo ou erro de parsing não autorizam limpeza;
- não chamar `oauth/revoke`, `/permissions` ou `/access_tokens` para BISU.

## 4. Idempotência e recuperação de sessão

Provar que:

- logout/login durante remoção não perde o estado pendente;
- reload não oferece `Desconectar` como se nada tivesse acontecido;
- múltiplos cliques de verificação não causam dupla limpeza nem estado inconsistente;
- após `REVOKED`, nova verificação não recria conexão nem segredo.

## 5. Testes mínimos

Cobrir pelo menos:

1. BISU válido ao clicar Desconectar persiste marcador e não muta Meta;
2. estado pendente aparece pela leitura persistida, sem depender de `?meta=externo`;
3. `is_valid=false` explícito conclui;
4. assinatura real pós-remoção: debug_token HTTP 400 + app token saudável + alvo `/me` 190/464 conclui;
5. 190/464 sem marcador pendente falha fechado;
6. 190 sem subcode 464 falha fechado;
7. 190 com outro subcode falha fechado;
8. app token de controle inválido/falhando preserva local;
9. `/me` ainda funcional preserva local e informa ainda ativo;
10. rede/5xx/ambiguidade preservam local;
11. múltiplas verificações são idempotentes;
12. UI não contém o caminho incorreto `Contas > Apps` e mostra `Apps conectados`.

## 6. Migration e ambiente

Se for usada coluna dedicada:

- criar nova migration; nunca editar migration aplicada;
- não aplicar migration no projeto remoto por conta própria se a governança exigir gate GPT;
- entregar o SQL/migration e provas locais; GPT audita e aplica no Supabase antes do E2E final.

## 7. Provas

Executar testes afetados, lint, typecheck, build e uma CI da branch.

Nenhuma nova ação real na Meta. Nenhuma nova tentativa manual do fundador nesta execução.

## 8. Handoff

Atualizar relatório/PR e parar em:

`003A-10 EXECUTADA — AGUARDANDO AUDITORIA GPT — INTEGRAÇÃO EXTERNA JÁ REMOVIDA; ESTADO LOCAL AINDA PRESERVADO`
