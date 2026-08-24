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

## 6. Rodada 003B — EM EXECUÇÃO

Mandato técnico:

`rodadas/gpt/RODADA_003B_META_ASSET_DISCOVERY_SELECTION.md`

Autorização explícita do fundador:

`rodadas/gpt/AUTORIZACAO_003B_EXECUCAO.md`

Status da 003B:

**CÓDIGO, MIGRATION E PROVAS DE BANCO EXECUTADOS — GATE DE CONFIGURAÇÃO EXTERNA META AGUARDANDO GPT — 003B NÃO PROMOVIDA**.

Branch: `claude/rodada-003b-meta-asset-discovery-selection`.

Relatório: `rodadas/claude/RELATORIO_RODADA_003B_META_ASSET_DISCOVERY_SELECTION.md`.

Entregue e provado nesta sessão:

- `instagram_accounts` e `ad_accounts` com FK composta contra `meta_connections (organization_id, id)`, grant por coluna (external ids fora do browser), RLS por membership e funções de seleção `invoker` restritas a `service_role`;
- capacidade derivada de `granted_scopes` reais: `instagram_discovery`, `instagram_insights`, `ads_discovery`;
- descoberta server-side de Páginas/Instagram e de contas de anúncios, com paginação por cursor reconstruído contra o host controlado — `paging.next` do provider nunca é seguido;
- toda seleção redescobre o ativo contra a Meta antes de gravar; id arbitrário falha fechado sem escrita;
- `190` do provider vira estado de tela, nunca mutação local — a decisão da 003A permanece intacta;
- ausência de `ads_read` continua sendo capacidade inexistente, não conexão quebrada;
- UI de escolha em linguagem de negócio, sem escopo, id externo ou versão de API.

Migration `20260824210000_create_meta_asset_selection.sql` aplicada após checkpoint publicado. Histórico remoto: **15 migrations**; **10 tabelas** em `public`, todas com RLS; nenhuma função `SECURITY DEFINER` nova.

Provas: 63 testes novos, 245/245 no módulo Meta e actions, typecheck/lint limpos, prova de banco `scripts/sql/meta-assets-003b-proof.sql` **41/41 sem falhas**, advisors sem alerta novo.

A frase antiga do cabeçalho do mandato que dizia `AGUARDANDO AUTORIZAÇÃO DO FUNDADOR — NÃO EXECUTAR AINDA` está superada exclusivamente por esta autorização e por este `estado.md`; o restante do mandato permanece vigente.

Objetivo:

- descobrir e selecionar a conta profissional do Instagram que alimentará a Fase 4;
- implementar persistência tenant-safe de `instagram_accounts`;
- suportar descoberta/seleção opcional de `ad_accounts` quando `ads_read` tiver sido efetivamente concedido;
- provar capacidade de leitura/Insights sem importar posts ainda.

### Decisão de capacidade

- Instagram orgânico/Insights é a capacidade principal;
- conta de anúncios é ramo opcional;
- ausência de `ads_read` ou de Ad Account não invalida o Instagram nem bloqueia o caminho orgânico.

### Escopos pretendidos

Para o caminho **Instagram API with Facebook Login + Facebook Login for Business + `graph.facebook.com`**:

- `pages_show_list`;
- `pages_read_engagement`;
- `instagram_basic`;
- `instagram_manage_insights`;
- `ads_read` somente como capacidade opcional/read-only de Ad Account.

Não solicitar inicialmente:

- `ads_management`;
- `business_management`;
- permissões de publicação/comentários/leads.

Se o E2E provar necessidade material de `ads_management`, Page Access Token persistente ou outra ampliação arquitetural, Claude deve parar em `DECISÃO ARQUITETURAL NECESSÁRIA — AGUARDANDO GPT`.

## 6.1 Gate aberto — configuração externa Meta

O E2E do mandato §7 não pôde ser executado: depende de ação do GPT/fundador no painel Meta.

Falta, nesta ordem:

1. criar a nova *business login configuration* da 003B com os escopos de §2 e ativos Pages + Instagram Accounts + Ad Accounts;
2. informar o novo `config_id` para `META_LOGIN_CONFIG_ID` (não é segredo);
3. autorizar o OAuth real;
4. fundador escolhe o Instagram na tela `/conta`;
5. `node scripts/meta-assets-003b-probe.mjs` executa as sondas read-only de IG User, Insights e contas de anúncios.

Se a sonda mostrar necessidade de Page Access Token persistente ou de `ads_management`, o desfecho é `DECISÃO ARQUITETURAL NECESSÁRIA — AGUARDANDO GPT`. Nada será ampliado por conta própria.

## 7. Próxima ação autorizada

O trabalho autônomo da 003B está concluído. **Claude Code está parado no gate.**

Próximo a agir: **GPT** — conduzir o fundador na configuração externa da Meta e devolver o resultado técnico do gate (novo `config_id` e liberação do OAuth real).

Claude Code só retoma a 003B ao receber esse resultado. Até lá não deve executar OAuth, alterar painel Meta, ampliar escopo nem promover a rodada.

## 8. Continua NÃO autorizado

Mesmo com a 003B autorizada, continua proibido ao Claude/fundador sem novo gate GPT:

- criar/alterar configuração Facebook Login for Business no painel Meta por conta própria;
- adicionar permissões por tentativa;
- criar novo Meta App ID;
- executar novo OAuth real antes do gate;
- selecionar/remover/reassociar ativos manualmente no painel Meta sem instrução;
- persistir Page Access Token sem decisão arquitetural;
- solicitar `ads_management` ou `business_management` automaticamente;
- criar anúncios ou gerar gasto;
- importar conteúdo do Instagram;
- iniciar Fase 4.

## 9. Pendências não bloqueantes

- logger Next dev registra URL do callback com `code`/`state`: tratar redaction antes de produção;
- leaked-password protection antes de produção;
- SMTP/domínio de produção;
- default ACL residual de `supabase_admin` enquanto inerte;
- App Review/Business Verification quando aplicável à fase comercial.
