# IMPLEMENTATION ROADMAP — Tráfego Pago MVP

Status: canônico como ordem de construção. Pode ser refinado por rodadas, mas não deve ser pulado sem decisão documentada.

## Regra de interpretação

As fases descrevem **dependências e capacidades**, não um funil obrigatório que todo cliente percorre na mesma ordem. Uma capacidade construída na Fase N não implica que todo negócio a use: mídia paga, Lead Ads e desfecho comercial são ramos, não etapas universais (`docs/01-produto/GROWTH_INTELLIGENCE_CANONICAL.md`).

Antes de iniciar cada fase que toque Meta, produto ou experiência, revalidar:

1. aderência ao `GROWTH_INTELLIGENCE_CANONICAL.md`, lido integralmente;
2. documentação externa vigente (Meta/Instagram/Supabase mudam com frequência);
3. se a fase ainda faz sentido na ordem prevista, dado o que já foi aprendido.

Reordenação ampla exige decisão documentada; ajuste de escopo dentro de uma fase, não.

## Fase 0 — Bootstrap técnico

Objetivo: repositório executável e verificável, sem antecipar domínio.

Entregas:

- Next.js + TypeScript;
- estrutura modular inicial;
- lint/typecheck/test/build;
- env conventions;
- integração Supabase básica sem schema de negócio;
- CI mínima;
- README operacional.

Gate: build limpo + smoke test + nenhum secret versionado.

## Fase 1 — Fundação Supabase, Auth e Tenancy

**Status: ENCERRADA E PROMOVIDA em 2026-08-23 após a Rodada 001F.**

Entregas:

- projeto Supabase conectado;
- migrations iniciais;
- `organizations`;
- `organization_members`;
- `business_profiles`;
- auth por e-mail/senha com confirmação e recuperação de acesso;
- RLS;
- provas de isolamento.

Gate concluído: usuário A não lê/escreve org B por browser/Data API; papel/tenancy provados; recuperação de acesso funciona por e-mail real.

Gestão avançada de membros — convites, troca de papel, transferência de ownership, multi-org switcher — não bloqueou o fechamento e continua em fases posteriores.

Rodadas incorporadas no fechamento: 000, 001A, 001B, 001C, 001D, 001E e 001F.

## Fase 2 — Operations, Audit, Queues e Segurança Base

**Não autorizada automaticamente pelo fechamento da Fase 1.** Exige mandato próprio.

Entregas:

- `operations`;
- `webhook_events`;
- `audit_events`;
- fila(s) base;
- worker contract;
- retry taxonomy;
- correlation ids;
- env/secrets strategy;
- observabilidade mínima.

Gate: job duplicado/idempotente provado em fixture interna.

## Fase 3 — Meta Connection Foundation

Antes de codar, revalidar documentação Meta vigente.

Entregas:

- Meta app/configuração de desenvolvimento;
- API version centralizada;
- OAuth/Business authorization conforme fluxo vigente;
- `meta_connections`;
- seleção de Instagram/ad account;
- health/status;
- connect/disconnect;
- nenhuma credencial exposta.

Gate: conectar e desconectar conta de teste, token não aparece no browser/log.

## Fase 4 — Instagram Content Read

Entregas:

- importar mídia;
- paginação;
- upsert idempotente;
- snapshots de métricas;
- Metric Normalizer versionado;
- sync incremental;
- UI Conteúdo inicial.

Gate: re-sync não duplica conteúdo; métrica desconhecida não corrompe sync.

## Fase 5 — Instagram Publishing

Entregas:

- upload/storage;
- draft/schedule/publish;
- state machine;
- operation idempotente;
- erro/retry/reconciliação.

Gate: timeout/retry não cria publicação duplicada quando a plataforma permitir reconciliar.

## Fase 6 — AI Foundation

Entregas:

- providers/models/prices;
- AI Router;
- task schemas;
- ai_runs;
- Tier 0–3 policy;
- primeiro provider adapter;
- fallback/eval mínima.

Gate: feature chama Router, custo é registrado, model switch não exige alterar feature.

## Fase 7 — Content Intelligence e Oportunidades

Entregas:

- content feature extraction;
- filtros determinísticos;
- recommendation artifacts;
- evidências/confidence/limitations;
- tela Oportunidades.

Gate: recomendação é reproduzível/auditável e não inventa métrica ausente.

## Fase 8 — Financial Approval Foundation

Entregas:

- approvals;
- roles financeiros;
- snapshot de orçamento;
- expiry/revoke/consume;
- command validation.

Gate: nenhuma mutation de Ads pode ser chamada sem approval válido em testes.

## Fase 9 — Meta Ads Foundation

Entregas:

- Advertising Gateway;
- campaigns/ad sets/ads/creatives;
- criação em conta de teste;
- operations idempotentes;
- reconciliation;
- pause/status sync.

Gate: timeout/retry não duplica operação onerosa; divergência externa é detectável.

## Fase 10 — Experiments

Entregas:

- experiments/variants;
- integração com mecanismo oficial de teste quando aplicável;
- métricas;
- Winner Engine determinístico;
- interpretação por IA;
- UI Experimentos.

Gate: `NOT_ENOUGH_DATA`, `NO_CLEAR_WINNER` e `WINNER` provados; LLM não decide matemática.

## Fase 11 — Scale

Entregas:

- scale recommendation;
- nova approval;
- scale command;
- Ads operation;
- auditoria.

Gate: alteração de orçamento acima do aprovado é bloqueada server-side.

## Fase 12 — Lead Ads e Micro-CRM

Entregas:

- webhook Lead Ads;
- verification/signature vigente;
- inbox/dedupe;
- lead fetch;
- `leads`/`lead_events`;
- pipeline;
- linhagem anúncio→lead.

Gate: webhook duplicado cria um lead; duas orgs isoladas; PII não vaza em logs.

## Fase 13 — Conversões

Entregas:

- WON/LOST;
- `conversions`;
- valores;
- conversion sync Meta quando configurado;
- distinção de atribuição.

Gate: entrega à Meta não é apresentada como atribuição confirmada sem evidência.

## Fase 14 — Surveys

Entregas:

- templates WON/LOST;
- request/token;
- formulário público seguro;
- respostas;
- classificação por IA;
- motivos estruturados.

Gate: token não expõe lead; resposta original preservada; classificação não sobrescreve fonte.

## Fase 15 — Strategic Insights

Entregas:

- cruzamento de conteúdo, Ads, leads, conversões e surveys;
- `observation/interpretation/hypothesis/recommended_test`;
- evidence refs;
- tela Insights.

Gate: toda afirmação relevante aponta para evidência disponível e limitações.

## Fase 16 — Hoje, Notificações e UX de operação

Entregas:

- painel orientado a ação;
- approvals pendentes;
- erros de integração;
- experimentos concluídos;
- leads prioritários;
- insights recentes;
- notificações in-app e e-mail mínimo.

Gate: ações críticas alcançáveis sem navegar por relatórios complexos.

## Fase 17 — Hardening comercial

Entregas:

- App Review/Business Verification/processos Meta aplicáveis;
- políticas de privacidade/termos/exclusão;
- SMTP de produção;
- backups;
- staging/prod;
- rate limits internos;
- security review;
- dependency/secret scanning;
- e2e real controlado;
- custos e limites de IA;
- suporte/observabilidade.

Gate: checklist de `TECHNICAL_SPEC.md` e `SECURITY_MODEL.md` aprovado antes do primeiro cliente pagante.

## Princípio das rodadas

Cada fase pode ser dividida em sub-rodadas pequenas. O roadmap define ordem de dependências, não autoriza implementação automática.
