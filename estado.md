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

Promoção 003A:

- PR #11 — MERGED;
- merge commit: `546838db8e7ced4e9045c05feb8c7b2f0c476cc2`;
- CI final: `32772710738` — verde.

## 3. Baseline promovido da 003A

A 003A está **EXECUTADA, AUDITADA E PROMOVIDA**.

Persistem como decisões:

- Facebook Login for Business + Graph API v26.0;
- token Meta server-side no Vault;
- `state` OAuth de uso único e membership reconferida;
- credencial real classificada como BISU por `client_business_id`;
- BISU não usa `oauth/revoke`, `/permissions` ou `/access_tokens` como revogação do produto;
- remoção instalada ocorre em **Configurações do negócio > Apps conectados**;
- `190` genérico não prova revogação;
- assinatura `190/464` só vale no fluxo BISU previamente marcado com os controles promovidos;
- desconexão real foi provada ponta a ponta e o fixture terminou `REVOKED`, sem segredo no Vault.

Supabase após a 003A: 14 migrations.

## 4. Rodada 003B — EM EXECUÇÃO

Mandato:

`rodadas/gpt/RODADA_003B_META_ASSET_DISCOVERY_SELECTION.md`

Autorização:

`rodadas/gpt/AUTORIZACAO_003B_EXECUCAO.md`

Branch:

`claude/rodada-003b-meta-asset-discovery-selection`

PR: **#12 draft**.

HEAD atual auditado:

`77f7c8288208b5b97fe0367ef48c6ad08b1329dd`

CI:

`32779213462` — verde em install, lint, typecheck, Edge Functions, testes e build.

### Executado e comprovado

- migration `20260824210000_create_meta_asset_selection.sql` aplicada depois de checkpoint versionado;
- histórico remoto = **15 migrations**;
- `instagram_accounts` e `ad_accounts` presentes;
- zero linhas residuais nas duas tabelas antes do E2E;
- zero conexões Meta `ACTIVE` antes do novo E2E;
- RLS habilitado nas tabelas novas;
- `authenticated` sem INSERT/UPDATE/DELETE;
- external ids fora dos grants SELECT de `authenticated`;
- `select_instagram_account` e `select_ad_account` são `security invoker`, sem EXECUTE para `authenticated`/`anon` e com EXECUTE para `service_role`;
- descoberta/seleção, capabilities e UX implementadas;
- nenhuma configuração Meta nova nem OAuth real executados ainda.

Esses itens estão **executados**, mas a 003B ainda não está promovida.

## 5. Correção 003B-01 — AUDITADA E APROVADA

Correção:

`rodadas/gpt/CORRECAO_003B_01_FAIL_CLOSED_METADATA_E_MEMBERSHIP.md`

Auditoria:

`rodadas/gpt/AUDITORIA_003B_01_FAIL_CLOSED_METADATA_E_MEMBERSHIP.md`

Status:

**003B-01 EXECUTADA, AUDITADA E APROVADA — GATE EXTERNO META LIBERADO — 003B AINDA NÃO PROMOVIDA**.

### Resultado A — metadata IG fail-closed

`lerMetadadosInstagram` distingue:

- 2xx com campos opcionais ausentes → candidato válido com campos nulos;
- 4xx/5xx, rede quebrada ou corpo ilegível → falha de domínio sanitizada, sem candidato gravável e sem RPC de seleção.

Uma conta ilegível derruba a descoberta inteira; não há lista parcial que esconda o problema.

### Resultado B — membership temporal

`selectInstagramAccount` e `selectAdAccount` reconferem membership imediatamente antes da RPC privilegiada, depois das chamadas externas.

Se a membership cair durante a redescoberta, nenhuma seleção é persistida.

## 6. Estado remoto atual

Supabase:

- 15 migrations;
- `20260824210000` aplicada;
- `instagram_accounts`: 0 linhas antes do E2E;
- `ad_accounts`: 0 linhas antes do E2E;
- conexões Meta `ACTIVE`: 0 antes do E2E.

Nenhum novo OAuth da 003B foi feito e nenhum token novo está ativo.

## 7. Gate externo da Meta — PRÓXIMA AÇÃO AUTORIZADA

Próximo a agir: **GPT + fundador**.

Objetivo do gate:

1. criar uma nova Business Login Configuration para a 003B, preservando a configuração histórica da 003A;
2. usar o mesmo App ID real `2940404272985831`;
3. nome sugerido: `Quoron Instagram Dev Login`;
4. configuração pretendida: General + System-user access token/BISU + 60 dias;
5. tipos de ativos: Pages + Instagram Accounts + Ad Accounts;
6. permissões iniciais:
   - `pages_show_list`;
   - `pages_read_engagement`;
   - `instagram_basic`;
   - `instagram_manage_insights`;
   - `ads_read` opcional/read-only.
7. NÃO solicitar inicialmente:
   - `ads_management`;
   - `business_management`;
   - publicação/comentários/leads.
8. após criar, obter o novo `config_id` e atualizar `META_LOGIN_CONFIG_ID` localmente antes do OAuth real.

Se `instagram_basic` ou `instagram_manage_insights` não aparecerem disponíveis, não criar novo App ID nem adicionar permissões por tentativa; GPT deve reavaliar o use case/produto atual do mesmo app.

## 8. Continua NÃO autorizado

Até o gate avançar sob instrução do GPT:

- Claude alterar painel Meta;
- criar novo Meta App ID;
- ampliar permissões por tentativa;
- persistir Page Access Token;
- solicitar `ads_management` ou `business_management` automaticamente;
- criar anúncios ou gerar gasto;
- importar conteúdo do Instagram;
- iniciar Fase 4;
- promover/mergear a 003B antes do E2E real.

## 9. Pendências não bloqueantes

- logger Next dev registra URL do callback com `code`/`state`: tratar redaction antes de produção;
- leaked-password protection antes de produção;
- SMTP/domínio de produção;
- default ACL residual de `supabase_admin` enquanto inerte;
- App Review/Business Verification quando aplicável à fase comercial.
