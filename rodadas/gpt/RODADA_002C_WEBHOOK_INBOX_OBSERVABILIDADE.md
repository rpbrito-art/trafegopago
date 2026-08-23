# RODADA 002C — WEBHOOK INBOX + OBSERVABILIDADE BASE

Status: **AUTORIZADA**
Data: 2026-08-23
Executor: Claude Code
Branch esperada: `claude/rodada-002c-webhook-inbox-observabilidade`
Relatório esperado: `rodadas/claude/RELATORIO_RODADA_002C_WEBHOOK_INBOX_OBSERVABILIDADE.md`
Supabase project ref: `cbnxdoxpyioxjwgjhbtq`

Esta é a terceira rodada da Fase 2. A autorização do fundador cobre **somente a 002C**.

---

## 1. Objetivo

Fechar as capacidades restantes da Fase 2 sem iniciar Meta nem criar infraestrutura sem uso real:

1. criar `public.webhook_events` como inbox durável server-only;
2. provar deduplicação e fronteira de acesso;
3. fechar a ressalva da 002B adicionando o typecheck das Edge Functions à CI;
4. formalizar no canônico vigente a estratégia de secrets/runtime;
5. criar observabilidade operacional mínima, read-only e sem payload/PII;
6. eliminar o INFO de performance de `audit_events.actor_user_id`, se o baseline continuar igual;
7. deixar a Fase 2 candidata a encerramento pela auditoria GPT da própria 002C.

A rodada **não cria endpoint público de webhook**. Ela cria a caixa de entrada onde eventos futuros poderão ser persistidos com segurança.

---

## 2. READ SET mínimo

Após o preflight do `PROJECT_PROMPT.md`, ler:

1. `estado.md`;
2. `.gpt/PROJECT_PROMPT.md`;
3. `docs/00-governanca/ACTIVE_DOCS.md`;
4. este mandato;
5. `docs/00-governanca/HISTORY_SUMMARY.md` — somente resumo promovido;
6. `docs/00-governanca/IMPLEMENTATION_ROADMAP.md` — Fase 2;
7. `docs/03-canonical/TECHNICAL_SPEC.md` — §§3.11, 19–25, 27, 30, 32–35;
8. `docs/03-canonical/DATA_MODEL.md` — §§13, 14, 16–18;
9. `docs/03-canonical/API_CONTRACTS.md` — §§10–13, 17–19;
10. `docs/03-canonical/SECURITY_MODEL.md` — §§3–9, 13, 15, 19–25;
11. `.github/workflows/ci.yml`;
12. migration 002A, migrations 002B/002B-01 e arquivos estritamente necessários para preservar o baseline.

Não reler relatórios antigos completos. A 002B promovida é baseline auditado.

Gate de produto: esta rodada permanece infraestrutura interna e não altera UX/Meta. Se surgir necessidade de endpoint Meta, OAuth, lead, conteúdo, mensuração ou experiência, **parar antes de ampliar escopo** e retornar ao GPT.

---

## 3. Preflight e baseline

Antes de qualquer mutação confirmar, no mínimo:

- repo `rpbrito-art/trafegopago`;
- branch nova a partir de `origin/main` vigente;
- project ref exato `cbnxdoxpyioxjwgjhbtq`;
- migration history = **8**, última `20260823183513`;
- `pgmq` instalado e fila `integration_jobs` existente;
- fila ativa/arquivo sem fixtures;
- `pg_cron` não instalado;
- Edge Function `integration-worker` ACTIVE;
- 5 tabelas `public` antes da nova migration;
- `operations`/`audit_events` sem fixtures;
- zero objetos `public` owned por `supabase_admin`;
- Advisors coerentes com `estado.md`.

Se o baseline material divergir, parar antes de mutar.

---

## 4. Eficiência obrigatória — prova por delta

Esta rodada **não deve repetir a bateria 82/82 da 002B**.

Baseline já auditado e congelado: fila/worker, redelivery, claim concorrente, idempotência, auth da Edge Function, poison e contrato de job.

Regras desta execução:

- testar somente mudanças da 002C e regressões diretamente relacionadas;
- não rerodar E2E remoto longo da fila se nenhum código da fila/worker for alterado;
- não alterar `integration-worker` se `npm run typecheck:functions` já passar;
- localmente, rodar somente gates pertinentes ao delta;
- a suíte completa do repositório deve rodar **uma única vez na CI final**;
- evitar `npm ci` local se lockfile/dependências não mudarem;
- relatório alvo: **até 120 linhas**, formato `mudança → prova → resultado`;
- preferir um único push final auditável.

Se surgir uma falha pequena e isolada, corrigir e testar o delta; não reiniciar toda a rodada por ritual.

---

## 5. Migration única da 002C

Criar **uma única migration nova**. Histórico esperado:

`8 → 9 migrations`

Não editar migrations já aplicadas. Não usar `migration repair`. Não executar DDL ad hoc para corrigir a própria migration depois de aplicada.

Validar a migration integralmente em transação revertida antes do `db push` quando o caminho vigente permitir.

### 5.1 `public.webhook_events`

Criar exatamente a inbox interna abaixo, sem endpoint e sem processamento de provider:

- `id uuid primary key default gen_random_uuid()`;
- `organization_id uuid null references public.organizations(id) on delete cascade`;
- `provider text not null`;
- `external_event_id text null`;
- `dedupe_hash text not null`;
- `event_type text not null`;
- `payload_json jsonb not null`;
- `processing_status text not null default 'RECEIVED'`;
- `received_at timestamptz not null default now()`;
- `processed_at timestamptz null`;
- `error_summary text null`.

Constraints obrigatórias:

- `provider`: trim não vazio, máximo 80 caracteres;
- `external_event_id`: quando presente, trim não vazio, máximo 255;
- `dedupe_hash`: exatamente 64 caracteres hexadecimais (`SHA-256` representado em hex); não criar função de hashing nesta rodada;
- `event_type`: trim não vazio, máximo 120;
- `payload_json`: teto serializado de **262144 caracteres**; não restringir a object/array porque o envelope externo futuro é provider-specific;
- `processing_status` fechado em:
  - `RECEIVED`
  - `QUEUED`
  - `PROCESSING`
  - `PROCESSED`
  - `FAILED`
  - `IGNORED`
- `error_summary`: quando presente, trim não vazio, máximo 2000.

Não criar coerência artificial entre status/timestamps antes de existir processador real.

### 5.2 Dedupe e índices

Criar:

- unique `(provider, dedupe_hash)`;
- índice `(processing_status, received_at)`;
- índice `(organization_id, received_at desc)`.

O dedupe é por `provider + dedupe_hash`. Não definir ainda semântica Meta de assinatura, raw body ou external event id.

### 5.3 RLS e grants

`webhook_events` é server-only e pode conter dado externo/PII.

Obrigatório:

- `ENABLE ROW LEVEL SECURITY` explícito;
- **zero policies** para browser nesta rodada;
- `REVOKE ALL` de `anon` e `authenticated`;
- `service_role`: `SELECT, INSERT, UPDATE` apenas; **sem DELETE** no caminho normal;
- nenhuma função `SECURITY DEFINER` nova;
- nenhum grant a `PUBLIC`;
- nenhuma view/tabela pública adicional para observabilidade.

O novo INFO `rls_enabled_no_policy` para `webhook_events`, se aparecer, é esperado por desenho e não é regressão de segurança.

### 5.4 Índice de `audit_events.actor_user_id`

Se o Performance Advisor pré-migration continuar mostrando somente o INFO já conhecido de FK sem índice, criar na mesma migration:

`audit_events_actor_user_id_idx` em `public.audit_events(actor_user_id)`.

Não criar rodada separada para isso.

---

## 6. CI — fechar ressalva da 002B

Alterar `.github/workflows/ci.yml` para executar explicitamente:

`npm run typecheck:functions`

como passo próprio **depois** do typecheck da aplicação e antes dos testes.

Não alterar o comando existente nem a Edge Function se o gate já passar.

A CI final deve provar:

- install;
- lint;
- typecheck da aplicação;
- **typecheck das Edge Functions (`deno check`)**;
- testes;
- build.

A afirmação “typecheck:functions roda na CI” só pode aparecer no relatório se o job final mostrar esse passo concluído com sucesso.

---

## 7. Estratégia canônica de secrets/runtime

Atualizar **o `SECURITY_MODEL.md` existente**, sem criar um novo canônico apenas para este tema, com uma seção/matriz curta que explicite:

- Browser: somente publishable key e credenciais públicas apropriadas;
- Next.js server / scripts server-side: secret key somente em ambiente server-side;
- Edge Functions/workers: secrets do projeto/injetados pelo runtime, nunca client-side;
- tokens Meta futuros: referência/armazenamento server-side aprovado, nunca browser/log;
- Supabase Vault: usar apenas quando o próprio Postgres realmente precisar consumir um segredo; não por padrão;
- nenhum segredo privilegiado em `NEXT_PUBLIC_*`;
- secrets distintos por ambiente antes de produção;
- rotação/revogação diante de exposição ou substituição;
- redaction de logs;
- pinning/lockfile em dependências sensíveis.

Não criar segredo, token Meta, Vault entry ou novo provider nesta rodada.

---

## 8. Observabilidade mínima read-only

Criar um artefato versionado simples, preferencialmente:

`scripts/sql/observability-base.sql`

ou nome equivalente claro.

Ele deve ser **somente leitura** e retornar, sem payload/PII/secret:

- contagem de `operations` por status;
- quantidade de mensagens ativas e arquivadas de `integration_jobs`;
- contagem de `webhook_events` por `processing_status`;
- timestamps agregados úteis, quando houver registros;
- nenhuma coluna de payload, e-mail, token, metadata sensível ou conteúdo de evento.

Não criar dashboard, view pública, tabela de métricas, serviço externo ou telemetria paga.

---

## 9. Prova versionada e proporcional

Criar uma prova SQL transacional compacta, por exemplo:

`scripts/sql/webhook-inbox-002c-proof.sql`

Ela deve usar fixtures sintéticas sem PII real e terminar em rollback/zero resíduo.

Provar somente o delta:

1. schema, defaults, constraints e índices de `webhook_events`;
2. RLS habilitado e zero policies;
3. `anon`/`authenticated` sem privilégios/sem acesso;
4. `service_role` consegue SELECT/INSERT/UPDATE e não DELETE;
5. primeiro `(provider, dedupe_hash)` entra;
6. duplicata do mesmo provider/hash é recusada;
7. mesmo hash com provider diferente entra;
8. tentativa duplicada não altera o registro original;
9. constraints de hash/tetos/campos vazios/status inválido funcionam;
10. observabilidade retorna apenas agregados permitidos;
11. índice `audit_events_actor_user_id_idx` existe se autorizado pelo baseline;
12. fila/worker permanecem presentes por prova catalogal simples, **sem rerodar 82/82**;
13. zero resíduo após a prova.

Não criar usuários Auth para esta prova se SQL roles/transação já provarem a fronteira necessária.

---

## 10. Advisors e segurança

Após migration:

- Security Advisor: nenhum novo ERROR/WARN material;
- INFO `rls_enabled_no_policy` em tabelas internas server-only é aceitável e deve ser explicado, não “corrigido” com policy artificial;
- Performance Advisor: o INFO de `audit_events.actor_user_id` deve desaparecer se o índice foi criado;
- confirmar zero objetos `public` owned por `supabase_admin`;
- confirmar default ACL residual de `supabase_admin` continua inerte;
- não ampliar privilégios para reduzir tempo de teste.

---

## 11. Gates finais

Antes do handoff:

- migration history local == remoto = 9;
- `git diff --check`;
- prova SQL 002C verde;
- observabilidade read-only validada;
- `npm run typecheck:functions` local, pois esse é o delta de CI;
- não é obrigatório rerodar suíte completa local;
- Advisors registrados;
- CI final única verde com passo `typecheck:functions` explícito;
- working tree limpa;
- um único push final quando possível.

Se a alteração de CI revelar falha existente do `deno check`, corrigir apenas o erro diretamente relacionado e seu teste; não rerodar a bateria remota da 002B salvo impacto real no worker.

---

## 12. Critérios de parada

Parar e retornar ao GPT se surgir:

- necessidade de endpoint HTTP/webhook real para provar a tabela;
- necessidade de Meta/OAuth/challenge/assinatura;
- necessidade de novo segredo humano/provider pago;
- necessidade de cron;
- necessidade de função `SECURITY DEFINER` nova;
- baseline remoto diferente do §3;
- migration aplicada que revele falha semântica exigindo DROP/rewrite/repair;
- necessidade de armazenar payload/PII em logs de prova;
- mudança arquitetural não coberta por este mandato.

---

## 13. Fora de escopo

Não implementar:

- endpoint público de webhook;
- assinatura/challenge Meta;
- Meta app/OAuth/conexão;
- lead fetch/CRM;
- cron/pg_cron/scheduler;
- nova fila física;
- `public.integration_jobs`;
- IA;
- Ads/aprovações;
- conteúdo/publicação;
- UI;
- notificações;
- provider externo pago;
- novo segredo humano.

---

## 14. Gate humano

**Nenhum gate humano é esperado.**

Claude deve executar autonomamente. Não pedir ao fundador para abrir Dashboard, copiar secret, habilitar Queue/Cron, digitar SQL ou transportar contexto.

Se surgir intervenção humana realmente indispensável, parar e explicar ao GPT antes de solicitá-la.

---

## 15. Entrega

Ao concluir:

- branch `claude/rodada-002c-webhook-inbox-observabilidade` pushada;
- PR draft aberta;
- relatório compacto em `rodadas/claude/RELATORIO_RODADA_002C_WEBHOOK_INBOX_OBSERVABILIDADE.md`;
- `estado.md` da branch atualizado apenas com fatos de execução;
- relatório alvo <= 120 linhas;
- nenhuma etapa seguinte iniciada.

Estado esperado:

`002C EXECUTADA — AGUARDANDO AUDITORIA GPT`

Somente a auditoria GPT decide se a 002C é aprovada/promovida e se a **Fase 2 pode ser encerrada**.