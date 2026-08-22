# AUDITORIA GPT — RODADA 001A — BASELINE SUPABASE E SEGURANÇA

Data: 2026-08-22
Resultado: **APROVADA COM RESSALVAS NÃO BLOQUEANTES**

## Escopo auditado

Mandato: `rodadas/gpt/RODADA_001A_BASELINE_SUPABASE_SEGURANCA.md`

Relatório: `rodadas/claude/RELATORIO_RODADA_001A_BASELINE_SUPABASE_SEGURANCA.md`

Branch: `claude/rodada-001a-baseline-supabase-seguranca`

Commit de implementação informado: `d802e8f02f2b520b4252fe3be70e6e161952507a`

Head final do PR: `347df21d9e913d285bd1856e7855654ae0db53e6`

PR de promoção: `#2`

Merge em `main`: `fb9bc62e6cf25e03e39255bff7042e330a80e1d6`

## Provas independentes

A auditoria confirmou diretamente:

- diff da branch restrito a `.claude/commands/proxima.md`, `.gitattributes`, `estado.md`, relatório e uma migration SQL;
- migration versionada `20260822212544_harden_rls_auto_enable_privileges.sql` presente e coerente com o hardening executado;
- histórico remoto de migrations contendo `20260822212544 / harden_rls_auto_enable_privileges`;
- ACL atual de `public.rls_auto_enable()` = `postgres` e `service_role`, sem `PUBLIC`, `anon` ou `authenticated`;
- `ensure_rls` continua ativo em `ddl_command_end` para `CREATE TABLE`, `CREATE TABLE AS` e `SELECT INTO`;
- schema `public` permanece sem tabelas de domínio;
- Supabase Security Advisor sem achados de segurança após a migration;
- CI da branch run `32600593719` aprovada;
- CI do PR run `32600974514` aprovada sobre a combinação final com a `main`;
- PR mergeável mesmo com a divergência normal causada pelas atualizações documentais feitas na `main` durante a execução.

## Decisão sobre o hardening

A correção aplicada é adequada ao problema auditado: revoga `EXECUTE` de `PUBLIC`, `anon` e `authenticated` sem alterar corpo, owner, `SECURITY DEFINER`, `search_path` ou event trigger.

O relatório do Claude registra prova transacional real de que uma tabela criada após o hardening recebeu RLS automaticamente e foi revertida. A auditoria confirmou que nenhuma tabela de prova permaneceu no schema.

## Ressalvas não bloqueantes

1. `service_role` mantém `EXECUTE` sobre `public.rls_auto_enable()`. Não é bloqueante nesta fase porque a credencial é server-only e o Security Advisor não considera isso exposição pública. A política de privilégios mínimos para funções privilegiadas deve ser fixada antes de introduzir funções próprias de domínio.
2. Ainda não há política global de `ALTER DEFAULT PRIVILEGES ... REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC/anon/authenticated`. Essa trava preventiva deve ser decidida antes da primeira rodada que crie funções próprias em schema exposto.
3. A ressalva de Auth da Rodada 000 permanece: a próxima etapa deve usar o padrão vigente de `proxy.ts`/Proxy e validação server-side segura de identidade.
4. A linha do ESLint reportada como deprecated permanece dívida de tooling, sem impacto bloqueante nesta rodada.

## Resultado

**RODADA 001A APROVADA E PROMOVIDA.**

A fundação Supabase está apta para seguir para a rodada de Auth real, desde que a próxima rodada permaneça restrita a identidade/sessão e não antecipe Organizations/Membership/RLS de domínio.

Nenhuma Rodada 001B é autorizada por este documento. A execução seguinte depende de aprovação explícita do fundador sobre o planejamento apresentado pelo GPT.
