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

Status: **003A-04 AUDITADA E APROVADA — E2E REAL DE DESCONEXÃO AUTORIZADO — AGUARDANDO GATE HUMANO**.

Mandato original:

`rodadas/gpt/RODADA_003A_META_CONNECTION_FOUNDATION.md`

Auditoria/reauditorias:

`rodadas/gpt/AUDITORIA_RODADA_003A_META_CONNECTION_FOUNDATION.md`

Branch:

`claude/rodada-003a-meta-connection-foundation`

PR: **#11 draft**.

Head auditado:

`8332bec58d14c0e6687f02340cfd5c545b34942d`

CI:

`32751232306` — **verde** em install, lint, typecheck, Edge Functions, testes e build.

Relatório:

`rodadas/claude/RELATORIO_RODADA_003A_META_CONNECTION_FOUNDATION.md`

## 4. Resultado auditado

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

## 5. Estado remoto antes do gate final

Supabase remoto, reconferido em 2026-08-24:

- migration history = **13**;
- última migration = `20260823203915`;
- conexão `Teste 003A - conexao Meta` = **ACTIVE**;
- `connected_at` = 2026-08-24 01:47:57Z;
- expiração = 2026-10-23;
- token type observado no E2E de conexão = `SYSTEM_USER`;
- referência de segredo presente;
- segredo correspondente ainda existe no Vault;
- `disconnected_at` continua nulo.

A conexão está preservada deliberadamente para o gate final.

## 6. Próxima ação autorizada

Está autorizado **somente o E2E real de desconexão pelo próprio aplicativo** da conexão `Teste 003A - conexao Meta`.

O fluxo esperado é:

1. usuário aciona `Desconectar` no aplicativo;
2. o servidor lê o token do Vault;
3. confirma que é `SYSTEM_USER`;
4. chama o mecanismo `oauth/revoke`;
5. reinspeciona o mesmo token;
6. apenas se `is_valid=false`, remove o segredo do Vault e marca a conexão `REVOKED`.

Se qualquer passo externo falhar ou ficar ambíguo, o aplicativo deve informar falha e preservar a conexão local para nova tentativa.

Após o clique, o GPT deve auditar o estado remoto antes de qualquer promoção.

**Ainda não autorizado:**

- refazer OAuth;
- selecionar ativos;
- revogar pelo painel Meta;
- iniciar 003B;
- promover 003A antes da auditoria do resultado real.

## 7. Pendências não bloqueantes

- escopos `ads_*`/`business_management` e seleção detalhada de ativos ficam para 003B;
- logger Next dev registra URL do callback com `code`/`state`: tratar redaction antes de produção;
- leaked-password protection antes de produção;
- SMTP/domínio de produção;
- default ACL residual de `supabase_admin` enquanto inerte;
- App Review/Business Verification para fase comercial quando aplicável.