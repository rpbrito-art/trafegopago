# DECISÃO GPT — 003B-05: USER NÃO CANÔNICO; BISU MANTIDO

Data: 2026-08-25

## Estado da evidência

O experimento com User Access Token provou, no arranjo real Quoron:

- OAuth válido e conexão ACTIVE;
- scopes mínimos esperados;
- leitura direta da Page Quoron;
- resolução do Instagram profissional vinculado;
- leitura direta do IG User;
- leitura mínima de Insights;
- leitura de Ad Accounts com `ads_read`.

Também provou uma anomalia específica:

- `/me/accounts` retorna HTTP 200 com zero Pages, apesar de o mesmo token conseguir ler diretamente a Page Quoron e seu Instagram vinculado.

A documentação oficial Meta continua documentando `/me/accounts` como o caminho de listagem das Pages gerenciadas por User Access Token e a consulta direta por `page_id` quando esse ID já é conhecido.

## Decisão

O **User Access Token NÃO é adotado como arquitetura canônica de descoberta/seleção da 003B**.

Motivo: ele não satisfaz, neste E2E, o requisito de descoberta automática e genérica de ativos. O produto não pode depender de:

- Page ID previamente conhecido;
- ID técnico informado manualmente pelo cliente;
- fixture hardcoded;
- scraping ou mecanismo não oficial para resolver Page/Instagram;
- scopes adicionais por tentativa.

Isso violaria a lei de produto `Simplicidade Guiada`: a complexidade técnica deve pertencer ao sistema, não ao pequeno empresário.

## Arquitetura mantida

Permanece canônico para produção o desenho de **Facebook Login for Business com System-user access token / BISU e seleção de ativos**, já estabelecido na 003A.

O experimento USER fica registrado como evidência útil de compatibilidade downstream, não como substituição do BISU.

Não remover suporte a USER de forma destrutiva nesta decisão; apenas não promovê-lo a caminho canônico de descoberta.

## Restrição do E2E atual

O portfólio Quoron é dono do app de desenvolvimento e a Meta bloqueou seu uso simultâneo como portfólio cliente no fluxo BISU (`This Meta Business Account owns the app`).

Isso impede provar o E2E canônico usando exatamente a mesma entidade como provedor e cliente.

Não foi encontrada evidência oficial atual de um Business Portfolio de teste aplicável que elimine essa separação, e o fundador já rejeitou usar portfólio/empresa de terceiro apenas para contornar o teste.

Portanto, o que resta é um **gate externo de fixture elegível**, não uma falha comprovada do código downstream.

## Estado da 003B

A 003B continua **NÃO PROMOVIDA**.

Não iniciar Fase 4 enquanto o mecanismo canônico de descoberta/seleção não tiver E2E suficiente ou enquanto o mandato da 003B não for explicitamente revisado com critério de promoção alternativo.

## Continua proibido

- pedir Page ID técnico ao cliente como fluxo padrão;
- adicionar `business_management` ou `ads_management` por tentativa;
- pedir/persistir Page Access Token sem necessidade material;
- tratar a causa do `/me/accounts` vazio como conhecida;
- promover USER como arquitetura canônica;
- promover/mergear 003B automaticamente.

## Próxima ação

Próximo a agir: **GPT/fundador em decisão de gate**, não Claude em nova investigação.

Há duas opções legítimas para destravar o projeto:

1. disponibilizar futuramente uma entidade Meta cliente elegível e separada do portfólio dono do app para o E2E BISU; ou
2. o GPT formular uma revisão explícita do critério de promoção da 003B, baseada no conjunto de provas já obtidas, para decisão do fundador — sem fingir que o E2E canônico ocorreu.

Até essa escolha, nenhuma nova sonda, OAuth ou alteração Meta está autorizada.
