# RELATÓRIO — RODADA 003A + CORREÇÃO 003A-02 — META CONNECTION FOUNDATION

Executor: Claude Code · 2026-08-23
Branch: `claude/rodada-003a-meta-connection-foundation`

Status: **003A + CORREÇÃO 003A-02 EXECUTADAS — AGUARDANDO REAUDITORIA GPT**

> ⚠️ **O gate Meta real NÃO foi concluído — bloqueio externo, não técnico.** O caminho
> de autorização autorizado pelo mandato §2 está indisponível nesta conta. Detalhe em
> "Bloqueio do gate". Os seis bloqueios de código da auditoria estão fechados e provados.

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

**Provas do delta:** 69 testes em `src/lib/meta` — cross-tenant recusado, membership sumida
no meio do fluxo, replay após negado, corrida de consumo, ausência de `upsert`, falha de
ativação sem sucesso e ordem segura da revogação. Lint, typecheck e build verdes.

## Bloqueio do gate Meta

O mandato §2 escolheu **Facebook Login for Business** por compatibilidade com Instagram
profissional **e** Marketing API. Ao conduzir o gate:

1. a conta recusou reivindicar o app: *"Sua empresa está proibida de fazer publicidade"* —
   restrição da Meta no portfólio empresarial;
2. o app foi criado **sem** vínculo empresarial, e o redirect OAuth foi salvo;
3. mas o produto **Login do Facebook para Empresas não aparece** — nem instalado, nem na
   lista de produtos disponíveis;
4. a documentação oficial confirma a causa: *"Your Meta app must be a business type app"*.
   App tipo Business exige portfólio empresarial — exatamente o que está restrito.

Portanto **não houve OAuth real**: troca `code → token`, escopos concedidos e
conexão/desconexão ponta a ponta seguem não provados contra a Meta.

**Não troquei para o Login comum (`scope`) por conta própria.** Seria substituir uma decisão
de arquitetura tomada pelo GPT, com efeito direto sobre a Marketing API na Fase 3. O mandato
§2 manda parar e devolver a divergência — é o que faço.

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

## Pendência bloqueante — decisão do GPT

O gate Meta depende de uma destas saídas, e nenhuma é do executor:

1. regularizar o portfólio empresarial junto à Meta (apelação com documentos; prazo típico
   de dias a semanas) e então criar app tipo Business;
2. usar outro portfólio empresarial já habilitado;
3. autorizar explicitamente o Login do Facebook comum (`scope`) para a 003A, registrando o
   impacto sobre a Marketing API na Fase 3;
4. mover o gate para uma sub-rodada própria e promover a 003A pela fundação já provada.

Nenhum segredo foi pedido por chat; `META_APP_ID`/`META_APP_SECRET` permanecem fora do
repositório e do `.env.local`.

## Desvio próprio registrado

Apliquei a migration `20260823203915` **antes** de commitá-la, contrariando o checkpoint
durável que a governança introduziu em `4144c03`. Corrigi a ordem em seguida: o commit
`60a6bff` publicou o delta antes do gate — que é o que a 003A-01 existiu para ensinar.

`003A + CORREÇÃO 003A-02 EXECUTADAS — AGUARDANDO REAUDITORIA GPT`
