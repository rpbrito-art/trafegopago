# REAUDITORIA 003A-08 — CLASSIFICAÇÃO NÃO-BISU FAIL-CLOSED

Data: 2026-08-24
PR: #11
Head auditado: `99b9c79e59e70db0689bcc773551236584f48253`
CI: `32762552984` — success.

## Veredicto

**003A-08 AUDITADA E APROVADA — GATE HUMANO DE DESCONEXÃO BISU AUTORIZADO.**

## O que foi auditado

A correção fechou o bloqueio da 003A-07:

- `GET /me?fields=client_business_id` exige resposta classificável antes de liberar qualquer mutação USER;
- corpo `{}` falha fechado;
- ausência ou vazio de `id` falha fechado;
- `client_business_id` presente mas vazio, nulo ou de tipo inválido falha fechado;
- identidade divergente do `external_user_id` persistido falha fechado;
- nesses casos `/permissions` não é chamado e `revoke_meta_connection` não é chamado;
- USER legítimo com `id` coerente e `client_business_id` ausente preserva o caminho `/permissions` + pós-verificação;
- BISU legítimo continua retornando `EXTERNAL_ACTION_REQUIRED` sem mutação;
- `oauth/revoke` e `/access_tokens` não foram reintroduzidos.

Os testes específicos cobrem os casos exigidos pelo mandato. A CI do head auditado passou em install, lint, typecheck, Edge Functions, testes e build.

## Estado remoto antes do gate

A conexão real `Teste 003A - conexao Meta` foi reconferida no Supabase imediatamente após a auditoria:

- status `ACTIVE`;
- `connected_at` e `updated_at` continuam no instante original;
- `disconnected_at` nulo;
- referência do token presente;
- segredo correspondente presente no Vault;
- `external_user_id` preservado.

Nenhum E2E real foi executado durante a 003A-08.

## Gate humano autorizado

Fica autorizado o E2E real do fluxo BISU, conduzido pelo GPT em ações manuais unitárias:

1. iniciar o fluxo pelo botão `Desconectar` no Tráfego Pago e comprovar que a UI mostra a orientação externa sem alterar o estado local;
2. somente depois, remover o aplicativo no ambiente Meta em `Configurações do negócio > Integrações > Aplicativos conectados`;
3. voltar ao Tráfego Pago e usar `Já removi — verificar`;
4. o GPT audita Meta/Supabase e só aprova a 003A se a pós-condição real ficar comprovada: token inválido, segredo removido, conexão `REVOKED` e `disconnected_at` preenchido.

A promoção da 003A continua proibida até esse gate real ser concluído e auditado.
