# RELATÓRIO — RODADA 003A + CORREÇÕES 003A-02 a 003A-10 + INVESTIGAÇÕES 003A-05, 003A-06A e 003A-09

Executor: Claude Code · 2026-08-23 a 2026-08-24
Branch: `claude/rodada-003a-meta-connection-foundation`

Status: **003A-10 EXECUTADA — AGUARDANDO AUDITORIA GPT — MIGRATION NÃO APLICADA NO REMOTO**

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

## Investigação 1 — a hipótese `oauth/revoke`, e por que caiu

Registro do rumo, porque ele explica as três correções seguintes. Como `debug_token`
devolvia `type: SYSTEM_USER`, adotei `GET /oauth/revoke` — o mecanismo documentado para
system user do Business Manager — e o E2E real depois provou que ele não invalidou nada.

A causa não era o código: era a **classe da credencial**. A 003A-06A mostrou que o token
responde `client_business_id`, e a Decisão 003A-06 fechou que se trata de BISU, cuja
invalidação acontece no ambiente da Meta. `oauth/revoke` saiu do código na 003A-07.

O erro de fundo vale guardar: `debug_token.type` é um rótulo, não um contrato de ciclo de
vida.

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

## Delta da Correção 003A-07 — desconexão BISU guiada

A desconexão parou de tentar encerrar por API o que a Meta só encerra no ambiente dela.

`encerrarNoProvider` (antes `revokeOnMeta`) agora decide assim, com o token ainda válido:

| leitura | caminho |
| --- | --- |
| `debug_token` diz `is_valid: false` | nada a encerrar; limpeza local liberada |
| `client_business_id` presente | **BISU** → `EXTERNAL_ACTION_REQUIRED`, zero mutação |
| não-BISU e `type: USER` | `DELETE /{user-id}/permissions` + pós-verificação |
| qualquer outra combinação | falha fechado, sem endpoint mutável |

`oauth/revoke` foi **removido** do código: sem chamador legítimo, ficaria só como convite a
reintroduzir o erro. A classificação vem antes da escolha da primitive — é o que garante que
BISU nunca alcance o caminho de usuário.

**Segunda metade do fluxo:** `checkMetaDisconnection`, ação separada. Reconfere membership,
lê o token pela mesma fronteira, chama **só** `debug_token` e apaga o segredo apenas com
`is_valid: false` explícito. `STILL_ACTIVE` — a Meta ainda mostra o acesso de pé — é desfecho
próprio, não erro: preserva tudo e deixa verificar de novo.

**UI.** O estado conectado, ao receber o desfecho externo, troca o botão por um passo a
passo (`Integrações → Aplicativos conectados`) e o botão *Já removi — verificar*. Sem link
inventado: nenhum deep link dependente de id foi criado, porque não há destino provado.
Erro genérico **não** vira instrução de remoção externa — uma falha de rede não prova nada
sobre a classe da credencial, e mandar a pessoa mexer no painel da Meta seria chute.

**Provas:** 107 testes em `src/lib/meta` + `src/components/meta` (+10). Cobrem os onze
mínimos do mandato §5, incluindo BISU sem tocar `oauth/revoke`, `/permissions` ou
`/access_tokens`; classificação ambígua/HTTP ruim/rede falhando fechado; verificação que não
limpa com token vivo, com rede caída ou com resposta ambígua; e as regressões de Vault,
cross-tenant, `state` single-use, `190` e pós-condição — todas migradas para o caminho de
usuário, que é o único que ainda revoga por API. Um teste varre os sete desfechos da tela
contra uma lista de termos proibidos (token, `client_business_id`, Graph, OAuth, ids).

Suíte completa local: **617 testes verdes**. Lint, typecheck e build verdes.

**Dívida do §6 quitada:** o script de diagnóstico não imprime mais `data.error` bruto — só
`code`/`subcode`.

**Nenhuma ação real:** a conexão segue `ACTIVE`, `disconnected_at` nulo, `updated_at` ainda
em `01:47:57`. Nada foi clicado, removido no painel ou chamado contra a Meta.

## Delta da Correção 003A-08 — "não é BISU" também precisa de prova

A reauditoria achou o furo restante: `classificarCredencial` aceitava qualquer objeto HTTP
200 como classificável. Um corpo `{}` virava `bisu: false` — e, com `type: USER`, abria
caminho para `DELETE /{user-id}/permissions`. O teste com `null` não pegava isso.

O erro de raciocínio era tratar as duas conclusões como simétricas. Não são: "é BISU" leva a
um desfecho inerte, "não é BISU" autoriza mutação externa. Só a segunda precisa de prova
positiva, e agora tem:

| resposta de `/me` | conclusão |
| --- | --- |
| `client_business_id` string não vazia | **BISU** |
| `client_business_id` presente mas vazio, nulo ou de outro tipo | ambíguo → falha fechado |
| campo ausente, `id` string não vazia e igual ao `external_user_id` | não-BISU, caminho USER |
| corpo `{}`, sem `id`, `id` vazio ou identidade divergente | falha fechado |

A checagem de identidade fecha um caso que ninguém tinha nomeado: uma resposta apontando
para outra conta liberaria `/permissions` contra ela. Revogar permissões da conta errada é
pior do que não revogar nada.

**Provas:** 115 testes em `src/lib/meta` + `src/components/meta` (+8). Cobrem os oito do
mandato §5, incluindo os quatro tipos inválidos de `client_business_id` e o contraponto — o
caminho USER legítimo continua completando com `/permissions` + pós-verificação. Por mutação:
remover a exigência de identidade derruba 5 testes.

Suíte completa local: **625 verdes**. Lint, typecheck e build verdes. Nenhuma migration,
nenhum E2E real; a conexão segue `ACTIVE` com `updated_at` em `01:47:57`.

## Investigação 003A-09 — o que a Meta responde depois da remoção correta

Somente leitura, com o token real lido pela fronteira server-side. Nenhuma escrita, nenhum
endpoint mutável, nenhum clique. Script temporário, não versionado.

| chamada | resultado |
| --- | --- |
| `GET /debug_token` (a mesma de `inspectToken`) | HTTP **400**, `GraphMethodException` code **100**, **sem `data`** |
| app token inspecionando a si mesmo | HTTP 200, `is_valid: true`, `type: APP` |
| `GET /me` com o token alvo | HTTP **400**, `OAuthException` code **190**, subcode **464** |

O app token continua aceito, então a falha **não** é de autenticação do nosso app: a
diferença está no `input_token`.

**A sonda que responde ao §3.4.** Para saber se esse erro significa "token inválido",
comparei com um token que nunca existiu:

| | token lixo | nosso token |
| --- | --- | --- |
| `debug_token` | HTTP 200, `data` presente, `is_valid: false` | HTTP 400, sem `data`, code 100 |
| `GET /me` | HTTP 400, code 190, **sem** subcode | HTTP 400, code 190, subcode **464** |

Ou seja: a Meta **sabe** dizer "esse token não vale" — ela faz isso com HTTP 200 e
`is_valid: false`, até para uma string inventada. O nosso token não recebe essa resposta. Ele
produz uma assinatura diferente nas duas chamadas.

**Por que a UI terminou em `?meta=erro`:** `inspectToken` exige HTTP ok **e** `is_valid`
booleano. HTTP 400 devolve `{ ok: false }` → `UNVERIFIED` na verificação e
`PROVIDER_REVOKE_FAILED` na desconexão → `?meta=erro`, estado local preservado. O fail-closed
funcionou como projetado; o que não existe é a pós-condição que o desenho espera observar.

**Não concluo daqui se o token está ativo.** Tratar `190`, `464` ou `GraphMethodException`
como prova de inatividade é exatamente a inferência que a 003A-03 removeu do código, e a
escolha de qual sinal passa a valer como pós-condição é decisão arquitetural — do GPT, não
do executor.

Estado remoto reconferido durante a investigação: `ACTIVE`, `disconnected_at` nulo,
`updated_at` ainda em `01:47:57`.

## Delta da Correção 003A-10 — o fluxo BISU passa a durar mais que a aba

Dois problemas, um de estado e um de prova.

### Estado de processo não mora na URL

O intervalo entre pedir a desconexão e a remoção acontecer na Meta pode durar dias e
atravessar logout. Ele vivia só em `?meta=externo` — um reload apagava a trilha e a tela
voltava a dizer "Meta conectada", como se nada tivesse começado. Foi o que aconteceu no gate
real.

Migration aditiva `20260824170000`: coluna `external_disconnect_pending_at`, `SELECT` dela
liberado ao browser (saber *quando* foi pedido não recupera segredo nenhum), RPC idempotente
`mark_meta_external_disconnect_pending` — clicar de novo não reinicia a contagem — e
`revoke_meta_connection` recriada por `create or replace` para zerar o marcador na limpeza,
sem editar migration aplicada. Sem isso, uma reconexão futura nasceria com uma remoção
pendente herdada do ciclo anterior.

A UI passa a derivar o estado da conexão persistida: `remocao-externa-pendente` vence
"conectado" e não oferece `Desconectar`. O ramo por query string continua, de propósito — o
redirect chega antes de qualquer releitura.

### A prova composta, e por que não é "190 = revogado" de volta

A 003A-09 mostrou que, removida a integração, a Meta **para** de responder
`is_valid: false`: o alvo dá HTTP 400 sem `data`, e `/me` dá `OAuthException` 190/464. O
desenho esperava uma pós-condição que deixou de existir.

`provarRemocaoExterna` aceita essa assinatura sob quatro travas:

| trava | por quê |
| --- | --- |
| só com marcador persistido | fora do fluxo de remoção, 190/464 não conclui nada |
| app token auditado antes | se o **nosso** app está doente, o erro fala dele, não do alvo |
| assinatura exata `OAuthException` + 190 + **464** | um token inventado devolve `is_valid: false` com HTTP 200, e `/me` com lixo dá 190 **sem** subcode — a assinatura aceita não é o erro genérico |
| `/me` que responde é veredicto oposto | o token opera; nada é apagado |

`is_valid: false` explícito continua concluindo sozinho, sem marcador e sem prova composta.

### Caminho na interface, corrigido

`Configurações do negócio > **Apps conectados**` — a superfície comprovada no gate real, com
link para `business.facebook.com/latest/settings/connected_apps/`, sem parâmetro inventado.
Saem `Contas > Apps` (a superfície errada que custou uma remoção inútil) e
`Integrações > Aplicativos conectados` (nome que eu havia chutado). Um teste falha se
qualquer um dos dois voltar.

### Provas

138 testes em `src/lib/meta` + `src/components/meta` (+17), cobrindo os doze mínimos do §5 e
a idempotência do §4. Por mutação, cada trava foi verificada isoladamente: dispensar o
marcador derruba 1 teste, aceitar 190 sem conferir subcode derruba 2, pular o controle do app
token derruba 1.

Suíte completa local: **648 verdes**. Lint, typecheck e build verdes.

### Migration NÃO aplicada no remoto

Conforme §6. Validada em transação revertida contra o remoto — coluna, grant e função
conferidos e desfeitos pelo `rollback`; conferi depois que nada persistiu. `migration list`:
13 aplicadas, `20260824170000` local-only.

**Consequência a considerar na auditoria:** o código já lê `external_disconnect_pending_at`.
Enquanto a migration não for aplicada, a leitura de estado da conexão falha em runtime. É o
efeito esperado do gate — o E2E só ocorre depois que o GPT aplicar.

Nenhuma nova ação na Meta. Conexão segue `ACTIVE`, `updated_at` em `01:47:57`.

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

## Pendência — gate humano previsto

A conexão `ACTIVE` real permanece no ambiente, com token válido até 2026-10-23. O caminho
BISU só fica provado ponta a ponta quando alguém remover o aplicativo em
`Configurações do negócio → Integrações → Aplicativos conectados` e a verificação confirmar
`is_valid: false`. Isso é gate humano em painel externo, fora da alçada do executor, e
depende de autorização do GPT após esta auditoria.

Continua aberto para 003B: refazer o diálogo selecionando ativos, para obter
`ads_*`/`business_management`.

Nenhum segredo foi pedido por chat ou versionado.

## Desvio próprio registrado

Apliquei a migration `20260823203915` **antes** de commitá-la, contrariando o checkpoint
durável que a governança introduziu em `4144c03`. Corrigi a ordem em seguida: o commit
`60a6bff` publicou o delta antes do gate — que é o que a 003A-01 existiu para ensinar.

`003A-10 EXECUTADA — AGUARDANDO AUDITORIA GPT — INTEGRAÇÃO EXTERNA JÁ REMOVIDA; ESTADO LOCAL AINDA PRESERVADO`
