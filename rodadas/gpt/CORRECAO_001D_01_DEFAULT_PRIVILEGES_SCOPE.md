# CORREÇÃO 001D-01 — DEFAULT PRIVILEGES: ESCOPO EXECUTÁVEL

Status: **AUTORIZADA**
Data: 2026-08-22
Rodada: 001D — Default privileges + Grants + RLS + Isolamento
Branch: `claude/rodada-001d-rls-tenancy-isolamento`

Esta correção resolve exclusivamente o bloqueio previsto no §4.4 do mandato original. O restante da Rodada 001D continua vigente, salvo onde este documento o substitui explicitamente.

## 1. Decisão GPT

### 1.1 `supabase_admin`

**Não escalar ao suporte Supabase neste momento.**

A 001D está autorizada a tratar os default privileges reproduzíveis do papel `postgres`, que é o owner real dos objetos do projeto e o papel das migrations do repositório.

O default ACL de `supabase_admin` passa a ser classificado como **risco residual de plataforma aceito**, porque:

- a documentação oficial vigente prescreve o hardening via `ALTER DEFAULT PRIVILEGES FOR ROLE postgres`;
- `postgres` não possui permissão para alterar os defaults de `supabase_admin`;
- nenhum objeto atual de `public` pertence a `supabase_admin`;
- todos os objetos criados pelo projeto em `public` são owned por `postgres`;
- bloquear a fundação por um ACL hoje inerte não aumenta segurança operacional do produto.

### 1.2 Gatilho de reabertura

O risco residual de `supabase_admin` torna-se **bloqueante** se, em qualquer auditoria futura:

- surgir objeto no schema `public` owned por `supabase_admin`; ou
- surgir grant/exposição real de objeto de negócio atribuível a esse default ACL; ou
- documentação oficial passar a fornecer caminho suportado/recomendado para tratar esse default e o projeto permanecer incompatível.

Nesse caso o GPT reavalia e, se necessário, determina escalonamento ao suporte Supabase.

## 2. Decisão sobre `service_role`

Para **objetos futuros**, seguir o padrão oficial opt-in e revogar também `service_role` dos default privileges de `postgres`.

A migration deve remover dos defaults de `postgres` em `public`:

- novas tabelas: `SELECT, INSERT, UPDATE, DELETE` de `anon`, `authenticated` e `service_role`;
- novas sequências: `USAGE, SELECT` de `anon`, `authenticated` e `service_role`;
- novas funções: `EXECUTE` de `anon`, `authenticated` e `service_role`;
- novas funções: `EXECUTE` de `PUBLIC`.

Isso **não autoriza retirar os grants efetivos atuais de `service_role`** de `organizations`, `organization_members` ou de objetos já promovidos.

Regra daqui em diante: quando uma nova tabela/função/sequência precisar ser usada pela Data API ou por caminho server-side com `service_role`, o grant correspondente deve ser **explícito e versionado** na migration da feature.

## 3. Migration da 001D

A 001D deve criar migration versionada pelo comando vigente da CLI e incluir nela:

1. hardening dos default privileges **somente de `role postgres`**, conforme §2;
2. grants atuais da fundação:
   - `authenticated`: somente `SELECT` em `public.organizations` e `public.organization_members`;
   - `anon`: nenhum privilégio de tabela;
   - `service_role`: preservar acesso efetivo atual, sem depender de default futuro;
3. policies RLS do mandato original:
   - `organization_members`: usuário lê somente sua própria membership;
   - `organizations`: usuário lê somente organização `ACTIVE` para a qual possui membership `ACTIVE`;
4. nenhuma policy de escrita;
5. nenhuma função `SECURITY DEFINER` persistente.

## 4. Provas obrigatórias adicionais

Além das provas originais da 001D:

### 4.1 Default privileges de `postgres`

Provar catalogicamente após a migration que `anon`, `authenticated` e `service_role` não possuem os defaults removidos para tabelas, funções e sequências de `postgres`, e que `PUBLIC` não possui default EXECUTE em funções.

### 4.2 Probe real

Em transação/reversível, criar sob o caminho normal de migration/admin do projeto:

- tabela de prova em `public` → deve nascer com RLS ativo pelo `ensure_rls` e sem grants automáticos para `anon`, `authenticated` e `service_role`;
- função `SECURITY INVOKER` inofensiva → sem EXECUTE automático para `PUBLIC`, `anon`, `authenticated` ou `service_role`;
- sequência, se tecnicamente simples → sem grants automáticos para `anon`, `authenticated` ou `service_role`.

Rollback/limpeza obrigatória; zero resíduo.

### 4.3 `supabase_admin`

Não tentar novamente `ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin`.

Somente registrar no snapshot final:

- ACL residual ainda existente;
- `count(*)` de objetos `public` owned por `supabase_admin` deve continuar `0`.

Se esse count deixar de ser zero, **parar e devolver ao GPT**.

## 5. Isolamento real

Retomar integralmente o §9 do mandato original:

- 2 usuários temporários × 2 organizações;
- sessões/JWTs reais via Auth oficial;
- acesso via Data API/publishable key;
- leitura própria permitida;
- leitura cross-tenant vazia/negada;
- membership própria apenas;
- não membro sem tenant;
- `anon` sem leitura;
- INSERT/UPDATE/DELETE negados inclusive para `owner`;
- limpeza de usuários e organizações de prova;
- nenhuma PII/token no relatório.

A simulação SQL já feita durante o bloqueio é evidência complementar, não substitui esta prova.

## 6. Advisor e invariantes

Ao final:

- os dois INFO `rls_enabled_no_policy` devem desaparecer;
- `auth_leaked_password_protection` pode permanecer como WARN conhecido;
- qualquer novo WARN/ERROR de banco é bloqueante até explicação/correção;
- `ensure_rls` deve continuar ativo;
- ACL efetiva de `public.rls_auto_enable()` deve continuar como promovida na 001A;
- nenhum objeto persistente fora do escopo.

## 7. Eficiência

Não repetir investigação já concluída sobre a impossibilidade de alterar `supabase_admin`.

O executor deve partir do relatório de bloqueio e desta correção, executar somente o delta necessário e manter o relatório final compacto (alvo ≤150 linhas/15 KB).

## 8. Handoff

Ao concluir:

- atualizar `estado.md` para `RODADA 001D — EXECUTADA — AGUARDANDO AUDITORIA GPT`;
- atualizar o relatório da 001D ou adicionar seção curta de retomada/correção;
- push na mesma branch;
- parar;
- não iniciar etapa posterior.

Esta correção **não cria uma nova rodada** e não autoriza nenhuma etapa após a 001D.