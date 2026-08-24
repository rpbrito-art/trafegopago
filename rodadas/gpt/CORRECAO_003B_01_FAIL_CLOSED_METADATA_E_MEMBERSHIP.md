# CORREÇÃO 003B-01 — FAIL-CLOSED DE METADADOS + RECHECK DE MEMBERSHIP

Status: **AUTORIZADA PELO GPT — EXECUTAR ANTES DO GATE EXTERNO META**

Rodada: **003B — Meta Asset Discovery & Selection**

Branch corrente: `claude/rodada-003b-meta-asset-discovery-selection`
PR: **#12 draft**
HEAD auditado antes da correção: `6fe1dac32912e11afab1382e0c9fdfbf6d39b920`

## 1. Resultado da auditoria pré-gate

A fundação da 003B passou nos pontos já executados:

- migration `20260824210000_create_meta_asset_selection.sql` presente no remoto;
- histórico remoto com 15 migrations;
- `instagram_accounts` e `ad_accounts` presentes e sem resíduo do proof;
- RLS habilitado;
- `authenticated` sem INSERT/UPDATE/DELETE nas tabelas;
- external ids fora dos grants SELECT do browser;
- funções `select_instagram_account` e `select_ad_account` são `security invoker`, sem EXECUTE para `authenticated`/`anon`, com EXECUTE para `service_role`;
- CI do HEAD `6fe1dac...`: run `32777340430`, verde;
- nenhum OAuth novo nem alteração manual na Meta foi executado.

A rodada **não está aprovada nem liberada para o gate externo** por causa dos itens abaixo.

## 2. Bloqueio A — erro ao ler IG User está falhando aberto

Em `src/lib/meta/assets.ts`, `lerMetadadosInstagram` retorna `null` tanto quando:

- a resposta é HTTP não-OK; quanto
- há falha de rede.

`descobrirInstagram` interpreta esse `null` como simples ausência de metadata e mantém o candidato. O teste `metadado que não veio não elimina o candidato` inclusive fixa HTTP 400 como sucesso parcial.

Isso viola o mandato 003B §6, que exige:

`provider 4xx/5xx/rede em fail-closed`.

Também é material porque o contrato atual da Meta para Instagram API with Facebook Login documenta Page Access Token em parte dos fluxos. Se o BISU da conexão não puder ler o IG User diretamente, essa recusa é o gate arquitetural previsto no próprio mandato — não um campo opcional ausente.

### Correção obrigatória

Separar claramente:

1. **HTTP 2xx com campos opcionais ausentes** → candidato continua válido com metadata nula;
2. **HTTP 4xx/5xx** → devolver falha sanitizada do domínio (`MISSING_PERMISSION`, `CONNECTION_REJECTED` ou `PROVIDER_UNAVAILABLE`, conforme a mesma taxonomia já usada no gateway);
3. **falha de rede / corpo inválido quando necessário para a leitura** → `PROVIDER_UNAVAILABLE`;
4. nenhuma dessas falhas pode chegar a `select_instagram_account` como candidato gravável.

Não logar `message`, URL completa ou token.

### Provas mínimas

Adicionar testes que provem, no mínimo:

- metadata IG 400/code 190 → fail-closed, sem RPC de seleção;
- metadata IG 403/code 10 ou 200 → `MISSING_PERMISSION`, sem RPC de seleção;
- metadata IG 500 → fail-closed, sem RPC;
- metadata IG rede quebrada → fail-closed, sem RPC;
- metadata IG HTTP 200 com `username`/`name` ausentes → candidato continua válido com campos nulos.

## 3. Bloqueio B — membership só é validada antes das chamadas externas

`selectInstagramAccount` e `selectAdAccount` carregam a conexão e validam membership antes da redescoberta na Meta, mas depois podem fazer uma ou várias chamadas externas antes da RPC privilegiada que persiste a escolha.

Nesse intervalo, a membership pode ser removida. O servidor usa `service_role`, portanto a gravação não é barrada automaticamente por RLS.

### Correção obrigatória

Revalidar membership **novamente imediatamente antes** de chamar `select_instagram_account` / `select_ad_account`.

A correção deve ser mínima e compatível com o padrão já usado na 003A: autorização é fato temporal e precisa ser reconferida depois de um intervalo externo relevante.

Não criar nova migration apenas para isso, salvo se o executor provar que uma mudança de banco é indispensável e parar antes dela para decisão GPT.

### Provas mínimas

- membership ativa no início e removida durante a redescoberta → nenhuma RPC de seleção;
- mesmo caso para Instagram e Ad Account;
- caminho normal continua gravando.

## 4. Não alterar nesta correção

- migration `20260824210000` já aplicada;
- schema das tabelas, salvo bloqueio novo comprovado;
- configuração Meta;
- `META_LOGIN_CONFIG_ID`;
- OAuth real;
- escopos;
- Page Access Token;
- `ads_management` / `business_management`;
- importação de conteúdo;
- Fase 4.

## 5. Execução e prova

Claude deve:

1. reconciliar a branch com a `main` para receber esta correção e o estado atualizado;
2. implementar somente os dois deltas acima;
3. executar testes focados suficientes;
4. executar a suíte/CI uma vez no HEAD final;
5. atualizar o relatório da 003B com o delta;
6. parar em `003B-01 EXECUTADA — AGUARDANDO AUDITORIA GPT`.

Não avançar ao gate Meta antes da nova auditoria GPT.
