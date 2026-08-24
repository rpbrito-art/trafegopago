# GATE 003A-10B — MARCADOR E2E PÓS-MIGRATION

Status: **AUTORIZADO PARA EXECUÇÃO CONTROLADA PELO CLAUDE CODE**
Data: 2026-08-24
Branch: `claude/rodada-003a-meta-connection-foundation`
PR: #11 draft

## 1. Contexto comprovado

A migration `20260824170000_add_meta_external_disconnect_pending.sql` já foi aplicada no Supabase remoto e auditada pelo GPT:

- histórico remoto com 14 migrations;
- `20260824170000` presente;
- coluna `public.meta_connections.external_disconnect_pending_at` presente;
- conexão real `9d256edf-0a89-4436-8d60-f375bc087c08` continua `ACTIVE`;
- `disconnected_at` nulo;
- referência de token presente;
- segredo correspondente no Vault presente;
- `external_disconnect_pending_at` continua nulo.

A integração BISU real já foi removida anteriormente na superfície correta **Business Settings > Apps conectados** e isso foi auditado na 003A-09. O token alvo já não opera e reproduz a assinatura pós-remoção observada (`debug_token` HTTP 400 sem `data`; `/me` HTTP 400 OAuth 190/subcode 464), enquanto o app token permanece saudável.

O marcador está nulo apenas porque a remoção externa ocorreu antes da existência da nova coluna.

## 2. Tentativa GPT e limitação do conector

O GPT tentou chamar `mark_meta_external_disconnect_pending` pelo conector Supabase, mas a ACL bloqueou com `permission denied for function` porque a função está restrita a `service_role` — comportamento esperado e correto.

O GPT tentou então um `UPDATE` direto estritamente limitado à conexão, mas o conector Supabase opera em transação somente leitura e respondeu `cannot execute UPDATE in a read-only transaction`.

Nenhuma dessas tentativas alterou dados.

## 3. Única ação autorizada ao Claude

Executar **somente** a marcação one-off da conexão real do E2E usando o caminho server-side `service_role` já existente e sem expor segredo:

- alvo obrigatório: conexão `9d256edf-0a89-4436-8d60-f375bc087c08`;
- organização: `Teste 003A - conexao Meta`;
- chamar preferencialmente a RPC `public.mark_meta_external_disconnect_pending` com esse UUID usando credencial `service_role` já disponível no ambiente local;
- não imprimir a service-role key;
- não alterar `status`, `token_secret_reference`, Vault, `disconnected_at`, escopos ou qualquer outro campo;
- não chamar endpoint Meta;
- não clicar nada na UI;
- não executar `revoke_meta_connection`;
- não reaplicar migration.

## 4. Prova obrigatória após a marcação

Consultar somente leitura e registrar:

- conexão continua `ACTIVE`;
- `external_disconnect_pending_at` agora é não nulo;
- `disconnected_at` continua nulo;
- referência do token continua presente;
- segredo no Vault continua presente.

Atualizar o relatório da branch com esse fato e parar em:

`003A-10B EXECUTADA — MARCADOR E2E PERSISTIDO — AGUARDANDO AUDITORIA GPT — NENHUMA LIMPEZA EXECUTADA`

## 5. Continua proibido

- `Desconectar` na UI;
- `Já removi — verificar` na UI;
- qualquer nova ação no painel Meta;
- novo OAuth;
- seleção de ativos;
- limpeza manual do token/segredo;
- início da 003B;
- promoção/merge da 003A.
