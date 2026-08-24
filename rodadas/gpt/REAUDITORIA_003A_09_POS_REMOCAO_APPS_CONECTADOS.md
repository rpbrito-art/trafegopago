# REAUDITORIA 003A-09 — PÓS-REMOÇÃO EM APPS CONECTADOS

Status: **AUDITADA E APROVADA COMO INVESTIGAÇÃO — CORREÇÃO ESTRUTURAL NECESSÁRIA**
Data: 2026-08-24

## 1. Escopo auditado

Head da PR #11 após a investigação: `25934c498dd96a72d6584de95d3af08790ae6204`.

A investigação autorizada era somente leitura e deveria provar a resposta atual da Meta após a remoção correta do app em **Apps conectados**.

## 2. Fatos aprovados

A execução ficou dentro do mandato:

- nenhuma alteração de código funcional;
- nenhuma migration nova;
- nenhum endpoint Meta mutável;
- nenhum clique/desconexão adicional;
- script temporário não versionado;
- token/App Secret não impressos.

Resultado real:

- `GET /debug_token` para o token alvo: HTTP 400, `GraphMethodException`, code 100, sem `data`;
- app token inspecionando a si mesmo: HTTP 200, `is_valid=true`, `type=APP`;
- `GET /me` com o token alvo: HTTP 400, `OAuthException`, code 190, subcode 464;
- token sintético inexistente usado como controle: `debug_token` retorna HTTP 200 com `is_valid=false`.

Logo, depois da remoção correta em Apps conectados, o BISU real **não produz** a pós-condição `HTTP 200 + is_valid=false` que a implementação exigia.

## 3. Por que a UI terminou em erro

`inspectToken()` atualmente aceita somente resposta HTTP ok com `data.is_valid` booleano.

Como o BISU removido devolve HTTP 400 sem `data`, o gateway classifica o resultado como não verificável e preserva o estado local. Isso explica `/conta?meta=erro` e comprova que o fail-closed continuou funcionando.

## 4. Estado real independente

Após a investigação, o Supabase foi reconferido pelo GPT:

- conexão `ACTIVE`;
- `disconnected_at` nulo;
- referência do token presente;
- segredo no Vault presente;
- `updated_at` ainda no instante original da conexão.

## 5. Decisão

A investigação está **APROVADA**.

Não é seguro reintroduzir a regra ampla `error.code=190 => revogado`.

Ao mesmo tempo, exigir apenas `debug_token.is_valid=false` tornou o fluxo BISU impossível de concluir no comportamento real observado da Meta.

A solução deve ser contextual e persistente: marcar que uma conexão comprovadamente BISU entrou em fluxo de remoção externa e, somente nesse contexto, reconhecer uma pós-condição composta e read-only que prove que o token alvo deixou de ser utilizável enquanto a credencial do app permanece saudável.

Próximo mandato: `CORRECAO_003A_10_VERIFICACAO_BISU_POS_REMOCAO.md`.
