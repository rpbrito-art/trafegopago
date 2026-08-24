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

## 6. Próxima etapa

A Fase 3 ainda não está encerrada porque o roadmap inclui seleção/descoberta de Instagram e conta de anúncios.

Próxima rodada substantiva esperada: **003B — seleção/descoberta de ativos Meta e permissões necessárias para a leitura real**.

### Estado da 003B

- **planejada em alto nível pelo roadmap**;
- **ainda não possui mandato executivo nesta linha de estado**;
- **não está autorizada para execução pelo Claude Code**.

Próxima ação autorizada: **GPT planejar a 003B**, revalidando documentação Meta vigente e definindo o mandato/READ SET antes de qualquer execução.

## 7. Continua NÃO autorizado

Até existir novo mandato explícito:

- Claude iniciar 003B por conta própria;
- novo OAuth apenas por tentativa;
- nova remoção/reassociação no painel Meta sem objetivo de rodada;
- criar anúncios ou gerar gasto;
- importar conteúdo do Instagram antes da capacidade correspondente;
- iniciar Fase 4 antes do fechamento necessário da Fase 3.

## 8. Pendências não bloqueantes

- escopos `ads_*`/`business_management` e seleção detalhada de ativos entram na análise da 003B;
- logger Next dev registra URL do callback com `code`/`state`: tratar redaction antes de produção;
- leaked-password protection antes de produção;
- SMTP/domínio de produção;
- default ACL residual de `supabase_admin` enquanto inerte;
- App Review/Business Verification quando aplicável à fase comercial.