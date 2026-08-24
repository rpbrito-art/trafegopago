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

Status: **003A-08 EXECUTADA — AGUARDANDO AUDITORIA GPT — E2E REAL AINDA NÃO EXECUTADO**.

Mandato original:

`rodadas/gpt/RODADA_003A_META_CONNECTION_FOUNDATION.md`

Auditorias/decisões vigentes:

- `rodadas/gpt/AUDITORIA_RODADA_003A_META_CONNECTION_FOUNDATION.md`
- `rodadas/gpt/REAUDITORIA_003A_05_INVESTIGACAO_DESCONEXAO.md`
- `rodadas/gpt/REAUDITORIA_003A_06A_CLASSIFICACAO_BISU.md`
- `rodadas/gpt/DECISAO_ARQUITETURAL_003A_06_REVOGACAO_TOKEN_BUSINESS_LOGIN.md`
- `rodadas/gpt/REAUDITORIA_003A_07_DESCONEXAO_BISU_GUIADA.md`

Próximo mandato autorizado:

`rodadas/gpt/CORRECAO_003A_08_CLASSIFICACAO_NAO_BISU_FAIL_CLOSED.md`

Branch:

`claude/rodada-003a-meta-connection-foundation`

PR: **#11 draft**.

Head auditado da 003A-07:

`df172e007ecb1bafb89b9d1392fe58ba7d677332`

CI:

`32761502278` — **verde** em install, lint, typecheck, Edge Functions, testes e build.

Relatório:

`rodadas/claude/RELATORIO_RODADA_003A_META_CONNECTION_FOUNDATION.md`

## 4. Estado comprovado da conexão real

A conexão `Teste 003A - conexao Meta` permanece preservada:

- status = `ACTIVE`;
- `connected_at` e `updated_at` = 2026-08-24 01:47:57Z;
- `disconnected_at` = nulo;
- referência do token = presente;
- segredo correspondente no Vault = presente;
- token previamente reconfirmado como `is_valid=true`;
- credencial real classificada como BISU por `client_business_id`;
- `external_user_id=122103866379446065`.

Nenhum E2E real foi executado após a primeira tentativa que falhou fechado.

## 5. Decisão arquitetural BISU — FECHADA

Para a credencial BISU do Facebook Login for Business:

- não usar `oauth/revoke`;
- não usar `/permissions` como fallback;
- não usar `DELETE /{system-user-id}/access_tokens`;
- identificar BISU por contrato read-only com `client_business_id`;
- orientar o usuário a remover o aplicativo em `Business Settings > Integrations > Connected apps`;
- manter token/estado local enquanto a Meta ainda puder considerá-lo válido;
- depois da ação externa, reinspecionar o mesmo token;
- somente `is_valid=false` autoriza apagar o segredo e marcar `REVOKED` localmente.

## 6. Reauditoria 003A-07 — resultado

A implementação passou nos pontos principais:

- BISU válido retorna `EXTERNAL_ACTION_REQUIRED` sem mutação externa/local;
- `oauth/revoke` foi removido do caminho BISU;
- `/permissions` ficou isolado ao caminho USER;
- existe ação separada `checkMetaDisconnection`;
- verificação usa somente inspeção read-only;
- token ainda válido não limpa estado;
- falha/ambiguidade de inspeção não limpa estado;
- somente invalidez explícita permite limpeza local;
- UI orienta `Integrações > Aplicativos conectados` e oferece `Já removi — verificar`;
- script diagnóstico teve `data.error` bruto sanitizado;
- CI do HEAD está verde.

### Bloqueio remanescente

`classificarCredencial()` ainda pode tratar um corpo HTTP 200 incompleto como `bisu=false`. Com `debug_token.type=USER`, isso pode liberar `/permissions` sem uma classificação realmente concluída.

Exemplo estrutural proibido:

`/me` responde `{}` → interpretado como não-BISU → `type=USER` → mutação externa.

Isso viola a regra fail-closed para ausência/erro/ambiguidade.

## 7. Execução da Correção 003A-08 (Claude Code)

Executada em 2026-08-24. Nenhum E2E real, nenhuma ação no painel Meta, nenhuma migration.

`classificarCredencial` passa a exigir prova positiva antes de concluir "não é BISU" — a
única conclusão que abre caminho para mutação externa:

- `client_business_id` string não vazia → **BISU** (inerte, `EXTERNAL_ACTION_REQUIRED`);
- `client_business_id` presente porém vazio, nulo ou de outro tipo → ambíguo, falha fechado;
- campo ausente + `id` string não vazia + coincidência com `external_user_id` persistido →
  não-BISU, caminho USER liberado;
- corpo `{}`, corpo sem `id`, `id` vazio ou identidade divergente → falha fechado, sem
  `/permissions`, sem outro endpoint mutável e sem limpeza local.

`oauth/revoke` e `/access_tokens` continuam ausentes do código.

Provas:

- 115 testes em `src/lib/meta` + `src/components/meta` (+8), cobrindo os oito do mandato §5;
- regra nova verificada por mutação: remover a exigência de identidade derruba 5 testes;
- suíte completa local: **625 testes verdes**;
- lint, typecheck e build verdes.

Estado remoto reconferido após o delta: conexão `ACTIVE`, `disconnected_at` nulo,
`updated_at` ainda em `2026-08-24 01:47:57`.

Próxima ação: **auditoria GPT**. Só depois dela pode existir gate humano para remover o
aplicativo no ambiente Meta e provar a pós-condição real.

## 8. Continua NÃO autorizado

Até auditoria da 003A-08:

- clicar `Desconectar` real;
- remover o app em Connected apps;
- clicar `Já removi — verificar` como gate real;
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
