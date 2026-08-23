# ACTIVE DOCS — TRÁFEGO PAGO

Atualizado: 2026-08-23
Última reciclagem: durante auditoria da Rodada 001F, sem abrir nova rodada.
Próximo gatilho ordinário: fechamento da Fase 1, se a 001F for corrigida, re-auditada e promovida.

## Estado corrente

Rodada vigente: **001F — Recovery de Acesso + Fechamento da Fase 1**.

Status: **AUDITORIA GPT REALIZADA — PROMOÇÃO BLOQUEADA — CORREÇÃO 001F-02 AUTORIZADA**.

Mandato original:

`rodadas/gpt/RODADA_001F_RECOVERY_FECHAMENTO_FASE1.md`

Correções vigentes, em ordem:

1. `rodadas/gpt/CORRECAO_001F_01_AMR_RECOVERY_PROVIDER_REAL.md`
2. `rodadas/gpt/CORRECAO_001F_02_ANTI_ENUMERACAO_AMR_FAIL_CLOSED.md`

Branch:

`claude/rodada-001f-recovery-fechamento-fase1`

PR #7 continua **draft; não promover**.

O estado incorporado continua 000–001E. Nenhuma Fase 2 ou rodada posterior está autorizada.

A fonte operacional é `estado.md`.

## HOT — ler sempre

1. `estado.md`
2. `.gpt/PROJECT_PROMPT.md`
3. `docs/00-governanca/ACTIVE_DOCS.md`
4. `rodadas/gpt/RODADA_001F_RECOVERY_FECHAMENTO_FASE1.md`
5. `rodadas/gpt/CORRECAO_001F_01_AMR_RECOVERY_PROVIDER_REAL.md`
6. `rodadas/gpt/CORRECAO_001F_02_ANTI_ENUMERACAO_AMR_FAIL_CLOSED.md`

## REGRA PERMANENTE — retomadas e gates humanos

Aplicar obrigatoriamente:

- `.gpt/PROJECT_PROMPT.md` §4.1 — preflight de retomada: `git fetch origin`, comparar com `origin/main`, ler e reconciliar governança mais nova antes de editar;
- `.gpt/PROJECT_PROMPT.md` §5.5 — gate humano resolvível deve ser conduzido na mesma sessão pelo executor;
- `docs/00-governanca/DOCUMENTATION_LIFECYCLE.md` §§4–5 — continuidade documental e estados de gate.

Princípio: **o fundador não é barramento de contexto entre GPT e Claude**.

## GATE OBRIGATÓRIO — planejamento e auditoria de produto

Antes de formular, refinar, dividir, autorizar ou auditar qualquer rodada que afete produto/experiência, GPT e executor devem ler **integralmente**:

`docs/01-produto/GROWTH_INTELLIGENCE_CANONICAL.md`

Na 001F isso é obrigatório porque a rodada toca recovery/UX de conta e harmonização de produto.

Regras permanentes:

- Growth Intelligence prevalece em modelo de crescimento, jornadas, orgânico/pago, conteúdo/criativo, personas/públicos, inteligência de mercado e simplicidade guiada;
- essa prevalência não substitui contratos técnicos de segurança, tenancy ou autorização financeira;
- contradição material é bloqueante salvo decisão explícita do fundador.

## READ SET específico da retomada 001F-02

Ler somente o necessário:

- os seis itens HOT acima;
- `docs/00-governanca/HISTORY_SUMMARY.md` apenas como resumo promovido;
- `docs/01-produto/GROWTH_INTELLIGENCE_CANONICAL.md` integralmente;
- `src/app/actions/auth.ts` e testes relacionados;
- `src/lib/auth/recovery.ts`, `src/lib/auth/session.ts` e testes relacionados;
- relatório 001F atual para atualizar apenas o delta;
- documentação/código oficial Supabase necessário para o ponto concreto de anti-enumeração ou AMR.

Não reler relatórios completos das Rodadas 000–001E salvo dependência concreta.

## Fatos já provados — NÃO repetir

A auditoria já confirmou:

- E2E real de recovery com e-mail: **40/40**;
- template hosted efetivo SSR com `type=recovery`;
- troca de senha real, senha antiga recusada, senha nova aceita;
- link de uso único;
- logout global com refresh anterior recusado;
- fixture removida e `auth.users` de volta a 1 conta real;
- Gmail SMTP funcional como SMTP provisório de desenvolvimento;
- 5 migrations, nenhuma nova migration/DDL;
- Security Advisor apenas com o WARN conhecido;
- baseline RLS/grants preservado.

**A Correção 001F-02 não autoriza repetir o E2E de e-mail real.** Os dois bloqueios novos são locais/de lógica e devem ser provados por testes + CI, evitando novo custo e novo gate humano.

## Bloqueios da 001F-02

### Anti-enumeração

O pedido de recovery hoje diferencia publicamente rate limit/erro do provider. No Supabase Auth atual, e-mail inexistente retorna 200 antes do controle de frequência; conta existente pode receber 429. A diferença permite inferir existência de conta.

Correção: após e-mail sintaticamente válido, resposta pública idêntica para sucesso, inexistente, 429, 4xx e 5xx do provider.

### AMR fail-closed

O parser atual descarta entradas malformadas e pode preservar uma entrada `otp` recente autorizadora. A 001F-01 exige AMR bem formado.

Correção: qualquer entrada estruturalmente inválida torna o claim `amr` inteiro não autorizável. `password` continua negando; `otp|recovery` só autoriza com timestamp válido e recente.

## Próxima ação autorizada

Claude Code deve retomar **a mesma branch** e executar somente a 001F-02.

Deve:

- reconciliar a branch com a `main` atual;
- corrigir os dois bloqueios acima;
- corrigir a frase stale do `estado.md` da branch sobre E2E ainda pendente;
- atualizar relatório e corpo do PR se necessário;
- rodar lint, typecheck, testes, build e CI;
- confirmar read-only que migrations continuam em 5 e não surgiu fixture residual.

Não deve:

- repetir e-mail/recovery E2E;
- mexer em SMTP, Gmail ou Supabase Dashboard;
- criar migration/DDL;
- pedir ação manual ao fundador;
- tocar Meta, Ads, IA ou Fase 2.

Handoff esperado:

`001F EXECUTADA COM CORREÇÕES 001F-01 E 001F-02 — CANDIDATA A FECHAMENTO DA FASE 1 — AGUARDANDO REAUDITORIA GPT`

Depois, GPT reaudita o delta e decide promoção/fechamento da Fase 1.

## Resumo histórico preferencial

`docs/00-governanca/HISTORY_SUMMARY.md`

O resumo incorpora Rodadas 000–001E.

## Canônicos ativos

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

## Corte da Rodada 001F permanece

Dentro:

- pedido de recuperação por e-mail sem enumeração;
- template Recovery versionado + hosted efetivo;
- confirmação SSR `type=recovery`;
- nova senha sob predicado corrigido;
- prova real de senha antiga/nova, link one-time e sessões;
- UX mínima para erro técnico de `/conta`;
- harmonização proporcional de MVP/roadmap.

Fora:

- gestão/convite de membros;
- multi-org switcher;
- edição ampla/exclusão;
- Meta/Instagram;
- Fase 2 Operations/Audit/Queues;
- IA/Ads;
- MFA/passkeys/social login;
- infraestrutura de produção.

A 001F **não cria migration/schema**.

## Condição de fechamento da Fase 1

Somente GPT, após reauditoria independente e promoção, pode declarar Fase 1 encerrada.

## Histórico / evidência — NÃO ler por padrão

- relatórios completos das Rodadas 000–001E;
- auditorias antigas fora de dependência concreta;
- correções 001B/001D já incorporadas;
- `docs/02-research/`;
- PRs/logs históricos;
- `.gpt/CURRENT_STATE.md`.
