# RELATÓRIO — COMPLEMENTO 003B-05: IG User + Insights diretos

Mandato: `rodadas/gpt/COMPLEMENTO_003B_05_IG_DIRECT_INSIGHTS_READONLY.md`
Branch: `claude/rodada-003b-meta-asset-discovery-selection`
Natureza: **complementação diagnóstica read-only**. Só as duas chamadas autorizadas; `debug_token`, `/me`, `/me/accounts`, `/me/adaccounts` e a prova direta da Page **não** foram repetidos.

## 1. Sonda

`scripts/meta-ig-direct-003b-05-probe.mjs` — commitada antes de rodar.

Conexão ACTIVE `655da6e6-9056-456d-a81d-5e2570da5faf`, token lido por `read_meta_connection_token` (`service_role`), Graph API `v26.0`, token no header `Authorization` e nunca na URL. Não imprime token, secret, URL nem `message` da Meta.

Comando: `node scripts/meta-ig-direct-003b-05-probe.mjs`

IG User `17841429590351285` usado como **fixture diagnóstica** — não como mecanismo de descoberta.

## 2. Resultados

### A. `GET /17841429590351285?fields=id,username,media_count,followers_count` — **HTTP 200**

| campo | valor |
| --- | --- |
| `id` | `17841429590351285` |
| `username` | `goquoron` |
| `media_count` | `9` |
| `followers_count` | `0` |

### B. `GET /17841429590351285/insights?metric=reach&period=day` — **HTTP 200**

| campo | valor |
| --- | --- |
| métricas retornadas | **1** |
| métrica | `name=reach`, `period=day`, 2 pontos na série |

Nenhum erro nas duas chamadas — nada de `code`/`error_subcode`/`type` a registrar.

## 3. Conclusão factual

1. O User Access Token corrente **lê diretamente o IG User** `@goquoron` e recebe metadados reais (`media_count=9`).
2. O mesmo token **executa a capacidade mínima de Insights**: `reach`/`day` responde HTTP 200 com série de 2 pontos.
3. Isso acontece com os escopos já concedidos, **sem** `ads_management`, **sem** `business_management` e **sem** Page Access Token. A condição registrada na documentação Meta — de que certos arranjos via Business Manager exigiriam `ads_management` + `ads_read` — **não se manifestou** neste arranjo: nenhuma das duas chamadas foi recusada por falta de escopo.
4. Somando às provas anteriores: com este token, leitura da Page, resolução do IG vinculado, leitura do IG User e Insights **todas funcionam**. O único ponto quebrado continua sendo a **enumeração em `/me/accounts`**.

Fora do escopo desta sonda, e portanto não determinado aqui: qual mecanismo de descoberta genérica substitui `/me/accounts`. O ID usado foi fixture; nada neste complemento sustenta descoberta por ID fixo, entrada manual de ID pelo cliente, ampliação de escopo por tentativa ou adoção do USER como arquitetura canônica. `followers_count=0` é fato registrado, não avaliado.

`AGUARDANDO AUDITORIA GPT`

## 4. Invariantes preservadas

- Somente as duas chamadas autorizadas; nenhuma prova anterior repetida.
- Nenhuma escrita no Supabase; nenhum Instagram ou Ad Account persistido.
- `.env.local` intocado; nenhum OAuth; nenhum token revogado ou desconectado.
- Nenhum escopo adicionado; nada alterado na configuração Meta.
- Nenhum Page Access Token pedido, impresso ou persistido.
- Nenhum conteúdo importado; Fase 4 não iniciada.
- Nenhum código de produto editado — o delta é só a sonda em `scripts/`.
- Nenhum segredo impresso, logado ou commitado.
