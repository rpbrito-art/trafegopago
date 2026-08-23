# CORREÇÃO 003A-02 — AUTORIZAÇÃO, ATOMICIDADE E OAUTH REAL

Status: **AUTORIZADA**
Data: 2026-08-23
Branch: `claude/rodada-003a-meta-connection-foundation`
PR: #11

Esta correção continua a 003A já autorizada. **Não exige nova aprovação do fundador.**

## 1. Objetivo

Fechar somente os bloqueios encontrados na auditoria da 003A e concluir o gate real Meta.

Não repetir a rodada, não iniciar 003B e não reescrever migrations já aplicadas.

## 2. Preflight

1. `git fetch origin`;
2. reconciliar a branch com a `main` atual, incluindo a governança mais recente e esta correção;
3. confirmar migration history remoto = 12 antes de qualquer DDL novo;
4. preservar as migrations `20260823195327`, `20260823195742`, `20260823200706` sem alteração.

## 3. Correções obrigatórias de aplicação

### 3.1 Membership na desconexão

Antes de ler/revogar qualquer conexão, confirmar server-side que `userId` possui membership `ACTIVE` na `organizationId` recebida.

UUID de organização conhecido não autoriza operação. Teste obrigatório: usuário A não consegue desconectar organização B.

Não inventar regra owner/admin nesta correção; usar a mesma fronteira de membership ACTIVE já usada para iniciar a conexão, salvo canônico vigente exigir algo mais restritivo.

### 3.2 Membership novamente no callback

Depois de validar a intenção e **antes da troca `code → token`**, reconfirmar membership ACTIVE do usuário na organização da intenção.

Se a membership foi removida durante o fluxo, falhar fechado, consumir/inutilizar a intenção de forma segura e não chamar Meta nem persistir conexão.

### 3.3 `state` negado também é single-use

Não retornar `DENIED` antes de validar/consumir a intenção.

Fluxo esperado:

`state bem-formado → intenção existente → mesmo usuário → membership vigente → consumo atômico → se provider negou, DENIED sem trocar code`.

State malformado/desconhecido não deve consumir outro registro.

Provar replay após callback negado: segunda tentativa é recusada.

### 3.4 Remover upsert inválido

Não usar `upsert(onConflict: organization_id)` contra o índice único parcial atual.

Preservar o modelo de histórico:

- se existir uma conexão **viva** da organização, atualizá-la para o novo fluxo PENDING de forma explícita;
- se não existir conexão viva, inserir nova linha;
- linhas terminais antigas permanecem histórico;
- corrida concorrente continua protegida pelo índice único parcial.

Não transformar o índice parcial em unique total apenas para facilitar PostgREST.

### 3.5 Ativação atômica

O código não pode retornar sucesso se guardar o token e falhar ao marcar `ACTIVE`.

Preferir uma única operação transacional no Postgres para:

- gravar/atualizar o segredo no Vault;
- associar a referência;
- definir expiração;
- marcar `ACTIVE`;
- registrar timestamps de conexão/health.

Se isso exigir alterar função já aplicada, fazer **uma nova migration corretiva** com `CREATE OR REPLACE`/novo RPC; nunca editar migration antiga.

O gateway deve verificar explicitamente erro/resultado e só então retornar `{ ok: true }`.

### 3.6 Revogação real no provider

Revalidar primeiro a documentação oficial Meta vigente do Facebook Login for Business/Graph API sobre revogação/deautorização.

Se o mecanismo oficial aplicável existir, a desconexão deve:

1. validar membership;
2. obter o token apenas em fronteira server-only/service_role;
3. solicitar a revogação oficial na Meta;
4. somente após sucesso ou estado externo comprovadamente já revogado, executar a revogação local atômica;
5. em falha transitória/indeterminada do provider, não fingir desconexão concluída.

Se for necessário ler o segredo do Vault, criar na nova migration uma fronteira mínima com:

- `security invoker` quando suficiente;
- `search_path=''`;
- EXECUTE apenas `postgres`/`service_role`;
- nenhum grant a `anon`, `authenticated` ou PUBLIC;
- token nunca em log, browser, audit metadata, fila ou relatório.

Se a documentação oficial vigente contradizer esse fluxo ou não oferecer revogação aplicável, **parar e devolver a evidência ao GPT** em vez de improvisar.

## 4. Gate humano Meta — obrigatório

Após todas as correções autônomas e testes focados, conduzir um único `GATE HUMANO ATIVO` para criar/configurar o Meta App de desenvolvimento e a Business Login Configuration.

Claude deve orientar o fundador em português simples, **uma ação principal por vez**, indicando exatamente:

- em qual tela do Meta for Developers entrar;
- o que clicar/preencher;
- por que aquilo é necessário;
- o que NÃO deve ser enviado ao chat.

`META_APP_ID`, `META_APP_SECRET` e `META_LOGIN_CONFIG_ID` devem ir diretamente para o ambiente local/server apropriado. Nunca pedir o segredo no chat nem versioná-lo.

Depois do gate, retomar na mesma sessão e provar ponta a ponta:

1. iniciar conexão;
2. Meta autorizar;
3. callback real trocar `code → token`;
4. conexão ficar `ACTIVE` para a organização correta;
5. token existir no Vault sem aparecer no browser/log;
6. scopes/identidade reais serem persistidos conforme contrato;
7. desconectar;
8. provider ficar revogado/desautorizado conforme mecanismo oficial aplicável;
9. segredo local ser removido;
10. linha ficar `REVOKED` sem incoerência.

## 5. Orçamento de prova

Esta é correção Risco A, mas por delta.

Localmente executar somente testes novos/afetados de gateway/OAuth/autorização e, se houver migration nova, prova SQL focada nela.

Não repetir:

- 44/44 SQL da 003A inteira;
- 51 testes antigos se não forem afetados;
- E2E de Auth/RLS/fila das fases anteriores.

CI completa **uma única vez** no PR final.

Provas mínimas novas:

- desconexão cross-tenant recusada;
- callback após remoção de membership recusado antes de Meta;
- state negado consumido e replay recusado;
- caminho nova conexão funciona sem `upsert` inválido;
- reconexão viva atualiza sem duplicar;
- histórico REVOKED não bloqueia nova conexão;
- falha de ativação não retorna sucesso;
- revogação externa/local segue ordem segura;
- E2E Meta real completo.

## 6. Handoff

Atualizar o relatório existente, sem criar relatório paralelo. Manter compacto: delta da 003A-02 + evidência do gate real.

Atualizar `estado.md` da branch para:

`003A + CORREÇÃO 003A-02 EXECUTADAS — AGUARDANDO REAUDITORIA GPT`

Push na mesma branch, atualizar PR #11 draft e parar.

## 7. Fora de escopo

- 003B;
- seleção/importação de conteúdo Instagram;
- Ads/campanhas/gasto;
- webhook Meta público;
- cron;
- IA;
- App Review/produção.
