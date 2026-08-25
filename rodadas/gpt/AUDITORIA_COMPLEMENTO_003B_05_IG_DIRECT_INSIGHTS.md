# AUDITORIA GPT — COMPLEMENTO 003B-05: IG User + Insights diretos

Data: 2026-08-25

Branch auditada: `claude/rodada-003b-meta-asset-discovery-selection`

HEAD auditado: `1771965805a09082579da1f1baea58b674f24084`

CI: run `32844721885` — **SUCCESS**.

Relatório Claude: `rodadas/claude/RELATORIO_COMPLEMENTO_003B_05_IG_DIRECT_INSIGHTS.md`.

## Veredito

**APROVADO COMO EVIDÊNCIA READ-ONLY.**

A sonda `scripts/meta-ig-direct-003b-05-probe.mjs` foi conferida contra o mandato. Ela:

- usa a conexão ACTIVE já existente;
- lê o token pelo caminho server-side/Vault;
- usa Graph API v26.0;
- executa somente as duas leituras autorizadas;
- não repete OAuth ou sondas anteriores;
- não escreve em tabelas de produto;
- não persiste Instagram, Ad Account ou Page Access Token;
- não altera permissões/configuração Meta;
- não importa conteúdo;
- não altera código de produto.

## Evidência executada

Com o mesmo User Access Token do experimento 003B-05:

1. `GET /17841429590351285?fields=id,username,media_count,followers_count` → **HTTP 200**;
   - `username=goquoron`;
   - `media_count=9`;
   - `followers_count=0`.
2. `GET /17841429590351285/insights?metric=reach&period=day` → **HTTP 200**;
   - uma métrica `reach`;
   - período `day`;
   - dois pontos retornados.

Nenhum `ads_management`, `business_management` ou Page Access Token foi necessário para essas duas capacidades no arranjo real testado.

## Verificação independente

O GPT reconfirmou no Supabase após a execução:

- conexão `655da6e6-9056-456d-a81d-5e2570da5faf` em `ACTIVE`;
- `external_user_id=28050226117920563`;
- `external_business_id=null`;
- mesmos scopes concedidos;
- `instagram_accounts=0`;
- `ad_accounts=0`.

O PR #12 permanece draft, aberto e não mergeado, apontando para o HEAD auditado acima.

## Conclusão factual

O User Access Token corrente provou capacidade downstream suficiente para a leitura orgânica mínima da Fase 4:

`Page conhecida → IG vinculado → IG User → Insights`

O único ponto material ainda falho no experimento USER é a descoberta genérica inicial:

`/me/accounts` → HTTP 200 com lista vazia.

A fixture `17841429590351285` serviu somente para diagnóstico e não pode virar mecanismo de produto.

A causa interna da Meta para o vazio de `/me/accounts` permanece desconhecida; não atribuir causa sem prova.
