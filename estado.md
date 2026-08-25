# ESTADO — Quoron

Atualizado: 2026-08-25

Estado incorporado = `main + este arquivo + promoção real`.

## 1. Nome e ambiente

Nome canônico do produto: **Quoron**.

Decisão: `rodadas/gpt/DECISAO_NOME_PRODUTO_QUORON.md`.

A migração de branding no runtime/documentação ativa ainda não foi executada. Ela deve abrir a próxima rodada substantiva, sem criar uma rodada apenas de housekeeping.

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

HEAD final auditado:

`880a7e4665f827fc7ea5707d863fb00299f56811`

CI final:

`32873495263` — **success**.

Merge:

`da2862135eab6897fc44ae361da1298c7071a11f`

Auditoria final:

`rodadas/gpt/AUDITORIA_FINAL_004A_AI_FOUNDATION_CORE.md`

Commit documental da auditoria:

`d0dd19aa64d8ba893ec2f6aaa261c8db1c6cd239`

Veredito:

**004A EXECUTADA, CORRIGIDA, AUDITADA, APROVADA E PROMOVIDA.**

A 004A incorporou:

- catálogo interno de providers/modelos/preços;
- contrato `AI Task` sem feature escolher provider/modelo;
- Router server-only;
- structured output validado;
- ledger `ai_runs` auditável;
- custo com precisão fixa, sem float;
- ledger/custo fail-closed;
- coerência relacional provider → model → price version;
- vigência de modelos/preços;
- RLS e ACL server-only;
- fake adapter exclusivamente em teste.

Não existe ainda provider real, API key, SDK, chamada paga, fallback real, tool calling, embeddings/RAG ou feature de IA de negócio.

### 2.2 Supabase após 004A

Migration incorporada:

`20260825140000_create_ai_foundation_core`

Tabelas remotas:

- `ai_providers`;
- `ai_models`;
- `ai_price_versions`;
- `ai_runs`.

Snapshot de auditoria:

- quatro tabelas presentes;
- RLS habilitado;
- zero policies, por desenho server-only;
- `anon`/`authenticated` sem grants;
- grants mínimos para `service_role`;
- zero registros residuais após provas.

Histórico de migrations foi reconciliado trazendo para a `main`, como artefato histórico exato já aplicado, `20260824210000_create_meta_asset_selection.sql`. Isso **não promove funcionalmente a 003B**.

### 2.3 Dívida de performance não bloqueante

O advisor do Supabase aponta FKs de `ai_runs` sem índice de cobertura, especialmente:

- `ai_runs_fallback_same_organization`;
- `ai_runs_model_belongs_to_provider`;
- `ai_runs_price_belongs_to_model`;
- `ai_runs_provider_id_fkey`.

São INFO de performance, não falha de segurança/correção. Como a camada ainda não recebe carga produtiva e as tabelas estão vazias, não bloquearam a promoção.

Resolver na próxima rodada substantiva que tocar schema/IA, sem rodada isolada de housekeeping.

## 3. Rodada 003B — ESTACIONADA, NÃO PROMOVIDA

Mandato: `rodadas/gpt/RODADA_003B_META_ASSET_DISCOVERY_SELECTION.md`.

Branch: `claude/rodada-003b-meta-asset-discovery-selection`.

PR #12: **draft, open, não mergeado**.

HEAD final da execução mais recente:

`053bc7ca3f25b53954579df30bce598894e718dd`.

CI:

`32859795018` — **success**.

Já preservado/auditado:

- schema remoto de `instagram_accounts` e `ad_accounts` existe;
- Correção 003B-01: aprovada;
- Correção 003B-03: aprovada;
- investigações 003B-05/Page/IG: evidência read-only auditada;
- endpoint BISU `/{system-user-id}/assigned_pages` preservado;
- 003B-08 reconexão: aprovada em código;
- 003B-09 parser/UX: aprovada em código, com E2E real executado.

003B continua **NÃO PROMOVIDA**.

### 3.1 Defeito Meta comprovado

Com o mesmo User Access Token válido:

- `debug_token` confirma `is_valid=true`, `type=USER`;
- `/me?fields=id,name` → HTTP 200;
- `/me?fields=client_business_id` → HTTP 400 / code 190;
- `/me?fields=id,client_business_id` → HTTP 400 / code 190.

Conclusão: o classifier compartilhado da 003B-06 não pode continuar inferindo saúde/tipo da credencial pela leitura de `client_business_id` desse modo.

Consequências:

- desconexão USER pode ser bloqueada antes da primitive real;
- descoberta pode mostrar `conexao-recusada` sobre token válido;
- mensagem de conexão recusada não é prova de token morto.

A parte `assigned_pages` da arquitetura BISU permanece preservada. A trilha Meta só volta com nova decisão arquitetural e condição operacional adequada.

### 3.2 Restrição operacional Meta

Fatos confirmados:

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

Decisão:

`rodadas/gpt/DECISAO_DESBLOQUEIO_DESENVOLVIMENTO_META_GATE.md`.

O gate Meta é trilha pendente, não bloqueio global. Capacidades independentes podem avançar a partir da `main`.

## 5. Próximo marco obrigatório — Quoron + avanço substantivo

A próxima rodada substantiva deve começar incorporando a decisão:

`rodadas/gpt/DECISAO_NOME_PRODUTO_QUORON.md`.

Objetivo de branding inicial:

- título/metadata e textos visíveis do produto;
- Home e superfícies novas;
- constante de nome quando apropriado;
- package name se seguro;
- README e documentos canônicos ativos;
- `.gpt/PROJECT_PROMPT.md`, `CLAUDE.md` e governança ativa quando tratam o nome atual do produto.

Não reescrever histórico antigo, migrations, auditorias ou evidências apenas por branding.

A renomeação deve vir acoplada a **avanço real de produto**, não como rodada isolada.

## 6. Direção recomendada para a próxima rodada

Próximo desenvolvimento independente mais coerente: **Contexto do Negócio / Objetivo / Jornada**, aproveitando a fundação já promovida de `business_profiles` e o modelo canônico de crescimento.

Antes de autorizar a rodada, GPT deve inspecionar schema, actions e UI atuais do negócio e definir o menor delta que:

- preserve onboarding progressivo;
- não crie uma tabela gigantesca de perfil;
- permita estruturar objetivo, jornada desejada e evento de sucesso de forma simples;
- prepare Conteúdo, Oportunidades, IA e mídia paga futuras;
- não dependa da Meta nem de provider real de IA.

Essa direção ainda precisa de mandato formal do GPT antes de execução.

## 7. Continua NÃO autorizado

### Meta

- promover/mergear 003B;
- iniciar importação real de Instagram/Fase 4;
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
- qualquer capacidade de IA executar gasto.

### Branding externo/técnico de alto risco

- renomear repositório GitHub;
- renomear pasta local enquanto sessões/branches dependem dela;
- recriar ou trocar Supabase project ref;
- renomear/mover recursos Meta durante o gate estacionado.

## 8. Próximo a agir

**GPT**.

Próxima ação autorizada: planejar e publicar a próxima rodada substantiva independente da Meta, começando pela migração de branding para Quoron e por uma capacidade real de produto compatível com o modelo canônico.

Claude Code não deve iniciar nova rodada até existir mandato apontado neste `estado.md`.

## 9. Regra de continuidade

- distinguir planejado, autorizado, executado, auditado e promovido;
- não promover por relatório do Claude sem auditoria independente;
- gate Meta não bloqueia desenvolvimento independente;
- hipótese sobre comportamento da Meta não vira fato sem prova;
- nomes de recursos Meta só recebem estado/função quando comprovados;
- não reescrever histórico antigo por branding;
- evitar housekeeping isolado quando a atualização puder entrar numa rodada substantiva.