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
- zero policies de domínio até a próxima rodada;
- `anon` e `authenticated` sem privilégios funcionais nas duas tabelas atuais;
- `ensure_rls` permanece ativo;
- CI do head final da 001C verde.

A reciclagem de `HISTORY_SUMMARY.md` pode incorporar a 001C junto da próxima etapa substantiva; não criar housekeeping isolado apenas para isso.

## 3. Estado corrente

**RODADA 001C — ORGANIZATIONS + MEMBERSHIP**

Status: **APROVADA E PROMOVIDA**.

PR: #4
Merge: `a6b2e912f8d54005d1decf69cb4e4bf8335d31ec`
Head auditado: `a599d68220095d2fb147529684410ec137949435`
CI final: run `32606516377` — success
Auditoria: `rodadas/gpt/AUDITORIA_RODADA_001C_ORGANIZATIONS_MEMBERSHIP.md`
Migration: `20260822234354_create_organizations_and_members.sql`

Não há mandato executável pendente.

`/proxima` deve parar aguardando nova autorização.

Nenhuma 001D está autorizada.

## 4. Provas consolidadas da 001C

- migration local/remota registrada;
- somente `organizations` e `organization_members` foram adicionadas ao schema `public`;
- PKs, FKs, CHECKs, defaults e índice `organization_members_user_id_idx` conferidos diretamente;
- `relrowsecurity=true` nas duas tabelas;
- zero policies nas duas tabelas, deliberadamente;
- ACL final das duas tabelas: somente `postgres` e `service_role`;
- `anon` e `authenticated`: SELECT/INSERT/UPDATE/DELETE = false nas duas tabelas;
- `ensure_rls` ativo;
- zero linhas residuais em organizations/memberships;
- nenhuma função ou trigger de domínio criada;
- CI final verde.

## 5. Pendências e gates para a próxima etapa

1. **Default privileges de tabelas no schema `public`**: `pg_default_acl` ainda concede ALL a `anon`/`authenticated` para novas tabelas criadas por `postgres`/`supabase_admin`. As duas tabelas atuais foram fechadas por REVOKE escopado. Esta pendência é **bloqueante antes de qualquer nova tabela futura** e deve ser tratada na 001D.
2. **Policies RLS**: os INFO `rls_enabled_no_policy` são esperados até a 001D, que deverá criar policies e provas adversariais.
3. **Default privileges de funções**: antes da primeira função própria sensível, definir política mínima de EXECUTE; nenhuma função própria foi criada ainda.
4. `auth_leaked_password_protection` permanece WARN conhecido de Auth; hardening antes de clientes reais/produção.
5. Brevo Free permanece SMTP provisório de desenvolvimento.
6. Rate limiting próprio permanece futuro conforme `SECURITY_MODEL.md`.

## 6. Próxima direção planejada, ainda não autorizada

Rodada 001D — **Default privileges + grants + RLS policies + prova adversarial 2 usuários × 2 organizações**.

Escopo esperado:

- corrigir default privileges de tabelas antes de ampliar o schema;
- definir grants mínimos coerentes com a Data API;
- criar policies de membership para `organizations` e `organization_members`;
- provar membro lê apenas org própria e não lê/escreve org alheia;
- provar não membro sem acesso;
- provar comportamento de roles onde aplicável;
- usar ao menos 2 usuários e 2 organizações em prova controlada;
- limpar fixtures/provas ou preservar somente se explicitamente autorizado.

A 001D precisa de nova autorização explícita antes de `/proxima` executar qualquer implementação.

## 7. Continuidade

Descompasso temporário de numeração/documentação é normal e deve ser corrigido na próxima etapa substantiva quando não houver risco operacional.

Branch/relatório existente não significa mudança incorporada. Estado efetivo continua sendo `main` + este arquivo + promoção real.