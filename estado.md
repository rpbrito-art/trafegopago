# ESTADO — Tráfego Pago

Atualizado: 2026-08-23

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

Status: **003A + CORREÇÃO 003A-02 EXECUTADAS — AGUARDANDO REAUDITORIA GPT**.

⚠️ **O gate Meta real não foi concluído — bloqueio externo.** Ver §5. Claude não aprova, não promove e não inicia 003B.

Mandato original:

`rodadas/gpt/RODADA_003A_META_CONNECTION_FOUNDATION.md`

Auditoria:

`rodadas/gpt/AUDITORIA_RODADA_003A_META_CONNECTION_FOUNDATION.md`

Correção vigente:

`rodadas/gpt/CORRECAO_003A_02_AUTORIZACAO_ATOMICIDADE_OAUTH_REAL.md`

Branch:

`claude/rodada-003a-meta-connection-foundation`

PR: **#11 draft**.

Relatório:

`rodadas/claude/RELATORIO_RODADA_003A_META_CONNECTION_FOUNDATION.md`

## 4. Resultado da 003A-01

A Correção 003A-01 foi **APROVADA como handoff/reconciliação**:

- branch, PR e relatório existem;
- as três migrations 003A já aplicadas remotamente estão versionadas;
- migration history local/remoto reconciliado em 12;
- CI do head `0ee246a83484a9454ccaeb70c48d62d5d626fb4c` verde.

Ela não promove a 003A porque o gate Meta real continua ausente e a auditoria encontrou bloqueios adicionais no gateway.

## 5. Resultado da Correção 003A-02

Os **seis bloqueios de código** da auditoria foram fechados e provados:

| # | correção |
| --- | --- |
| 3.1 | desconexão reconfirma membership ACTIVE antes de ler ou revogar |
| 3.2 | callback reconfirma membership antes de chamar a Meta e antes de persistir |
| 3.3 | `state` é consumido antes de decidir o desfecho — callback negado também é single-use |
| 3.4 | `upsert` removido; `begin_meta_connection` atualiza a conexão viva ou insere nova, preservando histórico |
| 3.5 | `activate_meta_connection` grava Vault e marca `ACTIVE` na mesma transação |
| 3.6 | revogação oficial `DELETE /{user-id}/permissions` antes da limpeza local; falha indeterminada não vira sucesso |

Migration `20260823203915` — histórico **13**, local == remoto, sem editar migration anterior. 69 testes em `src/lib/meta`; lint, typecheck e build verdes.

### Gate Meta — etapa 1 do E2E APROVADA (2026-08-24)

Conexão real concluída pelo fluxo completo (UI → diálogo Meta → callback):

- **ACTIVE** na organização correta, `connected_at` 2026-08-24 01:47:57Z, expira 2026-10-23;
- 1 intenção OAuth consumida, 0 pendentes — **single-use provado em fluxo real**;
- token no Vault, cifrado; **ausente** de logs e inalcançável pelo browser;
- redirect final `/conta?meta=ok`, sem eco de `code`/`state`;
- `debug_token`: `type: SYSTEM_USER`, `user_id: 122103866379446065`, escopos `pages_show_list`, `pages_read_engagement`, `public_profile`.

### Investigação 1 — revogação de SYSTEM_USER

`DELETE /{user-id}/permissions` é endpoint de permissões **de usuário** e não se aplica. O mecanismo documentado é `GET /{version}/oauth/revoke` com `client_id`, `client_secret`, `revoke_token` e `access_token`, exigindo que o app seja o mesmo — nosso caso. Sonda estrutural com token inválido confirmou que o endpoint existe; nada real foi revogado.

**Corrigido por delta:** a desconexão inspeciona o tipo via `debug_token` e escolhe o caminho (`oauth/revoke` para SYSTEM_USER, `/permissions` para USER); tipo desconhecido segue pelo caminho conservador que falha fechado. **Não provado ponta a ponta** — validar exige revogar a conexão existente.

### Bloqueio da reauditoria — corrigido

`disconnectMeta` ignorava o erro de `read_meta_connection_token`. Como a RPC devolve `data: null` tanto para "sem token" quanto para "falha de leitura", uma falha seria lida como ausência de credencial: a revogação remota era pulada e a **local executada**, deixando a autorização possivelmente ativa na Meta.

Agora erro de leitura retorna `TOKEN_READ_FAILED`, sem chamar a Meta e sem alterar estado local. Apenas leitura bem-sucedida com retorno vazio autoriza a limpeza. Dois testes novos cobrem o caso, incluindo a comparação direta entre os dois desfechos da mesma resposta `null`. Total: **76 testes**.

### Investigação 2 — escopos ausentes

A hipótese de App Review/restrição de publicidade **estava errada**. Leituras na Graph API: `me/assigned_pages` = 0, `me/accounts` = 0, `me/adaccounts` 403 `Missing Permissions`, `me/businesses` 400 `Missing Permission`. **Nenhum ativo foi selecionado no diálogo OAuth** — e a Meta condiciona permissões de ativo à seleção. O app está em desenvolvimento (`app_type: 0`), onde o administrador dispensa App Review, o que reforça o diagnóstico. Confirmar exige refazer o diálogo, o que substituiria a conexão atual.

### Dívida de produção registrada

O logger de requisições do Next.js dev imprime a URL completa do callback, com `code` e `state`. Não é código do projeto e ambos já estavam consumidos, mas em produção colocaria credenciais de curta duração em log. Tratar junto da política de redaction (`SECURITY_MODEL.md` §15).

### Estado atual do ambiente

Existe uma conexão **ACTIVE real**, com token válido até 2026-10-23, mantida de propósito: nenhuma limpeza local foi feita, porque a autorização pode estar viva na Meta.

## 6. Próxima ação autorizada

A Correção 003A-02 está **executada** na parte autônoma. PR #11 atualizada.

**A próxima ação é do GPT**, porque as três saídas restantes implicam alterar ou revogar a conexão existente:

1. autorizar a **etapa 2 do E2E** — desconectar pelo `oauth/revoke` já implementado, provando o caminho SYSTEM_USER ponta a ponta;
2. **refazer o diálogo selecionando ativos**, para confirmar a causa dos escopos ausentes e obter `ads_*`/`business_management`;
3. revogar pelo painel da Meta e então limpar o estado local.

Claude não promove, não inicia 003B e não revoga a conexão por conta própria.

## 7. Pendências não bloqueantes

- leaked-password protection antes de produção;
- SMTP/domínio de produção;
- default ACL residual de `supabase_admin` enquanto inerte;
- App Review/Business Verification para fase comercial quando aplicável.
