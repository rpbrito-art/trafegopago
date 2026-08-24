# RELATÓRIO — RODADA 003B — META ASSET DISCOVERY & SELECTION

Executor: Claude Code · Data: 2026-08-24
Mandato: `rodadas/gpt/RODADA_003B_META_ASSET_DISCOVERY_SELECTION.md`
Autorização: `rodadas/gpt/AUTORIZACAO_003B_EXECUCAO.md`
Branch: `claude/rodada-003b-meta-asset-discovery-selection`

Correção aplicada: `rodadas/gpt/CORRECAO_003B_01_FAIL_CLOSED_METADATA_E_MEMBERSHIP.md`

Status: **003B-01 EXECUTADA — AGUARDANDO AUDITORIA GPT — GATE EXTERNO META CONTINUA BLOQUEADO**.

## 1. Preflight

`origin` correto, working tree limpa. `estado.md` da branch anterior estava superado: a `main` já registrava **003A promovida (PR #11 merged)** e a **003B autorizada**. Branch nova criada a partir de `origin/main` (`56c2ca4`) e publicada antes de qualquer mutação.

## 2. Arquivos alterados

| arquivo | papel |
| --- | --- |
| `supabase/migrations/20260824210000_create_meta_asset_selection.sql` | `instagram_accounts`, `ad_accounts`, funções de seleção |
| `src/lib/meta/capabilities.ts` (+test) | capacidade derivada de `granted_scopes` reais |
| `src/lib/meta/assets.ts` (+test) | fronteira única de descoberta/seleção |
| `src/lib/meta/asset-state.ts` | estado dos ativos para a tela |
| `src/app/actions/meta-assets.ts` (+test) | Server Actions de seleção |
| `src/components/meta/meta-assets-section.tsx` (+test) | UX de escolha |
| `src/app/conta/page.tsx`, `src/components/meta/meta-section.tsx` | integração da seção |
| `scripts/sql/meta-assets-003b-proof.sql` | prova de banco |
| `scripts/meta-assets-003b-probe.mjs` | sonda read-only para o E2E do gate |

## 3. Decisões não óbvias

- **FK composta** `(organization_id, meta_connection_id)` contra a nova chave única `meta_connections (organization_id, id)`. Cross-tenant deixa de ser improvável e passa a ser impossível no banco (`DATA_MODEL.md` §16).
- **Grant por coluna**: `external_instagram_account_id`, `external_page_id` e `external_ad_account_id` ficam fora do alcance de `authenticated`. Id externo é chave de chamada à Meta, não dado de tela.
- **`REPLACED` em vez de DELETE**: trocar de conta preserva qual ativo o produto leu em cada período. Índice único parcial garante uma vigente por conexão; índice único `(conexão, external id)` garante idempotência do reenvio.
- **Seleção redescobre antes de gravar**: o browser diz *qual*, o servidor confirma *se pode*. Id inventado ou de outro conjunto falha fechado, sem escrita.
- **Paginação por cursor reconstruído** contra host/base/versão controlados. `paging.next` do provider nunca é seguido — seria deixar um terceiro escolher o destino de um request feito com o token em mãos.
- **`190` não muta nada**: vira `CONNECTION_REJECTED` (estado de tela). A decisão da 003A — `190` genérico não prova revogação — continua valendo.
- **`ads_management` não entra como requisito**. A condição documentada (papel da Página via Business Manager) é hipótese a provar no E2E, não requisito fixo.
- **Ausência de `ads_read` é capacidade inexistente, não erro**: a UI omite o ramo pago em silêncio, sem transformar escolha legítima em pendência.

## 4. Provas

| prova | fonte/comando | resultado |
| --- | --- | --- |
| capacidades, conjuntos exatos, `ads_management` nunca exigido | `vitest run src/lib/meta/capabilities.test.ts` | 12/12 |
| descoberta, paginação, fail-closed, seleção, tenancy | `vitest run src/lib/meta/assets.test.ts` | 39/39 (inclui a 003B-01) |
| UX: estados vazios distintos, ramo pago opcional, sem vocabulário de plataforma | `vitest run src/components/meta/meta-assets-section.test.tsx` | 19/19 |
| fronteira das actions, sem eco de id externo na URL | `vitest run src/app/actions/meta-assets.test.ts` | 7/7 |
| regressão do módulo Meta + actions | `vitest run src/components/meta src/lib/meta src/app/actions` | 255/255 |
| tipos e lint | `npm run typecheck` · `npm run lint` | limpos |
| banco: grants, RLS exercida como `authenticated`, cross-tenant, constraints, idempotência | `supabase db query --file scripts/sql/meta-assets-003b-proof.sql` | **41/41, nenhuma falha** |
| advisors de segurança | MCP Supabase `get_advisors` | nenhum alerta novo pelas tabelas da 003B |

Provas de banco incluídas: membro lê a seleção da própria org e **não** a de outra; browser não escreve (42501); FK composta recusa conexão de outra org (23503); função recusa conexão revogada; reenvio devolve a mesma linha; troca mantém uma única conta vigente e preserva a anterior; ausência de conta de anúncios é estado válido.

## 5. Migration remota

`20260824210000_create_meta_asset_selection.sql` **aplicada** via `supabase db push --linked`, depois de commitada e publicada na branch (checkpoint pré-mutação `bb22710`).

Histórico remoto: **15 migrations**. Tabelas em `public`: **10**, todas com RLS. Nenhuma função `SECURITY DEFINER` nova — as de seleção são `invoker` com `EXECUTE` apenas para `service_role`.

## 5.1 Correção 003B-01

Dois bloqueios da auditoria pré-gate, corrigidos sem tocar em migration, schema, escopo ou configuração Meta.

**Bloqueio A — leitura do IG User falhava aberto.** `lerMetadadosInstagram` colapsava "campo ausente" e "leitura recusada" no mesmo `null`, e o candidato sobrevivia. Agora os dois casos são distintos: HTTP 2xx sem `username`/`name` mantém o candidato com metadata nula; 4xx/5xx, rede quebrada ou corpo ilegível sobem como falha de domínio pela mesma taxonomia do resto da fronteira (`classificarRecusa`, agora em um único lugar), e a descoberta inteira falha fechado. Uma conta ilegível derruba a lista toda em vez de gerar lista parcial — esconder que existe uma conta que o token não alcança apagaria justamente o fato que precisa subir, que é o gate arquitetural do mandato §4.1.

**Bloqueio B — membership só era conferida antes das chamadas externas.** A gravação usa `service_role`, então RLS não a barra. `selectInstagramAccount` e `selectAdAccount` passam a reconferir membership **imediatamente antes** da RPC de seleção, depois do intervalo de duração indeterminada gasto na Meta — o mesmo raciocínio que a 003A aplica no callback OAuth.

| prova | fonte/comando | resultado |
| --- | --- | --- |
| metadata 400/190, 403/10, 403/200, 500, rede, corpo ilegível → fail-closed sem RPC | `vitest run src/lib/meta/assets.test.ts` | 39/39 |
| 2xx com campos ausentes → candidato válido com nulos | idem | passa |
| conta ilegível derruba a lista inteira | idem | passa |
| log da recusa sem token e sem URL | idem | passa |
| membership removida durante a redescoberta → nenhuma RPC (IG e Ads) | idem | passa |
| caminho normal grava, com exatamente duas checagens de membership | idem | passa |

Nada de banco mudou: a prova SQL de §4 continua válida e não foi repetida.

## 6. Gate

**GATE EXTERNO META BLOQUEADO ATÉ A AUDITORIA DA 003B-01.**

Tudo o que podia ser executado autonomamente está executado. O E2E do mandato §7 depende de duas ações que pertencem ao GPT/fundador no painel Meta:

1. criar a nova *business login configuration* da 003B (`Quoron Instagram Dev Login`) com os escopos de §2 — `pages_show_list`, `pages_read_engagement`, `instagram_basic`, `instagram_manage_insights` e `ads_read` opcional — e ativos Pages + Instagram Accounts + Ad Accounts;
2. informar o novo `config_id` (não é segredo) para `META_LOGIN_CONFIG_ID`, e então autorizar o OAuth real.

Depois disso, a sequência pronta para rodar é: OAuth real → tela `/conta` mostra os candidatos → fundador escolhe o Instagram → `node scripts/meta-assets-003b-probe.mjs` executa as sondas read-only de IG User, Insights e ad accounts.

A sonda já sinaliza os dois gates arquiteturais previstos: se o token da conexão não ler o IG User (necessidade de Page Access Token) ou se Insights exigir `ads_management`, o desfecho é `DECISÃO ARQUITETURAL NECESSÁRIA — AGUARDANDO GPT`, sem ampliar permissão nem persistir segredo novo.

## 7. Fora de escopo — confirmado

Nenhuma importação de post, nenhum snapshot de métrica, nenhum Page Access Token pedido ou persistido, nenhuma mutação publicitária, nenhum App ID novo, nenhuma ampliação de escopo, nenhuma mudança para Instagram Login.

## 8. Pendências

As da `main` permanecem: redaction de callback/log, leaked-password protection (WARN nos advisors), SMTP/domínio, ACL residual inerte, App Review/Business Verification.
