# RESULTADO 003B-05 — OAuth USER: autorização válida, descoberta de Páginas vazia

Data: 2026-08-25

Status: **EXPERIMENTO EM ANDAMENTO — NÃO PROMOVIDO — NÃO É DECISÃO ARQUITETURAL DEFINITIVA**

## Fatos observados

O OAuth real usando o app Meta `Trafego Pago E2E Test`, configuração `Quoron E2E Login` (`config_id=1068370819137366`) e **User Access Token** concluiu e retornou ao produto local.

Auditoria independente do GPT no Supabase após o callback confirmou na conexão `655da6e6-9056-456d-a81d-5e2570da5faf`:

- status `ACTIVE`;
- token presente no Vault;
- `connected_at=2026-08-25 11:03:11.366473+00`;
- expiração `2026-10-24 11:03:08.745+00`;
- escopos efetivamente concedidos: `pages_show_list`, `pages_read_engagement`, `instagram_basic`, `instagram_manage_insights`, `ads_read`, `public_profile`;
- `external_business_id` nulo, coerente com credencial USER;
- nenhum `instagram_account` ou `ad_account` foi persistido.

Portanto, **o OAuth USER e a concessão das permissões mínimas passaram**.

## Novo gate

Após o callback, a descoberta de Instagram retornou `pagesFound=0`, e a UX exibiu `Falta a Página do seu negócio`.

O código 003B usa `GET /me/accounts?fields=id,name,instagram_business_account` com o User Access Token. A documentação oficial Meta para Instagram API with Facebook Login usa o mesmo padrão para listar as Páginas gerenciadas pelo usuário.

Assim, o problema atual não é ausência de `pages_show_list` nem falha do OAuth: a Meta concedeu o escopo, mas `/me/accounts` não devolveu a Página Quoron para esta identidade/token.

A mensagem atual da UX é forte demais: `pagesFound=0` prova apenas que **nenhuma Página foi devolvida pela API para esta credencial**, não que a Página Quoron não exista.

## Hipótese principal ainda não provada

A Página Quoron é ativo do portfólio empresarial Quoron. É necessário verificar se o perfil pessoal usado no OAuth possui acesso/tarefas diretamente atribuídos à Página em nível reconhecido por `/me/accounts`, e não apenas função administrativa no portfólio.

Não adicionar `business_management`, não mudar a arquitetura e não criar/mover ativos antes dessa verificação.
