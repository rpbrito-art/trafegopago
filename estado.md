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

Status: **001F EXECUTADA COM CORREÇÕES 001F-01 E 001F-02 — CANDIDATA A FECHAMENTO DA FASE 1 — AGUARDANDO REAUDITORIA GPT**.

Claude não aprova, não promove e não declara a Fase 1 encerrada.

Mandato original:

`rodadas/gpt/RODADA_001F_RECOVERY_FECHAMENTO_FASE1.md`

Correções vigentes:

- `rodadas/gpt/CORRECAO_001F_01_AMR_RECOVERY_PROVIDER_REAL.md`
- `rodadas/gpt/CORRECAO_001F_02_ANTI_ENUMERACAO_AMR_FAIL_CLOSED.md`

Branch existente:

`claude/rodada-001f-recovery-fechamento-fase1`

PR #7: **draft, não promover**.

Head entregue e auditado antes da 001F-02:

`1fcb8c6fbeaee755a034d1ca195b6625e758fe5e`

Relatório atualizado:

`rodadas/claude/RELATORIO_RODADA_001F_RECOVERY_FECHAMENTO_FASE1.md`

### Execução da Correção 001F-02 (2026-08-23)

Branch reconciliada com `origin/main` por merge — sem rebase, sem force, sem reescrita. Conflito só em `estado.md`, resolvido pela versão da `main`. Governança nova (`PROJECT_PROMPT`, `ACTIVE_DOCS`, `DOCUMENTATION_LIFECYCLE`) incorporada.

**Bloqueio A — anti-enumeração:** `requestPasswordResetAction` deixou de ramificar a resposta em `429` e `5xx`. Passada a validação sintática, o retorno do provider é ignorado e a resposta é sempre `{ requested: true }`. Custo assumido e documentado em código: indisponibilidade real do Auth fica silenciosa para o usuário (001F-02 §2.2). Nenhum rate limiter, CAPTCHA, tabela ou fila introduzido.

**Bloqueio B — AMR fail-closed:** `readAmrEntries()` passou a devolver `null` para o claim inteiro quando qualquer entrada é estruturalmente inválida, quando não é array ou quando é array vazio; `grantsPasswordReset` nega nesse caso. Entrada bem formada sem timestamp continua recusada pela exigência de recência, não pelo parser. Residual da 001F-01 §3.1 não ampliado; nenhum marcador/cookie/tabela/hook novo.

**Contradição documental:** resolvida pela reconciliação — o `estado.md` da branch passou a ser o da `main`, sem a frase antiga sobre verificação de template pendente.

Provas do delta: resposta idêntica em 8 desfechos do provider (sucesso, `user_not_found`, `email_not_confirmed`, `validation_failed`, `429` com e sem code, `500`, `503`), com o conjunto de respostas serializadas de cardinalidade **1**; AMR misto com entrada malformada nega em ambas as ordens; `password` ao lado de `otp` recente nega; método adicional bem formado autoriza; `otp` sem timestamp nega.

Gates: lint (0 warnings), typecheck, `vitest run` (20 arquivos / **372** testes, eram 357) e build — verdes. Read-only no projeto: migrations continuam em **5** (última `20260823111051`), `auth.users` com 1 conta real e **zero** fixture residual.

**E2E de e-mail real não repetido**, conforme 001F-02 §1 e §5. Nenhuma configuração remota alterada e nenhuma ação manual pedida ao fundador.

O estado promovido continua **000–001E**. A 001F não foi aprovada nem incorporada.

Nenhuma Fase 2 ou rodada posterior está autorizada.

## 5. O que a auditoria independente confirmou

A entrega 001F passou em grande parte e o E2E real **não precisa ser repetido** nesta correção:

- E2E real com e-mail: **40/40 provas**, já executado pelo fundador;
- logs do Auth hospedado confirmam pedido de recovery, `verify`, troca de senha, logout global, login com senha nova, reuso recusado e remoção da fixture;
- template hospedado efetivo chegou no formato SSR esperado com `type=recovery`;
- Gmail SMTP funcionou como SMTP provisório de desenvolvimento;
- `auth.users` voltou a apenas 1 conta real;
- exatamente 5 migrations; zero migration/DDL da 001F;
- Security Advisor permanece apenas com o WARN conhecido `auth_leaked_password_protection`;
- RLS/grants/baseline da fundação preservados;
- CI do head entregue estava verde;
- harmonização MVP/roadmap compatível com `GROWTH_INTELLIGENCE_CANONICAL.md`.

A correção upstream de `signOut` local já está incluída na versão usada do SDK (`@supabase/supabase-js 2.112.3`); não há ação adicional autorizada nesse ponto.

## 6. Bloqueios encontrados na auditoria

### 6.1 Anti-enumeração no pedido de recovery

A aplicação diferencia publicamente `429/rate limit` no pedido de recuperação.

No Supabase Auth atual, e-mail inexistente retorna `200` antes de entrar no envio; conta existente passa pelo controle de frequência e pode retornar `429`. Portanto, repetir pedidos pode permitir distinguir se uma conta existe.

A 001F-02 exige resposta pública idêntica depois que o e-mail passou pela validação sintática, inclusive para sucesso, usuário inexistente, rate limit e erro do provider.

### 6.2 AMR parcialmente malformado

O parser atual descarta entradas malformadas de `amr` e preserva as válidas. Isso pode fazer um claim misto continuar autorizável, embora a 001F-01 tenha exigido `amr` bem formado.

A 001F-02 exige falha fechada: entrada estruturalmente inválida torna o claim inteiro não autorizável.

### 6.3 Reconciliação/documentação

No momento da auditoria, a branch estava 3 commits atrás da `main`, apenas em governança. Antes de corrigir, deve reconciliar pelo preflight obrigatório.

O `estado.md` da branch também contém uma frase antiga dizendo que a verificação técnica do template ainda está pendente, embora o E2E 40/40 já a tenha concluído. Corrigir no próximo handoff.

## 7. Infraestrutura de e-mail de desenvolvimento

O SMTP provisório de desenvolvimento é **Gmail SMTP** com App Password, substituindo Brevo e o provider nativo do Supabase.

Causa já comprovada: projetos Free novos usando o provider nativo do Supabase não aplicam templates customizados de Auth; com SMTP customizado, o template SSR funcionou e o E2E passou.

Gmail SMTP é apenas desenvolvimento, não produção.

**Após auditoria final e promoção da 001F**, o fundador deve revogar a App Password criada especificamente para este E2E. Não revogar antes da promoção final, para preservar a configuração até o fechamento.

## 8. Próxima ação autorizada

A Correção 001F-02 está **executada**. Cumprido pelo executor:

- branch reconciliada com a `main` atual;
- canal de enumeração por rate limit/erro do provider fechado;
- parser de AMR fail-closed para claim estruturalmente malformado;
- contradição documental resolvida;
- relatório atualizado;
- lint, typecheck, testes, build e CI;
- confirmação read-only de 5 migrations e ausência de fixture residual.

E2E de e-mail real não repetido, Gmail/Supabase Dashboard não tocados, nenhuma ação manual solicitada ao fundador.

**A próxima ação é do GPT: reauditar somente o delta corretivo e decidir promoção e fechamento da Fase 1.**

Claude não aprova, não promove, não declara fase encerrada e não inicia Fase 2.

## 9. Baseline e riscos conhecidos

1. `auth_leaked_password_protection` permanece desabilitado: hardening obrigatório antes de clientes reais/produção e recurso Pro+ conforme documentação vigente.
2. Gmail SMTP é provisório de desenvolvimento e inadequado para clientes reais/produção.
3. Default ACL residual de `supabase_admin` continua aceito somente enquanto `public` tiver zero objetos owned por essa role.
4. Funções futuras exigem GRANT EXECUTE explícito.
5. `SUPABASE_SECRET_KEY` nunca pode entrar no fluxo funcional de recovery, `NEXT_PUBLIC_*`, browser, logs ou respostas.
6. Access tokens revogados no servidor podem permanecer criptograficamente válidos até `exp`; refresh tokens anteriores devem permanecer revogados no contrato da 001F.
7. Habilitar magic link, phone OTP, invite ou social login exige reabrir o guard de recovery antes de promover essa capacidade.
8. Gestão avançada de membros, edição ampla, multi-org e exclusão permanecem posteriores e não bloqueiam o fechamento da Fase 1.

## 10. Gate obrigatório de produto

A 001F toca UX/onboarding e documentação de produto. Claude e GPT devem ler integralmente:

`docs/01-produto/GROWTH_INTELLIGENCE_CANONICAL.md`

A harmonização entregue não pode reintroduzir paid-first, funil rígido, formulário total obrigatório nem complexidade desnecessária ao usuário.

## 11. Continuidade

Branch/relatório/commit não significam incorporação. O estado efetivamente promovido continua 000–001E até auditoria final e promoção formal da 001F.

Descompasso documental temporário deve ser resolvido junto da próxima etapa substantiva quando não houver risco operacional.
