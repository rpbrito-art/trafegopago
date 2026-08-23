# RELATÓRIO — RODADA 001E — BOOTSTRAP DE NEGÓCIO

Executor: Claude Code
Data: 2026-08-23
Mandato: `rodadas/gpt/RODADA_001E_BUSINESS_BOOTSTRAP.md`
Branch: `claude/rodada-001e-business-bootstrap`

## 1. Preflight

- git root `C:/Users/rpbri/Documents/trafegopago`; remote `origin` = `rpbrito-art/trafegopago`;
- partida em `main` limpa, sincronizada com `origin/main` (`052a3d8`);
- `supabase/.temp/project-ref` = `cbnxdoxpyioxjwgjhbtq`;
- baseline do mandato §3 conferido **antes** de mutar: 4 migrations, RLS ativo nas 2 tabelas,
  2 policies da 001D, `authenticated=r`, `anon` ausente do ACL, `service_role=arwdDxtm`,
  defaults de `postgres` em `public` e o default global de funções endurecidos, `ensure_rls`
  habilitado, `rls_auto_enable` com ACL `{postgres,service_role}`, zero objetos `public` owned
  por `supabase_admin`, Advisor só com o WARN conhecido. Nenhuma divergência.

## 2. Arquivos alterados

Novos:
- `supabase/migrations/20260823111051_create_business_profiles_and_bootstrap.sql`
- `src/lib/supabase/privileged.ts` (+ `.test.ts`)
- `src/lib/business/{money,schemas,account}.ts` (+ testes)
- `src/app/actions/business.ts` (+ `.test.ts`)
- `src/components/business/{create-business-form,business-section}.tsx` (+ teste)
- `scripts/business-bootstrap-001e.mjs`

Modificados: `src/app/conta/page.tsx`, `src/lib/env/server.ts`, `.env.example`.

## 3. Decisões não óbvias

1. **`organization_id` é a PK de `business_profiles`.** Um `id` próprio permitiria dois perfis
   para o mesmo tenant, que teríamos de proibir com unique redundante.
2. **`SECURITY INVOKER` + `search_path = ''`.** Quem executa já é `service_role` (BYPASSRLS +
   grants explícitos); um DEFINER adicionaria escalada permanente sem resolver problema algum.
3. **Advisory lock transacional por usuário na função**, não constraint. Não cabe unique para
   "no máximo uma membership por usuário no mundo" — multi-org é destino declarado do produto.
   O `EXISTS` sozinho é leitura e perde a corrida em READ COMMITTED; `pg_advisory_xact_lock`
   serializa o onboarding e morre com a transação, inclusive em erro.
4. **Pré-checagem de membership na action é UX, não garantia.** Roda em outra transação; a
   garantia é o lock. Está documentado no código para não ser confundida com defesa.
5. **Conversão monetária puramente textual.** `parseFloat("1234.56")*100` = `123455.99999…`;
   `money.ts` separa inteiro/fração como string e concatena. Recusa agrupamento irregular
   (`1.23.456`) e vírgula com 3 casas (`1,234`) em vez de adivinhar — ler isso como agrupamento
   multiplicaria o valor por mil silenciosamente.
6. **`/conta` lê com o cliente do usuário, sob RLS** — nunca com o privilegiado. Ler com
   `service_role` e filtrar em TypeScript trocaria garantia de banco por condição apagável.
7. **Estado da conta como união de 4 `kind`**, sem `else` genérico: é o `else` que criaria um
   segundo tenant para quem tem membership com organização indisponível.
8. **`BusinessSection` extraído da página** para ser testável sem DOM/renderer novo.

## 4. Provas

| prova | comando/fonte | resultado |
| --- | --- | --- |
| baseline pré-mutação (§3 do mandato) | SQL snapshot `pg_class`/`pg_policies`/`pg_default_acl`/`pg_proc` | conforme; sem divergência |
| migration aplicada | `supabase db push` | `20260823111051` aplicada |
| migration list local×remoto | `supabase migration list` | 5 = 5, sem drift |
| tabela/RLS/ACL efetivos | SQL pós-migration | `business_profiles` RLS on, `{authenticated=r, service_role=arwdDxtm}`, `anon` ausente |
| 18 CHECKs presentes | `pg_constraint` | 18 constraints `business_profiles_*` |
| função é INVOKER, search_path fechado | `pg_proc` | `prosecdef=false`, `proconfig={search_path=""}` |
| ACL da função | `pg_proc.proacl` | `{postgres=X, service_role=X}` — sem PUBLIC/anon/authenticated |
| **provas de banco/Data API (24)** | `node scripts/business-bootstrap-001e.mjs` | **24/24 aprovadas** |
| Security Advisor | `get_advisors` pós-migration | só o WARN conhecido `auth_leaked_password_protection` |
| resíduo final | SQL: counts de orgs/members/profiles/fixture users | `0/0/0/0` |
| invariantes 001A/001D | SQL final | `ensure_rls=O`; `rls_auto_enable` ACL intacta; defaults `postgres` (public r/S/f + global f) intactos; `supabase_admin` objs = 0 |
| secret fora do bundle público | `grep -r <secret> .next/static` e `.next/server` | 0 e 0 ocorrências |
| secret fora do client-side | `src/lib/supabase/privileged.test.ts` (varredura de `"use client"`) | nenhum ofensor |

Detalhe das 24 provas reais (usuários e sessões Auth reais, Data API com publishable key):
bootstrap por `service_role` cria exatamente 1 org + 1 membership `owner` ACTIVE + 1 profile,
com `America/Sao_Paulo`/`BRL` e ticket `125000` inteiro; falha de constraint no profile deixa
**zero** org/membership (erro `23514`); **duas chamadas concorrentes → 1 sucesso + 1 recusa
`P0001`, 1 tenant**; chamada repetida sequencial também recusada; A lê seu profile, B não lê
(nem apontando o `organization_id`); `anon` não lê (`42501`); A (owner) não faz
INSERT/UPDATE/DELETE em `business_profiles` nem escreve em `organizations`/`organization_members`
(`42501`); RPC negada para `authenticated` e `anon`, inclusive quando B envia `p_user_id` de A
(`42501`); `rls_auto_enable` segue inacessível a `authenticated`; membership INACTIVE e
organização INACTIVE retiram a leitura e a devolvem ao voltar a ACTIVE; CASCADE remove
memberships e profiles; zero resíduo.

## 5. Migrations / DDL

`20260823111051_create_business_profiles_and_bootstrap.sql` — única migration da rodada:
`public.business_profiles` (PK = `organization_id`, FK cascade, 18 CHECKs, RLS explícito),
grants (`anon` nada, `authenticated` só SELECT, `service_role` explícito), policy SELECT por
membership ACTIVE + organização ACTIVE, e
`public.bootstrap_organization_business_profile(...)` INVOKER com `REVOKE` de
`PUBLIC/anon/authenticated` e `GRANT EXECUTE` só a `service_role`.

Rollback: `drop function ...; drop table public.business_profiles;` — nenhum objeto de 001A–001D
foi alterado, então a reversão não toca o promovido.

## 6. Configuração remota

Nenhuma alteração de configuração remota aplicada nem necessária. `SUPABASE_SECRET_KEY` já
existia em `.env.local` (formato novo `sb_secret_…`) e passou a ser consumida pela aplicação.
`.env.example` atualizado para descrever o novo uso. **Pendente e fora do escopo desta rodada:**
a variável precisará existir no ambiente de deploy quando houver deploy — a CI atual não a exige.

## 7. Gates

| gate | resultado |
| --- | --- |
| `git diff --check` | limpo |
| `npm run lint` | 0 problemas |
| `npm run typecheck` | 0 erros |
| `npm test` | 17 arquivos, 236 testes, todos passando |
| `npm run build` | compilou; `/conta` continua dinâmica (ƒ) |
| provas de banco/Data API | 24/24 |
| Security Advisor | sem regressão |

`npm ci` não executado: `package.json`/`package-lock.json` não mudaram e o ambiente estava
consistente. CI remota roda no push da branch e é a prova limpa do conjunto.

## 8. Branch

`claude/rodada-001e-business-bootstrap` — push único com implementação, testes, script de prova,
relatório e `estado.md`.

## 9. Pendências, riscos e divergências

1. Nenhuma divergência entre mandato e documentação canônica foi encontrada.
2. `auth_leaked_password_protection` continua desabilitado (WARN conhecido, herdado).
3. Observação honesta da varredura de segredo: o valor da secret key aparece em
   `.next/cache/turbopack/*.sst` e `.next/dev/cache/turbopack/*.sst` — cache local do bundler.
   **Não** aparece em `.next/static` (bundle servido ao browser) nem em `.next/server`, e `.next`
   e `.env*` estão no `.gitignore`. Nada é publicado; fica registrado por transparência.
4. Ausente por escopo (mandato §12), não por esquecimento: edição de organização/perfil,
   convites, troca de role/status, multi-org switcher, delete, recuperação de senha.
5. `updated_at` de `business_profiles` continua responsabilidade do domínio (sem trigger),
   igual a `organizations` na 001C. Como esta rodada não tem edição, nenhum caminho o atualiza
   ainda.
6. A criação real pela UI (formulário → Server Action → RPC) não foi exercitada por E2E de
   browser: o mandato §10.2 pede prova proporcional e proíbe instalar framework E2E por ritual.
   O caminho está coberto por testes unitários da action (identidade verificada, rejeição de
   IDs/role/status do cliente, dupla submissão, erro sem vazamento) e pelas 24 provas reais da
   RPC/Data API que a action consome.

## 10. Conclusão

Escopo da 001E cumprido integralmente. `business_profiles` está versionado, tenant-scoped e
protegido nas duas camadas; o primeiro negócio é criado atomicamente a partir de identidade
verificada server-side; o browser não ganhou escrita direta em nenhuma das três tabelas; a
função privilegiada é inacessível a `anon`/`authenticated`; a secret key permanece server-only;
dupla submissão concorrente não cria dois tenants; `/conta` trata zero/uma/múltiplas memberships
sem escolher tenant silenciosamente; zero resíduo no Supabase remoto; nenhuma etapa posterior
foi antecipada.

Estado: **RODADA 001E — EXECUTADA — AGUARDANDO AUDITORIA GPT**. 001F não foi aberta.
