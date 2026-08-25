# RODADA 004B — QUORON BRANDING + GROWTH CONTEXT FOUNDATION

Status: **PLANEJADA E AUTORIZADA PARA EXECUÇÃO PELO CLAUDE CODE**

Data: 2026-08-25

Base obrigatória: `main` após a promoção da 004A.

Produto canônico: **Quoron**.

## 1. Objetivo

Executar, na mesma rodada substantiva:

1. a primeira migração controlada da marca `Tráfego Pago` → **Quoron** nas superfícies ativas do produto e documentação vigente; e
2. a primeira camada estruturada do fluxo canônico:

`contexto do negócio → objetivo → jornada desejada → evento de sucesso`

A rodada deve tornar o onboarding mais progressivo, criar um **objetivo atual versionado por organização** e permitir que o usuário responda, em linguagem simples:

- o que quer conseguir agora;
- para onde quer conduzir a pessoa;
- qual ação significa sucesso.

Não depende da Meta e não usa provider real de IA.

## 2. Fundamento de produto

O `GROWTH_INTELLIGENCE_CANONICAL.md` determina:

- complexidade pertence ao sistema, não ao usuário;
- onboarding deve ser progressivo;
- `business_profile` é primeira camada de contexto, não tabela universal;
- objetivo, jornada e evento de sucesso orientam conteúdo, mídia, mensuração e recomendações;
- resultado desejado e resultado observável são conceitos diferentes;
- o usuário não deve desenhar a arquitetura de marketing sozinho.

A mídia paga continua central conforme `PAID_MEDIA_CANONICAL.md`, mas nenhum gasto ou campanha entra nesta rodada.

## 3. READ SET

### OBRIGATÓRIO

Além de `CLAUDE.md`, `estado.md` e este mandato:

1. `docs/01-produto/GROWTH_INTELLIGENCE_CANONICAL.md` §§1–4, 13–17 e 19;
2. `docs/01-produto/PAID_MEDIA_CANONICAL.md` §§2–7;
3. `supabase/migrations/20260823111051_create_business_profiles_and_bootstrap.sql`;
4. `src/lib/business/schemas.ts` + `src/app/actions/business.ts` + `src/lib/business/account.ts` como um conjunto funcional;
5. `rodadas/gpt/DECISAO_NOME_PRODUTO_QUORON.md`.

### SOB DEMANDA

- `src/components/business/create-business-form.tsx`;
- `src/components/business/business-section.tsx`;
- `src/app/conta/page.tsx`;
- `docs/03-canonical/DATA_MODEL.md` §1–2;
- documentos ativos encontrados durante o passe de branding.

Não reler histórico de rodadas antigas por ritual.

## 4. Branding Quoron — executar agora

### 4.1 Runtime

A marca visível ao usuário deve passar a ser **Quoron**.

Obrigatório:

- metadata/título raiz;
- metadata de páginas que ainda usam `Tráfego Pago` como marca;
- Home;
- textos visíveis de autenticação/conta que nomeiem o produto;
- constante canônica de nome da aplicação, preferencialmente em módulo simples compartilhado se houver mais de um consumidor;
- `package.json` e lockfile: nome do pacote privado `quoron`, se a alteração não quebrar tooling.

A Home não pode continuar exibindo texto técnico obsoleto como `Rodada 001B — Auth real` ou afirmar que não existem funcionalidades de domínio.

A Home deve comunicar em linguagem simples a missão atual do Quoron, sem prometer capacidades ainda não construídas como se estivessem disponíveis.

### 4.2 Documentação ativa

Harmonizar marca atual para **Quoron** em:

- `README.md`;
- `.gpt/PROJECT_PROMPT.md` onde nomeia o produto atual;
- `CLAUDE.md` onde nomeia o produto atual;
- documentos canônicos/ativos em que `Tráfego Pago` aparece como **nome atual do produto**.

Não fazer busca/substituição cega em:

- rodadas antigas;
- relatórios Claude antigos;
- auditorias históricas;
- migrations antigas;
- commits/hashes;
- nomes de repo/pasta;
- ids/nomes externos Meta;
- trechos que deliberadamente descrevem o nome histórico.

`rpbrito-art/trafegopago`, `C:\Users\rpbri\Documents\trafegopago` e o Supabase ref permanecem como identificadores técnicos legados.

## 5. Onboarding progressivo — reduzir carga inicial

O formulário inicial atual pede contexto demais de uma vez e ainda inclui `Objetivo de aquisição` como texto livre focado em marketing pago.

Nesta rodada, o **bootstrap inicial** deve pedir somente contexto essencial suficiente para criar o negócio:

- nome da empresa;
- segmento;
- cidade/região;
- produto, serviço ou oferta principal.

Informações como:

- ticket médio;
- público-alvo presumido;
- diferenciais;
- objeções;
- objetivo de aquisição legado;
- meta comercial;

devem deixar de ser obrigatórias no primeiro formulário e poderão ser completadas progressivamente em etapas futuras.

### 5.1 Compatibilidade com business_profiles

Não substituir `business_profiles` nem criar tabela gigante.

Criar migration aditiva que permita o onboarding reduzido sem destruir dados existentes:

- `target_audience` passa a aceitar `NULL`;
- `acquisition_goal` passa a aceitar `NULL`;
- demais campos já opcionais permanecem opcionais;
- dados existentes não são apagados nem convertidos artificialmente.

Atualizar tipos/leitura/UI para lidar corretamente com `target_audience` e `acquisition_goal` nulos.

O campo `acquisition_goal` existente passa a ser **legado de contexto livre**, não a fonte canônica do objetivo atual. Não migrar texto antigo automaticamente para um objetivo estruturado: isso transformaria texto ambíguo em fato.

### 5.2 Próximo passo após criar o negócio

Depois do bootstrap bem-sucedido, levar o usuário para a definição do **Objetivo atual** em vez de terminar o fluxo apenas na tela de conta.

O usuário deve poder voltar/adiar sem perder o negócio criado; a ausência de objetivo é estado válido, porém deve orientar claramente o próximo passo.

## 6. Nova entidade — growth_objectives

Criar entidade própria, sem inflar `business_profiles`.

Nome canônico sugerido:

`public.growth_objectives`

### 6.1 Campos mínimos

- `id uuid` PK;
- `organization_id uuid not null` FK `organizations` com cascade de tenant;
- `status text not null` — `ACTIVE | ARCHIVED`;
- `objective_type text not null`;
- `objective_detail text null`;
- `destination_type text not null`;
- `success_event_type text not null`;
- `success_event_detail text null`;
- `created_by uuid null` FK `auth.users` `on delete set null`;
- `created_at timestamptz not null`;
- `archived_at timestamptz null`.

### 6.2 Taxonomias iniciais

`objective_type`:

- `SALES` — vender mais;
- `LEADS` — gerar interessados/contatos;
- `CONVERSATIONS` — iniciar conversas;
- `BOOKINGS` — gerar agendamentos;
- `REGISTRATIONS` — gerar cadastros;
- `STORE_VISITS` — levar pessoas ao ponto físico;
- `AUDIENCE` — crescer audiência/relacionamento;
- `OTHER`.

`destination_type`:

- `WHATSAPP`;
- `WEBSITE`;
- `META_FORM`;
- `APP`;
- `PHYSICAL_STORE`;
- `INSTAGRAM_PROFILE`;
- `OTHER`.

`success_event_type`:

- `PURCHASE`;
- `LEAD_CREATED`;
- `CONVERSATION_STARTED`;
- `QUOTE_REQUESTED`;
- `BOOKING_CONFIRMED`;
- `FORM_SUBMITTED`;
- `ACCOUNT_CREATED`;
- `STORE_VISIT`;
- `PROFILE_ACTION`;
- `OTHER`.

A UI deve traduzir tudo para português simples; esses identificadores são internos.

`objective_detail` e `success_event_detail` servem para contexto adicional/`OTHER`; limitar tamanho e recusar string vazia.

### 6.3 Histórico e unicidade

- no máximo **um `ACTIVE` por organização** via índice único parcial;
- alterar o objetivo cria uma nova versão ativa e arquiva a anterior;
- histórico anterior não é apagado;
- `ARCHIVED` exige `archived_at`;
- `ACTIVE` exige `archived_at IS NULL`.

Não usar DELETE no fluxo normal.

## 7. Escrita segura do objetivo

Browser não grava diretamente `growth_objectives`.

Criar primitive/RPC server-side versionada, por exemplo `set_active_growth_objective`, com:

- execução restrita a `service_role`;
- `p_user_id` vindo da identidade server-side, nunca do formulário;
- organização deve estar `ACTIVE`;
- usuário deve ter membership `ACTIVE` como `owner` ou `admin` para alterar objetivo;
- serialização por organização para impedir duas versões ativas concorrentes;
- arquivar objetivo ativo anterior e inserir novo dentro da mesma transação;
- reenvio **idêntico** deve ser idempotente: retornar o objetivo ativo existente em vez de criar nova versão;
- tentativa cross-tenant deve falhar;
- nenhum papel/status/organization arbitrário vindo do browser pode furar a autorização.

### 7.1 Leitura

Leitura pelo usuário deve ocorrer sob RLS:

- membro `ACTIVE` da organização `ACTIVE` pode ler os objetivos da própria organização;
- não lê outra organização;
- browser sem membership não lê;
- nenhuma policy de INSERT/UPDATE/DELETE para browser.

## 8. Experiência — Objetivo atual

Criar uma superfície simples, preferencialmente rota protegida dedicada como `/objetivo` e um resumo/CTA em `/conta`.

### 8.1 Fluxo da tela

A linguagem deve responder a três perguntas, sem termos de Ads Manager:

1. **O que você quer conseguir agora?**
2. **Para onde você quer levar a pessoa?**
3. **Qual ação significa sucesso?**

Usar escolhas curtas derivadas das taxonomias do §6, com opção `Outro` quando necessária.

O formulário não deve expor:

- campaign objective da Meta;
- pixel/event id;
- ad set;
- placement;
- token/id externo;
- terminologia de API.

### 8.2 Estado sem objetivo

Mostrar uma ação principal clara, por exemplo:

**Definir meu objetivo**

Explicação curta: isso orientará recomendações, conteúdo, mensuração e futuros testes.

Não bloquear acesso à conta nem à conexão por ausência de objetivo.

### 8.3 Estado com objetivo

Mostrar em linguagem humana:

- objetivo atual;
- destino/jornada;
- o que conta como sucesso;
- quando foi definido;
- ação **Alterar objetivo**.

Não mostrar UUIDs ou taxonomias internas.

### 8.4 Alteração

Alterar objetivo cria nova versão e preserva histórico. A UI padrão pode mostrar apenas o atual; histórico detalhado pode ficar para fase posterior.

## 9. Resultado desejado ≠ observabilidade

Esta rodada registra **o que o negócio considera sucesso**, não afirma que o Quoron já consegue medir esse sucesso.

Não adicionar `measurable=true` por inferência.

Enquanto conectores/eventos não provarem observabilidade, a UI pode usar formulação simples como:

> “Este é o resultado que você quer alcançar. O Quoron indicará até onde consegue medi-lo conforme suas conexões forem configuradas.”

Não afirmar conversão, atribuição ou mensuração disponível sem evidência.

## 10. Dívida 004A de índices — absorver nesta migration

Como esta rodada já toca schema, quitar os INFO de performance registrados na auditoria final da 004A com índices de cobertura adequados, após conferir os índices existentes:

- FK `ai_runs_fallback_same_organization`;
- FK `ai_runs_model_belongs_to_provider`;
- FK `ai_runs_price_belongs_to_model`;
- FK simples `ai_runs_provider_id_fkey`.

Não remover índices existentes apenas porque o advisor diz `unused_index` em tabelas recém-criadas/vazias.

Não transformar outros débitos antigos Meta em escopo desta rodada.

## 11. Testes mínimos

### 11.1 Onboarding

- novo bootstrap funciona com apenas os quatro campos essenciais;
- campos progressivos ausentes persistem `NULL`, não string vazia inventada;
- dados existentes continuam legíveis;
- dupla submissão continua protegida;
- identidade/papel/tenant continuam não vindo do browser;
- após sucesso, próximo passo é objetivo.

### 11.2 growth_objectives

Provar:

1. owner ACTIVE cria objetivo;
2. admin ACTIVE cria/altera objetivo;
3. member comum não altera;
4. usuário de outra organização não altera;
5. organização inativa não altera;
6. uma organização nunca fica com dois ACTIVE;
7. alteração arquiva anterior e cria nova versão;
8. reenvio idêntico é idempotente;
9. `ARCHIVED` sem `archived_at` é recusado;
10. `ACTIVE` com `archived_at` é recusado;
11. taxonomias desconhecidas são recusadas;
12. `OTHER`/detalhes seguem validação definida;
13. membro ACTIVE lê apenas própria organização via RLS;
14. browser não INSERT/UPDATE/DELETE;
15. cross-tenant não vaza histórico;
16. ausência de objetivo é estado de produto válido.

### 11.3 UI/branding

- nenhuma superfície ativa nova mostra `Tráfego Pago` como nome atual do produto;
- Home mostra Quoron e não contém status técnico de rodada;
- metadata raiz e conta usam Quoron;
- objetivo atual é apresentado em português, sem enum/UUID;
- estado vazio oferece CTA claro;
- mudança de objetivo preserva fluxo acessível.

Não testar documentos históricos por string global: eles podem legitimamente conter o nome antigo.

## 12. Prova remota e CI

Criar prova SQL transacional versionada para o novo schema e índices.

Antes de aplicar:

- validar migration localmente conforme processo vigente.

Depois:

- `supabase db push --linked`;
- provar RLS/grants/constraints/idempotência/tenant;
- provar que fixtures são removidas por rollback/cleanup;
- conferir advisors de security/performance;
- confirmar que os quatro INFO de FKs da 004A foram resolvidos ou justificar tecnicamente qualquer remanescente.

Se o classificador exigir autorização humana para `db push`/prova mutável, parar no gate e pedir ao fundador apenas a autorização necessária; não contornar.

CI final deve passar:

- lint;
- typecheck;
- typecheck Edge Functions;
- testes;
- build.

## 13. Branch e entrega

Criar branch:

`claude/rodada-004b-quoron-growth-context`

a partir da `main` atual.

Relatório:

`rodadas/claude/RELATORIO_RODADA_004B_QUORON_GROWTH_CONTEXT.md`

O relatório deve ser índice de evidências, não reprodução de logs.

Parar em:

**AGUARDANDO AUDITORIA GPT**

## 14. Fora de escopo

- renomear repositório GitHub;
- renomear pasta local;
- recriar/renomear project ref do Supabase;
- alterar qualquer recurso Meta por branding;
- tocar no defeito de classifier 003B;
- promover 003B;
- importação/publicação real Instagram;
- provider real de IA;
- API key/SDK/chamada paga;
- IA inferir objetivo do usuário;
- personas automáticas;
- geração de conteúdo;
- recomendações inteligentes;
- campanha/anúncio/gasto;
- Financial Approval;
- CRM/leads;
- App Shell/Hoje definitivo.

## 15. Critério de saída

A 004B volta para auditoria quando:

- marca Quoron está consolidada nas superfícies ativas previstas;
- onboarding inicial está reduzido ao essencial;
- `growth_objectives` existe com histórico e uma única versão ativa;
- definição/alteração de objetivo funciona pelo caminho server-side autorizado;
- objetivo/destino/sucesso aparecem em linguagem de negócio;
- nenhum dado é inventado como mensurável;
- índices de performance da 004A foram tratados;
- migration/prova remota estão verdes;
- CI está verde;
- nenhum provider real, ação Meta ou gasto foi introduzido.