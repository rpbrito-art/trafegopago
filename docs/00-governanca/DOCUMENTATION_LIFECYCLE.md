# CICLO DE VIDA E EFICIÊNCIA DOCUMENTAL — TRÁFEGO PAGO

Status: canônico
Atualizado: 2026-08-23

## 1. Princípios

`preservar tudo ≠ ler tudo`

`rigor ≠ repetição`

`estado operacional ≠ documentação canônica`

O projeto deve minimizar dois custos: contexto lido por agentes e quantidade de arquivos alterados por rodada.

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

## 5. Prova proporcional

Estado promovido é baseline.

- risco crítico: delta + fronteira crítica + regressões diretamente afetadas;
- risco funcional: testes afetados + integração principal quando necessária;
- risco baixo: checks pertinentes;
- correção pequena: defeito + impacto direto.

Suíte completa uma única vez na CI final por padrão.

## 6. CI sem duplicação por evento

A suíte completa não deve rodar simultaneamente por `push` de branch e `pull_request` do mesmo commit.

Padrão:

- `pull_request` para `main`: valida branch antes de promoção;
- `push` apenas em `main`: valida estado já incorporado.

Branches de execução não disparam CI completa só pelo push quando ainda não há PR.

## 7. Relatórios

- rodada normal: ≤100 linhas/~10 KB;
- microcorreção: ≤60 linhas/~6 KB;
- exceder só por incidente material.

Não copiar logs, código, SQL ou documentação oficial quando o GPT pode consultar a fonte.

## 8. Gatilhos de reciclagem

Reciclar dentro de etapa substantiva quando:

- fechar fase;
- ~5 rodadas promovidas desde a última síntese;
- histórico começar a ser relido repetidamente;
- um canônico for substituído;
- ACTIVE_DOCS perder clareza.

Não criar rodada só para housekeeping.

## 9. Resultado esperado

O custo de documentação por rodada permanece quase constante, mesmo que o repositório acumule anos de história.