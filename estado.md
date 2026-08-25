# ESTADO — Tráfego Pago

Atualizado: 2026-08-25

Estado incorporado = `main + este arquivo + promoção real`.

## 1. Ambiente

- repo: `rpbrito-art/trafegopago`
- Supabase project ref: `cbnxdoxpyioxjwgjhbtq`
- pasta local esperada: `C:\Users\rpbri\Documents\trafegopago`
- `business-weaver`: fora de escopo

## 2. Estado incorporado

Promovidas: **000–003A**.

- Fase 1 — Supabase, Auth e Tenancy: **ENCERRADA**.
- Fase 2 — Operations, Audit, Queues e Segurança Base: **ENCERRADA**.
- Fase 3 — Meta Connection Foundation: **EM ANDAMENTO**.
- última rodada promovida: **003A — Meta Connection Foundation**.
- PR #11: MERGED.
- merge 003A: `546838db8e7ced4e9045c05feb8c7b2f0c476cc2`.
- CI final 003A: `32772710738` — verde.

003A está **EXECUTADA, AUDITADA E PROMOVIDA**. Permanecem canônicos: Facebook Login for Business + Graph API v26.0; token Meta server-side no Vault; OAuth `state` de uso único; membership reconferida; suporte/classificação de BISU; desconexão segura.

## 3. Rodada 003B — EM EXECUÇÃO, NÃO PROMOVIDA

Mandato: `rodadas/gpt/RODADA_003B_META_ASSET_DISCOVERY_SELECTION.md`

Autorização original: `rodadas/gpt/AUTORIZACAO_003B_EXECUCAO.md`

Branch: `claude/rodada-003b-meta-asset-discovery-selection`

PR: **#12 draft**.

HEAD auditado do código de produto antes das sondas diagnósticas: `872d777a929f4be12567d9a7b9e9fa89bac00dfb`.

CI auditada: `32792662569` — verde.

Já executado/auditado:

- migration `20260824210000_create_meta_asset_selection.sql` aplicada;
- remoto com 15 migrations;
- `instagram_accounts` e `ad_accounts` presentes;
- descoberta/seleção, capabilities e UX implementadas;
- Correção 003B-01 fail-closed metadata + membership: **EXECUTADA, AUDITADA E APROVADA**;
- Correção 003B-03 reautorização de conexão ativa: **EXECUTADA, AUDITADA E APROVADA**;
- investigação 003B-05 de token/Pages/Ads: **EXECUTADA E AUDITADA**;
- complemento de leitura direta da Page: **EXECUTADO, AUDITADO E APROVADO COMO EVIDÊNCIA READ-ONLY**.

003B continua **NÃO PROMOVIDA**.

## 4. Produto — mídia paga

Canônico: `docs/01-produto/PAID_MEDIA_CANONICAL.md`.

Mídia paga é pilar central da proposta de crescimento; orgânico também entrega valor. Permissão Ads não equivale a criar campanha/gastar. Gasto exige aprovação humana explícita, comando de domínio, idempotência e auditoria.

Antes da próxima rodada substantiva pós-003B, harmonizar formulações antigas conflitantes em `.gpt/PROJECT_PROMPT.md`, `GROWTH_INTELLIGENCE_CANONICAL.md`, `MVP_CANONICAL.md`, `IMPLEMENTATION_ROADMAP.md` e demais canônicos afetados, sem rodada só de housekeeping.

## 5. Configuração Meta vigente no experimento

### Baseline BISU anterior

- app: **Trafego Pago Business Dev** — App ID `2940404272985831`;
- `Quoron Instagram Dev Login` — Configuration ID `38307908848822330`;
- System-user access token / BISU;
- Pages + Instagram Accounts.

Configuração histórica 003A ainda não apagar:

- `Trafego Pago Dev Login` — Configuration ID `1549901823029730`.

### App E2E USER atual

- app: **Trafego Pago E2E Test**;
- criado sem Business Portfolio;
- Instagram em **API setup with Facebook login**;
- Facebook Login for Business disponível;
- configuração **Quoron E2E Login**;
- Configuration ID **`1068370819137366`**;
- token: **User Access Token**;
- `Ativos` indisponível por desenho no modo USER;
- redirect: `http://localhost:3000/meta/callback`;
- `.env.local` temporariamente aponta para o app E2E;
- App Secret nunca pode ir para chat/log/commit.

Ativos reais:

- Página Facebook **Quoron** — ID **`1356474050873300`**;
- Instagram profissional **@goquoron** — ID **`17841429590351285`**.

## 6. Conexão real atual — PÓS-OAUTH USER

Conexão `655da6e6-9056-456d-a81d-5e2570da5faf`:

- status ACTIVE;
- token presente no Vault;
- `connected_at`: `2026-08-25 11:03:11.366473+00`;
- expira `2026-10-24 11:03:08.745+00`;
- `external_user_id`: `28050226117920563`;
- `external_business_id`: null;
- scopes efetivamente concedidos:
  - `pages_show_list`
  - `pages_read_engagement`
  - `instagram_basic`
  - `instagram_manage_insights`
  - `ads_read`
  - `public_profile`
- `instagram_accounts`: 0;
- `ad_accounts`: 0.

O GPT reconfirmou no Supabase após o complemento que a conexão permanece ACTIVE, com os mesmos scopes e identidade, e sem seleção persistida.

## 7. Evidência 003B-05 — USER Token

### 7.1 BISU: portfólio dono do app não pode ser cliente

No fluxo BISU, Quoron apareceu desabilitado com `This Meta Business Account owns the app`.

Gate: `rodadas/gpt/GATE_003B_PORTFOLIO_DONO_DO_APP_NAO_ELEGIVEL_COMO_CLIENTE.md`.

### 7.2 App sem portfólio + BISU

`rodadas/gpt/RESULTADO_003B_04_APP_META_TESTE_SEM_PORTFOLIO.md`

**HIPÓTESE REPROVADA**: System-user access token fica indisponível sem Business Portfolio proprietário do app.

### 7.3 OAuth USER — PASSOU

Provado:

- token válido, tipo USER, do app corrente e identidade esperada;
- scopes mínimos corretos;
- `granular_scopes` sem `target_ids`, mas isso sozinho não explica Pages porque `ads_read` também não tem targets e ainda enumera Ads;
- `/me/adaccounts` → HTTP 200, 3 contas.

### 7.4 `/me/accounts` — VAZIO

Com o mesmo token:

- `/me/accounts?fields=id,name,tasks` → HTTP 200, 0 itens;
- `/me/accounts?fields=id,name,tasks,instagram_business_account` → HTTP 200, 0 itens.

Logo o vazio nasce no próprio edge `/me/accounts`, não na expansão do Instagram.

### 7.5 Falta de acesso à Page — REPROVADA

O fundador apresentou duas provas visuais oficiais da Meta mostrando `Rafael Brito — Acesso total` e atribuição direta à Page Quoron.

Não alterar acesso da Page.

### 7.6 Leitura direta da Page — PASSOU E AUDITADA

Auditoria: `rodadas/gpt/AUDITORIA_COMPLEMENTO_003B_05_PAGE_DIRECT.md`.

Com o mesmo User Access Token:

- `GET /1356474050873300?fields=id,name` → HTTP 200, `Quoron`;
- `GET /1356474050873300?fields=id,name,instagram_business_account` → HTTP 200;
- `instagram_business_account.id = 17841429590351285`.

Consequências factuais:

- o token consegue ler diretamente a Page;
- o vínculo Page↔Instagram existe e é visível;
- o comportamento anômalo está isolado na enumeração `/me/accounts` neste experimento;
- a causa interna da Meta para esse comportamento **continua não provada**.

A documentação oficial Meta ainda apresenta `/me/accounts` como caminho de listagem de Pages e consulta direta por `page_id` quando o ID já é conhecido. Não transformar a anomalia em hipótese não comprovada.

## 8. Decisão atual do GPT

O complemento de Page está **AUDITADO E APROVADO**, mas o experimento USER **ainda não satisfaz o requisito genérico de descoberta automática da 003B**.

Não adotar como arquitetura canônica:

- Page ID hardcoded/conhecido;
- entrada manual de ID técnico pelo cliente;
- `business_management` por tentativa;
- `ads_management` por tentativa;
- Page Access Token sem prova material;
- substituição definitiva de BISU por USER.

Antes de decidir o mecanismo final de descoberta, medir se o User Access Token corrente consegue executar as capacidades downstream necessárias à Fase 4 usando o IG ID já provado apenas como fixture diagnóstica.

## 9. Próxima ação autorizada — COMPLEMENTO READ-ONLY IG + INSIGHTS

Próximo a agir: **Claude Code**.

Mandato:

`rodadas/gpt/COMPLEMENTO_003B_05_IG_DIRECT_INSIGHTS_READONLY.md`

Executar somente:

1. `GET /17841429590351285?fields=id,username,media_count,followers_count`;
2. somente se 1 retornar HTTP 200: `GET /17841429590351285/insights?metric=reach&period=day`.

Usar o mesmo User Access Token server-side e Graph API v26.0.

Objetivo: provar se o token USER corrente consegue ler diretamente o IG User e a capacidade mínima de Insights, sem depender da enumeração quebrada de `/me/accounts`.

O ID conhecido é **fixture diagnóstica**, não desenho de produto.

Não repetir sondas já concluídas. Depois entregar relatório curto e parar aguardando auditoria GPT.

## 10. Continua NÃO autorizado

- declarar User Access Token arquitetura definitiva;
- remover BISU;
- adicionar `business_management`, `ads_management` ou outro scope por tentativa;
- mexer no acesso da Page Quoron;
- novo OAuth;
- associar o app E2E ao portfólio Quoron só para BISU;
- substituir definitivamente o app oficial;
- criar/mover Page, Instagram, portfólio ou Ad Account;
- usar conta de terceiro;
- expor App Secret/token;
- pedir/imprimir/persistir Page Access Token;
- persistir seleção de Instagram/Ad Account durante a sonda;
- campanha/anúncio/gasto;
- importar conteúdo;
- iniciar Fase 4;
- promover/mergear 003B antes do E2E, sondas e auditoria final.

## 11. Pendências

- decidir mecanismo genérico de descoberta de Page/Instagram após fechar a viabilidade downstream do USER;
- se USER for adotado, decidir ciclo de vida/renovação/reautorização/revogação/Ads e segurança;
- decidir Page Access Token somente se houver prova material de necessidade;
- corrigir UX que hoje afirma ausência de Page quando a API apenas devolve lista vazia;
- harmonizar canônicos de mídia paga pós-003B;
- redaction do callback em logs antes de produção;
- leaked-password protection, SMTP/domínio, App Review/Business Verification quando aplicável.

## 12. Regra de comunicação para continuidade

- Sempre que o fundador for instruído a abrir uma página/tela externa, fornecer o **link direto** junto com o caminho.
- O fundador não é programador: toda ação manual precisa dizer o que fazer, onde fazer e por quê.
- Não fragmentar uma sequência lógica conhecida em pedidos sucessivos que poderiam ter sido dados juntos.
- Não tratar hipótese sobre comportamento da Meta como fato antes de prova.
