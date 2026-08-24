# AUDITORIA GPT — 003B-01 — FAIL-CLOSED DE METADATA + RECHECK DE MEMBERSHIP

Data: 2026-08-24

Branch auditada: `claude/rodada-003b-meta-asset-discovery-selection`

PR: #12

HEAD auditado: `77f7c8288208b5b97fe0367ef48c6ad08b1329dd`

CI: `32779213462` — verde em install, lint, typecheck, Edge Functions, testes e build.

## Resultado

**APROVADA.**

A Correção 003B-01 resolveu os dois bloqueios identificados na auditoria pré-gate sem ampliar o escopo da rodada e sem nova migration.

### A. Leitura de metadata do IG User agora falha fechado

`lerMetadadosInstagram` distingue corretamente:

- HTTP 2xx com campos opcionais ausentes → candidato continua válido com metadata nula;
- HTTP 4xx/5xx → erro de domínio sanitizado;
- falha de rede → `PROVIDER_UNAVAILABLE`;
- corpo 2xx ilegível → `PROVIDER_UNAVAILABLE`.

Uma falha na leitura de um IG User derruba a descoberta em vez de produzir lista parcial/gravar candidato não legível.

Taxonomia reaproveita `classificarRecusa`: `190` vira `CONNECTION_REJECTED` sem mutação; `10/200` viram `MISSING_PERMISSION`; demais falhas fecham em indisponibilidade.

Logs não carregam token nem URL.

### B. Membership reconferida imediatamente antes da gravação

`selectInstagramAccount` e `selectAdAccount` reconferem membership depois das chamadas externas e antes da RPC privilegiada de seleção.

Se a membership cair durante a redescoberta, nenhuma RPC de seleção é executada.

## Provas focadas

Testes cobrem:

- metadata 400/190;
- metadata 403/10 e 403/200;
- 5xx;
- falha de rede;
- corpo 2xx ilegível;
- 2xx com campos opcionais ausentes;
- lista parcial proibida;
- ausência de token/URL no log;
- membership removida durante a ida à Meta em Instagram e Ads;
- membership preservada com exatamente duas checagens.

## Banco/remoto

Nenhuma mudança de schema nesta correção. Permanece válido o estado já auditado da 003B:

- 15 migrations;
- `20260824210000` aplicada;
- `instagram_accounts` e `ad_accounts` com RLS;
- funções de seleção `security invoker`, EXECUTE apenas para `service_role`;
- zero linhas residuais nas tabelas de seleção;
- zero conexões Meta ACTIVE antes do novo E2E.

## Gate

**Gate externo da Meta LIBERADO para condução do GPT.**

Ainda não autorizado:

- ampliar permissões por tentativa;
- persistir Page Access Token;
- solicitar `ads_management`/`business_management` sem nova decisão;
- importar conteúdo;
- promover/mergear a 003B antes do E2E real.
