# RELATÓRIO — RODADA 003A + CORREÇÕES 003A-02 a 003A-04 + INVESTIGAÇÕES 003A-05 e 003A-06A

Executor: Claude Code · 2026-08-23 a 2026-08-24
Branch: `claude/rodada-003a-meta-connection-foundation`

Status: **INVESTIGAÇÃO 003A-06A CONCLUÍDA — AGUARDANDO GPT**

> ⚠️ **Conexão real APROVADA; revogação ainda não provada ponta a ponta.** Existe uma
> conexão `ACTIVE` real no ambiente, mantida de propósito: validar a revogação exigiria
> desfazê-la. Ver "Gate Meta" e "Investigação 1".

## Delta da Correção 003A-02 — os seis bloqueios de código

| # | bloqueio | correção |
| --- | --- | --- |
| 3.1 | desconexão exigia só conhecer o UUID da organização | membership ACTIVE reconferida **antes** de ler ou revogar |
| 3.2 | callback não reconferia membership | recusa antes de chamar a Meta e antes de persistir |
| 3.3 | callback negado não consumia o `state` | consumo atômico **antes** de decidir o desfecho |
| 3.4 | `upsert(onConflict)` contra índice único **parcial** | `begin_meta_connection`: atualiza a viva ou insere nova |
| 3.5 | token guardado + falha ao marcar `ACTIVE` devolvia sucesso | `activate_meta_connection`: Vault + status na mesma transação |
| 3.6 | desconexão limpava só o local | `DELETE /{user-id}/permissions` **antes** da limpeza; falha indeterminada não vira sucesso |

O 3.3 era o mais sutil: bastava forjar `error=` no callback para preservar o `state` e
reapresentá-lo depois. O 3.4 tinha consequência dupla — `ON CONFLICT (organization_id)` não
cobre o índice parcial e, se cobrisse, colidiria com linhas terminais e destruiria o
histórico que o índice existe para preservar.

`read_meta_connection_token` é a única fronteira que devolve o token, criada porque revogar
de verdade exige apresentá-lo à Meta. É `security invoker`, `search_path=''`, EXECUTE só
para `service_role`.

Migration `20260823203915` — histórico **13**, local == remoto, sem editar migration
anterior.

**Provas do delta:** 76 testes em `src/lib/meta` — cross-tenant recusado, membership sumida
no meio do fluxo, replay após negado, corrida de consumo, ausência de `upsert`, falha de
ativação sem sucesso e ordem segura da revogação. Lint, typecheck e build verdes.

## Gate Meta — etapa 1 do E2E: CONEXÃO REAL APROVADA

O caminho do mandato §2 (Facebook Login for Business) foi configurado e a conexão real
funcionou. Antes disso a Meta recusou reivindicar o app pela empresa restrita; o app foi
criado **sem** vínculo empresarial e o produto ficou disponível.

| prova | resultado |
| --- | --- |
| conexão | **ACTIVE** na organização correta (`Teste 003A - conexao Meta`) |
| `connected_at` / expiração | 2026-08-24 01:47:57Z / 2026-10-23 (~60 dias) |
| versão registrada | `v26.0` |
| intenções OAuth | **1 consumida, 0 pendentes** — single-use confirmado em fluxo real |
| token no Vault | presente, cifrado (583 bytes armazenados para 399 de token) |
| token em log | **ausente** — zero ocorrências de `access_token=`, `EAA` ou do app secret |
| token no browser | inalcançável — `authenticated` sem privilégio na coluna |
| redirect final | `/conta?meta=ok`, sem eco de `code`/`state` |

`debug_token` real: `type: SYSTEM_USER`, `is_valid: true`, `user_id: 122103866379446065`,
`expires_at: 2026-10-23`, `scopes: pages_show_list, pages_read_engagement, public_profile`.

## Investigação 1 — revogação válida para SYSTEM_USER

`DELETE /{user-id}/permissions` é o endpoint de permissões **de usuário**; o token emitido
é `type: SYSTEM_USER`, cujo `user_id` é um system user. A documentação de Business
Management APIs traz o mecanismo correto:

    GET /{version}/oauth/revoke
      ?client_id=…&client_secret=…&revoke_token=…&access_token=…   → {"success":"true"}

com a exigência de que o app do `revoke_token` e o do `client_id` sejam o mesmo — o nosso
caso. Sonda estrutural com `revoke_token` deliberadamente inválido: endpoint existe e
responde (não é 404); **nada real foi revogado**.

**Correção aplicada por delta:** a desconexão passa a inspecionar o tipo via `debug_token`
e escolher o caminho — `oauth/revoke` para `SYSTEM_USER`, `DELETE /{user-id}/permissions`
para `USER`. Tipo desconhecido segue pelo caminho de usuário, que falha fechado, em vez de
presumir system user e completar sem revogar.

**Não provado ponta a ponta:** validar `oauth/revoke` exige revogar a conexão existente.

### Bloqueio da reauditoria — leitura do Vault falhando em aberto

`disconnectMeta` desestruturava apenas `data` de `read_meta_connection_token`. A RPC devolve
`data: null` tanto para "não há token" quanto para "falhou ao ler" — e o código tratava os
dois igual: pulava a revogação remota e **executava a revogação local**, deixando a
autorização possivelmente viva na Meta e sem referência para revogá-la depois.

Corrigido: erro de leitura agora retorna `TOKEN_READ_FAILED`, sem chamar a Meta e sem tocar
o estado local. Só a leitura bem-sucedida que devolve vazio autoriza a limpeza. Dois testes
cobrem isso, um deles comparando explicitamente os dois desfechos da mesma resposta `null`.

## Delta da Correção 003A-03 — `190` não é prova de revogação

O código lia `error.code === 190` como "já estava revogado" e liberava a limpeza local. `190`
é a família genérica de falha de token, e o `oauth/revoke` carrega **duas** credenciais na
mesma chamada (`access_token` do app e `revoke_token` alvo): o código não diz sequer qual
delas falhou, muito menos que o alvo ficou inativo. App secret errado ou permissão
insuficiente produziam "desconectado" com a autorização viva na Meta — e sem referência para
revogá-la depois. A equivalência saiu dos **dois** caminhos (`oauth/revoke` e `/permissions`).

| momento | única leitura que autoriza avançar |
| --- | --- |
| antes | `debug_token` responde `is_valid: false` → não revoga, mas pode limpar |
| revogação | sucesso explícito (`success === true`/`"true"`); qualquer erro para tudo |
| depois | **o mesmo token** reinspecionado responde `is_valid: false` → só então limpa |

Qualquer outro desfecho — HTTP não-ok, erro de rede, `is_valid` ausente ou não-booleano, tipo
desconhecido — é `PROVIDER_REVOKE_FAILED` com o estado local preservado. `inspectToken` recusa
deduzir invalidez de resposta ambígua: sem o booleano não há afirmação possível. O provider
deixou de ser autoridade sobre o próprio desfecho — ele responde, a pós-verificação decide.

**Provas:** 81 testes em `src/lib/meta` (+5 na desconexão), cobrindo os seis mínimos do §4,
mais duas negativas próprias (erro 100 e resposta sem `is_valid`). Os dois testes do bloqueio
do Vault seguem intactos. Verificado por mutação: reintroduzir `190 → ok` derruba 1 teste;
remover a pós-verificação derruba 2 — nenhuma passa por acidente.

**Conexão real preservada:** `ACTIVE`, `disconnected_at` null, referência presente, conferido
antes e depois. Nada foi revogado, nem na Meta nem localmente.

## Delta da Correção 003A-04 — tipo desconhecido não revoga por tentativa

A 003A-03 fechou o `190`, mas deixou a escolha da primitive em aberto: qualquer tipo que não
fosse `SYSTEM_USER` caía em `DELETE /{user-id}/permissions`. `/permissions` desautoriza um
**usuário**; para um token `PAGE`, ou sem `type`, esse não é o mecanismo certo — e o que ele
responder não diz nada sobre o token que ficou. A reauditoria classificou isso corretamente:
não é fail-closed, é mutação externa por tentativa.

Agora, com o token **válido**, só há dois caminhos e nenhum default:

| `type` | ação |
| --- | --- |
| `SYSTEM_USER` | `oauth/revoke` |
| `USER` | `DELETE /{user-id}/permissions` |
| qualquer outro, ou ausente | `PROVIDER_REVOKE_FAILED` **antes** de qualquer endpoint |

O `type` existe para escolher a primitive enquanto o token vale. Depois que a
pós-verificação prova `is_valid: false` do **mesmo** token, ele não acrescenta nada — a
resposta pode vir sem `type` e a limpeza local segue liberada. Adotei esse refinamento do
mandato §3.7, que relaxa o texto mais restritivo da 003A-03.

**Provas:** 83 testes em `src/lib/meta` (+2). Cobrem os seis mínimos do §4 — `PAGE` e `type`
ausente falhando fechado sem tocar nenhum endpoint nem `revoke_meta_connection`;
`SYSTEM_USER` e `USER` restritos aos seus mecanismos; pós-verificação sem `type` ainda
liberando a limpeza; e os testes de `190`, Vault e falha de inspeção intactos. Por mutação:
restaurar o default `/permissions` derruba 2 testes.

Sem migration, sem mutação externa. Conexão real conferida intacta.

## Investigação 003A-05 — o E2E real falhou fechado

Diagnóstico read-only por `scripts/meta-diagnose-003a-05.mjs`, que repete as **mesmas**
chamadas de `revokeOnMeta` e para antes de qualquer revogação. Nenhum endpoint de revogação
foi tocado; nenhuma escrita no Supabase.

| etapa | resultado hoje |
| --- | --- |
| conexão viva | `ACTIVE`, `disconnected_at` null, referência presente, `updated_at` **inalterado** desde `01:47:57` |
| 1. `read_meta_connection_token` | token presente (399 caracteres) — a leitura do Vault funciona |
| 2. `GET /debug_token` | HTTP **200**, `is_valid: true`, `type: SYSTEM_USER`, expira 2026-10-23 |

**O token Meta está válido agora.** Escopos e `user_id` preservados. O `updated_at` não se
moveu: a tentativa real não executou nenhum UPDATE.

O `app_id` do token (`2940404272985831`) é igual ao `META_APP_ID` configurado, e o app token
`APP_ID|APP_SECRET` é aceito pela Meta — foi ele que autenticou o `debug_token` acima. A
pré-condição documentada do `oauth/revoke` (mesmo app do `revoke_token`) está satisfeita.

**Etapas descartadas como causa:** leitura do Vault, inspeção inicial e o fail-closed por tipo
(o tipo é `SYSTEM_USER`, reconhecido). Restam duas hipóteses, **ambas consistentes** com tudo
que é observável:

1. `oauth/revoke` respondeu erro ou sem `success` → o gateway parou antes da pós-verificação;
2. `oauth/revoke` respondeu sucesso mas o token seguiu ativo → a pós-verificação barrou.

As duas terminam em `PROVIDER_REVOKE_FAILED` com estado intacto — exatamente o observado.
Distingui-las exigiria uma segunda chamada a `oauth/revoke`, que esta investigação não
autoriza. Não há log da tentativa: a action redireciona sem registrar o `reason`, por desenho.

### Instrumentação (delta de código desta investigação)

Cada tentativa real é cara — pode revogar de verdade — e sem registro o próximo clique seria
tão cego quanto o primeiro. `revokeOnMeta` passa a registrar no servidor **qual etapa barrou**:
`INSPECAO_INICIAL`, `TIPO_NAO_REVOGAVEL`, `REVOGACAO` ou `POS_VERIFICACAO`, com HTTP status e
`code`/`subcode` da Meta, mais o rótulo `AINDA_VALIDO` quando o provider aceita e o token
continua ativo — que é justamente a hipótese 2.

Aditivo: nenhum desfecho muda, a UI continua devolvendo só `?meta=erro`. O log nunca carrega
token, App Secret nem URL; dois testes provam isso comparando a saída de `console.error` com
o token e o segredo do fixture. 85 testes verdes (+2), lint e typecheck verdes.

Com isso, a próxima tentativa autorizada nomeia a causa em uma passagem.

## Investigação 003A-06A — classificação factual do token

Uma pergunta só, somente leitura, com o token real lido pela fronteira server-side:

| leitura | resultado |
| --- | --- |
| `GET /v26.0/me?fields=client_business_id` | HTTP **200** |
| `client_business_id` | **presente e não vazio** — `5301659283195806` |
| `id` | `122103866379446065` |
| `id` == `external_user_id` persistido | **sim** |
| campos devolvidos | `client_business_id`, `id`, `name` |
| `debug_token` (reconfirmação) | HTTP 200, `is_valid: true`, `type: SYSTEM_USER` |

O token responde ao campo que o contrato de gerenciamento BISU expõe, e a identidade que ele
devolve é a mesma já persistida na conexão. Nenhuma escrita foi executada — nem na Meta, nem
no Supabase; a conexão segue `ACTIVE` com `updated_at` no instante original.

A classificação e a escolha do mecanismo de invalidação são do GPT (Decisão 003A-06). Aqui só
consta o fato observado.

O script de diagnóstico desta investigação foi **temporário e não versionado**, conforme o §4
do mandato — que é também a correção do desvio registrado na 003A-05.

## Investigação 2 — por que `ads_*` e `business_management` não vieram

Minha hipótese anterior (App Review / restrição de publicidade) **estava errada**. As
leituras contra a Graph API mostram outra coisa:

| endpoint | resultado |
| --- | --- |
| `me` | 200 |
| `me/accounts` | 200, **0 itens** |
| `me/assigned_pages` | 200, **0 itens** |
| `me/adaccounts` | 403 `(#200) Missing Permissions` |
| `me/businesses` | 400 `(#100) Missing Permission` |

**Nenhum ativo foi selecionado no diálogo OAuth.** A Meta condiciona as permissões de
ativo à seleção correspondente: sem conta de anúncios escolhida, `ads_read`/`ads_management`
não são concedidos; sem business vinculado, `business_management` também não. As permissões
de página vieram, mas com zero páginas atribuídas — coerente com a etapa ter sido percorrida
sem marcar nada.

O app está em desenvolvimento (`app_type: 0`), onde o próprio administrador tem acesso às
permissões sem App Review — o que reforça que a causa é a seleção de ativos, não revisão
pendente nem a restrição de publicidade.

**Confirmar exige refazer o diálogo selecionando ativos**, o que substituiria a conexão
atual. Parei antes disso.

## Dívida registrada — `code`/`state` no log do Next dev

O logger de requisições do Next.js em desenvolvimento imprime a URL completa do callback,
incluindo `code` e `state`. Não é código nosso, e ambos já estavam consumidos — mas em
produção esse padrão colocaria credenciais de curta duração em log. Dívida a tratar antes de
produção, junto da política de redaction (`SECURITY_MODEL.md` §15).

## A falha de handoff que a Correção 003A-01 fechou

Apliquei três migrations no Supabase remoto e parei no gate humano **sem publicar nada
no Git**. O GPT encontrou o schema alterado sem branch, PR ou relatório para auditar.
Esta entrega reconcilia o que já foi executado; nada foi reimplementado.

| item | resultado |
| --- | --- |
| branch | de `origin/main`, reconciliada com os 2 commits de governança |
| migrations locais × remoto | **12 × 12, zero divergentes** (`supabase migration list`) |
| migrations 003A versionadas | `20260823195327`, `20260823195742`, `20260823200706` |
| reaplicação / `migration repair` / DDL ad hoc / migration nova para alinhar Git | **nenhum** |

## Entregue (publicado agora, executado antes)

- **`meta_connections`** — grant **por coluna**: o browser vê `status`; **não** vê
  `token_secret_reference`, `granted_scopes` nem ids externos. RLS por membership ACTIVE.
- **`meta_oauth_intents`** — server-only, zero policies, guarda o **SHA-256 do `state`**:
  ler a tabela não permite forjar callback.
- **Token no Supabase Vault**, cifrado. Provado como `service_role`: create, rotação sem
  duplicar segredo, e desconexão que **remove o segredo de fato**.
- **Nenhuma função `SECURITY DEFINER` nova** — os wrappers são INVOKER sobre
  `vault.create_secret`/`update_secret`, que já são DEFINER do próprio Supabase.
- **MetaAuthGateway** único ponto de contato com a Meta; o token vai direto ao Vault, sem
  log nem retorno. **Callback** com destino fixo `/conta`, sem `next` e sem eco de
  `code`/`state`/erro. **UX** em `/conta` sem vocabulário de Graph API.

## Decisões e achados

1. **Graph API v26.0 revalidada** na doc oficial (lançada 2026-07-29): igual ao baseline,
   sem divergência. Centralizada em `config.ts`.
2. **Facebook Login for Business confirmado** — `config_id` no lugar de `scope`.
3. **Defeito próprio, achado pela prova:** desconectar em dois passos violava os CHECKs
   (`ACTIVE` exige token; `REVOKED` exige ausência) — não há ordem possível em dois
   UPDATEs. Virou operação atômica na `20260823200706`. Os CHECKs estavam certos.
4. **Índice único parcial** de conexão viva por organização exclui `REVOKED`, para o
   histórico não impedir reconexão.

## Provas e gates

`scripts/sql/meta-connection-003a-proof.sql` — **44/44**, transacional, zero resíduo.
`src/lib/meta/*.test.ts` — **51 testes**: `state` imprevisível, expira, uso único e recusa
cross-tenant; config e fronteira de segredo.

Typecheck, lint, `deno check` e build verdes; suíte completa fica para a CI. Advisor sem
novo ERROR/WARN — o INFO novo (`meta_oauth_intents` sem policy) é o desenho server-only
sendo reportado.

## Pendência — decisão necessária

A conexão `ACTIVE` real permanece no ambiente, com token válido até 2026-10-23. Avançar
exige uma destas, todas fora da alçada do executor por implicarem alterar/revogar a conexão:

1. **autorizar o E2E da etapa 2** — desconectar pelo `oauth/revoke` já implementado,
   provando o caminho SYSTEM_USER ponta a ponta;
2. **refazer o diálogo selecionando ativos** (páginas e contas de anúncio), para confirmar a
   causa dos escopos ausentes e obter `ads_*`/`business_management`;
3. revogar pelo painel da Meta (Configurações → Integrações de negócios) e então limpar o
   estado local.

Nenhum segredo foi pedido por chat ou versionado.

## Desvio próprio registrado

Apliquei a migration `20260823203915` **antes** de commitá-la, contrariando o checkpoint
durável que a governança introduziu em `4144c03`. Corrigi a ordem em seguida: o commit
`60a6bff` publicou o delta antes do gate — que é o que a 003A-01 existiu para ensinar.

`INVESTIGAÇÃO 003A-06A CONCLUÍDA — AGUARDANDO GPT`
