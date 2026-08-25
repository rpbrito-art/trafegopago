# CORREÇÃO 004D-01 — IMUTABILIDADE DE GROWTH_OBJECTIVES

Status: **AUTORIZADA PARA EXECUÇÃO PELO CLAUDE CODE**

Data: 2026-08-25

Base: mesma branch da 004D, `claude/rodada-004d-guided-growth-journey`.

## 1. Defeito a corrigir

`growth_objectives` é uma entidade versionada que guarda memória estratégica do negócio, mas `service_role` ainda possui `UPDATE` amplo na tabela e não existe guarda persistida que impeça reescrita direta do conteúdo de uma versão.

Assim, um caminho privilegiado fora de `set_active_growth_objective` e `set_growth_objective_focus` pode alterar objetivo, jornada, sucesso, foco, tenant, autoria ou datas sem criar nova versão.

## 2. Regra obrigatória

Depois de criada, uma linha de `growth_objectives` não pode ter seu conteúdo estratégico reescrito em place.

A única mutação normal permitida é a transição da versão corrente para histórica:

`status: ACTIVE -> ARCHIVED` e `archived_at: NULL -> timestamp não nulo`

na mesma atualização, sem alteração dos demais campos.

Uma linha já `ARCHIVED` não pode voltar a ser `ACTIVE` nem sofrer qualquer outra alteração.

## 3. Implementação

- **não editar** migrations já aplicadas;
- criar migration aditiva com o próximo identificador livre;
- reduzir os privilégios de UPDATE de `service_role` em `growth_objectives` ao mínimo necessário para o supersede (`status` e `archived_at`);
- adicionar guarda de banco que recuse qualquer UPDATE diferente de `ACTIVE/NULL -> ARCHIVED/timestamp`, sem mudança dos demais campos;
- a guarda deve valer inclusive para caminho privilegiado que ignore grants;
- preservar o funcionamento de `set_active_growth_objective` e `set_growth_objective_focus`;
- não alterar UI, foco, motor de jornada, Meta, IA, ofertas ou demais contratos da 004D.

Trigger + privilégio por coluna é uma forma adequada, desde que a invariante seja provada no banco e não dependa de convenção da aplicação.

## 4. Provas mínimas

Provar no banco remoto e de forma transacional:

1. `set_active_growth_objective` continua criando objetivo e trocando objetivo com histórico;
2. `set_growth_objective_focus` continua definindo/trocando foco com histórico;
3. reenvios idênticos continuam idempotentes;
4. `service_role` não consegue alterar diretamente `objective_type`, jornada, sucesso ou foco;
5. `service_role` não consegue alterar tenant, autoria ou `created_at`;
6. caminho que ignore grants também não consegue reescrever conteúdo;
7. linha `ARCHIVED` não pode ser alterada nem reativada;
8. `ACTIVE -> ARCHIVED` com `archived_at NULL -> timestamp` e nenhum outro campo alterado continua permitido;
9. tentativa de arquivar e alterar conteúdo na mesma instrução falha;
10. browser/RLS/grants continuam como antes;
11. zero fixture residual após rollback/cleanup.

Reexecutar apenas as regressões diretamente afetadas de objetivo/foco e a CI final da branch.

## 5. Handoff

Atualizar relatório 004D e `estado.md` da branch para:

**CORREÇÃO 004D-01 EXECUTADA — AGUARDANDO REAUDITORIA GPT**.

Manter PR #16 aberto, draft e não mergeado. Claude não promove a rodada.
