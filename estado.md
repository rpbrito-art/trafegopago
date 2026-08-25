# ESTADO — Quoron

Atualizado: 2026-08-25

Estado incorporado = `main + este arquivo + promoção real`.

## 1. Nome e ambiente

Nome canônico do produto: **Quoron**.

Decisão: `rodadas/gpt/DECISAO_NOME_PRODUTO_QUORON.md`.

Identificadores técnicos legados permanecem temporariamente:

- repo: `rpbrito-art/trafegopago`;
- Supabase project ref: `cbnxdoxpyioxjwgjhbtq`;
- pasta local esperada: `C:\Users\rpbri\Documents\trafegopago`;
- `business-weaver`: fora de escopo.

Não renomear repo, pasta local, project ref do Supabase ou recursos externos Meta apenas por branding enquanto isso trouxer risco operacional sem ganho funcional.

## 2. Estado incorporado

Promovidas: **000–003A e 004A**.

- Fase 1 — Supabase, Auth e Tenancy: **ENCERRADA**.
- Fase 2 — Operations, Audit, Queues e Segurança Base: **ENCERRADA**.
- Fase 3 — Meta Connection Foundation: **EM ANDAMENTO / GATE EXTERNO PENDENTE**.
- Fase 6 — AI Foundation: **EM ANDAMENTO; 004A FOUNDATION CORE PROMOVIDA**.
- última rodada promovida: **004A — AI Foundation Core**.

### 2.1 Promoção 004A

PR #13: mergeada.

HEAD final auditado: `880a7e4665f827fc7ea5707d863fb00299f56811`.

CI final: `32873495263` — success, 734/734.

Merge: `da2862135eab6897fc44ae361da1298c7071a11f`.

Auditoria final: `rodadas/gpt/AUDITORIA_FINAL_004A_AI_FOUNDATION_CORE.md`.

Veredito: **004A EXECUTADA, CORRIGIDA, AUDITADA, APROVADA E PROMOVIDA.**

Incorporado:

- catálogo interno de providers/modelos/preços;
- contrato `AI Task` sem feature escolher provider/modelo;
- Router server-only;
- structured output validado;
- ledger `ai_runs` auditável;
- custo com precisão fixa, sem float;
- ledger/custo fail-closed;
- coerência provider → model → price version;
- vigência de modelos/preços;
- RLS e ACL server-only;
- fake adapter exclusivamente em teste.

Ainda não existe provider real, API key, SDK, chamada paga, fallback real, tool calling, embeddings/RAG ou feature de IA de negócio.

## 3. Rodada 003B — ESTACIONADA, NÃO PROMOVIDA

Branch: `claude/rodada-003b-meta-asset-discovery-selection`.

PR #12: draft, open, não mergeada.

HEAD: `053bc7ca3f25b53954579df30bce598894e718dd`.

CI: `32859795018` — success.

Preservado/auditado:

- schema remoto de `instagram_accounts` e `ad_accounts` existe;
- Correções 003B-01 e 003B-03 aprovadas;
- investigações 003B-05/Page/IG auditadas como evidência read-only;
- endpoint BISU `/{system-user-id}/assigned_pages` preservado;
- 003B-08 reconexão aprovada em código;
- 003B-09 parser/UX aprovada em código, com E2E real executado.

003B continua **NÃO PROMOVIDA**.

### 3.1 Defeito Meta comprovado

Com o mesmo User Access Token válido:

- `debug_token`: `is_valid=true`, `type=USER`;
- `/me?fields=id,name` → 200;
- `/me?fields=client_business_id` → 400 / code 190;
- `/me?fields=id,client_business_id` → 400 / code 190.

O classifier compartilhado da 003B-06 não pode continuar inferindo saúde/tipo da credencial por `client_business_id` desse modo.

A parte `assigned_pages` da arquitetura BISU permanece preservada. A trilha Meta só volta com nova decisão arquitetural e condição operacional adequada.

### 3.2 Restrição operacional Meta

- limite atual de dois Meta Business Portfolios atingido;
- portfolio bloqueado/inutilizável: `Bizzman5po`;
- `Bizzman5po` e `BizzManiq1` são identidades distintas;
- `BizzManiq1` não deve ser tratado como bloqueado sem prova;
- Quoron possui o app canônico e apareceu inelegível como cliente do próprio app no fluxo BISU observado.

Continua proibido por tentativa:

- criar terceiro portfolio;
- excluir `Bizzman5po`;
- usar empresa/portfolio de terceiro;
- alterar app/configuração/scopes;
- promover 003B sem E2E BISU real.

## 4. Gate Meta não bloqueia o restante do produto

Decisão: `rodadas/gpt/DECISAO_DESBLOQUEIO_DESENVOLVIMENTO_META_GATE.md`.

O gate Meta é trilha pendente, não bloqueio global. Capacidades independentes podem avançar a partir da `main`.

## 5. Rodada 004B — EXECUTADA, NÃO PROMOVIDA

Rodada: **004B — Quoron Branding + Growth Context Foundation**.

Mandato: `rodadas/gpt/RODADA_004B_QUORON_GROWTH_CONTEXT.md`.

Branch: `claude/rodada-004b-quoron-growth-context`.

PR #14: **draft, open, não mergeada, mergeable=true no snapshot auditado**.

HEAD auditado: `c0be0427b837e71a2532fbf228618f400b180070`.

CI: `32877064536` — **success**, 766/766 testes, lint/typecheck/Edge Functions/build verdes.

Relatório Claude: `rodadas/claude/RELATORIO_RODADA_004B_QUORON_GROWTH_CONTEXT.md`.

Auditoria GPT: `rodadas/gpt/AUDITORIA_RODADA_004B_QUORON_GROWTH_CONTEXT.md`.

Veredito:

**BASE SUBSTANTIVA APROVADA; RODADA REPROVADA PARA PROMOÇÃO ATÉ CORREÇÃO 004B-01.**

### 5.1 Base aprovada da 004B

- branding Quoron no runtime, metadata, Home, auth/conta e package;
- onboarding inicial reduzido a quatro campos essenciais;
- `target_audience` e `acquisition_goal` nullable sem apagar dados;
- nova entidade `growth_objectives` separada de `business_profiles`;
- um único objetivo ACTIVE por organização;
- histórico preservado ao alterar objetivo;
- RPC server-only, service_role, owner/admin, org/membership ACTIVE;
- serialização por organização e idempotência de reenvio idêntico;
- RLS de leitura e browser sem escrita;
- rota `/objetivo` com três perguntas em linguagem de negócio;
- resultado desejado explicitamente separado de observabilidade;
- quatro INFO de FK de `ai_runs` da 004A quitados.

### 5.2 Supabase remoto da 004B

Migrations já aplicadas:

- `20260825180000_create_growth_objectives`;
- `20260825190000_index_growth_objectives_created_by`.

Snapshot independente:

- `growth_objectives` presente e sem fixtures residuais;
- RLS habilitado e uma policy SELECT;
- `anon` sem grants;
- `authenticated` somente SELECT;
- `service_role` SELECT/INSERT/UPDATE e sem DELETE;
- RPC sem EXECUTE para anon/authenticated e com EXECUTE para service_role;
- constraints e índices esperados presentes;
- `target_audience` e `acquisition_goal` nullable;
- advisor não mostra mais os quatro unindexed FKs de `ai_runs`.

Essas migrations **não devem ser reescritas**.

## 6. Bloqueadores da auditoria 004B

### 6.1 Bloqueante — seleção silenciosa de organização

O estado promovido da conta não seleciona automaticamente quando há múltiplas memberships.

A 004B, porém, usa:

- `ativas[0]` em `getObjectiveState()`;
- `.limit(1)` na resolução de organização de `setGrowthObjectiveAction()`.

Isso pode mostrar ou alterar objetivo de um negócio escolhido implicitamente pela ordem do banco quando a conta participa de mais de um negócio.

Também cria inconsistência para membership/organização inativa.

**Não promover enquanto isso existir.**

### 6.2 Nullable incompleto

`BusinessProfileSummary.targetAudience` ainda é `string` e a leitura converte `NULL` em `""`.

Deve preservar `null` até a UI, que já pode apresentar “Não informado”.

### 6.3 Branding ativo incompleto

Ainda usam o nome antigo como identidade corrente e devem ser atualizados semanticamente para Quoron:

- `.gpt/CHAT_ENTRY_PROMPT.md`;
- `docs/00-governanca/ACTIVE_DOCS.md`;
- `docs/00-governanca/PROJECT_CHARTER.md`;
- `docs/00-governanca/IMPLEMENTATION_ROADMAP.md`;
- `docs/00-governanca/ARCHITECTURE_EXECUTION_BOUNDARY.md`;
- `docs/00-governanca/EXTERNAL_CONFIGURATION_GATE.md`;
- `docs/00-governanca/DOCUMENTATION_LIFECYCLE.md`;
- `docs/00-governanca/HISTORY_SUMMARY.md` apenas na identidade/título corrente, sem reescrever histórico.

## 7. Correção 004B-01 — EXECUTADA

Mandato: `rodadas/gpt/CORRECAO_004B_01_MULTI_ORG_NULLABLE_BRANDING.md`.

Branch: `claude/rodada-004b-quoron-growth-context` · PR #14.

Status: **EXECUTADA — AGUARDANDO AUDITORIA GPT**.

Relatório: `rodadas/claude/RELATORIO_CORRECAO_004B_01_MULTI_ORG_NULLABLE_BRANDING.md`.

Sem DDL: nenhuma migration nova; RPC e policy intactas.

### 7.1 Contexto de organização falha fechado

Novo `src/lib/business/organization-context.ts` — resolvedor único com a semântica já promovida em `getAccountBusinessState()`, para não haver duas definições divergentes de "a organização do usuário".

`ativas[0]` e `.limit(1)` removidos. Só o contexto inequívoco devolve `organizationId`.

- `getObjectiveState()` não consulta `growth_objectives` em multi-org; ganhou `negocio-indisponivel` e `multiplos-negocios`;
- `setGrowthObjectiveAction()` não chama a RPC em contexto ambíguo ou indisponível; `organizationId` do formulário segue sem caminho até o SQL;
- UI trata os dois estados em linguagem simples, sem id, papel ou contagem técnica; nenhum seletor multi-org adicionado.

Membership `INACTIVE` continua contando para detectar múltiplos negócios.

### 7.2 Nulabilidade fiel

`BusinessProfileSummary.targetAudience` passou a `string | null`; `?? ""` removido. O defeito era visível: com `""` o fallback da UI não disparava e a tela mostrava campo em branco como se fosse valor. Agora mostra **Não informado**. Sem update ou backfill.

### 7.3 Branding ativo

Migrados os oito documentos do §5, apenas onde o nome era identidade corrente. Preservados histórico, relatórios, auditorias, migrations, o conceito `tráfego pago` em minúsculas e os identificadores técnicos legados.

### 7.4 Prova RLS real

`scripts/sql/growth-objectives-rls-004b01-proof.sql` → **7 casos, 7 passaram, 0 falharam**.

Leitura sob `set local role authenticated` com `auth.uid()` simulado por `request.jwt.claims`, e consulta a `growth_objectives` **sem filtro de organização** — quem restringe é a policy. Diferente da prova da 004B, que avaliava a expressão como owner sem atravessar a RLS.

Provado: usuário A vê exatamente 1 objetivo, o da própria organização; não vê o da B; membership `INACTIVE` lê zero; organização `INACTIVE` lê zero; `authenticated` recebe `42501` ao tentar INSERT e ao tentar executar a RPC.

Resíduo após rollback: zero.

### 7.5 Testes

`npx vitest run` → **803/803** em 36 arquivos. Novos: contexto 12, action 13, marca 6, estados de UI 3, nulabilidade 3. `tsc --noEmit` e `lint` limpos.

Os 29 casos SQL da 004B não foram repetidos: nada tocou migration, RPC ou policy.

## 8. Continua NÃO autorizado

### Meta

- promover/mergear 003B;
- iniciar importação real Instagram;
- declarar USER arquitetura definitiva;
- remover BISU;
- alterar scopes/app/Business Login Configuration;
- criar/excluir/mover Business Portfolio;
- transferir ativos;
- usar terceiro;
- campanha/anúncio/gasto.

### IA

- provider real;
- API key;
- chamada paga;
- SDK de IA;
- fallback real;
- tool calling;
- embeddings/RAG;
- geração real de copy/imagem;
- IA inferir automaticamente objetivo;
- qualquer capacidade de IA executar gasto.

### Produto

- seletor multi-organização;
- Content Intelligence/Oportunidades;
- Financial Approval;
- CRM/leads;
- App Shell/Hoje definitivo;
- nova fase enquanto a 004B estiver em correção.

### Branding técnico externo

- renomear repositório GitHub;
- renomear pasta local;
- recriar/trocar Supabase project ref;
- renomear/mover recursos Meta.

## 9. Próximo a agir

**GPT** — reauditar a 004B no PR #14.

## 10. Regra de continuidade

- distinguir planejado, autorizado, executado, auditado, aprovado e promovido;
- não promover por relatório do Claude sem auditoria independente;
- migrations 004B já aplicadas não devem ser reescritas;
- gate Meta não bloqueia desenvolvimento independente;
- hipótese Meta não vira fato sem prova;
- nomes de recursos Meta só recebem estado/função quando comprovados;
- não reescrever histórico antigo por branding;
- evitar housekeeping isolado quando puder entrar em rodada substantiva.
