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

PR #12: **draft, open, não mergeado**.

Último HEAD auditado antes da 003B-09: `ed44cb8abab86cb28087d410ae5c0fe75b26d2be`.

CI auditada desse HEAD: `32851269642` — **success**.

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

Correção vigente:

`rodadas/gpt/CORRECAO_003B_09_RESET_E2E_CONEXAO_META.md`

Status 003B-09: **AUTORIZADA — AGUARDANDO EXECUÇÃO CLAUDE**.

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

## 7. Conexão USER real atual — snapshot após tentativas de reconexão

Conexão `655da6e6-9056-456d-a81d-5e2570da5faf`:

- organização `a8f79c4b-b10a-4e01-b12d-2d8e62917009`;
- usuário/membership `d4ed915a-2fe8-4990-9e73-9a68fbbd1f9d`;
- status `ACTIVE` no snapshot de 2026-08-25 às 10:12 BRT;
- `external_user_id=28050226117920563`;
- `external_business_id=null`;
- scopes: `pages_show_list`, `pages_read_engagement`, `instagram_basic`, `instagram_manage_insights`, `ads_read`, `public_profile`;
- `instagram_accounts=0`;
- `ad_accounts=0`.

O GPT auditou as tentativas reais do fundador após a 003B-08:

- várias novas `meta_oauth_intents` foram criadas entre aproximadamente 10h09 e 10h12 BRT;
- quatro callbacks foram consumidos corretamente;
- a conexão foi novamente ativada em `2026-08-25T13:12:06.063762+00:00`.

Conclusão: o botão **Conectar novamente** efetivamente chega ao backend e o OAuth concluiu pelo menos uma vez. O problema remanescente é o ciclo incoerente de estado/UX e o reset/desconexão.

Ativos de fixture diagnóstica:

- Page Quoron `1356474050873300`;
- Instagram profissional `@goquoron` `17841429590351285`.

## 8. Evidência USER consolidada anterior

Com o User Access Token do experimento:

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

## 10. Defeito de reset/desconexão — 003B-09

O fundador pediu que **conectar, reconectar e desconectar funcionem de forma repetível para poder testar do zero**.

Fato de código:

- `revokeUserPermissions()` já chama o edge correto `DELETE /{user-id}/permissions` para USER;
- porém o parser atual só aceita objeto `{ success: true }`;
- o endpoint pode responder sucesso como JSON booleano literal `true`;
- assim, a Meta pode revogar corretamente e o Tráfego Pago classificar o sucesso como erro, deixando o estado local `ACTIVE`.

Evidência primária: SDK oficial `facebook/facebook-nodejs-business-sdk`, objeto `User`, possui `deletePermissions()` no edge `/permissions`.

A 003B-09 deve provar no E2E real a forma exata da resposta atual e corrigir o contrato sem relaxar o fail-closed.

Também deve eliminar a UX contraditória na qual a mesma página mostra simultaneamente “Meta conectada” e “A conexão precisa da sua atenção”.

## 11. Gate E2E BISU — continua separado

Ainda falta E2E real de BISU para provar:

1. `assigned_pages` com BISU ativo do fluxo real;
2. permissões exigidas pelo edge nesse arranjo;
3. expansão `instagram_business_account` no retorno real;
4. descoberta/seleção completa em entidade cliente elegível.

A Correção 003B-09 é sobre confiabilidade do ciclo conectar/desconectar e sobre o experimento USER atual. **Ela não substitui o gate BISU.**

## 12. Próxima ação autorizada

Próximo a agir: **Claude Code**.

Executar somente:

`rodadas/gpt/CORRECAO_003B_09_RESET_E2E_CONEXAO_META.md`

na branch:

`claude/rodada-003b-meta-asset-discovery-selection`

A autorização inclui **uma desconexão real da conexão USER atual** para deixar o ambiente em estado `REVOKED` e pronto para um novo teste do zero.

Claude deve implementar, testar, executar a prova real de desconexão pelo backend canônico, verificar Supabase, publicar HEAD/CI e parar em `AGUARDANDO AUDITORIA GPT`.

Depois da auditoria GPT, o fundador deverá encontrar a aplicação no estado **Conectar a Meta** e poderá iniciar o próximo OAuth do zero.

## 13. Continua NÃO autorizado

- alterar `.env.local`;
- alterar Meta App ou Business Login Configuration;
- adicionar/remover scopes;
- criar terceiro Business Portfolio;
- excluir `Bizzman5po`;
- mover/transferir Page, Instagram, Ad Account ou app;
- usar empresa/portfólio de terceiro;
- Page Access Token;
- campanha/anúncio/gasto;
- importar conteúdo;
- promover/mergear 003B antes dos gates;
- iniciar Fase 4;
- declarar USER arquitetura definitiva;
- tratar 003B-09 como prova BISU.

## 14. Pendências

- executar/auditar 003B-09;
- deixar a conexão USER atual realmente desconectada e localmente `REVOKED`;
- fundador testar novo OAuth do zero após auditoria;
- reconstruir inventário Meta real sem confundir nomes;
- definir fixture BISU elegível usando recursos existentes, se possível;
- executar E2E BISU real;
- se os gates passarem, decidir promoção da 003B;
- corrigir UX que hoje afirma ausência de Page quando API devolve lista vazia, se ainda aplicável após E2E;
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
