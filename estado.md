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

Branch: `claude/rodada-003b-meta-asset-discovery-selection`

PR: **#12 draft, open, não mergeado**.

HEAD anterior auditado: `1771965805a09082579da1f1baea58b674f24084`.

CI anterior auditada: `32844721885` — success.

HEAD da Correção 003B-06: `c1b3ba01abd44503777adaf6b5ea4507063bce34`.

Situação atual do PR: branch divergiu da `main`, PR temporariamente não mergeável; o HEAD `c1b3ba0...` ainda não possui CI associada.

Já executado/auditado:

- migration `20260824210000_create_meta_asset_selection.sql` aplicada;
- `instagram_accounts` e `ad_accounts` presentes;
- descoberta/seleção, capabilities e UX implementadas;
- Correção 003B-01: **EXECUTADA, AUDITADA E APROVADA**;
- Correção 003B-03: **EXECUTADA, AUDITADA E APROVADA**;
- investigação 003B-05: **EXECUTADA E AUDITADA**;
- complemento Page direta: **EXECUTADO, AUDITADO E APROVADO COMO EVIDÊNCIA READ-ONLY**;
- complemento IG User + Insights: **EXECUTADO, AUDITADO E APROVADO COMO EVIDÊNCIA READ-ONLY**;
- Correção 003B-06 credential-aware discovery: **EXECUTADA E AUDITADA; APROVADA NO NÍVEL DE CÓDIGO/ARQUITETURA DOCUMENTADA; NÃO É PROVA E2E BISU**.

003B continua **NÃO PROMOVIDA**.

## 4. Produto — mídia paga

Canônico específico: `docs/01-produto/PAID_MEDIA_CANONICAL.md`.

Mídia paga é pilar central; orgânico também entrega valor. Permissão Ads não equivale a criar campanha/gastar. Gasto exige aprovação humana explícita, comando de domínio, idempotência e auditoria.

`docs/01-produto/GROWTH_INTELLIGENCE_CANONICAL.md` permanece obrigatório para simplicidade guiada: complexidade técnica pertence ao sistema, não ao pequeno empresário.

## 5. Arquitetura Meta vigente

Permanece canônico para produção:

- Facebook Login for Business;
- System-user access token / BISU;
- Graph API v26.0 no estado atual.

App baseline:

- `Trafego Pago Business Dev` — App ID `2940404272985831`;
- `Quoron Instagram Dev Login` — Configuration ID `38307908848822330`;
- Business Portfolio Quoron ID `5301659283195806`.

Experimento USER:

- app `Trafego Pago E2E Test`;
- configuração `Quoron E2E Login` — ID `1068370819137366`;
- User Access Token;
- evidência diagnóstica válida, mas **não canônica**.

## 6. Conexão USER real atual

Conexão `655da6e6-9056-456d-a81d-5e2570da5faf`:

- status ACTIVE;
- `external_user_id=28050226117920563`;
- `external_business_id=null`;
- scopes: `pages_show_list`, `pages_read_engagement`, `instagram_basic`, `instagram_manage_insights`, `ads_read`, `public_profile`;
- token no Vault;
- `instagram_accounts=0`;
- `ad_accounts=0`.

O GPT reconfirmou esse snapshot no Supabase após a execução 003B-06; não houve persistência de seleção nem mutação externa.

Ativos de fixture diagnóstica:

- Page Quoron `1356474050873300`;
- Instagram profissional `@goquoron` `17841429590351285`.

## 7. Evidência USER consolidada

Com o mesmo User Access Token:

- token válido, tipo USER, app/identidade esperados;
- `/me/adaccounts` → HTTP 200, 3 contas;
- leitura direta da Page → HTTP 200;
- Page resolve `instagram_business_account.id=17841429590351285`;
- leitura direta de `@goquoron` → HTTP 200;
- `media_count=9`;
- Insights `reach/day` → HTTP 200.

Sem `business_management`, `ads_management` ou Page Access Token.

Falha observada:

- `/me/accounts` → HTTP 200, 0 Pages.

A causa interna da Meta permanece não provada. USER continua não canônico porque não satisfez descoberta automática no E2E real.

## 8. Correção 003B-06 — resultado da auditoria

Documentos:

- `rodadas/gpt/CORRECAO_003B_06_DISCOVERY_CREDENTIAL_AWARE.md`;
- `rodadas/claude/RELATORIO_CORRECAO_003B_06_DISCOVERY_CREDENTIAL_AWARE.md`;
- `rodadas/gpt/AUDITORIA_CORRECAO_003B_06_DISCOVERY_CREDENTIAL_AWARE.md`.

A afirmação anterior de que `assigned_pages` era apenas hipótese fica **SUPERADA**.

Evidência primária verificada: o SDK oficial da Meta `facebook-nodejs-business-sdk`, objeto `SystemUser`, implementa `getAssignedPages()` usando `/assigned_pages` e objetos `Page`.

Arquitetura aprovada no código:

- USER → `/me/accounts`;
- BISU/System User positivamente classificado → `/{system-user-id}/assigned_pages`;
- classificação centralizada e fail-closed;
- `SYSTEM_USER` sozinho não prova BISU;
- `external_business_id` não é proxy;
- classificação inconclusiva não tenta endpoint por chute;
- Ads permanece independente.

A execução não deve ser revertida.

## 9. O que a 003B-06 NÃO provou

Ainda não há prova E2E real de BISU para:

1. chamada de `assigned_pages` com um BISU ativo do fluxo real;
2. permissões efetivamente exigidas pelo edge nesse arranjo;
3. expansão `instagram_business_account` no retorno real desse edge;
4. descoberta/seleção completa usando uma entidade cliente elegível separada do portfólio dono do app.

No BISU anterior, o portfólio Quoron apareceu desabilitado com `This Meta Business Account owns the app`. Esse fato permanece válido.

Não usar empresa/portfólio de terceiro sem nova decisão explícita do fundador.

## 10. Próxima ação autorizada — RECONCILIAÇÃO + CI

Próximo a agir: **Claude Code**.

Claude deve somente:

1. atualizar a branch 003B com a `main` atual;
2. resolver o conflito documental preservando esta auditoria como estado mais novo;
3. não mudar o comportamento aprovado da 003B-06 salvo necessidade estrita de reconciliação;
4. executar testes Meta relevantes, typecheck e lint;
5. publicar o novo HEAD remoto e obter CI do PR;
6. entregar HEAD, estado do PR e CI;
7. parar em `AGUARDANDO AUDITORIA GPT`.

Essa autorização é apenas de integração técnica e CI. Não autoriza novo E2E, OAuth ou alteração Meta.

## 11. Continua NÃO autorizado

- promover/mergear 003B automaticamente;
- iniciar Fase 4;
- declarar USER arquitetura definitiva;
- remover BISU;
- adicionar `business_management`, `ads_management` ou outro scope por tentativa;
- novo OAuth;
- alterar `.env.local`;
- mexer no acesso da Page/Instagram/Business Portfolio;
- alterar App/Business Login Configuration no painel Meta;
- usar empresa/portfólio de terceiro sem nova decisão explícita;
- expor App Secret/token;
- pedir/imprimir/persistir Page Access Token;
- campanha/anúncio/gasto;
- importar conteúdo.

## 12. Pendências

- reconciliar PR #12 com `main` e obter CI verde no novo HEAD;
- depois decidir o critério final de E2E/promoção da 003B;
- corrigir UX que hoje afirma ausência de Page quando API devolve lista vazia;
- harmonizar canônicos de mídia paga pós-003B;
- redaction do callback em logs antes de produção;
- leaked-password protection, SMTP/domínio, App Review/Business Verification quando aplicável.

## 13. Regra de comunicação para continuidade

- sempre fornecer link direto quando instruir o fundador a abrir página/tela externa;
- explicar toda ação manual em linguagem simples;
- não fragmentar sequência lógica conhecida;
- não tratar hipótese sobre comportamento da Meta como fato antes de prova.
