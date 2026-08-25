# RELATÓRIO — COMPLEMENTO 003B-05: prova direta da Page Quoron

Mandato: `rodadas/gpt/COMPLEMENTO_003B_05_PAGE_DIRECT_READONLY.md`
Branch: `claude/rodada-003b-meta-asset-discovery-selection`
Natureza: **complementação read-only mínima**. Só as duas chamadas autorizadas; `debug_token`, `/me`, `/me/accounts` e `/me/adaccounts` **não** foram repetidos.

## 1. Sonda

`scripts/meta-page-direct-003b-05-probe.mjs` — commitada antes de rodar.

Mesmo caminho server-side da investigação anterior: conexão ACTIVE `655da6e6-9056-456d-a81d-5e2570da5faf`, token lido por `read_meta_connection_token` (`service_role`), Graph API `v26.0`, token no header `Authorization` e nunca na URL. Não imprime token, secret, URL nem `message` da Meta.

Comando: `node scripts/meta-page-direct-003b-05-probe.mjs`

## 2. Resultados

### 1. `GET /1356474050873300?fields=id,name` — **HTTP 200**

| campo | valor |
| --- | --- |
| `id` | `1356474050873300` |
| `name` | `Quoron` |

### 2. `GET /1356474050873300?fields=id,name,instagram_business_account` — **HTTP 200**

| campo | valor |
| --- | --- |
| `id` | `1356474050873300` |
| `name` | `Quoron` |
| `instagram_business_account.id` | **`17841429590351285`** |

Nenhum erro nas duas chamadas — nada de `code`/`error_subcode`/`type` a registrar.

## 3. Conclusão factual

A alternativa **1** do mandato — "o User Access Token não consegue ler diretamente o objeto Page Quoron" — está **REPROVADA**.

O que ficou provado:

1. o token corrente **lê a Page Quoron diretamente**, por ID, em HTTP 200, e recebe o `name` correto;
2. o mesmo token **resolve a conta profissional vinculada à Page**: `instagram_business_account.id = 17841429590351285` — o vínculo Página↔Instagram existe e é visível para este token;
3. portanto o problema está **isolado no edge `/me/accounts`**, que não enumera uma Page que o próprio token lê e cuja conta Instagram ele resolve.

Confirma-se a alternativa **2**: o token lê a Page; `/me/accounts` é que não a lista.

O que este complemento **não** determina, e que segue sendo escolha de arquitetura: por que a enumeração falha e qual caminho adotar (configuração com seleção de ativos, retorno ao BISU com portfólio proprietário, descoberta por ID conhecido em vez de `/me/accounts`, ou outro). Nenhuma dessas opções foi testada aqui, e nenhuma é decisão de execução.

`DECISÃO ARQUITETURAL NECESSÁRIA — AGUARDANDO GPT`

## 4. Invariantes preservadas

- Somente as duas chamadas autorizadas; nenhuma prova anterior repetida.
- Nenhuma escrita no Supabase; nenhuma tabela de produto tocada.
- `.env.local` intocado; nenhum OAuth; nenhum token revogado ou desconectado.
- Nenhum escopo adicionado; nada alterado no painel Meta; acesso da Page intocado.
- Nenhum Page Access Token pedido, impresso ou persistido.
- Nenhum código de produto editado — o delta é só a sonda em `scripts/`.
- Nenhum segredo impresso, logado ou commitado.
