# RELATÓRIO — INVESTIGAÇÃO 003B-05: `/me/accounts` vazio com User Access Token

Mandato: `rodadas/gpt/INVESTIGACAO_003B_05_PAGE_ZERO_GRANULAR_SCOPES.md`
Branch: `claude/rodada-003b-meta-asset-discovery-selection`
Natureza: **investigação read-only**. Nenhuma mutação, nenhum OAuth, nenhuma alteração de escopo, código de produto intocado.

## 1. Sonda executada

`scripts/meta-user-token-page-zero-probe.mjs` — commitada antes de rodar.

Lê a conexão ACTIVE e o token pelo caminho server-side existente (`read_meta_connection_token`, `service_role`), chama a Graph API `v26.0` com o token no header `Authorization`, nunca na URL. Não imprime token, App Secret, App Token, URL nem `message` da Meta.

Comando: `node scripts/meta-user-token-page-zero-probe.mjs`

Conexão inspecionada: `655da6e6-9056-456d-a81d-5e2570da5faf`, ACTIVE, token de 360 caracteres presente no Vault.

## 2. Resultados

### A. `debug_token` — HTTP 200

| campo | valor |
| --- | --- |
| `is_valid` | `true` |
| `type` | `USER` |
| `matches_current_app` | `true` |
| `user_id` | `28050226117920563` |
| `expires_at` | `1792839788` |
| `data_access_expires_at` | `1795431788` |
| `scopes` | `pages_show_list`, `ads_read`, `instagram_basic`, `instagram_manage_insights`, `pages_read_engagement`, `public_profile` |

`granular_scopes`: **5 entradas, todas sem `target_ids`**.

- `pages_show_list` — `target_ids` ausente
- `ads_read` — `target_ids` ausente
- `instagram_basic` — `target_ids` ausente
- `instagram_manage_insights` — `target_ids` ausente
- `pages_read_engagement` — `target_ids` ausente

Nenhum alvo reconhecível para Page ou Instagram aparece na concessão.

### B. Identidade — HTTP 200

`id` = `28050226117920563`, `name` = `Rafael Pereira Brito`. Bate com `external_user_id` da conexão.

### C. `/me/accounts` — as duas variações, HTTP 200, zero itens

| chamada | HTTP | itens | `paging` |
| --- | --- | --- | --- |
| `fields=id,name,tasks` | 200 | **0** | ausente |
| `fields=id,name,tasks,instagram_business_account` | 200 | **0** | ausente |

Sem erro, sem `paging`, lista vazia nas duas.

### D. `/me/adaccounts` — HTTP 200, **3 itens**

| id | name | account_status |
| --- | --- | --- |
| `act_203057539730795` | Rafael Pereira Brito | 1 |
| `act_1051375372322456` | 1 | 2 |
| `act_263815755779613` | 1 | 1 |

## 3. Conclusão factual

1. O token está íntegro: válido, tipo `USER`, do app corrente, com os seis escopos esperados e ainda dentro da validade. O vazio **não** é token expirado, revogado, de outro app nem de outra identidade.
2. A identidade do token é a mesma que o fundador comprovou ter **Acesso total** à Página Quoron.
3. O vazio **nasce no próprio edge `/me/accounts`**, não na expansão `instagram_business_account`: retirar o campo não muda nada. A hipótese de que a expansão do Instagram derrubava o item está **REPROVADA**.
4. `/me/accounts` responde **HTTP 200 com `data` vazio** — não é erro de permissão (`code`/`subcode`) nem paginação truncada.
5. O mesmo token **enxerga outros ativos Meta**: `ads_read` devolveu 3 contas de anúncio. Logo, o token não está globalmente cego; a cegueira é específica de Pages.
6. Nenhuma permissão chegou com `target_ids`. Para as permissões que suportam concessão por ativo, a concessão veio **sem nenhum alvo declarado** — não há Página nem conta Instagram vinculada ao consentimento.

Fato adicional que qualifica o item 6 e que **não resolvo sozinho**: `ads_read` também veio sem `target_ids` e mesmo assim `/me/adaccounts` devolveu 3 itens. Portanto "sem `target_ids`" e "sem acesso ao ativo" **não são equivalentes** em todos os edges, e as duas leituras abaixo continuam abertas com a evidência disponível:

- **(i)** a concessão realmente não vinculou nenhuma Página ao app — coerente com `Ativos` estar indisponível por desenho na configuração USER `Quoron E2E Login` (`estado.md` §5), o que faria o consentimento passar sem a etapa de seleção de ativos;
- **(ii)** o edge `/me/accounts` exige, para este app/portfólio, um vínculo Página↔app que `pages_show_list` sozinho não estabelece, enquanto `/me/adaccounts` é resolvido por relação direta do perfil com as contas de anúncio.

Distinguir (i) de (ii) implica escolher entre caminhos de integração materialmente diferentes — reintroduzir seleção de ativos na configuração, voltar ao BISU com portfólio proprietário, ou ampliar escopo. Isso é decisão de arquitetura, não de execução.

`DECISÃO ARQUITETURAL NECESSÁRIA — AGUARDANDO GPT`

## 4. Invariantes preservadas

- Nenhuma escrita no Supabase; nenhuma tabela de produto tocada.
- `.env.local` intocado; nenhum novo OAuth; nenhum token revogado ou desconectado.
- Nenhum escopo adicionado; nada alterado no painel Meta; acesso da Página Quoron intocado.
- Nenhum Page Access Token pedido ou persistido.
- Nenhum código de produto editado — o delta é só a sonda em `scripts/`.
- Nenhum segredo impresso, logado ou commitado.
