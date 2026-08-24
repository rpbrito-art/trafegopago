# AUTORIZAÇÃO — RODADA 003B

Data: 2026-08-24

Status: **AUTORIZADA PELO FUNDADOR PARA EXECUÇÃO**

Mandato técnico vigente:

`rodadas/gpt/RODADA_003B_META_ASSET_DISCOVERY_SELECTION.md`

Esta autorização altera somente o gate de execução do mandato. O escopo, limites, READ SET, critérios de prova e decisões arquiteturais do mandato permanecem inalterados.

A frase do cabeçalho do mandato que dizia `AGUARDANDO AUTORIZAÇÃO DO FUNDADOR — NÃO EXECUTAR AINDA` fica **superada exclusivamente por esta autorização e por `estado.md`**. Não é necessário reescrever o mandato apenas para alinhar esse cabeçalho.

## O que está autorizado

Claude Code pode iniciar a 003B via `/proxima`, criar branch/PR próprios, implementar o escopo técnico autorizado, migrations, testes e provas locais/integradas que não exijam ação manual do fundador.

## O que continua sob gate do GPT

Configuração manual na Meta continua sendo conduzida pelo GPT. Claude não pode, por conta própria:

- criar ou alterar Facebook Login for Business no painel Meta;
- ampliar permissões/scopes;
- criar novo App ID;
- selecionar, remover ou reassociar ativos no painel externo;
- refazer OAuth real antes de o GPT liberar o gate;
- persistir Page Access Token sem decisão arquitetural GPT;
- pedir `ads_management`/`business_management` por tentativa;
- criar anúncios ou gerar gasto.

Quando a implementação chegar ao ponto em que a configuração externa ou o OAuth real forem necessários, Claude deve parar com evidências objetivas e devolver o gate ao GPT.

## Decisões materiais

Se a execução provar necessidade de Page Access Token persistente, `ads_management`, `business_management`, mudança para Instagram Login/`graph.instagram.com` ou outra ampliação arquitetural, deve parar em:

`DECISÃO ARQUITETURAL NECESSÁRIA — AGUARDANDO GPT`

Nenhuma dessas ampliações está autorizada implicitamente.
