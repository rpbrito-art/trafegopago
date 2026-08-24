# REAUDITORIA 003A-05 — INVESTIGAÇÃO DO E2E DE DESCONEXÃO

Data: 2026-08-24
PR: #11
Branch: `claude/rodada-003a-meta-connection-foundation`
Head auditado: `9060da1741e6a117751035ab902ee33a2b9939ef`
CI: `32753513167` — success

Status: **INVESTIGAÇÃO 003A-05 AUDITADA — CAUSA NARROWED, NÃO RESOLVIDA — NOVO E2E BLOQUEADO**

## 1. Fatos confirmados independentemente

A investigação read-only e a auditoria GPT confirmam:

- a conexão `Teste 003A - conexao Meta` permanece `ACTIVE`;
- `updated_at` permanece igual ao instante da conexão, portanto a tentativa real anterior e a investigação não produziram UPDATE local;
- `disconnected_at` permanece nulo;
- a referência do segredo permanece presente;
- o segredo correspondente continua no Supabase Vault;
- `read_meta_connection_token` consegue ler a credencial pela fronteira server-side;
- `debug_token` retorna HTTP 200;
- o token continua `is_valid=true`;
- o tipo continua `SYSTEM_USER`;
- o token expira em 2026-10-23;
- o `app_id` informado por `debug_token` corresponde ao `META_APP_ID` atualmente configurado;
- o app token usado para autenticar `debug_token` é aceito pela Meta.

Logo, ficam descartadas como causa da primeira tentativa:

1. falha de leitura do Vault;
2. falha da inspeção inicial;
3. tipo de token desconhecido/ausente.

O token continua válido na Meta. Portanto a primeira tentativa de desconexão **não revogou a autorização**.

## 2. Hipóteses que permanecem abertas

O comportamento observado ainda é compatível com dois caminhos:

1. `oauth/revoke` respondeu erro ou resposta sem sucesso explícito; ou
2. `oauth/revoke` respondeu sucesso, mas o token continuou válido e a pós-verificação bloqueou corretamente a limpeza local.

Não há evidência preservada da primeira chamada que permita escolher entre as duas hipóteses.

## 3. Instrumentação adicionada pelo executor

O executor adicionou instrumentação versionada no `gateway.ts` para registrar somente a etapa da falha e dados sanitizados do provider:

- `INSPECAO_INICIAL`;
- `TIPO_NAO_REVOGAVEL`;
- `REVOGACAO`;
- `POS_VERIFICACAO`;
- causa `AINDA_VALIDO` quando aplicável;
- HTTP status, `code` e `subcode` quando disponíveis.

A auditoria confirmou que o fluxo não registra token, App Secret nem URL com credenciais. Dois testes específicos provam ausência dos segredos no `console.error`. A CI do head passou integralmente.

A instrumentação é **aditiva**: não muda as condições que autorizam ou impedem a limpeza local. O fail-closed permanece.

### Desvio de escopo

O mandato da 003A-05 permitia instrumentação **temporária/local somente se indispensável**. O executor publicou instrumentação no código da branch. Portanto houve **desvio formal de escopo**, embora não tenha ocorrido mutação externa ou relaxamento de segurança.

Decisão de auditoria: a instrumentação publicada é **aceita pós-fato**, por ser estritamente diagnóstica, segura e útil para qualquer tentativa futura. O desvio fica registrado e não cria precedente para ampliar mandatos silenciosamente.

Há uma higiene menor no script de diagnóstico: a linha que imprime `data.error` bruto deve ser sanitizada/removida no próximo delta substantivo da 003A antes da promoção, mesmo sem evidência de vazamento na execução atual.

## 4. Veredicto

A investigação 003A-05 está **AUDITADA E APROVADA COMO INVESTIGAÇÃO**.

Ela não fecha o gate de desconexão. Ao contrário, demonstrou que o único ponto material ainda não provado é o contrato externo de revogação para o token `SYSTEM_USER` emitido pelo fluxo atual de Facebook Login for Business.

**NÃO AUTORIZAR nova chamada destrutiva apenas para obter o log.** Uma segunda tentativa com o mesmo mecanismo sem validar o contrato externo seria tentativa e erro sobre uma autorização real.

Próximo estado: **DECISÃO ARQUITETURAL GPT SOBRE REVOGAÇÃO DO TOKEN DO FACEBOOK LOGIN FOR BUSINESS**.

Até essa decisão:

- não clicar `Desconectar` novamente;
- não chamar `oauth/revoke`;
- não chamar `/permissions`;
- não usar outro endpoint de revogação por hipótese;
- não revogar pelo painel Meta como atalho;
- não limpar o estado local;
- não refazer OAuth;
- não iniciar 003B;
- não promover 003A.
