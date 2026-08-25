# HANDOFF DE TRANSFERÊNCIA — QUORON — PÓS-004B

Data: 2026-08-25

Chat de origem: chat atual do projeto Quoron/Tráfego Pago em 2026-08-25. O título da conversa não está exposto ao GPT neste contexto; não inventar título.

Objetivo deste documento: permitir que um novo GPT planejador/auditor assuma o mandato sem depender de memória privada deste chat e sem obrigar o fundador a reconstruir contexto.

## 1. Estado na transferência

A transferência acontece **depois do fechamento completo da 004B**.

Estado incorporado:

- promovidas: 000–003A, 004A e 004B;
- última rodada promovida: **004B — Quoron Branding + Growth Context Foundation**;
- PR #14 mergeada;
- merge 004B: `8d9abea9fd8e18a8c9ad08052694aa09f03a31e0`;
- HEAD final auditado da PR: `fad941e55b3098c72bfa744f2ce681f2368c33c6`;
- CI final: `32879374174` — success, 803/803;
- auditoria final: `rodadas/gpt/AUDITORIA_FINAL_004B_QUORON_GROWTH_CONTEXT.md`;
- estado atualizado em `estado.md`;
- `HISTORY_SUMMARY.md` atualizado até 004B.

**Não existe nova rodada substantiva autorizada para Claude Code na transferência.**

Próximo ator: **novo GPT**.

## 2. Última decisão explícita do fundador

O fundador decidiu duas coisas recentes que devem ser preservadas:

1. o nome do software passa a ser **Quoron**;
2. após o fechamento desta rodada, deseja **mudar de chat** antes de iniciar nova rodada.

Ele também decidiu anteriormente que o desenvolvimento do restante do software deve continuar mesmo enquanto o acesso/condição operacional do portfólio Meta estiver bloqueado.

## 3. Definição vigente do produto

Definição conversacional consolidada neste chat:

**Quoron é uma plataforma de inteligência de crescimento para pequenas empresas que transforma dados/contexto do negócio, conteúdo, público, mídia e resultados em decisões simples sobre o que fazer a seguir.**

Não é principalmente:

- Ads Manager simplificado;
- gerenciador genérico de social media;
- chatbot com IA.

Núcleo:

`contexto do negócio → objetivo → jornada → público/personas → conteúdo/criativo → distribuição orgânica/paga → resultado → aprendizado → próxima ação`

Lei do produto:

**a complexidade pertence ao sistema, não ao usuário.**

O ativo central de longo prazo é a memória estruturada de aprendizagem do negócio e a capacidade de transformar evidência em próxima decisão.

Mídia paga permanece pilar central, mas o produto deve gerar valor também organicamente.

Gasto nunca pode ser executado pela IA sem aprovação humana explícita.

## 4. Sequência recente — de 003B até a transferência

### 4.1 003B / Meta

A 003B buscava descoberta/seleção real de Page, Instagram e ad account.

Arquitetura relevante preservada:

- USER discovery usava `/me/accounts`;
- System User/BISU usa endpoint oficial `/{system-user-id}/assigned_pages`;
- `src/lib/meta/credential.ts`/gateway passaram a distinguir caminhos por credencial;
- parte `assigned_pages` foi aprovada em código, mas nunca tratada como prova E2E BISU completa.

USER experiment real:

- User Access Token válido;
- `debug_token` → válido, type USER;
- `/me` → 200;
- `/me/accounts` → 200 com 0 itens;
- `/me/adaccounts` → 200 com 3 contas;
- Page Quoron direta `1356474050873300` → 200;
- Instagram profissional ligado `17841429590351285`, username `goquoron`;
- IG profile/insights diretos → 200.

Isso provou que o token USER não estava globalmente cego; a anomalia ficou concentrada em `/me/accounts`.

### 4.2 Reconexão e desconexão 003B-08/09

O fundador queria testar a conexão do zero porque a UI parecia permitir nem reconectar nem desconectar corretamente.

003B-08 corrigiu a UI para oferecer `Conectar novamente` em `conexao-recusada`.

Auditoria mostrou depois que o botão de reconectar **realmente chegava ao backend e concluía OAuth**; a percepção de falha vinha do estado pós-OAuth/UX e da desconexão.

003B-09 corrigiu o parser de revogação USER para aceitar resposta literal `true`, usar Authorization header e falhar fechado fora das formas explicitamente aceitas.

Foi criado harness real de desconexão. O classificador de segurança do Claude Code bloqueou mutação real até o fundador autorizar explicitamente. O fundador escolheu executar uma vez via comando autorizado, sem alterar permissões permanentes do Claude.

O E2E real então revelou outro defeito antes da revogação:

- token USER válido;
- `/me?fields=id,name` → 200;
- `/me?fields=client_business_id` → 400/code 190;
- `/me?fields=id,client_business_id` → 400/code 190.

Conclusão: o classifier compartilhado não pode usar essa leitura de `client_business_id` como prova de saúde/tipo de User Token.

Por isso a 003B foi **estacionada e não promovida**.

### 4.3 Decisão de desbloqueio do restante do produto

O fundador perguntou se poderíamos continuar construindo o software até recuperar condição operacional no portfólio Meta.

Decisão tomada e documentada:

- o gate Meta vira **trilha externa pendente**, não bloqueio global;
- não fingir que 003B foi aprovada;
- continuar a partir da `main` em capacidades independentes;
- não iniciar partes que dependam diretamente do comportamento real Meta sem E2E adequado.

Documento:

`rodadas/gpt/DECISAO_DESBLOQUEIO_DESENVOLVIMENTO_META_GATE.md`.

### 4.4 004A — AI Foundation Core

Foi antecipada a fundação de IA, partindo da `main`, sem carregar a branch 003B.

Primeira execução teve problemas de auditoria:

- possível sucesso de feature mesmo com falha de ledger/custo;
- incoerência potencial model/provider/price;
- vigência temporal incompleta;
- histórico de migration remoto continha migration 003B já aplicada que não estava na main.

004A-01 corrigiu:

- ledger/custo fail-closed;
- coerência relacional;
- vigência de modelo/preço;
- reconciliação do histórico trazendo cópia exata da migration Meta já aplicada, sem promover 003B.

004A foi promovida:

- PR #13;
- merge `da2862135eab6897fc44ae361da1298c7071a11f`;
- catálogo de providers/modelos/preços;
- Router server-only;
- structured output;
- `ai_runs` auditável;
- custo fixo sem float;
- fake adapter somente em testes.

Ainda **não** existe provider real, API key, SDK, chamada paga, fallback real, tool calling, embeddings/RAG ou feature de IA de negócio.

### 4.5 Decisão de nome — Quoron

O fundador determinou que **Quoron** é o nome do software.

Foi decidido não interromper a 004A em andamento e fazer a migração de marca na próxima rodada substantiva, sem renomear imediatamente identificadores técnicos de risco.

Documento:

`rodadas/gpt/DECISAO_NOME_PRODUTO_QUORON.md`.

Repo/pasta/Supabase/ref Meta permanecem com identificadores legados quando isso evita risco operacional.

### 4.6 004B — Branding + Growth Context

Objetivos:

- consolidar Quoron como marca;
- reduzir onboarding inicial;
- estruturar objetivo/jornada/evento de sucesso;
- não depender de Meta nem de provider real de IA.

Primeira execução entregou:

- marca Quoron em runtime/documentação;
- package `quoron`;
- onboarding de 10 para 4 campos;
- `target_audience` e `acquisition_goal` nullable;
- `growth_objectives` versionado;
- `/objetivo` com três perguntas em português;
- RPC server-side owner/admin;
- histórico/idempotência/único ACTIVE;
- RLS SELECT;
- dívida de índices `ai_runs` quitada;
- 766/766 CI.

Auditoria GPT encontrou bloqueio:

- `getObjectiveState()` usava `ativas[0]`;
- action usava `.limit(1)`;
- uma conta multi-organização poderia ver/gravar objetivo no tenant escolhido implicitamente pela ordem do banco.

Também encontrou:

- `targetAudience NULL` convertido em `""`;
- oito documentos ativos de governança ainda com nome antigo como identidade corrente.

### 4.7 Correção 004B-01

Correção fechada:

- novo `resolveOrganizationContext()` fail-closed;
- zero memberships → sem organização;
- uma indisponível/inativa → negócio indisponível;
- múltiplas memberships → estado explícito, nenhuma escolha implícita;
- só contexto único e ativo retorna organizationId;
- action não chama RPC em multi-org/indisponível;
- UI trata estados sem seletor multi-org;
- `targetAudience` preserva `null`;
- oito docs ativos passaram a Quoron;
- prova RLS focada executada pelo Claude 7/7 sob `authenticated` + rollback;
- CI final 803/803.

Auditoria GPT tentou repetir a prova transacional via conector Supabase, mas o conector opera read-only e recusou `CREATE TEMP TABLE`. Isso foi registrado como limitação do conector, não do produto.

GPT confirmou independentemente:

- zero fixtures residuais;
- RLS habilitado;
- uma policy SELECT;
- authenticated somente SELECT;
- browser sem INSERT/UPDATE/DELETE;
- RPC inacessível a anon/authenticated e executável por service_role.

Script da prova foi inspecionado e efetivamente troca para `authenticated`, usa `auth.uid()` simulado, consulta sem filtro de organização e termina em rollback.

004B aprovada e promovida.

## 5. Estado exato da Meta na transferência

### 5.1 Identidades/recursos conhecidos

- app canônico: `Trafego Pago Business Dev` (nome externo legado; não renomear agora);
- App ID: `2940404272985831`;
- Business Login config: `Quoron Instagram Dev Login`;
- Configuration ID: `38307908848822330`;
- Business Portfolio Quoron ID: `5301659283195806`;
- Quoron é owner do app canônico;
- Page Quoron ID: `1356474050873300`;
- Instagram profissional Quoron ID: `17841429590351285`;
- username IG: `goquoron`.

### 5.2 Portfolios — cuidado obrigatório

Fato corrigido pelo fundador:

- portfolio bloqueado/inutilizável é **`Bizzman5po`**;
- **não** é `BizzManiq1`;
- `Bizzman5po` e `BizzManiq1` são identidades distintas;
- função/tipo atual de `BizzManiq1` permanece **desconhecida até prova**;
- conta está no limite atual de dois Meta Business Portfolios;
- não criar terceiro;
- não excluir `Bizzman5po` por tentativa;
- não usar terceiro sem decisão explícita.

Nunca reconstruir identidade de recurso Meta por similaridade de nome.

### 5.3 Conexão USER histórica

Conexão usada na investigação:

- connection id `655da6e6-9056-456d-a81d-5e2570da5faf`;
- organization `a8f79c4b-b10a-4e01-b12d-2d8e62917009`;
- external_user_id `28050226117920563`;
- scopes: pages_show_list, pages_read_engagement, instagram_basic, instagram_manage_insights, ads_read, public_profile.

No último snapshot relevante da 003B, permanecia ACTIVE porque o fluxo de desconexão parava no classifier antes da primitive de revogação.

Não assumir estado atual dessa conexão sem consultar Supabase se a trilha Meta for retomada.

## 6. O que NÃO repetir

- não tratar `BizzManiq1` como portfolio bloqueado;
- não criar terceiro portfolio;
- não excluir `Bizzman5po` para tentar liberar slot;
- não usar terceiro como fixture sem decisão do fundador;
- não promover 003B só porque partes de código estão boas;
- não tratar User Token como BISU;
- não usar `client_business_id` de USER como prova de saúde/classificação;
- não fazer o fundador executar comandos se o agente pode executar após aprovação, salvo quando a própria camada de segurança exigir ação manual;
- não interromper desenvolvimento independente por causa do gate Meta;
- não começar `/proxima` sem novo mandato;
- não renomear repo, pasta local, Supabase ref ou recursos Meta apenas por branding;
- não reescrever migrations já aplicadas;
- não reescrever histórico antigo apenas para trocar marca.

## 7. Método/governança vigente

- GPT = planejador, arquiteto e auditor;
- Claude Code = executor;
- `estado.md` = fonte operacional;
- `main + estado.md + promoção real` = estado incorporado;
- relatório Claude é índice de evidência, não aprovação;
- risco/prova por delta e raio de impacto;
- founder não é barramento entre GPT e Claude;
- manual externo é conduzido pelo GPT em linguagem simples;
- uma ação manual principal por vez;
- antes de rodada com impacto de produto/experiência, GPT deve ler integralmente `GROWTH_INTELLIGENCE_CANONICAL.md`;
- mídia paga é regida adicionalmente por `PAID_MEDIA_CANONICAL.md`;
- Leads/Hoje/Notificações/jornada comercial exigem `LEAD_NURTURING_CANONICAL.md`.

## 8. Próximo ponto exato de retomada

**Não existe rodada Claude autorizada.**

O novo GPT deve primeiro executar o bootstrap reforçado de transferência e apresentar `COMPROVAÇÃO DE CONTINUIDADE`.

Depois deve decidir qual é a próxima capacidade substantiva independente da Meta, usando `estado.md`, roadmap e canônicos atuais.

Direções possíveis existem, mas nenhuma está autorizada por este handoff. Não transformar sugestão em mandato automaticamente.

A trilha Meta deve permanecer estacionada até nova decisão arquitetural/operacional específica.

## 9. Status formal na transferência

- 004A: executada, auditada, aprovada e promovida;
- 004B: executada, corrigida, auditada, aprovada e promovida;
- 003B: executada parcialmente/iterada, auditada em partes, **não promovida e estacionada**;
- nova rodada: **não planejada nem autorizada**;
- próximo ator: **novo GPT**;
- fundador: não precisa realizar nenhuma ação manual antes da transferência.
