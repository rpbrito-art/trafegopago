# ACTIVE DOCS — TRÁFEGO PAGO

Atualizado: 2026-08-23
Última reciclagem: **fechamento da Fase 1 após promoção da 001F**.
Próximo gatilho ordinário: cinco rodadas substantivas promovidas desde esta reciclagem, fechamento da próxima fase macro ou outro gatilho de `DOCUMENTATION_LIFECYCLE.md`.

## Estado corrente

**Fase 1 encerrada. Nenhuma rodada substantiva nova está autorizada.**

Última promoção: 001F — Recovery de Acesso + Fechamento da Fase 1.

Fonte operacional: `estado.md`.

## HOT — ler sempre

1. `estado.md`
2. `.gpt/PROJECT_PROMPT.md`
3. `docs/00-governanca/ACTIVE_DOCS.md`

Não existe mandato vigente enquanto uma nova rodada não for publicada.

## Resumo histórico preferencial

`docs/00-governanca/HISTORY_SUMMARY.md`

O resumo incorpora Rodadas 000–001F e o fechamento da Fase 1. Mandatos, correções, relatórios e auditorias da 001F são agora **HISTORY / EVIDENCE**: abrir somente se surgir dependência concreta.

## Gate obrigatório de produto

Antes de planejar, refinar, autorizar ou auditar qualquer nova rodada que afete produto/experiência, ler integralmente:

`docs/01-produto/GROWTH_INTELLIGENCE_CANONICAL.md`

Princípio: **a complexidade pertence ao sistema, não ao usuário**.

## Canônicos ativos por área

### Governança

- `docs/00-governanca/PROJECT_CHARTER.md`
- `docs/00-governanca/IMPLEMENTATION_ROADMAP.md`
- `docs/00-governanca/DOCUMENTATION_LIFECYCLE.md`

### Produto

- `docs/01-produto/MVP_CANONICAL.md`
- `docs/01-produto/GROWTH_INTELLIGENCE_CANONICAL.md`

### Arquitetura

- `docs/03-canonical/TECHNICAL_SPEC.md`
- `docs/03-canonical/DATA_MODEL.md`
- `docs/03-canonical/API_CONTRACTS.md`
- `docs/03-canonical/SECURITY_MODEL.md`
- `docs/03-canonical/AI_ARCHITECTURE.md`

## Estado técnico promovido relevante

- Auth e recovery real por e-mail/senha;
- confirmation/recovery SSR;
- organizations + memberships + business_profiles;
- grants mínimos + RLS + isolamento tenant;
- bootstrap de negócio atômico server-only;
- recovery com anti-enumeração por resposta e guard `amr` temporal fail-closed;
- 5 migrations incorporadas;
- nenhuma fixture residual;
- Growth Intelligence harmonizado proporcionalmente em MVP/roadmap.

## Pendências abertas que não são mandato

- revogar a App Password do Gmail criada somente para o E2E da 001F;
- leaked password protection antes de clientes reais/produção;
- SMTP/domínio de produção;
- hardening e capacidades posteriores conforme roadmap.

## Próxima rodada

Nenhuma rodada é autorizada por este arquivo. `/proxima` deve parar enquanto `estado.md` não apontar um novo mandato formalmente autorizado.

A Fase 2 existe como próxima dependência do roadmap, mas deve ser planejada e autorizada separadamente.