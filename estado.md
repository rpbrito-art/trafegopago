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

Status: **003A-08 AUDITADA E APROVADA — GATE HUMANO DE DESCONEXÃO BISU AUTORIZADO — 003A AINDA NÃO PROMOVIDA**.

Mandato original:

`rodadas/gpt/RODADA_003A_META_CONNECTION_FOUNDATION.md`

Auditorias/decisões vigentes:

- `rodadas/gpt/AUDITORIA_RODADA_003A_META_CONNECTION_FOUNDATION.md`
- `rodadas/gpt/REAUDITORIA_003A_05_INVESTIGACAO_DESCONEXAO.md`
- `rodadas/gpt/REAUDITORIA_003A_06A_CLASSIFICACAO_BISU.md`
- `rodadas/gpt/DECISAO_ARQUITETURAL_003A_06_REVOGACAO_TOKEN_BUSINESS_LOGIN.md`
- `rodadas/gpt/REAUDITORIA_003A_07_DESCONEXAO_BISU_GUIADA.md`
- `rodadas/gpt/REAUDITORIA_003A_08_CLASSIFICACAO_FAIL_CLOSED.md`

Branch:

`claude/rodada-003a-meta-connection-foundation`

PR: **#11 draft**.

Head auditado da 003A-08:

`99b9c79e59e70db0689bcc773551236584f48253`

CI:

`32762552984` — **verde** em install, lint, typecheck, Edge Functions, testes e build.

Relatório:

`rodadas/claude/RELATORIO_RODADA_003A_META_CONNECTION_FOUNDATION.md`

## 4. Estado comprovado da conexão real antes do gate

A conexão `Teste 003A - conexao Meta` permanece preservada:

- status = `ACTIVE`;
- `connected_at` e `updated_at` = 2026-08-24 01:47:57Z;
- `disconnected_at` = nulo;
- referência do token = presente;
- segredo correspondente no Vault = presente;
- token previamente reconfirmado como `is_valid=true`;
- credencial real classificada como BISU por `client_business_id`;
- `external_user_id=122103866379446065`.

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

## 6. Reauditoria 003A-08 — resultado

A correção do último bloqueio fail-closed foi aprovada:

- corpo `{}` ou sem `id` válido não é classificado como não-BISU;
- `client_business_id` vazio, nulo ou de tipo inválido falha fechado;
- identidade divergente do `external_user_id` persistido falha fechado;
- nesses cenários `/permissions` não é chamado e o estado local não é limpo;
- USER legítimo com identidade coerente e `client_business_id` ausente preserva o caminho documentado + pós-verificação;
- BISU legítimo continua exigindo ação externa sem mutação automática;
- `oauth/revoke` e `/access_tokens` não foram reintroduzidos;
- CI do HEAD está verde.

Não existe bloqueio de código material conhecido restante antes do gate humano.

## 7. Próxima ação autorizada

O GPT conduz o **E2E REAL DE DESCONEXÃO BISU**, uma ação manual por vez.

Sequência autorizada:

1. no Tráfego Pago local, clicar `Desconectar` uma vez;
2. auditar que a UI apenas mostra a orientação externa e que o Supabase continua intacto;
3. somente depois, o GPT orientará a remoção do aplicativo no ambiente Meta em `Configurações do negócio > Integrações > Aplicativos conectados`;
4. depois da remoção externa, usar `Já removi — verificar`;
5. GPT audita a pós-condição real: token inválido, segredo removido, conexão `REVOKED`, `disconnected_at` preenchido.

A promoção da 003A só pode ocorrer depois desse gate real passar integralmente.

## 8. Continua NÃO autorizado

Até o GPT conduzir cada passo do gate:

- não remover o app da Meta antecipadamente;
- não clicar `Já removi — verificar` antes da remoção externa;
- não chamar `oauth/revoke`;
- não chamar `/permissions` ou `/access_tokens` para o BISU;
- não refazer OAuth;
- não selecionar ativos;
- não iniciar 003B;
- não promover/mergear 003A.

## 9. Pendências não bloqueantes

- escopos `ads_*`/`business_management` e seleção detalhada de ativos ficam para 003B;
- logger Next dev registra URL do callback com `code`/`state`: tratar redaction antes de produção;
- leaked-password protection antes de produção;
- SMTP/domínio de produção;
- default ACL residual de `supabase_admin` enquanto inerte;
- App Review/Business Verification para fase comercial quando aplicável.
