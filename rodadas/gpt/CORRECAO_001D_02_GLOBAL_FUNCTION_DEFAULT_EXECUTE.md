# CORREÇÃO 001D-02 — DEFAULT EXECUTE GLOBAL DE FUNÇÕES

Status: **AUTORIZADA**
Data: 2026-08-22
Rodada: 001D — Default privileges + Grants + RLS + Isolamento
Branch: `claude/rodada-001d-rls-tenancy-isolamento`

Esta correção resolve somente a pendência bloqueante registrada no relatório da 001D §9.1. O restante da 001D permanece válido e não deve ser refeito sem necessidade.

## 1. Diagnóstico GPT

O comando com `IN SCHEMA public` não remove o `EXECUTE` padrão global concedido pelo PostgreSQL a `PUBLIC` para funções.

O PostgreSQL 17 documenta que default privileges por schema são adicionados aos defaults globais e não podem revogar um privilégio concedido globalmente. Para remover o `PUBLIC EXECUTE` padrão de funções futuras é necessário alterar o default global, sem `IN SCHEMA`.

## 2. Correção autorizada

Antes de aplicar, provar em transação revertida:

```sql
alter default privileges for role postgres
  revoke execute on functions from public;
```

Na mesma transação, criar função `SECURITY INVOKER` de prova em `public` e confirmar `PUBLIC`, `anon`, `authenticated` e `service_role` sem EXECUTE por default; rollback completo.

Se a prova falhar, parar e devolver ao GPT. Não criar event trigger nem outra arquitetura.

## 3. Impacto global aceito

O comando é global para funções futuras criadas por `postgres` no banco. O efeito é aceito porque defaults seguros devem ser opt-in, funções atuais owned por `postgres` já possuem ACL explícita e `ALTER DEFAULT PRIVILEGES` não altera objetos existentes. Funções futuras que precisem ser chamadas devem receber `GRANT EXECUTE` explícito e versionado.

Não alterar defaults de `supabase_admin`.

## 4. Migration adicional

Não modificar SQL executável da migration já aplicada `20260823003128_*`.

Criar nova migration pelo comando oficial vigente da CLI contendo somente:

```sql
alter default privileges for role postgres
  revoke execute on functions from public;
```

Aplicar ao project ref autorizado pelo fluxo normal de migrations.

## 5. Provas pós-migration

Provar:

1. migration local/remota alinhadas;
2. default global de funções para `postgres` sem `PUBLIC EXECUTE`;
3. probe reversível em `public` sem EXECUTE para `PUBLIC`, `anon`, `authenticated` e `service_role`;
4. nenhuma função existente perdeu ACL efetiva;
5. `public.rls_auto_enable()` preserva ACL `{postgres, service_role}` e `ensure_rls` ativo;
6. defaults por schema de tabelas/sequências da 001D continuam endurecidos;
7. `supabase_admin` continua com zero objetos owned em `public`;
8. Advisor sem novo WARN/ERROR de banco;
9. zero resíduo de probes.

Não é necessário repetir as 21 provas de isolamento se nenhuma policy/grant de tabela mudar.

## 6. Gates e handoff

- `git diff --check`;
- provas SQL/Supabase acima;
- CI remota completa no head final;
- sem bateria frontend local por ritual se nenhum TS/JS mudar.

Atualizar o relatório da 001D de forma compacta e `estado.md` para:

`RODADA 001D — EXECUTADA COM CORREÇÃO 001D-02 — AGUARDANDO AUDITORIA GPT`

Nenhuma etapa posterior está autorizada.
