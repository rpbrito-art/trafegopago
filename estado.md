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

A 003A está **EXECUTADA, AUDITADA E PROMOVIDA**. Permanecem canônicos: Facebook Login for Business + Graph API v26.0; token Meta server-side no Vault; OAuth `state` de uso único; membership reconferida; BISU classificado por `client_business_id`; desconexão BISU por remoção da integração em Apps conectados; `190` genérico não prova revogação; assinatura `190/464` só vale no fluxo de remoção externa previamente marcado e com prova composta; E2E real de desconexão 003A concluído.

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

App oficial/dev corrente: **Trafego Pago Business Dev** — App ID `2940404272985831`.

Configuração usada pelo produto até aqui:

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

### Diagnóstico de permissões e correção externa

No primeiro OAuth real 003B, apesar de Página + Instagram terem sido selecionados, o token veio somente com:

- `pages_show_list`;
- `pages_read_engagement`;
- `public_profile`.

Faltaram `instagram_basic` e `instagram_manage_insights`.

A investigação no Meta for Developers provou que o caso de uso Instagram ainda não estava habilitado no caminho correto. Foi adicionado **Gerenciar mensagens e conteúdo no Instagram** e habilitado **Instagram API setup with Facebook Login**. `instagram_basic` + `instagram_manage_insights` foram salvos na configuração `Quoron Instagram Dev Login`.

O token já emitido não ganha novos escopos retroativamente.

## 6. Conexão real atual — PRESERVAR

Conexão real atual:

- id: `655da6e6-9056-456d-a81d-5e2570da5faf`;
- status: **ACTIVE**;
- referência de token no Vault: presente;
- escopos atuais persistidos: `pages_show_list`, `pages_read_engagement`, `public_profile`;
- `instagram_accounts`: 0 linhas;
- `ad_accounts`: 0 linhas.

Auditoria independente após a 003B-03 confirmou que o Claude não alterou essa conexão. A tentativa de reautorização descrita abaixo **não foi concluída**, portanto nenhum novo token foi persistido.

## 7. Gate E2E atual

### 7.1 Bloqueio observado — portfólio dono do app não elegível como cliente

Gate: `rodadas/gpt/GATE_003B_PORTFOLIO_DONO_DO_APP_NAO_ELEGIVEL_COMO_CLIENTE.md`

Na reautorização real, o seletor **Portfólio empresarial** exibiu **Quoron** desabilitado com a mensagem literal:

`This Meta Business Account owns the app`

O diálogo selecionou **Criar um portfólio empresarial** e, ao avançar, passou a pedir dados para uma nova empresa/novos ativos, inclusive nome, e-mail, país e site.

Fato consolidado: neste fluxo/configuração, o portfólio que possui o app não pode ocupar também o papel de portfólio cliente integrado.

### 7.2 Registro 003B-04 anterior — decisão prematura anulada

Arquivo de trilha: `rodadas/gpt/DECISAO_003B_04_SEPARAR_PROVEDOR_E_CLIENTE_FIXTURE.md`

Status: **ANULADO COMO DECISÃO**. O fundador estava apenas debatendo e não havia autorizado aquela solução.

### 7.3 Experimento 003B-04 — app Meta de teste sem portfólio

Autorização: `rodadas/gpt/AUTORIZACAO_003B_04_APP_META_TESTE_SEM_PORTFOLIO.md`

Status: **AUTORIZADO PARA EXPERIMENTO CONTROLADO — NÃO É DECISÃO ARQUITETURAL DEFINITIVA**.

Motivo:

- o fundador não quer usar conta de terceiro;
- não dispõe atualmente de outro portfólio empresarial utilizável;
- não quer assumir custo pago apenas para destravar o teste;
- há evidência contemporânea de que um Meta App pode ser criado escolhendo `I don't want to connect a business portfolio yet` e depois receber Facebook Login for Business.

Hipótese a provar: um segundo app exclusivamente de desenvolvimento, sem portfólio conectado na criação, poderá apresentar o portfólio Quoron como cliente porque Quoron não será dono desse app de teste.

## 8. Próxima ação autorizada

Próximo a agir: **fundador no Meta for Developers**.

Criar **somente** um novo Meta App de teste, sem conectá-lo a Business Portfolio durante a criação.

Sequência esperada:

1. Meta for Developers → Meus aplicativos → Criar aplicativo;
2. nome sugerido: `Trafego Pago E2E Test`;
3. escolher o caminho que permita um app do tipo **Business** / criação sem caso de uso, conforme a UI disponível;
4. quando a Meta perguntar qual Business Portfolio conectar, escolher **`I don't want to connect a business portfolio yet` / `Não quero conectar um portfólio empresarial ainda`**;
5. concluir a criação até chegar ao dashboard do novo app;
6. **parar no dashboard** e retornar ao GPT com a tela/resultado.

Não revelar App Secret no chat.

Depois disso o GPT verifica no painel real se esse app oferece Facebook Login for Business e se permite criar a configuração com System-user access token antes de autorizar qualquer alteração local.

## 9. Continua NÃO autorizado

- conectar o novo app de teste ao portfólio Quoron durante a criação;
- substituir definitivamente o app oficial;
- alterar ainda `.env.local` para o novo app;
- criar configuração de login no novo app antes do próximo gate do GPT;
- criar novo portfólio empresarial;
- usar conta de terceiro;
- criar `Quoron 1`;
- inventar site/domínio;
- mover Página Quoron ou `@goquoron` entre portfólios;
- transferir a propriedade do app oficial;
- trocar BISU por User Access Token sem decisão arquitetural;
- desconectar a conexão real atual;
- remover novamente a integração em Apps conectados;
- apagar a configuração histórica da 003A;
- migrar para Instagram Login/`instagram_business_*`;
- persistir Page Access Token sem decisão arquitetural;
- criar campanha, anúncio ou gasto;
- importar conteúdo do Instagram;
- iniciar Fase 4;
- promover/mergear a 003B antes do E2E real, sondas e auditoria final.

## 10. Pendências não bloqueantes

- investigar, sem presumir resultado, como o próprio Quoron poderá usar o SaaS sendo o portfólio dono do app em produção;
- harmonização dos canônicos antigos com `PAID_MEDIA_CANONICAL.md` antes da próxima rodada substantiva pós-003B;
- revisar onboarding final para não depender de configurações manuais desnecessárias no painel Meta;
- logger Next dev registra URL do callback com `code`/`state`: tratar redaction antes de produção;
- leaked-password protection antes de produção;
- SMTP/domínio de produção;
- default ACL residual de `supabase_admin` enquanto inerte;
- App Review/Business Verification quando aplicável à fase comercial.
