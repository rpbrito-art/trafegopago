# HISTORY SUMMARY — TRÁFEGO PAGO

Atualizado: 2026-08-23

Este arquivo resume somente estado **auditado e promovido**. Ele substitui a leitura rotineira de relatórios antigos; as evidências originais continuam preservadas em `rodadas/` e no Git.

## Fundação documental — Etapas 1, 2A, 2B e 3

- MVP inicial definido para Instagram + Meta Ads + aprendizagem de aquisição;
- pesquisa técnica e revisão adversarial concluídas;
- arquitetura base: Next.js/TypeScript + Supabase + APIs oficiais Meta + AI Router multi-provedor;
- tenancy por organização, RLS, approval gate para gasto, IA sem autonomia financeira, cálculos determinísticos fora de LLM e custo por execução;
- em 2026-08-23, o modelo de produto foi generalizado em `docs/01-produto/GROWTH_INTELLIGENCE_CANONICAL.md`: mídia paga deixa de ser obrigação, jornadas passam a ser configuráveis, conteúdo/criativo/anúncio são distintos, oportunidades não têm quantidade fixa, personas são evidência/hipótese e a experiência obedece à Lei da Simplicidade Guiada.

Referências atuais: `docs/01-produto/MVP_CANONICAL.md`, `docs/01-produto/GROWTH_INTELLIGENCE_CANONICAL.md` e `docs/03-canonical/`.

## Rodada 000 — Bootstrap Técnico

Resultado promovido:
- Next.js 16.3.2 + React 19.2.8 + TypeScript;
- App Router;
- lint, typecheck, Vitest e build;
- GitHub Actions CI;
- clientes Supabase browser/server com `@supabase/ssr` e publishable key;
- convenção de env/secrets;
- nenhum schema de domínio antecipado.

Auditoria: `rodadas/gpt/AUDITORIA_RODADA_000_BOOTSTRAP_TECNICO.md`
PR #1. Merge: `9f0f6aaa205fe5b774faab92c34e8373e4ef7d6c`.

## Rodada 001A — Baseline Supabase e Segurança

Resultado promovido:
- migration `20260822212544_harden_rls_auto_enable_privileges.sql`;
- `EXECUTE` de `public.rls_auto_enable()` removido de `PUBLIC`, `anon` e `authenticated`;
- `postgres` e `service_role` permanecem com EXECUTE;
- event trigger `ensure_rls` auto-habilita RLS em novas tabelas `public`;
- prova transacional sem resíduo;
- `/proxima` e convenções de continuidade versionados.

Auditoria: `rodadas/gpt/AUDITORIA_RODADA_001A_BASELINE_SUPABASE_SEGURANCA.md`
PR #2. Merge: `fb9bc62e6cf25e03e39255bff7042e330a80e1d6`.

## Rodada 001B — Auth Real

Resultado promovido:
- autenticação real por e-mail/senha com Supabase Auth;
- confirmação SSR `/auth/confirm` usando `token_hash` + `verifyOtp`;
- template remoto/versionado com `type=email`;
- sessão SSR em cookies com `@supabase/ssr`;
- Next.js 16 `proxy.ts`;
- página protegida com `getClaims()` server-side;
- proteção contra open redirect;
- fluxo real cadastro → confirmação → `/conta` → logout → bloqueio → login posterior validado 9/9;
- SMTP Brevo Free apenas para desenvolvimento.

Auditoria: `rodadas/gpt/AUDITORIA_RODADA_001B_AUTH_REAL.md`
PR #3. Merge: `4819875007784f9bc016abd57202fe1fe9a7063b`.

## Rodada 001C — Organizations + Membership

Resultado promovido:
- migration `20260822234354_create_organizations_and_members.sql`;
- `public.organizations` e `public.organization_members`;
- PKs, FKs, CHECKs, defaults e índice por `organization_members.user_id`;
- RLS explicitamente habilitado;
- zero policies deliberadamente, deixando autorização para a 001D;
- `anon` e `authenticated` sem privilégios funcionais nas duas tabelas;
- constraints/cascades provados sem resíduo;
- `ensure_rls` preservado.

Auditoria: `rodadas/gpt/AUDITORIA_RODADA_001C_ORGANIZATIONS_MEMBERSHIP.md`
PR #4. Merge: `a6b2e912f8d54005d1decf69cb4e4bf8335d31ec`.

## Rodada 001D — Default privileges + Grants + RLS + Isolamento

Resultado promovido após Correções 001D-01 e 001D-02:
- migrations `20260823003128_harden_default_privileges_grants_and_rls_policies.sql` e `20260823103521_revoke_global_default_execute_on_functions.sql`;
- defaults futuros de tabelas/sequências de `postgres` em `public` tornados opt-in;
- default global de EXECUTE de funções futuras owned por `postgres` fechado;
- `authenticated` recebe somente SELECT em `organizations` e `organization_members`;
- `anon` permanece sem acesso;
- `service_role` preservado por grants explícitos;
- membership lê somente própria linha; organizations exige organização ACTIVE + membership própria ACTIVE;
- nenhuma policy de escrita e nenhuma nova `SECURITY DEFINER`;
- prova adversarial real Auth/JWT/Data API 2 usuários × 2 organizações: 21/21;
- cross-tenant negado, estados INACTIVE retiram acesso e `owner` não ganha escrita;
- fixtures removidas;
- `rls_auto_enable()` e `ensure_rls` preservados;
- `supabase_admin` possui zero objetos owned em `public`;
- Advisor sem regressão;
- CI final `32635190849` verde.

Decisões persistentes:
- default ACL residual de `supabase_admin` é aceito enquanto nenhum objeto `public` pertencer a essa role;
- o default global de `PUBLIC EXECUTE` precisou ser revogado sem `IN SCHEMA` para funções futuras de `postgres`.

Auditoria: `rodadas/gpt/AUDITORIA_RODADA_001D_RLS_TENANCY_ISOLAMENTO.md`
PR #5. Merge: `178c2aa0e4ada91ae2bae73d2ff97c21f27c0222`.

## Rodada 001E — Bootstrap de Negócio

Resultado promovido:
- migration `20260823111051_create_business_profiles_and_bootstrap.sql`;
- `public.business_profiles` com `organization_id` como PK/FK tenant-scoped;
- RLS ativo, `anon` sem acesso, `authenticated` somente SELECT e `service_role` com grant explícito;
- leitura do profile exige membership própria ACTIVE + organização ACTIVE;
- RPC `public.bootstrap_organization_business_profile(...)` é `SECURITY INVOKER`, search_path fechado e EXECUTE somente para `service_role`;
- criação organization + membership owner ACTIVE + business_profile é atômica;
- advisory lock por usuário impede dois tenants em dupla submissão concorrente;
- cliente Supabase privilegiado passou a existir somente server-side com `SUPABASE_SECRET_KEY`;
- Server Action usa identidade de `getClaims()`/`requireUser()` e não aceita user/tenant/role/status do browser;
- `/conta` trata explicitamente zero, uma ou múltiplas memberships e organização indisponível;
- parsing monetário do ticket em unidade menor é determinístico, sem float persistido;
- script real Auth/JWT/Data API: 24/24 provas reportadas;
- auditoria independente confirmou schema, grants, ACLs, RLS, zero resíduos e invariantes 001A/001D;
- Advisor final só com WARN conhecido de proteção contra senha vazada;
- branch foi reconciliada com o novo Growth Intelligence antes da promoção;
- CI reconciliada `32638010339` verde.

Ressalvas de produto não bloqueantes:
- o texto do formulário 001E ainda é parcialmente paid-first;
- o onboarding inicial ainda concentra vários campos em um formulário;
- a próxima evolução de produto deve migrar para objetivo/jornada geral e perfil progressivo conforme Growth Intelligence, sem desfazer a fundação segura.

Auditoria: `rodadas/gpt/AUDITORIA_RODADA_001E_BUSINESS_BOOTSTRAP.md`
PR #6. Merge: `7cf7786320f49c1d5b3f486f4ba8ca4919fa2ffd`.

## Pendências transversais ainda abertas

- `auth_leaked_password_protection` desabilitado: hardening antes de clientes reais/produção;
- SMTP de produção/domínio autenticado ainda não definido;
- default ACL residual de `supabase_admin` monitorado enquanto inerte;
- funções futuras exigem GRANT EXECUTE explícito;
- recovery/reset de senha ainda não implementado;
- convites/gestão de membros, edição de negócio, multi-org switcher e exclusão continuam posteriores;
- ambiente de deploy deverá receber `SUPABASE_SECRET_KEY` quando houver deploy;
- modelo e UX futuros devem ser harmonizados com `GROWTH_INTELLIGENCE_CANONICAL.md` dentro da próxima etapa substantiva apropriada;
- rate limiting próprio continua futuro conforme risco/endpoint.

## Estado após a promoção da 001E

A fundação Auth + tenancy + primeiro contexto de negócio está promovida: autenticação real, schema tenant, grants/RLS/isolamento, `business_profiles` e bootstrap atômico server-only.

Não há mandato executável pendente. A Fase 1 não é considerada automaticamente encerrada; seu restante deve ser avaliado explicitamente.

Antes de qualquer nova rodada de produto, aplicar o gate de leitura integral de `GROWTH_INTELLIGENCE_CANONICAL.md`.

Não é necessário reler relatórios completos das Rodadas 000–001E por padrão; usar este resumo e abrir evidência histórica somente quando surgir dependência concreta.