# ACTIVE DOCS — TRÁFEGO PAGO

Atualizado: 2026-08-23
Última reciclagem: após promoção da Rodada 001E, incorporando Growth Intelligence ao working set futuro.
Próximo gatilho ordinário: conforme `DOCUMENTATION_LIFECYCLE.md`, sem criar housekeeping isolado.

## Estado corrente

Rodada 001E — **APROVADA COM RESSALVAS NÃO BLOQUEANTES E PROMOVIDA**.

Não há mandato executável pendente.

`/proxima` deve parar aguardando planejamento e autorização explícita do fundador.

A fonte operacional é `estado.md`.

## HOT — ler sempre

1. `estado.md`
2. `.gpt/PROJECT_PROMPT.md`
3. `docs/00-governanca/ACTIVE_DOCS.md`

Quando houver mandato vigente, ele entra em seguida no working set.

## GATE OBRIGATÓRIO — planejamento e auditoria de produto

Antes de formular, refinar, dividir, autorizar ou auditar qualquer rodada que afete produto/experiência, o GPT deve ler **integralmente**:

`docs/01-produto/GROWTH_INTELLIGENCE_CANONICAL.md`

Isso é obrigatório e não pode ser substituído por referência curta, resumo de chat ou trecho do `MVP_CANONICAL.md`.

Considere relevante qualquer rodada que toque, direta ou indiretamente, em:

- onboarding/configuração do negócio;
- jornada/funil/definição de sucesso;
- conteúdo, publicação ou criativo;
- orgânico ou mídia paga;
- Meta/Instagram;
- oportunidades, experimentos ou recomendações;
- personas, públicos, segmentação ou targeting;
- leads, conversões ou mensuração;
- inteligência, insights ou IA aplicada ao comportamento de mercado;
- UX, navegação, configuração ou complexidade da operação.

Se houver dúvida, tratar como relevante e ler o documento.

Regras:

- todo mandato relevante deve listar `GROWTH_INTELLIGENCE_CANONICAL.md` explicitamente no READ SET;
- Claude deve lê-lo antes de implementar escopo relevante;
- auditoria GPT deve verificar aderência; contradição material é bloqueante salvo decisão explícita do fundador que atualize o canônico;
- até a harmonização completa dos documentos antigos, Growth Intelligence prevalece em modelo de crescimento, jornadas, orgânico/pago, conteúdo/criativo, personas/públicos, inteligência de mercado e simplicidade guiada;
- essa prevalência não substitui contratos técnicos de segurança, tenancy ou autorização financeira.

## Resumo histórico preferencial

- `docs/00-governanca/HISTORY_SUMMARY.md`

O resumo incorpora Rodadas 000–001E.

## Canônicos ativos por área

### Governança

- `docs/00-governanca/PROJECT_CHARTER.md`
- `docs/00-governanca/IMPLEMENTATION_ROADMAP.md`
- `docs/00-governanca/DOCUMENTATION_LIFECYCLE.md`

### Produto

- `docs/01-produto/MVP_CANONICAL.md`
- `docs/01-produto/GROWTH_INTELLIGENCE_CANONICAL.md` — leitura integral obrigatória nas rodadas relevantes de produto.

### Arquitetura

- `docs/03-canonical/TECHNICAL_SPEC.md`
- `docs/03-canonical/DATA_MODEL.md`
- `docs/03-canonical/API_CONTRACTS.md`
- `docs/03-canonical/SECURITY_MODEL.md`
- `docs/03-canonical/AI_ARCHITECTURE.md`

## Estado técnico promovido relevante

- Auth real e sessão SSR;
- organizations + organization_members;
- grants mínimos e RLS tenant-scoped;
- isolamento real 2 usuários × 2 organizações;
- defaults de `postgres` endurecidos;
- `business_profiles` tenant-scoped;
- bootstrap inicial atômico por RPC INVOKER apenas server-side/service_role;
- proteção de dupla submissão;
- `/conta` com estados explícitos de tenancy;
- segredo Supabase privilegiado somente server-side.

Auditoria mais recente:

`rodadas/gpt/AUDITORIA_RODADA_001E_BUSINESS_BOOTSTRAP.md`

## Próxima direção planejável — não autorizada

Antes de Meta/Instagram, avaliar o fechamento restante da Fase 1 e a harmonização proporcional do plano futuro com Growth Intelligence.

Pontos a considerar no planejamento:

- recovery de acesso;
- gestão mínima necessária de conta/membership;
- evolução do onboarding para trilha simples e perfil progressivo;
- objetivo/jornada/resultado desejado versus mensurável;
- harmonização de `MVP_CANONICAL.md`, roadmap e data model apenas na medida necessária à próxima etapa útil.

Não assumir automaticamente que a próxima rodada será 001F nem que todos esses itens pertencem à mesma rodada.

## Histórico / evidência — NÃO ler por padrão

- relatórios completos das Rodadas 000–001E;
- auditorias completas antigas, exceto a última quando necessária;
- correções 001B/001D já incorporadas;
- `docs/02-research/`;
- PRs e logs históricos;
- `.gpt/CURRENT_STATE.md`.

Abrir somente quando `HISTORY_SUMMARY.md`, canônicos e mandato vigente não resolverem uma dependência concreta.