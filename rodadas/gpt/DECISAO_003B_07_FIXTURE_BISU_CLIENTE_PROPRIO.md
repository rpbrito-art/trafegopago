# DECISÃO 003B-07 — FIXTURE BISU COM CLIENTE DE TESTE PRÓPRIO

Status: **RETRATADA — NÃO EXECUTAR**.

Rodada-mãe: **003B — Meta Asset Discovery & Selection**.

## 1. Retratação

A decisão anterior de criar um novo Meta Business Portfolio chamado `Tráfego Pago Cliente Teste` foi incorreta e está formalmente retratada.

Fatos operacionais confirmados:

- a conta do fundador já atingiu o limite atual de **dois Meta Business Portfolios**;
- portanto não existe vaga disponível para criar um terceiro portfólio;
- o portfólio que está **bloqueado/inutilizável é `Bizzman5po`**;
- **não confundir `Bizzman5po` com `BizzManiq1`**;
- `BizzManiq1` não deve ser descrito como bloqueado sem nova evidência;
- Quoron continua sendo o portfólio dono do app canônico e, no E2E observado, apareceu inelegível para atuar como cliente do próprio app (`This Meta Business Account owns the app`).

## 2. Causa da falha de decisão

A versão anterior deste documento misturou identidades de recursos Meta diferentes e registrou incorretamente `BizzManiq1` como o portfólio bloqueado.

A busca atual no repositório não encontrou registro histórico anterior suficiente para sustentar essa associação. O fato correto foi reafirmado diretamente pelo fundador e passa a ser canônico: **o bloqueio é de `Bizzman5po`**.

Regra reforçada: nomes de portfólios, apps, configurações e contas Meta não podem ser inferidos por semelhança nominal. Quando a identidade não estiver documentalmente comprovada, registrar a incerteza em vez de preencher por hipótese.

## 3. Consequências

- não pedir criação de terceiro Business Portfolio;
- não excluir `Bizzman5po` por tentativa apenas para liberar vaga;
- não usar empresa/portfólio de terceiro apenas para o E2E;
- não tratar `BizzManiq1` como bloqueado;
- não decidir ainda qual recurso existente poderá servir como cliente BISU até reconstruir corretamente o inventário dos dois portfolios existentes e seus estados.

## 4. Próximo trabalho autorizado

GPT deve reconstruir o inventário Meta real e distinguir, por evidência:

1. quais são exatamente os dois Business Portfolios que contam para o limite da conta;
2. qual o papel atual de `BizzManiq1`;
3. qual o estado e a restrição de `Bizzman5po`;
4. se algum dos portfolios existentes pode legitimamente funcionar como cliente separado no E2E BISU.

Nenhuma criação, exclusão, transferência, alteração de app, alteração de scopes ou OAuth está autorizada enquanto esse inventário não estiver reconstruído.

## 5. Continua proibido

- criar terceiro Business Portfolio;
- excluir `Bizzman5po` por tentativa;
- empresa/portfólio de terceiro;
- transferir o app;
- transferir ownership de Page/Instagram/Ad Account;
- adicionar scopes por tentativa;
- campanha/anúncio/gasto;
- Page Access Token;
- promover/mergear 003B antes de resolver o gate E2E BISU.
