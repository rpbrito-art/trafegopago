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

Status: **003A-08 AUDITADA E APROVADA — INTEGRAÇÃO BISU CORRETA REMOVIDA EM `APPS CONECTADOS` — VERIFICAÇÃO LOCAL TERMINOU EM `?meta=erro` — ESTADO LOCAL PRESERVADO — INVESTIGAÇÃO 003A-09 AUTORIZADA SOMENTE LEITURA**.

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

## 7. Próxima ação autorizada

Claude Code deve executar somente a **Investigação 003A-09 — Pós-remoção em Apps conectados**, em modo de leitura.

Objetivo: provar qual é a resposta atual de `debug_token` para o mesmo token e por que o gateway retorna erro, sem imprimir segredo e sem alterar Meta, Supabase ou código.

Depois, Claude deve parar para decisão/auditoria GPT.

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
