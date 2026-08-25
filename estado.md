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

003A está **EXECUTADA, AUDITADA E PROMOVIDA**.

## 3. Rodada 003B — EXECUTADA/AUDITADA EM CÓDIGO, NÃO PROMOVIDA

Mandato: `rodadas/gpt/RODADA_003B_META_ASSET_DISCOVERY_SELECTION.md`

Branch: `claude/rodada-003b-meta-asset-discovery-selection`

PR #12: **draft, open, não mergeado, mergeable=true**.

HEAD reconciliado e auditado: `377756b08b02895b900cad04c6bf7ec13e6e0fd5`.

CI final auditada: `32848304161` — **success**.

Já executado/auditado:

- migration `20260824210000_create_meta_asset_selection.sql` aplicada;
- `instagram_accounts` e `ad_accounts` presentes;
- descoberta/seleção, capabilities e UX implementadas;
- Correção 003B-01: **EXECUTADA, AUDITADA E APROVADA**;
- Correção 003B-03: **EXECUTADA, AUDITADA E APROVADA**;
- investigação 003B-05: **EXECUTADA E AUDITADA**;
- complemento Page direta: **EXECUTADO, AUDITADO E APROVADO COMO EVIDÊNCIA READ-ONLY**;
- complemento IG User + Insights: **EXECUTADO, AUDITADO E APROVADO COMO EVIDÊNCIA READ-ONLY**;
- Correção 003B-06 credential-aware discovery: **EXECUTADA E AUDITADA; APROVADA NO NÍVEL DE CÓDIGO/ARQUITETURA DOCUMENTADA; NÃO É PROVA E2E BISU**;
- reconciliação da branch com `main`: **EXECUTADA, AUDITADA E APROVADA**;
- testes após reconciliação: **228/228** nos módulos Meta/actions/componentes; typecheck e lint limpos;
- CI do HEAD reconciliado: **verde**.

003B continua **NÃO PROMOVIDA**.

## 4. Produto — mídia paga

Canônico específico: `docs/01-produto/PAID_MEDIA_CANONICAL.md`.

Mídia paga é pilar central; orgânico também entrega valor. Permissão Ads não equivale a criar campanha/gastar. Gasto exige aprovação humana explícita, comando de domínio, idempotência e auditoria.

`docs/01-produto/GROWTH_INTELLIGENCE_CANONICAL.md` permanece obrigatório para simplicidade guiada.

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

## 6. Limite real de Business Portfolios da conta — RESTRIÇÃO OPERACIONAL

Fato operacional recuperado do histórico e agora incorporado ao estado canônico:

- o fundador já possui **dois Meta Business Portfolios**;
- a conta atingiu o limite atual de criação de portfolios;
- um deles é **Quoron**, que possui o app canônico;
- o outro é **BizzManiq1**;
- `BizzManiq1` está **bloqueado/inutilizável** no estado atual;
- portanto **não é possível criar um terceiro Business Portfolio** nessa conta agora.

Regra permanente até mudança observada na Meta:

- não instruir criação de terceiro portfolio;
- não excluir `BizzManiq1` por tentativa apenas para liberar vaga;
- não usar empresa/portfolio de terceiro sem decisão explícita do fundador.

A decisão anterior `DECISAO_003B_07_FIXTURE_BISU_CLIENTE_PROPRIO.md`, que propôs criar `Tráfego Pago Cliente Teste`, foi **RETRATADA — NÃO EXECUTAR**.

## 7. Conexão USER real atual

Conexão `655da6e6-9056-456d-a81d-5e2570da5faf`:

- status ACTIVE;
- `external_user_id=28050226117920563`;
- `external_business_id=null`;
- scopes: `pages_show_list`, `pages_read_engagement`, `instagram_basic`, `instagram_manage_insights`, `ads_read`, `public_profile`;
- token no Vault;
- `instagram_accounts=0`;
- `ad_accounts=0`.

Ativos de fixture diagnóstica:

- Page Quoron `1356474050873300`;
- Instagram profissional `@goquoron` `17841429590351285`.

## 8. Evidência USER consolidada

Com o mesmo User Access Token:

- token válido, tipo USER, app/identidade esperados;
- `/me/adaccounts` → HTTP 200, 3 contas;
- leitura direta da Page → HTTP 200;
- Page resolve `instagram_business_account.id=17841429590351285`;
- leitura direta de `@goquoron` → HTTP 200;
- `media_count=9`;
- Insights `reach/day` → HTTP 200.

Falha observada:

- `/me/accounts` → HTTP 200, 0 Pages.

USER continua não canônico porque não satisfez descoberta automática no E2E real.

## 9. Correção 003B-06 — arquitetura aprovada

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

## 10. Gate E2E BISU — próximo caminho real

Ainda falta E2E real de BISU para provar:

1. `assigned_pages` com BISU ativo do fluxo real;
2. permissões exigidas pelo edge nesse arranjo;
3. expansão `instagram_business_account` no retorno real;
4. descoberta/seleção completa em entidade cliente elegível.

Quoron não serve como cliente do próprio app: no fluxo anterior apareceu desabilitado com `This Meta Business Account owns the app`.

Como não há vaga para terceiro portfolio, a primeira alternativa própria é **recuperar/reativar BizzManiq1**, se a Meta permitir.

Só se BizzManiq1 for formalmente irrecuperável será investigada uma fixture criada por API (`owned_businesses`/mecanismo equivalente). Essa alternativa NÃO está aprovada como elegível para Facebook Login for Business até prova oficial específica.

## 11. Próxima ação autorizada

Próximo a agir: **GPT + fundador para inspeção read-only do bloqueio de BizzManiq1**.

Única ação manual permitida agora:

- abrir a área de suporte/qualidade da Meta e inspecionar o motivo/status de restrição de `BizzManiq1`;
- não solicitar exclusão;
- não alterar ativos;
- não executar OAuth;
- não criar portfolio.

Com o status exato, o GPT deve escolher e conduzir imediatamente o caminho de revisão/recuperação suportado, se existir.

## 12. Continua NÃO autorizado

- criar terceiro Business Portfolio;
- excluir `BizzManiq1` por tentativa;
- promover/mergear 003B antes do E2E BISU;
- iniciar Fase 4;
- declarar USER arquitetura definitiva;
- remover BISU;
- adicionar `business_management`, `ads_management` ou outro scope por tentativa;
- transferir ownership da Page/Instagram/Ad Account/app;
- usar empresa/portfólio de terceiro;
- expor App Secret/token;
- pedir/imprimir/persistir Page Access Token;
- campanha/anúncio/gasto;
- importar conteúdo.

## 13. Pendências

- identificar bloqueio exato de `BizzManiq1`;
- tentar recuperação/revisão suportada, se disponível;
- se recuperado, usar BizzManiq1 como cliente do E2E BISU;
- se formalmente irrecuperável, investigar fixture por API com prova oficial de elegibilidade;
- executar E2E BISU real;
- se passar, decidir promoção da 003B;
- corrigir UX que hoje afirma ausência de Page quando API devolve lista vazia;
- harmonizar canônicos de mídia paga pós-003B;
- redaction do callback em logs antes de produção;
- leaked-password protection, SMTP/domínio, App Review/Business Verification quando aplicável.

## 14. Regra de comunicação para continuidade

- sempre fornecer link direto quando instruir o fundador a abrir página/tela externa;
- explicar toda ação manual em linguagem simples;
- não fragmentar sequência lógica conhecida;
- não tratar hipótese sobre comportamento da Meta como fato antes de prova;
- antes de instrução manual dependente de limite/capacidade externa, conferir o estado específico da conta já conhecido no histórico.
