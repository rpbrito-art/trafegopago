# CORREÇÃO 003B-06 — DISCOVERY SENSÍVEL AO TIPO DE CREDENCIAL

Status: **SUSPENSA — NÃO EXECUTAR**.

Rodada-mãe: **003B — Meta Asset Discovery & Selection**.

## Motivo da suspensão

A auditoria identificou um indício real: `src/lib/meta/assets.ts` usa hoje `me/accounts` como descoberta de Pages independentemente do tipo de credencial, enquanto a documentação oficial Meta consultada descreve esse caminho explicitamente para **User Access Token**.

Porém, a auditoria **não conseguiu comprovar em fonte oficial vigente qual é o mecanismo correto e genérico de descoberta de Pages para o fluxo BISU/System-user access token usado pelo projeto**.

A referência a `assigned_pages` como possível substituto foi apenas uma hipótese de investigação e **não está autorizada como solução**.

Portanto não existe ainda base suficiente para mandar o Claude alterar o código.

## Fatos preservados

O experimento USER já provou:

- token USER válido e scopes esperados;
- `/me/accounts` → HTTP 200 com 0 Pages;
- leitura direta da Page Quoron → HTTP 200;
- resolução do Instagram profissional vinculado;
- leitura direta do IG User → HTTP 200;
- Insights `reach/day` → HTTP 200;
- `/me/adaccounts` → HTTP 200 com contas;
- nada disso exigiu `business_management`, `ads_management` ou Page Access Token.

Também permanece válido que:

- USER não é arquitetura canônica de descoberta, porque falhou na descoberta automática no E2E real;
- BISU permanece o desenho canônico herdado da 003A até nova decisão;
- o código atual usa `/me/accounts` na descoberta de Instagram e isso merece investigação específica quanto à compatibilidade com BISU.

## Não autorizado

Até prova documental suficiente, é proibido:

- implementar `assigned_pages` ou qualquer outro edge por hipótese;
- alterar o mecanismo de descoberta de BISU;
- novo OAuth;
- alterar configuração Meta;
- adicionar scopes;
- pedir/persistir Page Access Token;
- promover/mergear 003B.

## Próxima ação

Próximo a agir: **GPT**, não Claude.

O GPT deve investigar e documentar, com fonte oficial Meta/SDK/sample oficial vigente, qual é o contrato de descoberta de Pages/Instagram para BISU/System-user access token no fluxo Facebook Login for Business.

Somente depois dessa comprovação uma correção de código poderá ser autorizada.
