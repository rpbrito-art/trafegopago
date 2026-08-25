# REGISTRO 003B-04 — HIPÓTESE DE SEPARAÇÃO ENTRE PROVEDOR E CLIENTE DE TESTE

Status: **ANULADO COMO DECISÃO — HIPÓTESE EM DEBATE, NÃO AUTORIZADA PELO FUNDADOR**
Data: 2026-08-24
Rodada pai: **003B — Meta Asset Discovery & Selection**

## 1. Correção de governança

Este arquivo foi criado prematuramente como se o fundador tivesse decidido separar o portfólio provedor/dono do app e o portfólio cliente de teste.

Isso estava incorreto. O fundador estava **debatendo uma alternativa**, não autorizando uma decisão.

Portanto:

- nenhuma decisão arquitetural 003B-04 está vigente;
- nenhuma nova fixture cliente foi autorizada;
- nenhuma criação de portfólio, Página, Instagram ou conta de anúncios foi autorizada por este registro;
- este arquivo permanece apenas como trilha de auditoria do erro documental e das hipóteses discutidas.

## 2. Fato observado que permanece válido

No E2E real do Facebook Login for Business, o portfólio **Quoron** apareceu desabilitado no seletor de portfólio empresarial com a mensagem literal:

`This Meta Business Account owns the app`

O fluxo passou a oferecer criação de novo portfólio para ocupar o papel de empresa cliente.

Esse é um **fato observado**, não uma decisão sobre como contorná-lo.

## 3. Hipóteses em debate — nenhuma autorizada

As alternativas atualmente em debate incluem, sem decisão tomada:

1. usar um portfólio empresarial distinto como fixture de cliente;
2. criar ou reorganizar uma fixture de teste sem afetar os ativos Quoron;
3. investigar se acesso de parceiro/compartilhamento oficial permite que ativos Quoron sejam usados por um portfólio operacional distinto;
4. reavaliar o modelo de token/login apenas se evidência técnica justificar.

Nenhuma dessas alternativas pode ser executada sem decisão posterior do GPT + autorização do fundador quando houver impacto externo/material.

## 4. Objetivo de produto preservado

Permanece como requisito de produto que o próprio **Quoron possa usar o software no futuro** para operar sua presença e demonstrar/comercializar o SaaS.

O bloqueio atual do portfólio dono do app no Business Login não resolve nem invalida esse objetivo; apenas mostra que o E2E atual precisa de investigação antes de escolhermos a arquitetura/fixture correta.

## 5. Proibições vigentes

Até decisão posterior:

- não criar `Quoron 1`;
- não inventar site/domínio;
- não mover Página Quoron ou `@goquoron` entre portfólios por tentativa;
- não transferir a propriedade do app;
- não assumir que acesso de parceiro resolverá o fluxo sem prova;
- não desconectar a conexão Meta atual por conveniência;
- não iniciar novo OAuth baseado nesta hipótese.

## 6. Próximo passo correto

Debater e investigar qual estrutura de teste reproduz o cenário real de cliente **sem comprometer o objetivo de usar o próprio Quoron no produto no futuro**.

Somente depois registrar uma decisão efetiva, com autorização explícita quando aplicável.
