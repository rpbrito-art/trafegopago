# ACTIVE DOCS — TRÁFEGO PAGO

Atualizado: 2026-08-22
Última reciclagem: após promoção da Rodada 001A
Próximo gatilho ordinário: após cinco novas rodadas substantivas promovidas ou no fechamento da próxima fase macro, o que ocorrer primeiro.

## Estado corrente

Rodada vigente: **001C — Organizations + Membership**.

Mandato:
`rodadas/gpt/RODADA_001C_ORGANIZATIONS_MEMBERSHIP.md`

A fonte operacional é `estado.md`. Este arquivo apenas define o working set documental.

## HOT — ler sempre

1. `estado.md`
2. `.gpt/PROJECT_PROMPT.md`
3. `docs/00-governanca/ACTIVE_DOCS.md`
4. mandato vigente indicado por `estado.md`

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

## READ SET específico da 001C

Obrigatórios adicionais:

- `docs/03-canonical/DATA_MODEL.md` — seções 1, 2, 16, 17 e 18;
- `docs/03-canonical/SECURITY_MODEL.md` — seções 4, 5, 6, 12, 15, 18, 20, 22 e 24;
- leitura dirigida de `docs/03-canonical/TECHNICAL_SPEC.md` para Organizations, multi-tenancy e segurança;
- migration promovida da 001A apenas como baseline de RLS/privileges;
- `supabase/config.toml` e migration history atual.

Sob demanda:

- `docs/00-governanca/HISTORY_SUMMARY.md`;
- documentação oficial vigente do Supabase para migrations, RLS e FK com `auth.users`.

## Resumo histórico preferencial

- `docs/00-governanca/HISTORY_SUMMARY.md`

Use este resumo antes de abrir rodadas/relatórios antigos.

## Histórico / evidência — NÃO ler por padrão

- relatórios completos das rodadas 000, 001A e 001B;
- auditorias antigas completas, salvo dependência concreta;
- `docs/02-research/`;
- PRs e logs históricos;
- `.gpt/CURRENT_STATE.md`;
- documentos Meta e `AI_ARCHITECTURE.md` durante a 001C.

Abrir somente quando o mandato exigir ou quando o resumo/canônico não resolver uma dúvida concreta.