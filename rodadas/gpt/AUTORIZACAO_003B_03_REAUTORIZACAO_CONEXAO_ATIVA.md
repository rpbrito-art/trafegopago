# AUTORIZAÇÃO — CORREÇÃO 003B-03

Data: 2026-08-24
Rodada pai: **003B — Meta Asset Discovery & Selection**
Correção autorizada: `rodadas/gpt/CORRECAO_003B_03_REAUTORIZACAO_CONEXAO_ATIVA.md`

## Decisão do fundador

O fundador respondeu explicitamente **`autorizo`** em 2026-08-24.

Fica autorizada a execução pelo Claude da Correção 003B-03, limitada ao delta definido no documento acima.

## Escopo autorizado

- adicionar o botão **Atualizar autorização** no estado de permissão insuficiente;
- reutilizar o fluxo OAuth/backend já existente;
- ajustar a mensagem correspondente em linguagem de negócio;
- adicionar/ajustar testes previstos;
- executar lint, typecheck, testes e CI conforme o protocolo vigente da 003B.

## Não autorizado

- desconectar a conexão Meta real atual;
- remover integração na Meta;
- apagar ou substituir manualmente token no Vault;
- executar OAuth humano antes da auditoria GPT da implementação;
- criar migration, RPC ou endpoint novo sem prova de necessidade e nova decisão GPT;
- alterar arquitetura para Instagram Login / `instagram_business_*`;
- criar campanha, anúncio ou gasto;
- promover ou mergear a 003B.

## Gate de retorno

Ao terminar, o Claude deve parar em **AGUARDANDO AUDITORIA GPT**. O fundador não precisa traduzir relatório técnico: basta informar ao GPT que o Claude terminou.
