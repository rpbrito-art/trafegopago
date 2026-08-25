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

HEAD final auditado das sondas/branch: `1771965805a09082579da1f1baea58b674f24084`.

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

## 5. Configurações Meta relevantes

### Arquitetura canônica mantida

Permanece canônico para produção, até nova decisão arquitetural:

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

Isso ocorreu sem `business_management`, `ads_management` e sem Page Access Token.

### Falhou

- `/me/accounts?fields=id,name,tasks` → HTTP 200, 0 itens;
- `/me/accounts?fields=id,name,tasks,instagram_business_account` → HTTP 200, 0 itens.

Logo o único ponto materialmente quebrado no experimento USER é a **descoberta genérica inicial de Pages por `/me/accounts`**.

A causa interna da Meta permanece **não provada**.

## 8. Decisão arquitetural GPT — USER NÃO CANÔNICO

Decisão preservada:

- User Access Token **não** é adotado como arquitetura canônica de descoberta da 003B;
- BISU permanece arquitetura canônica de produção até nova decisão;
- não usar Page ID/IG ID hardcoded ou informado tecnicamente pelo cliente;
- não adicionar scopes por tentativa;
- não pedir/persistir Page Access Token sem prova material.

Motivo: o fluxo USER testado não consegue descobrir automaticamente as Pages, e exigir ID técnico viola `Simplicidade Guiada`.

## 9. Achado de auditoria sobre o código de descoberta

`src/lib/meta/assets.ts` usa hoje `me/accounts` para descoberta de Pages independentemente do tipo de credencial.

A documentação oficial Meta consultada descreve `/me/accounts` explicitamente como caminho de listagem com **User Access Token**. Isso torna legítima a pergunta sobre a compatibilidade do mesmo edge com BISU/System-user access token.

Porém, o GPT **ainda não comprovou em fonte oficial vigente qual é o mecanismo correto e genérico de descoberta de Pages para BISU/System-user access token** no fluxo usado pelo projeto.

A menção anterior a `assigned_pages` foi apenas hipótese de investigação e não pode ser tratada como solução comprovada.

## 10. Correção 003B-06 — SUSPENSA

Documento:

`rodadas/gpt/CORRECAO_003B_06_DISCOVERY_CREDENTIAL_AWARE.md`

Status: **SUSPENSA — NÃO EXECUTAR**.

Motivo: não há ainda prova documental suficiente para autorizar mudança comportamental no código.

Próximo a agir: **GPT**, não Claude.

Próxima obrigação do GPT:

- investigar e documentar, com fonte oficial Meta, SDK oficial ou sample oficial vigente, qual é o contrato de descoberta de Pages/Instagram para BISU/System-user access token no Facebook Login for Business;
- somente depois disso decidir se existe correção segura no código ou se o bloqueio restante é externo/arquitetural.

Até essa comprovação, **não enviar `/proxima` ao Claude**.

## 11. Gate externo BISU

No fluxo BISU anterior, o portfólio Quoron apareceu desabilitado com:

`This Meta Business Account owns the app`

Esse fato permanece válido.

Ainda não está decidido se esse gate externo é o único bloqueio final, porque primeiro é necessário resolver documentalmente o contrato correto de descoberta para BISU.

Não usar empresa/portfólio de terceiro sem nova decisão explícita do fundador.

## 12. Continua NÃO autorizado

- promover/mergear 003B automaticamente;
- iniciar Fase 4;
- declarar USER arquitetura definitiva;
- remover BISU;
- implementar `assigned_pages` ou qualquer outro edge por hipótese;
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

- comprovar oficialmente o mecanismo de discovery para BISU/System-user access token;
- depois decidir se 003B-06 volta a ser autorizada ou se o gate final é externo;
- corrigir UX que hoje afirma ausência de Page quando a API apenas devolve lista vazia;
- harmonizar canônicos de mídia paga pós-003B;
- redaction do callback em logs antes de produção;
- leaked-password protection, SMTP/domínio, App Review/Business Verification quando aplicável.

## 14. Regra de comunicação para continuidade

- Sempre que o fundador for instruído a abrir uma página/tela externa, fornecer o link direto.
- O fundador não é programador: toda ação manual precisa dizer o que fazer, onde fazer e por quê.
- Não fragmentar uma sequência lógica conhecida em pedidos sucessivos que poderiam ter sido dados juntos.
- Não tratar hipótese sobre comportamento da Meta como fato antes de prova.
