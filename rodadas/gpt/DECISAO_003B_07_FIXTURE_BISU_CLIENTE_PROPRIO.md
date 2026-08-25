# DECISÃO 003B-07 — FIXTURE BISU COM CLIENTE DE TESTE PRÓPRIO

Status: **DECIDIDA / AÇÃO MANUAL DO FUNDADOR AUTORIZADA**.

Rodada-mãe: **003B — Meta Asset Discovery & Selection**.

## 1. Problema a resolver

A 003B está executada e auditada em código, com CI verde, mas ainda não foi promovida porque falta um E2E real do caminho canônico **Facebook Login for Business + BISU**.

O portfólio **Quoron** (`5301659283195806`) é o dono do app `Trafego Pago Business Dev`. No fluxo real da Meta ele apareceu desabilitado como cliente com a mensagem:

`This Meta Business Account owns the app`

Logo, o mesmo portfólio não serve simultaneamente como provedor/dono do app e como cliente do teste.

O fundador já decidiu que **não será usada empresa/portfólio de terceiro** apenas para provar a integração.

## 2. Evidência oficial usada na decisão

A documentação oficial do ecossistema Meta/WhatsApp, publicada em 2026, afirma explicitamente que **uma empresa pode criar múltiplos Meta Business Portfolios**. Isso confirma que separar um portfólio provedor de um portfólio cliente próprio é um arranjo suportado pela plataforma.

Fonte primária:

- WhatsApp Business — `Best practices for marketing messages on WhatsApp`, seção *WhatsApp Business Account overview and considerations*, p. 13: “A business may create multiple Meta business portfolios”.
- URL: `https://whatsappbusiness.com/wp-content/uploads/2026/04/Best-Practices-for-Marketing-Messages-on-WhatsApp-.pdf`

Como evidência estrutural adicional, o SDK oficial `facebook-nodejs-business-sdk` expõe no objeto `Business` os edges de negócios e ativos, inclusive `owned_businesses`, e no objeto `SystemUser` expõe `assigned_pages`. Isso é compatível com a separação de identidades e ativos entre negócios.

## 3. Decisão

Criar um **segundo Meta Business Portfolio controlado pelo próprio fundador**, exclusivamente como cliente de teste do Tráfego Pago.

Nome operacional definido:

**Tráfego Pago Cliente Teste**

Esse portfólio:

- não será terceiro;
- não será dono do app;
- não receberá o app;
- não movimentará a propriedade do app;
- não fará campanha nem gasto;
- servirá somente como contraparte cliente para o E2E BISU.

O app continua pertencendo ao portfólio **Quoron**.

## 4. Por que não usar um child business criado via API

O SDK oficial permite `Business.createOwnedBusiness()` via `/owned_businesses`, mas esse caminho criaria um negócio **possuído pelo portfólio provedor**. Isso pode manter uma relação de ownership com o mesmo negócio que possui o app e não reproduz tão fielmente o caso de um cliente independente.

Por isso o primeiro teste deve usar um segundo portfólio próprio, porém separado, criado pela interface normal da Meta.

## 5. Estratégia de ativos — sem criar risco desnecessário

Depois que o portfólio `Tráfego Pago Cliente Teste` existir, o teste deve preferir **compartilhamento de acesso**, não transferência de propriedade.

A estratégia será:

1. manter Page Quoron e `@goquoron` onde estão;
2. conceder ao portfólio cliente de teste apenas o acesso necessário aos ativos para o E2E;
3. se necessário para Ads, compartilhar apenas uma conta de anúncios existente com permissão mínima suficiente para leitura;
4. não transferir ownership de Page, Instagram, Ad Account ou app;
5. depois executar o Facebook Login for Business selecionando `Tráfego Pago Cliente Teste` como cliente.

Se a Meta não permitir que ativos compartilhados sejam usados nesse fluxo, somente então será criada fixture isolada de Page/Instagram dentro do portfólio de teste. Não criar esses ativos antes de necessidade material.

## 6. E2E que deverá ser provado depois da criação do portfólio

O próximo E2E BISU deve provar, com token emitido pelo fluxo real:

1. `client_business_id` corresponde ao portfólio `Tráfego Pago Cliente Teste`;
2. a credencial é classificada como BISU pelo mecanismo já auditado;
3. `/{system-user-id}/assigned_pages` retorna a Page autorizada;
4. a Page resolve `instagram_business_account`;
5. o IG pode ser lido com o mesmo token no escopo autorizado;
6. `/me/adaccounts` é exercitado com BISU quando `ads_read` estiver presente;
7. a seleção no Tráfego Pago redescobre e persiste somente o ativo autorizado;
8. nenhuma campanha, anúncio ou gasto é criado.

## 7. Ação manual autorizada agora

Única ação manual autorizada neste momento:

**criar o Business Portfolio `Tráfego Pago Cliente Teste` na própria conta Meta do fundador.**

Não compartilhar ativos ainda. Não alterar app, Business Login Configuration, scopes, `.env.local`, Page, Instagram ou Ad Account ainda.

Depois dessa criação, o GPT continua imediatamente com o próximo passo operacional.

## 8. Continua proibido

- empresa/portfólio de terceiro;
- transferir o app para o portfólio de teste;
- transferir ownership da Page/Instagram/Ad Account;
- criar campanha/anúncio/gasto;
- adicionar scopes por tentativa;
- Page Access Token;
- promover/mergear 003B antes do E2E BISU.
