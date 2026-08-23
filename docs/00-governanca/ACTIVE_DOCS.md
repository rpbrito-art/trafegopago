# ACTIVE DOCS — TRÁFEGO PAGO

Atualizado: 2026-08-23
Última reciclagem: após promoção da Rodada 001E, incorporando Growth Intelligence ao working set futuro.
Próximo gatilho ordinário: fechamento da Fase 1, se a 001F for aprovada e promovida; fazer a reciclagem junto do fechamento, sem housekeeping isolado.

## Estado corrente

Rodada vigente: **001F — Recovery de Acesso + Fechamento da Fase 1**.

Status: **CORREÇÃO 001F-01 AUTORIZADA — AGUARDANDO GATE HUMANO DO TEMPLATE E RETOMADA PELO CLAUDE CODE**.

Mandato original:

`rodadas/gpt/RODADA_001F_RECOVERY_FECHAMENTO_FASE1.md`

Correção vigente:

`rodadas/gpt/CORRECAO_001F_01_AMR_RECOVERY_PROVIDER_REAL.md`

Branch:

`claude/rodada-001f-recovery-fechamento-fase1`

PR #7 está aberta como **draft de auditoria; não promover**.

O estado incorporado continua 000–001E.

Nenhuma Fase 2 ou rodada posterior está autorizada.

A fonte operacional é `estado.md`.

## HOT — ler sempre

1. `estado.md`
2. `.gpt/PROJECT_PROMPT.md`
3. `docs/00-governanca/ACTIVE_DOCS.md`
4. `rodadas/gpt/RODADA_001F_RECOVERY_FECHAMENTO_FASE1.md`
5. `rodadas/gpt/CORRECAO_001F_01_AMR_RECOVERY_PROVIDER_REAL.md`

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

## READ SET específico da retomada 001F-01

Ler:

- `estado.md`;
- `.gpt/PROJECT_PROMPT.md`;
- este `ACTIVE_DOCS.md`;
- mandato original 001F;
- Correção 001F-01 integralmente;
- `docs/00-governanca/HISTORY_SUMMARY.md` apenas como resumo promovido;
- `docs/01-produto/GROWTH_INTELLIGENCE_CANONICAL.md` integralmente;
- arquivos Auth/recovery alterados pela branch;
- documentação oficial Supabase vigente para AMR, recovery, `updateUser`, `signOut`/scopes, sessões e templates.

Não reler relatórios completos das Rodadas 000–001E salvo dependência concreta.

## Decisão técnica da Correção 001F-01

O Supabase hospedado atual mede:

- password login → `amr=password`;
- `verifyOtp(type=recovery)` → `amr=otp`;
- signup OTP → `amr=otp`.

Portanto o requisito literal antigo `amr=recovery` foi corrigido. O guard deve exigir claims verificadas + `sub`/`email` válidos + `otp|recovery` recente (máx. 15 min) + ausência total de `password`.

Essa decisão evita introduzir hook, tabela, cookie assinado, secret novo ou admin API apenas para distinguir tipos que o provider atual colapsa em `otp`.

Se futuramente magic link, phone OTP, invite, social login ou outro método forem habilitados, reabrir o guard antes da promoção dessa capacidade.

## Sessões após reset

Após `updateUser({ password })`:

- usar `signOut({ scope: "global" })` explicitamente;
- verificar erro;
- provar que o refresh token de sessão anterior foi revogado;
- access token já emitido pode permanecer válido até `exp`, conforme Supabase, e isso deve ser registrado como propriedade conhecida;
- se refresh anterior continuar válido após logout global bem-sucedido, parar para GPT.

## Gate humano ainda pendente

O founder deve atualizar no Supabase hospedado o template **Reset Password / Recovery** usando o arquivo versionado:

`supabase/templates/recovery.html`

O link esperado é:

`{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery`

Sem `next`.

Não usar `supabase config push` para essa configuração hosted.

Depois da confirmação do gate humano, Claude pode retomar `/proxima` na mesma branch e executar somente a Correção 001F-01.

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

## Corte da Rodada 001F permanece

Dentro:

- pedido de recuperação por e-mail sem enumeração;
- template Recovery versionado + hosted efetivo;
- confirmação SSR `type=recovery`;
- nova senha sob o predicado corrigido da 001F-01;
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

A 001F **não cria migration/schema**.

## Condição de fechamento da Fase 1

Claude não pode declarar a fase encerrada.

Se a 001F corrigida entregar todos os gates, deve parar em:

`001F EXECUTADA COM CORREÇÃO 001F-01 — CANDIDATA A FECHAMENTO DA FASE 1 — AGUARDANDO AUDITORIA GPT`

Somente GPT, após auditoria independente e promoção, poderá declarar Fase 1 encerrada.

## Histórico / evidência — NÃO ler por padrão

- relatórios completos das Rodadas 000–001E;
- auditorias antigas fora de dependência concreta;
- correções 001B/001D já incorporadas;
- `docs/02-research/`;
- PRs/logs históricos;
- `.gpt/CURRENT_STATE.md`.

Abrir somente quando `HISTORY_SUMMARY.md`, canônicos e mandato vigente não resolverem uma dependência concreta.