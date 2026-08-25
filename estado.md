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

HEAD auditado: `872d777a929f4be12567d9a7b9e9fa89bac00dfb`

CI auditada: `32792662569` — verde.

Executado/auditado até aqui:

- migration `20260824210000_create_meta_asset_selection.sql` aplicada;
- remoto com 15 migrations;
- `instagram_accounts` e `ad_accounts` presentes;
- descoberta/seleção, capabilities e UX implementadas;
- Correção 003B-01 fail-closed metadata + membership: **EXECUTADA, AUDITADA E APROVADA**;
- Correção 003B-03 reautorização de conexão ativa: **EXECUTADA, AUDITADA E APROVADA**;
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
- Instagram profissional **@goquoron**.

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

O GPT confirmou no Supabase que o OAuth USER passou com todos os escopos mínimos esperados.

Resultado: `rodadas/gpt/RESULTADO_003B_05_OAUTH_USER_PAGINAS_ZERO.md`.

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

`configuração USER → OAuth real → token ACTIVE → escopos mínimos corretos`

Bloqueio:

- 003B chama `GET /me/accounts?fields=id,name,instagram_business_account`;
- resposta efetiva trouxe zero Pages (`pagesFound=0`);
- a UX mostrou `Falta a Página do seu negócio`;
- isso não prova inexistência da Página, apenas que `/me/accounts` não a devolveu.

### 7.5 Hipótese de acesso insuficiente à Página — REPROVADA

Em 2026-08-25 o fundador apresentou duas provas visuais oficiais da Meta:

1. tela **Acesso à Página** da Página Quoron:
   - `Rafael Brito — Acesso total` em `Pessoas com controle total`;
2. **Business Settings → Contas → Páginas → Quoron**:
   - Page **Quoron**, ID **`1356474050873300`**;
   - propriedade: **Quoron**;
   - `1 pessoa está atribuída a essa Página do Facebook`;
   - `Rafael Brito (You) — Acesso total`.

Portanto não há mais ambiguidade: o perfil usado no OAuth está **diretamente atribuído à Page Quoron com acesso total**. A hipótese de que `/me/accounts` está vazio por falta de atribuição ou nível de acesso está **REPROVADA**. Não alterar acesso da Página.

A documentação oficial Meta/Postman continua mostrando User Access Token + `/me/accounts` como caminho para listar Pages gerenciadas; logo o vazio exige diagnóstico técnico do token/edge, não mais tentativa manual de permissões da Página.

## 8. Próxima ação autorizada

Próximo a agir: **Claude Code, investigação read-only**.

Mandato: `rodadas/gpt/INVESTIGACAO_003B_05_PAGE_ZERO_GRANULAR_SCOPES.md`.

Objetivo: sem mutações, provar:

1. `debug_token`: validade/tipo/scopes e `granular_scopes/target_ids` sanitizados;
2. identidade `GET /me?fields=id,name`;
3. comparar `/me/accounts?fields=id,name,tasks` com `/me/accounts?fields=id,name,tasks,instagram_business_account`;
4. testar diretamente a Page conhecida `1356474050873300` com `GET /{page-id}?fields=id,name` e, se permitido, expansão `instagram_business_account`;
5. usar `/me/adaccounts?fields=id,name,account_status` como controle independente de `ads_read`.

Claude não deve expor token/secret, não deve editar código de produto nem iniciar OAuth. Ao final, relatório factual e parar para auditoria GPT.

## 9. Continua NÃO autorizado

- declarar User Access Token arquitetura definitiva;
- remover BISU;
- adicionar `business_management` ou `ads_management` por tentativa;
- mexer no acesso da Página Quoron;
- novo OAuth antes do resultado da investigação;
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

- se USER passar, decidir ciclo de vida/renovação/reautorização/revogação/Ads e segurança antes de promover arquitetura;
- decidir Page Access Token só se houver prova material de necessidade;
- corrigir UX que hoje afirma ausência de Page quando a API apenas devolve lista vazia;
- harmonizar canônicos de mídia paga pós-003B;
- redaction do callback em logs antes de produção;
- leaked-password protection, SMTP/domínio, App Review/Business Verification quando aplicável.
