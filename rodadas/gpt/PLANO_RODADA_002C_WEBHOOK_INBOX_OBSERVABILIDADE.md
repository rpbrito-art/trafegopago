# PLANO — RODADA 002C — WEBHOOK INBOX + OBSERVABILIDADE BASE

Status: **PLANEJADA — NÃO AUTORIZADA**
Data: 2026-08-23

Este documento é planejamento. **Não é mandato executável.**

## 1. Objetivo

Fechar as capacidades restantes da Fase 2 sem iniciar Meta nem criar infraestrutura sem uso real:

1. criar a inbox durável `webhook_events`;
2. provar deduplicação e isolamento server-only;
3. fechar a dívida de CI da 002B fazendo o typecheck da Edge Function rodar na CI;
4. formalizar a estratégia canônica de secrets/runtime;
5. estabelecer observabilidade mínima operacional;
6. deixar a Fase 2 candidata a encerramento após auditoria.

## 2. Decisão de escopo

**Não criar cron/scheduler agora.**

A fila e o worker já foram provados na 002B, mas ainda não existe job de negócio periódico. Criar `pg_cron` apenas para chamar `SYSTEM_HEALTHCHECK` seria infraestrutura sem necessidade de produto.

Cron volta quando existir o primeiro trabalho periódico real — por exemplo health/sync Meta ou content sync — e então a frequência será escolhida por custo, rate limit e frescor, conforme `TECHNICAL_SPEC.md` §25.

## 3. Escopo proposto

### 3.1 CI — fechar ressalva da 002B

Adicionar `npm run typecheck:functions` ao workflow de CI como passo próprio, depois do typecheck da aplicação.

Não alterar a função `integration-worker` se o gate já passar.

### 3.2 `public.webhook_events`

Uma migration nova deve criar a inbox interna prevista nos canônicos.

Contrato mínimo proposto:

- `id uuid primary key default gen_random_uuid()`;
- `organization_id uuid null references organizations(id) on delete cascade`;
- `provider text not null` com trim não vazio e teto explícito;
- `external_event_id text null` com teto explícito;
- `dedupe_hash text not null` com formato SHA-256 hexadecimal de 64 caracteres;
- `event_type text not null` com trim não vazio e teto explícito;
- `payload_json jsonb not null` com teto de tamanho explícito;
- `processing_status text not null default 'RECEIVED'` com estados fechados mínimos;
- `received_at timestamptz not null default now()`;
- `processed_at timestamptz null`;
- `error_summary text null` com trim/teto quando presente.

Índices/constraints mínimos:

- unique `(provider, dedupe_hash)`;
- índice `(processing_status, received_at)`;
- índice por `organization_id, received_at` quando organization não nula.

A migration final deve decidir os estados exatos sem antecipar processamento Meta; sugestão inicial:

`RECEIVED | QUEUED | PROCESSING | PROCESSED | FAILED | IGNORED`.

### 3.3 Segurança da inbox

`webhook_events` é infraestrutura interna e pode conter payload externo/PII.

Portanto:

- RLS habilitado;
- zero policies de browser;
- `anon` e `authenticated` sem grants;
- `service_role` somente com privilégios necessários ao caminho server-side;
- nenhum payload em log de prova;
- nenhuma tabela/view adicional exposta ao browser.

Não criar endpoint público nesta rodada.

### 3.4 Dedupe

Provar no banco:

- primeiro evento com `(provider, dedupe_hash)` entra;
- duplicata idêntica não cria segunda linha;
- mesmo hash para provider diferente não colide indevidamente;
- falha de duplicata não corrompe o evento original.

Não criar ainda lógica de assinatura Meta, challenge ou processamento de lead.

### 3.5 Observabilidade mínima

Sem UI e sem nova plataforma externa.

Criar uma prova/read-only operacional compacta que permita verificar, sem expor payloads:

- operations por status;
- profundidade ativa/arquivada da `integration_jobs`;
- webhook_events por status;
- timestamps/contagens suficientes para diagnóstico;
- zero secrets/PII no output.

Preferir script server-side/read-only a nova tabela/view pública.

A rodada pode também adicionar o índice faltante em `audit_events.actor_user_id`, encerrando o INFO de performance herdado da 002A, desde que seja feito na mesma migration e sem ampliar escopo funcional.

### 3.6 Estratégia de secrets/runtime

Produzir/atualizar contrato canônico curto para fechar o item da Fase 2:

- browser: somente publishable key;
- Next/server/Edge/worker: secret key apenas server-side;
- tokens Meta futuros: referência server-side segura, nunca browser/log;
- Vault apenas quando o próprio Postgres precisar acessar segredo, não por padrão;
- secrets distintos por ambiente antes de produção;
- rotação e revogação;
- proibição de `NEXT_PUBLIC_*` para credencial privilegiada;
- redaction de logs;
- pinning/lockfile para dependências sensíveis.

Não criar segredo novo nesta rodada.

## 4. Provas proporcionais

A 002C **não deve repetir as 82 provas da 002B**.

Usar como baseline auditado a promoção da 002B e testar apenas o delta:

1. migration local == remoto;
2. schema/constraints/indexes/grants/RLS de `webhook_events`;
3. dedupe real;
4. browser sem acesso;
5. service path funcional;
6. cleanup zero;
7. observabilidade read-only sem payload/PII;
8. `typecheck:functions` executado pela CI;
9. Advisors sem novo ERROR/WARN material;
10. regressão mínima de fila apenas por catálogo/contagem, sem rerodar o E2E longo da 002B.

Localmente, executar somente testes novos/relevantes e gates necessários. A suíte completa fica para **uma única CI final**.

## 5. Relatório eficiente

Relatório Claude alvo: **até 120 linhas**.

Não repetir narrativa da 002A/002B. Referenciar as auditorias promovidas como baseline.

Formato preferido:

`mudança → prova → resultado`.

## 6. Fora de escopo

Não implementar na 002C:

- endpoint HTTP de webhook;
- challenge/assinatura Meta;
- Meta OAuth/conexão;
- lead fetch;
- CRM;
- cron/pg_cron;
- scheduler automático;
- nova fila física;
- IA;
- Ads;
- conteúdo/publicação;
- UI;
- notificações;
- provider/serviço pago;
- novo segredo humano.

## 7. Critério de fechamento

Se a 002C for posteriormente autorizada, executada e auditada com sucesso, o GPT deverá verificar se todas as entregas da Fase 2 estão satisfeitas:

- operations;
- audit_events;
- webhook_events;
- fila/worker;
- retry/idempotência/correlation;
- secrets strategy;
- observabilidade mínima.

Se sim, a própria auditoria da 002C poderá declarar **Fase 2 encerrada e promovida**, sem criar rodada extra apenas para fechamento.

## 8. Próximo passo

O fundador deve avaliar este plano.

Somente após autorização explícita o GPT deve converter/refinar este plano em mandato executável 002C e atualizar `/proxima`.