# CORREÇÃO 002B-01 — CONTRATO DE JOB + POISON + GATE DA EDGE FUNCTION

Status: **AUTORIZADA**
Data: 2026-08-23
Rodada-base: **002B — Queue + Worker Foundation**
Executor: Claude Code
Branch existente: `claude/rodada-002b-queue-worker-foundation`
PR existente: #9 — manter draft
Relatório a atualizar: `rodadas/claude/RELATORIO_RODADA_002B_QUEUE_WORKER_FOUNDATION.md`

Esta correção fecha exclusivamente os bloqueios encontrados em:

`rodadas/gpt/AUDITORIA_RODADA_002B_QUEUE_WORKER_FOUNDATION.md`

Ela **não abre 002C**, não redesenha a fila e não amplia a Fase 2.

---

## 1. Retomada obrigatória

Antes de editar:

1. `git fetch origin`;
2. confirmar branch `claude/rodada-002b-queue-worker-foundation`;
3. comparar com `origin/main`;
4. incorporar os documentos GPT mais recentes da `main` sem perder a implementação da branch;
5. ler integralmente:
   - `estado.md` da `origin/main`;
   - `.gpt/PROJECT_PROMPT.md`;
   - `docs/00-governanca/ACTIVE_DOCS.md`;
   - mandato 002B;
   - auditoria 002B;
   - esta correção;
   - `src/lib/operations/contracts.ts`;
   - arquivos da 002B que serão alterados.

Não reler histórico antigo por ritual.

---

## 2. Escopo exato da correção

Corrigir três pontos e suas provas:

1. poison message não pode usar taxonomia falsa de erro externo;
2. validador SQL deve implementar o mesmo contrato de tipos do parser TypeScript;
3. Edge Function deve ter dependência pinada e typecheck Deno explícito/reprodutível.

Todo o restante da arquitetura 002B já auditado permanece congelado.

---

## 3. Correção A — poison message sem erro externo falso

No `integration-worker`, remover o uso de:

`p_error_class: "UNKNOWN_UPSTREAM"`

para poison message interno.

### Contrato final

Quando uma mensagem exceder o teto de tentativas e tiver operation associada:

- chamar `fail_operation` com `p_error_class = null`;
- usar `p_error_summary` curto, interno e sem PII/segredo, por exemplo informando que a mensagem excedeu o teto de entregas;
- verificar **error + retorno** do RPC antes de arquivar;
- se o RPC retornar erro, resultado ausente/desconhecido ou outra condição que impeça decisão segura, **não arquivar a mensagem naquele ciclo**; deixar visibility timeout/redelivery cuidar da recuperação;
- se retornar `FAILED`, a operation foi encerrada e a mensagem pode ser arquivada;
- se retornar `ALREADY_SUCCEEDED`, `NOT_FAILABLE` ou `NOT_FOUND`, não reabrir/rebaixar estado; a mensagem sem trabalho executável pode ser arquivada;
- nunca converter `SUCCEEDED`, `ACTION_REQUIRED` ou `UNKNOWN` para `FAILED` por força do poison handler.

Não criar nova classe de erro nesta correção.

### Prova obrigatória

Criar poison real e provar:

- `read_ct` ultrapassa o teto;
- worker arquiva a mensagem;
- ela não reaparece;
- operation failável termina `FAILED`;
- `last_error_class IS NULL`;
- resumo interno preenchido e dentro do contrato;
- simular/forçar falha do `fail_operation` de forma segura e provar que a mensagem **não é arquivada** naquele ciclo;
- cleanup final zero.

---

## 4. Correção B — contrato SQL estrito e equivalente ao TypeScript

A migration `20260823180000` **já foi aplicada e não pode ser reescrita**.

Criar exatamente **uma migration corretiva nova** pelo comando vigente da CLI. Histórico remoto esperado:

`7 → 8 migrations`

Usar `CREATE OR REPLACE FUNCTION public.is_valid_integration_job_message(jsonb)` e preservar/reafirmar:

- owner `postgres`;
- `SECURITY INVOKER`;
- `search_path = ''`;
- EXECUTE somente `postgres` e `service_role`;
- sem novo objeto persistente além da própria migration versionada.

### Tipagem JSON obrigatória

O predicado deve exigir:

- `version`: `jsonb_typeof(...) = 'number'` e valor exatamente `1`;
- `organizationId`: tipo JSON `string` + UUID válido;
- `correlationId`: tipo JSON `string` + UUID válido;
- `jobType`: tipo JSON `string`, trim não vazio e <= 120;
- `operationId`: ausente/null permitido; quando não nulo deve ser JSON `string` + UUID válido;
- `payload`: tipo JSON `object` e <= 4000 no critério já adotado.

Não ampliar o contrato.

### Provas obrigatórias

Além das invalidações já existentes, provar que `enqueue_integration_job` recusa **antes da fila** pelo menos:

- `version: "1"`;
- `version: true`;
- `jobType: 123`;
- `jobType: true`;
- `organizationId` numérico com representação textual semelhante;
- `correlationId` não-string;
- `operationId` não-string quando presente.

Para cada caso:

- RPC deve falhar;
- nenhuma mensagem correspondente pode entrar em `q_integration_jobs`.

Confirmar novamente que um envelope válido entra normalmente.

Não usar `migration repair`, DROP/recreate da migration 002B ou DDL ad hoc para corrigir histórico.

---

## 5. Correção C — Edge Function reprodutível e gate Deno

### 5.1 Pin exato

Trocar o import por versão **exata** do `@supabase/server`.

Baseline da auditoria em 2026-08-23: `1.4.1`.

Antes de editar, revalidar a documentação/package vigente. Se `1.4.1` continuar sendo a versão corrente/compatível, usar:

`npm:@supabase/server@1.4.1`

Se houver mudança material desde a auditoria, parar e reportar ao GPT em vez de escolher outra versão silenciosamente.

### 5.2 Typecheck explícito

Executar obrigatoriamente:

`deno check supabase/functions/integration-worker/index.ts`

A documentação vigente do Supabase usa `deno check` como diagnóstico de sintaxe/tipos de Edge Function.

Se `deno` não estiver instalado no ambiente local:

- não pedir ao fundador instalação global por improviso;
- primeiro verificar se a CLI/runtime vigente oferece caminho oficial equivalente;
- se não houver mecanismo reproduzível disponível sem nova intervenção, parar e reportar ao GPT.

Não tratar apenas `functions deploy`/bundle como substituto deste gate.

### 5.3 Auth da função

Manter:

- `verify_jwt = false`;
- `withSupabase({ auth: 'secret' })`;
- nenhum endpoint anônimo;
- nenhum segredo novo.

No script de prova, invocar a função com secret key **somente em `apikey`**. Remover `Authorization: Bearer <secret>`.

Provar remotamente:

1. sem `apikey` → recusado;
2. publishable key em `apikey` → recusado;
3. secret key em `apikey`, sem Bearer → permitido.

Nunca imprimir nenhuma chave.

### 5.4 Redeploy

Depois das correções e do `deno check`:

- redeployar `integration-worker` pelo caminho oficial;
- confirmar função ACTIVE e nova versão remota;
- confirmar que a fonte remota corresponde à branch final;
- executar a prova real de healthcheck novamente.

---

## 6. Lacunas de prova a fechar

Atualizar `scripts/queue-worker-002b.mjs` para incluir:

- `fail_operation` na matriz de RPCs negados a `anon`/`authenticated`;
- `is_valid_integration_job_message` na mesma matriz;
- auth negativa/positiva da Edge Function conforme §5.3;
- tipos JSON inválidos conforme §4;
- poison real conforme §3;
- comportamento seguro quando `fail_operation` não consegue concluir a falha;
- regressão de:
  - redelivery;
  - claim concorrente com um vencedor;
  - `attempt_count` único;
  - duplicata tardia sem reexecução;
  - `SYSTEM_HEALTHCHECK` remoto `PENDING → CLAIMED → SUCCEEDED`;
  - unsupported arquivado;
  - cleanup zero.

Não é necessário inflar o script com provas antigas que já não acrescentem evidência; preservar cobertura dos riscos centrais.

---

## 7. Gates finais

Obrigatórios antes do handoff:

- migration history local == remoto = 8;
- `git diff --check`;
- lint da aplicação;
- typecheck da aplicação;
- testes unitários relevantes;
- suíte Vitest completa;
- `deno check` da Edge Function;
- build Next.js;
- prova funcional remota corrigida;
- prova estrutural/catalogal;
- Edge Function ACTIVE após redeploy;
- Security Advisor sem novo ERROR/WARN;
- Performance Advisor registrado;
- fila ativa/arquivada sem fixtures residuais;
- `operations`/organizations/usuários de teste limpos;
- `public` continua sem objeto owned por `supabase_admin`;
- CI da PR #9 verde no head final.

---

## 8. Fora de escopo / proibido

Não fazer nesta correção:

- cron/scheduler;
- 002C;
- webhook;
- Meta/Instagram/OAuth;
- Ads;
- IA;
- UI;
- `public.integration_jobs`;
- nova fila física;
- mudar claim/stale/visibility sem prova de defeito;
- trocar PGMQ;
- criar nova taxonomia de erro;
- reescrever migration aplicada;
- `migration repair`;
- DDL remoto ad hoc;
- novo segredo humano.

---

## 9. Git e handoff

- trabalhar na **mesma branch** `claude/rodada-002b-queue-worker-foundation`;
- manter PR #9 draft;
- preferir um único push corretivo final;
- atualizar o relatório existente, não criar relatório paralelo;
- manter evidência compacta;
- atualizar `estado.md` da branch ao final para:

`002B EXECUTADA COM CORREÇÃO 002B-01 — AGUARDANDO REAUDITORIA GPT`

- não promover;
- não iniciar 002C.

## 10. Critério de conclusão

A correção só é entregue se os três bloqueios da auditoria estiverem fechados com prova real e reproduzível.

Conclusão esperada:

`002B + CORREÇÃO 002B-01 EXECUTADAS — AGUARDANDO REAUDITORIA GPT`
