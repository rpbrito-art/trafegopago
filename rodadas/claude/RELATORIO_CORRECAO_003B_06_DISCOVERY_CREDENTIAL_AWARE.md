# RELATÓRIO — CORREÇÃO 003B-06: descoberta sensível ao tipo de credencial

Mandato: `rodadas/gpt/CORRECAO_003B_06_DISCOVERY_CREDENTIAL_AWARE.md`
Branch: `claude/rodada-003b-meta-asset-discovery-selection`

## 1. Mecanismo confirmado por fonte oficial

| classe | edge de Pages | fonte |
| --- | --- | --- |
| **USER** | `GET /me/accounts` | caminho já vigente do Instagram API with Facebook Login; preservado sem alteração |
| **BISU / System User** | `GET /{system-user-id}/assigned_pages` | Graph API Reference — nós **System User** e **Business User** |

Evidência consultada durante a implementação:

- `developers.facebook.com/docs/marketing-api/reference/system-user/` — o nó System User lista quatro edges, entre eles **`assigned_pages`** ("pages assigned to the user"), ao lado de `assigned_business_asset_groups`, `assigned_product_catalogs` e `assigned_whatsapp_business_accounts`;
- `developers.facebook.com/docs/marketing-api/reference/business-user/` — o mesmo edge `assigned_pages` no Business User, descrito como "Pages that are assigned to this business scoped user";
- `developers.facebook.com/docs/marketing-api/reference/business-user/assigned_pages/` — a referência do edge: sem parâmetros próprios, resposta `data`/`paging`/`summary` com **nós Page** acrescidos de `tasks` e `permitted_tasks`; erros comuns `190`, `100`, `200`.

Nenhum endpoint foi inventado. O que a documentação **não** declara explicitamente é a lista de permissões exigidas pelo edge — isso está registrado em §6 como limitação, não suprido por suposição.

## 2. Arquivos alterados

| arquivo | delta |
| --- | --- |
| `src/lib/meta/credential.ts` | **novo** — classificação centralizada, read-only, fail-closed |
| `src/lib/meta/gateway.ts` | passa a consumir o módulo; classificação local removida (−120 linhas) |
| `src/lib/meta/assets.ts` | descoberta de Pages agora escolhe o edge pela classe da credencial |
| `src/lib/meta/assets.test.ts` | +19 provas do roteamento e da identidade |

Nenhuma migration, nenhuma coluna nova, nenhuma alteração de RPC, nenhum componente de UI tocado.

## 3. Como a classificação foi centralizada

`classificarCredencial` vivia dentro de `gateway.ts`, privada. Foi **extraída** para `credential.ts` como `classifyCredential`, com a mesma semântica — não uma segunda cópia mais fraca em `assets.ts` (§4.1).

Preservado integralmente: `client_business_id` presente e não vazio é a única prova de BISU; presente-mas-inválido falha fechado; ausência exige identidade positiva e coerente com a persistida. `debug_token.type` continua **não** sendo aceito como prova, e `external_business_id` não é usado como proxy.

Adicionado apenas o que faltava: a classificação agora devolve o `subjectId` que a própria Meta atribui ao token. É ele — não o que está no banco — que ancora `assigned_pages`. A requisição externa segue idêntica à auditada na 003A (`fields=client_business_id`); `id` já vinha por padrão e o ramo de usuário comum sempre dependeu disso.

`FalhaExterna` e `descreverFalha` do gateway passaram a apontar para `CredentialFailure`/`describeExternalFailure` do módulo, sem duplicar formato de erro.

### Decisões fail-closed no ramo BISU

- classificação inconclusiva **não consulta edge nenhum** — sem saber o que é a credencial, uma lista vazia obtida por chute é indistinguível de uma lista vazia verdadeira;
- BISU sem `subjectId` **não** cai de volta em `/me/accounts`: esse fallback reintroduziria exatamente o defeito removido;
- `subjectId` divergente do `external_user_id` persistido falha fechado, mesma disciplina que o ramo de usuário comum já aplicava.

Ads não foi tocado (§4.5): `ads_read` permanece em `/me/adaccounts`, read-only e independente.

## 4. Provas

`npx vitest run src/lib/meta src/lib/actions src/components/meta` → **228/228**, sendo `assets.test.ts` **58/58** (39 antes, 19 novas).

As novas provam: USER roteia para `/me/accounts`; BISU roteia para `/{system-user-id}/assigned_pages` e **nunca** toca `/me/accounts`; a classe é decidida **antes** de qualquer edge; a decisão não consulta `debug_token` nem `external_business_id`; `client_business_id` vazio, corpo sem identidade, recusa `190` e falha de rede **não consultam edge algum**; BISU sem identidade não faz fallback; identidade divergente falha fechado nos dois ramos; `assigned_pages` respeita cursor reconstruído contra host/versão controlados, teto de 5 páginas e ignora `paging.next` do provider; Page sem IG é estado vazio, não erro; múltiplas Pages viram candidatos; a seleção redescobre pelo mesmo caminho credential-aware e grava a Page correta; id de outra conexão continua `ASSET_NOT_FOUND`; Ads não muda de edge.

`npx tsc --noEmit` → limpo. `npm run lint` → limpo.

## 5. Invariantes preservadas (§5)

Membership antes de conexão/token e reconferida antes da escrita; token só server-side/Vault, nunca retornado nem logado; `paging.next` nunca seguido — paginação reconstruída contra host/versão controlados nos **dois** edges; seleção redescobre e revalida antes de persistir; id arbitrário fail-closed; `190` continua sendo estado de tela e não muta conexão; candidatos não são persistidos por descoberta; logs sem token, URL ou `message`.

## 6. Limitações restantes

1. **O edge BISU não foi exercitado contra a Meta real.** A conexão viva é USER, e o mandato proíbe novo OAuth e alteração de configuração. A prova é documental (§1) e por teste; a prova E2E depende de um BISU ativo.
2. **A documentação oficial não declara as permissões exigidas por `assigned_pages`.** Se na prática o edge exigir `business_management`, isso aparecerá como recusa `10`/`200` → `MISSING_PERMISSION`. Nenhum escopo foi adicionado por tentativa, como manda §7.
3. Os campos pedidos ao edge (`id,name,instagram_business_account`) são campos de nó Page, e a referência descreve o retorno como nós Page — mas a expansão do Instagram nesse edge não foi verificada contra a API real, pelo mesmo motivo do item 1.
4. O caso real Quoron continua com `/me/accounts` devolvendo zero para credencial USER. Esta correção **não** promete resolvê-lo: ela remove a confusão entre classes de credencial. Nada aqui mascara o zero com ID fixo (§4.2).

`AGUARDANDO AUDITORIA GPT`
