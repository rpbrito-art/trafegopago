# HISTORY SUMMARY — QUORON

Atualizado: 2026-08-25

Resume somente estado auditado/promovido e decisões estruturais persistentes. Evidência completa permanece em `rodadas/` e no Git.

## Fundação do produto

- SaaS de inteligência de crescimento para pequenas empresas, inicialmente no ecossistema Instagram + Meta Ads;
- mídia paga é pilar central, mas o produto deve entregar valor também sem gasto;
- jornada, resultado e quantidade de oportunidades são configuráveis;
- conteúdo orgânico, criativo publicitário e anúncio são conceitos distintos;
- personas são hipóteses apoiadas por evidência;
- simplicidade guiada: complexidade técnica fica no sistema, não no usuário;
- nome canônico atual do produto: **Quoron**.

Modelo canônico:

`contexto do negócio → objetivo → jornada → público/personas → conteúdo/criativo → distribuição orgânica, paga ou ambas → resultado → aprendizado → nova ação`

## Fase 0 — Bootstrap

Promovida em PR #1. Base Next.js/React/TypeScript, CI e clientes Supabase.

## Fase 1 — Supabase, Auth e Tenancy

Encerrada/promovida após 001F.

Entregue:

- Auth real e recovery real;
- organizations/memberships;
- RLS/grants/isolamento;
- business_profiles;
- bootstrap de negócio server-only.

Decisões persistentes:

- default ACL residual de `supabase_admin` é aceito apenas enquanto nenhum objeto `public` pertencer à role;
- Gmail SMTP permanece provisório de desenvolvimento;
- novos métodos Auth exigem reabrir o guard de recovery.

PRs #2–#7.

## Fase 2 — Operations, Audit, Queues e Segurança Base

**ENCERRADA E PROMOVIDA em 2026-08-23 após a 002C.**

### 002A — Operations + Audit

- `operations` idempotentes;
- correlation IDs;
- taxonomia de erro/retry;
- `audit_events` append-oriented;
- tabelas internas server-only.

PR #8.

### 002B — Queue + Worker Foundation

- Supabase Queues/PGMQ 1.5.1;
- fila `integration_jobs`;
- wrappers estreitos;
- claim/conclusão/falha de operations;
- Edge Function `integration-worker`;
- redelivery, concorrência e idempotência;
- poison interno sem taxonomia externa falsa;
- contrato SQL/TypeScript alinhado;
- dependências da função pinadas.

PR #9 — merge `c0af987ebe68cd0eafd80efef6a0e63e4c7d7042`.

### 002C — Webhook Inbox + Observabilidade

- `public.webhook_events` server-only;
- dedupe `(provider, dedupe_hash)`;
- `service_role` sem DELETE;
- índice de `audit_events.actor_user_id`;
- observabilidade agregada sem payload/PII;
- matriz de secrets/runtime;
- `typecheck:functions` na CI;
- CI final verde com 510 testes.

Auditoria: `rodadas/gpt/AUDITORIA_RODADA_002C_WEBHOOK_INBOX_OBSERVABILIDADE.md` — PR #10.

## Fase 3 — Meta Connection Foundation

**EM ANDAMENTO. 003A PROMOVIDA; 003B ESTACIONADA E NÃO PROMOVIDA.**

### 003A — conexão Meta segura

Promovida na PR #11, merge `546838db8e7ced4e9045c05feb8c7b2f0c476cc2`.

Entregue/provado na baseline:

- Facebook Login for Business;
- `meta_connections` e intenções OAuth de uso único;
- token no Supabase Vault, sem exposição ao browser;
- callback seguro e reconferência de membership;
- fluxo BISU observado e desconexão externa guiada;
- estados fail-closed para revogação/desconexão.

### 003B — descoberta/seleção de ativos, estacionada

PR #12 permanece draft/open e **não foi promovida**.

Partes preservadas como evidência/código auditado incluem:

- descoberta credential-aware;
- endpoint oficial de System User `/{system-user-id}/assigned_pages` para a trilha BISU;
- investigações read-only de Page/Instagram;
- reconexão/UX e testes de desconexão.

Defeito comprovado que impede tratar a arquitetura atual como resolvida:

- o mesmo User Access Token válido retorna 200 em `/me?fields=id,name`;
- `debug_token` confirma `is_valid=true`, `type=USER`;
- `/me?fields=client_business_id` e `/me?fields=id,client_business_id` retornam 400/code 190;
- portanto o classifier compartilhado não pode inferir saúde/tipo de User Token por essa leitura.

Restrição operacional Meta:

- limite atual de dois Business Portfolios atingido;
- portfolio bloqueado/inutilizável: `Bizzman5po`;
- `Bizzman5po` e `BizzManiq1` são identidades distintas;
- não inferir função/estado de `BizzManiq1` sem prova;
- Quoron possui o app canônico e apareceu inelegível como cliente do próprio app no fluxo BISU observado;
- não criar terceiro portfolio, não excluir `Bizzman5po` por tentativa e não usar terceiro sem decisão explícita.

Decisão posterior: **o gate Meta não bloqueia o restante do produto**. Capacidades independentes podem avançar da `main`; a 003B só volta quando houver decisão arquitetural e condição operacional adequadas.

## Fase 6 — AI Foundation antecipada

A ordem macro foi deliberadamente flexibilizada porque a trilha Meta ficou bloqueada externamente.

### 004A — AI Foundation Core

**PROMOVIDA** na PR #13, merge `da2862135eab6897fc44ae361da1298c7071a11f`.

Incorporado:

- catálogo interno de providers/modelos/preços;
- contrato `AI Task` sem feature escolher provider/modelo;
- Router server-only;
- structured output validado;
- ledger `ai_runs` auditável;
- custo com precisão fixa;
- ledger/custo fail-closed;
- coerência provider → model → price version;
- vigência de modelos/preços;
- RLS/ACL server-only;
- fake adapter apenas em testes.

Ainda não existe provider real, API key, SDK, chamada paga, fallback real, tool calling, embeddings/RAG ou feature de IA de negócio.

## 004B — Quoron Branding + Growth Context Foundation

**PROMOVIDA em 2026-08-25** na PR #14, merge `8d9abea9fd8e18a8c9ad08052694aa09f03a31e0`.

Auditoria final: `rodadas/gpt/AUDITORIA_FINAL_004B_QUORON_GROWTH_CONTEXT.md`.

Incorporado:

- **Quoron** consolidado como marca nas superfícies ativas e documentação corrente;
- repo/pasta/Supabase/resources Meta preservados como identificadores técnicos legados;
- onboarding inicial reduzido para nome, segmento, região e oferta principal;
- `target_audience` e `acquisition_goal` agora aceitam ausência real (`NULL`);
- nova entidade versionada `growth_objectives`;
- objetivo atual, destino/jornada e evento de sucesso em linguagem de negócio;
- um único objetivo ACTIVE por organização;
- histórico preservado e troca idempotente/serializada;
- escrita somente via RPC server-side com owner/admin e tenant ACTIVE;
- RLS de leitura real e browser sem escrita;
- resultado desejado explicitamente separado de observabilidade;
- fluxo multi-organização falha fechado: sem seletor explícito, nenhuma organização é escolhida por ordem do banco;
- dívida de índices de FK de `ai_runs` da 004A quitada.

CI final da correção 004B-01: `32879374174`, **803/803** testes, lint/typecheck/Edge Functions/build verdes.

## Governança de eficiência

Decisões persistentes:

- GPT planeja/arquitetura/audita; Claude Code executa;
- Claude: `CLAUDE.md → estado.md → mandato → READ SET mínimo`;
- estado promovido é baseline;
- prova por delta e raio de impacto;
- correção pequena não repete bateria anterior sem risco concreto;
- suíte completa uma vez na CI final por padrão;
- `ACTIVE_DOCS` não duplica rodada/status;
- documentação canônica só muda quando seu contrato muda;
- relatório normal ≤100 linhas; microcorreção ≤60;
- fundador não atua como barramento de contexto entre GPT e Claude;
- configuração externa manual é conduzida pelo GPT em linguagem simples.

## Próxima direção

Não há nova rodada autorizada no encerramento deste resumo.

O próximo GPT deve partir da `main` promovida, reconstruir o estado e decidir a próxima capacidade substantiva **independente da Meta** enquanto o gate externo permanecer aberto. Não iniciar Claude `/proxima` sem novo mandato.

Direções candidatas devem ser avaliadas contra o roadmap e o canônico de Growth Intelligence, sem assumir automaticamente a ordem antiga agora que a reordenação já foi documentada.

## Pendências transversais

- 003B/Meta: classifier USER/BISU e E2E BISU real pendentes;
- leaked-password protection antes de produção;
- SMTP/domínio de produção;
- default ACL residual de `supabase_admin` enquanto inerte;
- gestão avançada de membros e seletor multi-org posteriores;
- rate limiting conforme exposição real;
- redaction de callback/log antes de produção;
- provider real de IA ainda não escolhido/configurado;
- Financial Approval obrigatório antes de qualquer caminho de gasto;
- App Review/Business Verification quando aplicável à comercialização.
