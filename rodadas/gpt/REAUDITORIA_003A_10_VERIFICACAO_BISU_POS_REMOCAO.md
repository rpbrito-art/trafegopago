# REAUDITORIA 003A-10 — VERIFICAÇÃO BISU PÓS-REMOÇÃO

Status: **AUDITADA E APROVADA — MIGRATION REMOTA PENDENTE — E2E FINAL AINDA NÃO CONCLUÍDO**
Data: 2026-08-24
Branch auditada: `claude/rodada-003a-meta-connection-foundation`
Head auditado: `12c179a6d114ede60d5f8675c4813ea03bd75ba6`
PR: #11 draft
CI: `32768038482` — verde em install, lint, typecheck, Edge Functions, testes e build.

## 1. Resultado

A Correção 003A-10 foi implementada de acordo com o mandato e passa na auditoria de código.

Aprovado:

- migration aditiva `20260824170000_add_meta_external_disconnect_pending.sql`, sem editar migrations aplicadas;
- coluna `external_disconnect_pending_at` para persistir remoção BISU em andamento;
- RPC `mark_meta_external_disconnect_pending`, idempotente e executável apenas por `service_role`;
- `revoke_meta_connection` limpa também o marcador no encerramento;
- `disconnectMeta` só grava o marcador depois de comprovar token válido + credencial BISU;
- nenhuma primitive mutável (`oauth/revoke`, `/permissions`, `/access_tokens`) é usada para BISU;
- UI deriva `remocao-externa-pendente` do banco, portanto reload/login não perdem o fluxo;
- orientação corrigida para `Configurações do negócio > Apps conectados`;
- `checkMetaDisconnection` mantém `is_valid=false` explícito como prova forte;
- para o caso BISU pendente cuja inspeção deixa de ser utilizável, a prova composta exige: marcador persistente, app token saudável e assinatura observada do token alvo em endpoint read-only;
- `190` genérico, subcode diferente, falha do app token, rede, 5xx e ambiguidade continuam fail-closed;
- verificações repetidas são idempotentes;
- logs não carregam token/App Secret.

A assinatura `190/464` não é aceita como regra global de revogação. O código só a considera dentro do fluxo BISU explicitamente persistido e com controles adicionais. Isso preserva a correção 003A-03.

## 2. Provas

- 138 testes focados em Meta/componentes, conforme relatório do executor;
- suíte completa local: 648 verdes;
- lint, typecheck e build verdes;
- CI do HEAD `12c179a...`: run `32768038482`, integralmente verde.

## 3. Migration remota

Auditoria independente no Supabase confirmou:

- `external_disconnect_pending_at` ainda **não existe** no remoto;
- conexão real `9d256edf-0a89-4436-8d60-f375bc087c08` permanece `ACTIVE`;
- `disconnected_at` nulo;
- referência do token presente;
- segredo correspondente ainda existe no Vault.

Portanto nenhum estado remoto foi alterado pelo Claude.

## 4. Particularidade do E2E já em andamento

O E2E real começou antes da 003A-10:

1. o fundador pediu `Desconectar` quando ainda não existia marcador persistente;
2. a integração correta foi removida em **Apps conectados**;
3. a 003A-09 provou que o token alvo deixou de operar;
4. somente depois foi criada a coluna `external_disconnect_pending_at`.

Logo, aplicar a migration criará a coluna com `NULL` na conexão real já em andamento. Isso **não é defeito do fluxo futuro**; é uma transição one-off do fixture real usado para descobrir o comportamento da Meta.

Depois da migration, o GPT deverá reconstruir apenas esse fato já auditado, marcando a conexão real como remoção externa pendente. Não refazer OAuth e não remover novamente a integração na Meta.

## 5. Próximo gate

Ordem obrigatória:

1. aplicar somente a migration `20260824170000` no Supabase remoto;
2. GPT comprovar schema/ACL/RPC no remoto;
3. GPT marcar exclusivamente a conexão real do E2E como remoção externa pendente, porque a ação humana ocorreu antes da existência da coluna;
4. founder executar uma única vez `Já removi — verificar`;
5. GPT comprovar pós-condição: `REVOKED`, `disconnected_at` preenchido, referência nula e segredo removido do Vault;
6. somente então promover a 003A.

## 6. Continua proibido

Até o gate acima:

- nova remoção/reassociação no painel Meta;
- novo OAuth;
- seleção de ativos;
- limpeza manual do segredo;
- iniciar 003B;
- promover/mergear 003A.
