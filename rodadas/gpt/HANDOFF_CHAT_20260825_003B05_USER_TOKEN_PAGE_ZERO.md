# HANDOFF DE CHAT — 2026-08-25 — 003B-05 USER TOKEN / PAGE ZERO

Este documento existe para permitir troca de chat sem perda do contexto micro da investigação Meta ocorrida entre 2026-08-24 e 2026-08-25.

Ele NÃO promove fase, NÃO muda arquitetura por si só e NÃO autoriza ação além do que `estado.md` já libera.

## 1. Regra de continuidade

No novo chat, antes de qualquer análise/ação:

1. ler `.gpt/PROJECT_PROMPT.md`;
2. ler `estado.md`;
3. ler este handoff integralmente;
4. ler `rodadas/gpt/INVESTIGACAO_003B_05_PAGE_ZERO_GRANULAR_SCOPES.md`;
5. se Claude já tiver terminado, localizar e ler o relatório mais recente em `rodadas/claude/` antes de propor qualquer nova ação;
6. auditar o relatório de forma independente antes de autorizar correção, novo OAuth ou mudança arquitetural.

Sempre distinguir: planejado / autorizado / executado / auditado / promovido.

## 2. Situação macro incorporada

- Repositório único: `rpbrito-art/trafegopago`.
- `business-weaver` está fora de escopo.
- F1 e F2 encerradas.
- 003A — Meta Connection Foundation: EXECUTADA, AUDITADA E PROMOVIDA.
- 003B — Meta Asset Discovery & Selection: EM EXECUÇÃO, NÃO PROMOVIDA.
- Branch 003B: `claude/rodada-003b-meta-asset-discovery-selection`.
- PR #12 draft.
- HEAD de código auditado antes desta investigação: `872d777a929f4be12567d9a7b9e9fa89bac00dfb`.
- CI auditada: `32792662569` verde.
- Migration `20260824210000_create_meta_asset_selection.sql` já aplicada no Supabase; remoto com 15 migrations.
- `instagram_accounts` e `ad_accounts` existem, com RLS e seleção auditadas.
- Correção 003B-01 e Correção 003B-03 já executadas/auditadas/aprovadas.

## 3. Produto — correção importante já feita durante 003B

O fundador corrigiu uma interpretação documental anterior: mídia paga NÃO é periférica.

Regra vigente:

- orgânico deve ter valor real e pode existir sozinho por períodos;
- mídia paga é pilar central da proposta de crescimento;
- todo usuário deve poder evoluir para tráfego pago quando estrategicamente adequado;
- permissão técnica Ads NÃO equivale a criar campanha/aprovar orçamento/gastar;
- gasto continua exigindo aprovação humana explícita, comando de domínio, idempotência e auditoria.

Canônico: `docs/01-produto/PAID_MEDIA_CANONICAL.md`.

Antes da próxima rodada substantiva pós-003B, harmonizar canônicos antigos conflitantes sem criar rodada só de housekeeping.

## 4. Baseline Meta anterior — BISU

App anterior/oficial-dev:

- nome: `Trafego Pago Business Dev`;
- App ID: `2940404272985831`.

Configuração 003B anterior:

- `Quoron Instagram Dev Login`;
- Configuration ID `38307908848822330`;
- `System-user access token / BISU`;
- ativos Pages + Instagram Accounts.

Configuração histórica 003A ainda existente e NÃO deve ser apagada antes da promoção 003B:

- `Trafego Pago Dev Login`;
- Configuration ID `1549901823029730`.

Portfólio empresarial Quoron:

- Business ID `5301659283195806`.

Ativos conhecidos:

- Página Facebook `Quoron` — Page ID `1356474050873300`;
- Instagram profissional `@goquoron` — IG ID observado anteriormente `17841429590351285`.

## 5. O bloqueio que iniciou toda esta sequência

Ao tentar reautorizar a conexão BISU para ganhar os escopos de Instagram, a Meta mostrou o portfólio Quoron desabilitado com a mensagem literal:

`This Meta Business Account owns the app`

Conclusão factual: nesse fluxo/configuração BISU, o portfólio que possui o app não pôde ocupar simultaneamente o papel de portfólio-cliente conectado.

O fundador NÃO possui outro portfólio empresarial utilizável: o limite de dois já foi atingido e o outro está restrito/inutilizável enquanto aguarda cancelamento/regularização pela Meta.

O fundador rejeitou usar conta/portfólio de terceiro e não quis criar custo pago apenas para destravar o teste. Não insistir nessas alternativas sem nova solicitação.

Uma decisão anterior de separar provedor/cliente foi registrada cedo demais e depois anulada porque o fundador ainda estava apenas debatendo. Não tratar esse documento antigo como decisão vigente.

## 6. Experimento 003B-04 — app sem portfólio + BISU

Foi criado um novo app Meta apenas para E2E:

- `Trafego Pago E2E Test`;
- criado sem Business Portfolio associado.

No app:

1. foi adicionado o caso de uso `Gerenciar mensagens e conteúdo no Instagram`;
2. o caso genérico `Autenticar e solicitar dados de usuários com o Login do Facebook` mostrou-se mutuamente incompatível com o caso de Instagram; isso serviu para corrigir uma confusão anterior entre Facebook Login comum e Facebook Login for Business;
3. dentro do caso de Instagram, a UI mostrou primeiro o caminho Instagram Login com `instagram_business_*`;
4. foi usado o link `API setup with Facebook login`, mudando para o caminho correto para esta arquitetura: Facebook Login for Business + `instagram_basic` / `instagram_manage_insights` / Pages;
5. apareceu `Login do Facebook para Empresas` e foi possível iniciar `Criar configuração`.

Na etapa de token:

- `Token de acesso do usuário` ficou disponível;
- `Token de acesso do usuário do sistema` ficou DESABILITADO com a mensagem de que o app não está associado a um portfólio empresarial.

Conclusão do experimento 003B-04: BISU não pode ser reproduzido em app sem portfólio. Hipótese BISU sem portfólio REPROVADA.

## 7. Experimento 003B-05 — User Access Token

O fundador AUTORIZOU apenas um experimento controlado com User Access Token. Isso NÃO é ainda decisão arquitetural definitiva.

Racional testado:

- a própria UI Meta oferece User Access Token no Facebook Login for Business;
- a documentação oficial do Instagram com Facebook Login usa Facebook User Access Token;
- a Marketing API aceita User Access Token para leitura/operação conforme permissões;
- o gateway do produto já tinha suporte distinto para identificar/revogar token do tipo USER.

Configuração criada no app E2E:

- nome: `Quoron E2E Login`;
- Configuration ID: `1068370819137366`;
- variação: `General`;
- token: User Access Token;
- etapa `Ativos`: desabilitada por desenho no modo USER;
- permissões configuradas para o teste:
  - `pages_show_list`
  - `pages_read_engagement`
  - `instagram_basic`
  - `instagram_manage_insights`
  - `ads_read`
- `public_profile` é concedido automaticamente.

Não foram autorizadas permissões de escrita por tentativa (`ads_management`, `business_management`, publishing, mensagens etc.).

## 8. Preparação local já realizada

No app E2E foi cadastrado o redirect:

`http://localhost:3000/meta/callback`

O fundador, localmente, alterou temporariamente no `.env.local` apenas:

- `META_APP_ID` para o app E2E;
- `META_APP_SECRET` para o segredo do app E2E, sem expô-lo no chat;
- `META_LOGIN_CONFIG_ID=1068370819137366`.

Foi preservado:

`META_OAUTH_REDIRECT_URI=http://localhost:3000/meta/callback`

O servidor local foi reiniciado com `npm run dev`.

Nunca pedir ao fundador para revelar App Secret ou token.

## 9. Gate de preservação antes do OAuth USER

O GPT auditou o código antes do OAuth e confirmou:

- cancelar/negar/falhar antes de receber novo token não substitui a credencial antiga;
- `begin_meta_connection` retoma a conexão viva preservando o token existente;
- somente `activate_meta_connection`, depois de uma troca de `code` bem-sucedida, substitui o token no Vault e marca ACTIVE.

Foi conscientemente aceito que, se o OAuth USER tivesse sucesso, a credencial intermediária 003B da linha viva seria substituída pelo novo User Access Token.

## 10. OAuth USER real — PASSOU

O fundador abriu `http://localhost:3000/conta` e clicou `Atualizar autorização`.

O OAuth com `Quoron E2E Login` concluiu e voltou ao localhost.

Auditoria independente do GPT no Supabase após callback confirmou:

Conexão:

- id `655da6e6-9056-456d-a81d-5e2570da5faf`;
- status ACTIVE;
- token presente no Vault;
- `connected_at`: `2026-08-25 11:03:11.366473+00`;
- `token_expires_at`: `2026-10-24 11:03:08.745+00`;
- `external_user_id`: `28050226117920563`;
- `external_business_id`: null;
- scopes efetivamente concedidos:
  - `pages_show_list`
  - `pages_read_engagement`
  - `instagram_basic`
  - `instagram_manage_insights`
  - `ads_read`
  - `public_profile`
- `instagram_accounts`: 0 linhas;
- `ad_accounts`: 0 linhas.

Portanto: configuração USER → OAuth real → token ACTIVE → escopos mínimos corretos: PASSOU.

## 11. Novo bloqueio — `/me/accounts` retorna zero Pages

Depois do OAuth, a UI local mostrou:

- `Meta conectada`;
- e logo abaixo `Falta a Página do seu negócio` / texto dizendo que a conta Meta não tem Página associável.

Essa mensagem da UX é imprecisa para o caso observado.

O código 003B usa o token da conexão em:

`GET /me/accounts?fields=id,name,instagram_business_account`

A resposta efetiva resultou em zero Pages (`pagesFound=0`).

Isso prova apenas:

> a Meta não enumerou nenhuma Page para esse token via `/me/accounts`.

Não prova que a Page Quoron não existe.

## 12. Provas visuais de que o usuário tem acesso total à Page Quoron

O fundador trouxe duas provas oficiais da própria Meta.

### Prova 1 — Acesso à Página

Na tela `Gerencie e veja quem tem acesso à Página Quoron`:

- Página: Quoron;
- pertence ao portfólio Quoron;
- em `Pessoas com controle total` aparece `Rafael Brito — Acesso total`.

### Prova 2 — Business Settings → Contas → Páginas → Quoron

A tela mostra:

- Page `Quoron`;
- ID `1356474050873300`;
- `Propriedade de: Quoron`;
- `1 pessoa está atribuída a essa Página do Facebook`;
- `Rafael Brito (You) — Acesso total`.

Conclusão: a hipótese de `/me/accounts` vazio por falta de acesso, falta de atribuição direta ou nível insuficiente está REPROVADA.

Não alterar acesso da Página.

## 13. Código 003B relevante

`src/lib/meta/assets.ts`:

- carrega conexão ACTIVE e token do Vault server-side;
- capability `instagram_discovery` depende de `pages_show_list + instagram_basic`;
- chama `/me/accounts` com `id,name,instagram_business_account`;
- não solicita Page Access Token nesse ponto;
- se encontrar vínculo, lê metadados do IG usando o token da conexão;
- Page Access Token foi conscientemente deixado como gate arquitetural: se o E2E provar que é materialmente necessário, deve haver decisão arquitetural GPT antes de persistir um Page Access Token.

## 14. Investigação atual autorizada — READ ONLY

Mandato:

`rodadas/gpt/INVESTIGACAO_003B_05_PAGE_ZERO_GRANULAR_SCOPES.md`

A investigação atual deve, sem mutações:

A. `debug_token`
- is_valid;
- type;
- app_id apenas como matches_current_app;
- expires/data_access_expires;
- scopes;
- granular_scopes + target_ids sanitizados.

B. identidade
- `GET /me?fields=id,name`.

C. isolar `/me/accounts`
- `GET /me/accounts?fields=id,name,tasks`;
- `GET /me/accounts?fields=id,name,tasks,instagram_business_account`.

D. prova direta da Page conhecida
- `GET /1356474050873300?fields=id,name`;
- se 200, `GET /1356474050873300?fields=id,name,instagram_business_account`.

E. controle Ads
- `GET /me/adaccounts?fields=id,name,account_status`.

Proibições: não expor token/secret, não editar código, não iniciar OAuth, não revogar, não alterar permissões, não persistir Page Access Token.

## 15. PONTO EXATO NO MOMENTO DA TROCA DE CHAT

Claude Code JÁ ESTÁ RODANDO a investigação read-only.

IMPORTANTE: Claude iniciou a execução ANTES de o fundador trazer a segunda prova visual com Page ID `1356474050873300` e antes de o GPT atualizar o mandato acrescentando a prova direta da Page (item D acima).

Portanto a execução que está em andamento PODE NÃO CONTER a prova direta do Page ID.

NÃO interromper a execução atual.

Quando Claude terminar:

1. o novo chat deve primeiro ler/auditar o relatório que ele produziu;
2. NÃO mandar rodar `/proxima` novamente automaticamente;
3. verificar se o relatório já resolve a causa com A/B/C/E;
4. se a prova direta D estiver ausente e ainda for necessária, autorizar/executar somente a complementação read-only, sem repetir toda a investigação;
5. só depois decidir qualquer correção ou arquitetura.

O fundador avisou explicitamente: `Ele já estava rodando então não vai pegar sua atualização`.

## 16. O que NÃO fazer agora

- não fazer novo OAuth;
- não mexer nas permissões da Page;
- não adicionar `business_management` ou `ads_management` por tentativa;
- não desconectar/revogar o token atual;
- não associar o app E2E ao portfólio Quoron apenas para BISU;
- não voltar para Instagram Login / `instagram_business_*`;
- não criar/mover Page, Instagram, Portfolio ou Ad Account;
- não usar conta de terceiro;
- não declarar User Access Token arquitetura definitiva;
- não remover BISU do produto;
- não persistir Page Access Token sem decisão arquitetural;
- não iniciar Fase 4;
- não promover/mergear 003B antes do E2E, sondas e auditoria final.

## 17. Regras de comunicação com o fundador

- O fundador não é programador. Explicar toda ação em linguagem simples, dizendo o que faz, onde fazer e por quê.
- Sempre que pedir para abrir uma página/tela externa, fornecer o LINK DIRETO junto com o caminho. O fundador já reclamou várias vezes quando o link foi omitido.
- Não presumir que nomes técnicos, siglas, comandos ou telas são autoexplicativos.
- Se houver uma sequência lógica conhecida, agrupar os passos; não pedir uma tarefa, esperar a resposta e depois pedir outra que já poderia ter sido solicitada junto.
- Ao mesmo tempo, não dar múltiplas ações arriscadas de uma vez sem gates claros.
- Não fazer o fundador servir de tradutor entre GPT e Claude.
- Se pedir comando, dizer que deve ser digitado no Claude Code/PowerShell, em qual pasta, e o que vai acontecer.
- Nunca pedir segredo, token ou App Secret.
- Diante de hipótese sobre comportamento da Meta, distinguir explicitamente fato comprovado de hipótese. Houve várias hipóteses anteriores erradas que geraram trabalho; o fundador está justificadamente exigindo mais rigor.

## 18. Links úteis já usados

Software local:

- `http://localhost:3000/conta`

Business Settings do portfólio Quoron:

- base: `https://business.facebook.com/latest/settings/?business_id=5301659283195806`

Acesso à Página no Facebook (funcionou depois de trocar para a Page Quoron):

- `https://www.facebook.com/settings/?tab=profile_access`

Se pedir qualquer nova tela, sempre fornecer o link direto correspondente.

## 19. Próxima resposta ideal do novo chat

Se o fundador disser que Claude ainda está rodando:

- confirmar que deve deixá-lo terminar;
- não iniciar mais nada;
- aguardar relatório.

Se disser `Claude terminou`:

- usar GitHub para localizar o relatório novo em `rodadas/claude/`;
- auditar independentemente os resultados contra Supabase/código/documentação quando necessário;
- dizer de forma simples o que foi provado;
- decidir se a prova direta da Page ainda precisa ser executada;
- não autorizar correção/arquitetura antes desse diagnóstico.
