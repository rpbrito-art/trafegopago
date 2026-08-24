# REAUDITORIA 003A-06A — CLASSIFICAÇÃO FACTUAL DO TOKEN BISU

Status: **AUDITADA E APROVADA**
Data: 2026-08-24
Branch auditada: `claude/rodada-003a-meta-connection-foundation`
Head auditado: `3e1a253cc1f70ec987f44fd4a3a6b5c0e75cc2c6`
PR: #11 draft

## 1. Mandato auditado

A Investigação 003A-06A autorizava somente uma prova factual, read-only, contra a credencial real:

`GET /v26.0/me?fields=client_business_id`

O Claude não estava autorizado a escolher arquitetura, revogar credenciais, escrever no Supabase, refazer OAuth ou executar qualquer endpoint mutável da Meta.

## 2. Resultado factual

O relatório e a PR registram:

- HTTP 200 em `GET /v26.0/me?fields=client_business_id`;
- `client_business_id` presente e não vazio: `5301659283195806`;
- `id`: `122103866379446065`;
- o `id` coincide com o `external_user_id` persistido;
- reconfirmação `debug_token`: HTTP 200, `is_valid=true`, `type=SYSTEM_USER`;
- nenhuma escrita na Meta ou no Supabase;
- script usado para esta prova foi temporário e não versionado.

A auditoria GPT reconfirmou no Supabase, depois da investigação:

- conexão `Teste 003A - conexao Meta` = `ACTIVE`;
- `updated_at` permanece no instante original da conexão;
- `disconnected_at` = nulo;
- referência do token = presente;
- segredo correspondente no Vault = presente.

## 3. Aderência ao mandato

**PASSOU.**

Não houve alteração de código de produção no delta factual. A branch incorporou documentos/governança já existentes da `main`, mas a investigação em si não promoveu uma nova mutação externa nem persistiu script de diagnóstico.

## 4. Consequência arquitetural

A presença de `client_business_id` no token real fecha a prova necessária pela Decisão 003A-06: a credencial usada pela conexão real é compatível com o contrato de **Business Integration System User Access Token (BISU)** do Facebook Login for Business, e não deve ser tratada como um System User Access Token clássico apenas porque `debug_token.type` retorna `SYSTEM_USER`.

A escolha do mecanismo de invalidação permanece decisão GPT e é encerrada no documento `DECISAO_ARQUITETURAL_003A_06_REVOGACAO_TOKEN_BUSINESS_LOGIN.md`.

## 5. Veredicto

`003A-06A AUDITADA E APROVADA — CLASSIFICAÇÃO BISU COMPROVADA — AGUARDANDO EXECUÇÃO DA CORREÇÃO 003A-07`
