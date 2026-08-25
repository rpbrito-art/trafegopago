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

HEAD auditado após Correção 003B-08: `ed44cb8abab86cb28087d410ae5c0fe75b26d2be`.

CI auditada do HEAD: `32851269642` — **success**.

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
- Correção 003B-08 reconexão em `conexao-recusada`: **EXECUTADA, AUDITADA E APROVADA**;
- testes após 003B-08: **230/230** nos módulos Meta/actions/componentes; typecheck e lint limpos;
- CI do HEAD `ed44cb8...`: **verde**.

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

## 6. Limite real de Business Portfolios — RESTRIÇÃO OPERACIONAL

Fatos confirmados:

- a conta do fundador já atingiu o limite atual de **dois Meta Business Portfolios**;
- portanto **não é possível criar um terceiro Business Portfolio** nessa conta agora;
- o portfólio que está **bloqueado/inutilizável é `Bizzman5po`**;
- **`Bizzman5po` e `BizzManiq1` são identidades distintas e não podem ser confundidas**;
- `BizzManiq1` **não está comprovado como bloqueado** e seu papel atual precisa ser reconstruído por evidência antes de qualquer uso;
- Quoron possui o app canônico; no fluxo BISU observado apareceu desabilitado como cliente do próprio app com `This Meta Business Account owns the app`.

A decisão anterior de criar `Tráfego Pago Cliente Teste` está **RETRATADA — NÃO EXECUTAR**.

Regra permanente:

- não instruir criação de terceiro portfolio;
- não excluir `Bizzman5po` por tentativa apenas para liberar vaga;
- não inferir a identidade ou estado de recurso Meta por semelhança de nome;
- não usar empresa/portfolio de terceiro sem decisão explícita do fundador.

## 7. Conexão USER real atual antes do novo teste

Conexão `655da6e6-9056-456d-a81d-5e2570da5faf`:

- status ACTIVE no último snapshot auditado;
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

Com o mesmo User Access Token anterior:

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

## 10. Correção 003B-08 — reconexão liberada

Auditoria: `rodadas/gpt/AUDITORIA_CORRECAO_003B_08_RECONEXAO_CONEXAO_RECUSADA.md`.

O estado `conexao-recusada` agora oferece **Conectar novamente** e reutiliza a Server Action canônica `connectMetaAction`.

Reconectar não exige desconectar primeiro. A correção não alterou backend, RPC, migration, banco, `.env.local`, app Meta, Business Login Configuration, scopes ou tokens.

## 11. Gate E2E BISU — ESTADO ATUAL

Ainda falta E2E real de BISU para provar:

1. `assigned_pages` com BISU ativo do fluxo real;
2. permissões exigidas pelo edge nesse arranjo;
3. expansão `instagram_business_account` no retorno real;
4. descoberta/seleção completa em entidade cliente elegível.

Não há vaga para criar terceiro portfólio. O inventário Meta ainda precisa ser reconstruído corretamente, distinguindo Quoron, Bizzman5po e BizzManiq1 e provando qual papel cada um exerce.

## 12. Próxima ação autorizada

Próximo a agir: **fundador**.

Ação autorizada agora:

1. recarregar a aplicação local em `http://localhost:3000/conta`;
2. no cartão **A conexão precisa da sua atenção**, clicar em **Conectar novamente**;
3. seguir o fluxo normal que a Meta abrir;
4. parar e trazer ao GPT qualquer tela de escolha, erro, bloqueio ou resultado antes de alterar configurações externas por conta própria.

Durante esse teste NÃO:

- clicar em `Desconectar` antes da reconexão;
- criar ou excluir Business Portfolio;
- alterar `.env.local`;
- alterar scopes, App ou Business Login Configuration manualmente;
- transferir ativos;
- criar campanha/anúncio/gasto;
- expor token/secret.

O teste real está **AUTORIZADO**. O resultado ainda precisa ser auditado antes de qualquer promoção da 003B.

## 13. Continua NÃO autorizado

- criar terceiro Business Portfolio;
- excluir `Bizzman5po` por tentativa;
- promover/mergear 003B antes do E2E pertinente;
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

## 14. Pendências

- executar o novo teste de reconexão e auditar o resultado;
- reconstruir inventário Meta real sem confundir nomes;
- definir fixture BISU elegível usando recursos existentes, se necessário;
- executar E2E BISU real quando houver condição elegível;
- se os gates passarem, decidir promoção da 003B;
- corrigir UX que hoje afirma ausência de Page quando API devolve lista vazia;
- harmonizar canônicos de mídia paga pós-003B;
- redaction do callback em logs antes de produção;
- leaked-password protection, SMTP/domínio, App Review/Business Verification quando aplicável.

## 15. Regra de comunicação para continuidade

- sempre fornecer link direto quando instruir o fundador a abrir página/tela externa;
- explicar toda ação manual em linguagem simples;
- não fragmentar sequência lógica conhecida;
- não tratar hipótese sobre comportamento da Meta como fato antes de prova;
- antes de instrução manual dependente de limite/capacidade externa, conferir o estado específico da conta já conhecido no histórico;
- nomes de recursos Meta só podem ser associados a estado/função quando essa identidade estiver comprovada.
