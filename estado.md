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

PR #13: **MERGEADA**.

HEAD final auditado: `880a7e4665f827fc7ea5707d863fb00299f56811`.

CI final: `32873495263` — **success**, 734/734 testes.

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

### 2.2 Supabase após 004A

Migration incorporada: `20260825140000_create_ai_foundation_core`.

Tabelas remotas: `ai_providers`, `ai_models`, `ai_price_versions`, `ai_runs`.

Snapshot auditado:

- quatro tabelas presentes;
- RLS habilitado;
- zero policies por desenho server-only;
- `anon`/`authenticated` sem grants;
- grants mínimos para `service_role`;
- zero registros residuais após provas.

O histórico de migrations foi reconciliado incluindo na `main`, como artefato histórico exato já aplicado, `20260824210000_create_meta_asset_selection.sql`. Isso **não promove funcionalmente a 003B**.

### 2.3 Dívida de performance 004A

O advisor apontou FKs de `ai_runs` sem índice de cobertura:

- `ai_runs_fallback_same_organization`;
- `ai_runs_model_belongs_to_provider`;
- `ai_runs_price_belongs_to_model`;
- `ai_runs_provider_id_fkey`.

São INFO de performance, não falha de segurança. A Rodada 004B está autorizada a quitá-los porque já tocará schema; não criar housekeeping isolado.

## 3. Rodada 003B — ESTACIONADA, NÃO PROMOVIDA

Branch: `claude/rodada-003b-meta-asset-discovery-selection`.

PR #12: **draft, open, não mergeado**.

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

## 5. Rodada vigente — 004B

Rodada: **004B — Quoron Branding + Growth Context Foundation**.

Mandato: `rodadas/gpt/RODADA_004B_QUORON_GROWTH_CONTEXT.md`.

Status: **PLANEJADA E AUTORIZADA — AGUARDANDO EXECUÇÃO CLAUDE CODE.**

Base: `main` atual.

Branch esperada: `claude/rodada-004b-quoron-growth-context`.

### 5.1 Objetivos substantivos

1. consolidar **Quoron** nas superfícies ativas do produto/documentação vigente, sem renomear identificadores técnicos de risco;
2. reduzir o onboarding inicial ao contexto essencial;
3. criar `growth_objectives` separado de `business_profiles`;
4. estruturar objetivo atual, destino/jornada e evento de sucesso;
5. preservar histórico ao alterar objetivo;
6. permitir somente owner/admin alterar objetivo pelo caminho server-side autorizado;
7. diferenciar resultado desejado de capacidade real de mensuração;
8. quitar os INFO de índices de FKs de `ai_runs` registrados na 004A.

### 5.2 Experiência esperada

Após criar o negócio, o usuário deve ser conduzido a responder, em linguagem simples:

- **O que você quer conseguir agora?**
- **Para onde você quer levar a pessoa?**
- **Qual ação significa sucesso?**

Ausência de objetivo continua sendo estado válido e não bloqueia a conta/Meta, mas deve orientar o próximo passo.

Nenhuma terminologia de Ads Manager/API deve aparecer no fluxo normal.

## 6. Continua NÃO autorizado

### Meta

- promover/mergear 003B;
- iniciar importação real Instagram/Fase 4;
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
- IA inferir automaticamente objetivo do usuário;
- qualquer capacidade de IA executar gasto.

### Branding externo/técnico

- renomear repositório GitHub;
- renomear pasta local;
- recriar/trocar Supabase project ref;
- renomear/mover recursos Meta.

### Produto fora da 004B

- importação/publicação Instagram;
- Content Intelligence/Oportunidades;
- campanhas/Ads;
- Financial Approval;
- CRM/leads;
- App Shell/Hoje definitivo.

## 7. Próximo a agir

**Claude Code**.

Executar `/proxima` na janela do projeto e seguir `RODADA_004B_QUORON_GROWTH_CONTEXT.md`.

Se o classificador pedir autorização humana para `supabase db push` ou prova mutável, parar no gate e pedir apenas essa autorização ao fundador. Não contornar.

Ao concluir, parar em **AGUARDANDO AUDITORIA GPT**.

## 8. Regra de continuidade

- distinguir planejado, autorizado, executado, auditado e promovido;
- não promover por relatório do Claude sem auditoria independente;
- gate Meta não bloqueia desenvolvimento independente;
- hipótese Meta não vira fato sem prova;
- nomes de recursos Meta só recebem estado/função quando comprovados;
- não reescrever histórico antigo por branding;
- evitar housekeeping isolado quando puder entrar em rodada substantiva.