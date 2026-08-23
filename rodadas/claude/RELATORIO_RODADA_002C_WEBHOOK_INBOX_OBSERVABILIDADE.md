# RELATÓRIO — RODADA 002C — WEBHOOK INBOX + OBSERVABILIDADE BASE

Executor: Claude Code · Data: 2026-08-23
Branch: `claude/rodada-002c-webhook-inbox-observabilidade`

Status: **002C EXECUTADA — AGUARDANDO AUDITORIA GPT**

---

## 1. Preflight e baseline

Branch criada de `origin/main` (`a9baf8e`). Baseline conferido antes de mutar, idêntico ao
`estado.md` §4: **8 migrations** (última `20260823183513`), `pgmq` 1.5.1 com fila vazia,
`pg_cron` ausente, 5 tabelas `public` todas com RLS, sem fixtures, 1 conta real, zero objetos
owned por `supabase_admin`, `webhook_events` e `audit_events_actor_user_id_idx` inexistentes.

O Performance Advisor **pré-migration** confirmou o INFO de FK sem índice — condição que o
§5.4 exigia para criar o índice na mesma migration.

## 2. Arquivos

Novos: `supabase/migrations/20260823190756_create_webhook_events_inbox.sql`,
`scripts/sql/webhook-inbox-002c-proof.sql`, `scripts/sql/observability-base.sql`.

Alterados: `.github/workflows/ci.yml`, `docs/03-canonical/SECURITY_MODEL.md`, `estado.md`,
este relatório. Nenhum arquivo da 002A/002B tocado; nenhuma dependência nova.

## 3. Mudança → prova → resultado

| mudança | prova | resultado |
| --- | --- | --- |
| `public.webhook_events` criada | prova SQL §1 | existe, owner `postgres`, 4 índices |
| RLS on, zero policies de browser | prova SQL §1 | `rls=true`, `policies=0` |
| `anon`/`authenticated` sem acesso | `has_table_privilege` ×4 | `false` em SELECT e INSERT para ambos |
| `service_role` SELECT/INSERT/UPDATE, **sem DELETE** | `has_table_privilege` ×4 | `true,true,true` e **`false`**; ACL `service_role=arw` |
| dedupe único `(provider, dedupe_hash)` | insert duplicado | `23505`; original intocado |
| mesmo hash, provider distinto | insert | coexiste (2 registros) |
| `dedupe_hash` = 64 hex minúsculo | 3 inserts inválidos | `23514` para 63 chars, não-hex e maiúsculas |
| tetos e campos não vazios | 4 inserts inválidos | `23514` em provider/event_type em branco, status inválido, `external_event_id` vazio |
| FK de organização | org inexistente | `23503` |
| `organization_id` nulo é válido | insert sem tenant | aceito |
| transição de status | update → `PROCESSED` | ok, sem CHECK artificial |
| `audit_events_actor_user_id_idx` | prova SQL §6 + Advisor | índice existe; INFO `unindexed_foreign_keys` **desapareceu** |
| baseline 002A/002B intacto | prova SQL §7 | 9 migrations; 6 tabelas todas com RLS; `pgmq` 1.5.1; fila presente; `pgmq_public`=0; `pg_cron`=0; **6 funções DEFINER — nenhuma nova** |
| zero resíduo | rollback + consulta pós-transação | `webhook_events`=0; demais tabelas inalteradas |
| `typecheck:functions` na CI | `.github/workflows/ci.yml` | passo próprio após o typecheck da app |
| matriz de secrets/runtime | `SECURITY_MODEL.md` §15.1 | seção nova no canônico existente |
| observabilidade read-only | `scripts/sql/observability-base.sql` | só agregados; nenhuma coluna de payload/PII |

**Prova do delta: 40/40, sem falhas** — `npx supabase db query --linked --file
scripts/sql/webhook-inbox-002c-proof.sql`.

## 4. Decisões não óbvias

1. **`organization_id` nullable e sem forma imposta ao `payload_json`.** O evento chega antes
   de o tenant ser resolvido, e o envelope é do provider: recusar por qualquer um dos dois
   destruiria o que se precisa para investigar. O teto de 262144 permanece.
2. **Sem CHECK entre status e `processed_at`.** O processador ainda não existe — mesma lição
   da 002A, onde um CHECK adivinhado quebrou o caminho normal.
3. **`dedupe_hash` em hex minúsculo, provado.** Aceitar maiúsculas faria o dedupe depender de
   quem formatou a string, e a mesma entrega passaria duas vezes.
4. **Dedupe escopado por `provider`.** Dois providers podem gerar o mesmo hash sem que um
   silencie o evento do outro.
5. **Sem DELETE para `service_role`.** Evento recebido é evidência do que o provider enviou;
   remoção de tenant continua pelo CASCADE.
6. **Prova transacional com erros capturados por `exception`.** Um script que aborta no
   primeiro erro esperado não prova os demais; aqui tudo roda numa passagem e o resultado é
   uma tabela única de veredictos. As auxiliares são `pg_temp` e somem no rollback.
7. **Eficiência (§4/§7).** As 82 provas da 002B não foram repetidas: fila e worker não foram
   alterados e aparecem só como verificação catalogal. Suíte completa roda uma vez, na CI.

## 5. Migration/DDL

Uma única migration, histórico **8 → 9**, local == remoto. Validada em transação revertida
antes do `db push`. Nenhuma migration anterior editada, nenhum `migration repair`, nenhum DDL
ad hoc, **nenhuma função `SECURITY DEFINER` nova**.

Rollback: `drop table public.webhook_events` e `drop index audit_events_actor_user_id_idx`
revertem a rodada sem afetar o estado promovido 000–002B.

## 6. Configuração remota

Nenhuma. Nada tocado em Auth, SMTP, Edge Functions, fila ou Dashboard. Nenhum segredo novo,
nenhum gate humano solicitado, nenhum endpoint de webhook criado.

## 7. Advisors

**Security — sem novo ERROR/WARN.** O WARN `auth_leaked_password_protection` permanece.
Surgiu o terceiro INFO `rls_enabled_no_policy`, agora em `webhook_events`: previsto pelo §5.3,
porque a tabela é server-only. Criar policy artificial para silenciar o linter seria o erro.

**Performance —** o INFO `unindexed_foreign_keys` de `audit_events.actor_user_id`
**desapareceu**, como o §10 previa. Surgiram dois INFO de `unused_index`
(`webhook_events_status_received_at_idx` e `audit_events_actor_user_id_idx`): índices recém
criados sobre tabelas vazias, que por definição ainda não foram usados. Não é regressão —
removê-los anularia a correção pedida.

## 8. Gates

`typecheck:functions` local (delta de CI), `git diff --check`, lint, migration history
local == remoto = 9, prova SQL 40/40. Suíte completa, typecheck da aplicação e build rodam
**uma única vez na CI final**, conforme §4. A afirmação de que `typecheck:functions` roda na
CI depende do job final exibir o passo **Typecheck Edge Functions** verde.

## 9. Branch

`claude/rodada-002c-webhook-inbox-observabilidade`, de `origin/main`. PR draft. Sem merge na
`main`, sem force push.

## 10. Pendências e riscos

1. **Sem endpoint, assinatura ou challenge** — a 002C cria a caixa; quem a preenche é rodada
   posterior. `dedupe_hash` é calculado por quem recebe; nenhuma função de hashing foi criada.
2. Dois INFO de `unused_index`, explicados na §7; reavaliar com tráfego real.
3. `auth_leaked_password_protection` — hardening pré-produção.
4. Gmail SMTP/App Password — desenvolvimento.
5. `HISTORY_SUMMARY.md` resume até 002A; o `estado.md` §10.4 prevê incorporar 002B/002C junto
   do fechamento da Fase 2, sem housekeeping isolado.

## 11. Conclusão

A inbox existe, é durável e está fechada ao browser: `anon` e `authenticated` não têm
privilégio algum, e `service_role` não pode apagar o que recebeu. O dedupe é decidido pelo
banco — reentrega colide em `23505` sem tocar o original — e escopado por provider.

A ressalva da 002B está fechada com `typecheck:functions` como passo próprio da CI; a matriz
de secrets entrou no `SECURITY_MODEL.md` existente, sem canônico paralelo; e a dívida de
performance da 002A foi eliminada, com o Advisor confirmando.

A prova cobre só o delta, em transação revertida e com zero resíduo, sem repetir a bateria da
002B — que segue como baseline auditado.

`002C EXECUTADA — AGUARDANDO AUDITORIA GPT`
