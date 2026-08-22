# Protocolo de Rodadas — Tráfego Pago

Esta pasta organiza o handoff operacional entre GPT e Claude Code.

## Estrutura

- `rodadas/gpt/` — mandatos de execução, correções e auditorias preparados pelo GPT.
- `rodadas/claude/` — relatórios de execução, evidências e devoluções produzidos pelo Claude Code.
- `/ESTADO.md` — estado operacional corrente e ponte entre ambos.

## Fluxo obrigatório

1. GPT atualiza `ESTADO.md` e cria um mandato numerado em `rodadas/gpt/`.
2. Claude Code lê `ESTADO.md`, `.gpt/PROJECT_PROMPT.md` e o mandato vigente.
3. Claude executa somente o escopo autorizado.
4. Claude grava o relatório final em `rodadas/claude/` usando o nome indicado pelo estado.
5. GPT lê o relatório, inspeciona GitHub/diff/provas e decide: aprovar, corrigir ou bloquear.
6. Nova execução exige novo mandato ou correção formal em `rodadas/gpt/`.

## Numeração

- Rodadas principais: `RODADA_000`, `RODADA_001`, `RODADA_002` etc.
- Correções de uma rodada: `RODADA_000_CORRECAO_01`, `RODADA_000_CORRECAO_02` etc.
- Relatórios do Claude devem espelhar exatamente a identificação do mandato.

## Regra de autoridade

Chat não é fonte operacional suficiente. A instrução executável deve existir no GitHub.

Produto e arquitetura continuam definidos pelos documentos canônicos em `docs/`. Uma rodada não pode contradizê-los silenciosamente.
