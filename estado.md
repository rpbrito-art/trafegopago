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

Status: **003A-10 EXECUTADA — AGUARDANDO AUDITORIA GPT — MIGRATION `20260824170000` NÃO APLICADA NO REMOTO**.

Mandato original:

`rodadas/gpt/RODADA_003A_META_CONNECTION_FOUNDATION.md`

Auditorias/decisões vigentes:

- `rodadas/gpt/AUDITORIA_RODADA_003A_META_CONNECTION_FOUNDATION.md`
- `rodadas/gpt/REAUDITORIA_003A_05_INVESTIGACAO_DESCONEXAO.md`
- `rodadas/gpt/REAUDITORIA_003A_06A_CLASSIFICACAO_BISU.md`
- `rodadas/gpt/DECISAO_ARQUITETURAL_003A_06_REVOGACAO_TOKEN_BUSINESS_LOGIN.md`
- `rodadas/gpt/REAUDITORIA_003A_07_DESCONEXAO_BISU_GUIADA.md`
- `rodadas/gpt/REAUDITORIA_003A_08_CLASSIFICACAO_FAIL_CLOSED.md`
- `rodadas/gpt/REAUDITORIA_003A_09_POS_REMOCAO_APPS_CONECTADOS.md`

Próximo mandato autorizado:

`rodadas/gpt/CORRECAO_003A_10_VERIFICACAO_BISU_POS_REMOCAO.md`

Branch:

`claude/rodada-003a-meta-connection-foundation`

PR: **#11 draft**.

Head auditado da investigação 003A-09:

`25934c498dd96a72d6584de95d3af08790ae6204`

Última CI de código auditada antes da investigação documental/read-only:

`32762552984` — verde em install, lint, typecheck, Edge Functions, testes e build.

## 4. Estado comprovado da conexão real

A integração externa correta **já foi removida** em **Business Settings > Apps conectados**.

O Supabase continua deliberadamente preservado até a correção do verificador:

- status = `ACTIVE`;
- `connected_at` e `updated_at` = 2026-08-24 01:47:57Z;
- `disconnected_at` = nulo;
- referência do token = presente;
- segredo correspondente no Vault = presente;
- `external_user_id=122103866379446065`.

## 5. Sequência real do gate BISU

1. `Desconectar` local classificou a credencial como BISU e entrou no fluxo externo sem limpar estado.
2. Houve um desvio manual: `Contas > Apps` foi confundido com a integração instalada; a associação foi removida e depois restaurada corretamente com App ID `2940404272985831`.
3. A superfície correta foi localizada em **Business Settings > Apps conectados**.
4. Nessa tela, `Trafego Pago Business Dev` (App ID `2940404272985831`) foi removido e confirmado pelo fundador.
5. Um novo login/reload local perdeu o estado visual do fluxo e o fundador clicou `Desconectar` mais de uma vez; a UI terminou em `?meta=erro`.
6. O fail-closed funcionou: nenhuma limpeza local ocorreu.

## 6. Investigação 003A-09 — resultado auditado

Somente leitura, sem código funcional ou mutação externa:

- `GET /debug_token` do token alvo → HTTP 400, `GraphMethodException`, code 100, sem `data`;
- app token inspecionando a si mesmo → HTTP 200, `is_valid=true`, `type=APP`;
- `GET /me` com o token alvo → HTTP 400, `OAuthException`, code 190, subcode 464;
- token sintético inexistente usado como controle → `debug_token` HTTP 200, `is_valid=false`.

Conclusão: após a remoção correta, a Meta tornou o BISU alvo inutilizável, mas **não usa `debug_token.is_valid=false` como pós-condição observável nesse caso real**. A implementação atual interpreta HTTP 400 como `UNVERIFIED/PROVIDER_REVOKE_FAILED`, por isso preserva o local e mostra erro.

Não reintroduzir `190 => revogado` genericamente.

## 7. Execução da Correção 003A-10 (Claude Code)

Executada em 2026-08-24. Nenhuma nova ação na Meta, nenhuma migration aplicada no remoto.

Persistência do fluxo BISU (migration aditiva `20260824170000`, **local-only**):

- coluna `meta_connections.external_disconnect_pending_at`, com `SELECT` liberado ao
  `authenticated` — saber quando foi pedido não recupera segredo;
- `mark_meta_external_disconnect_pending`, idempotente: reclicar `Desconectar` não reinicia;
- `revoke_meta_connection` recriada por `create or replace` para zerar o marcador na limpeza;
  nenhuma migration aplicada foi editada;
- a UI deriva `remocao-externa-pendente` da conexão persistida: sobrevive a reload, logout e
  nova sessão, e não oferece `Desconectar` enquanto vale.

Prova composta pós-remoção, somente leitura, em `checkMetaDisconnection`:

- `HTTP 200 + is_valid=false` continua concluindo sozinho, com ou sem marcador;
- a assinatura da 003A-09 só é aceita sob quatro travas: **marcador persistido presente**,
  app token de controle auditado e saudável, assinatura exata `OAuthException` + code 190 +
  subcode **464**, e `/me` que responde tratado como `STILL_ACTIVE`;
- 190 genérico, outro subcode, outro code, 5xx, rede, ambiguidade ou app token doente
  preservam o estado local;
- nenhum endpoint mutável é chamado.

Caminho na interface corrigido para a superfície comprovada: `Configurações do negócio >
Apps conectados`, com link para `business.facebook.com/latest/settings/connected_apps/`. Saem
`Contas > Apps` e `Integrações > Aplicativos conectados`.

Provas:

- 138 testes em `src/lib/meta` + `src/components/meta` (+17), cobrindo os doze mínimos do §5
  e a idempotência do §4;
- cada trava verificada por mutação: dispensar o marcador derruba 1 teste, aceitar 190 sem
  subcode derruba 2, pular o controle do app token derruba 1;
- suíte completa local: **648 verdes**; lint, typecheck e build verdes;
- migration validada em transação revertida contra o remoto e conferida depois: **nada
  persistiu**. `migration list` = 13 aplicadas, `20260824170000` local-only.

**Ponto para a auditoria:** o código já lê `external_disconnect_pending_at`. Enquanto a
migration não for aplicada, a leitura de estado da conexão falha em runtime — efeito esperado
do gate do §6. O E2E só pode ocorrer depois que o GPT aplicar a migration.

Estado remoto: conexão `ACTIVE`, `disconnected_at` nulo, `updated_at` em
`2026-08-24 01:47:57`.

Próxima ação: **auditoria GPT** e aplicação da migration.

## 8. Continua NÃO autorizado

Até auditoria da 003A-10:

- não clicar novamente `Desconectar`;
- não clicar `Já removi — verificar`;
- não remover/reassociar mais nada na Meta;
- não refazer OAuth;
- não chamar `oauth/revoke`, `/permissions` ou `/access_tokens` para BISU;
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
