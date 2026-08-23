# CORREÇÃO 001D-02 — DEFAULT EXECUTE GLOBAL DE FUNÇÕES

Status: **AUTORIZADA**
Data: 2026-08-22
Rodada: 001D — Default privileges + Grants + RLS + Isolamento
Branch: `claude/rodada-001d-rls-tenancy-isolamento`

Esta correção resolve somente a pendência bloqueante registrada no relatório da 001D §9.1. O restante da 001D permanece válido e não deve ser refeito sem necessidade.

## 1. Diagnóstico GPT

A execução observada pelo Claude está correta: o comando com `IN SCHEMA public`

```sql
alter default privileges for role postgres in schema public
  revoke execute on functions from public;
```

não remove o `EXECUTE` padrão global concedido pelo PostgreSQL a `PUBLIC` para funções.

A causa está documentada no PostgreSQL 17: default privileges por schema são **adicionados** aos defaults globais e não podem revogar um privilégio concedido globalmente. Para remover o `PUBLIC EXECUTE` padrão de funções futuras é necessário alterar o default **global**, sem `IN SCHEMA`.

## 2. Correção autorizada

Antes de aplicar, provar em transação revertida que o comando abaixo funciona no projeto:

```sql
alter default privileges for role postgres
  revoke execute on functions from public;
```

Sem `IN SCHEMA public`.

Na mesma transação, criar uma função `SECURITY INVOKER` de prova em `public` e confirmar:

- `PUBLIC` sem `EXECUTE`;
- `anon` sem `EXECUTE`;
- `authenticated` sem `EXECUTE`;
- `service_role` sem `EXECUTE` por default;
- rollback completo, sem resíduo.

Se a prova falhar, parar e devolver ao GPT. Não criar event trigger nem outra arquitetura.

## 3. Impacto global aceito

O comando é global para **funções futuras criadas por `postgres` no banco**, não apenas `public`.

Esse efeito é aceito nesta correção porque:

- default seguro deve ser opt-in;
- levantamento pré-correção mostrou que as funções atuais owned por `postgres` já possuem ACL explícita;
- `ALTER DEFAULT PRIVILEGES` não altera funções existentes;
- qualquer função futura que precise ser chamada deverá receber `GRANT EXECUTE` explícito e versionado na migration da própria feature.

Não alterar defaults de `supabase_admin`.

## 4. Migration adicional

**Não modificar a migration já aplicada `20260823003128_*` para mudar SQL executável.** Ela faz parte da história remota aplicada.

Criar uma nova migration pelo comando oficial vigente da CLI, contendo somente o necessário para esta correção:

```sql
alter default privileges for role postgres
  revoke execute on functions from public;
```

Comentários explicativos são permitidos.

Aplicar ao project ref autorizado pelo fluxo normal de migrations.

## 5. Provas pós-migration

Provar:

1. migration local/remota alinhadas;
2. existe default global de funções para `postgres` refletindo ausência de `PUBLIC EXECUTE`;
3. probe reversível em `public` nasce sem EXECUTE para `PUBLIC`, `anon`, `authenticated` e `service_role`;
4. nenhuma função existente perdeu ACL efetiva;
5. `public.rls_auto_enable()` preserva ACL `{postgres, service_role}` e `ensure_rls` ativo;
6. defaults por schema de tabelas/sequências da 001D permanecem endurecidos;
7. `supabase_admin` continua com zero objetos owned em `public`;
8. Advisor sem novo WARN/ERROR de banco;
9. zero resíduo de probes.

Não é necessário repetir as 21 provas de isolamento se nenhuma policy/grant de tabela mudar. A prova 21/21 já entregue continua válida; reexecutá-la é opcional, não ritual obrigatório.

## 6. Gates e handoff

Como a correção deve alterar apenas SQL + relatório/estado:

- `git diff --check`;
- provas SQL/Supabase acima;
- CI remota completa no head final;
- não rodar bateria frontend local por ritual se nenhum TS/JS mudar.

Atualizar o relatório da 001D de forma compacta, registrando que a causa raiz foi corrigida por default global. Atualizar `estado.md` para:

`RODADA 001D — EXECUTADA COM CORREÇÃO 001D-02 — AGUARDANDO AUDITORIA GPT`

Nenhuma etapa posterior está autorizada.
