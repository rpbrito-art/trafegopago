# DECISÃO 003B-07 — FIXTURE BISU COM CLIENTE DE TESTE PRÓPRIO

Status: **RETRATADA — NÃO EXECUTAR**.

Rodada-mãe: **003B — Meta Asset Discovery & Selection**.

## 1. Retratação

A decisão anterior de criar um novo Meta Business Portfolio chamado `Tráfego Pago Cliente Teste` foi incorreta e está formalmente retratada.

O fundador já possui **dois Meta Business Portfolios**, que é o limite atualmente imposto à sua conta. Um deles é **Quoron** e o outro é **BizzManiq1**. O portfólio `BizzManiq1` está bloqueado/inutilizável no estado atual.

Consequências:

- não existe vaga disponível para criar um terceiro portfólio;
- não pedir ao fundador para criar outro Business Portfolio;
- não excluir `BizzManiq1` por tentativa apenas para liberar vaga: o histórico já registrou que excluir pode não liberar capacidade imediatamente e pode piorar a situação;
- não usar empresa/portfólio de terceiro apenas para o E2E;
- Quoron continua dono do app e continua inelegível como cliente do próprio app no fluxo BISU observado.

## 2. Causa da falha de decisão

A pesquisa oficial usada na versão anterior provava apenas que a Meta admite múltiplos Business Portfolios em geral. Ela **não provava que esta conta específica ainda tinha capacidade para criar outro**.

O GPT tinha contexto anterior suficiente para saber que a conta do fundador já havia atingido o limite de dois portfolios. Esse estado operacional não estava preservado em `estado.md`, e a ausência documental foi tratada incorretamente como ausência do fato.

Regra corrigida: antes de instrução manual que dependa de capacidade/limite externo, conferir também o estado específico da conta já conhecido no histórico, não apenas a possibilidade abstrata documentada pela plataforma.

## 3. Caminho de resolução agora

A única fixture própria potencialmente elegível já existente é `BizzManiq1`.

Portanto, o próximo trabalho deixa de ser "criar cliente de teste" e passa a ser:

1. identificar exatamente a restrição/bloqueio atual de `BizzManiq1`;
2. verificar se a Meta oferece revisão/recuperação suportada;
3. se recuperável, usar `BizzManiq1` como cliente separado no E2E BISU;
4. somente se a Meta declarar esse portfólio irrecuperável, reavaliar alternativas técnicas como fixture criada por API/owned business — sem assumir elegibilidade para Facebook Login for Business até prova oficial.

## 4. Ação manual permitida

Nenhuma criação, exclusão, transferência ou OAuth está autorizada por este documento.

É permitido apenas **inspecionar o estado/restrição de `BizzManiq1` na Meta Business Support Home / Account Quality**, sem solicitar exclusão e sem alterar ativos.

## 5. Continua proibido

- criar terceiro Business Portfolio;
- excluir `BizzManiq1` por tentativa;
- empresa/portfólio de terceiro;
- transferir o app;
- transferir ownership de Page/Instagram/Ad Account;
- adicionar scopes por tentativa;
- campanha/anúncio/gasto;
- Page Access Token;
- promover/mergear 003B antes de resolver o gate E2E BISU.
