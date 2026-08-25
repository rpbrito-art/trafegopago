# AUDITORIA GPT — RODADA 004D — GUIDED GROWTH JOURNEY FOUNDATION

Data: 2026-08-25

Mandato: `rodadas/gpt/RODADA_004D_GUIDED_GROWTH_JOURNEY_FOUNDATION.md`

Branch auditada: `claude/rodada-004d-guided-growth-journey`

PR: #16

HEAD auditado: `76435b8c5c461a35cc27298d6d2158e71aabb63d`

## Veredito

**BLOQUEADA PARA PROMOÇÃO — CORREÇÃO 004D-01 OBRIGATÓRIA.**

A rodada implementou corretamente o foco atual, o motor determinístico de próximo passo, `/inicio`, `/foco`, redirects e a maior parte das invariantes de tenancy/autorização. Porém, `growth_objectives` é uma entidade versionada e histórica e continua permitindo `UPDATE` amplo por `service_role`, sem guarda persistida que impeça reescrita direta do conteúdo de uma versão já criada.

A prova remota independente confirmou:

- `has_table_privilege('service_role','public.growth_objectives','UPDATE') = true`;
- `growth_objectives` possui **zero triggers customizadas** de imutabilidade.

Logo, um caminho server-side futuro usando o cliente privilegiado pode alterar diretamente objetivo, jornada, sucesso, foco, tenant, autoria ou timestamps de uma linha histórica sem passar por `set_active_growth_objective` ou `set_growth_objective_focus`, destruindo a memória estratégica que 004B/004D pretendem preservar.

## O que foi aprovado na auditoria

- `focus_type = BUSINESS | OFFER | NULL` com shape coerente;
- FK composta tenant-safe de foco para `business_offers`;
- foco aponta para identidade estável da oferta, não versão;
- oferta arquivada não vira novo foco;
- arquivar oferta não apaga foco histórico;
- `set_growth_objective_focus` server-only, owner/admin, org/member ACTIVE, idempotente e serializada pela mesma chave de objetivo;
- mudança de foco arquiva a versão vigente e cria nova linha, preservando objetivo/jornada/sucesso;
- mudança de objetivo não preserva foco silenciosamente;
- motor `decideJourneyStep()` puro, Tier 0, sem IA real;
- estados de negócio/objetivo/oferta/foco/multi-org/erro/base pronta coerentes;
- `/inicio` como entrada guiada inicial e `/foco` como decisão humana;
- destino padrão pós-auth em `/inicio`, allowlist e rotas protegidas ajustadas;
- nenhum CTA Meta bloqueado nem promessa de análise inexistente;
- CI final do HEAD `76435b8c...` verde em lint, typecheck, Edge Functions, testes e build;
- PR #16 permanece draft/open/não mergeada.

## Bloqueio 004D-01 — histórico de `growth_objectives` não é realmente imutável

A tabela nasceu em 004B com:

`grant select, insert, update on table public.growth_objectives to service_role;`

As RPCs seguem corretamente o versionamento, mas a própria tabela não impede UPDATE privilegiado fora delas. Isso deixa uma invariante central dependente da disciplina do chamador.

Como `growth_objectives` registra decisões estratégicas no tempo — objetivo, jornada desejada, evento de sucesso e agora foco — o histórico deve ser protegido no banco.

## Correção exigida

Executar `rodadas/gpt/CORRECAO_004D_01_IMUTABILIDADE_GROWTH_OBJECTIVES.md` na mesma branch.

Não editar nem reescrever migrations já aplicadas, especialmente:

- `20260825180000_create_growth_objectives.sql`;
- `20260825230000_add_growth_objective_focus.sql`.

## Estado após auditoria

- 004D: **EXECUTADA, AUDITADA E BLOQUEADA**;
- 004D: **NÃO APROVADA**;
- 004D: **NÃO PROMOVIDA**;
- PR #16: manter aberto/draft/não mergeado;
- próximo ator: Claude Code, somente para a Correção 004D-01.
