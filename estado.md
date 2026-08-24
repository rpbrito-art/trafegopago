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

## 4. Rodada 003B — execução inicial auditada parcialmente

Mandato:

`rodadas/gpt/RODADA_003B_META_ASSET_DISCOVERY_SELECTION.md`

Autorização:

`rodadas/gpt/AUTORIZACAO_003B_EXECUCAO.md`

Branch:

`claude/rodada-003b-meta-asset-discovery-selection`

PR: **#12 draft**.

HEAD auditado antes da correção:

`6fe1dac32912e11afab1382e0c9fdfbf6d39b920`

CI:

`32777340430` — verde em install, lint, typecheck, Edge Functions, testes e build.

### Executado e comprovado até aqui

- migration `20260824210000_create_meta_asset_selection.sql` aplicada depois de checkpoint versionado;
- histórico remoto = **15 migrations**;
- `instagram_accounts` e `ad_accounts` presentes;
- zero linhas residuais nas duas tabelas após o proof;
- zero conexões Meta `ACTIVE` antes do novo E2E;
- RLS habilitado nas tabelas novas;
- `authenticated` sem INSERT/UPDATE/DELETE;
- external ids fora dos grants SELECT de `authenticated`;
- `select_instagram_account` e `select_ad_account` são `security invoker`, sem EXECUTE para `authenticated`/`anon` e com EXECUTE para `service_role`;
- descoberta/seleção, capabilities e UX implementadas;
- nenhuma configuração Meta nova nem OAuth real executados.

Esses itens estão **executados**, mas a 003B ainda não está aprovada nem promovida.

## 5. Auditoria pré-gate — bloqueio 003B-01

Auditoria GPT encontrou dois pontos que precisam ser corrigidos **antes** de qualquer nova ação manual na Meta.

Correção vigente:

`rodadas/gpt/CORRECAO_003B_01_FAIL_CLOSED_METADATA_E_MEMBERSHIP.md`

Status:

**003B-01 AUTORIZADA — GATE EXTERNO META BLOQUEADO — AGUARDANDO EXECUÇÃO DO CLAUDE**.

### Bloqueio A — metadata IG falha aberto

`lerMetadadosInstagram` trata HTTP não-OK e falha de rede como `null`; `descobrirInstagram` então mantém o candidato e a seleção pode persistir.

Isso viola o mandato §6: `provider 4xx/5xx/rede em fail-closed`.

A correção deve separar:

- HTTP 2xx com campos opcionais ausentes → candidato válido com campos nulos;
- HTTP 4xx/5xx/rede → falha de domínio sanitizada, sem candidato gravável e sem RPC de seleção.

### Bloqueio B — membership precisa de recheck antes da escrita

A seleção valida membership antes da redescoberta na Meta, mas há chamadas externas antes da RPC privilegiada de persistência.

A correção deve reconferir membership imediatamente antes da RPC de seleção para Instagram e Ad Account.

## 6. Estado remoto atual

Supabase:

- 15 migrations;
- `20260824210000` aplicada;
- `instagram_accounts`: 0 linhas;
- `ad_accounts`: 0 linhas;
- conexões Meta `ACTIVE`: 0.

Nenhum novo OAuth da 003B foi feito e nenhum token novo está ativo.

## 7. Próxima ação autorizada

Claude Code deve executar **somente a Correção 003B-01**:

1. trazer a `main` atual para a branch 003B;
2. corrigir fail-closed da leitura de metadata do IG User;
3. adicionar recheck de membership imediatamente antes das RPCs de seleção;
4. adicionar testes focados;
5. rodar CI uma vez no HEAD final;
6. atualizar relatório;
7. parar em `003B-01 EXECUTADA — AGUARDANDO AUDITORIA GPT`.

Depois da auditoria GPT, se passar, o gate externo da Meta poderá ser retomado.

## 8. Continua NÃO autorizado

Até a 003B-01 passar na auditoria:

- criar/alterar configuração Facebook Login for Business no painel Meta;
- trocar `META_LOGIN_CONFIG_ID`;
- novo OAuth real;
- selecionar/remover/reassociar ativos no painel Meta;
- persistir Page Access Token;
- solicitar `ads_management` ou `business_management`;
- criar anúncios ou gerar gasto;
- importar conteúdo do Instagram;
- iniciar Fase 4;
- promover/mergear a 003B.

## 9. Pendências não bloqueantes

- logger Next dev registra URL do callback com `code`/`state`: tratar redaction antes de produção;
- leaked-password protection antes de produção;
- SMTP/domínio de produção;
- default ACL residual de `supabase_admin` enquanto inerte;
- App Review/Business Verification quando aplicável à fase comercial.
