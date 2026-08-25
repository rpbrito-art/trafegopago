# GATE 003B-05 — OAuth USER com substituição controlada da credencial 003B

Data: 2026-08-25

Status: **GATE LIBERADO PARA O EXPERIMENTO E2E AUTORIZADO — NÃO É DECISÃO ARQUITETURAL DEFINITIVA**

## Contexto

O fundador autorizou o experimento 003B-05 com `Token de acesso do usuário` no app `Trafego Pago E2E Test` para provar ou reprovar a cadeia real de Instagram/Insights sem depender da liberação de um segundo Business Portfolio.

A configuração Meta foi criada:

- app: `Trafego Pago E2E Test`;
- configuração: `Quoron E2E Login`;
- Configuration ID: `1068370819137366`;
- token: User Access Token;
- ativos: não selecionáveis por desenho nesse tipo de configuração;
- descoberta de ativos deve ocorrer depois via token do usuário, começando por `/me/accounts`.

O fundador informou que já cadastrou o redirect URI de desenvolvimento, trocou temporariamente no `.env.local` o App ID/App Secret/config ID do app E2E e reiniciou o servidor local. O App Secret não foi exposto no chat ou no repositório.

## Auditoria independente antes do OAuth

O GPT revalidou no Supabase a conexão 003B atualmente viva:

- id `655da6e6-9056-456d-a81d-5e2570da5faf`;
- status `ACTIVE`;
- token reference presente;
- scopes: `pages_show_list`, `pages_read_engagement`, `public_profile`;
- expiração: `2026-10-23 23:30:58.46+00`;
- Instagram selecionado: 0;
- Ad Account selecionada: 0.

Essa credencial foi emitida durante a 003B, não é a fixture promovida da 003A, e já é insuficiente para o objetivo Instagram da rodada por faltar `instagram_basic` e `instagram_manage_insights`.

## Comportamento do callback provado no código

No branch corrente, `completeMetaAuthorization`:

1. valida e consome `state`;
2. reconfirma membership;
3. troca o `code` por novo token;
4. chama `begin_meta_connection`;
5. chama `activate_meta_connection`.

`begin_meta_connection` retoma a conexão viva e muda para `PENDING`, mas **preserva a referência/token atual** caso a nova autorização falhe antes da ativação.

`activate_meta_connection` somente depois grava o novo token no mesmo segredo do Vault e marca a conexão `ACTIVE` na mesma transação. Portanto:

- cancelamento/negação antes do callback não toca a credencial atual;
- falha na troca do code não toca a credencial atual;
- falha antes da ativação preserva o token anterior, embora a linha possa ficar `PENDING` para nova tentativa;
- sucesso da ativação **substitui conscientemente** a credencial 003B atual pelo novo User Access Token.

## Decisão operacional deste gate

Para o experimento já autorizado, a substituição após emissão e ativação bem-sucedidas é aceitável porque:

- a credencial viva atual é uma fixture intermediária da 003B;
- ela não possui os escopos necessários para completar a própria 003B;
- a evidência promovida da 003A não depende dessa conexão viva específica;
- o objetivo do experimento é justamente obter e provar uma nova credencial capaz de atender Instagram/Insights.

Isso **não** significa que User Access Token foi promovido como arquitetura do produto.

## Procedimento liberado

O fundador pode iniciar `Atualizar autorização` em `http://localhost:3000/conta` com o ambiente local apontando temporariamente para o app E2E.

No diálogo Meta:

- autenticar com a conta Facebook administradora já usada no teste;
- conceder apenas as permissões apresentadas pela configuração USER;
- não criar novo Business Portfolio, Page, Instagram, Ad Account ou outro ativo;
- se a Meta exigir associação do app a um Business Portfolio, criação de ativo, `business_management`, `ads_management` ou outra ampliação não prevista, parar antes de aceitar e retornar ao GPT.

Ao retornar ao localhost, o fundador deve **não selecionar/persistir Instagram ou Ad Account ainda**. O GPT audita primeiro no Supabase:

- status da conexão;
- tipo efetivo de scopes concedidos;
- expiração;
- presença de token reference;
- ausência de mutações inesperadas em seleções.

Só depois dessa auditoria o gate de descoberta/seleção continua.

## Continua proibido

- declarar USER arquitetura definitiva antes de completar E2E + análise de ciclo de vida e segurança;
- remover suporte BISU;
- associar o app E2E ao portfólio Quoron apenas para habilitar BISU;
- expor App Secret/token;
- criar/mover ativos por tentativa;
- ampliar permissões de escrita por tentativa;
- iniciar Fase 4 ou promover a 003B antes das provas finais.
