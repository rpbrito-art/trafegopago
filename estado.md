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

Status: **CORREÇÃO 001F-01 AUTORIZADA — AGUARDANDO GATE HUMANO DO TEMPLATE E RETOMADA PELO CLAUDE CODE**.

Mandato original:

`rodadas/gpt/RODADA_001F_RECOVERY_FECHAMENTO_FASE1.md`

Correção vigente e prevalente sobre o ponto divergente do mandato:

`rodadas/gpt/CORRECAO_001F_01_AMR_RECOVERY_PROVIDER_REAL.md`

Branch entregue/em correção:

`claude/rodada-001f-recovery-fechamento-fase1`

PR de auditoria: **#7 — draft, não promover**.

Head entregue antes da correção:

`4d9e4276609f9d3bb9484ede2bf313e6ac38a0c8`

O estado promovido continua **000–001E**. A 001F não foi aprovada nem incorporada.

Nenhuma Fase 2 ou rodada posterior está autorizada.

## 5. Bloqueio descoberto e decisão GPT

O mandato original exigia sessão com `amr.method = recovery`.

A execução mediu no Supabase hospedado atual:

- login por senha → `password`;
- `verifyOtp(type=recovery)` → `otp`;
- `verifyOtp(type=signup)` → `otp`.

A documentação externa atual é inconsistente nesse detalhe. A correção 001F-01 substitui o requisito literal por um predicado compatível com o provider real, sem introduzir hook, tabela, cookie assinado, secret novo ou admin API.

Novo contrato resumido:

- claims verificadas por `getClaims()`;
- `sub` e `email` válidos;
- AMR com `recovery` **ou** `otp`;
- nenhuma entrada `password`;
- AMR autorizador recente: máximo **15 minutos**, com até 60 s de clock skew futuro;
- sessão password comum continua recusada;
- se métodos Auth adicionais forem habilitados no futuro, o guard deve ser reaberto antes da promoção dessa capacidade.

## 6. Sessões após redefinição

A correção também exige:

- `signOut({ scope: "global" })` explícito após `updateUser({ password })`;
- tratar o retorno do logout, sem ignorar erro;
- provar que o refresh token de sessão anterior deixa de funcionar;
- aceitar como propriedade conhecida do Supabase que access tokens já emitidos podem continuar válidos até `exp`;
- se logout global retornar sucesso e refresh anterior ainda funcionar, parar e retornar ao GPT.

Nenhuma admin API/secret key é autorizada para esse logout funcional.

## 7. Gate humano obrigatório — template Recovery hosted

Antes do E2E final, o fundador deve configurar no Supabase hospedado o template **Reset Password / Recovery** usando exatamente o conteúdo versionado em:

`supabase/templates/recovery.html`

O link deve usar:

`{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery`

Sem `next`.

Não usar `supabase config push`, pois isso poderia empurrar configurações locais inadequadas ao projeto hospedado.

Nenhum segredo SMTP deve ser solicitado ou exposto.

## 8. Próxima execução autorizada

Depois de o fundador confirmar que o template Recovery hosted foi atualizado, Claude Code deve retomar **a mesma branch** e executar somente a Correção 001F-01:

- ajustar o guard de recovery para o predicado temporal autorizado;
- tornar o logout global explícito e testado;
- atualizar testes/smoke/comentários necessários;
- executar o smoke final com e-mail real;
- manter zero migration/DDL;
- preservar a harmonização MVP/roadmap já entregue;
- rodar gates e CI;
- atualizar relatório e `estado.md`.

Conclusão esperada, se tudo passar:

`001F EXECUTADA COM CORREÇÃO 001F-01 — CANDIDATA A FECHAMENTO DA FASE 1 — AGUARDANDO AUDITORIA GPT`

Claude não aprova, não promove e não inicia Fase 2.

## 9. Baseline e riscos conhecidos

1. `auth_leaked_password_protection` permanece desabilitado: hardening obrigatório antes de clientes reais/produção e recurso Pro+ conforme documentação vigente.
2. Brevo Free permanece SMTP provisório de desenvolvimento.
3. Default ACL residual de `supabase_admin` continua aceito somente enquanto `public` tiver zero objetos owned por essa role.
4. Funções futuras exigem GRANT EXECUTE explícito.
5. `SUPABASE_SECRET_KEY` nunca pode entrar no fluxo funcional de recovery, `NEXT_PUBLIC_*`, browser, logs ou respostas.
6. Access tokens revogados no servidor podem permanecer criptograficamente válidos até `exp`; ações futuras de alta sensibilidade podem exigir validação de sessão mais forte conforme risco.
7. Gestão avançada de membros, edição ampla, multi-org e exclusão permanecem posteriores e não bloqueiam o fechamento da Fase 1.
8. A Fase 1 só pode ser declarada encerrada pela auditoria GPT após recovery real aprovado e promoção da 001F.

## 10. Gate obrigatório de produto

A 001F toca UX/onboarding e documentação de produto. Claude e GPT devem ler integralmente:

`docs/01-produto/GROWTH_INTELLIGENCE_CANONICAL.md`

A harmonização entregue não pode reintroduzir paid-first, funil rígido, formulário total obrigatório nem complexidade desnecessária ao usuário.

## 11. Continuidade

Branch/relatório/commit não significam incorporação. O estado efetivamente promovido continua 000–001E até auditoria e promoção formal da 001F.

Descompasso documental temporário deve ser resolvido junto da próxima etapa substantiva quando não houver risco operacional.