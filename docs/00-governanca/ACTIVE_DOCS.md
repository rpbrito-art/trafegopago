# ACTIVE DOCS — TRÁFEGO PAGO

Atualizado: 2026-08-23
Última reciclagem: após promoção da Rodada 001E, incorporando Growth Intelligence ao working set futuro.
Próximo gatilho ordinário: fechamento da Fase 1, se a 001F for aprovada e promovida; fazer a reciclagem junto do fechamento, sem housekeeping isolado.

## Estado corrente

Rodada vigente: **001F — Recovery de Acesso + Fechamento da Fase 1**.

Status: **AUTORIZADA — AGUARDANDO EXECUÇÃO PELO CLAUDE CODE**.

Mandato vigente:

`rodadas/gpt/RODADA_001F_RECOVERY_FECHAMENTO_FASE1.md`

Branch esperada:

`claude/rodada-001f-recovery-fechamento-fase1`

`/proxima` está autorizado a executar **somente a Rodada 001F**.

Nenhuma Fase 2 ou rodada posterior está autorizada.

A fonte operacional é `estado.md`.

## HOT — ler sempre

1. `estado.md`
2. `.gpt/PROJECT_PROMPT.md`
3. `docs/00-governanca/ACTIVE_DOCS.md`
4. `rodadas/gpt/RODADA_001F_RECOVERY_FECHAMENTO_FASE1.md`

## GATE OBRIGATÓRIO — planejamento e auditoria de produto

Antes de formular, refinar, dividir, autorizar ou auditar qualquer rodada que afete produto/experiência, GPT e executor conforme o mandato devem ler **integralmente**:

`docs/01-produto/GROWTH_INTELLIGENCE_CANONICAL.md`

Isso é obrigatório e não pode ser substituído por referência curta, resumo de chat ou trecho do `MVP_CANONICAL.md`.

Na 001F isso é diretamente aplicável porque a rodada toca recovery/UX de conta e harmonização de onboarding.

Regras permanentes:

- todo mandato relevante lista o Growth Intelligence explicitamente no READ SET;
- Claude deve lê-lo antes de implementar o escopo relevante;
- auditoria GPT verifica aderência; contradição material é bloqueante salvo decisão explícita do fundador;
- até harmonização completa, Growth Intelligence prevalece em modelo de crescimento, jornadas, orgânico/pago, conteúdo/criativo, personas/públicos, inteligência de mercado e simplicidade guiada;
- essa prevalência não substitui contratos técnicos de segurança, tenancy ou autorização financeira.

## READ SET específico da 001F

Conforme o mandato:

- `docs/00-governanca/HISTORY_SUMMARY.md`;
- `docs/01-produto/GROWTH_INTELLIGENCE_CANONICAL.md` — integral;
- `docs/01-produto/MVP_CANONICAL.md` — §§1–4, 19–21;
- `docs/00-governanca/IMPLEMENTATION_ROADMAP.md` — Fase 1 e sequência imediata;
- `docs/03-canonical/SECURITY_MODEL.md` — Auth/sessão/secrets aplicáveis;
- código Auth/Supabase/Proxy atual listado no mandato;
- `supabase/config.toml` e templates de Auth;
- documentação oficial Supabase vigente para recovery SSR/PKCE, `resetPasswordForEmail`, `verifyOtp(recovery)`, `updateUser`, JWT `amr`, sessões, templates e redirect URLs.

Não reler relatórios completos das Rodadas 000–001E salvo dependência concreta.

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

Auditoria promovida mais recente:

`rodadas/gpt/AUDITORIA_RODADA_001E_BUSINESS_BOOTSTRAP.md`

## Corte da Rodada 001F

Dentro:

- pedido de recuperação por e-mail sem enumeração;
- template Recovery versionado + hosted efetivo;
- confirmação SSR `type=recovery`;
- nova senha somente com sessão `amr=recovery`;
- prova real de senha antiga/nova, link one-time e sessões;
- UX mínima para erro técnico de `/conta`;
- harmonização proporcional de `MVP_CANONICAL.md` e roadmap para fechamento da Fase 1/Growth Intelligence.

Fora:

- gestão/convite de membros;
- multi-org switcher;
- edição ampla/exclusão;
- Meta/Instagram;
- Fase 2 Operations/Audit/Queues;
- IA/Ads;
- MFA/passkeys/social login;
- infraestrutura de produção.

A 001F **não cria migration/schema**. Se isso parecer necessário, parar e retornar ao GPT.

## Condição de fechamento da Fase 1

Claude não pode declarar a fase encerrada.

Se a 001F entregar todos os gates, deve parar em:

`001F EXECUTADA — CANDIDATA A FECHAMENTO DA FASE 1 — AGUARDANDO AUDITORIA GPT`

Somente GPT, após auditoria independente e promoção, poderá declarar Fase 1 encerrada.

## Histórico / evidência — NÃO ler por padrão

- relatórios completos das Rodadas 000–001E;
- auditorias antigas fora de dependência concreta;
- correções 001B/001D já incorporadas;
- `docs/02-research/`;
- PRs/logs históricos;
- `.gpt/CURRENT_STATE.md`.

Abrir somente quando `HISTORY_SUMMARY.md`, canônicos e mandato vigente não resolverem uma dependência concreta.
