# RELATÓRIO — RODADA 004C — OFFER CATALOG + BUSINESS CONTEXT FOUNDATION

Mandato: `rodadas/gpt/RODADA_004C_OFFER_CATALOG_BUSINESS_CONTEXT.md`

Branch: `claude/rodada-004c-offer-catalog-business-context` · base: `main` após promoção da 004B.

Status: **CORREÇÃO 004C-01 EXECUTADA — AGUARDANDO REAUDITORIA GPT**.

Auditoria da 004C: `rodadas/gpt/AUDITORIA_004C_OFFER_CATALOG_BUSINESS_CONTEXT.md` — bloqueada por imutabilidade de versão. Correção: `rodadas/gpt/CORRECAO_004C_01_IMUTABILIDADE_VERSOES_OFERTA.md`, executada nesta mesma branch e registrada na §8 abaixo.

## 1. Preflight

Raiz e remote corretos, working tree limpa, `git fetch` sem pendência. `main` local avançada por fast-forward até `bd32e2a`; branch da rodada criada a partir dela. Nenhum reset, clean ou force-push.

## 2. Delta

### 2.1 Schema — `supabase/migrations/20260825210000_create_business_offers.sql`

- `business_offers`: identidade da oferta (`ACTIVE|ARCHIVED`, `archived_at` coerente com o status, `created_by` com `on delete set null`). Unique `(organization_id, id)` existe para ser alvo da FK composta.
- `business_offer_versions`: conteúdo versionado. FK composta `(organization_id, offer_id)` → `business_offers (organization_id, id)` — é o banco, não a aplicação, que impede versão apontar para oferta de outro tenant.
- Índice único parcial `superseded_at is null` por oferta: no máximo uma versão corrente.
- `..._price_shape` amarra cada `price_mode` a uma forma única de valor; `QUOTE/FREE/NOT_INFORMED` não persistem número. Teto igual ao de `money.ts`.
- Textos: nome obrigatório e não-branco; `description`/`value_proposition` `NULL` ou não-branco, com limites 600/400.
- RLS nas duas tabelas, policy SELECT por membership ACTIVE em organização ACTIVE. `authenticated` só SELECT; `service_role` sem DELETE.
- `save_business_offer` (cria/revisa) e `archive_business_offer`: `security invoker`, `search_path` vazio, EXECUTE só para `service_role`. Autorização lida do banco (owner/admin, organização e membership ACTIVE), advisory lock por organização, idempotência por conteúdo, supersede + insert na mesma transação.

Decisão não óbvia: o lock é **por organização**, não por oferta — mais forte que o exigido, e é o que também cobre a criação, onde ainda não existe oferta para travar. Sem ele, a segunda transação concorrente falharia com `23505` em vez de produzir a próxima versão.

### 2.2 Aplicação

- `src/lib/offers/offers.ts`: taxonomias, rótulos em português, `descreverPreco`, `valorParaCampo` (conversão textual, sem float).
- `src/lib/offers/schemas.ts`: o modo de preço decide o que precisa **e o que não pode** existir; valores dos modos sem número são descartados antes da RPC.
- `src/lib/offers/offer-catalog.ts`: leitura sob RLS pelo cliente do usuário; contexto resolvido por `resolveOrganizationContext()`. Em multi-org o catálogo **não é consultado**.
- `src/app/actions/offers.ts`: identidade de `requireUser()`, tenant do servidor, moeda lida pela RPC. `offerId` é o único dado do formulário e é validado contra a organização resolvida.
- UI: `/ofertas` (`offers-panel`, `offer-form`, `offer-list`) e resumo em `/conta`. Cinco perguntas, campos de dinheiro só quando o modo pede, arquivar com confirmação inline em duas etapas.
- `primary_offer` legado aparece como prefill editável quando não há oferta estruturada; some depois da primeira. Nenhuma conversão automática, nenhuma migration de dados.

### 2.3 Harmonização documental (mandato §10)

Alterados apenas onde havia conflito real: `MVP_CANONICAL.md` §§1–2, `IMPLEMENTATION_ROADMAP.md` (regra de interpretação), `.gpt/PROJECT_PROMPT.md`, `TECHNICAL_SPEC.md` §3.3, e `DATA_MODEL.md` §2 registrando as duas entidades novas. Mídia paga deixa de aparecer como ramo equivalente a capacidades opcionais; `permissão ≠ campanha ≠ aprovação ≠ gasto` preservado.

## 3. Provas

| prova | fonte | resultado |
| --- | --- | --- |
| constraints, versionamento, autorização e RLS remotos | `scripts/sql/business-offers-004c-proof.sql` via `supabase db query --linked` | **51 casos, 51 passaram, 0 falharam** |
| domínio, schema, catálogo, action e UI | `npx vitest run` (arquivos novos + `proxy.test.ts`) | 87/87 nos 6 arquivos afetados |
| tipos | `npx tsc --noEmit` | limpo |
| lint | `npx eslint` | limpo |
| advisors | MCP Supabase, security e performance | zero novo achado do delta |
| suíte completa | CI `32885622248` e `32885781773` no PR #15 | **success**, 864/864, lint/typecheck/Edge Functions/build verdes |

A prova SQL é transacional (`begin … rollback`) e a leitura acontece sob `set local role authenticated`, com `auth.uid()` simulado e consulta **sem filtro de organização** — quem restringe é a policy.

Correção durante a execução: o caso 12 (versão cross-tenant) inicialmente usava `version_no = 1` e disparava a unique de versão **antes** da FK composta — passava sem provar nada. Refeito com `version_no` alto e `superseded_at` preenchido; agora devolve `23503`, a violação de FK pretendida.

Cobertura da prova remota: criação v1, supersede + v2, idempotência de reenvio, uma única versão corrente, cross-tenant por FK e por id na RPC, as 13 formas inválidas de preço/taxonomia/texto, as 5 formas válidas, moeda vinda da organização, coerência `ACTIVE/ARCHIVED`, arquivamento idempotente, oferta arquivada não revisada (`55000`), leitura e escrita por papel/status, e browser sem INSERT/UPDATE/DELETE nem EXECUTE das RPCs.

O item §12.2.12 (multi-organização não escolhe tenant implicitamente) é da aplicação, não do SQL: provado em `src/app/actions/offers.test.ts` e `src/lib/offers/offer-catalog.test.ts` — com duas memberships, nenhuma RPC é chamada e o catálogo não é consultado.

## 4. Supabase remoto

Migration aplicada: `20260825210000_create_business_offers`. Publicada na branch antes do `db push`.

Snapshot independente pós-aplicação: RLS habilitado nas duas tabelas; uma policy SELECT em cada; `anon` sem grants; `authenticated` somente SELECT; `service_role` SELECT/INSERT/UPDATE e sem DELETE; RPCs com EXECUTE apenas para `postgres` e `service_role`; **zero fixtures residuais** (ofertas, versões, organizações e usuários de fixture em 0).

Advisors: nenhuma FK do delta sem índice de cobertura. Aparecem dois INFO `unused_index` (`business_offers_created_by_idx`, `business_offer_versions_created_by_idx`) — esperado em tabela recém-criada e vazia; não remover pelo mesmo raciocínio já registrado na 004A.

## 5. Fora de escopo — não feito

Sem vínculo `offer_id` em `growth_objectives`, sem SKU/estoque/pedido, sem personas, sem seletor multi-organização, sem Meta e sem provider real de IA. Nenhuma migration antiga reescrita.

## 6. Observação para a auditoria

`growth_objectives`, promovida na 004B, não consta em `DATA_MODEL.md`. A lacuna é anterior a esta rodada e o mandato §10 delimitou o que registrar; não foi ampliada por conta própria.

## 7. Correção 004C-01 — imutabilidade das versões

### 7.1 Defeito

O histórico dependia da disciplina de quem chamava: `service_role` tinha `UPDATE` amplo em `business_offer_versions` e nenhuma guarda no banco impedia reescrever `name`, preço, moeda, `version_no` ou tenant de uma versão já criada, sem criar versão nova.

### 7.2 Delta — `supabase/migrations/20260825220000_enforce_offer_version_immutability.sql`

Aditiva; a migration `20260825210000` não foi tocada.

- `revoke update` de tabela para `service_role`, seguido de `grant update (superseded_at)` — o papel da aplicação escreve exatamente a única coluna que o fluxo normal altera;
- trigger `business_offer_versions_immutable` (`before update … for each row`): recusa qualquer UPDATE em versão já superseded, qualquer UPDATE que deixe `superseded_at` nulo, e qualquer alteração de conteúdo mesmo quando acompanhada do arquivamento.

Duas camadas de propósito: privilégio não alcança o dono do banco, e é a trigger que faz a invariante valer para quem ignora grants.

A comparação de conteúdo é da linha inteira via `to_jsonb` com `superseded_at` neutralizado nos dois lados, e não campo a campo. Campo a campo seria mais legível e mais frágil: uma coluna acrescentada depois nasceria fora da guarda, e o esquecimento só apareceria quando alguém reescrevesse histórico.

Nada de UI, taxonomia, preço, Meta, IA ou `growth_objectives` foi alterado.

### 7.3 Provas da correção

`scripts/sql/business-offer-versions-immutability-004c01-proof.sql` → **25 casos, 25 passaram, 0 falharam**, transacional com rollback.

Cobre: fluxo normal intacto (v1, supersede + v2, idempotência, conteúdo de v1 preservado); `service_role` recusado com `42501` ao alterar nome, preço/moeda, tenant/oferta/`version_no` e conteúdo de versão superseded; dono do banco recusado com `55000` nos mesmos casos, mais reativação de superseded, alteração junto do arquivamento e UPDATE que não arquiva; a transição permitida continua funcionando para os dois papéis; e a fronteira do browser inalterada — `anon` sem grants, `authenticated` só SELECT, RLS ativa, duas policies.

Regressão: `scripts/sql/business-offers-004c-proof.sql` reexecutado após a mudança → **51/51**, sem falhas. Reexecutado por ter sido alterado um primitive compartilhado (grants e gatilho da tabela), não por ritual.

Pós-estado remoto: trigger habilitada; `service_role` sem UPDATE de tabela e com UPDATE apenas de `superseded_at`; `business_offers` inalterada; função da trigger sem EXECUTE para `anon`/`authenticated`; zero fixtures residuais. Advisors idênticos ao baseline.

## 8. Handoff

Branch `claude/rodada-004c-offer-catalog-business-context`, HEAD publicado em `origin`. PR #15 mantido **aberto, draft, base `main`, não mergeado**.

Branch atualizada com a `main` documental por merge, preservando o delta da 004C; o único conflito foi `estado.md`, resolvido pela versão da `main`, que é o estado soberano.

Migrations aplicadas nesta branch, nenhuma reescrita:

- `20260825210000_create_business_offers` (004C);
- `20260825220000_enforce_offer_version_immutability` (004C-01).

CI verde em cada etapa: `32885622248` e `32885781773` (004C), `32885900669` (HEAD auditado) e `32887912322` (correção 004C-01) — 864/864 testes, lint, typecheck, Edge Functions e build.

`estado.md` da branch em **CORREÇÃO 004C-01 EXECUTADA — AGUARDANDO REAUDITORIA GPT**. Working tree limpa.

Nenhuma pendência técnica. Próximo ator: **GPT auditor**, para reauditoria.
