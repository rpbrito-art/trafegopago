# ACTIVE DOCS — TRÁFEGO PAGO

Atualizado: 2026-08-23
Última reciclagem: após promoção da Rodada 001D.
Próximo gatilho ordinário: conforme `DOCUMENTATION_LIFECYCLE.md`, sem criar housekeeping isolado.

## Estado corrente

Rodada vigente: **001E — Bootstrap de Negócio**.

Status: **AUTORIZADA — AGUARDANDO EXECUÇÃO PELO CLAUDE CODE**.

Mandato vigente:

`rodadas/gpt/RODADA_001E_BUSINESS_BOOTSTRAP.md`

Branch esperada:

`claude/rodada-001e-business-bootstrap`

`/proxima` está autorizado a executar **somente a Rodada 001E**.

A fonte operacional é `estado.md`.

## HOT — ler sempre

1. `estado.md`
2. `.gpt/PROJECT_PROMPT.md`
3. `docs/00-governanca/ACTIVE_DOCS.md`
4. `rodadas/gpt/RODADA_001E_BUSINESS_BOOTSTRAP.md`

## READ SET específico da 001E

Conforme mandato:

- `docs/00-governanca/HISTORY_SUMMARY.md`;
- `docs/00-governanca/IMPLEMENTATION_ROADMAP.md` — Fase 1;
- `docs/01-produto/MVP_CANONICAL.md` — §§4 e 20;
- `docs/03-canonical/DATA_MODEL.md` — §§1, 2, 16, 17;
- `docs/03-canonical/SECURITY_MODEL.md` — §§3–6, 12, 15, 18, 20;
- migrations 001C/001D;
- arquivos auth/Supabase/env/`/conta` listados no mandato;
- documentação oficial Supabase vigente para RLS, grants, service role/secret key, funções e Data API.

Não reler relatórios completos das Rodadas 000–001D salvo dependência concreta.

## Resumo histórico preferencial

- `docs/00-governanca/HISTORY_SUMMARY.md`

O resumo incorpora 000–001D.

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

## Corte da Rodada 001E

Dentro:

- `business_profiles`;
- leitura tenant-scoped;
- caminho server-only privilegiado para bootstrap atômico;
- organização + membership owner + profile;
- `/conta` com zero/uma/múltiplas memberships tratadas explicitamente.

Fora:

- recovery de senha;
- gestão/convites de membros;
- edição ampla;
- multi-org switcher;
- delete;
- Meta/IA;
- Fase 2.

Nenhuma etapa posterior está autorizada.

## Histórico / evidência — NÃO ler por padrão

- relatórios completos das Rodadas 000–001D;
- auditorias completas antigas;
- correções 001B/001D já incorporadas;
- `docs/02-research/`;
- PRs e logs históricos;
- `.gpt/CURRENT_STATE.md`.

Abrir somente quando o mandato/canônicos atuais não resolverem uma dependência concreta.
