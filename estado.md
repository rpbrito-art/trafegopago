# ESTADO — Tráfego Pago

Atualizado: 2026-08-22

Este é o **estado operacional canônico da execução corrente**. Para histórico promovido, usar `docs/00-governanca/HISTORY_SUMMARY.md`; não reler relatórios antigos por padrão.

## 1. Repositório e ambiente autorizados

- GitHub: `rpbrito-art/trafegopago`
- Pasta local esperada: `C:\Users\rpbri\Documents\trafegopago`
- `rpbrito-art/business-weaver`: **fora de escopo**
- Supabase project ref: `cbnxdoxpyioxjwgjhbtq`

## 2. Estado incorporado à main

Promovido e disponível:

- Rodada 000 — Bootstrap Técnico;
- Rodada 001A — Baseline Supabase e Segurança;
- Rodada 001B — Auth Real;
- Rodada 001C — Organizations + Membership;
- Next.js 16.3.2 + React 19.2.8 + TypeScript;
- Auth real por e-mail/senha com confirmação SSR, sessão/cookies e rota protegida;
- `public.organizations` e `public.organization_members` criadas por migration versionada;
- constraints/FKs/índice de membership conforme contrato;
- RLS explicitamente habilitado nas duas tabelas;
- zero policies de domínio antes da execução da 001D;
- `anon` e `authenticated` sem privilégios funcionais nas duas tabelas atuais;
- `ensure_rls` permanece ativo;
- método documental enxuto e histórico reciclado até a 001C.

Detalhes: `docs/00-governanca/HISTORY_SUMMARY.md`.

## 3. Estado corrente

**RODADA 001D — DEFAULT PRIVILEGES + GRANTS + RLS + ISOLAMENTO**

Status: **AUTORIZADA — AGUARDANDO EXECUÇÃO PELO CLAUDE CODE**.

Mandato vigente:

`rodadas/gpt/RODADA_001D_RLS_TENANCY_ISOLAMENTO.md`

Branch esperada:

`claude/rodada-001d-rls-tenancy-isolamento`

Relatório esperado:

`rodadas/claude/RELATORIO_RODADA_001D_RLS_TENANCY_ISOLAMENTO.md`

`/proxima` está autorizado a executar **somente a Rodada 001D**.

Nenhuma etapa posterior está autorizada.

## 4. Escopo autorizado da 001D

Fechar a autorização de leitura e o isolamento multi-tenant da fundação já criada:

- corrigir default privileges inseguros de novas tabelas `public` para as roles criadoras relevantes;
- fechar default EXECUTE inseguro de futuras funções `public` para `PUBLIC`/browser roles;
- definir grants mínimos: `authenticated` com SELECT apenas em `organizations` e `organization_members`; `anon` sem acesso;
- criar policy de `organization_members` para leitura somente da própria membership;
- criar policy de `organizations` para leitura somente quando existir membership ativa do próprio usuário e a organização estiver ativa;
- manter INSERT/UPDATE/DELETE diretos pelo browser fechados;
- provar isolamento real com 2 usuários × 2 organizações usando sessões/JWTs reais;
- provar que `owner` não ganha bypass de escrita;
- limpar usuários, organizações e objetos-probe temporários ao final;
- rodar Security Advisor e CI final.

Não criar novas tabelas, `business_profiles`, onboarding, convites, UI de Organizations, policies de escrita ou função `SECURITY DEFINER` persistente.

## 5. Baseline e riscos conhecidos

1. `pg_default_acl` observado na 001C concede privilégios automáticos de novas tabelas `public` a `anon`/`authenticated` para `postgres` e `supabase_admin`. Esta pendência é **bloqueante antes de qualquer nova tabela** e deve ser resolvida nesta 001D.
2. As duas tabelas atuais têm RLS habilitado e zero policies; os INFO `rls_enabled_no_policy` são esperados antes da 001D e devem desaparecer depois das policies.
3. `public.rls_auto_enable()` deve preservar a ACL segura promovida na 001A; `ensure_rls` deve permanecer ativo.
4. `auth_leaked_password_protection` permanece WARN conhecido de Auth e não bloqueia a 001D se for o único WARN pré-existente.
5. Brevo Free permanece SMTP provisório de desenvolvimento.

## 6. Decisão de segurança da 001D

O desenho autorizado evita função privilegiada:

- `organization_members` SELECT: `user_id = auth.uid()`;
- `organizations` SELECT: existe membership ativa do próprio usuário para a organização;
- nenhuma policy de escrita nesta rodada.

Se esse desenho não puder funcionar sem `SECURITY DEFINER`, o Claude deve **parar e reportar**, não criar helper privilegiado por conta própria.

## 7. Próxima direção após 001D

Ainda **não autorizada**.

Depois de a 001D ser executada, auditada e promovida, o GPT deverá planejar a próxima etapa substantiva da Fundação Supabase/Auth/Tenancy, considerando o roadmap e as pendências restantes (`business_profiles`, fluxo mínimo de conta/organização e demais gates da Fase 1).

Não antecipar automaticamente 001E apenas por numeração histórica; definir a próxima rodada com base no estado real após a auditoria.

## 8. Continuidade

Descompasso temporário de numeração/documentação é normal e deve ser corrigido na próxima etapa substantiva quando não houver risco operacional.

Branch/relatório existente não significa mudança incorporada. Estado efetivo continua sendo `main` + este arquivo + promoção real.