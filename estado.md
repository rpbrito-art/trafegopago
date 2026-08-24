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

Status: **003A-07 EXECUTADA — AGUARDANDO AUDITORIA GPT — NENHUM E2E REAL EXECUTADO**.

Mandato original:

`rodadas/gpt/RODADA_003A_META_CONNECTION_FOUNDATION.md`

Auditorias/decisões vigentes:

- `rodadas/gpt/AUDITORIA_RODADA_003A_META_CONNECTION_FOUNDATION.md`
- `rodadas/gpt/REAUDITORIA_003A_05_INVESTIGACAO_DESCONEXAO.md`
- `rodadas/gpt/REAUDITORIA_003A_06A_CLASSIFICACAO_BISU.md`
- `rodadas/gpt/DECISAO_ARQUITETURAL_003A_06_REVOGACAO_TOKEN_BUSINESS_LOGIN.md`

Próximo mandato autorizado:

`rodadas/gpt/CORRECAO_003A_07_DESCONEXAO_BISU_GUIADA.md`

Branch:

`claude/rodada-003a-meta-connection-foundation`

PR: **#11 draft**.

Head auditado da investigação 003A-06A:

`3e1a253cc1f70ec987f44fd4a3a6b5c0e75cc2c6`

Relatório:

`rodadas/claude/RELATORIO_RODADA_003A_META_CONNECTION_FOUNDATION.md`

## 4. Estado comprovado da conexão real

A conexão `Teste 003A - conexao Meta` permanece preservada:

- status = `ACTIVE`;
- `connected_at` e `updated_at` = 2026-08-24 01:47:57Z;
- `disconnected_at` = nulo;
- referência do token = presente;
- segredo correspondente no Vault = presente;
- token continua `is_valid=true`;
- `debug_token.type=SYSTEM_USER`;
- expiração = 2026-10-23;
- `external_user_id=122103866379446065`.

A primeira tentativa de desconexão real falhou fechado e **não revogou o token**.

## 5. Investigação 003A-06A — resultado auditado

A prova read-only autorizada retornou:

`GET /v26.0/me?fields=client_business_id` → HTTP 200

com:

- `client_business_id=5301659283195806`, presente e não vazio;
- `id=122103866379446065`;
- `id` coincide com o `external_user_id` persistido.

Nenhuma escrita foi executada na Meta ou no Supabase. O script usado foi temporário e não versionado.

**Conclusão factual:** a credencial real usada pela conexão da 003A é tratada como **Business Integration System User Access Token (BISU)** do Facebook Login for Business.

## 6. Decisão arquitetural 003A-06 — FECHADA

Para BISU válido da configuração atual:

- não usar `oauth/revoke`;
- não usar `/permissions` como fallback;
- não usar `DELETE /{system-user-id}/access_tokens`;
- não inferir mecanismo apenas por `debug_token.type=SYSTEM_USER`;
- identificar BISU por contrato read-only com `client_business_id`;
- orientar o usuário a remover o aplicativo em `Business Settings > Integrations > Connected apps`;
- manter token/estado local enquanto a Meta ainda puder considerá-lo válido;
- depois da ação externa, reinspecionar o mesmo token;
- somente `is_valid=false` autoriza apagar o segredo e marcar `REVOKED` localmente.

Portanto a desconexão BISU da 003A será um **fluxo guiado de ação externa + pós-verificação**, e não uma revogação automática por endpoint não documentado.

## 7. Execução da Correção 003A-07 (Claude Code)

Executada em 2026-08-24. Nenhuma ação real na Meta, nenhuma migration, nenhuma mutação
externa.

Contrato implementado em `encerrarNoProvider` (antes `revokeOnMeta`), com token válido:

- `client_business_id` presente → **BISU** → `EXTERNAL_ACTION_REQUIRED`, sem chamar endpoint
  mutável e sem limpar estado local;
- não-BISU com `type: USER` → `DELETE /{user-id}/permissions` + pós-verificação;
- qualquer outra combinação, ou classificação que não conclua (HTTP ruim, rede, corpo sem
  identificação) → falha fechado, sem tentativa alternativa;
- `is_valid: false` na inspeção inicial continua liberando limpeza local;
- **`oauth/revoke` removido do código** — sem chamador legítimo para BISU.

Ação separada `checkMetaDisconnection` + `checkMetaDisconnectionAction`:

- reconfere membership e lê o token pela mesma fronteira server-side;
- chama **apenas** `debug_token`; nenhum endpoint mutável;
- `is_valid: false` → `revoke_meta_connection` (limpeza atômica já existente) e conclui;
- `is_valid: true` → `STILL_ACTIVE`, nada é tocado;
- rede/HTTP/resposta ambígua → `UNVERIFIED`, nada é tocado, pode repetir.

UI: no estado conectado, o desfecho externo troca o botão pelo passo a passo
(`Integrações → Aplicativos conectados`) e pela ação **Já removi — verificar**. Sem deep link
inventado. Erro genérico não vira instrução de remoção externa. Nenhum jargão, id externo,
token ou segredo aparece na tela.

Provas:

- 107 testes em `src/lib/meta` + `src/components/meta` (+10), cobrindo os onze mínimos do
  mandato §5;
- suíte completa local: **617 testes verdes**;
- lint, typecheck e build verdes;
- dívida §6 quitada: o script de diagnóstico não imprime mais `data.error` bruto.

Estado remoto reconferido após o delta: conexão `ACTIVE`, `disconnected_at` nulo, referência
de token presente, `updated_at` ainda em `2026-08-24 01:47:57`.

Próxima ação: **auditoria GPT**. Só depois dela pode existir gate humano para remover o
aplicativo no ambiente Meta e provar a pós-condição real.

## 8. Continua NÃO autorizado

Até auditoria da 003A-07:

- clicar `Desconectar` real;
- remover o app em Connected apps;
- chamar `oauth/revoke` com o token real;
- chamar `/permissions` ou `/access_tokens` para o BISU;
- qualquer outro endpoint Meta mutável;
- limpar estado local;
- refazer OAuth;
- selecionar ativos;
- iniciar 003B;
- promover/mergear 003A.

## 9. Pendências não bloqueantes

- escopos `ads_*`/`business_management` e seleção detalhada de ativos ficam para 003B;
- logger Next dev registra URL do callback com `code`/`state`: tratar redaction antes de produção;
- leaked-password protection antes de produção;
- SMTP/domínio de produção;
- default ACL residual de `supabase_admin` enquanto inerte;
- App Review/Business Verification para fase comercial quando aplicável.
