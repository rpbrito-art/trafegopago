# CURRENT STATE — Tráfego Pago

Atualizado: 2026-08-22

## 1. Estado geral

Projeto em **fundação documental concluída para a Etapa 3**, ainda sem código de aplicação e sem schema Supabase aplicado.

O repositório foi criado vazio e recebeu a primeira base canônica de produto, arquitetura, segurança, dados, integrações e IA.

## 2. Etapas concluídas

### Etapa 1 — definição inicial do MVP

Concluída em conversa de planejamento. Definiu o ciclo de produto, público, fluxo, gates financeiros, micro-CRM, pesquisas e IA em cascata.

### Etapa 2A — pesquisa técnica

Concluída. Investigou Instagram/Meta APIs, Marketing API, Lead Ads, tracking/conversões, Supabase, segurança, processamento assíncrono, IA e experimentação.

### Etapa 2B — revisão adversarial

Concluída. Procurou brechas, versões antigas, métricas depreciadas, riscos de idempotência, tenancy, webhooks, custos de IA e dependência indevida de fornecedores.

### Etapa 3 — consolidação canônica

Concluída documentalmente em 2026-08-22. Foram criados:

- `README.md`;
- `docs/00-governanca/PROJECT_CHARTER.md`;
- `docs/01-produto/MVP_CANONICAL.md`;
- `docs/02-research/RESEARCH_SYNTHESIS.md`;
- `docs/03-canonical/TECHNICAL_SPEC.md`;
- `docs/03-canonical/DATA_MODEL.md`;
- `docs/03-canonical/API_CONTRACTS.md`;
- `docs/03-canonical/SECURITY_MODEL.md`;
- `docs/03-canonical/AI_ARCHITECTURE.md`;
- `.gpt/PROJECT_PROMPT.md`;
- `.gpt/CURRENT_STATE.md`.

## 3. Decisões vigentes

- MVP: Instagram + Meta Ads + geração de leads.
- Aplicação prevista: Next.js + TypeScript.
- Backend previsto: Supabase.
- Multi-tenancy por `organization_id` desde o primeiro schema.
- RLS obrigatório.
- Processamento assíncrono previsto com Supabase Queues/Cron/workers.
- n8n/Make não serão usados inicialmente, salvo necessidade demonstrada.
- Conexão Meta por autorização oficial; nenhuma senha Meta armazenada.
- Métricas externas passam por normalização versionada.
- Gasto exige aprovação humana persistida.
- IA não pode executar gasto diretamente.
- AI Router multi-provedor é requisito fundacional.
- Cálculos determinísticos ficam fora da LLM.
- Custos de IA registrados por execução.
- Lead Ads/formulário é a principal rota de lead no MVP.
- Interações orgânicas são sinais, não leads por padrão.
- Pesquisas pós-WON/LOST começam por formulário/link próprio.

## 4. O que NÃO existe ainda

- aplicação Next.js;
- package.json/stack inicial;
- projeto Supabase associado;
- migrations;
- RLS implementada;
- ambiente dev/staging/prod;
- app Meta configurado;
- OAuth real;
- credenciais/tokens;
- workers/queues;
- integração de IA;
- testes;
- CI/CD;
- deploy.

Nenhum novo chat deve presumir esses elementos.

## 5. Próxima rodada recomendada

**Fase de Bootstrap Técnico**.

Objetivo: criar a base executável sem implementar ainda a integração Meta completa.

Deve incluir, em rodada controlada:

1. inicializar Next.js + TypeScript;
2. estrutura de pastas/módulos coerente com `TECHNICAL_SPEC.md`;
3. configurar tooling mínimo (lint/typecheck/test);
4. preparar cliente Supabase sem secrets inseguros;
5. definir convenções de env;
6. criar CI básica;
7. criar teste smoke/build;
8. não criar schema final antes da rodada específica de modelo de dados.

Depois: **Fundação Supabase/Tenancy/Auth** com migrations, RLS e provas de isolamento.

## 6. Gates antes de Meta

Não iniciar OAuth/Marketing API antes de:

- auth local/Supabase funcional;
- organization/membership implementados;
- RLS provada;
- camada de operations/jobs definida;
- strategy de secrets definida;
- ambientes/configuração de API version definidos.

## 7. Observação sobre versões externas

A pesquisa de 2026-08-22 identificou Graph/Marketing API v26.0 como recém-lançada. Isso não é uma instrução eterna. Antes de codificar a integração Meta, consultar documentação oficial vigente e atualizar os contratos se necessário.

## 8. Regra de continuidade

Antes de planejar a próxima fase, ler `.gpt/PROJECT_PROMPT.md`, este arquivo e os documentos canônicos relevantes. Não executar migrations, alterar infraestrutura ou iniciar integração externa sem plano e gate correspondentes.
