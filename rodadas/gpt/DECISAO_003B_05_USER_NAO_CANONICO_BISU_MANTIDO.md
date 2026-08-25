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

A documentação oficial Meta continua documentando `/me/accounts` como caminho de listagem de Pages para User Access Token e a consulta direta por `page_id` quando esse ID já é conhecido.

## Decisão preservada

O **User Access Token NÃO é adotado como arquitetura canônica de descoberta/seleção da 003B**.

Motivo: ele não satisfez, neste E2E, o requisito de descoberta automática e genérica de ativos. O produto não pode depender de:

- Page ID previamente conhecido;
- ID técnico informado manualmente pelo cliente;
- fixture hardcoded;
- scraping ou mecanismo não oficial;
- scopes adicionais por tentativa.

Isso violaria a lei de produto `Simplicidade Guiada`: a complexidade técnica deve pertencer ao sistema, não ao pequeno empresário.

Permanece canônico para produção o desenho de **Facebook Login for Business com System-user access token / BISU e seleção de ativos**, estabelecido na 003A.

O experimento USER permanece como evidência útil de compatibilidade downstream, não como substituição do BISU.

## CORREÇÃO DA CONCLUSÃO DE GATE

Após a primeira versão desta decisão, a auditoria do código da 003B encontrou um fato material adicional:

`src/lib/meta/assets.ts` usa atualmente `GET /me/accounts` como mecanismo de descoberta de Pages **para qualquer conexão**, sem distinguir User Access Token de BISU/System User.

A 003A, por outro lado, já contém infraestrutura server-side para inspecionar/classificar a credencial. Ela registra que `debug_token.type` sozinho não distingue com segurança BISU de system user clássico e usa evidência complementar como `client_business_id` para a classificação segura.

Portanto, a conclusão anterior de que o bloqueio restante era **somente** uma fixture Meta externa é prematura e fica **SUPERSEDIDA NESTE PONTO**.

Antes de classificar o gate como exclusivamente externo, a 003B deve corrigir a premissa de que `/me/accounts` é universal e tornar a descoberta **sensível ao tipo real da credencial**.

## Próxima correção autorizada

Mandato:

`rodadas/gpt/CORRECAO_003B_06_DISCOVERY_CREDENTIAL_AWARE.md`

Objetivo:

- reutilizar/centralizar a classificação server-side segura de credencial já existente na 003A;
- manter `/me/accounts` para USER onde esse é o caminho documentado;
- para BISU/System User, usar o mecanismo oficial de Pages atribuídas compatível com essa classe de credencial, comprovado durante a implementação por documentação/SDK/sample oficial vigente;
- não persistir tipo de token por conveniência se a classificação por request resolver com segurança;
- não usar `external_business_id` como proxy de tipo de token;
- não assumir que `debug_token.type=SYSTEM_USER` sozinho significa BISU;
- preservar paginação, fail-closed, isolamento e redescoberta antes da seleção.

Se o executor não conseguir estabelecer com evidência suficiente qual é o edge oficial correto para BISU/System User, deve parar em:

`DECISÃO ARQUITETURAL NECESSÁRIA — AGUARDANDO GPT`

sem inventar endpoint e sem alterar configuração Meta.

## Estado da 003B

A 003B continua **NÃO PROMOVIDA**.

O gate externo de uma entidade cliente separada pode voltar a ser necessário para o E2E BISU, mas isso só será decidido **depois** da correção e auditoria do mecanismo de descoberta por tipo de credencial.

## Continua proibido

- pedir Page ID técnico ao cliente como fluxo padrão;
- adicionar `business_management`, `ads_management` ou outro scope por tentativa;
- pedir/persistir Page Access Token sem necessidade material;
- tratar a causa do `/me/accounts` vazio como conhecida;
- promover USER como arquitetura canônica;
- promover/mergear 003B automaticamente;
- novo OAuth ou alteração no painel Meta durante esta correção.
