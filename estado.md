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

Status: **003A + CORREÇÕES 003A-02 e 003A-03 EXECUTADAS — AGUARDANDO REAUDITORIA GPT**.

Mandato original:

`rodadas/gpt/RODADA_003A_META_CONNECTION_FOUNDATION.md`

Auditoria/reAuditoria:

`rodadas/gpt/AUDITORIA_RODADA_003A_META_CONNECTION_FOUNDATION.md`

Correção vigente:

`rodadas/gpt/CORRECAO_003A_03_REVOGACAO_SYSTEM_USER_FAIL_CLOSED.md`

Branch:

`claude/rodada-003a-meta-connection-foundation`

PR: **#11 draft**.

Relatório:

`rodadas/claude/RELATORIO_RODADA_003A_META_CONNECTION_FOUNDATION.md`

## 4. Resultado auditado da 003A-02

Head reaudited: `0b9e10d48cbddbbe63017ea428aa1ab797e21574`.

CI `32742223573`: **verde** em install, lint, typecheck, Edge Functions, testes e build.

A reauditoria independente confirmou como fechados:

- membership na desconexão;
- membership novamente no callback;
- state negado single-use;
- remoção do upsert incompatível;
- ativação atômica com Vault + `ACTIVE`;
- conexão Meta real da organização de teste;
- token fora do browser e preservado no Vault;
- correção fail-closed de erro em `read_meta_connection_token`.

O bloqueio da leitura do Vault está **AUDITADO E APROVADO**: erro de leitura retorna `TOKEN_READ_FAILED`, sem Meta e sem limpeza local.

## 5. Estado remoto confirmado em 2026-08-24

Supabase remoto:

- migration history = **13**;
- última migration = `20260823203915`;
- conexão `Teste 003A - conexao Meta` = **ACTIVE**;
- `connected_at` = 2026-08-24 01:47:57Z;
- expiração = 2026-10-23;
- token type observado anteriormente = `SYSTEM_USER`;
- referência de segredo presente;
- segredo correspondente ainda existe no Vault;
- `disconnected_at` continua nulo.

A conexão real foi preservada deliberadamente para o E2E final. **Não revogar nem substituir antes de nova autorização GPT.**

## 6. Bloqueio vigente — revogação SYSTEM_USER

O código atual usa o mecanismo oficial `oauth/revoke`, mas ainda trata qualquer `error.code === 190` como se provasse que o token alvo já estivesse revogado.

Essa inferência não é segura: `190` é uma família genérica de falhas de autenticação/token e não prova, sozinho, que o `revoke_token` específico ficou inativo.

Risco:

`provider falha com 190 por outra causa → código aceita como revogado → estado/segredo local são apagados → token Meta pode continuar ativo`.

A Correção 003A-03 exige fail-closed e pós-verificação do mesmo token via `debug_token` antes da limpeza local.

## 7. Execução da Correção 003A-03 (Claude Code)

Executada em 2026-08-24. Fatos:

- equivalência `190 = já revogado` removida dos **dois** caminhos (`oauth/revoke` e
  `DELETE /{user-id}/permissions`); só sucesso explícito do provider avança;
- pré-`debug_token` com `is_valid: false` é a única forma de pular a revogação;
- após sucesso do provider, **o mesmo token** é reinspecionado; apenas `is_valid: false`
  libera `revoke_meta_connection`;
- resposta ambígua (sem `is_valid` booleano), HTTP não-ok, erro de rede ou tipo desconhecido
  → `PROVIDER_REVOKE_FAILED`, estado local preservado;
- 81 testes em `src/lib/meta` verdes, cobrindo os seis mínimos do mandato §4; as duas regras
  novas verificadas por mutação (reintroduzir `190 → ok` derruba 1 teste; remover a
  pós-verificação derruba 2);
- os dois testes do bloqueio anterior de leitura do Vault continuam passando;
- lint e typecheck verdes; sem migration nova; histórico de migrations segue **13**,
  local == remoto.

Sem mutação externa nesta correção:

- **desconexão Meta real NÃO executada**;
- OAuth não refeito, ativos não selecionados, painel Meta não tocado;
- conexão real conferida antes e depois: `ACTIVE`, `disconnected_at` null, referência de
  token presente.

Próxima ação: **reauditoria GPT**. Claude Code não promove 003A nem inicia 003B.

## 8. Pendências não bloqueantes

- escopos `ads_*`/`business_management` e seleção detalhada de ativos ficam para 003B;
- logger Next dev registra URL do callback com `code`/`state`: tratar redaction antes de produção;
- leaked-password protection antes de produção;
- SMTP/domínio de produção;
- default ACL residual de `supabase_admin` enquanto inerte;
- App Review/Business Verification para fase comercial quando aplicável.
