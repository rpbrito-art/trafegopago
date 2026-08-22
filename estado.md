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

Auditoria:

`rodadas/gpt/AUDITORIA_RODADA_000_BOOTSTRAP_TECNICO.md`

Relatório do Claude:

`rodadas/claude/RELATORIO_RODADA_000_BOOTSTRAP_TECNICO.md`

PR de promoção: `#1`

Merge em `main`: `9f0f6aaa205fe5b774faab92c34e8373e4ef7d6c`.

## 4. Estado corrente

**PRÓXIMA FASE EM PLANEJAMENTO — AGUARDANDO APROVAÇÃO DO FUNDADOR**

Nenhum mandato executável de Rodada 001 está autorizado neste momento.

O GPT deve apresentar o planejamento da próxima fase ao fundador. Somente após aprovação explícita poderá criar o mandato em `rodadas/gpt/`, atualizar este arquivo e autorizar `/proxima` a executar.

## 5. Próxima fase proposta

**Fundação Supabase — Auth + Organizations + Membership + RLS**.

Objetivos propostos:

- autenticação Supabase com e-mail/senha e confirmação de e-mail;
- integração SSR correta para Next.js 16 usando Proxy (`proxy.ts`) para refresh de sessão;
- `organizations` e `organization_members` como raiz de tenancy;
- bootstrap seguro da primeira organização do usuário;
- RLS explícita e testada;
- grants explícitos para Data API conforme defaults atuais do Supabase;
- provas de isolamento entre duas organizações/dois usuários;
- tratamento inicial de logout/sessão;
- migrations versionadas como fonte de verdade.

O planejamento ainda precisa ser aprovado pelo fundador antes da execução.

## 6. Achados obrigatórios para a próxima fase

### Supabase — `rls_auto_enable`

O Security Advisor encontrou `public.rls_auto_enable()` como `SECURITY DEFINER` com `EXECUTE` concedido a `PUBLIC`, `anon` e `authenticated`.

A função integra o event trigger `ensure_rls`, que ativa RLS automaticamente em novas tabelas `public`. O mecanismo deve ser preservado, mas os privilégios indevidos precisam ser corrigidos e provados antes da exposição do domínio.

A próxima rodada deve:

1. revisar os privilégios da função;
2. remover capacidade de execução indevida por papéis públicos quando tecnicamente seguro;
3. provar que o event trigger continua habilitando RLS em novas tabelas;
4. executar o Supabase Security Advisor novamente;
5. não considerar a fundação de RLS aprovada enquanto houver warning relevante sem justificativa.

### Auth Next.js 16

A documentação atual usa `proxy.ts`/Proxy, não o antigo `middleware.ts`, para refresh da sessão SSR. Proteção de identidade deve usar `supabase.auth.getClaims()` em vez de confiar em `getSession()` para autorização server-side.

## 7. Housekeeping pendente não bloqueante

- `.claude/commands/proxima.md` existe apenas localmente e deve ser versionado para tornar o protocolo reproduzível.
- adicionar `.gitattributes`/normalização de line endings deve ser considerado.
- secret scanning automatizado em CI permanece hardening futuro.
- monitorar atualização compatível do ESLint; não fazer upgrade cego.

## 8. Regras de handoff

### GPT

Ao planejar uma rodada ou correção:

1. atualizar este `estado.md`;
2. criar o mandato em `rodadas/gpt/` somente após autorização quando exigida;
3. nunca depender de texto solto no chat como única fonte de instrução;
4. após execução, ler o relatório em `rodadas/claude/` e auditar branch/diff/código/provas.

### Claude Code

Ao iniciar `/proxima`:

1. ler `estado.md`;
2. ler `.gpt/PROJECT_PROMPT.md`;
3. só executar se existir mandato vigente explicitamente autorizado;
4. se o estado estiver aguardando aprovação/auditoria, não implementar nada;
5. escrever relatório no caminho indicado pela rodada;
6. nunca promover a própria execução.

## 9. Regra contra ambiguidade

Se houver conflito entre este arquivo e um relatório antigo, vale o `estado.md` mais recente.

Se houver conflito entre uma rodada em `rodadas/gpt/` e documentos canônicos de produto/arquitetura, o executor deve parar e reportar a inconsistência; não deve escolher silenciosamente uma interpretação.
