# RELATÓRIO — RODADA 002A — OPERATIONS + AUDIT FOUNDATION

Executor: Claude Code
Data: 2026-08-23
Branch: `claude/rodada-002a-operations-audit-foundation`

Status: **002A EXECUTADA — AGUARDANDO AUDITORIA GPT**

---

## 1. Preflight

| item | resultado |
| --- | --- |
| raiz git | `C:/Users/rpbri/Documents/trafegopago` |
| remote `origin` | `rpbrito-art/trafegopago` |
| Supabase project ref | `cbnxdoxpyioxjwgjhbtq` (`supabase/.temp/project-ref`, linked) |
| branch | criada a partir de `origin/main` (`a8b55bf`), conforme mandato §8.2 |
| baseline antes de mutar | **5 migrations**, última `20260823111051`; 3 tabelas em `public`, todas com RLS; 0 objetos owned por `supabase_admin`; 1 conta real; 0 fixtures |

READ SET cumprido. Gate de produto não se aplica (mandato §3 e `ACTIVE_DOCS`): a rodada é
infraestrutura interna e nenhuma proposta de produto/UX surgiu.

---

## 2. Arquivos

Novos:

- `supabase/migrations/20260823160000_create_operations_and_audit_events.sql`;
- `src/lib/operations/contracts.ts` + `contracts.test.ts`;
- `scripts/operations-audit-002a.mjs` — prova funcional;
- `scripts/sql/operations-audit-002a-catalog.sql` — provas estruturais versionadas.

Alterados: `estado.md`, este relatório. Nenhum arquivo de rodada anterior tocado.

---

## 3. Decisões não óbvias

1. **`service_role` sem DELETE em nenhuma das duas tabelas.** O mandato pede "somente os
   privilégios necessários". Operação registrada é evidência do que foi tentado; apagá-la
   destruiria a proteção contra repetição. A limpeza de fixtures acontece pelo CASCADE da FK
   com `organizations` — provado no script.
2. **O append-only de `audit_events` NÃO se apoia em RLS.** `service_role` é `BYPASSRLS`
   (verificado: `pg_roles.rolbypassrls = true`). Se o mecanismo fosse policy, seria contornado
   pela própria role que usa a tabela. Apoia-se na ACL: `ar` — INSERT e SELECT, nada mais.
3. **Zero policies nas duas tabelas, de propósito.** São infraestrutura interna server-only.
   RLS habilitado + zero policies significa que qualquer role sem BYPASSRLS lê zero linhas —
   segunda tranca atrás da ausência de grant.
4. **`actor_user_id` com `on delete set null`, não `cascade`.** O usuário some, o evento fica.
   Um histórico que se apaga junto com o autor não é auditoria.
5. **`approval_id` não criado**, embora conste no `DATA_MODEL` §13. O mandato §4.2 o exclui
   explicitamente: `approvals` não existe e pertence à fundação financeira posterior. Registro
   a divergência canônico↔mandato aqui, com o mandato prevalecendo.
6. **Sem CHECK de coerência temporal.** Ver §4 — foi um defeito meu, pego pela própria prova.
7. **`operation_type` é `text`, não enum.** Cada integração futura traz seus tipos; um enum
   exigiria migration a cada adição.
8. **`correlation_id` é `not null` em `operations` e nullable em `audit_events`.** Toda
   execução técnica tem correlação; nem todo evento de negócio nasce dentro de uma.

---

## 4. Defeito encontrado pela prova, e como foi corrigido

A primeira aplicação da migration incluía dois CHECK de coerência temporal que eu acrescentei
invocando `DATA_MODEL` §16 — não pedidos pelo mandato:

    check (updated_at >= created_at)
    check (completed_at is null or completed_at >= created_at)

O script de prova falhou em "service_role atualiza operation" com `23514`. Causa: `created_at`
nasce de `now()` **no servidor**, enquanto `updated_at` é escrito por **quem chama**, de outra
máquina. O relógio do Supabase estava ~0,6 s à frente do cliente — medição já registrada na
001F — e isso basta para reprovar um update imediato.

Não é um detalhe de teste: é exatamente o caminho mais comum do worker futuro, que cria
`PENDING` e marca `CLAIMED` logo em seguida. O CHECK parecia defensivo e na prática converteria
skew de NTP em erro de escrita. Coerência temporal correta exigiria `now()` do próprio banco via
trigger — o projeto não usa triggers e o mandato não os autoriza.

**Correção, e por que desta forma:** a migration ainda não estava commitada, nem promovida, nem
aplicada em outro ambiente, e as tabelas estavam vazias. Corrigi o arquivo e reapliquei:

1. `supabase db query --linked "drop table ..."` (as duas tabelas, vazias);
2. `supabase migration repair --status reverted 20260823160000` — mecanismo oficial do CLI;
3. correção do arquivo;
4. `supabase db push`.

O mandato §4.1 proíbe modificar migrations **já promovidas** e exige **exatamente uma** migration
nova, com histórico 5 → 6. Uma sétima migration corretiva violaria o mandato; deixar o CHECK
entregaria uma fundação com armadilha conhecida. O caminho acima honra as duas exigências e o
histórico final tem 6 migrations com um único arquivo, correto.

Registro explícito para a auditoria: **houve manipulação do histórico de migration remoto**,
pelo comando oficial `migration repair`, em migration não promovida e sobre tabelas vazias.

---

## 5. Provas

Funcionais — `node scripts/operations-audit-002a.mjs`: **42/42**.

| prova | resultado |
| --- | --- |
| `anon` não lê nem escreve nas duas tabelas | `42501` |
| `authenticated` **membro ACTIVE** não lê nem escreve nas duas | `42501` |
| mesmo usuário lê a própria organização (baseline 001C/001D intacto) | ok |
| `service_role` cria/atualiza/consulta `operations` | ok; defaults `PENDING`, `attempt_count=0`, `correlation_id` gerado |
| mesma `(org, tipo, chave)` não cria segunda operation | `23505` |
| **6 inserts concorrentes** com a mesma chave | exatamente 1 sobrevive, 5 conflitos |
| mesma chave em organização diferente | coexiste |
| `attempt_count` negativo | `23514` |
| `status` / `last_error_class` fora da allowlist | `23514` |
| campos em branco / acima do teto | `23514` |
| `service_role` insere e consulta `audit_events` | ok |
| `service_role` **não** consegue UPDATE nem DELETE em `audit_events` | `42501`, evento íntegro depois |
| metadata não-objeto, escalar ou acima do teto | `23514` |
| localização por `correlation_id` nas duas tabelas | ok |
| FK: organização inexistente | `23503` |
| CASCADE: remover organização leva as operations | ok |
| cleanup | 0 operations, 0 audit_events, 0 organizations, 0 fixtures em `auth.users` |

Estruturais — `scripts/sql/operations-audit-002a-catalog.sql` (versionado, read-only):

| prova | resultado |
| --- | --- |
| migration history | **6**, última `20260823160000` |
| tabelas em `public` | 5, **todas** com RLS |
| ACL `operations` | `service_role=arw` — sem DELETE |
| ACL `audit_events` | `service_role=ar` — sem UPDATE, sem DELETE |
| `anon`/`authenticated` na ACL das novas | **ausentes** |
| policies nas novas | 0 (deliberado) |
| owner | `postgres` nas duas |
| constraints `operations` | 15 |
| índices | `operations` 4 (inclui o único de idempotência), `audit_events` 3 (inclui parcial de `correlation_id`) |
| `public` owned por `supabase_admin` | 0 |
| event trigger `ensure_rls` | presente e habilitado |
| default privileges 001D | sem concessão a `anon`/`authenticated` |

---

## 6. Migration/DDL

Uma única migration: `20260823160000_create_operations_and_audit_events.sql`. Histórico remoto
**5 → 6**. Nenhuma migration promovida foi modificada. Nenhum DDL fora da migration no estado
final — o `drop table` da §4 desfez a aplicação intermediária e a versão corrigida recriou tudo
pelo `db push`.

Rollback: as duas tabelas são novas e não têm dependentes; `drop table` as remove sem afetar o
estado promovido 000–001F.

---

## 7. Configuração remota

Nenhuma. Nada tocado em Auth, SMTP, Gmail ou Dashboard. Nenhum segredo novo. Nenhum gate humano
solicitado, conforme mandato §9.

---

## 8. Gates

lint (0 warnings), typecheck, `vitest run` (21 arquivos / **437** testes, eram 372) e build —
todos verdes. CI na branch/PR.

**Security Advisor:** o WARN de baseline `auth_leaked_password_protection` permanece. Surgiram
dois lints novos de nível **INFO** — `rls_enabled_no_policy` em `operations` e `audit_events`.
Não são ERROR nem WARN, e descrevem exatamente o design autorizado: RLS habilitado sem policy,
porque nenhuma role de browser deve alcançar essas tabelas. O critério §5.18 do mandato ("não
ganhar novo ERROR/WARN") está atendido; registro os INFO para que a auditoria os avalie em vez
de encontrá-los sozinha.

---

## 9. Branch

`claude/rodada-002a-operations-audit-foundation`, criada de `origin/main`. PR draft aberta. Sem
merge na `main`, sem force push.

---

## 10. Pendências, riscos e divergências

1. **`updated_at` não é mantido automaticamente.** Sem trigger (o projeto não usa nenhum), o
   campo depende de quem escreve. Quando o worker existir, a decisão entre trigger e disciplina
   de aplicação precisa ser tomada — e é ela que reabriria a coerência temporal da §4.
2. **Dois INFO novos no Advisor**, esperados e explicados na §8.
3. **`approval_id` ausente** em `operations` por decisão do mandato; entra com a fundação
   financeira.
4. `auth_leaked_password_protection` continua hardening pré-produção.
5. Gmail SMTP continua provisório de desenvolvimento; App Password segue ativa enquanto for
   necessária.
6. Nenhuma fila, worker, cron, webhook, Meta, Ads ou IA foi iniciado — permanecem fora de
   escopo e não autorizados.

---

## 11. Conclusão

A fundação está criada e provada no comportamento, não apenas no DDL aceito: idempotência
resiste a criação concorrente real, o append-only resiste à role que ignora RLS, e o browser não
alcança nenhuma das duas tabelas nem quando o usuário é membro ativo do tenant. Os contratos
TypeScript espelham os `CHECK` do banco com teste que falha se divergirem, e a política de retry
recusa por padrão repetir mutação externa sem idempotência declarada.

O único desvio relevante foi meu e está integralmente registrado na §4: um CHECK de coerência
temporal que a própria prova reprovou, corrigido na origem antes do commit.

`002A EXECUTADA — AGUARDANDO AUDITORIA GPT`
