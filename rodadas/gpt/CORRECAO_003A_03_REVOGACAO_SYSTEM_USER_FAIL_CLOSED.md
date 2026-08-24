# CORREÇÃO 003A-03 — REVOGAÇÃO SYSTEM_USER FAIL-CLOSED

Status: **AUTORIZADA**
Data: 2026-08-24
Branch: `claude/rodada-003a-meta-connection-foundation`
PR: #11

Esta correção continua a 003A já autorizada e fecha um bloqueio de segurança encontrado na reauditoria GPT. **Não exige nova aprovação do fundador.**

## 1. Motivo

A correção anterior do Vault passou: erro de `read_meta_connection_token` agora falha fechado.

A reauditoria encontrou, porém, outro caminho que ainda pode limpar o estado local sem prova suficiente de revogação externa.

Hoje `revokeSystemUserToken()` trata qualquer resposta Meta com `error.code === 190` como se significasse necessariamente "o token alvo já está revogado" e retorna sucesso. Depois disso `disconnectMeta()` pode executar `revoke_meta_connection` e apagar a referência/segredo local.

Esse pressuposto não é seguro. O código `190` pertence à família de erros de validação/autenticação de access token e pode ocorrer por causas diferentes. No endpoint `oauth/revoke` existem inclusive duas credenciais relevantes (`revoke_token` e `access_token`). A mera presença de `190` não prova qual delas falhou nem prova que o `revoke_token` ficou inativo.

Invariante obrigatória:

**o estado local só pode ser limpo quando o provider estiver comprovadamente sem token ativo.**

## 2. Preflight

1. `git fetch origin`;
2. reconciliar a branch com a `main` atual, que contém governança nova desde o head anterior;
3. confirmar que a conexão real `Teste 003A - conexao Meta` continua `ACTIVE` e NÃO alterá-la;
4. confirmar HEAD de partida esperado `0b9e10d48cbddbbe63017ea428aa1ab797e21574` ou explicar divergência factual antes de editar.

## 3. Correção obrigatória

### 3.1 Remover a equivalência `190 = já revogado`

No caminho `SYSTEM_USER`:

- resposta de erro do `oauth/revoke`, inclusive código `190`, deve falhar fechado;
- não chamar `revoke_meta_connection` após erro de provider;
- não remover segredo/referência local;
- não reinterpretar mensagem/subcode não contratados como prova de revogação.

Aplicar a mesma regra conservadora ao caminho `USER` se a primitive compartilhada atual mantiver a mesma suposição: erro de revogação não equivale por si só a revogação comprovada.

### 3.2 Fonte válida para "já inativo"

Antes da tentativa de revogação, `debug_token` com `is_valid === false` pode ser tratado como prova de que aquele token já não está ativo. Nesse caso a limpeza local é permitida sem nova chamada de revogação.

Falha de `debug_token`, tipo desconhecido ou resposta ambígua não deve ser tratada como token inválido.

### 3.3 Verificar a pós-condição após sucesso

Depois de uma resposta explícita de sucesso do mecanismo oficial de revogação, verificar novamente o **mesmo token alvo** via `debug_token`.

Somente quando a pós-verificação mostrar `is_valid === false` a operação pode seguir para `revoke_meta_connection`.

Se a pós-verificação:

- falhar por rede/provider;
- devolver tipo/estado desconhecido;
- ou ainda mostrar o token como válido;

a desconexão deve falhar fechado e preservar o estado local. Uma nova tentativa poderá concluir depois.

Essa verificação transforma a regra de segurança em pós-condição observável: não basta o provider dizer que aceitou o pedido; antes de apagar nossa única credencial, comprovamos que ela deixou de estar ativa.

## 4. Provas mínimas

Alterar apenas os testes afetados de `src/lib/meta`.

Provar no mínimo:

1. `SYSTEM_USER` válido + `oauth/revoke` retorna erro 190 → `PROVIDER_REVOKE_FAILED`; não há revogação local;
2. `oauth/revoke` retorna sucesso, mas pós-`debug_token` ainda é válido → falha fechado; não há revogação local;
3. `oauth/revoke` retorna sucesso e pós-`debug_token` é inválido → revogação local pode ocorrer;
4. pré-`debug_token` já inválido → não chama `oauth/revoke`, mas pode limpar localmente;
5. falha/UNKNOWN em qualquer verificação não completa a desconexão;
6. o bloqueio anterior de erro de leitura do Vault continua passando.

Não executar a desconexão Meta real nesta correção.

## 5. Prova e handoff

- rodar somente testes novos/afetados;
- lint/typecheck apenas se o delta os tornar pertinentes;
- CI completa uma vez no PR final;
- atualizar o relatório existente e o estado da branch;
- atualizar a descrição da PR se ela continuar relatando estado antigo;
- push na mesma branch e parar em `AGUARDANDO REAUDITORIA GPT`.

Não repetir a bateria SQL antiga por ritual. Se tocar no script de prova e encontrar contagem de migration desatualizada, corrigir no mesmo delta sem transformar isso em nova etapa.

## 6. Fora de escopo e proibições

- **NÃO clicar nem executar a desconexão real**;
- NÃO revogar pelo painel Meta;
- NÃO refazer OAuth;
- NÃO selecionar ativos;
- NÃO iniciar 003B;
- NÃO promover 003A;
- NÃO mudar o mecanismo `oauth/revoke` por conta própria;
- se a execução demonstrar que o contrato de autenticação do `oauth/revoke` exige mecanismo arquitetural diferente do já definido, parar em `DECISÃO ARQUITETURAL NECESSÁRIA — AGUARDANDO GPT`.

## 7. Critério para liberar o E2E real

O GPT só poderá autorizar a desconexão real depois de reauditar esta correção e confirmar que **nenhum erro ou ambiguidade externa consegue disparar limpeza local**.
