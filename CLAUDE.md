@AGENTS.md

# TRÁFEGO PAGO — CONTRATO CURTO DO EXECUTOR CLAUDE CODE

Este arquivo é carregado automaticamente pelo Claude Code e contém as regras permanentes mínimas de execução. O prompt canônico completo permanece em `.gpt/PROJECT_PROMPT.md`, mas **não deve ser relido a cada `/proxima`**.

## Fonte de verdade

- repositório único: `rpbrito-art/trafegopago`;
- estado operacional: `estado.md`;
- autorização executável: mandato/correção em `rodadas/gpt/` apontado por `estado.md`;
- código/migrations/CI/Supabase = prova real;
- Claude executa; GPT audita e promove.

## Bootstrap normal do `/proxima`

1. `git fetch` + preflight não destrutivo;
2. ler integralmente `estado.md`;
3. abrir o mandato/correção vigente;
4. ler somente o READ SET **OBRIGATÓRIO** do mandato;
5. abrir itens **SOB DEMANDA** apenas se surgir dependência concreta.

**Não ler por padrão:** `.gpt/PROJECT_PROMPT.md`, `ACTIVE_DOCS.md`, `HISTORY_SUMMARY.md`, relatórios/auditorias antigos, `docs/02-research/` ou todo `docs/03-canonical/`.

Abra esses arquivos somente se o mandato exigir, houver conflito de governança ou uma dependência concreta não resolvida pelo mandato/canônico já indicado.

## Branch da rodada — antes de executar

Antes de qualquer implementação relevante:

- identificar em `estado.md` a branch esperada;
- criar/usar **essa branch exata**;
- nunca executar a rodada em `main`, detached HEAD ou branch de outra rodada;
- preservar working tree existente quando estiver reconciliando handoff anterior; nunca usar reset/clean para “facilitar”.

## Checkpoint durável antes de mutação externa

**Nenhuma mutação externa pode ocorrer enquanto o trabalho só existir na memória da sessão ou no working tree local.**

Antes da primeira ação que altere Supabase remoto, Meta, deploy, provider externo ou outro estado compartilhado:

1. a branch exata da rodada deve existir localmente **e em `origin`**;
2. os arquivos que causarão a mutação devem estar salvos na branch;
3. para DDL/migration, o arquivo exato da migration deve estar **commitado e publicado na branch antes de ser aplicado remotamente**;
4. para deploy/configuração externa relevante, o código/config correspondente deve estar commitado e publicado antes do deploy quando isso for tecnicamente possível;
5. um único commit de checkpoint pode agrupar todos os artefatos de mutação da rodada.

Depois desse checkpoint, continue a execução normalmente. Não criar um commit por comando, por teste ou por migration se várias puderem ser agrupadas com segurança.

Se o estado remoto precisar ser alterado antes de existir artefato versionável correspondente, **pare e reporte ao GPT** em vez de improvisar.

## Execução

- executar somente o escopo autorizado;
- não antecipar fase/rodada;
- não inventar arquitetura, provider, segredo ou permissão;
- não operar em `business-weaver` nem em outro projeto Supabase;
- não mergear `main`, não force-push, não reescrever histórico;
- nunca expor secrets/PII desnecessária;
- não autoaprovar nem autopromover.

## Provas por delta

Estado promovido é baseline. Provar **o que mudou + raio de impacto real**.

- risco crítico (auth/RLS/tenancy/secrets/dinheiro/mutação externa/permissão): prova focada real quando útil + regressões diretamente relacionadas;
- risco funcional: testes afetados + integração principal quando necessária;
- risco baixo/docs/config sem runtime: checks pertinentes, sem suíte completa local.

Correção pequena testa o defeito e seu impacto direto. **Não repetir bateria completa anterior** salvo primitive compartilhada alterada, raio de impacto desconhecido ou exigência explícita do GPT.

Por padrão:

- `npm ci` local só se dependências/lockfile mudarem ou houver necessidade real;
- testes locais só novos/afetados;
- build local só se o delta afetar build/rotas/configuração ou o mandato exigir;
- suíte completa uma única vez na CI final;
- agrupar consultas remotas;
- não repetir E2E remoto de componente não alterado.

## Relatório e handoff

Relatório é índice de evidências:

- rodada normal: alvo ≤100 linhas / ~10 KB;
- microcorreção: alvo ≤60 linhas / ~6 KB;
- exceder apenas por incidente material.

Registrar: resumo do preflight, arquivos alterados, decisões não óbvias, `prova → fonte/comando → resultado`, migrations/config remota, gates, branch e pendências.

Não copiar logs, SQL/código inteiro, documentação oficial ou histórico.

### Handoff é gate técnico, não tarefa administrativa

Claude **não pode declarar que terminou** enquanto não confirmar cumulativamente:

1. está na branch correta;
2. `HEAD` está commitado e publicado em `origin/<branch>`;
3. o relatório esperado existe nessa branch;
4. `estado.md` da branch registra `EXECUTADA — AGUARDANDO AUDITORIA GPT` ou o estado final exigido pela correção;
5. existe PR para `main` quando o mandato exigir;
6. o PR aponta para a branch/HEAD corretos;
7. a CI exigida pelo mandato foi iniciada e concluiu verde, salvo blocker explicitamente previsto;
8. `git status` não contém trabalho autorizado esquecido fora do handoff.

Se qualquer item falhar, a rodada está **EM EXECUÇÃO/BLOQUEADA**, não “terminada”. Corrigir o handoff na própria sessão sem repetir testes já válidos.

Preferir um único commit/push final quando não há mutação externa. Em rodada com mutação externa, são aceitáveis **até dois checkpoints normais**: um pré-mutação durável e um handoff final.

## Gate humano

Quando indispensável e resolvível na sessão: concluir primeiro o trabalho autônomo, declarar `GATE HUMANO ATIVO`, explicar em linguagem simples, pedir somente a ação necessária, aguardar e retomar. Não transformar gate simples em handoff para outro agente.

## Parada

Se `estado.md` disser aguardando auditoria/aprovação, bloqueado ou sem mandato, **não implementar**. Se houver contradição material entre mandato e canônico, ou necessidade fora do escopo, parar e reportar ao GPT.