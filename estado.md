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

Status: **003A-04 EXECUTADA — AGUARDANDO REAUDITORIA GPT**.

Mandato original:

`rodadas/gpt/RODADA_003A_META_CONNECTION_FOUNDATION.md`

Auditoria/reauditorias:

`rodadas/gpt/AUDITORIA_RODADA_003A_META_CONNECTION_FOUNDATION.md`

Correção vigente:

`rodadas/gpt/CORRECAO_003A_04_TIPO_TOKEN_FAIL_CLOSED.md`

Branch:

`claude/rodada-003a-meta-connection-foundation`

PR: **#11 draft**.

Relatório:

`rodadas/claude/RELATORIO_RODADA_003A_META_CONNECTION_FOUNDATION.md`

## 4. Resultado auditado até a 003A-03

Head reaudited: `98db346e1a110f74627ee1c77a8593905591b688`.

CI `32746073927`: **verde** em install, lint, typecheck, Edge Functions, testes e build.

A reauditoria independente confirmou como fechados:

- membership na desconexão;
- membership novamente no callback;
- state negado single-use;
- remoção do upsert incompatível;
- ativação atômica com Vault + `ACTIVE`;
- conexão Meta real da organização de teste;
- token fora do browser e preservado no Vault;
- erro de leitura de `read_meta_connection_token` falhando fechado;
- erro `190` do provider não sendo tratado como revogação;
- pós-verificação do mesmo token via `debug_token` antes da limpeza local;
- falha de rede/HTTP/resposta ambígua na verificação preservando estado local.

## 5. Estado remoto confirmado em 2026-08-24

Supabase remoto:

- migration history = **13**;
- última migration = `20260823203915`;
- conexão `Teste 003A - conexao Meta` = **ACTIVE**;
- `connected_at` = 2026-08-24 01:47:57Z;
- expiração = 2026-10-23;
- token type observado no E2E de conexão = `SYSTEM_USER`;
- referência de segredo presente;
- segredo correspondente ainda existe no Vault;
- `disconnected_at` continua nulo.

A conexão real foi preservada deliberadamente para o E2E final. **Não revogar nem substituir antes de nova autorização GPT.**

## 6. Bloqueio vigente — tipo de token desconhecido

O código da 003A-03 ainda escolhe `/permissions` para qualquer tipo que não seja `SYSTEM_USER`.

Isso significa que um token válido retornado pela Meta como `PAGE`, outro tipo inesperado ou sem tipo pode provocar uma tentativa de revogação por um mecanismo que o sistema não sabe ser correto.

A Correção 003A-04 exige:

- token válido + `SYSTEM_USER` → `oauth/revoke`;
- token válido + `USER` → `/permissions`;
- token válido + tipo diferente/ausente → falhar fechado, sem mutação remota e sem limpeza local;
- `is_valid=false` do mesmo token continua sendo prova suficiente de inatividade para permitir limpeza local.

## 7. Execução da Correção 003A-04 (Claude Code)

Executada em 2026-08-24. Fatos:

- com o token **válido**, `revokeOnMeta` só reconhece dois caminhos: `SYSTEM_USER` →
  `oauth/revoke` e `USER` → `/permissions`. Não há mais default;
- tipo diferente desses dois, ou `type` ausente, retorna `PROVIDER_REVOKE_FAILED` **antes**
  de qualquer endpoint de revogação e sem tocar o estado local;
- `is_valid === false` na inspeção inicial continua sendo prova suficiente de inatividade e
  libera a limpeza local, independentemente de `type`;
- a pós-verificação exige apenas `is_valid === false` do mesmo token; `type` ausente na
  resposta posterior não bloqueia (refinamento do mandato §3.7);
- 83 testes em `src/lib/meta` verdes, cobrindo as seis provas do mandato §4; regra nova
  verificada por mutação (restaurar o default `/permissions` derruba 2 testes);
- testes de `190`, pós-verificação, erro de leitura do Vault e falha de inspeção seguem
  passando;
- lint e typecheck verdes; nenhuma migration tocada; histórico segue **13**.

Sem mutação externa nesta correção:

- **desconexão Meta real NÃO executada**;
- OAuth não refeito, ativos não selecionados, painel Meta não tocado;
- conexão real conferida: `ACTIVE`, `disconnected_at` null, referência de token presente.

Próxima ação: **reauditoria GPT**. Claude Code não promove 003A nem inicia 003B.

## 8. Pendências não bloqueantes

- escopos `ads_*`/`business_management` e seleção detalhada de ativos ficam para 003B;
- logger Next dev registra URL do callback com `code`/`state`: tratar redaction antes de produção;
- leaked-password protection antes de produção;
- SMTP/domínio de produção;
- default ACL residual de `supabase_admin` enquanto inerte;
- App Review/Business Verification para fase comercial quando aplicável.
