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

App oficial/dev anterior: **Trafego Pago Business Dev** — App ID `2940404272985831`.

Configuração BISU anterior da 003B:

- nome: `Quoron Instagram Dev Login`;
- Configuration ID: `38307908848822330`;
- variação: General;
- token: System-user access token / BISU;
- ativos: Pages + Instagram Accounts.

Configuração histórica da 003A permanece existente e não deve ser apagada antes da promoção da 003B:

- `Trafego Pago Dev Login`;
- Configuration ID `1549901823029730`.

Ativos reais do portfólio **Quoron**:

- Página Facebook: **Quoron**;
- Instagram profissional: **@goquoron**.

No primeiro OAuth real 003B, o token veio somente com `pages_show_list`, `pages_read_engagement`, `public_profile`. Faltaram `instagram_basic` e `instagram_manage_insights`.

## 6. Conexão real atual — BASELINE PRÉ-OAUTH USER

Conexão atual:

- id: `655da6e6-9056-456d-a81d-5e2570da5faf`;
- status: **ACTIVE**;
- referência de token no Vault: presente;
- escopos: `pages_show_list`, `pages_read_engagement`, `public_profile`;
- expiração: `2026-10-23 23:30:58.46+00`;
- `instagram_accounts`: 0 linhas;
- `ad_accounts`: 0 linhas.

O GPT reconfirmou esse baseline diretamente no Supabase imediatamente antes de liberar o OAuth USER. Essa credencial é uma fixture intermediária da 003B e não possui os escopos necessários para completar Instagram/Insights.

## 7. Gates E2E

### 7.1 Portfólio dono do app não elegível como cliente

Na reautorização BISU, o seletor exibiu **Quoron** desabilitado com:

`This Meta Business Account owns the app`

Gate: `rodadas/gpt/GATE_003B_PORTFOLIO_DONO_DO_APP_NAO_ELEGIVEL_COMO_CLIENTE.md`

### 7.2 Registro 003B-04 anterior — decisão prematura anulada

`rodadas/gpt/DECISAO_003B_04_SEPARAR_PROVEDOR_E_CLIENTE_FIXTURE.md`

Status: **ANULADO COMO DECISÃO**. Era hipótese em debate, não autorização do fundador.

### 7.3 Experimento 003B-04 — app sem portfólio / BISU

Autorização: `rodadas/gpt/AUTORIZACAO_003B_04_APP_META_TESTE_SEM_PORTFOLIO.md`

Resultado: `rodadas/gpt/RESULTADO_003B_04_APP_META_TESTE_SEM_PORTFOLIO.md`

Status: **EXECUTADO — HIPÓTESE BISU REPROVADA**.

Fato central: `System-user access token` fica indisponível quando o app não está associado a Business Portfolio.

### 7.4 Experimento 003B-05 — User Access Token

Autorização: `rodadas/gpt/AUTORIZACAO_003B_05_USER_ACCESS_TOKEN_E2E.md`

Status: **AUTORIZADO PARA EXPERIMENTO CONTROLADO — NÃO É DECISÃO ARQUITETURAL DEFINITIVA**.

App E2E:

- `Trafego Pago E2E Test`;
- criado sem Business Portfolio;
- caso de uso Instagram no caminho **API setup with Facebook login**;
- `Login do Facebook para Empresas` disponível;
- configuração criada: **`Quoron E2E Login`**;
- Configuration ID: **`1068370819137366`**;
- token: **User Access Token**;
- etapa `Ativos` indisponível por desenho no modo USER;
- permissões mínimas configuradas no app/configuração para o experimento.

O fundador informou que já:

- cadastrou `http://localhost:3000/meta/callback` no app E2E;
- trocou localmente `META_APP_ID`, `META_APP_SECRET` e `META_LOGIN_CONFIG_ID=1068370819137366` no `.env.local`, sem expor o secret;
- preservou o redirect URI;
- reiniciou o servidor local.

### 7.5 Gate de substituição controlada da credencial — LIBERADO

Gate: `rodadas/gpt/GATE_003B_05_OAUTH_USER_SUBSTITUICAO_CONTROLADA.md`

Auditoria do código provou:

- antes de receber novo token, cancelamento/negação/troca de code falha sem substituir a credencial atual;
- `begin_meta_connection` retoma a conexão viva preservando o token existente;
- somente `activate_meta_connection`, após emissão do novo token, substitui o segredo no Vault e marca `ACTIVE`;
- se a ativação USER tiver sucesso, a credencial 003B atual será **conscientemente substituída** pelo User Access Token para o experimento.

Isso é aceitável dentro do experimento já autorizado porque a credencial atual é intermediária da 003B, não fecha Instagram e a evidência promovida da 003A não depende dessa conexão viva específica.

## 8. Próxima ação autorizada

Próximo a agir: **fundador no software local**.

1. abrir `http://localhost:3000/conta`;
2. clicar **Atualizar autorização**;
3. no diálogo Meta, entrar/continuar com a conta Facebook administradora usada no teste;
4. conceder somente o que a configuração `Quoron E2E Login` apresentar;
5. **não criar** Business Portfolio, Page, Instagram, Ad Account ou qualquer outro ativo;
6. se a Meta exigir `business_management`, `ads_management`, associação do app a portfólio ou criação de ativo, parar antes de aceitar e retornar ao GPT;
7. se o OAuth concluir e retornar ao localhost, **não clicar ainda em `Usar esta conta` / selecionar Instagram ou Ad Account**; retornar ao GPT para auditoria imediata do token/scopes/estado.

Após o retorno, o GPT audita Supabase antes da descoberta/seleção.

## 9. Continua NÃO autorizado

- declarar User Access Token arquitetura definitiva antes do E2E e da análise de ciclo de vida/segurança;
- remover suporte BISU;
- associar o app E2E ao portfólio Quoron apenas para habilitar BISU;
- substituir definitivamente o app oficial;
- criar novo portfólio empresarial;
- usar conta de terceiro;
- criar `Quoron 1`;
- inventar site/domínio;
- mover Página Quoron ou `@goquoron` entre portfólios;
- transferir a propriedade do app oficial;
- expor App Secret/token;
- ampliar permissões de escrita por tentativa;
- persistir Page Access Token sem decisão arquitetural;
- criar campanha, anúncio ou gasto;
- importar conteúdo do Instagram;
- iniciar Fase 4;
- promover/mergear a 003B antes do E2E real, sondas e auditoria final.

## 10. Pendências não bloqueantes

- se USER passar no E2E, revisar formalmente duração/expiração, renovação/reautorização, revogação, impacto em Ads e segurança antes de decidir arquitetura definitiva;
- investigar, sem presumir resultado, como o próprio Quoron usará o SaaS em produção caso o app definitivo permaneça no portfólio Quoron;
- harmonização dos canônicos antigos com `PAID_MEDIA_CANONICAL.md` antes da próxima rodada substantiva pós-003B;
- revisar onboarding final para não depender de configurações manuais desnecessárias no painel Meta;
- logger Next dev registra URL do callback com `code`/`state`: tratar redaction antes de produção;
- leaked-password protection antes de produção;
- SMTP/domínio de produção;
- default ACL residual de `supabase_admin` enquanto inerte;
- App Review/Business Verification quando aplicável à fase comercial.
