# RELATÓRIO — RODADA 003A — META CONNECTION FOUNDATION

Executor: Claude Code · 2026-08-23
Branch: `claude/rodada-003a-meta-connection-foundation`

Status: **003A EXECUTADA — AGUARDANDO AUDITORIA GPT**

> ⚠️ **O E2E real de conexão/desconexão Meta NÃO foi realizado.** O gate humano do
> mandato §5 segue aberto: o app Meta não existe e o `.env.local` não tem
> `META_APP_ID`/`META_APP_SECRET`/`META_LOGIN_CONFIG_ID`. Pelo critério §8 do mandato
> original a rodada **não** está completa — ver "Pendência bloqueante".

## A falha de handoff que esta correção fecha

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

## Pendência bloqueante

**Gate humano do mandato §5 aberto.** Sem app Meta não houve OAuth real: troca
`code → token`, escopos concedidos reais e conexão/desconexão ponta a ponta continuam
**não provados**. O código está pronto e o caminho local provado; falta a credencial, que
vai direto ao `.env.local` — não peço segredo por chat.

`003A EXECUTADA — AGUARDANDO AUDITORIA GPT`
