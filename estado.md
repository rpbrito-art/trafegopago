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

Última rodada promovida: **003A — Meta Connection Foundation**.

Promoção:

- PR #11 — **MERGED**;
- merge commit: `546838db8e7ced4e9045c05feb8c7b2f0c476cc2`;
- head reconciliado auditado: `046c2e7583e823fb18d5667973680874c387eadb`;
- CI final: `32772710738` — verde em install, lint, typecheck, Edge Functions, testes e build.

## 3. 003A — resultado promovido

A 003A está **EXECUTADA, AUDITADA E PROMOVIDA**.

Entregue e provado:

- Facebook Login for Business com Graph API v26.0;
- OAuth com `state` de uso único e membership reconferida;
- `meta_connections` e Vault como fronteira do token;
- token ausente do browser e protegido server-side;
- conexão real com a Meta;
- classificação da credencial real como BISU por `client_business_id`;
- desconexão BISU guiada por **Configurações do negócio > Apps conectados**;
- marcador persistente de remoção externa;
- prova contextual fail-closed após remoção;
- `190` genérico continua NÃO sendo tratado como prova de revogação;
- desconexão real ponta a ponta aprovada.

Auditoria final:

`rodadas/gpt/AUDITORIA_FINAL_003A_E2E_META_CONNECTION.md`

Auditorias/correções intermediárias permanecem em `rodadas/gpt/` como evidência histórica.

## 4. Estado remoto após o E2E

A conexão real usada no gate (`9d256edf-0a89-4436-8d60-f375bc087c08`) terminou corretamente:

- `status = REVOKED`;
- `disconnected_at = 2026-08-24 20:09:44.634706+00`;
- `external_disconnect_pending_at = null`;
- `token_secret_reference = null`;
- segredo correspondente ausente do Vault.

Supabase:

- histórico remoto = **14 migrations**;
- `20260824170000_add_meta_external_disconnect_pending.sql` aplicada e auditada.

Nenhuma conexão Meta ativa ficou aberta por esse fixture.

## 5. Decisões persistentes da 003A

- `debug_token.type=SYSTEM_USER` não basta para classificar BISU; usar `client_business_id`/contrato observável;
- BISU não deve usar `oauth/revoke`, `/permissions` ou `/access_tokens` como caminho de revogação do produto;
- falha/ambiguidade do provider preserva token e estado local;
- a remoção instalada ocorre em **Apps conectados**, não em `Contas > Apps`;
- a assinatura `190/464` só vale como pós-condição dentro do fluxo BISU previamente marcado e com os controles da 003A-10;
- redaction da URL de callback/log continua pendência antes de produção.

## 6. Rodada 003B — planejamento concluído

Mandato preparado:

`rodadas/gpt/RODADA_003B_META_ASSET_DISCOVERY_SELECTION.md`

Status da 003B:

**PLANEJADA PELO GPT — AGUARDANDO AUTORIZAÇÃO EXPLÍCITA DO FUNDADOR — NÃO AUTORIZADA PARA CLAUDE CODE**.

Objetivo:

- descobrir e selecionar a conta profissional do Instagram que alimentará a Fase 4;
- implementar persistência tenant-safe de `instagram_accounts`;
- suportar descoberta/seleção opcional de `ad_accounts` quando `ads_read` tiver sido efetivamente concedido;
- provar capacidade de leitura/Insights sem importar posts ainda.

### Decisão de capacidade

A conexão Meta não será monolítica:

- Instagram orgânico/Insights é a capacidade principal;
- conta de anúncios é ramo opcional;
- ausência de `ads_read` ou de Ad Account não invalida o Instagram nem bloqueia o caminho orgânico.

### Revalidação Meta 2026-08-24

Para o caminho já escolhido pelo projeto — **Instagram API with Facebook Login + Facebook Login for Business + `graph.facebook.com`** — o planejamento parte de:

- `pages_show_list`;
- `pages_read_engagement`;
- `instagram_basic`;
- `instagram_manage_insights`;
- `ads_read` somente como capacidade opcional/read-only de Ad Account.

Não solicitar inicialmente:

- `ads_management`;
- `business_management`;
- permissões de publicação/comentários/leads.

A documentação atual da Meta registra que Insights pode exigir também `ads_management` + `ads_read` quando o papel sobre a Page vier via Business Manager. Essa condição deve ser **provada no E2E**. Se ocorrer, Claude deve parar para decisão GPT; não ampliar escopos por conta própria.

### Gate externo planejado

Quando a execução for autorizada, o GPT conduzirá a configuração manual na Meta.

Preferência: criar uma nova configuração Facebook Login for Business para a 003B, preservando a configuração histórica da 003A.

Nome interno sugerido: `Quoron Instagram Dev Login`.

Pretendido:

- General;
- System-user access token/BISU;
- 60 dias em desenvolvimento;
- assets Pages + Instagram Accounts + Ad Accounts;
- permissões mínimas acima.

Se as permissões Instagram não estiverem disponíveis no painel, não criar novo App ID por tentativa; primeiro confirmar/habilitar o produto/use case correto no app atual.

## 7. Próxima ação autorizada

**Nenhuma execução pelo Claude está autorizada ainda.**

Próxima decisão humana: fundador autorizar ou ajustar o mandato `RODADA_003B_META_ASSET_DISCOVERY_SELECTION.md`.

Se autorizado, o GPT atualizará este estado para execução e somente então o Claude poderá iniciar a 003B via `/proxima`.

## 8. Continua NÃO autorizado

Até autorização explícita da 003B:

- Claude iniciar a 003B;
- novo OAuth;
- criar/alterar configuração Meta para a 003B;
- adicionar permissões por tentativa;
- novo Meta App ID;
- selecionar/remover/reassociar ativos no painel Meta;
- criar anúncios ou gerar gasto;
- importar conteúdo do Instagram;
- persistir Page Access Token;
- iniciar Fase 4.

## 9. Pendências não bloqueantes

- logger Next dev registra URL do callback com `code`/`state`: tratar redaction antes de produção;
- leaked-password protection antes de produção;
- SMTP/domínio de produção;
- default ACL residual de `supabase_admin` enquanto inerte;
- App Review/Business Verification quando aplicável à fase comercial.
