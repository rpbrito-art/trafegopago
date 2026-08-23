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

Preferir **um único commit/push final** com implementação + testes + relatório + estado. O relatório não precisa conhecer o próprio SHA.

## Gate humano

Quando indispensável e resolvível na sessão: concluir primeiro o trabalho autônomo, declarar `GATE HUMANO ATIVO`, explicar em linguagem simples, pedir somente a ação necessária, aguardar e retomar. Não transformar gate simples em handoff para outro agente.

## Parada

Se `estado.md` disser aguardando auditoria/aprovação, bloqueado ou sem mandato, **não implementar**. Se houver contradição material entre mandato e canônico, ou necessidade fora do escopo, parar e reportar ao GPT.