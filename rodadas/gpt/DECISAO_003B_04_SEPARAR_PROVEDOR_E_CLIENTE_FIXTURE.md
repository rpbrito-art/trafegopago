# DECISÃO 003B-04 — SEPARAR PROVEDOR/DONO DO APP E EMPRESA CLIENTE DE TESTE

Status: **DECIDIDA PELO FUNDADOR — VIGENTE**
Data: 2026-08-24
Rodada pai: **003B — Meta Asset Discovery & Selection**

## 1. Fato observado

No E2E real do Facebook Login for Business, o portfólio **Quoron** apareceu desabilitado no seletor de portfólio empresarial com a mensagem literal:

`This Meta Business Account owns the app`

O fluxo passou a oferecer somente a criação de um novo portfólio para ocupar o papel de empresa cliente.

## 2. Decisão

Separar os papéis:

- **Quoron** permanece como empresa provedora/dona do aplicativo Meta e marca do SaaS;
- o E2E do fluxo de cliente deve usar um **portfólio empresarial distinto**, que não seja dono do app;
- não criar `Quoron 1` apenas para contornar a restrição;
- não transferir a propriedade do app por tentativa;
- não mover os ativos Quoron por tentativa.

## 3. Objetivo de produto preservado

O fundador quer que o próprio Quoron possa usar o software no futuro para operar e comercializar o produto.

Essa meta permanece válida. O fato de o portfólio dono do app não poder ocupar o papel de cliente nesse Business Login não significa que a marca Quoron não possa usar o SaaS.

O modelo a validar posteriormente é:

1. Quoron permanece dono do app e dos seus ativos;
2. um portfólio operacional/cliente distinto recebe acesso autorizado aos ativos Quoron por mecanismo oficial de compartilhamento/partner access, sem transferência de propriedade;
3. esse portfólio distinto percorre o mesmo onboarding que qualquer cliente;
4. o SaaS pode então operar os ativos Quoron como cliente interno/demonstração, se a Meta permitir esse conjunto no E2E real.

Esse caminho é hipótese operacional a validar, não fato ainda provado no nosso app.

## 4. Fixture da 003B

Para concluir a 003B, usar uma empresa/portfólio cliente real ou de teste separado do portfólio Quoron dono do app.

Critérios desejáveis da fixture:

- não possuir o app Meta;
- ser administrada pelo fundador ou por colaborador autorizado;
- ter Página do Facebook;
- ter Instagram profissional ligado à Página;
- idealmente ter conta de anúncios utilizável para os gates futuros de mídia paga, embora a 003B possa validar primeiro o ramo Instagram.

## 5. Proibições

Até nova decisão:

- não criar portfólio duplicado `Quoron 1`;
- não inventar site/domínio;
- não transferir o app para outro portfólio;
- não mover Página Quoron ou `@goquoron` de portfólio apenas para fechar o teste;
- não assumir que partner access resolverá o Business Login sem E2E real;
- não desconectar a conexão Meta atual por conveniência.

## 6. Próximo gate

Identificar qual portfólio empresarial distinto será usado como fixture cliente da 003B.

Depois, o GPT conduz a preparação dos ativos desse portfólio e somente então libera novo OAuth real.
