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

Status: **003A-09 AUDITADA E APROVADA COMO INVESTIGAÇÃO — BISU EXTERNO JÁ REMOVIDO — META RECUSA O TOKEN ALVO SEM DEVOLVER `is_valid=false` — CORREÇÃO 003A-10 AUTORIZADA — 003A AINDA NÃO PROMOVIDA**.

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

## 7. Próxima ação autorizada

Claude Code deve executar somente a **Correção 003A-10 — Verificação BISU pós-remoção + continuidade do fluxo**.

Objetivos centrais:

- persistir explicitamente que um BISU entrou em remoção externa, sobrevivendo a reload/login;
- corrigir a UX para **Configurações do negócio > Apps conectados**;
- reconhecer a pós-condição composta real apenas no contexto BISU pendente: app token saudável + assinatura alvo observada `190/464` após `debug_token` não utilizável;
- manter 190 genérico, outros subcodes, rede/5xx/ambiguidade e ausência do marcador em fail-closed;
- limpar Vault/estado apenas após prova contextual;
- provar idempotência e recuperação após login.

Se houver migration aditiva, Claude deve criá-la e testá-la, mas o GPT fará o gate de aplicação no Supabase antes do E2E final.

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
