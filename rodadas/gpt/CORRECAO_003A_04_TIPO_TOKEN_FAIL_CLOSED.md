# CORREÇÃO 003A-04 — TIPO DE TOKEN DESCONHECIDO FAIL-CLOSED

Status: **AUTORIZADA**
Data: 2026-08-24
Branch: `claude/rodada-003a-meta-connection-foundation`
PR: #11

Esta é uma microcorreção da 003A-03. Não altera arquitetura, banco, OAuth nem configuração Meta. **Não executar a desconexão real nesta correção.**

## 1. Resultado da reauditoria 003A-03

Head auditado: `98db346e1a110f74627ee1c77a8593905591b688`.

A 003A-03 fechou corretamente o bloqueio `190`:

- erro `190` não é mais tratado como prova de revogação;
- sucesso do provider não basta;
- o mesmo token é reinspecionado depois;
- apenas `is_valid === false` permite limpeza local;
- falha de rede, HTTP ruim, resposta sem `is_valid` e token ainda válido falham fechado;
- o bloqueio anterior de erro de leitura do Vault continua protegido;
- CI `32746073927` passou em install, lint, typecheck, Edge Functions, testes e build;
- a conexão real continua `ACTIVE`, com segredo preservado no Vault.

## 2. Único desvio bloqueante

O mandato 003A-03 determinou que **tipo desconhecido não deve levar a uma revogação adivinhada**.

O código atual ainda faz:

- `SYSTEM_USER` → `oauth/revoke`;
- qualquer outro tipo → `/permissions`.

E o teste atual consolida isso com o caso `PAGE`, dizendo que "tipo desconhecido segue pelo caminho conservador de usuário".

Isso não é fail-closed. Se o token está válido e a Meta devolve tipo diferente de `SYSTEM_USER` ou `USER`, o sistema não sabe qual mecanismo remoto é correto e não deve executar uma mutação externa por tentativa.

## 3. Correção obrigatória

No `revokeOnMeta`:

1. executar `debug_token` inicial;
2. se a inspeção falhar ou `is_valid` não for booleano → falhar fechado;
3. se `is_valid === false` → o mesmo token está comprovadamente inativo; limpeza local pode seguir, independentemente de `type`;
4. se `is_valid === true`:
   - `type === SYSTEM_USER` → usar `oauth/revoke`;
   - `type === USER` → usar `/permissions`;
   - qualquer outro valor/ausência de `type` → **falhar fechado antes de qualquer endpoint de revogação**;
5. após sucesso explícito da revogação, reinspecionar o mesmo token;
6. se a pós-inspeção falhar ou não trouxer `is_valid` booleano → falhar fechado;
7. `is_valid === false` é a pós-condição suficiente para limpeza local; `type` não precisa continuar presente depois que a invalidez do mesmo token foi comprovada.

Nota de refinamento: a 003A-03 dizia genericamente que "tipo desconhecido" na pós-verificação deveria falhar. Para o critério de segurança isso é mais restritivo do que necessário. O tipo serve para escolher a primitive de revogação enquanto o token está **válido**; depois, a única pós-condição material é a invalidez explícita do mesmo token.

## 4. Provas mínimas

Alterar apenas os testes afetados.

Provar:

1. token válido com `type: PAGE` (ou outro tipo não reconhecido) → `PROVIDER_REVOKE_FAILED`;
2. nesse caso, não chama `/permissions`, não chama `oauth/revoke` e não chama `revoke_meta_connection`;
3. token válido com `type` ausente → mesmo comportamento fail-closed;
4. `SYSTEM_USER` e `USER` continuam usando somente seus mecanismos respectivos;
5. pós-verificação `is_valid=false` continua liberando limpeza mesmo se `type` não vier na resposta;
6. testes de `190`, pós-verificação ainda válida, erro de leitura do Vault e falha de inspeção continuam passando.

## 5. Escopo e handoff

- não tocar em migrations;
- não repetir prova SQL antiga;
- rodar apenas testes de `src/lib/meta` afetados;
- lint/typecheck se pertinentes ao delta;
- CI completa uma vez no PR final;
- atualizar relatório, PR e estado da branch;
- push na mesma branch;
- parar em `003A-04 EXECUTADA — AGUARDANDO REAUDITORIA GPT`.

## 6. Proibições

- **NÃO executar a desconexão Meta real**;
- NÃO refazer OAuth;
- NÃO selecionar ativos;
- NÃO revogar pelo painel Meta;
- NÃO iniciar 003B;
- NÃO promover 003A.

Se surgir necessidade de mudar o mecanismo `oauth/revoke` ou o contrato de autenticação externo, parar em `DECISÃO ARQUITETURAL NECESSÁRIA — AGUARDANDO GPT`.
