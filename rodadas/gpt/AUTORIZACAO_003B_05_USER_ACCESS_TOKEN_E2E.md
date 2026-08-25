# AUTORIZAÇÃO 003B-05 — EXPERIMENTO E2E COM USER ACCESS TOKEN

Data: 2026-08-25
Rodada pai: **003B — Meta Asset Discovery & Selection**
Status: **AUTORIZADO PELO FUNDADOR PARA EXPERIMENTO CONTROLADO — NÃO É DECISÃO ARQUITETURAL DEFINITIVA**

## 1. Contexto

O E2E da 003B ficou bloqueado porque o portfólio empresarial **Quoron** é dono do app oficial e, no fluxo BISU atual, a Meta o exibiu como inelegível para ocupar simultaneamente o papel de empresa cliente (`This Meta Business Account owns the app`).

Foi criado o app **Trafego Pago E2E Test** sem Business Portfolio associado. Esse app expõe `Login do Facebook para Empresas`, mas a Meta desabilita `Token de acesso do usuário do sistema` quando o app não pertence a um portfólio empresarial. A opção `Token de acesso do usuário` permanece disponível.

O fundador não quer depender de conta de terceiro e não quer ficar aguardando por dias a liberação de outro portfólio para conseguir continuar o desenvolvimento.

## 2. Autorização

O fundador autorizou explicitamente prosseguir com um **experimento real de User Access Token** no app `Trafego Pago E2E Test`.

A autorização serve para provar ou reprovar, em sequência, se este caminho consegue:

1. concluir a configuração do Facebook Login for Business usando `Token de acesso do usuário`;
2. autorizar o portfólio/ativos Quoron sem o bloqueio observado no app oficial;
3. emitir um token com os escopos realmente necessários à 003B;
4. permitir descoberta da Página Quoron e do Instagram profissional `@goquoron`;
5. permitir seleção segura do Instagram;
6. permitir sonda read-only do IG User e de Insights conforme o mandato da 003B;
7. quando tecnicamente disponível e sem gasto, avaliar `ads_read`/descoberta de conta de anúncios como capacidade read-only.

## 3. O que esta autorização NÃO decide

Esta autorização **não** substitui definitivamente BISU por User Access Token no produto.

Ainda não está autorizado:

- alterar os canônicos para declarar User Access Token como arquitetura promovida;
- remover o suporte BISU;
- promover a 003B apenas porque o OAuth com User Access Token concluiu;
- criar campanha, anúncio, orçamento ou gasto;
- ampliar permissões além das necessárias sem novo gate;
- persistir Page Access Token sem decisão arquitetural específica;
- iniciar Fase 4.

## 4. Método de prova

O experimento deve ser conduzido gate a gate. Uma falha relevante interrompe o fluxo e volta ao GPT antes de qualquer contorno.

Critério de sucesso técnico mínimo antes de recomendar mudança arquitetural:

`configuração USER → OAuth real → Quoron elegível → escopos corretos → Page descoberta → @goquoron descoberto → seleção persistida → leitura IG User → Insights`

A recomendação arquitetural definitiva só poderá ser feita depois de revisar também ciclo de vida/expiração, renovação/reautorização, revogação, impacto em Ads e segurança operacional.

## 5. Preservações

- conexão real atual `655da6e6-9056-456d-a81d-5e2570da5faf` deve ser preservada até que o GPT determine o momento seguro de substituição/reautorização;
- app oficial `Trafego Pago Business Dev` e configurações históricas permanecem intactos;
- o novo app E2E continua sem Business Portfolio associado enquanto este experimento estiver em curso;
- nenhum segredo deve ser registrado em chat ou documentação.
