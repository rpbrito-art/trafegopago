# CORREÇÃO 003B-08 — RECONEXÃO QUANDO A META RECUSA A AUTORIZAÇÃO ATUAL

Status: **AUTORIZADA PARA EXECUÇÃO PELO CLAUDE CODE**.

Rodada-mãe: **003B — Meta Asset Discovery & Selection**.

## 1. Problema observado

Na tela real do fundador, a conexão persistida aparece como conectada, mas a descoberta de ativos devolve o estado `conexao-recusada` com a mensagem:

> A Meta não aceitou mais a autorização atual. Conecte novamente para retomar de onde parou.

O ramo de UI `conexao-recusada` em `src/components/meta/meta-assets-section.tsx` mostra essa orientação, porém **não renderiza `MetaConnectButton`**. Assim, a tela manda reconectar sem oferecer a ação necessária.

O teste `src/components/meta/meta-assets-section.test.tsx` hoje cristaliza esse erro ao incluir `conexao-recusada` no caso “nenhum outro estado ganha botão de conexão”.

## 2. Evidência de que o fluxo existente pode ser reutilizado

`MetaConnectButton` chama a Server Action canônica `connectMetaAction`.

`connectMetaAction` chama `startMetaAuthorization`, que apenas cria uma nova intenção OAuth e redireciona para o diálogo Meta.

No callback bem-sucedido, `completeMetaAuthorization` usa `begin_meta_connection` para abrir ou retomar a conexão viva e somente depois `activate_meta_connection` substitui token/escopos/status numa transação. Portanto não é necessário desconectar primeiro nem criar um segundo caminho de credencial.

## 3. Delta autorizado

### 3.1 `src/components/meta/meta-assets-section.tsx`

No ramo:

```ts
if (state.kind === "conexao-recusada")
```

manter a mensagem atual e adicionar:

```tsx
<MetaConnectButton
  organizationId={state.organizationId}
  rotulo="Conectar novamente"
/>
```

Não adicionar botão `Desconectar` nesse ramo.

### 3.2 `src/components/meta/meta-assets-section.test.tsx`

Alterar o teste do estado `conexao-recusada` para provar:

- a mensagem continua presente;
- `MetaConnectButton` é renderizado;
- `organizationId` é o da organização do estado;
- `rotulo === "Conectar novamente"`;
- o botão continua usando a action canônica `connectMetaAction` via componente existente.

Atualizar o teste “nenhum outro estado ganha botão de conexão” removendo `conexao-recusada` da lista de estados que não podem ter botão.

## 4. Fora de escopo

Esta correção NÃO autoriza:

- alterar `.env.local`;
- alterar Meta App, Business Login Configuration ou scopes;
- mudar token manualmente;
- apagar/revogar a conexão atual;
- alterar Supabase/migration;
- alterar arquitetura USER/BISU;
- executar OAuth automaticamente;
- selecionar ativos automaticamente;
- merge/promover 003B;
- iniciar Fase 4.

## 5. Provas obrigatórias

Claude deve:

1. executar os testes de `meta-assets-section`;
2. executar a suíte Meta/actions/componentes relevante;
3. executar `tsc --noEmit`;
4. executar lint;
5. publicar novo HEAD na branch `claude/rodada-003b-meta-asset-discovery-selection`;
6. obter CI do PR #12;
7. entregar relatório curto com HEAD, testes e CI;
8. parar em **AGUARDANDO AUDITORIA GPT**.

## 6. Critério de aceite

Depois desta correção, quando a descoberta classificar a credencial como `conexao-recusada`, a tela deve oferecer imediatamente **Conectar novamente** e esse botão deve abrir o mesmo fluxo seguro de autorização já usado pelo produto.

A conexão persistida anterior não deve ser apagada antes de uma nova autorização concluída com sucesso.
