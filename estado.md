# ESTADO — Tráfego Pago

Atualizado: 2026-08-24

Estado incorporado = `main + este arquivo + promoção real`.

## 1. Ambiente

- repo: `rpbrito-art/trafegopago`
- Supabase project ref: `cbnxdoxpyioxjwgjhbtq`
- pasta local esperada: `C:\Users\rpbri\Documents\trafegopago`
- `business-weaver`: fora de escopo

## 2. Estado incorporado

Promovidas: **000–002C**.

- Fase 1 — Supabase, Auth e Tenancy: **ENCERRADA**.
- Fase 2 — Operations, Audit, Queues e Segurança Base: **ENCERRADA**.

Última rodada promovida: **002C — Webhook Inbox + Observabilidade Base**.

## 3. Rodada corrente

**003A — META CONNECTION FOUNDATION**

Status: **INVESTIGAÇÃO 003A-05 AUDITADA — TOKEN META CONTINUA VÁLIDO — DECISÃO ARQUITETURAL 003A-06 EM PESQUISA GPT — NOVO E2E BLOQUEADO**.

Mandato original:

`rodadas/gpt/RODADA_003A_META_CONNECTION_FOUNDATION.md`

Auditoria/reauditorias:

- `rodadas/gpt/AUDITORIA_RODADA_003A_META_CONNECTION_FOUNDATION.md`
- `rodadas/gpt/REAUDITORIA_003A_05_INVESTIGACAO_DESCONEXAO.md`

Decisão arquitetural vigente:

`rodadas/gpt/DECISAO_ARQUITETURAL_003A_06_REVOGACAO_TOKEN_BUSINESS_LOGIN.md`

Branch:

`claude/rodada-003a-meta-connection-foundation`

PR: **#11 draft**.

Head auditado da investigação:

`9060da1741e6a117751035ab902ee33a2b9939ef`

CI:

`32753513167` — **verde** em install, lint, typecheck, Edge Functions, testes e build.

Relatório:

`rodadas/claude/RELATORIO_RODADA_003A_META_CONNECTION_FOUNDATION.md`

## 4. Resultado auditado antes do gate real

Estão auditados como fechados:

- autorização cross-tenant na desconexão;
- membership reconferida no callback;
- `state` negado single-use;
- remoção do upsert incompatível com índice parcial;
- ativação atômica com Vault + `ACTIVE`;
- conexão Meta real da organização de teste;
- token fora do browser;
- falha de leitura do Vault não confundida com ausência de token;
- erro Meta `190` não tratado como prova de revogação;
- pós-verificação do mesmo token antes da limpeza local;
- erro de rede/HTTP/resposta ambígua preservando estado local;
- token válido `SYSTEM_USER` usando somente o mecanismo configurado para esse tipo;
- token válido `USER` usando somente `/permissions`;
- token válido de tipo desconhecido/ausente falhando fechado sem tentativa de revogação.

## 5. Gate real de desconexão — primeira tentativa

Em 2026-08-24 o fundador acionou **uma única vez** `Desconectar` pela UI local da conexão `Teste 003A - conexao Meta`.

Resultado visível:

- redirect para `/conta?meta=erro`;
- UI continuou mostrando **Meta conectada**.

Auditoria imediatamente após a tentativa confirmou:

- conexão = `ACTIVE`;
- `disconnected_at` = nulo;
- referência de segredo = presente;
- segredo correspondente = presente no Vault;
- dados da conexão preservados.

O fail-closed funcionou: a falha não produziu limpeza local enganosa.

## 6. Investigação 003A-05 — resultado auditado

A investigação read-only foi concluída e auditada no head `9060da1741e6a117751035ab902ee33a2b9939ef`.

Confirmado:

- conexão continua `ACTIVE`;
- `updated_at` continua no instante original da conexão;
- leitura do token no Vault funciona;
- `debug_token` responde HTTP 200;
- token continua `is_valid=true`;
- `type=SYSTEM_USER`;
- expiração = 2026-10-23;
- token pertence ao app atualmente configurado.

Portanto a primeira tentativa **não revogou o token na Meta**.

Foram descartadas como causa:

- leitura do Vault;
- inspeção inicial;
- tipo desconhecido.

Restam duas hipóteses factuais para a primeira tentativa:

1. o mecanismo remoto de revogação respondeu erro/sem sucesso; ou
2. respondeu sucesso, mas o token continuou válido e a pós-verificação bloqueou a limpeza.

A instrumentação diagnóstica publicada pelo Claude foi auditada como segura e aditiva, mas sua publicação extrapolou o texto da autorização, que previa instrumentação temporária/local. O desvio ficou registrado e não altera o status da rodada.

## 7. Bloqueio arquitetural vigente

O ponto ainda não provado é **qual mecanismo oficial de revogação se aplica ao token real emitido pelo Facebook Login for Business com configuração de System-user Access Token**.

Não assumir que esse token possui o mesmo ciclo de vida ou mecanismo de revogação de um System User Access Token clássico gerado diretamente no Business Manager apenas porque `debug_token` devolve `SYSTEM_USER`.

O GPT deve resolver a Decisão Arquitetural 003A-06 antes de qualquer nova mutação externa.

## 8. Próxima ação autorizada

**Nenhuma ação manual do fundador e nenhuma nova execução destrutiva do Claude estão autorizadas neste momento.**

GPT deve pesquisar/confirmar o contrato oficial vigente de revogação da credencial usada pelo Facebook Login for Business e então definir o próximo delta.

Até lá, NÃO:

- clicar `Desconectar` novamente;
- chamar `oauth/revoke` novamente;
- testar outro endpoint de revogação;
- revogar pelo painel Meta;
- limpar estado local;
- refazer OAuth;
- selecionar ativos;
- iniciar 003B;
- promover 003A.

## 9. Pendências não bloqueantes

- escopos `ads_*`/`business_management` e seleção detalhada de ativos ficam para 003B;
- logger Next dev registra URL do callback com `code`/`state`: tratar redaction antes de produção;
- sanitizar/remover `data.error` bruto do script de diagnóstico antes da promoção, no próximo delta substantivo da 003A;
- leaked-password protection antes de produção;
- SMTP/domínio de produção;
- default ACL residual de `supabase_admin` enquanto inerte;
- App Review/Business Verification para fase comercial quando aplicável.
