# ESTADO — Tráfego Pago

Atualizado: 2026-08-22

Este é o **estado operacional canônico**. Para histórico promovido, usar `docs/00-governanca/HISTORY_SUMMARY.md`; não reler relatórios antigos por padrão.

## 1. Repositório e ambiente autorizados

- GitHub: `rpbrito-art/trafegopago`
- Pasta local esperada: `C:\Users\rpbri\Documents\trafegopago`
- `rpbrito-art/business-weaver`: **fora de escopo**
- Supabase project ref: `cbnxdoxpyioxjwgjhbtq`

## 2. Estado incorporado à main

Promovido e disponível:

- Next.js 16.3.2 + React 19.2.8 + TypeScript;
- App Router;
- lint, typecheck, Vitest, build e GitHub Actions CI;
- clientes Supabase browser/server com `@supabase/ssr` e publishable key;
- convenção de env/secrets;
- migration `20260822212544_harden_rls_auto_enable_privileges.sql` aplicada/versionada;
- `public.rls_auto_enable()` sem EXECUTE para `PUBLIC`, `anon` e `authenticated`;
- `ensure_rls` ativo;
- Security Advisor sem achados após 001A;
- schema `public` sem tabelas de domínio;
- `/proxima` e `.gitattributes` versionados.

Rodadas promovidas:

- Rodada 000 — Bootstrap Técnico;
- Rodada 001A — Baseline Supabase e Segurança.

Detalhes históricos: `docs/00-governanca/HISTORY_SUMMARY.md`.

Ainda não existem:

- Auth funcional do produto;
- organizations/memberships;
- RLS de domínio;
- onboarding;
- Meta/Instagram;
- campanhas/leads;
- IA de produto;
- deploy de produção.

## 3. Método operacional vigente

O método foi otimizado após a 001A:

- bootstrap por working set, não por varredura documental;
- `docs/00-governanca/ACTIVE_DOCS.md` define documentos ativos;
- cada mandato tem READ SET mínimo;
- `HISTORY_SUMMARY.md` substitui leitura rotineira de relatórios antigos;
- política de reciclagem: `docs/00-governanca/DOCUMENTATION_LIFECYCLE.md`;
- relatório Claude alvo ≤150 linhas/15 KB;
- evidência por referência, sem transcrever logs/documentação inteira;
- gates locais proporcionais ao tipo de alteração;
- `npm ci` local apenas quando justificável;
- operações remotas agrupadas;
- preferir um único handoff/push auditável para evitar CI redundante;
- GPT resolve branch/head/SHA e faz auditoria independente.

Última reciclagem documental: após a Rodada 001A.

## 4. Estado corrente

**RODADA 001B — AUTH REAL**

Status: **EXECUTADA — AGUARDANDO AUDITORIA GPT**.

Mandato vigente:

`rodadas/gpt/RODADA_001B_AUTH_REAL.md`

Branch esperada:

`claude/rodada-001b-auth-real`

Relatório esperado:

`rodadas/claude/RELATORIO_RODADA_001B_AUTH_REAL.md`

Relatório entregue: sim.

Execução (Claude Code, 2026-08-22):

- branch `claude/rodada-001b-auth-real` publicada; sem merge na `main`;
- gates locais: lint, typecheck, `npm test` (188 testes) e build — todos verdes;
- smoke test real contra `cbnxdoxpyioxjwgjhbtq` e a aplicação: 27/27 provas;
- nenhuma migration, tabela, tenancy ou policy de domínio criada;
- `.claude/commands/proxima.md` alinhado ao método por working set.

**Bloqueio aberto — ação humana:** a configuração remota de Auth (template de
confirmação apontando para `/auth/confirm` e redirect URLs) ainda não foi aplicada.
O `supabase/config.toml` e `supabase/templates/confirmation.html` estão versionados;
falta `supabase config push` (ou ajuste equivalente no Dashboard). Não executado pelo
Claude porque `config push` envia o config.toml inteiro, não só o bloco `[auth]`.
Detalhes na seção 5 do relatório.

O comando `/proxima` não está autorizado a iniciar a 001C.

## 5. Objetivo da 001B

Provar identidade e sessão reais com Supabase Auth:

- cadastro e-mail/senha;
- confirmação de e-mail SSR;
- login;
- logout;
- sessão em cookies;
- `proxy.ts` conforme padrão vigente Next.js 16/Supabase;
- verificação server-side segura de identidade;
- rota protegida mínima;
- bloqueio de open redirect;
- smoke test real do fluxo;
- alinhamento de `/proxima` ao método eficiente/reciclagem documental.

Não há migration de tenancy/domínio planejada nesta rodada.

## 6. Fora de escopo da 001B

- `organizations`;
- `organization_members`;
- profiles próprios;
- migrations/policies RLS de domínio;
- onboarding empresarial;
- Meta/Instagram;
- campanhas/leads;
- IA;
- pagamentos;
- deploy;
- social login, MFA, recuperação de senha e magic link como feature de produto.

## 7. Pendências futuras já conhecidas

- `service_role` ainda executa `public.rls_auto_enable()`; definir política geral de privilégio mínimo antes de funções privilegiadas próprias;
- decidir default privileges para futuras funções em schema exposto antes da primeira função própria de domínio;
- warning de tooling/ESLint segue não bloqueante.

Não criar rodada isolada para essas pendências se puderem entrar com segurança na próxima etapa substantiva apropriada.

## 8. Regras de handoff

### Claude Code

Ao receber `/proxima`:

1. confirmar repo/project ref;
2. ler `estado.md`, `.gpt/PROJECT_PROMPT.md`, `ACTIVE_DOCS.md` e o mandato;
3. respeitar READ SET;
4. executar somente 001B;
5. entregar relatório compacto;
6. atualizar status para `EXECUTADA — AGUARDANDO AUDITORIA GPT`;
7. não promover nem iniciar 001C.

### GPT

Após entrega:

1. auditar branch/diff/código/CI e Supabase Auth real quando aplicável;
2. não depender apenas do relatório Claude;
3. corrigir ou promover;
4. atualizar `estado.md`, `ACTIVE_DOCS.md` e histórico resumido quando necessário.

## 9. Continuidade

Descompasso temporário de numeração/documentação é normal e deve ser corrigido na próxima etapa substantiva quando não houver risco operacional.

Branch/relatório existente não significa mudança incorporada. Estado real = `estado.md` + conteúdo promovido na `main`.