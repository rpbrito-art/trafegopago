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

Status: **INVESTIGAÇÃO 003A-06A CONCLUÍDA — AGUARDANDO GPT — DECISÃO ARQUITETURAL 003A-06 AINDA ABERTA — NOVO E2E BLOQUEADO**.

Mandato original:

`rodadas/gpt/RODADA_003A_META_CONNECTION_FOUNDATION.md`

Auditoria/reauditorias:

- `rodadas/gpt/AUDITORIA_RODADA_003A_META_CONNECTION_FOUNDATION.md`
- `rodadas/gpt/REAUDITORIA_003A_05_INVESTIGACAO_DESCONEXAO.md`

Decisão arquitetural vigente:

`rodadas/gpt/DECISAO_ARQUITETURAL_003A_06_REVOGACAO_TOKEN_BUSINESS_LOGIN.md`

Investigação factual autorizada:

`rodadas/gpt/INVESTIGACAO_003A_06A_CLASSIFICAR_TOKEN_BISU.md`

Branch:

`claude/rodada-003a-meta-connection-foundation`

PR: **#11 draft**.

Head auditado da investigação anterior:

`9060da1741e6a117751035ab902ee33a2b9939ef`

CI correspondente:

`32753513167` — **verde** em install, lint, typecheck, Edge Functions, testes e build.

Relatório:

`rodadas/claude/RELATORIO_RODADA_003A_META_CONNECTION_FOUNDATION.md`

## 4. Resultado auditado antes do gate real

Estão auditados como fechados:

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
- token válido `USER` usando somente `/permissions`;
- token válido de tipo desconhecido/ausente falhando fechado sem tentativa de revogação.

O caminho de revogação do token obtido por Facebook Login for Business permanece **não promovido** enquanto a classe concreta da credencial e seu contrato de invalidação não forem fechados pela 003A-06.

## 5. Gate real de desconexão — primeira tentativa

Em 2026-08-24 o fundador acionou **uma única vez** `Desconectar` pela UI local da conexão `Teste 003A - conexao Meta`.

Resultado visível:

- redirect para `/conta?meta=erro`;
- UI continuou mostrando **Meta conectada**.

Auditoria imediatamente após a tentativa confirmou:

- conexão = `ACTIVE`;
- `disconnected_at` = nulo;
- referência de segredo = presente;
- segredo correspondente = presente no Vault;
- dados da conexão preservados.

O fail-closed funcionou: a falha não produziu limpeza local enganosa.

## 6. Investigação 003A-05 — resultado auditado

A investigação read-only foi concluída e auditada no head `9060da1741e6a117751035ab902ee33a2b9939ef`.

Confirmado:

- conexão continua `ACTIVE`;
- `updated_at` continua no instante original da conexão;
- leitura do token no Vault funciona;
- `debug_token` responde HTTP 200;
- token continua `is_valid=true`;
- `type=SYSTEM_USER`;
- expiração = 2026-10-23;
- token pertence ao app atualmente configurado.

Portanto a primeira tentativa **não revogou o token na Meta**.

Foram descartadas como causa:

- leitura do Vault;
- inspeção inicial;
- tipo desconhecido.

A instrumentação diagnóstica publicada pelo Claude foi auditada como segura e aditiva, mas sua publicação extrapolou o texto da autorização, que previa instrumentação temporária/local. O desvio ficou registrado e não altera o status da rodada.

## 7. Pesquisa arquitetural 003A-06 — resultado atual

A pesquisa GPT encontrou no contrato de Facebook Login for Business que:

- o produto emite **Business Integration System User access token (BISU)** quando a configuração usa `System-user access token`, ou User Access Token quando configurado dessa forma;
- BISU é associado ao business portfolio do cliente e usa Authorization Code para acesso contínuo;
- o contrato BISU expõe `client_business_id` via `GET /me?fields=client_business_id`;
- a API BISU documentada permite gerar/buscar tokens via `/<CLIENT_BUSINESS_ID>/system_user_access_tokens`;
- a invalidação documentada para BISU é a remoção do app em `Business Manager > Settings > Business Settings > Integrations > Connected apps`;
- a referência BISU consultada não documenta `oauth/revoke` como mecanismo de invalidação;
- o `DELETE /<APP_SCOPED_SYSTEM_USER_ID>/access_tokens` documentado em outro contexto invalida todos os tokens de um System User clássico e não está autorizado como substituto para BISU.

Hipótese líder, ainda não final: se o token real for comprovado como BISU, `Desconectar` deverá virar fluxo guiado de remoção da integração no ambiente Meta + pós-verificação `is_valid=false` + só então limpeza do Vault e `REVOKED` local.

## 8. Resultado da Investigação 003A-06A (Claude Code)

Executada em 2026-08-24, somente leitura, com o token real lido pela fronteira server-side.
Uma única chamada à Meta além da reconfirmação de validade.

`GET /v26.0/me?fields=client_business_id`:

- HTTP **200**;
- `client_business_id` = **presente e não vazio** (`5301659283195806`);
- `id` = `122103866379446065`;
- `id` **coincide** com o `external_user_id` persistido na conexão;
- campos devolvidos: `client_business_id`, `id`, `name`.

Reconfirmação `debug_token` (read-only): HTTP 200, `is_valid: true`, `type: SYSTEM_USER`.

**Nenhuma escrita executada** — Meta ou Supabase. Conexão segue `ACTIVE`, `disconnected_at`
nulo, `updated_at` no instante original `2026-08-24 01:47:57`.

O script de diagnóstico foi temporário e **não versionado**, conforme §4 do mandato.

Classificação da credencial e escolha do mecanismo de invalidação permanecem com o GPT
(Decisão 003A-06). Claude Code não conclui arquitetura a partir deste fato.

Próxima ação: **GPT fecha a 003A-06**. Nenhuma mutação externa autorizada até lá.

## 9. Continua NÃO autorizado

- clicar `Desconectar` novamente;
- chamar `oauth/revoke` novamente;
- `DELETE /permissions` para essa credencial;
- `DELETE /{system-user-id}/access_tokens`;
- qualquer outro endpoint Meta mutável;
- revogar pelo painel Meta antes do gate GPT;
- limpar estado local;
- refazer OAuth;
- selecionar ativos;
- iniciar 003B;
- promover 003A.

## 10. Pendências não bloqueantes

- escopos `ads_*`/`business_management` e seleção detalhada de ativos ficam para 003B;
- logger Next dev registra URL do callback com `code`/`state`: tratar redaction antes de produção;
- sanitizar/remover `data.error` bruto do script de diagnóstico antes da promoção, no próximo delta substantivo da 003A;
- leaked-password protection antes de produção;
- SMTP/domínio de produção;
- default ACL residual de `supabase_admin` enquanto inerte;
- App Review/Business Verification para fase comercial quando aplicável.
