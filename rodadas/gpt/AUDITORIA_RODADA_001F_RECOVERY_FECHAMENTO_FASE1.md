# AUDITORIA — RODADA 001F — RECOVERY DE ACESSO + FECHAMENTO DA FASE 1

Data: 2026-08-23
Classificação: **APROVADA E PROMOVIDA — FASE 1 ENCERRADA**
Mandato: `rodadas/gpt/RODADA_001F_RECOVERY_FECHAMENTO_FASE1.md`
Correções: `CORRECAO_001F_01_AMR_RECOVERY_PROVIDER_REAL.md` e `CORRECAO_001F_02_ANTI_ENUMERACAO_AMR_FAIL_CLOSED.md`
Relatório executor: `rodadas/claude/RELATORIO_RODADA_001F_RECOVERY_FECHAMENTO_FASE1.md`
PR: #7
Head final auditado: `171516616db8ec11c80f6d9176b2b92101fe1189`
Merge: `7f2a1b9631ce134ec9f39585fa2defa3185fcd05`
CI do head final: `32649608889` — success
Supabase: `cbnxdoxpyioxjwgjhbtq`

## 1. Escopo auditado

A reauditoria verificou independentemente o delta da Correção 001F-02 e revalidou o estado final necessário para promoção:

- branch reconciliada e 0 commits atrás da `main` antes do merge;
- anti-enumeração do pedido de recovery;
- parser/guard de `amr` fail-closed;
- testes do delta;
- CI final;
- migration history e resíduos no Supabase;
- Security Advisor;
- aderência ao `GROWTH_INTELLIGENCE_CANONICAL.md`;
- preservação das provas já aceitas da 001F/001F-01.

## 2. Correção 001F-02

### Anti-enumeração

Confirmado em `requestPasswordResetAction`: depois que o e-mail passa pela validação sintática, o retorno do provider não altera mais a resposta pública. Sucesso, usuário inexistente, rate limit e falhas 4xx/5xx terminam no mesmo estado `{ requested: true }`.

Os testes cobrem oito desfechos do provider e provam resposta serializada indistinguível, sem eco de e-mail, status ou código bruto.

A consequência conhecida é deliberada: indisponibilidade real do Auth também recebe a resposta neutra; observabilidade server-side poderá ser adicionada futuramente sem reabrir o canal público.

### AMR fail-closed

Confirmado em `readAmrEntries()`/`grantsPasswordReset()`:

- `amr` precisa ser array não vazio;
- qualquer entrada estruturalmente inválida invalida o claim inteiro;
- `password` em qualquer entrada nega;
- `otp|recovery` só autoriza com timestamp utilizável e recente;
- método adicional bem formado pode coexistir;
- formato sem timestamp continua falhando fechado para a autorização temporal.

Os casos exigidos pela 001F-02 estão cobertos, inclusive entrada malformada em ambas as ordens.

## 3. Provas finais

- CI `32649608889`: install, lint, typecheck, test e build — success;
- suíte reportada no head final: 20 arquivos, **372 testes**, 0 falhas;
- E2E real de recovery preservado da prova anterior: **40/40**, com e-mail real e template hosted efetivo;
- senha antiga recusada e nova aceita;
- link de recovery one-time;
- logout global explícito e refresh token anterior recusado;
- migration history remoto: exatamente **5**, última `20260823111051`;
- `auth.users`: **1** conta real;
- `organizations`, `organization_members` e `business_profiles`: zero resíduos de prova;
- Security Advisor: somente o WARN conhecido `auth_leaked_password_protection`.

O E2E de e-mail não foi repetido na 001F-02 por determinação expressa da correção: o delta não tocou SMTP, template, `/auth/confirm`, troca de senha nem efeito remoto já provado.

## 4. Produto e escopo

`GROWTH_INTELLIGENCE_CANONICAL.md` foi lido integralmente na reauditoria.

A 001F não reintroduz paid-first, funil rígido, quantidade fixa de candidatos, confusão entre conteúdo/criativo/anúncio ou complexidade operacional nova. A harmonização de `MVP_CANONICAL.md` e `IMPLEMENTATION_ROADMAP.md` permanece compatível com a Lei da Simplicidade Guiada.

Não houve Meta/Instagram, IA, Ads, Fase 2, gestão avançada de membros ou migration/DDL fora do escopo.

## 5. Ressalvas e dívidas não bloqueantes

- `auth_leaked_password_protection` continua desabilitado e deve ser tratado antes de clientes reais/produção;
- Gmail SMTP é infraestrutura **provisória de desenvolvimento**, não de produção;
- a App Password do Gmail deve permanecer secreta e ativa enquanto esse Gmail for o SMTP configurado, pois revogá-la agora quebraria o recovery no ambiente de desenvolvimento; revogar/rotacionar quando o SMTP for substituído ou deixar de ser necessário;
- access tokens já emitidos podem permanecer válidos até `exp`, enquanto refresh tokens revogados não renovam a sessão;
- habilitar magic link, phone OTP, invite ou social login exige reabrir o guard de recovery;
- observabilidade server-side de falha no pedido de recovery pode ser adicionada futuramente sem diferenciar a resposta pública.

## 6. Decisão

**RODADA 001F APROVADA E PROMOVIDA.**

A recuperação de acesso está incorporada com e-mail real, confirmação SSR, proteção contra enumeração por resposta, guard temporal compatível com o provider real, falha fechada para `amr` malformado, troca de senha pelo próprio usuário e revogação verificável de refresh anterior.

Com a promoção da 001F, **a Fase 1 — Fundação Supabase, Auth e Tenancy está encerrada**.

A Fase 2 existe no roadmap, mas **não está autorizada automaticamente por esta auditoria**. Uma nova rodada substantiva depende de planejamento/autorização própria.