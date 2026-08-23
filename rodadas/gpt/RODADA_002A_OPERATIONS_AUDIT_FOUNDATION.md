# RODADA 002A — OPERATIONS + AUDIT FOUNDATION

Status: **AUTORIZADA**
Data: 2026-08-23
Executor esperado: Claude Code
Repositório único: `rpbrito-art/trafegopago`
Supabase project ref: `cbnxdoxpyioxjwgjhbtq`
Branch esperada: `claude/rodada-002a-operations-audit-foundation`
Relatório esperado: `rodadas/claude/RELATORIO_RODADA_002A_OPERATIONS_AUDIT_FOUNDATION.md`

---

## 1. Objetivo

Iniciar a Fase 2 com a menor fundação substantiva que será reutilizada pelas integrações futuras: registrar **operações mutáveis de forma idempotente** e registrar **eventos sensíveis de auditoria de forma append-oriented**, sem ainda implementar filas, workers, webhooks ou Meta.

Em linguagem de produto/arquitetura:

- `operations` será a memória persistente de uma intenção técnica que não pode ser executada duas vezes por acidente;
- `audit_events` será o histórico persistente de ações relevantes, sem permitir que o caminho normal da aplicação reescreva o passado;
- `correlation_id` permitirá ligar registros técnicos pertencentes à mesma execução futura.

Esta rodada prepara a infraestrutura para filas, webhooks, publicação, sincronização e comandos Meta posteriores, mas **não executa nenhuma dessas capacidades ainda**.

---

## 2. Estado incorporado obrigatório antes da execução

A execução parte somente da `main` após o fechamento promovido da Fase 1.

Confirmar antes de mutar:

- Rodadas 000–001F incorporadas;
- Fase 1 encerrada;
- exatamente 5 migrations remotas, última `20260823111051_create_business_profiles_and_bootstrap`;
- `organizations`, `organization_members` e `business_profiles` com baseline de grants/RLS intacto;
- zero fixture residual;
- `public` continua sem objetos owned por `supabase_admin`;
- defaults endurecidos da 001D e `ensure_rls` permanecem ativos;
- Security Advisor não possui regressão além do WARN conhecido `auth_leaked_password_protection`.

Se houver divergência material, parar antes de aplicar migration.

---

## 3. READ SET

### Obrigatórios

Ler na ordem do método:

1. `estado.md`;
2. `.gpt/PROJECT_PROMPT.md`;
3. `docs/00-governanca/ACTIVE_DOCS.md`;
4. este mandato;
5. `docs/00-governanca/HISTORY_SUMMARY.md` — somente resumo promovido;
6. `docs/00-governanca/IMPLEMENTATION_ROADMAP.md` — regra de interpretação + Fase 2;
7. `docs/03-canonical/TECHNICAL_SPEC.md` — §§2, 3.11, 19–28 e 30;
8. `docs/03-canonical/DATA_MODEL.md` — §§13–14 e 16–18;
9. `docs/03-canonical/API_CONTRACTS.md` — §§1 e 11–13;
10. `docs/03-canonical/SECURITY_MODEL.md` — §§3–6, 15, 20 e 23–25;
11. migrations 001D/001E somente como padrão vigente de grants, RLS, defaults, constraints e privilégio mínimo;
12. scripts de prova atuais apenas o necessário para reaproveitar o padrão de fixture/limpeza.

### Sob demanda

- `src/lib/supabase/privileged.ts`, se necessário para prova/server path;
- documentação oficial Supabase/PostgreSQL atual somente para comportamento concreto que precise ser confirmado.

### Não ler por padrão

- relatórios completos 000–001F;
- `docs/02-research/`;
- documentos Meta/IA;
- rodadas antigas fora de dependência concreta.

`GROWTH_INTELLIGENCE_CANONICAL.md` não precisa ser relido pelo executor nesta rodada porque o escopo é infraestrutura interna e não altera produto/UX. **Se surgir qualquer proposta de mudança de produto/experiência, parar antes de executá-la e aplicar o gate integral de Growth Intelligence.**

---

## 4. Escopo obrigatório

### 4.1 Uma única migration

Criar exatamente uma migration nova contendo apenas a fundação desta rodada.

Ao final, o histórico remoto deve passar de **5 para 6 migrations**.

Não modificar migrations já promovidas.

### 4.2 `public.operations`

Criar tabela tenant-scoped para representar intenção mutável/idempotente.

Contrato mínimo:

- `id uuid primary key default gen_random_uuid()`;
- `organization_id uuid not null` com FK para `public.organizations(id)` e `on delete cascade`;
- `operation_type text not null`, não vazio e com limite explícito;
- `idempotency_key text not null`, não vazio e com limite explícito;
- `target_type text nullable` com limite explícito;
- `target_id uuid nullable`;
- `status text not null` com CHECK controlado contendo somente:
  - `PENDING`;
  - `CLAIMED`;
  - `SUCCEEDED`;
  - `FAILED`;
  - `ACTION_REQUIRED`;
  - `UNKNOWN`;
- `external_resource_id text nullable`, tratado como identificador opaco e com limite explícito;
- `attempt_count integer not null default 0`, nunca negativo;
- `last_error_class text nullable`, limitado à taxonomia interna vigente:
  - `AUTH_REQUIRED`;
  - `PERMISSION_DENIED`;
  - `RATE_LIMITED`;
  - `VALIDATION_FAILED`;
  - `NOT_FOUND`;
  - `CONFLICT`;
  - `TRANSIENT_UPSTREAM`;
  - `UPSTREAM_UNAVAILABLE`;
  - `UNKNOWN_UPSTREAM`;
- `last_error_summary text nullable`, com teto explícito e sem segredo/PII desnecessária;
- `correlation_id uuid not null default gen_random_uuid()`;
- `created_at timestamptz not null default now()`;
- `updated_at timestamptz not null default now()`;
- `completed_at timestamptz nullable`.

Idempotência mínima obrigatória:

- constraint única por `(organization_id, operation_type, idempotency_key)`.

Índices mínimos úteis:

- organização + status + data;
- `correlation_id`.

Não criar `approval_id` nesta rodada: approvals ainda não existe e pertence à fundação financeira posterior.

### 4.3 Segurança de `operations`

- RLS explicitamente habilitado;
- `anon` sem SELECT/INSERT/UPDATE/DELETE;
- `authenticated` sem SELECT/INSERT/UPDATE/DELETE;
- `service_role` recebe somente os privilégios necessários ao caminho interno atual;
- não criar policy de browser;
- não criar `SECURITY DEFINER`;
- aplicação/browser não ganha acesso direto só para facilitar teste.

A tabela é infraestrutura interna server-side nesta fase.

### 4.4 `public.audit_events`

Criar tabela tenant-scoped, append-oriented.

Contrato mínimo:

- `id uuid primary key default gen_random_uuid()`;
- `organization_id uuid not null` com FK para `public.organizations(id)` e `on delete cascade`;
- `event_type text not null`, não vazio e com teto explícito;
- `actor_type text not null` com CHECK controlado: `USER|SYSTEM|PROVIDER|AI`;
- `actor_user_id uuid nullable` com FK para `auth.users(id)` e `on delete set null`;
- `subject_type text not null`, não vazio e com teto explícito;
- `subject_id uuid nullable`;
- `metadata_json jsonb not null default '{}'::jsonb`, obrigatoriamente objeto e com limite explícito de tamanho;
- `correlation_id uuid nullable`;
- `created_at timestamptz not null default now()`.

Índices mínimos:

- organização + data;
- `correlation_id` quando não nulo, conforme estratégia adequada.

### 4.5 Segurança/imutabilidade de `audit_events`

- RLS explicitamente habilitado;
- `anon` sem acesso;
- `authenticated` sem acesso direto;
- `service_role` pode **INSERT e SELECT**, mas não UPDATE nem DELETE;
- não criar policy de browser;
- não criar `SECURITY DEFINER`.

O objetivo de append-only aqui é o caminho normal da aplicação: correção gera novo evento, não reescrita do evento anterior. Owner PostgreSQL/migration continua existindo para administração controlada; não inventar mecanismo irreversível de banco para impedir manutenção administrativa.

### 4.6 Contratos TypeScript mínimos

Criar módulo(s) pequeno(s) somente para impedir divergência entre aplicação e banco, contendo no mínimo:

- statuses de operation;
- taxonomia de erro externo vigente;
- classificação de retry correspondente ao contrato atual.

A classificação deve deixar explícito, no mínimo:

- `RATE_LIMITED` → retry condicionado às regras/tempo do provider;
- `TRANSIENT_UPSTREAM|UPSTREAM_UNAVAILABLE` → retry limitado com backoff;
- `AUTH_REQUIRED` → ação humana/configuração, sem retry agressivo;
- `PERMISSION_DENIED|VALIDATION_FAILED` → permanente até correção;
- `UNKNOWN_UPSTREAM` → retry conservador e depois falha/alerta;
- mutação externa só poderá retry quando a idempotência/reconciliação correspondente existir.

Não implementar worker, scheduler ou chamada externa nesta rodada.

---

## 5. Provas obrigatórias

Criar prova versionada proporcional, sugerida:

`scripts/operations-audit-002a.mjs`

Ela deve usar fixtures removíveis e terminar sem resíduo.

Provar no mínimo:

1. migration history inicial = 5;
2. migration aplicada = 6, sem DDL fora da migration;
3. `operations` e `audit_events` possuem schema/constraints/índices previstos;
4. RLS está habilitado nas duas;
5. `anon` e `authenticated` não possuem acesso direto funcional;
6. `service_role` consegue criar/atualizar/consultar `operations`;
7. mesma `idempotency_key` + mesmo `operation_type` + mesma organização não cria duas operações, inclusive em tentativa concorrente ou prova equivalente robusta;
8. mesma chave pode coexistir em organizações diferentes;
9. `attempt_count < 0` é recusado;
10. status/error class fora da allowlist é recusado;
11. `service_role` consegue inserir/consultar `audit_events`;
12. `service_role` **não** consegue UPDATE/DELETE em `audit_events`;
13. metadata que não seja objeto ou ultrapasse o limite é recusada;
14. correlação pode ser localizada pelos índices/queries esperados;
15. isolamento/estrutura já promovidos não sofrem regressão;
16. `public` continua com zero objetos owned por `supabase_admin`;
17. defaults endurecidos/`ensure_rls` permanecem coerentes;
18. Security Advisor final não ganha novo ERROR/WARN além do baseline conhecido;
19. cleanup deixa `auth.users` e tabelas de domínio no estado anterior às fixtures.

Se for necessário criar 2 usuários/2 organizações temporários para provar separação de tenant, usar identidades descartáveis e remover ao final. Não tocar na conta real existente.

---

## 6. Gates de código

Como haverá SQL + TypeScript/script:

- lint;
- typecheck;
- testes relevantes;
- suíte completa;
- build;
- CI final verde na branch/PR.

Não rodar bateria duplicada sem ganho de evidência; um push final auditável é preferível.

---

## 7. Critérios de parada

Parar e retornar ao GPT se ocorrer qualquer um destes:

- necessidade de `SECURITY DEFINER` ou privilégio mais amplo que o mandato para fazer a fundação funcionar;
- necessidade de expor `operations`/`audit_events` diretamente ao browser;
- necessidade de escolher/contratar/configurar provider de fila nesta rodada;
- necessidade de novo segredo externo;
- necessidade de alterar Auth/recovery ou tabelas promovidas fora de compatibilidade estrita;
- necessidade de implementar Meta/webhook/worker para provar a fundação;
- migration remota divergir do baseline de 5 antes da execução;
- conflito de governança/código não reconciliável com segurança.

Não improvisar solução privilegiada.

---

## 8. Fora de escopo

Não implementar nesta rodada:

- `integration_jobs` persistente;
- provider real de fila;
- worker/Edge Function de processamento;
- cron/scheduler;
- `webhook_events`;
- endpoint de webhook;
- Meta/Instagram/OAuth;
- Ads/campanhas/aprovações financeiras;
- IA;
- notificações;
- UI/tela nova;
- gestão de membros;
- observabilidade externa/SaaS de logs;
- produção/deploy.

Esses itens pertencem a rodadas posteriores e não estão autorizados por este mandato.

---

## 9. Gate humano

**Nenhum gate humano é esperado.**

Claude deve executar autonomamente. Não pedir ao fundador para abrir Supabase, digitar SQL, configurar serviço, fornecer segredo ou transportar mensagens entre agentes.

Se surgir intervenção humana inesperada, parar e registrar por que ela é indispensável antes de solicitá-la.

---

## 10. Entrega

Ao concluir:

- branch `claude/rodada-002a-operations-audit-foundation` pushada;
- PR de auditoria aberta em draft;
- relatório compacto em `rodadas/claude/RELATORIO_RODADA_002A_OPERATIONS_AUDIT_FOUNDATION.md`;
- `estado.md` atualizado somente com fatos de execução, sem declarar aprovação/promoção;
- nenhuma Fase 2 posterior iniciada.

Conclusão esperada:

`002A EXECUTADA — AGUARDANDO AUDITORIA GPT`

Somente GPT decide aprovação, correção ou promoção.