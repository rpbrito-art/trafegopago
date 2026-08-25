# RODADA 004A — AI FOUNDATION CORE

Status: **PLANEJADA E AUTORIZADA PELO FUNDADOR; NÃO EXECUTAR ATÉ `estado.md` APONTAR PARA ESTA RODADA**

Roadmap: **Fase 6 — AI Foundation, antecipada por decisão documentada**.

Decisão de precedência:

`rodadas/gpt/DECISAO_DESBLOQUEIO_DESENVOLVIMENTO_META_GATE.md`

## 1. Objetivo

Construir a fundação interna e auditável de IA do Tráfego Pago sem depender da Meta e **sem criar ainda qualquer chamada paga ou segredo de provedor externo**.

Esta rodada deve entregar:

`AI Task → Router → seleção de modelo/policy → adapter abstrato → structured output → usage/custo → ai_run`

A rodada é a primeira subparte da Fase 6. Um provider real, fallback entre providers/modelos e eval contra API real entram em sub-rodada posterior, após pesquisa atual de custo, qualidade e capacidades.

## 2. Por que esta rodada pode ocorrer antes das Fases 4/5

A 003B continua com gate externo Meta pendente. Entretanto AI Router, catálogo de modelos/preços, ledger de custo, schemas e isolamento de providers são infraestrutura transversal e não dependem de conteúdo Instagram real.

Esta antecipação:

- não promove 003B;
- não satisfaz gate BISU;
- não cria/importa/publica conteúdo Meta;
- não cria Ads;
- não usa dados falsos como se fossem Meta reais.

## 3. Base e branch

Quando `estado.md` liberar a execução:

1. terminar/preflight da atividade vigente;
2. `git fetch`;
3. partir da **`main` atual**, nunca da branch não promovida da 003B;
4. criar branch:

`claude/rodada-004a-ai-foundation-core`

A razão é simples: 004A é independente da 003B e não pode carregar código Meta ainda não promovido apenas por conveniência de branch.

## 4. READ SET

### Obrigatório

1. `estado.md`;
2. este mandato;
3. `docs/03-canonical/AI_ARCHITECTURE.md` — integral;
4. `docs/03-canonical/DATA_MODEL.md` — §§1, 12, 16–18;
5. `docs/03-canonical/TECHNICAL_SPEC.md` — §§2–5, 26–30;
6. `docs/03-canonical/SECURITY_MODEL.md` — §§2–6, 10, 13–15, 18–20, 23–25;
7. `supabase/migrations/20260823160000_create_operations_and_audit_events.sql` — usar como padrão de tabelas internas server-only/grants/RLS, não copiar mecanicamente.

### Sob demanda

- migrations de tenancy/default privileges se uma decisão de grant/RLS exigir comparação;
- utilitários Supabase server-side existentes;
- testes de isolamento anteriores para reaproveitar padrão de prova.

Não reler histórico Meta antigo para esta rodada: ele não é dependência do delta.

## 5. Arquitetura obrigatória

### 5.1 Regra fundamental

`Regra/cálculo primeiro; IA depois.`

Tier 0 não chama provider. Esta rodada constrói infraestrutura para Tiers 1–3.

Nenhuma feature pode conhecer SDK, endpoint ou nome de modelo de provider.

### 5.2 Fronteira server-only

Todo runtime produtivo de IA deve ser `server-only`.

Proibido:

- segredo em browser;
- `NEXT_PUBLIC_*` para provider;
- token/chave em banco de domínio;
- input/output bruto com PII no ledger por padrão;
- chamada externa direta a partir de componente/UI.

### 5.3 Contrato de AI Task

Criar contrato tipado equivalente a:

```ts
AI Task
- taskType
- taskVersion
- organizationId opcional somente quando a tarefa for legitimamente global
- input tipado
- output schema Zod
- requiredCapabilities
- allowedTiers (somente 1|2|3)
- qualityRequirement
- latencyClass
- promptVersion
- schemaVersion
- correlationId opcional
```

O formato exato TypeScript pode ser refinado pelo executor, mas estes campos/semânticas devem existir.

O Router recebe uma **task**, não `provider/model` escolhido pela feature.

### 5.4 Task definitions

A política de uma task deve ficar em registro server-side versionado, não espalhada em componentes.

Para a 004A é suficiente uma task de fixture/teste para provar o contrato. Não criar ainda uma “feature de IA” artificial apenas para consumir o Router.

### 5.5 Provider adapter

Definir interface comum de adapter que retorne pelo menos:

- output desconhecido antes da validação;
- usage de input/output/cached tokens quando disponível;
- latência/metadata técnica segura necessária;
- erro normalizado.

Nesta rodada:

- implementar **fake/deterministic adapter apenas para testes/injeção**;
- não cadastrar fake como provider de produção;
- não fazer chamada de rede;
- não adicionar API key;
- não instalar SDK de IA.

### 5.6 Router

O Router deve:

1. resolver definição/versionamento da task;
2. buscar candidatos de modelo ativos;
3. filtrar por tiers permitidos e capabilities exigidas;
4. ignorar `DEPRECATED`/`DISABLED` para novas execuções;
5. resolver uma versão de preço vigente e não ambígua;
6. invocar adapter registrado somente server-side;
7. validar output com Zod;
8. persistir `ai_run` para sucesso e falha;
9. calcular custo pela versão de preço usada e usage observado;
10. devolver output estruturado somente depois da validação.

Se não houver candidato, preço válido, adapter ou schema válido, falhar de forma explícita e auditável. Não escolher modelo por chute.

Fallback real entre modelos/providers fica para 004B; 004A apenas preserva no modelo o vínculo `fallback_from_run_id` e uma interface que permita a extensão sem refazer features.

## 6. Schema SQL obrigatório

Criar migration nova. Não reescrever migrations antigas.

### 6.1 `ai_providers`

Global/interna, server-only:

- `id uuid`;
- `key text unique`;
- `name text`;
- `status` fechado: `ACTIVE|DEGRADED|DISABLED`;
- `config_metadata jsonb` sem segredo;
- timestamps.

### 6.2 `ai_models`

Global/interna, server-only:

- `id uuid`;
- `provider_id` FK;
- `model_key text`;
- `tier smallint` em `1..3`;
- `capability_tags text[]`;
- `status`: `ACTIVE|DEGRADED|DEPRECATED|DISABLED`;
- `supports_structured_output boolean`;
- `context_window_tokens bigint nullable`;
- `max_output_tokens bigint nullable`;
- metadata técnica não secreta opcional;
- `effective_from/effective_to` quando útil;
- timestamps;
- unique apropriado para provider/model_key.

Não armazenar segredo/configuração sensível aqui.

### 6.3 `ai_price_versions`

Histórico reproduzível, server-only:

- `id uuid`;
- `ai_model_id` FK;
- preço de input por 1.000.000 tokens em `numeric` com precisão suficiente para subcentavos;
- preço de output por 1.000.000 tokens;
- preço de cached input nullable;
- `currency` ISO 4217;
- `effective_from`;
- `effective_to nullable`;
- `source_note` sem segredo;
- timestamps.

Regras:

- preços não negativos;
- `effective_to > effective_from` quando presente;
- no máximo uma versão aberta (`effective_to is null`) por modelo;
- seleção runtime deve falhar se houver ambiguidade de versão vigente.

Não inserir preços reais nesta rodada.

### 6.4 `ai_runs`

Ledger interno server-only:

- `id uuid`;
- `organization_id nullable` FK;
- `correlation_id uuid`;
- `task_type`;
- `task_version`;
- `provider_id`;
- `ai_model_id`;
- `tier`;
- `input_tokens bigint`;
- `output_tokens bigint`;
- `cached_tokens bigint nullable`;
- custo calculado em `numeric` com precisão suficiente para chamadas subcentavo;
- `currency`;
- `latency_ms`;
- `status`: pelo menos `STARTED|SUCCEEDED|FAILED`;
- `confidence nullable` entre 0 e 1 quando legitimamente disponível;
- `fallback_from_run_id nullable`;
- `prompt_version`;
- `schema_version`;
- `error_class nullable` normalizada;
- timestamps de início/conclusão adequados.

Não persistir por padrão:

- prompt completo;
- input completo;
- output completo;
- PII;
- segredo.

Se `fallback_from_run_id` for implementado com organização nullable, impedir vínculo cross-tenant para runs tenant-scoped. Run global não deve usar fallback nesta sub-rodada se não houver constraint segura.

### 6.5 Grants/RLS

As quatro tabelas são infraestrutura interna nesta rodada.

Obrigatório:

- RLS habilitado;
- `anon` e `authenticated`: sem acesso direto;
- `service_role`: apenas privilégios necessários;
- `ai_runs`: sem DELETE no caminho normal;
- históricos de preço não devem ser sobrescritos para simular mudança de preço.

Não criar UI administrativa nesta rodada.

## 7. Repositório e serviços TypeScript

Criar módulo coeso em `src/lib/ai/` (nomes internos podem ser refinados):

- contracts/task types;
- task registry/definitions;
- provider adapter contract;
- model/catalog repository;
- run ledger repository;
- router;
- pricing/cost calculator;
- error taxonomy;
- fake adapter em teste/support, não provider produtivo.

Não adicionar dependência externa se Zod + código atual forem suficientes.

## 8. Cálculo de custo

O custo deve ser reproduzível a partir de:

- usage observado;
- preço da versão escolhida;
- moeda;
- regra explícita para cached tokens.

Usar aritmética decimal segura; não depender de `number` de ponto flutuante para persistir valor financeiro quando isso puder introduzir erro.

Se a implementação precisar de biblioteca decimal nova, parar e devolver decisão ao GPT antes de adicionar dependência. Preferir cálculo inteiro/racional ou conversão textual segura com primitives existentes quando viável.

## 9. Segurança / prompt injection

Mesmo sem provider real, os contratos devem nascer com estas invariantes:

- conteúdo do cliente é dado não confiável;
- output é `unknown` até passar no schema;
- Router não recebe ferramenta financeira;
- AI Task não pode carregar token Meta, service role ou segredo;
- logs não imprimem input/output bruto por padrão;
- erro de provider é normalizado e sanitizado.

Não criar tool calling nesta rodada.

## 10. Provas automatizadas mínimas

Cobrir pelo menos:

1. Tier 0 não entra no Router de LLM;
2. feature/task não escolhe provider/model diretamente;
3. candidato `ACTIVE` compatível é selecionado;
4. `DEPRECATED`/`DISABLED` não recebe nova task;
5. capability ausente falha sem chamar adapter;
6. preço ausente ou ambíguo falha fechado;
7. output válido passa no Zod e gera `ai_run SUCCEEDED`;
8. output inválido falha e gera `ai_run FAILED`;
9. erro do adapter gera ledger de falha sanitizado;
10. usage conhecido produz custo determinístico correto, inclusive subcentavo;
11. `prompt_version` e `schema_version` ficam no run;
12. nenhum input/output bruto é persistido no ledger;
13. vínculo fallback tenant-scoped não permite cruzar organização;
14. ausência de adapter produtivo não cai silenciosamente em fake;
15. nenhum segredo/provider credential é necessário para rodar a suíte.

## 11. Prova SQL remota

Após checkpoint e autorização normal de migration conforme processo do projeto, provar no Supabase:

- quatro tabelas e constraints;
- browser sem SELECT/INSERT/UPDATE/DELETE;
- service path funcional;
- preço negativo recusado;
- tier inválido recusado;
- status inválido recusado;
- tokens/custo negativos recusados;
- uma única price version aberta por modelo;
- run tenant A não é criado referenciando organização/relação tenant B quando houver relação tenant-scoped;
- rollback da fixture de prova deixa zero lixo de teste.

Não inserir catálogo real de provider/modelo/preço nesta rodada.

## 12. CI

Obrigatório:

- testes;
- lint;
- typecheck;
- Edge Functions typecheck já existente;
- build;
- nenhum secret novo.

## 13. Fora de escopo

- provider real;
- API key;
- chamada paga;
- escolha de OpenAI/Anthropic/Google/Kimi/etc.;
- fallback real entre providers;
- eval com modelos reais;
- UI administrativa de modelos/preços;
- content intelligence de produção;
- recomendação de marketing real;
- geração de copy/imagem;
- tool calling;
- embeddings/RAG;
- Meta/Instagram/Ads;
- qualquer gasto.

## 14. Gate da 004A

A rodada passa quando for demonstrado que:

- nenhuma feature precisa conhecer provider/modelo;
- Router seleciona por policy/capability/tier;
- structured output inválido não atravessa a fronteira;
- cada execução de teste produz ledger reproduzível de sucesso/falha/custo;
- segurança server-only e isolamento estão provados;
- trocar o fake adapter/catálogo por adapter real posteriormente não exige reescrever a feature/task.

A 004A **não encerra a Fase 6**. Depois da auditoria, GPT define a 004B para provider real + fallback/eval, com pesquisa atual de mercado/API antes de decidir fornecedor/modelo.

## 15. Entrega Claude

Quando liberada por `estado.md`, Claude deve:

1. executar preflight e criar branch desde `main`;
2. implementar somente este mandato;
3. aplicar migration apenas no gate previsto/autorizado;
4. executar provas locais e remotas;
5. publicar branch/PR;
6. escrever `rodadas/claude/RELATORIO_RODADA_004A_AI_FOUNDATION_CORE.md`;
7. atualizar `estado.md` apenas com fatos de execução e `AGUARDANDO AUDITORIA GPT`;
8. parar.

Não autoaprovar, não promover e não iniciar 004B.
