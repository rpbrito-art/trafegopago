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

Status: **INVESTIGAÇÃO 003A-05 CONCLUÍDA — AGUARDANDO GPT**.

Mandato original:

`rodadas/gpt/RODADA_003A_META_CONNECTION_FOUNDATION.md`

Auditoria/reauditorias:

`rodadas/gpt/AUDITORIA_RODADA_003A_META_CONNECTION_FOUNDATION.md`

Investigação vigente:

`rodadas/gpt/INVESTIGACAO_003A_05_E2E_DESCONEXAO_FALHOU.md`

Branch:

`claude/rodada-003a-meta-connection-foundation`

PR: **#11 draft**.

Último head de código auditado antes do gate real:

`8332bec58d14c0e6687f02340cfd5c545b34942d`

CI correspondente:

`32751232306` — **verde** em install, lint, typecheck, Edge Functions, testes e build.

Relatório:

`rodadas/claude/RELATORIO_RODADA_003A_META_CONNECTION_FOUNDATION.md`

## 4. Resultado auditado antes do gate

A auditoria independente confirmou como fechados:

- autorização cross-tenant na desconexão;
- membership reconferida no callback;
- `state` negado single-use;
- remoção do upsert incompatível com índice parcial;
- ativação atômica com Vault + `ACTIVE`;
- conexão Meta real da organização de teste;
- token fora do browser;
- falha de leitura do Vault não confundida com ausência de token;
- erro Meta `190` não tratado como prova de revogação;
- pós-verificação do mesmo token antes da limpeza local;
- erro de rede/HTTP/resposta ambígua preservando estado local;
- token válido `SYSTEM_USER` usando apenas `oauth/revoke`;
- token válido `USER` usando apenas `/permissions`;
- token válido de tipo desconhecido/ausente falhando fechado sem tentativa de revogação.

## 5. Gate real de desconexão — resultado observado

Em 2026-08-24 o fundador acionou **uma única vez** `Desconectar` pela UI local da conexão `Teste 003A - conexao Meta`.

Resultado visível:

- redirect para `/conta?meta=erro`;
- a UI continuou mostrando **Meta conectada**.

Auditoria GPT imediatamente após a tentativa confirmou no Supabase remoto:

- conexão = **ACTIVE**;
- `disconnected_at` = nulo;
- referência de segredo = presente;
- segredo correspondente = ainda presente no Vault;
- `external_user_id` e escopos = preservados.

Portanto o fail-closed funcionou: **a tentativa real falhou sem produzir limpeza local enganosa**.

Ainda não está determinado se a falha ocorreu na inspeção inicial, no `oauth/revoke`, na pós-verificação ou em outro ponto do runtime.

## 6. Resultado da Investigação 003A-05 (Claude Code)

Executada em 2026-08-24, read-only, por `scripts/meta-diagnose-003a-05.mjs`. Nenhum endpoint
de revogação foi chamado; nenhuma escrita no Supabase.

Fatos:

- conexão continua `ACTIVE`, `disconnected_at` nulo, referência presente e `updated_at`
  **inalterado** desde `2026-08-24 01:47:57` — a tentativa real não executou nenhum UPDATE;
- `read_meta_connection_token` devolve o token: a leitura do Vault **não** é a causa;
- `GET /debug_token`: HTTP **200**, `is_valid: true`, `type: SYSTEM_USER`, expira 2026-10-23,
  escopos e `user_id` preservados;
- **o token Meta está válido agora**;
- `app_id` do token = `META_APP_ID` configurado, e o app token `APP_ID|APP_SECRET` é aceito
  pela Meta — foi ele que autenticou o `debug_token`;
- descartadas como causa: leitura do Vault, inspeção inicial e fail-closed por tipo.

Hipóteses abertas, ambas consistentes com o observado:

1. `oauth/revoke` respondeu erro/sem `success` → parou antes da pós-verificação;
2. `oauth/revoke` respondeu sucesso e o token seguiu ativo → a pós-verificação barrou.

Distingui-las exige nova chamada a `oauth/revoke`, **não autorizada** nesta investigação. Não
há log da tentativa anterior: a action redireciona sem registrar o `reason`, por desenho.

Delta de código (aditivo, sem mudança de desfecho): `revokeOnMeta` passa a registrar no
servidor qual etapa barrou — `INSPECAO_INICIAL`, `TIPO_NAO_REVOGAVEL`, `REVOGACAO`,
`POS_VERIFICACAO` — com HTTP status e `code`/`subcode` da Meta, e o rótulo `AINDA_VALIDO`
para a hipótese 2. Dois testes provam que o log não carrega token nem App Secret. 85 testes,
lint e typecheck verdes.

Próxima ação: **GPT decide** se autoriza nova tentativa real de desconexão (agora
diagnosticável em uma passagem) ou outro caminho. Claude Code não promove 003A nem inicia 003B.

## 7. Pendências não bloqueantes

- escopos `ads_*`/`business_management` e seleção detalhada de ativos ficam para 003B;
- logger Next dev registra URL do callback com `code`/`state`: tratar redaction antes de produção;
- leaked-password protection antes de produção;
- SMTP/domínio de produção;
- default ACL residual de `supabase_admin` enquanto inerte;
- App Review/Business Verification para fase comercial quando aplicável.
