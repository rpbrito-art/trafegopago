# RELATÓRIO — CORREÇÃO 003B-09: reset E2E da conexão Meta

Mandato: `rodadas/gpt/CORRECAO_003B_09_RESET_E2E_CONEXAO_META.md`
Branch: `claude/rodada-003b-meta-asset-discovery-selection`

**A conexão NÃO ficou `REVOKED`.** O E2E real foi executado, falhou fechado antes de tocar a Meta, e a causa encontrada é anterior ao defeito que o mandato previa. O que segue é o que ficou pronto, o que a execução real provou e por que a correção não cabe neste mandato.

## 1. Delta implementado (§3.1 e §3.2)

| arquivo | mudança |
| --- | --- |
| `src/lib/meta/gateway.ts` | `revokeUserPermissions` aceita JSON literal `true` além de `{success:true}`; token sai da URL do `DELETE` e vai em `Authorization: Bearer` |
| `src/components/meta/meta-section.tsx` | prop `credencialRecusada`: no estado `conectado`, a seção cala em vez de afirmar saúde |
| `src/components/meta/meta-assets-section.tsx` | estado `conexao-recusada` ganha ação secundária **Desconectar e começar de novo** |
| `src/components/meta/meta-disconnect-button.tsx` | rótulo configurável, mesma action canônica |
| `src/app/conta/page.tsx` | liga as duas leituras: descoberta recusada suprime o cartão verde |
| testes + `scripts/e2e/…`, `vitest.e2e.config.ts` | provas e harness E2E fora do `include` da CI |

Provas: **242/242** em `src/lib/meta`, `src/lib/actions`, `src/components/meta` — `gateway.test.ts` 76/76 (6 novas: `true`, `{success:true}`, `false`, objeto sem `success`, corpo ilegível, token fora da URL) e componentes 49/49 (BISU segue sem tocar o endpoint USER; cartão verde suprimido; após revogada a tela volta a **Conectar a Meta**). `tsc --noEmit` e `lint` limpos.

## 2. E2E real executado (§4.2)

`META_E2E_DISCONNECT=1 npx vitest run --config vitest.e2e.config.ts`

| momento | status | referência de token | escopos | `disconnected_at` |
| --- | --- | --- | --- | --- |
| antes | `ACTIVE` | presente | 6 | `null` |
| depois | `ACTIVE` | presente | 6 | `null` |

Resultado: `{ ok: false, reason: "PROVIDER_REVOKE_FAILED" }`
Log sanitizado: `desconexao meta interrompida { etapa: "CLASSIFICACAO", http: 400, code: 190 }`
Chamadas observadas a `/permissions`: **nenhuma**.

Nada foi alterado — o fail-closed funcionou exatamente como projetado. O parser corrigido em §3.1 **não chegou a ser exercitado**, porque a execução parou antes.

## 3. Causa real, isolada por prova

O token está íntegro: `debug_token` → `is_valid: true`, `type: USER`, app corrente, seis escopos, dentro da validade. E `GET /me?fields=id,name` → **HTTP 200**.

Sonda `scripts/meta-classify-field-003b-09-probe.mjs` — mesmo nó, mesmo token, mesma versão, mudando só `fields`:

| `fields` | resultado |
| --- | --- |
| `id,name` | **HTTP 200**, chaves `{id,name}` |
| `client_business_id` | **HTTP 400, code 190, OAuthException** |
| `id,client_business_id` | **HTTP 400, code 190, OAuthException** |

**Pedir `client_business_id` com um User Access Token é recusado com `190`** — e a recusa não depende de acompanhar um campo aceito.

`classifyCredential` chama exatamente `GET /me?fields=client_business_id`. Logo:

1. **a desconexão USER está bloqueada** — `encerrarNoProvider` classifica antes de escolher a primitive, a classificação falha fechada e `/permissions` nunca é chamado. É isto que o fundador viu como "Desconectar não funciona";
2. **a descoberta de ativos está bloqueada** — a 003B-06 passou a usar a mesma classificação em `assets.ts`; o `190` vira `CONNECTION_REJECTED` e a tela mostra "A Meta não aceitou mais a autorização atual" **sobre um token que está válido**. É a origem do estado `conexao-recusada` observado, e não uma credencial morta.

A 003B-06 foi auditada e aprovada, mas nenhuma prova até aqui exercitou a classificação contra um User Token real — as provas eram por duplo de teste. O defeito é real e vale para os dois caminhos.

## 4. Por que paro aqui

O mandato §4.2 autoriza ajuste **restrito ao contrato de desconexão USER**. A correção necessária não é essa: `classifyCredential` é compartilhada e governa também a descoberta e a distinção BISU. Mudar como ela conclui "não é BISU" mexe na invariante de que essa afirmação exige prova positiva — a mesma que a 003A criou depois de `oauth/revoke` não revogar nada.

Alternativas identificadas, **sem escolha minha**:

- **(a)** interpretar `190` na leitura de `client_business_id` como ausência do contrato BISU, combinada com identidade positiva obtida em chamada separada — usa um código genérico como semântica, o que o canônico rejeita para revogação;
- **(b)** inverter a ordem: identidade por `fields=id` (funciona) e `client_business_id` numa segunda chamada isolada, tratando a recusa **desse campo específico** como sinal de não-BISU;
- **(c)** adotar outro sinal oficial para BISU, o que hoje o canônico proíbe fazer só com `debug_token.type`;
- **(d)** manter como está — mas então USER não desconecta nem descobre ativos.

Nenhuma foi implementada. Nenhuma foi testada contra a Meta.

`DECISÃO ARQUITETURAL NECESSÁRIA — AGUARDANDO GPT`

## 5. Estado deixado no ambiente

Conexão `655da6e6-9056-456d-a81d-5e2570da5faf` continua **ACTIVE**, com token e escopos intactos. Nada foi revogado, apagado ou reconectado. Nenhuma alteração em `.env.local`, Meta App, configuração, escopos, portfólios ou ativos. Nenhum Page Access Token. O critério de saída do §5 — ambiente desconectado e pronto para teste do zero — **não foi atingido**.
