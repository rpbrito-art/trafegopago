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

**003B-01 EXECUTADA — AGUARDANDO AUDITORIA GPT — GATE EXTERNO META CONTINUA BLOQUEADO**.

HEAD da correção: ver PR #12.

Nada de banco mudou nesta correção: nenhuma migration nova, nenhum schema alterado, nenhuma configuração Meta tocada. A prova SQL `41/41` do HEAD anterior continua válida e não foi repetida.

### Bloqueio A — metadata IG falhava aberto — **CORRIGIDO**

`lerMetadadosInstagram` passa a distinguir os dois casos:

- HTTP 2xx com campos opcionais ausentes → candidato válido com campos nulos;
- HTTP 4xx/5xx, rede quebrada ou corpo ilegível → falha de domínio sanitizada pela mesma taxonomia do resto da fronteira (`classificarRecusa`, agora em um único lugar), sem candidato gravável e sem RPC de seleção.

Uma conta ilegível derruba a descoberta inteira em vez de gerar lista parcial: esconder que existe conta que o token não alcança apagaria o fato que precisa subir ao gate arquitetural do mandato §4.1.

Provado: metadata 400/190, 403/10, 403/200, 500, rede e corpo ilegível falham fechado sem RPC; 2xx com campos ausentes mantém o candidato; o log da recusa não carrega token nem URL.

### Bloqueio B — membership precisava de recheck antes da escrita — **CORRIGIDO**

`selectInstagramAccount` e `selectAdAccount` reconferem membership imediatamente antes da RPC de seleção, depois do intervalo gasto na Meta. A gravação usa `service_role`, então RLS não a barra — a segunda checagem é o que impede quem saiu da organização durante a redescoberta de fixar qual conta o produto vai ler.

Provado: membership removida durante a redescoberta não gera RPC nem para Instagram nem para Ad Account; o caminho normal continua gravando, com exatamente duas checagens.

Provas do delta: `vitest run src/lib/meta/assets.test.ts` 39/39; regressão do módulo Meta e actions 255/255; typecheck e lint limpos.

## 6. Estado remoto atual

Supabase:

- 15 migrations;
- `20260824210000` aplicada;
- `instagram_accounts`: 0 linhas;
- `ad_accounts`: 0 linhas;
- conexões Meta `ACTIVE`: 0.

Nenhum novo OAuth da 003B foi feito e nenhum token novo está ativo.

## 7. Próxima ação autorizada

A Correção 003B-01 está executada e publicada na branch. **Claude Code está parado.**

Próximo a agir: **GPT** — auditar o delta da 003B-01 no PR #12.

Se a auditoria passar, o gate externo da Meta pode ser retomado nos termos da §6.1 do relatório. Até lá, nada de OAuth, painel Meta, escopo novo ou promoção.

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
