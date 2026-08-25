# CORREÇÃO 003B-06 — DISCOVERY SENSÍVEL AO TIPO DE CREDENCIAL

Status: **AUTORIZADA PARA EXECUÇÃO PELO CLAUDE CODE**.

Rodada-mãe: **003B — Meta Asset Discovery & Selection**.

Natureza: correção/hardening dentro da 003B. Não é nova fase, não promove a 003B e não autoriza alteração externa na Meta.

## 1. Fatos já auditados — NÃO REDESCOBRIR

O experimento USER provou:

- token USER válido, app/identidade esperados e scopes corretos;
- `/me/accounts` → HTTP 200 com 0 Pages;
- leitura direta da Page Quoron → HTTP 200;
- a Page resolve o IG profissional `17841429590351285`;
- leitura direta do IG User → HTTP 200;
- Insights `reach/day` → HTTP 200;
- `/me/adaccounts` → HTTP 200 com contas;
- nada disso exigiu `business_management`, `ads_management` ou Page Access Token.

Portanto não repetir essas sondas.

## 2. Defeito arquitetural encontrado na auditoria

`src/lib/meta/assets.ts` usa hoje `me/accounts` como descoberta de Pages para qualquer conexão.

Isso mistura classes de credencial diferentes.

A 003A já contém infraestrutura de inspeção/classificação em `src/lib/meta/gateway.ts`:

- `debug_token` fornece validade/tipo;
- `debug_token.type=SYSTEM_USER` sozinho NÃO é prova suficiente de BISU;
- a classificação existente usa evidência adicional de `client_business_id` para distinguir BISU com segurança.

Não duplicar uma classificação mais fraca dentro de `assets.ts`.

## 3. Objetivo

Tornar a descoberta de ativos **credential-aware** no servidor:

1. classificar com segurança a credencial corrente;
2. escolher o mecanismo de descoberta de Pages compatível com a classe real;
3. manter o restante do pipeline de Page → `instagram_business_account` → metadados IG → seleção validada;
4. manter Ads independente e sem ampliar permissões.

## 4. Regras de implementação

### 4.1 Classificação

Preferir extrair/centralizar da 003A uma função read-only reutilizável de classificação, em vez de copiar lógica.

A classificação deve ser fail-closed.

É proibido:

- usar `external_business_id` como proxy de tipo;
- assumir `SYSTEM_USER` == BISU;
- inferir tipo pelo comprimento/formato do token;
- retornar token/classificação sensível ao browser.

Não criar migration/coluna para persistir tipo de token salvo se surgir necessidade material incontornável; a preferência é classificação server-side por request.

### 4.2 USER

Para User Access Token comum, preservar `/me/accounts` como mecanismo de descoberta documentado e manter o comportamento/testes existentes.

O fato de o E2E USER Quoron ter retornado zero continua sendo um estado real; não mascarar com ID fixo.

### 4.3 BISU / System User

Não presumir que `/me/accounts` seja o edge correto.

Antes de codificar, estabelecer com evidência vigente — documentação oficial Meta, SDK oficial ou sample oficial Meta — qual edge/listagem representa as Pages atribuídas à identidade do system user/BISU no Graph API atual.

Candidatos estruturais encontrados pela auditoria incluem edges de `assigned_pages` e listagem a partir da identidade do system user, mas **o executor deve confirmar a forma exata antes de implementar**.

Se a forma exata não puder ser estabelecida com evidência suficiente, parar sem alteração comportamental e registrar literalmente:

`DECISÃO ARQUITETURAL NECESSÁRIA — AGUARDANDO GPT`

Não inventar endpoint.

### 4.4 Pipeline depois da Page

Uma Page legitimamente descoberta deve continuar sendo a âncora para resolver `instagram_business_account`.

Não pedir nem persistir Page Access Token nesta correção.

### 4.5 Ad Accounts

Não alterar o ramo de Ads apenas por simetria. Só mude o mecanismo atual se houver evidência concreta de que ele também depende da classe da credencial.

`ads_read` permanece read-only e independente da capacidade orgânica.

## 5. Segurança e não regressão

Preservar obrigatoriamente:

- membership antes da conexão/token;
- token apenas server-side/Vault;
- nenhuma URL arbitrária de `paging.next` seguida;
- paginação reconstruída contra host/version controlados;
- seleção redescobre/revalida o ativo antes de persistir;
- ID arbitrário continua fail-closed;
- erro Meta 190 não revoga nem muda conexão automaticamente;
- candidatos não são persistidos só por descoberta;
- nenhuma credencial/URL com token/message sensível em logs.

## 6. Provas mínimas

Adicionar testes que provem, no mínimo:

- USER roteia para `/me/accounts`;
- BISU/System User roteia para o mecanismo oficialmente confirmado;
- classificação inconclusiva falha fechado e não consulta um edge por chute;
- `SYSTEM_USER` sozinho não é aceito como prova de BISU quando a distinção for material;
- paginação no novo edge respeita os mesmos limites/SSRF controls;
- Page sem IG continua estado vazio, não erro;
- múltiplas Pages/IGs viram candidatos corretamente;
- seleção continua redescobrindo no mesmo caminho credential-aware;
- regressões de USER, tenancy e segurança continuam verdes.

Executar testes Meta relevantes, typecheck, lint e CI normal do PR.

## 7. Fora de escopo / PROIBIDO

- novo OAuth;
- alterar `.env.local`;
- alterar App/Business Login Configuration no painel Meta;
- mudar acesso da Page/Instagram/Business Portfolio;
- usar empresa/portfólio de terceiro;
- adicionar/remover scopes;
- `business_management` ou `ads_management` por tentativa;
- Page Access Token;
- campanha/anúncio/gasto;
- importar conteúdo/Fase 4;
- migration sem necessidade material;
- merge/promover 003B.

## 8. Relatório e parada

Entregar em `rodadas/claude/` um relatório `RELATORIO_CORRECAO_003B_06_DISCOVERY_CREDENTIAL_AWARE.md` contendo:

- mecanismo oficial confirmado para USER e para BISU/System User, com fonte/evidência;
- arquivos alterados;
- como a classificação foi reutilizada/centralizada;
- testes e resultados;
- HEAD/CI;
- limitações restantes.

Depois parar em:

`AGUARDANDO AUDITORIA GPT`

Não iniciar novo E2E e não executar `/proxima` automaticamente.
