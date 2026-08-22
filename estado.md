# ESTADO — Tráfego Pago

Atualizado: 2026-08-22

Este é o **estado operacional canônico** do projeto. GPT e Claude Code devem lê-lo no início de cada nova rodada ou correção.

## 1. Repositório autorizado

- GitHub: `rpbrito-art/trafegopago`
- Pasta local esperada: `C:\Users\rpbri\Documents\trafegopago`
- Repositório `rpbrito-art/business-weaver`: **fora de escopo e proibido para este projeto**.

## 2. Infraestrutura incorporada

- Aplicação Next.js 16.3.2 + React 19.2.8 + TypeScript implementada.
- App Router ativo.
- npm + `package-lock.json` como package manager/lockfile.
- lint, typecheck, Vitest e build configurados.
- CI GitHub Actions ativa: install → lint → typecheck → test → build.
- Clientes Supabase browser/server preparados com `@supabase/ssr` e publishable key.
- Convenção de env e proteção de secrets estabelecidas.
- Projeto Supabase vinculado: `cbnxdoxpyioxjwgjhbtq`.
- O projeto Supabase foi criado em 2026-08-22 e aparece no painel com o nome `quoron`; o ref é o identificador operacional correto.
- Migration `20260822212544_harden_rls_auto_enable_privileges.sql` aplicada e versionada.
- `public.rls_auto_enable()` mantém `SECURITY DEFINER`, mas `EXECUTE` foi removido de `PUBLIC`, `anon` e `authenticated`; permanecem `postgres` e `service_role`.
- Event trigger `ensure_rls` continua ativo para auto-enable de RLS em novas tabelas `public`.
- Supabase Security Advisor sem achados após o hardening da Rodada 001A.
- Schema `public` permanece sem tabelas de domínio.
- `.claude/commands/proxima.md` está versionado.
- `.gitattributes` está versionado para normalização de line endings.
- Ainda não existem Auth funcional do produto, organizations, memberships, RLS de domínio, integração Meta, workers de domínio, IA ou deploy de produção.

## 3. Etapas/rodadas concluídas

- Etapa 1 — definição inicial do MVP: concluída.
- Etapa 2A — pesquisa técnica: concluída.
- Etapa 2B — revisão adversarial: concluída.
- Etapa 3 — consolidação canônica e estruturação documental: concluída.
- Rodada 000 — Bootstrap Técnico: **APROVADA E PROMOVIDA**.
- Rodada 001A — Baseline Supabase e Segurança: **APROVADA E PROMOVIDA**.

### Rodada 000

Auditoria:
`rodadas/gpt/AUDITORIA_RODADA_000_BOOTSTRAP_TECNICO.md`

Relatório Claude:
`rodadas/claude/RELATORIO_RODADA_000_BOOTSTRAP_TECNICO.md`

PR: `#1`

Merge: `9f0f6aaa205fe5b774faab92c34e8373e4ef7d6c`.

### Rodada 001A

Auditoria:
`rodadas/gpt/AUDITORIA_RODADA_001A_BASELINE_SUPABASE_SEGURANCA.md`

Relatório Claude:
`rodadas/claude/RELATORIO_RODADA_001A_BASELINE_SUPABASE_SEGURANCA.md`

Branch auditada:
`claude/rodada-001a-baseline-supabase-seguranca`

Commit de implementação informado:
`d802e8f02f2b520b4252fe3be70e6e161952507a`

Head final auditado:
`347df21d9e913d285bd1856e7855654ae0db53e6`

PR: `#2`

Merge:
`fb9bc62e6cf25e03e39255bff7042e330a80e1d6`.

CI da branch `32600593719`: verde.
CI do PR `32600974514`: verde.

## 4. Estado corrente

**PRÓXIMA FASE EM PLANEJAMENTO — AGUARDANDO APROVAÇÃO DO FUNDADOR**

Nenhuma Rodada 001B está autorizada neste momento.

O comando `/proxima` deve fazer bootstrap e **não implementar nada** enquanto este estado permanecer aguardando aprovação.

O GPT deve apresentar o planejamento da próxima rodada. Somente após aprovação explícita do fundador poderá criar o mandato, atualizar este arquivo e autorizar execução.

## 5. Próxima rodada proposta

**RODADA 001B — AUTH REAL**

Objetivo proposto: implementar identidade e sessão reais com Supabase Auth sem antecipar Organizations/Membership/RLS de domínio.

Escopo proposto:

- cadastro por e-mail e senha;
- confirmação de e-mail;
- login;
- logout;
- callback de autenticação;
- integração SSR correta com `@supabase/ssr`;
- `proxy.ts`/Proxy conforme padrão vigente do Next.js 16 e documentação atual do Supabase;
- validação server-side segura de identidade, sem confiar em `getSession()` como prova de autorização;
- rota/página mínima protegida apenas para provar sessão autenticada;
- tratamento dos redirects de usuário autenticado/não autenticado;
- testes de helpers/guards e fluxos que possam ser automatizados com segurança;
- atualização de documentação operacional necessária.

Explicitamente fora da 001B proposta:

- `organizations`;
- `organization_members`;
- onboarding empresarial;
- RLS de domínio;
- funções próprias de domínio;
- Meta/Instagram;
- campanhas/leads;
- IA;
- pagamentos;
- deploy de produção.

## 6. Pendências e gates futuros

### 6.1 Privilégios de funções

`service_role` mantém `EXECUTE` sobre `public.rls_auto_enable()`. Isso foi aceito como ressalva não bloqueante na 001A. Antes de introduzir funções próprias privilegiadas do produto, definir política explícita de privilégios mínimos.

### 6.2 Default privileges

Ainda não foi adotada política global equivalente a:

`ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;`

Essa decisão deve ocorrer **antes da primeira rodada que crie funções próprias em schema exposto**, sem criar etapa isolada apenas para housekeeping se puder ser incorporada com segurança à rodada substantiva correspondente.

### 6.3 Auth/Next.js

Na próxima rodada de Auth, revalidar documentação atual do Supabase/Next.js antes de implementar. A direção conhecida é usar `proxy.ts`/Proxy no Next.js 16 e validação server-side confiável da identidade.

### 6.4 Tooling

A linha atual do ESLint foi reportada como deprecated pelo npm em CI, mas todos os gates passam. Monitorar compatibilidade; não fazer upgrade cego apenas para eliminar warning.

## 7. Regras de handoff

### GPT

1. Ler `.gpt/PROJECT_PROMPT.md` e este `estado.md`.
2. Diferenciar planejado, autorizado, executado, auditado e promovido.
3. Criar mandato em `rodadas/gpt/` apenas quando houver autorização necessária.
4. Auditar independentemente relatórios em `rodadas/claude/` usando GitHub/Supabase/CI quando aplicável.
5. Não criar rodadas artificiais apenas para alinhar numeração/documentação quando não houver risco operacional.

### Claude Code

Ao iniciar `/proxima`:

1. confirmar repositório e, quando aplicável, project ref;
2. ler `estado.md` e `.gpt/PROJECT_PROMPT.md`;
3. só executar quando existir mandato vigente explicitamente autorizado;
4. se o estado estiver aguardando aprovação ou auditoria, não implementar nada;
5. nunca promover a própria execução nem criar a próxima rodada.

## 8. Regra contra ambiguidade

Se houver conflito entre este arquivo e um relatório antigo, vale o `estado.md` mais recente combinado com o conteúdo efetivamente incorporado à `main`.

A existência de branch, relatório ou rodada não significa por si só que a mudança foi promovida.

Se houver conflito entre mandato vigente e documentos canônicos de produto/arquitetura, o executor deve parar e reportar a inconsistência; não deve escolher silenciosamente uma interpretação.
