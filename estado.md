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
- merge 003A: `546838db8e7ced4e9045c05feb8c7b2f0c476cc2`.
- CI final 003A: `32772710738` — verde.

003A está **EXECUTADA, AUDITADA E PROMOVIDA**.

## 3. Rodada 003B — NÃO PROMOVIDA

Mandato: `rodadas/gpt/RODADA_003B_META_ASSET_DISCOVERY_SELECTION.md`

Branch: `claude/rodada-003b-meta-asset-discovery-selection`

PR #12: **draft, open, não mergeado, mergeable=true**.

HEAD atual após execução parcial da 003B-09: `895dd0dc8b0d0d0c005c64edb95161518540deb8`.

CI do HEAD: `32854313271` — **success**.

Suíte normal na CI: **759/759 testes passando**, além de lint, typecheck, Edge Functions e build verdes.

Já executado/auditado anteriormente:

- migration `20260824210000_create_meta_asset_selection.sql` aplicada;
- `instagram_accounts` e `ad_accounts` presentes;
- Correção 003B-01: **APROVADA**;
- Correção 003B-03: **APROVADA**;
- investigação 003B-05 e complementos Page/IG: **AUDITADOS como evidência read-only**;
- Correção 003B-06 credential-aware discovery: **APROVADA em código/arquitetura; não é prova E2E BISU**;
- reconciliação da branch: **APROVADA**;
- Correção 003B-08 reconexão: **APROVADA**.

003B continua **NÃO PROMOVIDA**.

## 4. Produto e arquitetura Meta

Canônicos:

- `docs/01-produto/GROWTH_INTELLIGENCE_CANONICAL.md`;
- `docs/01-produto/PAID_MEDIA_CANONICAL.md`.

Arquitetura Meta canônica continua:

- Facebook Login for Business;
- System-user access token / BISU;
- Graph API v26.0 no estado atual.

App baseline:

- `Trafego Pago Business Dev` — App ID `2940404272985831`;
- `Quoron Instagram Dev Login` — Configuration ID `38307908848822330`;
- Business Portfolio Quoron ID `5301659283195806`.

Experimento USER atual é diagnóstico, **não arquitetura canônica**.

## 5. Restrição operacional de Business Portfolios

Fatos confirmados:

- a conta já atingiu o limite atual de **dois Meta Business Portfolios**;
- não é possível criar terceiro portfolio agora;
- o portfolio bloqueado/inutilizável é **`Bizzman5po`**;
- `Bizzman5po` e `BizzManiq1` são identidades distintas;
- `BizzManiq1` não deve ser tratado como bloqueado sem prova;
- Quoron possui o app canônico e apareceu inelegível como cliente do próprio app no fluxo BISU observado.

Regras:

- não criar terceiro portfolio;
- não excluir `Bizzman5po` por tentativa;
- não usar empresa/portfolio de terceiro sem decisão explícita;
- não inferir identidade/estado de recurso Meta por semelhança de nome.

## 6. Conexão USER real — ESTADO ATUAL AUDITADO

Conexão alvo:

`655da6e6-9056-456d-a81d-5e2570da5faf`

Organização:

`a8f79c4b-b10a-4e01-b12d-2d8e62917009`

Usuário/membership:

`d4ed915a-2fe8-4990-9e73-9a68fbbd1f9d`

Snapshot independente do GPT após o Claude declarar término da 003B-09:

- `status=ACTIVE`;
- `scope_count=6`;
- referência de token ainda presente;
- `token_expires_at` ainda preenchido;
- `disconnected_at=null`;
- `external_disconnect_pending_at=null`;
- `instagram_accounts=0`;
- `ad_accounts=0`;
- nenhum ativo selecionado.

Portanto **o ambiente NÃO foi zerado**.

## 7. Correção 003B-09 — AUDITORIA

Mandato:

`rodadas/gpt/CORRECAO_003B_09_RESET_E2E_CONEXAO_META.md`

Auditoria:

`rodadas/gpt/AUDITORIA_CORRECAO_003B_09_RESET_E2E_CONEXAO_META.md`

Veredito:

**PARCIALMENTE APROVADA EM CÓDIGO; REPROVADA/INCOMPLETA NO CRITÉRIO OPERACIONAL E2E.**

Código publicado no HEAD `895dd0dc...`:

- `revokeUserPermissions()` passou a aceitar JSON literal `true` e `{ success: true }` como sucessos explícitos;
- respostas ambíguas continuam falhando fechadas;
- token USER no `DELETE /permissions` passou para `Authorization: Bearer`, fora da URL;
- BISU continua sem usar o endpoint USER;
- estado recusado oferece `Conectar novamente` e `Desconectar e começar de novo`;
- a UI evita afirmar simultaneamente “Meta conectada” saudável quando a descoberta já classificou a credencial como recusada;
- criado harness real `scripts/e2e/meta-disconnect-003b-09.e2e.ts` e configuração `vitest.e2e.config.ts`.

O código **não deve ser revertido** neste momento.

Falha de execução:

- o E2E real obrigatório não foi comprovadamente executado;
- o harness não roda na CI normal e exige `META_E2E_DISCONNECT=1`;
- o relatório obrigatório `rodadas/claude/RELATORIO_CORRECAO_003B_09_RESET_E2E_CONEXAO_META.md` não existe no HEAD;
- o Supabase permanece `ACTIVE`.

## 8. Correção 003B-09 — EXECUTADA PARCIALMENTE, BLOQUEADA POR DECISÃO ARQUITETURAL

Mandato: `rodadas/gpt/CORRECAO_003B_09_RESET_E2E_CONEXAO_META.md`.

Status: **EXECUTADA — AGUARDANDO AUDITORIA GPT**, com o objetivo do reset **NÃO ATINGIDO**.

Relatório: `rodadas/claude/RELATORIO_CORRECAO_003B_09_RESET_E2E_CONEXAO_META.md`.

### 8.1 Implementado

- `revokeUserPermissions` aceita JSON literal `true` além de `{success:true}`; token sai da URL do `DELETE` e vai em `Authorization: Bearer`;
- `MetaSection` ganha `credencialRecusada`: no estado `conectado`, cala em vez de afirmar saúde;
- `conexao-recusada` ganha ação secundária **Desconectar e começar de novo**, pela action canônica;
- `MetaDisconnectButton` com rótulo configurável; `ContaPage` liga as duas leituras;
- harness E2E em `scripts/e2e/` com config própria, fora do `include` da CI e armado por variável explícita.

Provas: **242/242** em `src/lib/meta`, `src/lib/actions`, `src/components/meta`; `gateway.test.ts` 76/76; componentes 49/49. `tsc --noEmit` e `lint` limpos.

### 8.2 E2E real executado — falhou fechado sem tocar a Meta

Antes e depois idênticos: `ACTIVE`, referência de token presente, 6 escopos, `disconnected_at` nulo.

Resultado: `{ ok: false, reason: "PROVIDER_REVOKE_FAILED" }`; log `etapa: CLASSIFICACAO, http: 400, code: 190`; **nenhuma** chamada a `/permissions`. O parser corrigido não chegou a ser exercitado.

### 8.3 Causa real provada

Token íntegro: `debug_token` → `is_valid: true`, `type: USER`, app corrente, 6 escopos. `GET /me?fields=id,name` → 200.

Sonda `scripts/meta-classify-field-003b-09-probe.mjs` — mesmo nó, mesmo token, mesma versão, mudando só `fields`:

- `id,name` → **HTTP 200**;
- `client_business_id` → **HTTP 400, code 190, OAuthException**;
- `id,client_business_id` → **HTTP 400, code 190, OAuthException**.

**Pedir `client_business_id` com User Access Token é recusado com `190`.** `classifyCredential` pede exatamente isso. Consequências:

1. **desconexão USER bloqueada** — a classificação vem antes da primitive e falha fechada; `/permissions` nunca é chamado. É o "Desconectar não funciona" relatado;
2. **descoberta de ativos bloqueada** — a 003B-06 passou a usar a mesma classificação em `assets.ts`; o `190` vira `CONNECTION_REJECTED` e a tela diz "A Meta não aceitou mais a autorização atual" **sobre um token válido**. É a origem do `conexao-recusada` observado.

A 003B-06 foi aprovada, mas nenhuma prova até aqui exercitou a classificação contra um User Token real — eram duplos de teste.

### 8.4 Por que a correção não coube neste mandato

O §4.2 autoriza ajuste **restrito ao contrato de desconexão USER**. `classifyCredential` é compartilhada e governa também a descoberta e a distinção BISU; mudar como ela conclui "não é BISU" mexe na invariante de que essa afirmação exige prova positiva — criada pela 003A depois de `oauth/revoke` não revogar nada.

Alternativas identificadas, sem escolha do Claude:

- **(a)** interpretar `190` na leitura de `client_business_id` como ausência do contrato BISU, com identidade positiva obtida à parte;
- **(b)** inverter a ordem: identidade por `fields=id` e `client_business_id` em chamada isolada, tratando a recusa desse campo como sinal de não-BISU;
- **(c)** adotar outro sinal oficial de BISU, hoje proibido isoladamente pelo canônico;
- **(d)** manter como está — e então USER não desconecta nem descobre ativos.

Nenhuma implementada, nenhuma testada contra a Meta.

`DECISÃO ARQUITETURAL NECESSÁRIA — AGUARDANDO GPT`

### 8.5 Estado do ambiente

Conexão `655da6e6-9056-456d-a81d-5e2570da5faf` continua **ACTIVE**, token e escopos intactos. Nada revogado, apagado ou reconectado. Nenhuma alteração em `.env.local`, Meta App, configuração, escopos, portfólios ou ativos. O critério de saída — ambiente desconectado e pronto para teste do zero — **não foi atingido**.

Próximo a agir: **GPT** — decidir o mecanismo de classificação e autorizar a correção.

## 9. Continua NÃO autorizado

- alterar `.env.local`;
- alterar Meta App ou Business Login Configuration;
- adicionar/remover scopes;
- criar/excluir/mover Business Portfolio;
- mexer em Bizzman5po, BizzManiq1 ou Quoron;
- transferir Page/Instagram/Ad Account/app;
- usar terceiro;
- Page Access Token;
- campanha/anúncio/gasto;
- importar conteúdo;
- promover/mergear 003B;
- iniciar Fase 4;
- declarar USER arquitetura definitiva;
- tratar o E2E USER como prova BISU.

## 10. Gate BISU permanece separado

Ainda falta provar em E2E real BISU:

1. `assigned_pages` com BISU ativo do fluxo real;
2. permissões exigidas pelo edge;
3. expansão `instagram_business_account`;
4. descoberta/seleção completa em entidade cliente elegível.

A 003B-09 trata somente confiabilidade do ciclo USER conectar/desconectar e reset de teste.

## 11. Regra de continuidade

- distinguir sempre planejado, autorizado, executado, auditado e promovido;
- não promover por relatório do Claude sem auditoria independente;
- sempre dar ao fundador uma única ação manual principal, com explicação simples;
- não tratar hipótese sobre comportamento da Meta como fato sem prova;
- nomes de recursos Meta só podem ser associados a estado/função quando comprovados.
