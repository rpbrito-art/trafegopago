# ESTADO — Tráfego Pago

Atualizado: 2026-08-23 (execução da 001F)

Este é o **estado operacional canônico da execução corrente**. Para histórico promovido, usar `docs/00-governanca/HISTORY_SUMMARY.md`; não reler relatórios antigos por padrão.

## 1. Repositório e ambiente autorizados

- GitHub: `rpbrito-art/trafegopago`
- Pasta local esperada: `C:\Users\rpbri\Documents\trafegopago`
- `rpbrito-art/business-weaver`: **fora de escopo**
- Supabase project ref: `cbnxdoxpyioxjwgjhbtq`

## 2. Estado incorporado à main

Promovido e disponível:

- Rodada 000 — Bootstrap Técnico;
- Rodada 001A — Baseline Supabase e Segurança;
- Rodada 001B — Auth Real;
- Rodada 001C — Organizations + Membership;
- Rodada 001D — Default privileges + Grants + RLS + Isolamento;
- Rodada 001E — Bootstrap de Negócio;
- Auth real por e-mail/senha com confirmação SSR, sessão/cookies e rota protegida;
- `public.organizations`, `public.organization_members` e `public.business_profiles` com RLS;
- isolamento tenant real e grants mínimos;
- criação inicial atômica organization + owner membership + business_profile por caminho server-only;
- RPC `SECURITY INVOKER` executável apenas por `service_role`;
- proteção contra dupla submissão concorrente;
- `/conta` trata zero/uma/múltiplas memberships e organização indisponível sem escolher tenant silenciosamente;
- `SUPABASE_SECRET_KEY` consumida somente server-side;
- default privileges seguros da 001D e `ensure_rls` preservados;
- `GROWTH_INTELLIGENCE_CANONICAL.md` e Lei da Simplicidade Guiada vinculam planejamento e auditoria futuros de produto.

Detalhes históricos: `docs/00-governanca/HISTORY_SUMMARY.md`.

## 3. Última rodada promovida

**RODADA 001E — BOOTSTRAP DE NEGÓCIO**

Status: **APROVADA COM RESSALVAS NÃO BLOQUEANTES E PROMOVIDA**.

Mandato: `rodadas/gpt/RODADA_001E_BUSINESS_BOOTSTRAP.md`

Relatório Claude: `rodadas/claude/RELATORIO_RODADA_001E_BUSINESS_BOOTSTRAP.md`

Auditoria GPT: `rodadas/gpt/AUDITORIA_RODADA_001E_BUSINESS_BOOTSTRAP.md`

PR #6.

Merge: `7cf7786320f49c1d5b3f486f4ba8ca4919fa2ffd`

CI final reconciliada: `32638010339` — success.

Migration incorporada: `20260823111051_create_business_profiles_and_bootstrap.sql`.

## 4. Estado corrente

**RODADA 001F — RECOVERY DE ACESSO + FECHAMENTO DA FASE 1**

Status: **EXECUTADA PARCIALMENTE — BLOQUEADA NO CRITÉRIO DE PARADA §11.2 — AGUARDANDO DECISÃO E AUDITORIA GPT**.

**NÃO é candidata a fechamento da Fase 1.**

Mandato vigente:

`rodadas/gpt/RODADA_001F_RECOVERY_FECHAMENTO_FASE1.md`

Branch entregue:

`claude/rodada-001f-recovery-fechamento-fase1`

Relatório entregue:

`rodadas/claude/RELATORIO_RODADA_001F_RECOVERY_FECHAMENTO_FASE1.md`

Gates locais: lint, typecheck, `vitest run` (19 arquivos / 319 testes) e build — todos verdes. Sem migration, sem DDL, sem mudança de schema/RLS/grants. Migration history permanece em 5, última `20260823111051`. Advisor só com o WARN conhecido.

### Bloqueio

O mandato §4.4 exige sessão cujo JWT `amr` contenha o método `recovery`. **O projeto hospedado não emite esse valor.** Medido em GoTrue `v2.195.0`, no JWT e em `auth.mfa_amr_claims`:

- login por senha → `password`;
- `verifyOtp(type=recovery)` → `otp`;
- `verifyOtp(type=signup)` → `otp`.

Sessão comum de login fica bloqueada com segurança, mas sessão de recuperação não se distingue de outra sessão nascida de OTP por e-mail. Isso é o critério de parada §11.2.

O guard entregue (`grantsPasswordReset`) exige método de OTP por e-mail e recusa `amr` contendo `password` — a regra mais estrita que o contrato real suporta. A divergência está documentada em código, coberta por teste e **não** foi apresentada como cumprimento do mandato.

### Pendências que dependem de outro agente

1. **GPT:** decidir o critério de `amr` — ratificar o predicado entregue, ou determinar mecanismo próprio (custom access token hook, cookie marcador assinado no ramo de recovery, ou outro). Qualquer um deles é contrato estrutural novo, fora do mandato do executor.
2. **Fundador:** atualizar o template Recovery no Dashboard com o conteúdo de `supabase/templates/recovery.html`. Não verificável nem aplicável pelo executor: a CLI guarda o token no keyring e `supabase config push` empurraria todo o config local sobre o projeto hospedado.
3. **Fundador, depois de 1 e 2:** rodar a prova final com e-mail real — `RECOVERY_TEST_EMAIL=<caixa de teste> npm run smoke:recovery`.

Nenhuma Fase 2 ou rodada posterior está autorizada.

## 5. Objetivo autorizado da 001F

Fechar a lacuna funcional objetiva restante da Fase 1 com recovery real por e-mail/senha e deixar a fase candidata a encerramento após auditoria GPT.

Fluxo alvo:

`entrar → esqueci minha senha → e-mail real → confirmação SSR recovery → nova senha → login com nova senha`

A rodada deve:

- implementar pedido de recuperação sem enumeração de contas;
- versionar template de recovery e alinhar configuração local;
- validar o template hosted efetivo por e-mail real;
- ampliar `/auth/confirm` somente para `recovery`, preservando signup/email e open-redirect protection;
- forçar recovery para a rota de nova senha, sem `next` arbitrário;
- exigir sessão cujo JWT `amr` contenha método `recovery` para permitir redefinição;
- usar `updateUser({ password })` no contexto do próprio usuário, sem admin/secret key;
- provar senha antiga rejeitada, nova senha válida, não reutilização do link e comportamento real de sessões;
- melhorar apenas a mensagem de erro técnico de `/conta` registrada como dívida da 001E;
- preservar schema/RLS/grants sem migrations;
- harmonizar proporcionalmente `MVP_CANONICAL.md` e `IMPLEMENTATION_ROADMAP.md` com Growth Intelligence no que afeta fechamento da Fase 1 e interpretação das próximas fases.

## 6. Fora de escopo da 001F

- convites e gestão de membros;
- alteração de role/status/ownership;
- multi-org switcher;
- edição ampla/exclusão de negócio;
- Meta/Instagram;
- Operations/Audit/Queues da Fase 2;
- Ads/campanhas;
- IA/personas;
- MFA/passkeys/social login;
- plano Supabase pago;
- SMTP/domínio de produção.

Gestão avançada de membros **não bloqueia** o fechamento da Fase 1; a fundação multiusuário, papéis, tenancy e isolamento já existem e foram provados.

## 7. Baseline e riscos conhecidos

1. `auth_leaked_password_protection` permanece desabilitado: hardening obrigatório antes de clientes reais/produção e recurso Pro+ conforme documentação vigente.
2. Brevo Free permanece SMTP provisório de desenvolvimento.
3. Template Recovery do projeto hosted pode exigir um único gate humano no Dashboard; não pedir nem expor segredo SMTP.
4. Default ACL residual de `supabase_admin` continua aceito somente enquanto `public` tiver zero objetos owned por essa role.
5. Funções futuras exigem GRANT EXECUTE explícito.
6. `SUPABASE_SECRET_KEY` nunca pode entrar no fluxo funcional de recovery, `NEXT_PUBLIC_*`, browser, logs ou respostas.
7. A rota de redefinição não pode aceitar mera sessão autenticada comum como prova de recovery.
8. A Fase 1 só pode ser declarada encerrada pela auditoria GPT após recovery real aprovado; Claude não promove nem fecha fase.

## 8. Gate obrigatório de produto

A 001F toca UX/onboarding e documentação de produto. Claude deve ler **integralmente**:

`docs/01-produto/GROWTH_INTELLIGENCE_CANONICAL.md`

A harmonização da rodada não pode reintroduzir paid-first, funil rígido, formulário total obrigatório nem complexidade desnecessária ao usuário.

## 9. Próxima ação autorizada

A execução parou no critério §11.2 do mandato. A próxima ação **não é do Claude Code**:

1. GPT decide o critério de sessão de recovery (ver §4 do relatório);
2. fundador aplica o template Recovery hospedado;
3. fundador roda a prova final com e-mail real;
4. GPT audita.

Claude Code só volta a executar depois de mandato ou correção formal em `rodadas/gpt/`.

Não iniciar Fase 2.

## 10. Continuidade

Branch/relatório/commit não significam incorporação. O estado efetivamente promovido continua 000–001E até auditoria e promoção formal da 001F.

Descompasso documental temporário deve ser resolvido junto da próxima etapa substantiva quando não houver risco operacional.
