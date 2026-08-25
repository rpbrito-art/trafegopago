# AUTORIZAÇÃO 003B-04 — APP META DE TESTE SEM PORTFÓLIO

Data: 2026-08-25
Rodada pai: **003B — Meta Asset Discovery & Selection**
Status: **AUTORIZADO PARA EXPERIMENTO CONTROLADO — NÃO É DECISÃO ARQUITETURAL DEFINITIVA**

## 1. Contexto

No E2E real do Facebook Login for Business, o portfólio **Quoron** apareceu desabilitado com a mensagem literal:

`This Meta Business Account owns the app`

O fundador não quer usar conta de terceiro, não possui atualmente um terceiro portfólio disponível e não quer assumir custo pago apenas para destravar o teste.

## 2. Hipótese autorizada para teste

Criar um **segundo Meta App exclusivamente de desenvolvimento**, sem conectá-lo a um Business Portfolio durante a criação, para verificar se:

1. o app pode receber **Facebook Login for Business**;
2. pode criar uma configuração de login compatível com o fluxo atual;
3. a configuração pode usar **System-user access token / BISU** e os ativos Pages + Instagram Accounts;
4. o portfólio **Quoron**, que não será dono desse app de teste, deixa de ser bloqueado no seletor;
5. o backend atual pode apontar temporariamente para esse app apenas por variáveis server-side de ambiente, sem mudança estrutural de código.

## 3. Natureza da autorização

O fundador autorizou **testar esta hipótese** ao responder “ok, vamos fazer”.

Isto NÃO autoriza:

- substituir definitivamente o app oficial `Trafego Pago Business Dev`;
- transferir a propriedade do app oficial;
- alterar a arquitetura canônica de produção;
- migrar para Instagram Login / `instagram_business_*`;
- criar novo portfólio empresarial;
- usar conta de terceiro;
- promover a 003B antes do E2E e auditoria final;
- criar campanhas, anúncios ou gasto.

## 4. Evidência externa preliminar

Há documentação contemporânea de integrações que descreve a criação de um Meta App escolhendo **“I don't want to connect a business portfolio yet”** e, depois, adicionando **Facebook Login for Business**. Isso torna a hipótese plausível, mas o comportamento específico com System-user access token e o portfólio Quoron deve ser provado no painel Meta real antes de qualquer mudança de código ou promoção.

## 5. Próximo gate

Próximo a agir: **fundador no Meta for Developers**.

Criar apenas o novo app de teste, sem conectá-lo a Business Portfolio. Parar assim que chegar ao dashboard do novo app e retornar ao GPT com a tela/resultado.

Nenhuma credencial deve ser colada no chat. App Secret não deve ser revelado.