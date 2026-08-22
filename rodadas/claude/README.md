# Entregas do Claude Code

Esta pasta recebe os relatórios formais de execução do Claude Code.

## Regra

O Claude não deve devolver apenas um resumo no terminal. Ao concluir cada rodada ou correção, deve criar e versionar aqui o relatório indicado por `estado.md`.

Exemplo da rodada atual:

`RELATORIO_RODADA_000_BOOTSTRAP_TECNICO.md`

O relatório deve conter, no mínimo:

- preflight e confirmação do repositório correto;
- branch e commit;
- implementação realizada;
- migrations/alterações Supabase, se autorizadas;
- segurança e secrets;
- comandos de prova e resultados;
- pendências/bloqueios;
- working tree final;
- conclusão sobre aptidão para auditoria.

O Claude não promove a próxima fase. A promoção ocorre somente após auditoria GPT.
