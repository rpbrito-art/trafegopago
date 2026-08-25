# INVESTIGAÇÃO 003B-05 — USER TOKEN: `/me/accounts` VAZIO

Status: **AUTORIZADA dentro do experimento 003B-05 já autorizado pelo fundador**.

Natureza: **investigação read-only**. Não é correção de código, não é decisão arquitetural, não promove a 003B.

## Contexto provado

1. O OAuth real com `Trafego Pago E2E Test` + `Quoron E2E Login` (User Access Token) concluiu com sucesso.
2. A conexão `655da6e6-9056-456d-a81d-5e2570da5faf` está ACTIVE e recebeu efetivamente:
   - `pages_show_list`
   - `pages_read_engagement`
   - `instagram_basic`
   - `instagram_manage_insights`
   - `ads_read`
   - `public_profile`
3. A descoberta 003B chamou `/me/accounts` e recebeu `data=[]` / `pagesFound=0`.
4. A Página Facebook **Quoron existe**, pertence ao portfólio Quoron e tem ID **`1356474050873300`**.
5. Em 2026-08-25 o fundador comprovou em duas telas oficiais da Meta que o perfil usado no OAuth possui acesso direto e total à Página:
   - tela **Acesso à Página**: `Rafael Brito — Acesso total` em `Pessoas com controle total`;
   - **Business Settings → Contas → Páginas → Quoron**: `1 pessoa está atribuída a essa Página do Facebook` e `Rafael Brito (You) — Acesso total`.
   Portanto a hipótese anterior de “Página não atribuída diretamente ao perfil / acesso insuficiente” está **REPROVADA**.
6. A documentação oficial Meta/Postman para Instagram API with Facebook Login mostra User Access Token em `GET /me/accounts` para listar Pages gerenciadas e obter `instagram_business_account`/Page Access Token.

## Objetivo

Explicar, por prova técnica e sem mutações, por que o User Access Token válido e com `pages_show_list` devolve zero Pages apesar de o mesmo usuário ter controle total da Página Quoron.

## Proibições

- NÃO alterar `.env.local`.
- NÃO iniciar novo OAuth.
- NÃO revogar/desconectar token.
- NÃO escrever no Supabase, exceto relatório de execução se o protocolo permanente exigir; nenhuma tabela de produto pode ser mutada.
- NÃO alterar permissões no Meta.
- NÃO adicionar `business_management`, `ads_management` ou qualquer escopo.
- NÃO criar/mover Page, Instagram, portfólio ou Ad Account.
- NÃO persistir Page Access Token.
- NÃO imprimir/logar token Meta, App Secret, App Token ou URLs contendo token.
- NÃO editar código de produto nesta investigação.

## Provas obrigatórias

Executar localmente, usando as credenciais já presentes em `.env.local` e lendo a credencial Meta pelo caminho server-side existente, uma sonda **somente leitura e sanitizada**.

### A. `debug_token`

Inspecionar o token corrente com o app token correspondente, sem expor credenciais. Registrar apenas:

- `is_valid`;
- `type`;
- `app_id` apenas como `matches_current_app: true/false` (não precisa repetir segredo nem token);
- `expires_at` / `data_access_expires_at`, se presentes;
- `scopes`;
- `granular_scopes`: nome do `scope` e `target_ids` retornados, se houver.

O ponto central é verificar se `pages_show_list`, `pages_read_engagement`, `instagram_basic`, `instagram_manage_insights` ou `ads_read` têm restrições/`target_ids` e se existe algum alvo reconhecível para a Page/Instagram.

### B. Identidade

Chamar `GET /me?fields=id,name` com o mesmo User Access Token. Registrar somente HTTP, `id` e `name` (sem token/URL).

### C. Isolar `/me/accounts`

Executar separadamente, sempre na Graph API v26.0 e sanitizando a saída:

1. `GET /me/accounts?fields=id,name,tasks`
2. `GET /me/accounts?fields=id,name,tasks,instagram_business_account`

Para cada chamada registrar:

- HTTP;
- quantidade de itens;
- para cada item, apenas `id`, `name`, `tasks` e `instagram_business_account.id` se existir;
- em erro, apenas `code`, `error_subcode`, `type`; nunca `message` se houver risco de segredo.

Isso deve provar se o vazio é do edge `/me/accounts` em si ou se nasce da expansão `instagram_business_account`.

### D. Prova direta da Page conhecida

Usando o ID já comprovado pela UI Meta, executar somente leitura:

1. `GET /1356474050873300?fields=id,name`
2. se a primeira for HTTP 200, `GET /1356474050873300?fields=id,name,instagram_business_account`

Registrar apenas HTTP e os campos pedidos. Em erro, registrar apenas `code`, `error_subcode`, `type`.

Objetivo: distinguir entre:

- token sem acesso ao objeto Page;
- token que consegue ler a Page diretamente, mas `/me/accounts` não a enumera;
- expansão `instagram_business_account` como ponto específico de falha.

Nenhum Page Access Token deve ser extraído ou persistido.

### E. Ads como controle independente

Como `ads_read` foi concedido, executar `GET /me/adaccounts?fields=id,name,account_status` (somente leitura). Registrar quantidade e IDs/nomes/status, sem qualquer ação de escrita.

Objetivo: saber se o User Token enxerga outros ativos Meta mesmo quando `/me/accounts` está vazio.

## Resultado esperado do Claude

Entregar relatório curto em `rodadas/claude/` com:

1. comandos/sondas executados em forma sanitizada;
2. resultados A–E;
3. conclusão factual, sem escolher arquitetura;
4. se houver ambiguidade material, escrever literalmente:

`DECISÃO ARQUITETURAL NECESSÁRIA — AGUARDANDO GPT`

Não implementar correção e não iniciar nova rodada.
