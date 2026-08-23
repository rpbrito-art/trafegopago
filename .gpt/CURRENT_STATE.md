# CURRENT STATE — compatibilidade

O estado operacional canônico é:

`/estado.md`

Este arquivo existe apenas para compatibilidade com fluxos antigos. **Não mantém estado paralelo e não é leitura obrigatória do Claude Code.**

## GPT / novo chat

1. `.gpt/PROJECT_PROMPT.md`;
2. `/estado.md`;
3. `ACTIVE_DOCS.md` como índice;
4. mandato/correção vigente + READ SET necessário.

## Claude Code

`CLAUDE.md` é carregado automaticamente. Em `/proxima`:

1. `git fetch`/preflight;
2. `/estado.md`;
3. mandato/correção vigente;
4. somente READ SET obrigatório.

Claude abre `PROJECT_PROMPT.md`, `ACTIVE_DOCS.md`, `HISTORY_SUMMARY.md` ou histórico apenas quando o mandato exigir ou houver dependência concreta/ambiguidade.