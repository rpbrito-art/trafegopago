# GATE 003B — OAUTH REAL: ESCOPOS DO INSTAGRAM AUSENTES

Status: **DIAGNÓSTICO CONFIRMADO — AJUSTE EXTERNO NECESSÁRIO ANTES DE NOVA TENTATIVA**
Data: 2026-08-24

## Fato observado

Após novo OAuth real com o portfólio **Quoron**, Página **Quoron** e conta profissional **@goquoron**, a conexão foi criada como `ACTIVE` e o token foi armazenado no Vault.

Auditoria independente no Supabase sobre a conexão `655da6e6-9056-456d-a81d-5e2570da5faf` mostrou os escopos efetivamente concedidos:

- `pages_show_list`;
- `pages_read_engagement`;
- `public_profile`.

Não foram concedidos:

- `instagram_basic`;
- `instagram_manage_insights`.

Nenhuma linha foi persistida em `instagram_accounts` ou `ad_accounts`.

## Interpretação

O ativo Instagram existe, está profissional, está no portfólio Quoron e apareceu no seletor do Facebook Login for Business. Portanto o bloqueio atual não é ausência de ativo.

A descoberta da 003B exige `pages_show_list + instagram_basic`; como `instagram_basic` não consta em `granted_scopes`, o código falha fechado antes de tentar oferecer o Instagram como candidato.

`instagram_manage_insights` também está ausente e será necessário para a capacidade de Insights da Fase 4.

## Decisão

Não alterar código para ignorar os escopos faltantes. Primeiro auditar/corrigir a configuração externa `Quoron Instagram Dev Login` (Configuration ID `38307908848822330`) para garantir que as permissões do Instagram estejam realmente selecionadas/concedíveis.

A conexão atual deve permanecer intacta durante o diagnóstico. Não desconectar e não repetir OAuth por tentativa até conferir a configuração.

## Próxima ação autorizada

GPT + fundador devem abrir no Meta for Developers a configuração `Quoron Instagram Dev Login`, editar **Permissões** e confirmar especificamente se `instagram_basic` e `instagram_manage_insights` estão selecionadas. Se não estiverem, adicioná-las. Se estiverem selecionadas e ainda assim não forem concedidas, investigar nível de acesso/use case do app antes de nova tentativa OAuth.
