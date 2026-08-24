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

Status: **003A-10 AUDITADA E APROVADA — MIGRATION REMOTA PENDENTE — INTEGRAÇÃO BISU EXTERNA JÁ REMOVIDA — E2E FINAL AINDA NÃO CONCLUÍDO — 003A AINDA NÃO PROMOVIDA**.

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
- `rodadas/gpt/REAUDITORIA_003A_10_VERIFICACAO_BISU_POS_REMOCAO.md`

Correção executada/auditada:

`rodadas/gpt/CORRECAO_003A_10_VERIFICACAO_BISU_POS_REMOCAO.md`

Branch:

`claude/rodada-003a-meta-connection-foundation`

PR: **#11 draft**.

Head auditado da 003A-10:

`12c179a6d114ede60d5f8675c4813ea03bd75ba6`

CI:

`32768038482` — **verde** em install, lint, typecheck, Edge Functions, testes e build.

## 4. Estado comprovado da conexão real

A integração externa correta **já foi removida** em **Business Settings > Apps conectados**.

O Supabase continua deliberadamente preservado até o gate da migration/verificação:

- conexão `9d256edf-0a89-4436-8d60-f375bc087c08`;
- status = `ACTIVE`;
- `connected_at` e `updated_at` = 2026-08-24 01:47:57Z;
- `disconnected_at` = nulo;
- referência do token = presente;
- segredo correspondente no Vault = presente;
- `external_user_id=122103866379446065`;
- coluna `external_disconnect_pending_at` = **ainda inexistente no remoto**.

## 5. Sequência real do gate BISU

1. `Desconectar` local classificou a credencial como BISU e entrou no fluxo externo sem limpar estado.
2. Houve um desvio manual: `Contas > Apps` foi confundido com a integração instalada; a associação foi removida e depois restaurada corretamente com App ID `2940404272985831`.
3. A superfície correta foi localizada em **Business Settings > Apps conectados**.
4. Nessa tela, `Trafego Pago Business Dev` (App ID `2940404272985831`) foi removido e confirmado pelo fundador.
5. Um novo login/reload local perdeu o estado visual antigo do fluxo e houve cliques adicionais; a UI terminou em `?meta=erro`.
6. O fail-closed funcionou: nenhuma limpeza local ocorreu.
7. A 003A-09 provou que, depois da remoção correta, o token alvo deixou de operar, embora `debug_token` não devolva `is_valid=false` nesse caso.

## 6. 003A-10 — resultado auditado

A correção foi aprovada:

- nova migration aditiva `20260824170000_add_meta_external_disconnect_pending.sql`;
- marcador persistente `external_disconnect_pending_at` para sobreviver a reload/login;
- RPC idempotente `mark_meta_external_disconnect_pending`, restrita a `service_role`;
- UI passa a derivar `remocao-externa-pendente` do estado persistido;
- caminho manual corrigido para **Configurações do negócio > Apps conectados**;
- BISU continua sem endpoint mutável de revogação pelo produto;
- `is_valid=false` explícito continua sendo prova forte;
- no fluxo BISU pendente, a prova composta pós-remoção exige marcador + app token saudável + assinatura real observada do token alvo;
- `190` genérico, outro subcode, falha do app token, rede, 5xx ou ambiguidade continuam fail-closed;
- verificações repetidas são idempotentes;
- CI do HEAD está verde.

A regra **não** é `190 => revogado`. A assinatura observada só é considerada no contexto BISU já marcado como remoção externa pendente e com controles adicionais.

## 7. Particularidade one-off do E2E atual

O E2E começou antes da existência da coluna nova. Portanto, quando a migration for aplicada, a conexão real existente receberá `external_disconnect_pending_at = NULL`, embora a remoção externa já tenha sido executada e auditada.

Isso é uma transição específica do fixture real usado para descobrir o comportamento da Meta, não um defeito do fluxo futuro.

Depois da migration, o GPT deve reconstruir **somente esse fato já comprovado**, marcando a conexão real como remoção externa pendente antes da verificação final.

Não refazer OAuth e não remover novamente a integração na Meta.

## 8. Próxima ação autorizada

Gate conduzido pelo GPT, nesta ordem:

1. aplicar somente a migration `20260824170000_add_meta_external_disconnect_pending.sql` no Supabase remoto;
2. GPT auditar schema, grants, RPC e conexão após a aplicação;
3. GPT marcar exclusivamente a conexão real do E2E como remoção externa pendente, porque a ação humana ocorreu antes da existência da coluna;
4. founder clicar uma única vez `Já removi — verificar`;
5. GPT auditar a pós-condição real: `REVOKED`, `disconnected_at` preenchido, referência nula e segredo removido do Vault;
6. somente depois promover a 003A.

## 9. Continua NÃO autorizado

Até o gate acima concluir:

- nova remoção/reassociação no painel Meta;
- novo OAuth;
- seleção de ativos;
- limpeza manual do segredo;
- iniciar 003B;
- promover/mergear 003A.

## 10. Pendências não bloqueantes

- escopos `ads_*`/`business_management` e seleção detalhada de ativos ficam para 003B;
- logger Next dev registra URL do callback com `code`/`state`: tratar redaction antes de produção;
- leaked-password protection antes de produção;
- SMTP/domínio de produção;
- default ACL residual de `supabase_admin` enquanto inerte;
- App Review/Business Verification para fase comercial quando aplicável.
