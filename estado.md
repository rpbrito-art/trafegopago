# ESTADO — Tráfego Pago

Atualizado: 2026-08-24

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

HEAD de código auditado: `9991ab9b8e22c549bb52b9a0ea7b03ee09f309f8`

Última CI de código auditado: `32779213462` — verde em install, lint, typecheck, Edge Functions, testes e build.

Executado/auditado na 003B até aqui:

- migration `20260824210000_create_meta_asset_selection.sql` aplicada;
- remoto com 15 migrations;
- `instagram_accounts` e `ad_accounts` presentes;
- RLS/grants/funções de seleção auditados;
- descoberta/seleção, capabilities e UX implementadas;
- Correção 003B-01 fail-closed metadata + membership: **EXECUTADA, AUDITADA E APROVADA**;
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

App: **Trafego Pago Business Dev** — App ID `2940404272985831`.

Configuração usada pelo produto:

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
- Instagram profissional: **@goquoron**;
- ambos aparecem no Facebook Login for Business.

### Diagnóstico de permissões e correção externa

No primeiro OAuth real 003B, apesar de Página + Instagram terem sido selecionados, o token veio somente com:

- `pages_show_list`;
- `pages_read_engagement`;
- `public_profile`.

Faltaram:

- `instagram_basic`;
- `instagram_manage_insights`.

A investigação no Meta for Developers provou que o caso de uso Instagram ainda não estava habilitado no caminho correto. Foi adicionado **Gerenciar mensagens e conteúdo no Instagram**, e distinguimos os dois caminhos:

- **Instagram Login** / `instagram_business_*` — NÃO é o caminho desta arquitetura;
- **Instagram API setup with Facebook Login** — caminho correto, compatível com `graph.facebook.com` e com o backend atual.

O fundador habilitou o setup com Facebook Login e salvou `instagram_basic` + `instagram_manage_insights` na configuração `Quoron Instagram Dev Login`.

A configuração externa está, portanto, preparada para novo consentimento. O token já emitido não ganha novos escopos retroativamente.

## 6. Conexão real atual — PRESERVAR

Conexão real atual:

- id: `655da6e6-9056-456d-a81d-5e2570da5faf`;
- status: **ACTIVE**;
- referência de token no Vault: presente;
- escopos atuais persistidos: `pages_show_list`, `pages_read_engagement`, `public_profile`;
- `instagram_accounts`: 0 linhas;
- `ad_accounts`: 0 linhas.

Essa conexão deve permanecer intacta até a reautorização controlada.

## 7. Correção 003B-03 — EXECUTADA

Correção: `rodadas/gpt/CORRECAO_003B_03_REAUTORIZACAO_CONEXAO_ATIVA.md`

Autorização: `rodadas/gpt/AUTORIZACAO_003B_03_REAUTORIZACAO_CONEXAO_ATIVA.md`

Status: **EXECUTADA — AGUARDANDO AUDITORIA GPT**.

Diagnóstico técnico já feito pelo GPT:

- o backend **já suporta** reautorização sobre conexão viva;
- `startMetaAuthorization` cria nova intenção sem destruir a conexão atual;
- `completeMetaAuthorization` só retoma a conexão depois que a troca de `code` por token já teve sucesso;
- `begin_meta_connection` reutiliza a linha viva e preserva o token anterior ao entrar em `PENDING`;
- `activate_meta_connection` substitui token + escopos + identidade + status atomicamente;
- não é necessária migration nem endpoint novo.

Delta autorizado:

- no estado `permissao-faltando`, renderizar `MetaConnectButton` com rótulo **Atualizar autorização**;
- ajustar a mensagem em linguagem de negócio;
- reutilizar integralmente o fluxo OAuth/backend existente;
- adicionar os testes definidos na correção;
- não alterar backend, RPC ou migration por conveniência.

### 7.1 Execução

O diagnóstico do GPT foi conferido antes de implementar: **nenhum bloqueio arquitetural**. `startMetaAuthorization` só cria a intenção; `completeMetaAuthorization` só chama `begin_meta_connection` depois de a troca do `code` ter dado certo; `begin_meta_connection` retoma a linha viva preservando o token anterior; `activate_meta_connection` substitui segredo, escopos, identidade e status numa transação. Backend, RPC e migration **não foram tocados**.

Delta aplicado, só de UI:

- ramo `permissao-faltando` explica que a conexão existe e falta ampliar o acesso ao Instagram, avisa que a conexão atual continua valendo, e renderiza `MetaConnectButton` com o rótulo **Atualizar autorização**;
- o aviso de desfecho `sem-permissao` passou ao mesmo vocabulário, para não mandar reconectar de um lado e ampliar do outro.

Provas: `vitest run src/components/meta/meta-assets-section.test.tsx` 24/24 — botão presente com rótulo e organização corretos, `connectMetaAction` reutilizada, tela não sugere desconectar, nenhum outro estado ganha botão. Regressão do módulo Meta e actions 260/260; typecheck e lint limpos.

Preservado: conexão `655da6e6-9056-456d-a81d-5e2570da5faf` continua **ACTIVE** com os escopos antigos; nenhum token apagado, nenhuma integração removida, nenhum OAuth repetido, nada tocado no painel Meta.

## 8. Próxima ação autorizada

Status: **003B-03 EXECUTADA — AGUARDANDO AUDITORIA GPT**.

Próximo a agir: **GPT** — auditar o delta da 003B-03 no PR #12.

Aprovada a auditoria, o gate humano da §5 da correção é: fundador clica **Atualizar autorização** no localhost, seleciona portfólio Quoron, Página Quoron e `@goquoron`, conclui o consentimento; o GPT audita os escopos do novo token; a descoberta então deve oferecer `@goquoron`.

Claude Code retoma depois disso para provar a linha em `instagram_accounts` e rodar `node scripts/meta-assets-003b-probe.mjs`, parando em `DECISÃO ARQUITETURAL NECESSÁRIA — AGUARDANDO GPT` se a sonda apontar Page Access Token ou `ads_management`.

Nenhum novo OAuth real antes da auditoria.

## 9. Continua NÃO autorizado

- desconectar a conexão real atual;
- remover novamente a integração em Apps conectados;
- repetir OAuth manualmente antes da Correção 003B-03 ser executada e auditada;
- Claude alterar painel Meta;
- apagar a configuração histórica da 003A;
- criar novo Meta App ID;
- migrar a arquitetura para Instagram Login/`instagram_business_*`;
- persistir Page Access Token sem decisão arquitetural;
- criar campanha, anúncio ou gasto;
- importar conteúdo do Instagram;
- iniciar Fase 4;
- promover/mergear a 003B antes do E2E real, sondas e auditoria final.

## 10. Pendências não bloqueantes

- harmonização dos canônicos antigos com `PAID_MEDIA_CANONICAL.md` antes da próxima rodada substantiva pós-003B;
- revisar onboarding final para não depender de configurações manuais desnecessárias no painel Meta;
- melhorar a mensagem `Falta uma autorização` para explicar a capacidade faltante em linguagem de negócio — incluído na Correção 003B-03;
- logger Next dev registra URL do callback com `code`/`state`: tratar redaction antes de produção;
- leaked-password protection antes de produção;
- SMTP/domínio de produção;
- default ACL residual de `supabase_admin` enquanto inerte;
- App Review/Business Verification quando aplicável à fase comercial.
