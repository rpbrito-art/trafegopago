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

Status: **003A-08 AUDITADA E APROVADA — GATE HUMANO BISU EM EXECUÇÃO — REMOÇÃO EM `CONTAS > APPS` NÃO REVOGOU O BISU — REPARO DA ASSOCIAÇÃO DO APP AO PORTFÓLIO AUTORIZADO — NOVA VERIFICAÇÃO/REVOGAÇÃO BLOQUEADA**.

Mandato original:

`rodadas/gpt/RODADA_003A_META_CONNECTION_FOUNDATION.md`

Auditorias/decisões vigentes:

- `rodadas/gpt/AUDITORIA_RODADA_003A_META_CONNECTION_FOUNDATION.md`
- `rodadas/gpt/REAUDITORIA_003A_05_INVESTIGACAO_DESCONEXAO.md`
- `rodadas/gpt/REAUDITORIA_003A_06A_CLASSIFICACAO_BISU.md`
- `rodadas/gpt/DECISAO_ARQUITETURAL_003A_06_REVOGACAO_TOKEN_BUSINESS_LOGIN.md`
- `rodadas/gpt/REAUDITORIA_003A_07_DESCONEXAO_BISU_GUIADA.md`
- `rodadas/gpt/REAUDITORIA_003A_08_CLASSIFICACAO_FAIL_CLOSED.md`

Branch:

`claude/rodada-003a-meta-connection-foundation`

PR: **#11 draft**.

Head auditado da 003A-08:

`99b9c79e59e70db0689bcc773551236584f48253`

CI:

`32762552984` — **verde** em install, lint, typecheck, Edge Functions, testes e build.

## 4. Estado comprovado da conexão real durante o gate

A conexão `Teste 003A - conexao Meta` permanece preservada localmente:

- status = `ACTIVE`;
- `connected_at` e `updated_at` = 2026-08-24 01:47:57Z;
- `disconnected_at` = nulo;
- referência do token = presente;
- segredo correspondente no Vault = presente;
- credencial real classificada como BISU por `client_business_id`;
- `external_user_id=122103866379446065`.

Em 2026-08-24, após a aprovação da 003A-08, o fundador clicou `Desconectar` uma vez no Tráfego Pago local. Resultado auditado:

- URL `/conta?meta=externo`;
- UI mostrou `Falta concluir na Meta`;
- botão `Já removi — verificar`;
- Supabase permaneceu intacto.

Portanto o primeiro passo do gate humano passou: o produto entrou no fluxo guiado sem executar mutação externa nem limpeza local.

## 5. Desvio do gate externo — `Contas > Apps`

Na interface atual do Business Settings do portfólio **Quoron**, o caminho textual `Integrações > Aplicativos conectados` não estava disponível no menu mostrado ao fundador.

O GPT orientou o fundador a abrir `Contas > Apps`. A tela exibiu:

- app `Trafego Pago Business Dev`;
- App ID `2940404272985831`;
- texto `Propriedade de: Quoron`;
- controles `Atribuir pessoas`, `Atribuir parceiro` e `Conectar ativos`;
- botão `Remover`.

Esses sinais caracterizam a gestão do **app como ativo associado/pertencente ao portfólio**, e não comprovam por si a integração BISU instalada pelo Facebook Login for Business.

O fundador removeu o app dessa tela e confirmou a remoção. Depois disso:

- `Contas > Apps` passou a mostrar `Nenhum aplicativo adicionado`;
- o fundador voltou ao Tráfego Pago e clicou `Já removi — verificar`;
- o produto retornou `/conta?meta=ainda-ativo`;
- portanto a Meta continuou informando o mesmo token como válido;
- o Supabase permaneceu `ACTIVE`, com referência e segredo no Vault presentes.

**Conclusão operacional:** a remoção realizada em `Contas > Apps` não revogou o BISU. Ela não deve ser repetida nem tratada como prova de desconexão.

O GPT reconheceu erro de condução manual ao tratar uma instrução documental de invalidação como caminho literal de UI sem distinguir a lista de app-asset do portfólio da integração instalada.

## 6. Decisão arquitetural BISU — permanece vigente

Para a credencial BISU do Facebook Login for Business:

- não usar `oauth/revoke`;
- não usar `/permissions` como fallback;
- não usar `DELETE /{system-user-id}/access_tokens`;
- manter token/estado local enquanto a Meta ainda puder considerá-lo válido;
- somente `is_valid=false` autoriza apagar o segredo e marcar `REVOKED` localmente.

A prova atual confirma que o fail-closed do produto funcionou: mesmo após uma remoção externa que não invalidou o token, o sistema recusou limpar o estado local.

## 7. Próxima ação autorizada

O GPT continua conduzindo o gate externo, uma ação manual por vez.

**Ação imediatamente autorizada:** restaurar a associação do app `Trafego Pago Business Dev` (App ID `2940404272985831`) ao portfólio Quoron em `Configurações do negócio > Contas > Apps`, usando o fluxo de adicionar/conectar um App ID já existente.

O fundador deve primeiro abrir o diálogo `Adicionar` e mostrar as opções antes de confirmar qualquer associação, para que o GPT escolha o comando correto na UI atual.

Depois do reparo, o GPT deve localizar e comprovar a superfície correta da integração instalada pelo Facebook Login for Business antes de nova remoção.

## 8. Continua NÃO autorizado

Até o reparo e a identificação correta da integração:

- não clicar novamente `Já removi — verificar`;
- não remover outro app/ativo;
- não criar um novo App ID;
- não refazer OAuth;
- não chamar `oauth/revoke`;
- não chamar `/permissions` ou `/access_tokens` para o BISU;
- não limpar estado local;
- não selecionar ativos;
- não iniciar 003B;
- não promover/mergear 003A.

## 9. Pendências não bloqueantes

- escopos `ads_*`/`business_management` e seleção detalhada de ativos ficam para 003B;
- logger Next dev registra URL do callback com `code`/`state`: tratar redaction antes de produção;
- leaked-password protection antes de produção;
- SMTP/domínio de produção;
- default ACL residual de `supabase_admin` enquanto inerte;
- App Review/Business Verification para fase comercial quando aplicável.
