# TECHNICAL SPEC — Quoron MVP

Status: canônico.

## 1. Objetivo técnico

Construir um SaaS multi-tenant, seguro e auditável para Instagram + Meta Ads, capaz de operar conteúdo, experimentos, campanhas, leads, conversões e inteligência estratégica sem depender de n8n/Make no núcleo.

## 2. Arquitetura de alto nível

```text
Browser
  |
  v
Next.js application
  |
  +--> Supabase Auth
  +--> Supabase Postgres/RLS
  +--> Supabase Storage
  |
  +--> Server-only integration layer
          |
          +--> Meta Auth
          +--> Instagram API
          +--> Marketing API
          +--> Lead Ads/Webhooks
          +--> Conversions API
          +--> AI Router
  |
  +--> Queues / Cron / Workers
```

Princípio: a UI solicita intenções; domínio valida; operações externas são enfileiradas quando não precisam ser síncronas; integrações retornam fatos externos; domínio atualiza estado de forma auditável.

## 3. Fronteiras de módulos

### 3.1 Identity

Responsável por autenticação, sessão e perfil do usuário.

### 3.2 Organizations

Responsável por organizações, memberships, papéis e isolamento tenant.

### 3.3 Business Context

Contexto empresarial usado por regras e IA: público, ticket, objetivos e limites.

`business_profiles` é a **primeira camada** desse contexto, não sua forma final (`GROWTH_INTELLIGENCE_CANONICAL.md` §3.1). O que a empresa oferece vive em `business_offers` + `business_offer_versions`, e o objetivo atual em `growth_objectives`; `business_profiles.primary_offer` permanece como texto legado e não é a fonte canônica da oferta.

O objetivo registra também o **foco atual** — uma oferta específica ou o negócio como um todo. Definir ou trocar o foco arquiva a versão vigente do objetivo e cria a próxima, preservando o histórico.

### 3.3.1 Guided Growth Journey

Fronteira server-only que deriva o **próximo passo** do estado real do negócio: contexto de organização, objetivo, catálogo de ofertas e foco.

A decisão é determinística — Tier 0 de `AI_ARCHITECTURE.md` §3 — e separada da coleta de dados: a função que escolhe o estado é pura e não conhece Supabase. Nenhuma recomendação é persistida nesta camada e nenhum provider de IA participa.

A entrada autenticada padrão é `/inicio`, que apresenta um passo por vez em linguagem de negócio. `/conta` permanece como superfície de conta/configuração. Não é o App Shell definitivo.

### 3.3.2 Declared Context Review

Primeira capacidade do produto apoiada em provider real de IA (Rodada 004E).

Revisa **apenas o contexto declarado** — negócio, ofertas, objetivo e foco — e não afirma nada sobre mercado, público, desempenho ou conteúdo, porque nada disso foi observado ainda.

Fronteiras:

- a chamada só acontece por ação explícita do usuário; nenhuma página chama o provider ao renderizar;
- cache por fingerprint do snapshot canônico + versões de task/prompt/schema;
- limite de 3 chamadas não cacheadas por organização por hora, medido em `ai_runs`;
- todo `evidenceRef` devolvido é validado contra o snapshot enviado — referência inventada invalida o output inteiro;
- o artefato persistido é imutável.

### 3.4 Meta Auth

Autorização, conexões, ativos vinculados, escopos, expiração/renovação e saúde da integração.

### 3.5 Instagram

Importação/publicação de conteúdo, sincronização de mídia e métricas orgânicas.

### 3.6 Advertising

Campanhas, ad sets, ads, creatives, experimentos, métricas pagas, pausa/escala.

### 3.7 Leads

Lead Ads, micro-CRM, eventos, score, ganho/perda e linhagem.

### 3.8 Surveys

Pedidos de pesquisa, respostas e classificação.

### 3.9 Insights

Recomendações e insights derivados de evidência observada.

### 3.10 AI

Roteamento, providers, schemas, execução, custo e fallback.

### 3.11 Operations

Idempotência, filas, jobs, retries, webhooks, reconciliação e auditoria.

## 4. Padrões de dependência

Features não chamam SDKs Meta/LLM diretamente. Devem depender de interfaces internas.

Exemplo conceitual:

```ts
interface AdvertisingGateway {
  createExperiment(command: CreateExperimentCommand): Promise<ExternalExperimentResult>
  getInsights(query: InsightsQuery): Promise<ExternalInsights>
  scaleCampaign(command: ScaleCampaignCommand): Promise<ExternalCampaignResult>
}
```

Adaptadores Meta implementam a interface. Testes usam fakes/mocks de contrato.

O mesmo vale para IA, e-mail e outros provedores.

## 5. Multi-tenancy

Todo recurso de negócio pertence a uma `organization`.

Regras:

- membership é a fonte de autorização humana;
- `organization_id` é obrigatório nas entidades tenant-scoped;
- queries de servidor também devem filtrar tenant mesmo quando usam credencial privilegiada;
- nenhuma tabela de domínio deve depender apenas de `user_id` para isolamento.

Papéis iniciais sugeridos:

- `owner`: controle total e aprova gasto;
- `admin`: gerencia operação, sujeito às regras de aprovação definidas;
- `member`: opera recursos permitidos.

A matriz final de permissões deve ser implementada antes da comercialização.

## 6. Autenticação

MVP:

- e-mail + senha;
- confirmação de e-mail;
- recuperação de senha;
- logout/sessões;
- proteção de rotas privadas.

Não criar autenticação própria.

## 7. Integração Meta

### 7.1 Requisitos

- fluxo oficial de autorização;
- escopos mínimos necessários;
- ativos externos persistidos por IDs oficiais;
- status da conexão (`ACTIVE`, `ACTION_REQUIRED`, `EXPIRED`, `REVOKED`, `ERROR`);
- nunca persistir senha Meta;
- tokens apenas em armazenamento server-side aprovado;
- cada chamada externa registra versão da API e correlation/operation id.

### 7.2 Versionamento

Configuração única, por exemplo `META_GRAPH_API_VERSION`.

Nunca espalhar `/vXX.X/` por features.

Upgrade de versão exige:

1. leitura de changelog;
2. contrato atualizado;
3. testes de integração/sandbox;
4. validação de métricas;
5. promoção explícita.

## 8. Conteúdo Instagram

### 8.1 Importação

Jobs incrementais devem importar mídia suportada, sem duplicação por `external_media_id`.

Persistir metadados normalizados e payload bruto relevante.

### 8.2 Métricas orgânicas

Snapshots temporais; nunca sobrescrever somente o último valor se histórico for útil.

Pipeline:

`Meta field → raw payload → MetaMetricMapper(version) → canonical metric → snapshot`

Mappers são versionáveis e testados.

### 8.3 Publicação

Criação de publicação é operação externa idempotente.

Estados mínimos:

`DRAFT`, `SCHEDULED`, `QUEUED`, `PUBLISHING`, `PUBLISHED`, `FAILED`, `CANCELLED`.

Arquivos entram em Storage com políticas tenant-scoped; URLs temporárias/seguras quando apropriado.

## 9. Recomendações de conteúdo

A recomendação é um artefato persistido, não texto transitório de chat.

Deve conter:

- tipo;
- alvo(s);
- evidências estruturadas;
- hipótese;
- confidence;
- versão da regra/prompt;
- AI run quando houver;
- estado (`PROPOSED`, `ACCEPTED`, `REJECTED`, `EXPIRED`, `EXECUTED`).

Filtros determinísticos devem reduzir candidatos antes de chamar IA.

## 10. Aprovações e comandos financeiros

### 10.1 Regra

Nenhuma operação que possa criar/aumentar gasto pode ser executada sem aprovação válida.

### 10.2 Separação

`Recommendation != Approval != Command != Operation`

Isso evita que interpretação por IA seja confundida com autorização.

### 10.3 Aprovação

Persistir snapshot do que foi aprovado; mudança posterior no objeto não pode ampliar autorização silenciosamente.

### 10.4 Command

O comando recebe referência à aprovação e valida:

- tenant;
- aprovador e papel;
- valor/moeda;
- validade;
- objeto/escopo;
- não revogação;
- limites adicionais.

## 11. Experimentos

Modelar experimento independentemente da representação externa Meta.

Estados:

`DRAFT → AWAITING_APPROVAL → APPROVED → QUEUED → CREATING → ACTIVE → COLLECTING → COMPLETED | FAILED | CANCELLED`.

Variantes guardam vínculo com conteúdo/creative.

Usar mecanismo oficial de teste Meta quando disponível/adequado. Se algum caso não puder usar teste oficial, qualquer metodologia alternativa precisa ser documentada como modo distinto, nunca apresentada falsamente como equivalente.

## 12. Campanhas e escala

Campanhas importadas/criadas guardam IDs externos e estado local reconciliável.

Escala exige novo `Approval` e `ScaleCommand`.

O sistema deve suportar discrepância entre estado local e Meta. Um reconciler periódico é autoridade para detectar e sinalizar divergências.

## 13. Insights pagos

Jobs periódicos consultam desempenho dentro de rate limits.

Persistir snapshots e campos brutos necessários.

Cálculos derivados pertencem ao domínio, por exemplo:

- CTR;
- CPC;
- CPL;
- CPQL;
- CPA;
- conversion rate;
- ROAS.

Todos devem lidar explicitamente com denominador zero, moeda e janela temporal.

## 14. Winner Engine

Componente determinístico separado da LLM.

Entrada:

- variantes;
- métricas;
- período;
- requisitos mínimos;
- resultado oficial Meta, quando existir;
- resultados downstream disponíveis.

Saída estruturada:

- `NOT_ENOUGH_DATA`;
- `NO_CLEAR_WINNER`;
- `WINNER`;
- evidências;
- métricas comparadas;
- limitações.

LLM recebe essa saída para interpretação, não para substituir o cálculo.

## 15. Lead Ads e micro-CRM

### 15.1 Ingestão

Webhook Meta:

1. validar origem/assinatura conforme mecanismo vigente;
2. registrar em `webhook_events` com chave de deduplicação;
3. retornar rapidamente;
4. enfileirar processamento;
5. worker busca/normaliza dados permitidos;
6. upsert idempotente do lead;
7. registrar evento de domínio.

### 15.2 Estados

`NEW`, `CONTACTED`, `QUALIFIED`, `OPPORTUNITY`, `WON`, `LOST`.

Transições relevantes geram `lead_events`.

### 15.3 Linhagem

Persistir IDs externos e vínculos que permitam reconstruir origem até anúncio/creative/campanha/experimento/conteúdo quando a plataforma fornece os dados necessários.

## 16. Conversões

`WON` pode gerar evento de conversão interno e, se configurado, job para envio à Meta via integração oficial.

O sistema deve preservar:

- evento original;
- dados enviados;
- status de entrega;
- resposta externa;
- retries;
- consentimento/base legal/configuração aplicáveis.

Não afirmar que a Meta atribuiu uma venda apenas porque o CRM interno a relacionou; armazenar fontes de atribuição separadamente.

## 17. Surveys

Evento `WON`/`LOST` pode criar `survey_request` segundo regra configurável.

MVP usa formulário próprio por token público aleatório, de uso restrito/expirável quando adequado.

Separar resposta original de classificação derivada por IA.

## 18. Insights estratégicos

Insight deve ter estrutura:

- `observation`: fato/dado;
- `interpretation`: leitura;
- `hypothesis`: explicação a testar;
- `recommended_test`: próximo passo;
- `evidence_refs`;
- `confidence`;
- `limitations`;
- `ai_run_id` quando aplicável.

Nunca misturar fatos observados com texto gerativo sem rotulagem.

## 19. Filas

Filas conceituais iniciais:

- `meta-webhook`;
- `meta-content-sync`;
- `meta-content-publish`;
- `meta-ads-command`;
- `meta-ads-insights-sync`;
- `lead-processing`;
- `conversion-sync`;
- `survey-dispatch`;
- `ai-analysis`;
- `reconciliation`.

Implementação pode consolidar fisicamente filas se mantiver tipo de job e isolamento lógico.

## 20. Job contract

Todo job crítico deve conter:

- `job_id`;
- `organization_id`;
- `job_type`;
- `operation_id` quando mutável;
- payload validado;
- attempt;
- created_at;
- correlation_id.

Worker deve ser idempotente.

## 21. Retry e backoff

Classificar erros:

- retryable transient;
- rate limited;
- auth/action required;
- permanent validation;
- unknown.

Não repetir indefinidamente erro permanente. Rate limits respeitam headers/regras do provedor. Após limite de tentativas, mover para estado de falha/dead-letter equivalente e alertar.

## 22. Idempotência

Para operações externas mutáveis:

1. criar `operation` antes da chamada;
2. chave única por intenção lógica;
3. lock/claim atômico;
4. chamada externa;
5. persistir `external_resource_id` e resultado;
6. retry consulta operação existente antes de repetir.

Onde a API externa oferecer chave própria de idempotência, usar em conjunto.

## 23. Webhook inbox

Persistir evento recebido antes do processamento quando possível.

Campos mínimos:

- provider;
- external_event_id ou hash deduplicável;
- event_type;
- payload;
- received_at;
- processing_status;
- processed_at;
- error_summary.

Payload é dado não confiável e pode conter PII; acesso deve ser restrito e retenção revisada.

## 24. Reconciliação

Webhooks podem atrasar/falhar e usuários podem alterar campanhas diretamente na Meta.

Jobs periódicos devem comparar:

- conexões/ativos;
- conteúdo recente;
- campanhas ativas;
- métricas;
- recursos criados por operations pendentes.

Divergências produzem evento/alerta e correção segura quando determinística.

## 25. Cron

Cron apenas dispara/enfileira trabalho; evitar processamentos longos diretamente no scheduler.

Frequências serão calibradas por custo, rate limit e necessidade de frescor.

## 26. AI Router

Todas as features chamam contrato único de AI Task. Ver `AI_ARCHITECTURE.md`.

Requisitos:

- structured output;
- schema validation;
- provider abstraction;
- policy de tier;
- budget/cost awareness;
- retry/fallback controlado;
- logs sem segredos;
- `ai_runs` obrigatório para execução produtiva.

## 27. Observabilidade

Três níveis:

1. logs técnicos correlacionáveis;
2. `operations/jobs/webhook_events` para integração;
3. `audit_events` para ações de negócio/segurança.

Toda operação crítica recebe `correlation_id` propagado quando possível.

## 28. Auditoria

Eventos mínimos auditáveis:

- login relevante/alterações de segurança quando disponível;
- membership/papel;
- Meta conectado/desconectado;
- aprovação/rejeição financeira;
- campanha/experimento criado, pausado, escalado;
- lead alterado para WON/LOST;
- dados exportados/excluídos;
- configuração crítica alterada.

Audit log de negócio deve ser append-oriented; correções geram novo evento.

## 29. Notificações

Domínio gera eventos de notificação, UI/e-mail são canais.

Prioridades iniciais:

- conexão Meta requer ação;
- gasto aguardando aprovação;
- experimento concluído;
- lead prioritário;
- job crítico falhou.

Evitar acoplar regra de domínio ao provedor de e-mail.

## 30. Segurança

Detalhes em `SECURITY_MODEL.md`. Obrigatório:

- RLS;
- least privilege;
- secrets server-side;
- validação de input;
- proteção CSRF/redirect/state no OAuth conforme framework/fluxo;
- sanitização/escape na apresentação;
- rate limiting em endpoints sensíveis;
- política de retenção/exclusão;
- não logar tokens/PII desnecessária.

## 31. API interna

Preferir Server Actions/Route Handlers ou camada equivalente conforme necessidade, mas manter regras de domínio fora do handler.

Endpoints públicos necessários, como OAuth callbacks, webhooks e surveys, devem ser mínimos e endurecidos.

## 32. Testabilidade

Integrações externas devem possuir fixtures/fakes reprodutíveis.

Testes obrigatórios por categoria:

- unidade: cálculos, state machines, normalização;
- DB: constraints, triggers quando houver, RLS;
- integração: adapters com fixtures/ambiente de teste quando possível;
- idempotência: retry não duplica recurso/gasto;
- webhook: duplicata não duplica lead/evento;
- tenancy: usuário A não lê/escreve org B;
- AI: schema/fallback sem exigir qualidade semântica subjetiva para passar suíte;
- e2e do happy path com serviços externos simulados e, em gate separado, sandbox real quando disponível.

## 33. Estratégia de migrations

- migrations SQL versionadas no repositório;
- nunca editar histórico já aplicado em ambientes compartilhados;
- schema changes revisados por impacto em RLS/indexes/backfill;
- dados de produção nunca usados como fixture de teste.

## 34. Performance inicial

O MVP deve evitar otimização prematura, mas criar índices para:

- `organization_id` + estado/data;
- external IDs únicos por conexão/tenant;
- jobs/operations por status;
- snapshots por objeto + timestamp;
- leads por pipeline/status;
- audit/events por org + data.

## 35. Critérios técnicos de release MVP

Antes de primeiro cliente pagante:

- happy path canônico completo;
- RLS provada entre pelo menos duas organizações;
- secrets auditados;
- OAuth/connect/disconnect funcional;
- operações financeiras idempotentes;
- webhooks deduplicados;
- filas/retries observáveis;
- falhas de Meta não corrompem estado;
- custo de IA registrado;
- exclusão/desconexão testada;
- políticas/termos/privacidade mínimos adequados ao uso real;
- backup/recuperação e ambiente de produção configurados;
- SMTP/provedor de e-mail adequado à produção.

## 36. Regra para Claude Code

Durante implementação, se documentação oficial vigente contradizer este documento em detalhe externo, não improvisar. Registrar a divergência, trazer evidência ao planejador e atualizar contrato canônico antes de codificar dependência incompatível.
