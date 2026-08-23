# ESTADO — Tráfego Pago

Atualizado: 2026-08-23

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

Status: **AUTORIZADA — AGUARDANDO EXECUÇÃO PELO CLAUDE CODE**.

Mandato vigente:

`rodadas/gpt/RODADA_001F_RECOVERY_FECHAMENTO_FASE1.md`

Branch esperada:

`claude/rodada-001f-recovery-fechamento-fase1`

Relatório esperado:

`rodadas/claude/RELATORIO_RODADA_001F_RECOVERY_FECHAMENTO_FASE1.md`

`/proxima` está autorizado a executar **somente a Rodada 001F**.

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

Claude Code deve executar a Rodada 001F conforme o mandato e parar em:

`001F EXECUTADA — CANDIDATA A FECHAMENTO DA FASE 1 — AGUARDANDO AUDITORIA GPT`

Se a configuração do template Recovery hosted exigir ação humana, deve concluir primeiro tudo que for não destrutivo e parar em um único gate com instruções exatas.

Não iniciar Fase 2.

## 10. Continuidade

Branch/relatório/commit não significam incorporação. O estado efetivamente promovido continua 000–001E até auditoria e promoção formal da 001F.

Descompasso documental temporário deve ser resolvido junto da próxima etapa substantiva quando não houver risco operacional.
