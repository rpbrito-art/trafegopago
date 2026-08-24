# INVESTIGAÇÃO 003A-05 — E2E REAL DE DESCONEXÃO FALHOU FECHADO

Status: **AUTORIZADA — INVESTIGAÇÃO SOMENTE**
Data: 2026-08-24
Branch de trabalho: `claude/rodada-003a-meta-connection-foundation`
PR: #11

## 1. Fato observado no gate humano

O fundador executou uma única vez o E2E real autorizado pela UI em `http://localhost:3000/conta`, acionando **Desconectar** na conexão `Teste 003A - conexao Meta`.

Resultado visível:

- redirect para `/conta?meta=erro`;
- UI continuou mostrando **Meta conectada**;
- nenhum novo clique foi realizado.

Auditoria GPT imediatamente após o clique confirmou no Supabase remoto:

- conexão continua `ACTIVE`;
- `disconnected_at` continua nulo;
- `token_secret_reference` continua presente;
- segredo correspondente continua existente no Vault;
- escopos e `external_user_id` continuam preservados.

Portanto o comportamento fail-closed funcionou: **a falha real não produziu limpeza local enganosa**.

O que ainda não sabemos é em qual etapa o E2E parou.

## 2. Objetivo

Determinar factual e minimamente se a tentativa real falhou em:

1. leitura do token no Vault;
2. inspeção inicial `debug_token`;
3. chamada `oauth/revoke` para `SYSTEM_USER`;
4. pós-verificação `debug_token`;
5. ou outra condição concreta do runtime.

A investigação deve responder também ao ponto mais importante após uma tentativa real: **o token Meta está válido ou inválido agora?**

## 3. Limites obrigatórios

Esta investigação **NÃO autoriza nova tentativa de desconexão**.

Claude Code pode:

- inspecionar logs locais gerados pela tentativa já ocorrida, se ainda disponíveis;
- inspecionar código/runtime para reconstruir qual caminho foi tomado;
- consultar o Supabase de forma somente leitura;
- ler o token exclusivamente pela fronteira server-side já existente, sem imprimir, copiar ou persistir seu valor;
- executar chamada **somente leitura** de `debug_token` para o token existente, registrando apenas fatos não secretos como `is_valid`, `type`, HTTP status e códigos de erro sanitizados;
- criar instrumentação temporária/local somente se indispensável para diagnóstico, sem commit de segredo e sem disparar revogação.

Claude Code NÃO pode:

- chamar `oauth/revoke` novamente;
- chamar `/permissions`;
- clicar `Desconectar`;
- revogar pelo painel Meta;
- refazer OAuth;
- selecionar ativos;
- limpar estado local;
- alterar migration/schema;
- iniciar 003B;
- promover 003A;
- pedir App Secret ou token ao fundador/GPT;
- imprimir token, App Secret ou URL completa que contenha credenciais.

## 4. Evidência esperada

Relatar ao GPT, sem segredos:

- estado remoto antes/depois da investigação;
- se o token atual está `is_valid=true` ou `is_valid=false` em `debug_token`;
- `type` atual quando houver;
- qualquer log seguro já existente da tentativa;
- qual etapa é comprovadamente a causa, ou quais hipóteses continuam abertas;
- se o endpoint de revogação chegou a ser chamado na tentativa anterior, apenas se houver evidência concreta;
- nenhuma conclusão arquitetural além dos fatos.

Se houver ambiguidade arquitetural sobre como a Meta espera que o `oauth/revoke` seja autenticado ou sobre o significado da resposta real, parar em:

`DECISÃO ARQUITETURAL NECESSÁRIA — AGUARDANDO GPT`

## 5. Handoff

Atualizar o relatório existente da 003A e a descrição da PR #11 com uma seção `Investigação 003A-05`.

Não executar CI por ritual se nenhum código versionado for alterado. Se for necessária apenas investigação, publicar somente documentação/relatório e parar em:

`INVESTIGAÇÃO 003A-05 CONCLUÍDA — AGUARDANDO GPT`
