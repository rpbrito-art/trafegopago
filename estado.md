# ESTADO — Tráfego Pago

Atualizado: 2026-08-24

Estado incorporado = `main + este arquivo + promoção real`.

## 1. Ambiente

- repo: `rpbrito-art/trafegopago`
- Supabase project ref: `cbnxdoxpyioxjwgjhbtq`
- pasta local esperada: `C:\Users\rpbri\Documents\trafegopago`
- `business-weaver`: fora de escopo

## 2. Estado incorporado

Promovidas: **000–002C**.

- Fase 1 — Supabase, Auth e Tenancy: **ENCERRADA**.
- Fase 2 — Operations, Audit, Queues e Segurança Base: **ENCERRADA**.

Última rodada promovida: **002C — Webhook Inbox + Observabilidade Base**.

## 3. Rodada corrente

**003A — META CONNECTION FOUNDATION**

Status: **003A-09 INVESTIGADA — AGUARDANDO DECISÃO GPT — NENHUMA NOVA MUTAÇÃO EXECUTADA**.

Mandato original:

`rodadas/gpt/RODADA_003A_META_CONNECTION_FOUNDATION.md`

Auditorias/decisões vigentes:

- `rodadas/gpt/AUDITORIA_RODADA_003A_META_CONNECTION_FOUNDATION.md`
- `rodadas/gpt/REAUDITORIA_003A_05_INVESTIGACAO_DESCONEXAO.md`
- `rodadas/gpt/REAUDITORIA_003A_06A_CLASSIFICACAO_BISU.md`
- `rodadas/gpt/DECISAO_ARQUITETURAL_003A_06_REVOGACAO_TOKEN_BUSINESS_LOGIN.md`
- `rodadas/gpt/REAUDITORIA_003A_07_DESCONEXAO_BISU_GUIADA.md`
- `rodadas/gpt/REAUDITORIA_003A_08_CLASSIFICACAO_FAIL_CLOSED.md`

Próximo mandato autorizado:

`rodadas/gpt/INVESTIGACAO_003A_09_POS_REMOCAO_APPS_CONECTADOS.md`

Branch:

`claude/rodada-003a-meta-connection-foundation`

PR: **#11 draft**.

Head auditado da 003A-08:

`99b9c79e59e70db0689bcc773551236584f48253`

CI:

`32762552984` — **verde** em install, lint, typecheck, Edge Functions, testes e build.

## 4. Estado comprovado da conexão real

Após todas as ações humanas descritas abaixo, o Supabase permanece fail-closed:

- status = `ACTIVE`;
- `connected_at` e `updated_at` = 2026-08-24 01:47:57Z;
- `disconnected_at` = nulo;
- referência do token = presente;
- segredo correspondente no Vault = presente;
- `external_user_id=122103866379446065`.

Esse estado foi reconfirmado depois da remoção correta em `Apps conectados` e depois dos cliques locais subsequentes.

## 5. Sequência real do gate BISU

1. O fundador clicou `Desconectar` no Tráfego Pago local.
2. A UI entrou corretamente em `/conta?meta=externo`, mostrou `Falta concluir na Meta` e ofereceu `Já removi — verificar`; Supabase ficou intacto.
3. O GPT inicialmente confundiu `Contas > Apps` com a superfície de integração instalada. O app foi removido dali, mas o token continuou ativo; o app foi depois reassociado corretamente ao portfólio Quoron com App ID `2940404272985831`.
4. A superfície correta foi localizada em **Business Settings > Apps conectados**.
5. Nessa tela apareceu `Trafego Pago Business Dev`, App ID `2940404272985831`, adicionado em 23/08/2026, com as permissões da integração. O fundador removeu essa integração e confirmou.
6. Antes/ao retomar a verificação local, houve novo login na conta do Tráfego Pago. O fundador relata ter clicado `Desconectar` mais de uma vez depois disso.
7. O estado final visível foi `/conta?meta=erro`, com a conexão ainda mostrada como conectada.
8. Auditoria no Supabase confirmou que nenhuma limpeza local ocorreu: conexão `ACTIVE`, token referenciado e segredo no Vault presentes.

## 6. Interpretação vigente

A remoção correta da integração externa foi executada. O fato de a UI terminar em `?meta=erro` não autoriza inferir se o token está válido ou inválido.

Hipótese a investigar: após a remoção correta, `debug_token` pode estar respondendo de forma diferente de `HTTP 200 + data.is_valid=false` (por exemplo, erro HTTP), e a implementação atual trata isso como `UNVERIFIED/PROVIDER_REVOKE_FAILED`, preservando o estado local.

Essa hipótese **não está provada** e não autoriza nova mutação.

## 7. Resultado da Investigação 003A-09 (Claude Code)

Executada em 2026-08-24, somente leitura, com o token real lido pela fronteira server-side.
Nenhuma escrita na Meta ou no Supabase, nenhum endpoint mutável, nenhum clique. Script
temporário e não versionado.

Fatos:

- `GET /debug_token` (a mesma chamada de `inspectToken`): HTTP **400**,
  `GraphMethodException` code **100**, **sem `data`** — não há `is_valid` para ler;
- app token inspecionando a si mesmo: HTTP 200, `is_valid: true`, `type: APP` — a falha
  **não** é de autenticação do app;
- `GET /me` com o token alvo: HTTP **400**, `OAuthException` code **190**, subcode **464**;
- conexão continua `ACTIVE`, `disconnected_at` nulo, `updated_at` em `2026-08-24 01:47:57`.

Sonda estrutural (§3.4), contra um token que nunca existiu — nada real tocado:

- `debug_token` com token inventado: HTTP **200**, `data` presente, **`is_valid: false`**;
- `GET /me` com token inventado: HTTP 400, code 190, **sem** subcode.

Portanto a Meta **sabe** sinalizar "token inválido" — e o faz com HTTP 200 + `is_valid:
false`, inclusive para string inventada. O nosso token não recebe essa resposta; produz
assinatura distinta nas duas chamadas.

Causa do `?meta=erro`: `inspectToken` exige HTTP ok **e** `is_valid` booleano. HTTP 400 →
`{ ok: false }` → `UNVERIFIED` (verificação) / `PROVIDER_REVOKE_FAILED` (desconexão) →
estado local preservado. O fail-closed operou como projetado; o que falta é a pós-condição
observável que o desenho espera.

**DECISÃO ARQUITETURAL NECESSÁRIA — AGUARDANDO GPT.** Definir se, e sob quais condições,
algum sinal diferente de `is_valid: false` passa a valer como prova de inatividade. Tratar
`190`, `464` ou `GraphMethodException` como prova é exatamente a inferência que a 003A-03
removeu do código; a escolha não é do executor. Claude Code não alterou código nesta
investigação.

## 8. Continua NÃO autorizado

Até a 003A-09 ser auditada:

- não clicar novamente `Desconectar`;
- não clicar `Já removi — verificar`;
- não remover/reassociar mais nada na Meta;
- não refazer OAuth;
- não chamar `oauth/revoke`, `/permissions` ou `/access_tokens`;
- não limpar estado local manualmente;
- não iniciar 003B;
- não promover/mergear 003A.

## 9. Pendências não bloqueantes

- escopos `ads_*`/`business_management` e seleção detalhada de ativos ficam para 003B;
- logger Next dev registra URL do callback com `code`/`state`: tratar redaction antes de produção;
- leaked-password protection antes de produção;
- SMTP/domínio de produção;
- default ACL residual de `supabase_admin` enquanto inerte;
- App Review/Business Verification para fase comercial quando aplicável.
