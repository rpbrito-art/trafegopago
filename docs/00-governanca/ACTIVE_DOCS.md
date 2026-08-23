# ACTIVE DOCS — TRÁFEGO PAGO

Atualizado: 2026-08-22
Última reciclagem: na autorização da Rodada 001D, incorporando a 001C ao resumo histórico.
Próximo gatilho ordinário: após cinco novas rodadas substantivas promovidas ou no fechamento da próxima fase macro, o que ocorrer primeiro.

## Estado corrente

Rodada vigente: **001D — Default privileges + Grants + RLS + Isolamento**.

Mandato-base:
`rodadas/gpt/RODADA_001D_RLS_TENANCY_ISOLAMENTO.md`

Correção vigente:
`rodadas/gpt/CORRECAO_001D_01_DEFAULT_PRIVILEGES_SCOPE.md`

A correção substitui apenas as decisões de §4 relacionadas ao bloqueio de `supabase_admin` e à política de default privileges de `service_role`. O restante do mandato-base continua vigente.

A fonte operacional é `estado.md`.

## HOT — ler sempre

1. `estado.md`
2. `.gpt/PROJECT_PROMPT.md`
3. `docs/00-governanca/ACTIVE_DOCS.md`
4. `rodadas/gpt/CORRECAO_001D_01_DEFAULT_PRIVILEGES_SCOPE.md`
5. `rodadas/gpt/RODADA_001D_RLS_TENANCY_ISOLAMENTO.md` apenas nas seções não substituídas pela correção

## READ SET específico da retomada 001D

Obrigatórios adicionais:

- relatório de bloqueio atual `rodadas/claude/RELATORIO_RODADA_001D_RLS_TENANCY_ISOLAMENTO.md` — somente para não repetir a investigação já concluída;
- `docs/03-canonical/DATA_MODEL.md` — seções 1, 2, 16 e 17;
- `docs/03-canonical/SECURITY_MODEL.md` — seções 4, 5, 6, 12, 15, 18, 20 e 24;
- migrations `20260822212544_*` e `20260822234354_*`;
- `supabase/config.toml` e migration history atual;
- documentação oficial vigente do Supabase para grants/Data API, RLS, `auth.uid()`, policies e default privileges.

Não repetir a exploração de `ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin`: a decisão GPT já está tomada.

## Canônicos ativos por área

### Governança

- `docs/00-governanca/PROJECT_CHARTER.md`
- `docs/00-governanca/IMPLEMENTATION_ROADMAP.md`
- `docs/00-governanca/DOCUMENTATION_LIFECYCLE.md`

### Produto

- `docs/01-produto/MVP_CANONICAL.md`

### Arquitetura

- `docs/03-canonical/TECHNICAL_SPEC.md`
- `docs/03-canonical/DATA_MODEL.md`
- `docs/03-canonical/API_CONTRACTS.md`
- `docs/03-canonical/SECURITY_MODEL.md`
- `docs/03-canonical/AI_ARCHITECTURE.md`

## Resumo histórico preferencial

- `docs/00-governanca/HISTORY_SUMMARY.md`

Use este resumo antes de abrir rodadas/relatórios antigos.

## Histórico / evidência — NÃO ler por padrão

- relatórios completos das rodadas 000, 001A, 001B e 001C;
- auditorias antigas completas, salvo dependência concreta;
- `docs/02-research/`;
- PRs e logs históricos;
- `.gpt/CURRENT_STATE.md`;
- documentos Meta e `AI_ARCHITECTURE.md` durante a 001D.

Abrir somente quando a correção/mandato exigir ou quando o resumo/canônico não resolver uma dúvida concreta.