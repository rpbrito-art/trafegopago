# RESULTADO 003B-04 — APP META DE TESTE SEM PORTFÓLIO

Status: **EXPERIMENTO EXECUTADO — HIPÓTESE BISU REPROVADA**
Data: 2026-08-25
Rodada pai: **003B — Meta Asset Discovery & Selection**

## 1. Objetivo

Testar se um segundo Meta App, criado sem Business Portfolio proprietário, poderia reproduzir o fluxo vigente de **Facebook Login for Business + System-user access token (BISU)** e então permitir que o portfólio Quoron fosse selecionado como cliente.

## 2. Fatos observados

- o app `Trafego Pago E2E Test` foi criado sem Business Portfolio associado;
- o caso de uso `Gerenciar mensagens e conteúdo no Instagram` foi adicionado;
- dentro dele, a Meta ofereceu o caminho `API setup with Facebook login`;
- esse caminho expôs `Login do Facebook para Empresas` e permitiu iniciar a criação de uma configuração;
- na etapa `Escolher o token de acesso`, `Token de acesso do usuário` ficou disponível;
- `Token de acesso do usuário do sistema` ficou desabilitado com a mensagem literal de que a opção não está disponível porque o app não está associado a um portfólio empresarial.

## 3. Conclusão do experimento

A hipótese de usar **o mesmo contrato BISU da arquitetura vigente** em um app de teste sem portfólio foi reprovada pela própria UI da Meta.

O experimento não prova que `User Access Token` seja adequado para substituir BISU. Essa seria uma arquitetura diferente, com ciclo de vida, revogação e comportamento operacional próprios.

## 4. O que não foi feito

- nenhum Business Portfolio foi associado ao app de teste;
- o app de teste não foi associado ao portfólio Quoron;
- `User Access Token` não foi selecionado;
- `.env.local` não foi alterado;
- a conexão real vigente não foi desconectada nem substituída;
- nenhum novo OAuth foi concluído;
- nenhum token novo foi persistido.

## 5. Gate

`DECISÃO ARQUITETURAL NECESSÁRIA — AGUARDANDO GPT/FUNDADOR`

Alternativas ainda em debate:

1. manter BISU como arquitetura e aguardar a liberação de um segundo portfólio empresarial elegível para o E2E real;
2. usar `User Access Token` apenas como instrumento diagnóstico temporário, sem promover 003B com base nele;
3. reavaliar formalmente a arquitetura de autenticação, o que exigiria nova decisão e auditoria de impacto.
