# CORREÇÃO 003A-01 — HANDOFF E RECONCILIAÇÃO DA EXECUÇÃO

Status: **AUTORIZADA**
Data: 2026-08-23

## Motivo

A execução da 003A alterou o Supabase remoto, mas o handoff obrigatório não chegou ao GitHub.

Auditoria independente encontrou no projeto `cbnxdoxpyioxjwgjhbtq`:

- histórico de migrations passou de 9 para **12**;
- migrations remotas novas:
  - `20260823195327 create_meta_connection_foundation`;
  - `20260823195742 create_meta_token_vault_boundary`;
  - `20260823200706 fix_meta_disconnect_atomicity`;
- `public.meta_connections` existe;
- `public.meta_oauth_intents` existe;
- ambas com RLS;
- `meta_oauth_intents` sem policies de browser;
- `meta_connections` com SELECT por membership ACTIVE;
- 0 linhas residuais nas duas tabelas;
- funções Meta/Vault visíveis apenas a `postgres`/`service_role`;
- 0 objetos `public` owned por `supabase_admin`;
- Advisor sem novo ERROR de segurança.

Porém, no GitHub não existe branch `claude/rodada-003a-meta-connection-foundation`, PR 003A nem relatório versionado. Sem código, migrations versionadas, testes e relatório no Git, o GPT não consegue auditar nem promover a rodada.

## Escopo da correção

Esta é uma **microcorreção de handoff**, não uma nova implementação da 003A.

Claude deve:

1. `git fetch origin` e ler `estado.md` + esta correção;
2. localizar o trabalho 003A que já está no working tree/local history;
3. criar/usar a branch exata `claude/rodada-003a-meta-connection-foundation` a partir da `main` atual, preservando o trabalho já executado;
4. garantir que as **três migrations já aplicadas remotamente** existam no repositório com conteúdo correspondente ao estado remoto; **não reaplicar, não renomear, não reescrever migration aplicada**;
5. incluir código, testes e demais arquivos 003A já produzidos;
6. produzir `rodadas/claude/RELATORIO_RODADA_003A_META_CONNECTION_FOUNDATION.md` com no máximo ~60 linhas, focado em evidências e em qualquer gate Meta real realizado;
7. atualizar `estado.md` da branch para `003A EXECUTADA — AGUARDANDO AUDITORIA GPT`;
8. rodar somente checks de integridade do handoff e testes diretamente relacionados se necessários; **não repetir bateria pesada já executada apenas por ritual**;
9. push da branch e abrir PR draft para `main`;
10. parar.

## Proibições

- não iniciar 003B;
- não criar nova migration só para alinhar Git;
- não usar `migration repair`;
- não alterar Supabase remoto salvo se descobrir divergência objetiva entre migration local e schema remoto que torne a reconciliação impossível;
- não repetir OAuth real ou testes remotos se as evidências locais já existem e não houve mudança de implementação;
- não promover nem mergear.

## Critério de conclusão

O GPT precisa conseguir auditar, a partir do GitHub, exatamente o código e migrations responsáveis pelo estado remoto já encontrado.

Estado final esperado:

`003A EXECUTADA — AGUARDANDO AUDITORIA GPT`
