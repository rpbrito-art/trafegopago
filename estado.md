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
- merge commit 003A: `546838db8e7ced4e9045c05feb8c7b2f0c476cc2`.
- CI final 003A: `32772710738` — verde.

A 003A está **EXECUTADA, AUDITADA E PROMOVIDA**. Permanecem canônicos: Facebook Login for Business + Graph API v26.0; token Meta server-side no Vault; OAuth `state` de uso único; membership reconferida; suporte e classificação de BISU; desconexão segura; E2E real de desconexão 003A concluído.

## 3. Rodada 003B — EM EXECUÇÃO, NÃO PROMOVIDA

Mandato: `rodadas/gpt/RODADA_003B_META_ASSET_DISCOVERY_SELECTION.md`

Autorização original: `rodadas/gpt/AUTORIZACAO_003B_EXECUCAO.md`

Branch: `claude/rodada-003b-meta-asset-discovery-selection`

PR: **#12 draft**.

HEAD atual auditado: `872d777a929f4be12567d9a7b9e9fa89bac00dfb`

Última CI auditada: `32792662569` — verde em install, lint, typecheck, Edge Functions, testes e build.

Executado/auditado na 003B até aqui:

- migration `20260824210000_create_meta_asset_selection.sql` aplicada;
- remoto com 15 migrations;
- `instagram_accounts` e `ad_accounts` presentes;
- RLS/grants/funções de seleção auditados;
- descoberta/seleção, capabilities e UX implementadas;
- Correção 003B-01 fail-closed metadata + membership: **EXECUTADA, AUDITADA E APROVADA**;
- Correção 003B-03 reautorização de conexão ativa: **EXECUTADA, AUDITADA E APROVADA**;
- ainda **não promovido**.

## 4. Produto — centralidade de mídia paga corrigida

Canônico vigente: `docs/01-produto/PAID_MEDIA_CANONICAL.md`

Decisão: `rodadas/gpt/DECISAO_003B_02_MIDIA_PAGA_CENTRAL_E_OAUTH_LIBERADO.md`

Regra atual:

- orgânico deve entregar valor e pode existir sozinho por períodos;
- **mídia paga é pilar central da proposta de crescimento**, não capacidade periférica;
- todo usuário deve poder evoluir para tráfego pago quando houver motivo estratégico;
- permissão técnica Ads ≠ criar campanha ≠ aprovar orçamento ≠ gerar gasto;
- gasto continua exigindo aprovação humana explícita, comando de domínio, idempotência e auditoria.

Antes da próxima rodada substantiva pós-003B, harmonizar diretamente as formulações antigas conflitantes em `.gpt/PROJECT_PROMPT.md`, `GROWTH_INTELLIGENCE_CANONICAL.md`, `MVP_CANONICAL.md`, `IMPLEMENTATION_ROADMAP.md` e demais canônicos afetados, sem criar rodada apenas de housekeeping.

## 5. Configuração externa Meta da 003B

### 5.1 Baseline anterior BISU

App anterior: **Trafego Pago Business Dev** — App ID `2940404272985831`.

Configuração BISU anterior:

- `Quoron Instagram Dev Login`;
- Configuration ID `38307908848822330`;
- `System-user access token / BISU`;
- ativos Pages + Instagram Accounts.

Configuração histórica 003A, ainda não apagar:

- `Trafego Pago Dev Login`;
- Configuration ID `1549901823029730`.

### 5.2 App E2E USER atual

App: **Trafego Pago E2E Test**.

- criado sem Business Portfolio;
- caso de uso Instagram em **API setup with Facebook login**;
- `Login do Facebook para Empresas` disponível;
- configuração **Quoron E2E Login**;
- Configuration ID **`1068370819137366`**;
- tipo de token: **User Access Token**;
- etapa `Ativos` indisponível por desenho no modo USER;
- redirect local: `http://localhost:3000/meta/callback`;
- `.env.local` temporariamente aponta para o app E2E e o servidor local foi reiniciado;
- App Secret nunca deve ser exposto em chat/log/commit.

Ativos reais conhecidos no portfólio Quoron:

- Página Facebook: **Quoron**;
- Instagram profissional: **@goquoron**.

## 6. Conexão real atual — PÓS-OAUTH USER

Conexão:

- id: `655da6e6-9056-456d-a81d-5e2570da5faf`;
- status: **ACTIVE**;
- token presente no Vault;
- `connected_at`: `2026-08-25 11:03:11.366473+00`;
- expiração: `2026-10-24 11:03:08.745+00`;
- `external_user_id`: `28050226117920563`;
- `external_business_id`: `null`;
- escopos efetivamente concedidos:
  - `pages_show_list`;
  - `pages_read_engagement`;
  - `instagram_basic`;
  - `instagram_manage_insights`;
  - `ads_read`;
  - `public_profile`;
- `instagram_accounts`: 0 linhas;
- `ad_accounts`: 0 linhas.

Auditoria independente do GPT no Supabase após o callback confirmou que **o OAuth USER passou e o token recebeu todas as permissões mínimas esperadas para o experimento**.

Resultado formal: `rodadas/gpt/RESULTADO_003B_05_OAUTH_USER_PAGINAS_ZERO.md`.

## 7. Gates E2E

### 7.1 Portfólio dono do app não elegível como cliente no BISU

Na reautorização BISU, o seletor exibiu Quoron desabilitado com:

`This Meta Business Account owns the app`

Gate: `rodadas/gpt/GATE_003B_PORTFOLIO_DONO_DO_APP_NAO_ELEGIVEL_COMO_CLIENTE.md`.

### 7.2 Decisão prematura anterior anulada

`rodadas/gpt/DECISAO_003B_04_SEPARAR_PROVEDOR_E_CLIENTE_FIXTURE.md`

Status: **ANULADO COMO DECISÃO**. Era hipótese em debate, não autorização do fundador.

### 7.3 Experimento app sem portfólio / BISU

Autorização: `rodadas/gpt/AUTORIZACAO_003B_04_APP_META_TESTE_SEM_PORTFOLIO.md`

Resultado: `rodadas/gpt/RESULTADO_003B_04_APP_META_TESTE_SEM_PORTFOLIO.md`

Status: **EXECUTADO — HIPÓTESE BISU REPROVADA**.

Fato central: `System-user access token` fica indisponível quando o app não está associado a Business Portfolio.

### 7.4 Experimento User Access Token — OAuth PASSOU, descoberta de Page BLOQUEADA

Autorização: `rodadas/gpt/AUTORIZACAO_003B_05_USER_ACCESS_TOKEN_E2E.md`

Status: **EM ANDAMENTO — NÃO É DECISÃO ARQUITETURAL DEFINITIVA**.

Cadeia já provada:

`configuração USER → OAuth real → token ACTIVE → escopos mínimos corretos`

Novo bloqueio observado:

- o código 003B chama `GET /me/accounts?fields=id,name,instagram_business_account` com o User Access Token;
- a chamada retornou lista vazia, portanto `pagesFound=0`;
- a UX exibiu `Falta a Página do seu negócio`;
- isso **não prova que a Página Quoron não existe**; prova apenas que nenhuma Page foi devolvida por `/me/accounts` para esta credencial;
- a documentação oficial Meta para Instagram API with Facebook Login usa `/me/accounts` com User Access Token para listar Pages gerenciadas pelo usuário;
- como `pages_show_list` foi realmente concedido, o problema atual não é ausência desse escopo.

Hipótese principal a verificar antes de mudar arquitetura: o perfil pessoal usado no OAuth pode administrar o portfólio Quoron sem ter a **Página Quoron atribuída diretamente a ele com acesso/tarefas reconhecidos por `/me/accounts`**.

A mensagem atual da UX é considerada imprecisa para esse cenário e deverá ser corrigida se a hipótese se confirmar.

## 8. Próxima ação autorizada

Próximo a agir: **fundador na configuração empresarial da Meta**.

Objetivo: verificar, sem criar/mover nada, se o perfil pessoal usado no OAuth possui a Página **Quoron** entre seus ativos diretamente atribuídos.

Caminho recomendado no portfólio Quoron:

1. abrir **Configurações do negócio / Business Settings** do portfólio Quoron;
2. entrar em **Usuários → Pessoas**;
3. selecionar o próprio perfil pessoal usado no OAuth;
4. abrir **Ativos atribuídos / Assigned assets**;
5. verificar se a **Página Quoron** aparece e qual nível/tarefa de acesso está atribuído;
6. se a Página não estiver atribuída, não alterar nada ainda: retornar ao GPT com a tela;
7. se estiver atribuída, retornar ao GPT com a tela mostrando Página + nível de acesso.

Até essa verificação, **não** adicionar `business_management`, não reautorizar outra vez, não criar nova Page/Instagram/portfolio e não mudar a arquitetura.

## 9. Continua NÃO autorizado

- declarar User Access Token arquitetura definitiva antes do E2E e da análise de ciclo de vida/segurança;
- remover suporte BISU;
- adicionar `business_management` ou `ads_management` por tentativa;
- associar o app E2E ao portfólio Quoron apenas para habilitar BISU;
- substituir definitivamente o app oficial;
- criar novo portfólio empresarial;
- usar conta de terceiro;
- criar `Quoron 1`;
- inventar site/domínio;
- mover Página Quoron ou `@goquoron` entre portfólios;
- transferir a propriedade do app oficial;
- expor App Secret/token;
- persistir Page Access Token sem decisão arquitetural;
- criar campanha, anúncio ou gasto;
- importar conteúdo do Instagram;
- iniciar Fase 4;
- promover/mergear a 003B antes do E2E real, sondas e auditoria final.

## 10. Pendências não bloqueantes

- se USER passar no E2E, revisar formalmente duração/expiração, renovação/reautorização, revogação, impacto em Ads e segurança antes de decidir arquitetura definitiva;
- decidir se Page Access Token precisará ser persistido apenas se o E2E provar necessidade material;
- harmonização dos canônicos antigos com `PAID_MEDIA_CANONICAL.md` antes da próxima rodada substantiva pós-003B;
- revisar onboarding final para não depender de configurações manuais desnecessárias no painel Meta;
- corrigir UX para não afirmar inexistência de Page quando a API apenas devolve lista vazia;
- logger Next dev registra URL do callback com `code`/`state`: tratar redaction antes de produção;
- leaked-password protection antes de produção;
- SMTP/domínio de produção;
- default ACL residual de `supabase_admin` enquanto inerte;
- App Review/Business Verification quando aplicável à fase comercial.
