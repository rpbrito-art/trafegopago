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

A 003A está **EXECUTADA, AUDITADA E PROMOVIDA**. Permanecem canônicos: Facebook Login for Business + Graph API v26.0; token Meta server-side no Vault; OAuth `state` de uso único; membership reconferida; suporte/classificação de BISU; desconexão segura.

## 3. Rodada 003B — EM EXECUÇÃO, NÃO PROMOVIDA

Mandato: `rodadas/gpt/RODADA_003B_META_ASSET_DISCOVERY_SELECTION.md`

Autorização original: `rodadas/gpt/AUTORIZACAO_003B_EXECUCAO.md`

Branch: `claude/rodada-003b-meta-asset-discovery-selection`

PR: **#12 draft**.

HEAD auditado do código de produto: `872d777a929f4be12567d9a7b9e9fa89bac00dfb`

CI auditada: `32792662569` — verde.

Executado/auditado até aqui:

- migration `20260824210000_create_meta_asset_selection.sql` aplicada;
- remoto com 15 migrations;
- `instagram_accounts` e `ad_accounts` presentes;
- descoberta/seleção, capabilities e UX implementadas;
- Correção 003B-01 fail-closed metadata + membership: **EXECUTADA, AUDITADA E APROVADA**;
- Correção 003B-03 reautorização de conexão ativa: **EXECUTADA, AUDITADA E APROVADA**;
- investigação 003B-05 A/B/C/E: **EXECUTADA E AUDITADA**; faltou a prova direta da Page prevista no mandato atualizado;
- 003B ainda **não promovida**.

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
- `.env.local` temporariamente aponta para o app E2E; servidor local reiniciado;
- App Secret nunca pode ir para chat/log/commit.

Ativos reais:

- Página Facebook **Quoron** — ID **`1356474050873300`**;
- Instagram profissional **@goquoron** — ID observado anteriormente `17841429590351285`.

## 6. Conexão real atual — PÓS-OAUTH USER

Conexão `655da6e6-9056-456d-a81d-5e2570da5faf`:

- status ACTIVE;
- token presente no Vault;
- `connected_at`: `2026-08-25 11:03:11.366473+00`;
- expira `2026-10-24 11:03:08.745+00`;
- `external_user_id`: `28050226117920563`;
- escopos efetivamente concedidos:
  - `pages_show_list`
  - `pages_read_engagement`
  - `instagram_basic`
  - `instagram_manage_insights`
  - `ads_read`
  - `public_profile`
- `instagram_accounts`: 0;
- `ad_accounts`: 0.

O GPT reconfirmou no Supabase após a investigação que a conexão permanece ACTIVE com os mesmos escopos e identidade.

## 7. Gates E2E

### 7.1 BISU: portfólio dono do app não pode ser cliente

No BISU, Quoron apareceu desabilitado com `This Meta Business Account owns the app`.

Gate: `rodadas/gpt/GATE_003B_PORTFOLIO_DONO_DO_APP_NAO_ELEGIVEL_COMO_CLIENTE.md`.

### 7.2 Decisão prematura anulada

`rodadas/gpt/DECISAO_003B_04_SEPARAR_PROVEDOR_E_CLIENTE_FIXTURE.md` está **ANULADO COMO DECISÃO**; era debate sem autorização.

### 7.3 App sem portfólio + BISU

`rodadas/gpt/RESULTADO_003B_04_APP_META_TESTE_SEM_PORTFOLIO.md`

**HIPÓTESE REPROVADA**: System-user access token fica indisponível sem Business Portfolio proprietário do app.

### 7.4 USER — OAuth PASSOU; `/me/accounts` devolve zero Pages

Autorização: `rodadas/gpt/AUTORIZACAO_003B_05_USER_ACCESS_TOKEN_E2E.md`.

Status: **EM ANDAMENTO — NÃO É DECISÃO ARQUITETURAL DEFINITIVA**.

Provado:

- token válido, tipo USER, do app corrente e da identidade esperada;
- escopos mínimos corretos;
- `/me/accounts?fields=id,name,tasks` → HTTP 200, 0 itens;
- `/me/accounts?fields=id,name,tasks,instagram_business_account` → HTTP 200, 0 itens;
- portanto o vazio nasce no próprio edge `/me/accounts`, não na expansão do Instagram;
- `/me/adaccounts` → HTTP 200, 3 contas, logo o token não está globalmente cego;
- `granular_scopes` sem `target_ids` não explica sozinho o comportamento, porque `ads_read` também veio sem `target_ids` e ainda enumera Ad Accounts.

Relatório executado: `rodadas/claude/RELATORIO_INVESTIGACAO_003B_05_PAGE_ZERO.md`.

### 7.5 Hipótese de acesso insuficiente à Página — REPROVADA

Em 2026-08-25 o fundador apresentou duas provas visuais oficiais da Meta mostrando `Rafael Brito — Acesso total` à Page Quoron, inclusive atribuição direta em Business Settings.

Portanto não alterar acesso da Página.

## 8. Complemento 003B-05 — EXECUTADO

Mandato: `rodadas/gpt/COMPLEMENTO_003B_05_PAGE_DIRECT_READONLY.md`.

Status: **EXECUTADA — AGUARDANDO AUDITORIA GPT**.

Relatórios: `rodadas/claude/RELATORIO_INVESTIGACAO_003B_05_PAGE_ZERO.md` e `rodadas/claude/RELATORIO_COMPLEMENTO_003B_05_PAGE_DIRECT.md`.

Sondas read-only: `scripts/meta-user-token-page-zero-probe.mjs` e `scripts/meta-page-direct-003b-05-probe.mjs`. Token pelo caminho server-side, header `Authorization`, saída sanitizada.

Prova direta da Page `1356474050873300`, com o mesmo token da conexão `655da6e6-9056-456d-a81d-5e2570da5faf`:

- `GET /1356474050873300?fields=id,name`: **HTTP 200**, `id=1356474050873300`, `name=Quoron`;
- `GET /1356474050873300?fields=id,name,instagram_business_account`: **HTTP 200**, `instagram_business_account.id=17841429590351285`.

Nenhum erro nas duas chamadas. `debug_token`, `/me`, `/me/accounts` e `/me/adaccounts` não foram repetidos.

Consequências factuais:

- a alternativa "o token não consegue ler diretamente a Page" está **REPROVADA**;
- o token **lê a Page Quoron por ID** e **resolve a conta profissional vinculada** — o vínculo Página↔Instagram existe e é visível para este token;
- o problema está **isolado no edge `/me/accounts`**, que não enumera uma Page que o próprio token lê;
- confirma-se a alternativa 2 do complemento: o token lê a Page; `/me/accounts` é que não a lista.

Não determinado aqui, por ser escolha de arquitetura: por que a enumeração falha e qual caminho adotar — configuração com seleção de ativos, retorno ao BISU com portfólio proprietário, descoberta por ID conhecido em vez de `/me/accounts`, ou outro. Nenhuma dessas opções foi testada.

Claude declarou `DECISÃO ARQUITETURAL NECESSÁRIA — AGUARDANDO GPT`.

Próximo a agir: **GPT** — auditar o complemento e decidir o caminho. Nenhum novo OAuth, nenhuma mudança de configuração Meta e nenhuma ampliação de escopo antes dessa decisão.

## 9. Continua NÃO autorizado

- declarar User Access Token arquitetura definitiva;
- remover BISU;
- adicionar `business_management` ou `ads_management` por tentativa;
- mexer no acesso da Página Quoron;
- novo OAuth antes da conclusão/auditoria da complementação;
- associar o app E2E ao portfólio Quoron só para BISU;
- substituir definitivamente o app oficial;
- criar/mover Page, Instagram, portfólio ou Ad Account;
- usar conta de terceiro;
- expor App Secret/token;
- persistir Page Access Token sem decisão arquitetural;
- campanha/anúncio/gasto;
- importar conteúdo;
- iniciar Fase 4;
- promover/mergear 003B antes do E2E, sondas e auditoria final.

## 10. Pendências

- após a prova direta da Page, decidir a causa/caminho arquitetural com base em evidência;
- se USER for adotado, decidir ciclo de vida/renovação/reautorização/revogação/Ads e segurança antes de promover arquitetura;
- decidir Page Access Token só se houver prova material de necessidade;
- corrigir UX que hoje afirma ausência de Page quando a API apenas devolve lista vazia;
- harmonizar canônicos de mídia paga pós-003B;
- redaction do callback em logs antes de produção;
- leaked-password protection, SMTP/domínio, App Review/Business Verification quando aplicável.

## 11. Regra de comunicação para continuidade

- Sempre que o fundador for instruído a abrir uma página/tela externa, fornecer o **link direto** junto com o caminho.
- O fundador não é programador: toda ação manual precisa dizer o que fazer, onde fazer e por quê, sem pressupor conhecimento de siglas/comandos/telas.
- Não fragmentar uma sequência lógica conhecida em pedidos sucessivos que poderiam ter sido dados juntos.
- Não tratar hipótese sobre comportamento da Meta como fato antes de prova; houve hipóteses anteriores erradas que geraram trabalho desnecessário.
