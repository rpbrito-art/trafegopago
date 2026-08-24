# INVESTIGAÇÃO 003A-06A — CLASSIFICAÇÃO FACTUAL DO TOKEN FACEBOOK LOGIN FOR BUSINESS

Status: **AUTORIZADA — SOMENTE LEITURA — SEM MUTAÇÃO META/SUPABASE**
Data: 2026-08-24
Branch de trabalho: `claude/rodada-003a-meta-connection-foundation`
PR: #11

## 1. Contexto

A Decisão Arquitetural 003A-06 pertence ao GPT. A pesquisa documental do GPT encontrou no contrato do Facebook Login for Business que:

- uma configuração que solicita `System-user access token` entrega uma **Business Integration System User access token (BISU)**;
- o contrato de gerenciamento BISU expõe `client_business_id` via `GET /me?fields=client_business_id`;
- a documentação de invalidação de BISU aponta para a remoção do app em `Business Manager > Settings > Business Settings > Integrations > Connected apps`;
- o contrato BISU documentado não apresenta `oauth/revoke` como operação de invalidação do token.

Antes de o GPT fechar a arquitetura, falta uma prova factual do token real já emitido para a conexão 003A.

## 2. Única pergunta autorizada ao Claude

Usando **o token real já armazenado no Vault**, exclusivamente server-side, executar uma chamada **somente leitura** equivalente a:

`GET /v26.0/me?fields=client_business_id`

com o token atual.

Relatar ao GPT apenas:

1. HTTP status;
2. se `client_business_id` existe e é não vazio;
3. o valor de `client_business_id` pode ser registrado, pois é identificador de negócio e não credencial;
4. o `id` retornado pode ser registrado;
5. se esse `id` coincide com o `external_user_id` já persistido para a conexão;
6. confirmar novamente que nenhuma escrita ocorreu e que o token segue válido em `debug_token` apenas se isso puder ser feito sem nova mutação.

## 3. Segurança obrigatória

NÃO imprimir, copiar, versionar ou registrar:

- access token;
- App Secret;
- app access token;
- URL completa contendo credenciais;
- headers que contenham autorização.

Não registrar resposta bruta se houver risco de conter credencial. Registrar apenas os campos sanitizados acima.

## 4. Proibições

Esta investigação NÃO autoriza:

- `oauth/revoke`;
- `DELETE /permissions`;
- `DELETE /{system-user-id}/access_tokens`;
- qualquer outro endpoint mutável Meta;
- remoção do app no painel Meta;
- limpeza local;
- alteração de migration/schema;
- refazer OAuth;
- selecionar ativos;
- iniciar 003B;
- promover 003A;
- Claude pesquisar/decidir qual mecanismo de revogação usar.

Não criar código permanente se não for necessário. Prefira execução diagnóstica local/read-only. Se código temporário for indispensável, não publicar sem autorização adicional.

## 5. Handoff

Atualizar somente o relatório da 003A/PR se necessário para registrar o resultado sanitizado. Não executar CI por ritual se nenhum código versionado mudar.

Parar em:

`INVESTIGAÇÃO 003A-06A CONCLUÍDA — AGUARDANDO GPT`
