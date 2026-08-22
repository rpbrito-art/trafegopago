# ESTADO — Tráfego Pago

Atualizado: 2026-08-22

Este é o **estado operacional canônico** do projeto. GPT e Claude Code devem lê-lo no início de cada nova rodada ou correção.

## 1. Repositório autorizado

- GitHub: `rpbrito-art/trafegopago`
- Pasta local esperada: `C:\Users\rpbri\Documents\trafegopago`
- Repositório `rpbrito-art/business-weaver`: **fora de escopo e proibido para este projeto**.

## 2. Infraestrutura conhecida

- Aplicação Next.js 16.3.2 + React 19.2.8 + TypeScript implementada.
- App Router ativo.
- npm + `package-lock.json` como package manager/lockfile.
- lint, typecheck, Vitest e build configurados.
- CI GitHub Actions ativa: install → lint → typecheck → test → build.
- Clientes Supabase browser/server preparados com `@supabase/ssr` e publishable key.
- Convenção de env e proteção de secrets estabelecidas.
- Projeto Supabase vinculado: `cbnxdoxpyioxjwgjhbtq`.
- O projeto Supabase foi criado em 2026-08-22 e aparece no painel com o nome `quoron`; o ref é o identificador operacional correto.
- Schema `public` sem tabelas de domínio.
- Ainda não existem Auth funcional do produto, organizations, memberships, RLS de domínio, integração Meta, workers de domínio, IA ou deploy de produção.

## 3. Etapas concluídas

- Etapa 1 — definição inicial do MVP: concluída.
- Etapa 2A — pesquisa técnica: concluída.
- Etapa 2B — revisão adversarial: concluída.
- Etapa 3 — consolidação canônica e estruturação documental: concluída.
- Rodada 000 — Bootstrap Técnico: **APROVADA E PROMOVIDA**.

Auditoria da Rodada 000:

`rodadas/gpt/AUDITORIA_RODADA_000_BOOTSTRAP_TECNICO.md`

Relatório do Claude:

`rodadas/claude/RELATORIO_RODADA_000_BOOTSTRAP_TECNICO.md`

PR de promoção: `#1`

Merge em `main`: `9f0f6aaa205fe5b774faab92c34e8373e4ef7d6c`.

## 4. Estado corrente

**RODADA 001A — BASELINE SUPABASE E SEGURANÇA**

Status: **EXECUTADA — AGUARDANDO AUDITORIA GPT**.

Mandato vigente:

`rodadas/gpt/RODADA_001A_BASELINE_SUPABASE_SEGURANCA.md`

Relatório entregue:

`rodadas/claude/RELATORIO_RODADA_001A_BASELINE_SUPABASE_SEGURANCA.md`

### Execução registrada

- Branch: `claude/rodada-001a-baseline-supabase-seguranca`
- Commit de implementação: `d802e8f02f2b520b4252fe3be70e6e161952507a`
- Commit de handoff: head da branch (apenas `estado.md` e seção 11 do relatório)
- Push: realizado em `origin`
- Merge em `main`: **não realizado** (depende de auditoria e promoção)
- CI da branch: **success** — run `32600593719` sobre `d802e8f`
  (install, lint, typecheck, test, build todos verdes)

### Gates

| Gate | Resultado |
|---|---|
| `npm ci` | OK — 0 vulnerabilidades |
| `npm run lint` | OK |
| `npm run typecheck` | OK |
| `npm test` | OK — 11 testes |
| `npm run build` | OK — Next.js 16.3.2 |

### Supabase — resultado

- Project ref operado: `cbnxdoxpyioxjwgjhbtq` (único autorizado).
- Migration aplicada: `20260822212544_harden_rls_auto_enable_privileges.sql`
  (local e remoto idênticos em `supabase migration list --linked`).
- ACL de `public.rls_auto_enable()`:
  antes `=X/postgres | postgres=X | anon=X | authenticated=X | service_role=X`;
  depois `postgres=X/postgres | service_role=X/postgres`.
  `anon`, `authenticated` e `PUBLIC` não executam mais a função.
- Event trigger `ensure_rls`: ativo, owner `postgres`, tags inalteradas.
- Prova real de auto-enable RLS: tabela criada após o hardening recebeu
  `relrowsecurity = true` automaticamente; prova transacional revertida,
  tabela de teste não permaneceu no banco.
- Security Advisor (security e performance, nível `info`): **2 WARN antes →
  0 achados depois**.
- Schema `public`: 0 tabelas. Nenhum domínio antecipado.

### Ressalvas da Rodada 000 fechadas nesta rodada

- `.claude/commands/proxima.md` versionado (sem edição — aderência ao protocolo
  canônico verificada e confirmada).
- `.gitattributes` adicionado, sem renormalização nem diff cosmético.

### Pendências levadas à auditoria

1. `service_role` mantém `EXECUTE` sobre `public.rls_auto_enable()` — decisão
   deliberada e justificada no relatório (§9.1). GPT deve decidir se vira
   política geral.
2. `alter default privileges in schema public revoke execute on functions from
   anon, authenticated, public` — trava preventiva recomendada pela documentação
   oficial, **não executada** por ser decisão de política de schema que afeta
   todas as rodadas futuras (§9.2). GPT deve decidir onde entra.
3. Ressalvas 3, 4 e 5 da auditoria da Rodada 000 seguem abertas (ESLint
   deprecated, `proxy.ts` de refresh, nomenclatura middleware/proxy) — todas
   fora do escopo da 001A.

Nenhum bloqueador identificado. Nenhuma rodada foi auto-aprovada ou promovida.

## 5. Objetivo da rodada corrente

Preparar e endurecer a fundação Supabase antes de Auth/Organizations:

- inventariar o baseline remoto;
- versionar a primeira migration de hardening quando necessária;
- corrigir privilégios indevidos de `public.rls_auto_enable()` sem quebrar `ensure_rls`;
- provar em execução real que novas tabelas `public` continuam recebendo RLS automaticamente;
- reexecutar Security Advisor;
- versionar `.claude/commands/proxima.md`;
- adicionar normalização de line endings sem diff cosmético massivo;
- manter Auth, Organizations, Membership e domínio fora de escopo.

## 6. Achados obrigatórios desta rodada

### Supabase — `rls_auto_enable`

O Security Advisor encontrou `public.rls_auto_enable()` como `SECURITY DEFINER` com `EXECUTE` concedido a `PUBLIC`, `anon` e `authenticated`.

A função integra o event trigger `ensure_rls`, que ativa RLS automaticamente em novas tabelas `public`. A Rodada 001A deve endurecer os privilégios e provar que o trigger continua funcional.

Critérios mínimos:

1. consultar documentação oficial vigente antes do DDL;
2. registrar ACL anterior;
3. aplicar hardening via migration versionada;
4. provar RLS automático em tabela de teste reversível;
5. confirmar limpeza da tabela de prova;
6. rodar Security Advisor novamente;
7. não encerrar a rodada com warning relevante não justificado.

### Protocolo `/proxima`

`.claude/commands/proxima.md` existe localmente e deve ser versionado nesta rodada após verificar aderência ao protocolo canônico.

## 7. Explicitamente ainda fora de escopo

- cadastro/login;
- confirmação de e-mail;
- `proxy.ts` de Auth;
- Organizations;
- Membership;
- policies RLS de domínio;
- onboarding;
- Meta/Instagram;
- campanhas/leads;
- IA;
- deploy.

Nenhuma Rodada 001B está autorizada.

## 8. Próxima fase planejada, mas NÃO autorizada

Após aprovação da 001A, a próxima rodada prevista é **001B — Auth real**, incluindo e-mail/senha, confirmação de e-mail, logout, callback e refresh SSR com o padrão vigente do Next.js 16/Supabase.

Ela só poderá ser criada após auditoria GPT da 001A e nova autorização do fundador conforme o processo vigente.

## 9. Regras de handoff

### GPT

Ao planejar uma rodada ou correção:

1. atualizar este `estado.md`;
2. criar o mandato em `rodadas/gpt/` somente após autorização quando exigida;
3. nunca depender de texto solto no chat como única fonte de instrução;
4. após execução, ler o relatório em `rodadas/claude/` e auditar branch/diff/código/provas.

### Claude Code

Ao iniciar `/proxima`:

1. confirmar repositório/project ref;
2. ler `estado.md`;
3. ler `.gpt/PROJECT_PROMPT.md`;
4. abrir integralmente o mandato vigente;
5. executar somente a Rodada 001A;
6. escrever o relatório no caminho indicado;
7. atualizar o estado para `EXECUTADA — AGUARDANDO AUDITORIA GPT` ao concluir;
8. nunca promover a própria execução ou iniciar 001B.

## 10. Regra contra ambiguidade

Se houver conflito entre este arquivo e relatório antigo, vale o `estado.md` mais recente.

Se houver conflito entre o mandato vigente e documentos canônicos de produto/arquitetura, o executor deve parar e reportar a inconsistência; não deve escolher silenciosamente uma interpretação.
