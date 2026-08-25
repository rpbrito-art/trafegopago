# ESTADO — Tráfego Pago

Atualizado: 2026-08-25

Estado incorporado = `main + este arquivo + promoção real`.

## 1. Ambiente

- repo: `rpbrito-art/trafegopago`
- Supabase project ref: `cbnxdoxpyioxjwgjhbtq`
- pasta local esperada: `C:\Users\rpbri\Documents\trafegopago`
- `business-weaver`: fora de escopo

## 2. Estado incorporado

Promovidas: **000–003A**.

- Fase 1 — Supabase, Auth e Tenancy: **ENCERRADA**.
- Fase 2 — Operations, Audit, Queues e Segurança Base: **ENCERRADA**.
- Fase 3 — Meta Connection Foundation: **EM ANDAMENTO**.
- última rodada promovida: **003A — Meta Connection Foundation**.
- PR #11: MERGED.
- merge 003A: `546838db8e7ced4e9045c05feb8c7b2f0c476cc2`.
- CI final 003A: `32772710738` — verde.

003A está **EXECUTADA, AUDITADA E PROMOVIDA**. Permanecem canônicos: Facebook Login for Business + Graph API v26.0; token Meta server-side no Vault; OAuth `state` de uso único; membership reconferida; suporte/classificação de BISU; desconexão segura.

## 3. Rodada 003B — EM EXECUÇÃO, NÃO PROMOVIDA

Mandato: `rodadas/gpt/RODADA_003B_META_ASSET_DISCOVERY_SELECTION.md`

Autorização original: `rodadas/gpt/AUTORIZACAO_003B_EXECUCAO.md`

Branch: `claude/rodada-003b-meta-asset-discovery-selection`

PR: **#12 draft**.

HEAD final auditado antes da Correção 003B-06: `1771965805a09082579da1f1baea58b674f24084`.

CI final auditada: `32844721885` — **success**.

Já executado/auditado:

- migration `20260824210000_create_meta_asset_selection.sql` aplicada;
- `instagram_accounts` e `ad_accounts` presentes;
- descoberta/seleção, capabilities e UX implementadas;
- Correção 003B-01 fail-closed metadata + membership: **EXECUTADA, AUDITADA E APROVADA**;
- Correção 003B-03 reautorização de conexão ativa: **EXECUTADA, AUDITADA E APROVADA**;
- investigação 003B-05 de token/Pages/Ads: **EXECUTADA E AUDITADA**;
- complemento de leitura direta da Page: **EXECUTADO, AUDITADO E APROVADO COMO EVIDÊNCIA READ-ONLY**;
- complemento de IG User + Insights diretos: **EXECUTADO, AUDITADO E APROVADO COMO EVIDÊNCIA READ-ONLY**.

003B continua **NÃO PROMOVIDA**.

## 4. Produto — mídia paga

Canônico específico: `docs/01-produto/PAID_MEDIA_CANONICAL.md`.

Mídia paga é pilar central da proposta de crescimento; orgânico também entrega valor. Permissão Ads não equivale a criar campanha/gastar. Gasto exige aprovação humana explícita, comando de domínio, idempotência e auditoria.

`docs/01-produto/GROWTH_INTELLIGENCE_CANONICAL.md` permanece obrigatório para simplicidade guiada: complexidade técnica pertence ao sistema, não ao pequeno empresário.

Antes da próxima rodada substantiva pós-003B, harmonizar formulações antigas conflitantes nos canônicos afetados sem criar rodada apenas de housekeeping.

## 5. Configurações Meta relevantes

### Arquitetura canônica mantida

Permanece canônico para produção:

- **Facebook Login for Business**;
- **System-user access token / BISU**;
- seleção de ativos no fluxo apropriado;
- Graph API v26.0 no estado atual.

App baseline:

- **Trafego Pago Business Dev** — App ID `2940404272985831`;
- configuração `Quoron Instagram Dev Login` — Configuration ID `38307908848822330`;
- Business Portfolio Quoron ID `5301659283195806`.

Configuração histórica 003A ainda não apagar:

- `Trafego Pago Dev Login` — Configuration ID `1549901823029730`.

### Experimento USER — NÃO CANÔNICO

App:

- **Trafego Pago E2E Test**;
- sem Business Portfolio;
- Instagram em API setup with Facebook login;
- configuração `Quoron E2E Login`;
- Configuration ID `1068370819137366`;
- token: User Access Token;
- `Ativos` indisponível no modo USER testado.

O experimento USER é evidência diagnóstica válida, mas **não substitui o BISU como arquitetura canônica**.

## 6. Conexão real do experimento USER

Conexão `655da6e6-9056-456d-a81d-5e2570da5faf`:

- status ACTIVE;
- `external_user_id=28050226117920563`;
- `external_business_id=null`;
- scopes:
  - `pages_show_list`
  - `pages_read_engagement`
  - `instagram_basic`
  - `instagram_manage_insights`
  - `ads_read`
  - `public_profile`
- token no Vault;
- `instagram_accounts=0`;
- `ad_accounts=0`.

O GPT reconfirmou o estado no Supabase após a última sonda.

Ativos reais usados como fixture diagnóstica:

- Page Quoron — `1356474050873300`;
- Instagram profissional `@goquoron` — `17841429590351285`.

## 7. Evidência consolidada do experimento USER

### Passou

Com o mesmo User Access Token:

- token válido, tipo USER, app/identidade esperados;
- `/me/adaccounts` → HTTP 200, 3 contas;
- leitura direta da Page Quoron → HTTP 200;
- Page resolve `instagram_business_account.id=17841429590351285`;
- leitura direta de `@goquoron` → HTTP 200;
- `media_count=9`;
- Insights `reach/day` → HTTP 200 com série retornada.

Isso ocorreu sem:

- `business_management`;
- `ads_management`;
- Page Access Token.

### Falhou

- `/me/accounts?fields=id,name,tasks` → HTTP 200, 0 itens;
- `/me/accounts?fields=id,name,tasks,instagram_business_account` → HTTP 200, 0 itens.

Logo o único ponto materialmente quebrado no experimento USER é a **descoberta genérica inicial de Pages por `/me/accounts`**.

A causa interna da Meta permanece **não provada**.

## 8. Decisão arquitetural GPT — USER NÃO CANÔNICO

Documentos:

- `rodadas/gpt/AUDITORIA_COMPLEMENTO_003B_05_IG_DIRECT_INSIGHTS.md`;
- `rodadas/gpt/DECISAO_003B_05_USER_NAO_CANONICO_BISU_MANTIDO.md`.

Decisão preservada:

- User Access Token **não** é adotado como arquitetura canônica de descoberta da 003B;
- BISU permanece arquitetura canônica de produção;
- não usar Page ID/IG ID hardcoded ou informado tecnicamente pelo cliente;
- não adicionar scopes por tentativa;
- não pedir/persistir Page Access Token sem prova material.

## 9. Novo achado de auditoria — discovery atual não distingue credencial

Após a auditoria do complemento downstream, o GPT inspecionou novamente o código da 003B e identificou:

- `src/lib/meta/assets.ts` usa atualmente `me/accounts` para descoberta de Pages **independentemente do tipo de credencial**;
- `src/lib/meta/gateway.ts`, vindo da 003A, já contém inspeção/classificação server-side de credenciais;
- a própria 003A registra que `debug_token.type=SYSTEM_USER` sozinho não distingue com segurança BISU de system user clássico e usa evidência complementar (`client_business_id`) na classificação.

Consequência:

- a conclusão anterior de que o bloqueio restante era **apenas** uma fixture externa fica **SUPERSEDIDA**;
- antes de decidir que o E2E BISU está bloqueado somente pela separação provedor/cliente, a 003B precisa tornar a descoberta sensível ao tipo real de credencial;
- USER continua não canônico; esse novo achado não reabre a decisão USER.

## 10. Correção 003B-06 — EXECUTADA

Mandato: `rodadas/gpt/CORRECAO_003B_06_DISCOVERY_CREDENTIAL_AWARE.md`.

Status: **EXECUTADA — AGUARDANDO AUDITORIA GPT**.

Relatório: `rodadas/claude/RELATORIO_CORRECAO_003B_06_DISCOVERY_CREDENTIAL_AWARE.md`.

Mecanismo confirmado por fonte oficial vigente (Graph API Reference):

- **USER** → `GET /me/accounts`, preservado sem alteração;
- **BISU/System User** → `GET /{system-user-id}/assigned_pages`, edge listado nos nós System User e Business User; a referência do edge descreve retorno de nós Page com `tasks`/`permitted_tasks`.

Arquivos alterados:

- `src/lib/meta/credential.ts` — **novo**, classificação centralizada read-only e fail-closed;
- `src/lib/meta/gateway.ts` — passa a consumir o módulo; classificação local removida;
- `src/lib/meta/assets.ts` — descoberta de Pages escolhe o edge pela classe da credencial;
- `src/lib/meta/assets.test.ts` — +19 provas.

Nenhuma migration, coluna, RPC ou UI tocada. Ads não alterado: `ads_read` segue em `/me/adaccounts`.

Classificação **extraída** da 003A, não duplicada. Preservado: `client_business_id` presente e não vazio é a única prova de BISU; presente-mas-inválido falha fechado; ausência exige identidade positiva e coerente. `debug_token.type` continua não sendo prova; `external_business_id` não é proxy. Acrescentado apenas o `subjectId` devolvido pela Meta, que ancora `assigned_pages`; a requisição externa segue idêntica à auditada na 003A.

Fail-closed no roteamento: classificação inconclusiva não consulta edge nenhum; BISU sem `subjectId` não cai de volta em `/me/accounts`; identidade divergente falha fechado nos dois ramos.

Provas: `vitest run src/lib/meta src/lib/actions src/components/meta` **228/228**, com `assets.test.ts` **58/58**. `tsc --noEmit` limpo; `npm run lint` limpo.

Limitações registradas no relatório:

- o edge BISU **não foi exercitado contra a Meta real** — a conexão viva é USER e novo OAuth é proibido; prova é documental e por teste;
- a documentação oficial não declara as permissões exigidas por `assigned_pages`; se exigir `business_management`, aparecerá como recusa `10`/`200` → `MISSING_PERMISSION`. Nenhum escopo foi adicionado;
- a expansão `instagram_business_account` nesse edge não foi verificada contra a API real, pelo mesmo motivo;
- o caso Quoron continua com `/me/accounts` devolvendo zero para credencial USER; a correção não promete resolvê-lo nem mascara o zero com ID fixo.

Próximo a agir: **GPT** — auditar a correção no PR #12.

## 11. Gate externo BISU — AINDA NÃO CLASSIFICADO COMO BLOQUEIO FINAL

No fluxo BISU anterior, o portfólio Quoron apareceu desabilitado com:

`This Meta Business Account owns the app`

Esse fato permanece válido.

Porém, somente após a Correção 003B-06 e sua auditoria o GPT decidirá se ainda é indispensável uma entidade cliente separada para o E2E final ou se há outra prova segura suficiente.

Não usar empresa/portfólio de terceiro sem nova decisão explícita do fundador.

## 12. Continua NÃO autorizado

- promover/mergear 003B automaticamente;
- iniciar Fase 4;
- declarar USER arquitetura definitiva;
- remover BISU;
- pedir Page ID técnico ao cliente como fluxo padrão;
- adicionar `business_management`, `ads_management` ou outro scope por tentativa;
- novo OAuth;
- alterar `.env.local`;
- mexer no acesso da Page Quoron;
- alterar App/Business Login Configuration no painel Meta;
- criar/mover Page, Instagram, portfólio ou Ad Account;
- usar conta/empresa de terceiro sem nova decisão explícita do fundador;
- expor App Secret/token;
- pedir/imprimir/persistir Page Access Token;
- campanha/anúncio/gasto;
- importar conteúdo.

## 13. Pendências

- executar/auditar 003B-06;
- depois reavaliar o E2E BISU e o gate externo;
- corrigir UX que hoje afirma ausência de Page quando a API apenas devolve lista vazia;
- harmonizar canônicos de mídia paga pós-003B;
- redaction do callback em logs antes de produção;
- leaked-password protection, SMTP/domínio, App Review/Business Verification quando aplicável.

## 14. Regra de comunicação para continuidade

- Sempre que o fundador for instruído a abrir uma página/tela externa, fornecer o link direto.
- O fundador não é programador: toda ação manual precisa dizer o que fazer, onde fazer e por quê.
- Não fragmentar uma sequência lógica conhecida em pedidos sucessivos que poderiam ter sido dados juntos.
- Não tratar hipótese sobre comportamento da Meta como fato antes de prova.
