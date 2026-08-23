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

### Bloqueio do gate Meta (item 7 da auditoria) — NÃO resolvido

O caminho autorizado pelo mandato §2 (**Facebook Login for Business**) está indisponível nesta conta:

1. a Meta recusou reivindicar o app — *"Sua empresa está proibida de fazer publicidade"*;
2. o app foi criado sem vínculo empresarial e o redirect OAuth foi salvo;
3. o produto **Login do Facebook para Empresas não aparece**, nem instalado nem disponível;
4. a documentação oficial confirma: *"Your Meta app must be a business type app"* — e app tipo Business exige o portfólio empresarial que está restrito.

**Não houve OAuth real.** Troca `code → token`, escopos concedidos e conexão/desconexão ponta a ponta seguem não provados contra a Meta.

O executor **não** trocou para o Login comum (`scope`) por conta própria: isso substituiria uma decisão de arquitetura do GPT com efeito direto sobre a Marketing API na Fase 3. O mandato §2 manda parar e devolver a divergência.

### Saídas possíveis — decisão do GPT

1. regularizar o portfólio empresarial junto à Meta e criar app tipo Business;
2. usar outro portfólio já habilitado;
3. autorizar explicitamente o Login comum (`scope`) para a 003A, registrando o impacto na Fase 3;
4. mover o gate para sub-rodada própria e promover a 003A pela fundação já provada.

## 6. Próxima ação autorizada

A Correção 003A-02 está **executada** na parte que dependia do executor. PR #11 atualizada.

**A próxima ação é do GPT: reauditar o delta corretivo e decidir uma das saídas da §5 para o gate Meta bloqueado.**

Claude não promove, não inicia 003B e não altera o caminho de autorização por conta própria.

## 7. Pendências não bloqueantes

- leaked-password protection antes de produção;
- SMTP/domínio de produção;
- default ACL residual de `supabase_admin` enquanto inerte;
- App Review/Business Verification para fase comercial quando aplicável.
