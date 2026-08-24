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

## 6. Rodada 003B — AUTORIZADA

Mandato técnico:

`rodadas/gpt/RODADA_003B_META_ASSET_DISCOVERY_SELECTION.md`

Autorização explícita do fundador:

`rodadas/gpt/AUTORIZACAO_003B_EXECUCAO.md`

Status da 003B:

**AUTORIZADA PELO FUNDADOR — CLAUDE CODE PODE INICIAR A EXECUÇÃO — CONFIGURAÇÃO EXTERNA META CONTINUA SOB GATE DO GPT**.

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

## 7. Próxima ação autorizada

Claude Code deve iniciar a 003B via `/proxima`.

Pode:

1. executar preflight não destrutivo;
2. criar branch/PR próprios da 003B;
3. implementar o escopo técnico do mandato;
4. criar migrations/testes/provas proporcionais ao risco;
5. avançar até o ponto em que configuração externa Meta ou OAuth real sejam necessários.

Ao chegar ao gate externo, deve parar e devolver fatos objetivos ao GPT.

O fundador não deve alterar nada manualmente na Meta até instrução do GPT.

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
