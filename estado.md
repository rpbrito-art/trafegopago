# ESTADO — Tráfego Pago

Atualizado: 2026-08-23 (execução da Correção 001F-01)

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

Status: **001F EXECUTADA COM CORREÇÃO 001F-01 — CANDIDATA A FECHAMENTO DA FASE 1 — AGUARDANDO AUDITORIA GPT**.

Claude não declara a Fase 1 encerrada: isso depende de auditoria e promoção do GPT.

Mandato original:

`rodadas/gpt/RODADA_001F_RECOVERY_FECHAMENTO_FASE1.md`

Correção vigente e prevalente sobre o ponto divergente do mandato:

`rodadas/gpt/CORRECAO_001F_01_AMR_RECOVERY_PROVIDER_REAL.md`

Branch entregue:

`claude/rodada-001f-recovery-fechamento-fase1`

PR de auditoria: **#7 — draft, não promover**.

Relatório:

`rodadas/claude/RELATORIO_RODADA_001F_RECOVERY_FECHAMENTO_FASE1.md`

### Execução da correção (2026-08-23)

Branch reconciliada com `origin/main` por merge — sem rebase, sem force, sem reescrita de histórico. Conflito só em `estado.md`, resolvido pela versão da `main`. Implementação da 001F preservada.

Entregue:

- predicado temporal da §3 em `src/lib/auth/recovery.ts` e `src/lib/auth/session.ts` — `otp`/`recovery` recente (≤ 15 min, skew ≤ 60 s), sem `password`, `sub` e `email` obrigatórios;
- `signOut({ scope: "global" })` explícito em `resetPasswordAction`, com retorno tratado e mensagem própria quando falha;
- classificação do link de recovery extraída para `scripts/lib/recovery-link.mjs`, com testes;
- smoke ampliado: recência do AMR, revogação do refresh anterior e diagnóstico de link.

Medido contra o projeto hospedado, não presumido:

- `amr` chega como `{method, timestamp}`, com **timestamp em segundos**;
- relógio do Auth 0,6 s adiantado — o skew de 60 s existe por isso;
- `signOut({scope:"global"})` sem erro e refresh anterior recusado (**HTTP 400**). Critério de parada §5.4 **não** acionado.

### E2E real — APROVADO

`npm run smoke:recovery` com e-mail real, executado pelo fundador em terminal interativo: **40/40 provas**.

Verificação independente pelo executor via MCP `query_logs` sobre `auth_logs` (15:11–15:15Z): `/recover`×3 (200) → `/verify` → `/user` → `/logout` → `login` → `/verify` (reuso) → `DELETE /admin/users/…`. A ordem confirma confirmação SSR, troca de senha, logout global, login com a nova senha, link de uso único e remoção da fixture.

Identidade de teste removida; `auth.users` contém apenas a conta real do fundador.

Gates: lint (0 warnings), typecheck, `vitest run` (20 arquivos / **357** testes) e build — verdes. Sem migration, sem DDL. Migration history permanece em 5, última `20260823111051`. Advisor só com o WARN conhecido.

### Substituição do SMTP de desenvolvimento

O SMTP provisório de desenvolvimento deixa de ser **Brevo Free** e passa a ser **Gmail SMTP** (`smtp.gmail.com`, App Password de conta Gmail pessoal, sem click tracking). Nenhum segredo SMTP foi solicitado, exibido ou versionado.

Causa raiz que forçou a troca: desde **2026-06-03**, projetos free criados após essa data e usando o provider de e-mail nativo do Supabase **não podem customizar templates de auth**. Este projeto foi criado em **2026-08-22T18:59:34Z**, em org free (`zksyfyxfokixzlzxuubr`, "Trafego Pago"). Com o provider nativo, o envio usa `{{ .ConfirmationURL }}` e o link SSR da 001F nunca chega, por mais correto que esteja o template no Dashboard.

Referência: <https://supabase.com/changelog/46599-changes-to-email-template-customisation-on-free-tier>

Enquadramento no mandato: a 001F l.214 exige a prova "através do SMTP de desenvolvimento configurado" e l.313 exclui apenas "domínio/SMTP **de produção**". É substituição de baseline, não ampliação de escopo.

### Pendência aberta

**Fundador, após auditoria e promoção da 001F:** revogar a App Password do Gmail em `myaccount.google.com/apppasswords`. Ela concede envio pela conta Gmail usada e existe apenas para o E2E desta rodada.

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

## 7. Gate humano do template Recovery hosted

**Cumprido pelo fundador em 2026-08-23; verificação técnica ainda pendente no E2E final.**

O template hospedado foi informado como atualizado no Supabase em **Reset Password / Recovery** usando o conteúdo versionado em:

`supabase/templates/recovery.html`

Link esperado no e-mail real:

`{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery`

Sem `next`.

Claude deve verificar isso empiricamente no smoke final. Se o e-mail real não vier nesse formato, parar e reportar; não usar `supabase config push` nem contornar com link administrativo.

Nenhum segredo SMTP deve ser solicitado ou exposto.

## 8. Próxima ação autorizada

A execução da Correção 001F-01 está **concluída**. Cumprido pelo executor:

- branch reconciliada com a `main` sem perder a implementação entregue;
- guard de recovery no predicado temporal autorizado;
- logout global explícito, com retorno tratado e efeito provado;
- testes, smoke e comentários atualizados;
- smoke final com e-mail real — 40/40, executado pelo fundador no terminal;
- template hosted efetivo verificado no e-mail real (link SSR com `type=recovery`);
- zero migration/DDL;
- harmonização MVP/roadmap preservada;
- gates locais e CI;
- relatório e `estado.md` atualizados.

Nenhuma URL de recovery contendo `token_hash` foi registrada em relatório, Git ou documentação.

**A próxima ação é do GPT: auditar independentemente a 001F com a Correção 001F-01 e decidir sobre promoção e sobre o encerramento da Fase 1.**

Claude não aprova, não promove, não declara fase encerrada e não inicia Fase 2.

## 9. Baseline e riscos conhecidos

1. `auth_leaked_password_protection` permanece desabilitado: hardening obrigatório antes de clientes reais/produção e recurso Pro+ conforme documentação vigente.
2. Gmail SMTP é o SMTP provisório de desenvolvimento (substituiu o Brevo Free em 2026-08-23). Inadequado para produção; App Password a revogar após a promoção da 001F.
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
