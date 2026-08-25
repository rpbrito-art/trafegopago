# RELATÓRIO — CORREÇÃO 003B-08: reconexão quando a Meta recusa a autorização

Mandato: `rodadas/gpt/CORRECAO_003B_08_RECONEXAO_CONEXAO_RECUSADA.md`
Branch: `claude/rodada-003b-meta-asset-discovery-selection`
Natureza: microcorreção de UI. Nenhum backend, RPC, migration, `.env.local`, App Meta, configuração, escopo ou token tocado.

## 1. Delta

| arquivo | mudança |
| --- | --- |
| `src/components/meta/meta-assets-section.tsx` | ramo `conexao-recusada` passa a renderizar `MetaConnectButton` com rótulo **Conectar novamente** |
| `src/components/meta/meta-assets-section.test.tsx` | +2 provas do botão; `conexao-recusada` sai da lista de estados que não podem ter botão |

A mensagem não mudou. Nenhum botão `Desconectar` foi adicionado ao ramo, e reconectar não passa por desconectar: `begin_meta_connection` retoma a linha viva e `activate_meta_connection` só substitui token, escopos e status depois que a nova autorização conclui — o mesmo raciocínio já registrado no ramo `permissao-faltando` pela 003B-03.

## 2. Provas

`npx vitest run src/components/meta/meta-assets-section.test.tsx` → **26/26** (24 antes, 2 novas).

As novas provam: o botão é renderizado no estado `conexao-recusada`; `rotulo === "Conectar novamente"`; `organizationId` é o da organização do estado; a tela não sugere desconectar; e o botão usa a Server Action canônica `connectMetaAction` — sem caminho novo de credencial.

O teste "nenhum outro estado ganha botão de conexão" continua verde para os demais estados, agora sem `conexao-recusada`, que passou a ser um estado com ação legítima.

`npx vitest run src/lib/meta src/lib/actions src/components/meta` → **230/230**.
`npx tsc --noEmit` → limpo. `npm run lint` → limpo.

## 3. Critério de aceite

Atendido: classificada a credencial como `conexao-recusada`, a tela oferece **Conectar novamente** e o botão abre o mesmo fluxo de autorização já usado pelo produto. A conexão persistida não é apagada antes de uma nova autorização concluir com sucesso — nada nesta correção toca a credencial.

## 4. Invariantes preservadas

- Nenhuma alteração em backend, RPC, migration ou Supabase.
- `.env.local`, Meta App, Business Login Configuration, escopos e tokens intocados.
- Nenhum OAuth executado; nenhuma seleção automática de ativo.
- Conexão persistida preservada; nada revogado ou apagado.
- Arquitetura USER/BISU não alterada.

## 5. HEAD, PR e CI

Registrados na `estado.md` da branch junto com o resultado da CI do PR #12.

`AGUARDANDO AUDITORIA GPT`
