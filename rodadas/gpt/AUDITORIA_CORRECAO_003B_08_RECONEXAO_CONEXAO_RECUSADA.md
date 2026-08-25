# AUDITORIA — CORREÇÃO 003B-08: reconexão quando a Meta recusa a autorização

Status: **APROVADA**.

Branch auditada: `claude/rodada-003b-meta-asset-discovery-selection`

HEAD auditado: `ed44cb8abab86cb28087d410ae5c0fe75b26d2be`

PR: #12 — open, draft, `mergeable=true`.

CI: `32851269642` — **success**.

## 1. Delta auditado

A correção efetiva ficou restrita ao comportamento autorizado:

- `src/components/meta/meta-assets-section.tsx`: o estado `conexao-recusada` agora renderiza `MetaConnectButton` com rótulo `Conectar novamente`;
- `src/components/meta/meta-assets-section.test.tsx`: adicionadas provas do botão, rótulo, `organizationId`, ausência de orientação para desconectar e reutilização de `connectMetaAction`;
- relatório/estado documental da execução.

Nenhum caminho novo de OAuth foi criado. O botão reutiliza a Server Action canônica `connectMetaAction`, que chama `startMetaAuthorization()`.

## 2. Segurança e preservação de estado

A correção não altera backend, RPC, migration, banco, `.env.local`, app Meta, Business Login Configuration, scopes ou tokens.

O fluxo de reconexão continua sem desconexão prévia: a conexão viva é retomada e a credencial só é substituída após a nova autorização concluir com sucesso. Falha/cancelamento da nova autorização não exige apagar preventivamente a conexão anterior.

## 3. Provas

Relatório Claude registra:

- `meta-assets-section.test.tsx`: 26/26;
- suíte Meta/actions/componentes: 230/230;
- `tsc --noEmit`: limpo;
- lint: limpo.

A CI independente do HEAD auditado está verde: run `32851269642`.

## 4. Veredito

**CORREÇÃO 003B-08 APROVADA.**

O fundador está autorizado a recarregar a aplicação local e usar **Conectar novamente** para executar um novo OAuth real e observar o comportamento da Meta.

Esse teste não equivale a promoção da 003B. A 003B continua não promovida até auditoria do resultado E2E pertinente.

Durante o teste:

- não clicar em `Desconectar` antes da reconexão;
- não alterar scopes/configuração Meta fora do fluxo normal mostrado pela própria autorização;
- não criar campanha/anúncio/gasto;
- não expor token/secret.
