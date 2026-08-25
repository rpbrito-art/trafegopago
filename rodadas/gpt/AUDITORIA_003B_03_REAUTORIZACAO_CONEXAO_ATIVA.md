# AUDITORIA 003B-03 — REAUTORIZAÇÃO DE CONEXÃO META ATIVA

Status: **AUDITADA E APROVADA**
Data: 2026-08-24
Rodada pai: **003B — Meta Asset Discovery & Selection**
Correção: `rodadas/gpt/CORRECAO_003B_03_REAUTORIZACAO_CONEXAO_ATIVA.md`
Branch: `claude/rodada-003b-meta-asset-discovery-selection`
HEAD auditado: `872d777a929f4be12567d9a7b9e9fa89bac00dfb`
PR: #12 draft

## 1. Resultado

**APROVADA.** A Correção 003B-03 implementou o caminho de reautorização de uma conexão Meta já ativa sem desconectá-la e sem criar novo backend, RPC ou migration.

## 2. Delta auditado

O ramo `permissao-faltando` de `MetaAssetsSection` agora:

- explica em linguagem de negócio que a Meta já está conectada, mas falta ampliar o acesso ao Instagram;
- informa que a conexão atual continua valendo até a nova autorização terminar;
- renderiza o `MetaConnectButton` com rótulo **Atualizar autorização**;
- reaproveita a action canônica `connectMetaAction` e, portanto, o fluxo OAuth já auditado;
- não sugere desconectar antes de reautorizar.

O aviso `sem-permissao` foi harmonizado com o mesmo vocabulário.

Não houve alteração de gateway, callback, RPC, migration, Vault ou modelo de token nesta correção.

## 3. Provas independentes

### Código

O código usa `MetaConnectButton` com `organizationId` do estado e rótulo `Atualizar autorização`. Os testes focados cobrem:

- presença do botão somente em `permissao-faltando`;
- rótulo correto;
- organização correta;
- reutilização de `connectMetaAction`;
- ausência de instrução de desconexão;
- demais estados sem botão indevido.

### CI

Workflow run `32792662569`: **success**.

Job único verde em:

- Install;
- Lint;
- Typecheck;
- Typecheck Edge Functions;
- Test;
- Build.

### Supabase — verificação independente pós-execução

Conexão real `655da6e6-9056-456d-a81d-5e2570da5faf` permaneceu:

- status `ACTIVE`;
- `disconnected_at = null`;
- referência de token presente;
- escopos ainda iguais ao token anterior: `pages_show_list`, `pages_read_engagement`, `public_profile`;
- `instagram_accounts = 0`;
- `ad_accounts = 0`.

Isso prova que a implementação da 003B-03 não executou OAuth, não apagou token e não gravou seleção por engano.

## 4. Gate liberado

Está autorizado o E2E real de reautorização:

1. fundador abre `http://localhost:3000/conta`;
2. clica **Atualizar autorização**;
3. no Facebook Login for Business usa o portfólio **Quoron**, a Página **Quoron** e o Instagram **@goquoron**;
4. conclui o consentimento;
5. ao retornar ao localhost, não seleciona ainda o Instagram;
6. GPT audita imediatamente os escopos do novo token e o estado da conexão no Supabase.

Escopos mínimos esperados para prosseguir:

- `pages_show_list`;
- `instagram_basic`.

Também esperamos, para a leitura de Insights:

- `pages_read_engagement`;
- `instagram_manage_insights`.

## 5. Continua não autorizado

Até a auditoria do token renovado:

- não desconectar a integração;
- não remover Apps conectados;
- não criar campanha/anúncio/gasto;
- não selecionar manualmente ativo no banco;
- não promover a 003B;
- não iniciar F4.
