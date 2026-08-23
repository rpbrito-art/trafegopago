# AUDITORIA GPT — RODADA 002B — QUEUE + WORKER FOUNDATION

Data: 2026-08-23
Classificação: **BLOQUEADA — CORREÇÃO 002B-01 OBRIGATÓRIA — NÃO PROMOVER**

Branch auditada: `claude/rodada-002b-queue-worker-foundation`
Head auditado: `4f47e60cfb0ace958d8ef830d90197623694759f`
PR: #9 (draft)
CI: run `32657729531` — success
Supabase project ref: `cbnxdoxpyioxjwgjhbtq`

## 1. Resultado executivo

A fundação central da 002B está tecnicamente sólida e foi confirmada de forma independente:

- migration `20260823180000` aplicada; histórico 6 → 7;
- `pgmq` 1.5.1 instalado;
- fila `integration_jobs` existe em tabelas logged/duráveis (`relpersistence='p'`);
- fila ativa e arquivo estão vazios após cleanup;
- `pgmq_public` não está exposto;
- `pg_cron` continua não instalado;
- não existe `public.integration_jobs`;
- cinco wrappers de fila têm owner `postgres`, `SECURITY DEFINER`, `search_path=""` e ACL somente `postgres` + `service_role`;
- helpers de `operations` são `SECURITY INVOKER`, com ACL somente `postgres` + `service_role`;
- `anon`/`authenticated` não têm EXECUTE nos nove pontos auditados; `service_role` tem;
- `public` continua com 5 tabelas e zero objetos owned por `supabase_admin`;
- `operations` e `audit_events` estão vazias após cleanup;
- Edge Function `integration-worker` está ACTIVE, versão 1, com `verify_jwt=false` e fonte remota compatível com a branch;
- logs remotos mostram invocações HTTP 200 reais da função;
- Security Advisor: nenhum ERROR/WARN novo; apenas WARN conhecido de leaked-password + dois INFO já aceitos da 002A;
- Performance Advisor: somente `audit_events.actor_user_id` sem índice, dívida herdada;
- CI final verde: install/lint/typecheck/491 testes/build.

Portanto, **fila, isolamento, ACL, claim atômico, idempotência básica e deploy real não são o problema**.

A rodada não pode ser promovida porque três contratos obrigatórios ficaram incompletos.

## 2. BLOQUEANTE A — classificação externa falsa em poison message

O mandato §5.4 determinou expressamente:

> helper de falha para poison message deve ser mínimo, service-only e **não inventar classificação externa falsa**.

O worker atual, ao detectar poison message, chama `fail_operation` com:

`p_error_class = 'UNKNOWN_UPSTREAM'`.

Isso classifica uma falha **interna da fila/worker** como erro de provider externo. O próprio `contracts.ts` documenta `UNKNOWN_UPSTREAM` dentro da taxonomia de erro externo.

Conclusão: violação direta do mandato e do significado canônico da taxonomia.

### Correção exigida

- não ampliar a taxonomia nesta correção;
- para poison interno, usar `last_error_class = null` e resumo interno curto;
- manter status `FAILED` quando a operation estiver em estado failável;
- checar o retorno/erro de `fail_operation` antes de arquivar a mensagem;
- se o RPC falhar transitoriamente, **não arquivar** a mensagem e deixar redelivery ocorrer;
- estados já terminais/não-failáveis podem resultar em archive sem reabertura silenciosa.

## 3. BLOQUEANTE B — validador SQL aceita envelopes que o contrato TypeScript rejeita

O mandato §5.2 define `version: 1` e `jobType: string`; a prova §6.9 exige que envelope inválido seja recusado **antes de entrar na fila** pelo wrapper.

A função SQL `public.is_valid_integration_job_message(jsonb)` usa `->>` sem validar o tipo JSON de `version` e `jobType`.

Auditoria independente reproduziu o predicado SQL e confirmou que ele aceita, entre outros:

- `version: "1"` (string);
- `jobType: 123` (number);
- `jobType: true` (boolean).

O parser TypeScript rejeita esses três casos. Logo banco e worker **não têm contrato equivalente**: mensagens inválidas podem entrar na fila e só serem descartadas depois pelo consumidor.

### Correção exigida

Criar **uma migration corretiva nova**, sem reescrever `20260823180000`, usando `CREATE OR REPLACE FUNCTION` para endurecer a validação:

- `version` deve ser JSON `number` e exatamente `1`;
- `organizationId` deve ser JSON `string` + UUID válido;
- `correlationId` deve ser JSON `string` + UUID válido;
- `jobType` deve ser JSON `string`, não vazio e dentro do teto;
- `operationId`, quando não nulo, deve ser JSON `string` + UUID válido;
- `payload` deve continuar JSON `object` dentro do teto;
- preservar owner, `search_path`, ACL e comportamento dos wrappers.

A migration history final da correção passa de 7 → 8. Não usar `migration repair`, não alterar migration já aplicada e não fazer DDL ad hoc.

Adicionar provas explícitas de tipos inválidos na fronteira de enqueue e confirmar que a fila permanece sem a mensagem recusada.

## 4. BLOQUEANTE C — gate de Edge Function e dependência não reprodutíveis

O mandato §7 exigiu **validação/typecheck da Edge Function pelo mecanismo vigente adequado**.

O relatório considerou o bundle/deploy como validação suficiente e excluiu `supabase/functions` do `tsc`/ESLint da aplicação. Porém a documentação vigente do Supabase recomenda `deno check` para validar a função; deploy/bundle comprova resolução/sintaxe/runtime, mas não substitui o gate solicitado de typecheck.

Além disso, a função importa:

`npm:@supabase/server@1`

O `SECURITY_MODEL` exige pinning de dependências. Um major range pode resolver para minor/patch diferente em futuro redeploy sem mudança no Git. Na auditoria de 2026-08-23, a versão corrente do pacote é 1.4.1.

### Correção exigida

- pin exato: `npm:@supabase/server@1.4.1` (ou, se a documentação/release mudar antes da execução, revalidar e registrar a versão exata escolhida);
- executar `deno check supabase/functions/integration-worker/index.ts` com sucesso;
- redeployar a função e confirmar versão remota ACTIVE;
- manter `verify_jwt=false` + `withSupabase({ auth: 'secret' })`, que está alinhado à documentação vigente.

## 5. Provas adicionais obrigatórias da correção

A Correção 002B-01 deve ainda fechar lacunas de evidência sem repetir toda a rodada:

1. invocação da Edge Function **sem `apikey`** deve ser recusada;
2. invocação com **publishable key** deve ser recusada;
3. invocação com secret key deve funcionar usando **somente header `apikey`**; remover o `Authorization: Bearer <secret>` do script, pois a documentação atual orienta secret key no `apikey`;
4. incluir `fail_operation` e `is_valid_integration_job_message` na prova de EXECUTE negado para browser roles;
5. provar poison message real: após exceder o teto, mensagem é arquivada, não volta, e operation fica `FAILED` com `last_error_class IS NULL` e resumo interno; zero resíduo ao final;
6. se `fail_operation` for forçado a erro, o worker não deve arquivar a mensagem naquele ciclo;
7. reexecutar redelivery, claim concorrente, duplicata tardia e healthcheck real — não precisa repetir todos os casos antigos se os scripts preservados cobrem regressão de forma proporcional.

## 6. Pontos aprovados e que NÃO devem ser redesenhados

Não reabrir sem motivo:

- PGMQ como provider;
- uma fila física `integration_jobs`;
- ausência de cron na 002B;
- ausência de `public.integration_jobs`;
- wrappers estreitos com fila hardcoded;
- `SECURITY DEFINER` somente nos wrappers PGMQ;
- helpers de `operations` como `SECURITY INVOKER`;
- claim por UPDATE condicional;
- identidade tripla operation/org/correlation;
- stale 900 > visibility 60;
- ordem concluir operation → remover mensagem;
- lote pequeno em série;
- `withSupabase({ auth: 'secret' })` como autenticação interna.

## 7. Git/CI e relatório

PR #9 está mergeable e continua **draft**. Não converter para ready/merge antes da reauditoria GPT.

O relatório do Claude tem 202 linhas, acima do alvo ~150, mas a rodada é tecnicamente densa; isto é não bloqueante. Na correção, atualizar o relatório existente de modo compacto, sem criar narrativa duplicada.

## 8. Classificação final

**002B NÃO APROVADA PARA PROMOÇÃO.**

Situação correta:

`002B — CORREÇÃO 002B-01 NECESSÁRIA — AGUARDANDO EXECUÇÃO CLAUDE`

Nenhuma 002C pode ser iniciada ou autorizada por proximidade.
