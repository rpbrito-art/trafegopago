# AUDITORIA — CORREÇÃO 003B-09: RESET E2E DA CONEXÃO META

Data: 2026-08-25

Veredito final: **E2E REAL EXECUTADO; CORREÇÃO DE PARSER/UX APROVADA; OBJETIVO DE RESET NÃO ATINGIDO POR DEFEITO ARQUITETURAL ANTERIOR IDENTIFICADO. TRILHA META ESTACIONADA, 003B NÃO PROMOVIDA.**

## 1. Estado auditado

Branch: `claude/rodada-003b-meta-asset-discovery-selection`

HEAD final auditado desta execução: `053bc7ca3f25b53954579df30bce598894e718dd`.

PR #12: aberto, draft, não mergeado. Após novos commits documentais na `main`, o GitHub passou a indicar `mergeable=false`; isso não deve ser corrigido agora apenas por alinhamento, pois a 003B está estacionada e não será promovida.

CI do HEAD: `32859795018` — **success**.

O relatório do Claude agora existe:

`rodadas/claude/RELATORIO_CORRECAO_003B_09_RESET_E2E_CONEXAO_META.md`.

## 2. Código da 003B-09 que permanece aprovado

O delta implementado antes do E2E permanece coerente e não deve ser revertido:

- `revokeUserPermissions()` aceita sucesso explícito como JSON literal `true` e `{ success: true }`;
- token USER no `DELETE /permissions` fica em `Authorization: Bearer`, não na URL;
- respostas ambíguas continuam falhando fechadas;
- BISU continua sem usar a primitive de revogação USER;
- estado `conexao-recusada` oferece `Conectar novamente` e `Desconectar e começar de novo`;
- a UI não deve combinar cartão verde saudável com estado de conexão recusada;
- harness E2E permanece separado da CI normal e exige autorização explícita para mutação real.

A CI final ficou verde e o Claude reportou 242/242 testes dos módulos afetados, além de typecheck e lint limpos.

## 3. E2E real — prova independente

O fundador autorizou manualmente a execução:

`META_E2E_DISCONNECT=1 npx vitest run --config vitest.e2e.config.ts`

O E2E **foi efetivamente executado**.

Resultado sanitizado observado pelo Claude:

- `disconnectMeta()` retornou falha fechada;
- etapa: `CLASSIFICACAO`;
- HTTP `400`;
- Meta code `190`;
- nenhuma chamada chegou a `/permissions`.

Snapshot independente do GPT no Supabase após a execução confirma que nada foi apagado ou revogado:

- conexão `655da6e6-9056-456d-a81d-5e2570da5faf` continua `ACTIVE`;
- `scope_count=6`;
- referência de token presente;
- `token_expires_at` preenchido;
- `disconnected_at=null`;
- `external_disconnect_pending_at=null`.

Portanto o fail-closed funcionou: o sistema não simulou um reset local sem prova externa.

## 4. Causa real isolada

A sonda executada pelo Claude mostrou, com o mesmo User Access Token válido e a mesma versão da Graph API:

- `GET /me?fields=id,name` → HTTP 200;
- `GET /me?fields=client_business_id` → HTTP 400 / code 190;
- `GET /me?fields=id,client_business_id` → HTTP 400 / code 190.

O token foi também observado como válido via `debug_token`, com `type=USER` e os seis scopes esperados.

Conclusão comprovada para este ambiente:

**o classificador compartilhado introduzido na 003B-06 tenta ler `client_business_id` de um User Access Token válido; essa leitura é recusada pela Meta e o código interpreta a recusa como falha de credencial.**

Consequências:

1. a desconexão USER para antes de `DELETE /permissions`;
2. a descoberta de ativos pode produzir `conexao-recusada` sobre token válido;
3. a mensagem vista pelo fundador não prova que a autorização estava morta;
4. o parser de revogação corrigido pela 003B-09 ainda não foi exercitado contra a Meta real, porque o fluxo não chegou até ele.

## 5. Impacto sobre a 003B-06

A evidência oficial que sustentou `SystemUser.getAssignedPages() → /assigned_pages` continua válida. Não há razão para reverter essa parte.

O que deixa de poder ser considerado suficientemente provado é o **mecanismo compartilhado de classificação USER x BISU baseado na tentativa de `client_business_id`**.

Assim:

- endpoint BISU `/{system-user-id}/assigned_pages`: preservado;
- classifier atual: **necessita nova decisão/correção antes de uso real**;
- E2E BISU: continua ausente;
- 003B: continua não promovida.

Não aprovar solução baseada apenas em tratar qualquer `190` como “é USER”. A próxima correção Meta deverá separar identidade válida de detecção do contrato BISU usando evidência oficial e testes reais, sem transformar erro genérico em semântica de negócio por conveniência.

## 6. Decisão operacional

O fundador aprovou que o gate Meta deixe de bloquear o desenvolvimento global:

`rodadas/gpt/DECISAO_DESBLOQUEIO_DESENVOLVIMENTO_META_GATE.md`.

Portanto não será aberta agora uma nova correção Meta apenas para manter o Claude ocupado nessa trilha.

A situação fica estacionada como:

- 003B: **executada em grande parte, auditada parcialmente, NÃO PROMOVIDA**;
- 003B-09: **E2E executado; reset não atingido; causa real identificada**;
- conexão USER diagnóstica: continua `ACTIVE` no banco, mas o classificador atual é sabidamente inadequado para esse token;
- BISU: gate externo e E2E continuam pendentes;
- correção futura do classifier: obrigatória antes de retomar a promoção da 003B.

## 7. Próximo desenvolvimento

A próxima rodada substantiva passa a ser:

**004A — AI Foundation Core**

Ela parte da `main`, não da branch 003B, e é independente da Meta.

## 8. Estado formal

003B-09:

- planejada: sim;
- autorizada: sim;
- código executado: sim;
- E2E real: **sim**;
- código parser/UX: **auditado e preservado**;
- reset USER: **não realizado**;
- causa do bloqueio: **identificada por E2E real**;
- rodada 003B promovida: **não**.
