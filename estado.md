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

Status: **AUTORIZADA — AGUARDANDO EXECUÇÃO PELO CLAUDE CODE**.

Mandato vigente:

`rodadas/gpt/RODADA_001A_BASELINE_SUPABASE_SEGURANCA.md`

Relatório esperado:

`rodadas/claude/RELATORIO_RODADA_001A_BASELINE_SUPABASE_SEGURANCA.md`

O comando `/proxima` está autorizado a executar **somente** esta rodada.

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
