# CICLO DE VIDA E EFICIÊNCIA DOCUMENTAL — TRÁFEGO PAGO

Status: canônico
Atualizado: 2026-08-23

## 1. Princípios

`preservar tudo ≠ ler tudo`

`rigor ≠ repetição`

`estado operacional ≠ documentação canônica`

`mutação externa ≠ trabalho que pode existir só localmente`

O projeto deve minimizar dois custos: contexto lido por agentes e quantidade de arquivos alterados por rodada, sem permitir que Supabase/Meta/deploy avancem à frente do Git.

## 2. Responsabilidade única por documento

### `estado.md`

Único documento volátil de operação. Contém apenas:

- estado incorporado resumido;
- rodada/correção corrente;
- status;
- caminho do mandato e relatório;
- bloqueios que afetam a próxima ação;
- quem deve agir a seguir.

É normal mudar durante uma rodada. Não deve repetir arquitetura, baseline extenso, regras permanentes ou histórico detalhado.

### `.gpt/PROJECT_PROMPT.md`

Método permanente, papéis, invariantes e regras de governança. Atualizar apenas quando o método mudar.

### `CLAUDE.md` e `.claude/commands/proxima.md`

Contrato operacional estável do executor. Atualizar apenas quando o método de execução mudar.

### `ACTIVE_DOCS.md`

Índice dos canônicos ativos. **Não contém rodada/status/branch** e não é atualizado a cada rodada.

### `HISTORY_SUMMARY.md`

Histórico promovido comprimido. Atualizar em fechamento de fase, a cada ~5 rodadas promovidas ou quando houver gatilho real de reciclagem — não em toda rodada.

### `IMPLEMENTATION_ROADMAP.md`

Ordem macro de construção. Atualizar em fechamento/reordenação de fase ou mudança real de escopo macro, não por execução ordinária.

### Canônicos de produto/técnica

Atualizar somente se o contrato daquela área mudar. Uma rodada que apenas implementa contrato já existente não reescreve canônico por ritual.

### `rodadas/gpt/RODADA_*.md`

Especificação imutável da rodada. Criada uma vez. **Autorização vive em `estado.md`**, portanto o arquivo não precisa ser reescrito ao aprovar.

### `rodadas/claude/RELATORIO_*.md`

Criado uma vez no handoff do executor. Índice compacto de evidências.

### `rodadas/gpt/AUDITORIA_*.md`

Criado uma vez no julgamento GPT.

### Correção

Só existe se a auditoria bloquear. É criada automaticamente pelo GPT e `estado.md` passa a apontar para ela.

## 3. Atualizações normais por rodada

Uma rodada saudável costuma gerar apenas:

1. uma especificação `RODADA_*.md` antes da autorização;
2. pequenas mudanças em `estado.md` conforme o status muda;
3. implementação/código;
4. um relatório Claude;
5. uma auditoria GPT.

`ACTIVE_DOCS`, README, Charter, Prompt, Roadmap, History e canônicos **não devem mudar por padrão**.

## 4. Bootstrap do Claude

`CLAUDE.md automático → estado.md → mandato/correção → READ SET obrigatório`

Não reler por ritual `PROJECT_PROMPT`, `ACTIVE_DOCS`, `HISTORY_SUMMARY`, relatórios antigos ou todo o acervo canônico.

READ SET normal: até 5 documentos além de `estado + mandato`; preferir seções.

## 5. Durabilidade antes de mutação externa

Uma rodada nunca deve deixar Supabase, Meta, deploy ou outro sistema compartilhado mais avançado que o Git.

Antes da primeira mutação externa:

1. a branch exata da rodada já existe localmente e em `origin`;
2. o executor confirmou que não está em `main`/detached HEAD;
3. os artefatos responsáveis pela mutação já estão versionáveis na branch;
4. **migration/DDL precisa estar commitada e publicada antes de ser aplicada remotamente**;
5. deploy/configuração externa relevante deve ter seu código/config commitado antes quando tecnicamente possível.

É permitido um **checkpoint pré-mutação agrupado**, seguido de um handoff final. Isso é preferível a dezenas de commits pequenos e elimina o risco de “remoto avançou, Git ficou para trás”.

Não criar commit por teste/comando. Agrupar tudo que puder ser versionado com segurança antes da mutação.

## 6. Handoff como gate técnico

Handoff não é documentação opcional no fim da sessão. É condição de conclusão.

Antes de declarar a rodada terminada, Claude deve confirmar:

- branch correta existe em `origin`;
- HEAD local está publicado e coincide com a branch remota;
- relatório esperado está no commit remoto;
- `estado.md` da branch mostra o estado final de execução;
- PR para `main` existe quando previsto e aponta para o HEAD correto;
- CI exigida está verde, salvo blocker explicitamente previsto;
- working tree não contém trabalho autorizado esquecido.

Se qualquer item falhar, a rodada continua **EM EXECUÇÃO/BLOQUEADA**. O executor corrige o handoff sem repetir provas já válidas.

## 7. Prova proporcional

Estado promovido é baseline.

- risco crítico: delta + fronteira crítica + regressões diretamente afetadas;
- risco funcional: testes afetados + integração principal quando necessária;
- risco baixo: checks pertinentes;
- correção pequena: defeito + impacto direto.

Suíte completa uma única vez na CI final por padrão.

## 8. CI sem duplicação por evento

A suíte completa não deve rodar simultaneamente por `push` de branch e `pull_request` do mesmo commit.

Padrão:

- `pull_request` para `main`: valida branch antes de promoção;
- `push` apenas em `main`: valida estado já incorporado.

Branches de execução não disparam CI completa só pelo push quando ainda não há PR. Isso permite publicar o checkpoint pré-mutação sem duplicar a suíte.

## 9. Relatórios

- rodada normal: ≤100 linhas/~10 KB;
- microcorreção: ≤60 linhas/~6 KB;
- exceder só por incidente material.

Não copiar logs, código, SQL ou documentação oficial quando o GPT pode consultar a fonte.

## 10. Gatilhos de reciclagem

Reciclar dentro de etapa substantiva quando:

- fechar fase;
- ~5 rodadas promovidas desde a última síntese;
- histórico começar a ser relido repetidamente;
- um canônico for substituído;
- ACTIVE_DOCS perder clareza.

Não criar rodada só para housekeeping.

## 11. Resultado esperado

O custo de documentação por rodada permanece quase constante, e qualquer mudança externa relevante sempre possui uma trilha durável no Git antes de acontecer.