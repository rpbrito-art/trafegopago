# GATE 003B — OAUTH BLOQUEADO POR PERMISSÕES DE ANÚNCIOS INESPERADAS

Status: **BLOQUEADO — NÃO CONFIRMAR OAUTH**.

## Fato observado

No OAuth real da 003B, após selecionar:

- Empresa/portfólio: Quoron;
- Página do Facebook: Quoron;
- Conta do Instagram: goquoron;
- nenhuma conta de anúncios;

a tela final da Meta informou que `Trafego Pago Business Dev` teria permissão para:

- gerenciar anúncios das contas de anúncios às quais o usuário tem acesso;
- acessar anúncios do Facebook e estatísticas relacionadas.

A tela não oferece opção de recusar apenas essas permissões; apenas `Voltar` ou `Confirmar`.

## Decisão GPT

Não confirmar. Esse consentimento viola o contrato da 003B de que mídia paga é capacidade opcional e não deve ser exigida no login orgânico/Insights.

A configuração `Quoron Instagram Dev Login` deve ser reaberta e auditada antes de novo OAuth.

## Próxima verificação manual

No Meta for Developers, editar a configuração `Quoron Instagram Dev Login` e confirmar explicitamente:

1. em **Ativos**, `Contas de anúncios` não está selecionada;
2. em **Permissões**, `ads_read` e `ads_management` não estão selecionadas nem foram adicionadas como dependência;
3. em **Select Asset Task Permissions**, verificar quais tarefas foram efetivamente configuradas/defaultadas para Pages/Instagram e se alguma delas introduz capacidade publicitária.

Se a UI não permitir remover o poder de anúncios mantendo Pages + Instagram, parar para decisão arquitetural GPT; não confirmar OAuth por tentativa.

Nenhuma conexão nova foi concluída; nenhum callback deve ser aceito antes da correção do gate.