# INVESTIGAÇÃO 003A-09 — PÓS-REMOÇÃO EM APPS CONECTADOS

Status: **AUTORIZADA — SOMENTE LEITURA**
Data: 2026-08-24
Branch: `claude/rodada-003a-meta-connection-foundation`
PR: #11 draft

## 1. Contexto factual

O fundador removeu a integração correta `Trafego Pago Business Dev` (App ID `2940404272985831`) na superfície **Business Settings > Apps conectados** do portfólio Quoron.

Depois disso:

- houve novo login local antes/ao tentar retomar a verificação;
- o fundador clicou `Desconectar` mais de uma vez;
- a UI terminou em `/conta?meta=erro`;
- o Supabase permaneceu íntegro: conexão `ACTIVE`, `disconnected_at` nulo, referência do token presente e segredo ainda no Vault.

Portanto não há prova ainda de que o token esteja válido ou inválido após a remoção correta.

## 2. Objetivo

Provar, **sem qualquer mutação**, qual é a resposta atual da Meta para o mesmo token armazenado e por que o gateway está retornando erro após a remoção correta em `Apps conectados`.

## 3. Mandato ao Claude

Executar somente leitura e retornar fatos objetivos:

1. ler o token pelo caminho server-side já existente, sem imprimi-lo;
2. chamar `GET /debug_token` exatamente com a mesma credencial de app usada pelo gateway;
3. registrar somente:
   - HTTP status;
   - se `data.is_valid` existe e seu valor, quando booleano;
   - `data.type`, quando presente;
   - códigos/subcódigos sanitizados de erro, quando houver;
4. se `debug_token` responder erro HTTP, provar se o corpo contém informação suficiente para distinguir "token inválido" de "falha de autenticação/consulta" sem usar mensagem bruta como prova;
5. comparar o resultado com a lógica atual de `inspectToken()` e explicar objetivamente por que a ação termina em `?meta=erro`;
6. não alterar código, migrations, Meta, Supabase ou estado do token;
7. não chamar `oauth/revoke`, `/permissions`, `/access_tokens` nem qualquer endpoint mutável;
8. não clicar nem simular nova desconexão.

## 4. Segurança

- nunca imprimir token, App Secret ou URL completa com credencial;
- `data.error.message` não deve ser logada integralmente;
- apenas códigos, flags e metadados seguros.

## 5. Handoff

Atualizar o relatório da 003A com os fatos desta investigação e parar em:

`003A-09 INVESTIGADA — AGUARDANDO DECISÃO GPT — NENHUMA NOVA MUTAÇÃO EXECUTADA`
