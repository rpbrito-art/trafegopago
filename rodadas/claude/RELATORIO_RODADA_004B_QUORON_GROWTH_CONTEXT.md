# RELATÓRIO — RODADA 004B: Quoron Branding + Growth Context Foundation

Mandato: `rodadas/gpt/RODADA_004B_QUORON_GROWTH_CONTEXT.md`
Branch: `claude/rodada-004b-quoron-growth-context`, criada a partir da `main` (`2ad38c1`)

## 1. Branding Quoron

Marca por **constante compartilhada** (`src/lib/brand.ts`), não literais espalhados: `APP_NAME` e `pageTitle()`. Migrados metadata raiz, as sete páginas com título próprio, `auth-shell`, a instrução de remoção externa da Meta e o pacote (`package.json` + lockfile → `quoron`).

Home reescrita: saiu `Rodada 001B — Auth real` — informação de quem constrói, não de quem contrata — e saiu a afirmação de que "nenhuma funcionalidade de domínio foi implementada". Entrou o propósito em linguagem de negócio, sem prometer campanha, anúncio ou automação inexistentes.

Documentação ativa migrada em 12 arquivos: `README.md`, `CLAUDE.md`, `.gpt/PROJECT_PROMPT.md`, os quatro canônicos de produto e os cinco de arquitetura.

**Duas ocorrências foram deliberadamente preservadas**: em `GROWTH_INTELLIGENCE_CANONICAL.md` §19 e `PAID_MEDIA_CANONICAL.md` §7, `tráfego pago` em minúsculas é o **conceito** de mídia paga, não a marca. Substituí-las teria corrompido o sentido. Rodadas, relatórios, auditorias e migrations antigas ficaram intocados, assim como repo, pasta local e project ref.

## 2. Onboarding progressivo

O primeiro formulário passou de dez campos para **quatro**: nome, segmento, cidade/região e oferta principal.

Migration aditiva: `target_audience` e `acquisition_goal` passam a aceitar `NULL`. Os `CHECK ..._not_blank` não precisaram mudar — `btrim(null) <> ''` avalia para NULL, e CHECK com NULL é satisfeito; eles seguem recusando `''` e passam a tolerar ausência.

Nenhum dado existente foi apagado ou convertido. `acquisition_goal` permanece como **contexto livre legado** e não foi migrado para objetivo estruturado: fazê-lo transformaria texto ambíguo em fato declarado.

`schemas.ts` separou `createInitialBusinessSchema` de `progressiveBusinessContextSchema` — são momentos diferentes do produto, e juntá-los reintroduziria a tentação de pedir tudo de uma vez. A action lê só os quatro campos e passa `NULL` ao resto; campos progressivos forçados no POST não alcançam a RPC.

Depois do bootstrap, o destino é `/objetivo`, não `/conta`.

## 3. growth_objectives

Entidade própria, sem inflar `business_profiles`. No máximo **um `ACTIVE` por organização**, garantido por índice único parcial — não por código de aplicação. `ARCHIVED` exige `archived_at`; `ACTIVE` o proíbe. Detalhe em branco e acima de 280 caracteres recusados. Sem DELETE no fluxo normal.

`set_active_growth_objective` arquiva o anterior e insere o novo **na mesma transação**, serializada por advisory lock por organização. Autorização lida do banco: organização `ACTIVE`, membership `ACTIVE`, papel `owner`/`admin`. `p_user_id` vem de `getClaims()`; a organização é resolvida server-side a partir da membership — aceitar `organizationId` do formulário entregaria a chave do tenant a quem envia o POST.

Reenvio idêntico é **idempotente**: devolve o objetivo vigente. Sem isso, um duplo clique produziria duas linhas iguais e um "histórico" de mudanças que não houve.

Browser tem apenas `SELECT`, sob policy de membership `ACTIVE` em organização `ACTIVE`. Sem grant de escrita, nenhuma policy de escrita poderia sequer ser exercida. A RPC não é executável por `anon`/`authenticated`.

## 4. Experiência

Rota protegida `/objetivo` com três perguntas em português; resumo e CTA em `/conta`.

Nenhum enum, UUID, campaign objective, pixel, ad set, placement ou termo de API aparece na tela — as chaves vivem só no `value` dos rádios. Em `OTHER`, mostra-se o que a pessoa escreveu: é justamente aí que o texto dela é a única descrição fiel.

Ausência de objetivo é **estado válido** que orienta o próximo passo e não bloqueia conta nem conexão Meta. Quem não administra vê o estado, mas não a ação — e a autorização real continua na RPC, porque esconder não é autorizar.

**Resultado desejado ≠ observabilidade**: a tela diz que o Quoron indicará até onde consegue medir conforme as conexões forem configuradas. Nada afirma conversão ou atribuição disponível.

## 5. Provas

`npx vitest run` → **766/766** (33 arquivos). Novos: taxonomias 10, seção de objetivo 13, Home 6, action de bootstrap +2.

Cobrem os itens do §11: bootstrap com quatro campos; progressivos ausentes viram `NULL`, não string vazia; campos injetados no POST não chegam à RPC; próximo passo é o objetivo; todo rótulo existe e nenhum usa termo de plataforma; taxonomia desconhecida recusada; nenhuma chave interna ou UUID na tela; estado vazio com CTA; quem não administra não recebe a ação; Home sem estágio de rodada e sem promessa falsa.

`tsc --noEmit`, `npm run lint` e `npm run typecheck:functions` → limpos.

## 6. Aplicação remota e prova SQL

Duas migrations aplicadas: `20260825180000_create_growth_objectives.sql` e `20260825190000_index_growth_objectives_created_by.sql`.

`npx supabase db query --linked --file scripts/sql/growth-objectives-004b-proof.sql` → **29 casos, 29 passaram, 0 falharam**, transacional com `rollback`.

Entre eles: perfil sem público/objetivo aceito e string vazia ainda recusada; owner e admin definem/alteram, member comum, usuário de outra organização e organização inativa recebem `42501`; um único `ACTIVE`; alteração arquiva o anterior e preserva histórico; reenvio idêntico devolve o mesmo id sem inflar histórico; segundo `ACTIVE` por escrita direta recusado (`23505`); todas as invariantes de estado e taxonomia recusadas quando violadas; membro lê só a própria organização, outra organização vê zero, membership `INACTIVE` não lê; browser sem escrita, `anon` sem grant, RLS habilitado, nenhuma policy de escrita, RPC não executável pelo browser; quatro índices de FK criados.

Resíduo após rollback: zero objetivos, zero organizações de fixture, zero usuários de fixture; a organização real permanece intacta.

## 7. Advisors

**Os quatro INFO de FK de `ai_runs` da 004A foram resolvidos** — não aparecem mais em `unindexed_foreign_keys`.

`growth_objectives_created_by_fkey` apareceu como INFO novo, introduzido por esta rodada, e foi quitado na migration `20260825190000`.

Permanecem, **fora do escopo por decisão do mandato §10**: quatro INFO de FK em `ad_accounts`, `instagram_accounts` e `meta_oauth_intents` — dívida da trilha Meta/003B, que o mandato manda não absorver.

Os `unused_index` em `ai_runs`, `ai_models` e `ai_price_versions` não foram removidos: numa tabela recém-criada e vazia, "não usado" significa "ainda não houve consulta", não "desnecessário".

Segurança: apenas os INFO `rls_enabled_no_policy` das tabelas internas server-only — que é o contrato deliberado desde a 002A — e o WARN antigo de leaked password protection, pendência já registrada.

## 8. Fora de escopo, não tocado

Repo, pasta local, project ref e recursos Meta não renomeados. Sem importação Instagram, provider real de IA, API key, SDK, chamada paga, IA inferindo objetivo, geração de conteúdo, campanha, anúncio, gasto, Financial Approval, CRM ou App Shell. Nenhum segredo novo. A 003B segue estacionada.

`AGUARDANDO AUDITORIA GPT`
