# RELATÓRIO — RODADA 001F + CORREÇÃO 001F-01 — RECOVERY DE ACESSO

Executor: Claude Code
Data: 2026-08-23
Branch: `claude/rodada-001f-recovery-fechamento-fase1`

Status entregue: **001F EXECUTADA COM CORREÇÃO 001F-01 — E2E REAL APROVADO (40/40) — AGUARDANDO AUDITORIA GPT**

---

## 1. Preflight e reconciliação

| item | resultado |
| --- | --- |
| raiz git | `C:/Users/rpbri/Documents/trafegopago` |
| remote `origin` | `rpbrito-art/trafegopago` |
| Supabase project ref | `cbnxdoxpyioxjwgjhbtq`, org `zksyfyxfokixzlzxuubr` ("Trafego Pago"), plano free |
| reconciliação | `git merge origin/main` — sem rebase, sem force, sem reescrita |
| conflito | só `estado.md`; resolvido pela versão da `main` |
| implementação 001F | preservada integralmente |

READ SET cumprido, incluindo leitura integral de `GROWTH_INTELLIGENCE_CANONICAL.md` e da
Correção 001F-01.

---

## 2. Arquivos alterados na retomada

- `src/lib/auth/recovery.ts` — predicado temporal (reescrito);
- `src/lib/auth/session.ts` — `getRecoveryUser` exige `email` não vazio; tipo `RecoveryUser`;
- `src/lib/auth/errors.ts` — nova `PASSWORD_CHANGED_SESSIONS_KEPT`;
- `src/app/actions/auth.ts` — `signOut({ scope: "global" })` explícito, retorno tratado;
- `scripts/lib/recovery-link.mjs` + teste — classificação do link recebido (novo);
- `scripts/recovery-001f.mjs` — provas de recência, revogação e diagnóstico de link;
- `vitest.config.mts` — inclui `scripts/**/*.test.mjs`;
- comentários em `src/lib/auth/routes.ts` e `src/app/(auth)/redefinir-senha/page.tsx`;
- testes: `recovery`, `session`, `auth`, `routes`, `recovery-link`.

Zero migration, zero DDL, zero mudança de schema/RLS/grants. Harmonização MVP/roadmap da
001F preservada sem reedição.

---

## 3. Predicado implementado (Correção 001F-01 §3)

| # | condição | onde |
| --- | --- | --- |
| 1 | claims de `getClaims()` verificado server-side | `session.ts` |
| 2 | `sub` string não vazia | `session.ts` |
| 3 | `email` string não vazia | `session.ts` |
| 4 | `amr` bem formado com entrada `recovery` **ou** `otp` | `recovery.ts` |
| 5 | nenhuma entrada com método `password` | `recovery.ts` |
| 6 | entrada autorizadora com timestamp válido, ≤ 15 min, skew futuro ≤ 60 s | `recovery.ts` |
| 7 | formulário invisível **e** Server Action negando quando 1–6 falham | `page.tsx` + `auth.ts` |

Residual da §3.1 documentado em `recovery.ts`, com a instrução de reabrir o guard antes de
habilitar magic link, phone OTP, invite ou social login.

---

## 4. Decisões não óbvias

1. **`amr` sem timestamp não autoriza.** O formato RFC-8176 não declara instante, logo não
   prova recência. Se o provider migrar para ele, o guard **nega** em vez de abrir janela
   indefinida. Falha fechada, coberta por teste.
2. **Timestamp em segundos**, medido contra o provider e não presumido (§5).
3. **Skew de 60 s não é folga arbitrária:** o relógio do Auth veio 0,6 s adiantado na
   medição. Sem tolerância, um link recém-usado cairia como "timestamp no futuro".
4. **`email` obrigatório só no caminho de recovery.** `getVerifiedUser` segue tolerando a
   claim ausente; quem troca senha sem informar a atual, não.
5. **Falha do logout global não vira erro de formulário.** A senha já mudou — repetir o erro
   sugeriria que nada aconteceu. A mensagem diz o ocorrido, a consequência (sessões em outros
   aparelhos podem seguir abertas) e o que fazer. Calar violaria
   `GROWTH_INTELLIGENCE_CANONICAL.md` §2.2.
6. **`hasRecoveryMethod()` sobrevive como diagnóstico**, não como critério.

---

## 5. Provas

| prova | comando/fonte | resultado |
| --- | --- | --- |
| **E2E real com e-mail real** | `npm run smoke:recovery`, executado pelo fundador em terminal interativo | **40/40 provas** |
| verificação independente do E2E | MCP `query_logs` sobre `auth_logs`, janela 15:11–15:15Z | `/recover`×3 (200) → `/verify` → `/user` → `/logout` → `login` → `/verify` (reuso) → `DELETE /admin/users/…` |
| suíte completa | `npx vitest run` | 20 arquivos, **357** testes, 0 falhas (eram 319) |
| lint | `npm run lint` | limpo, 0 warnings |
| typecheck | `npm run typecheck` | limpo |
| build | `npm run build` | ok |
| formato real do `amr` | ensaio contra o Auth hospedado | `[{"method":"password","timestamp":1787491229}]` |
| unidade do timestamp | mesmo ensaio | **segundos** (leitura como ms daria ~56 anos) |
| `signOut({scope:"global"})` | ensaio isolado | sem erro; refresh anterior recusado (HTTP 400) |
| critério de parada §5.4 | consequência do anterior + E2E | **não acionado** |
| zero resíduo | `auth.users` após o E2E | 1 usuário — a conta real do fundador |
| migration history | MCP `list_migrations` | 5, última `20260823111051` — inalterada |
| Advisor security | MCP `get_advisors` | só `auth_leaked_password_protection` (baseline) |
| segredo no diff | busca do valor de `SUPABASE_SECRET_KEY` | ausente |

**Atribuição:** o E2E exige colar no terminal a URL de um e-mail real e não pode ser
executado pelo executor. Foi rodado pelo fundador; a verificação independente acima é minha
e confirma a sequência de endpoints no próprio Auth do projeto.

### 5.1 Divergência com a medição da 001F

A correção §5 parte de que `updateUser({ password })` sozinho não revogava a sessão anterior.
No ensaio isolado, revogou. Não afirmo a causa: usar um refresh token o rotaciona, e uma
verificação prévia contamina a medição seguinte — o ensaio da 001F não isolava isso. O que a
correção exige está provado: após o logout global, o refresh anterior é recusado.

---

## 6. Infraestrutura de e-mail — causa raiz e substituição

O E2E ficou bloqueado por dois envios até a causa ser isolada:

| envio | SMTP | link recebido | leitura |
| --- | --- | --- | --- |
| ~10:37 | Brevo | `localhost:3000/auth/confirm?…&type=email` | template customizado **aplicado**, conteúdo errado no slot |
| 11:43 | nativo Supabase | `…supabase.co/auth/v1/verify?…` | template customizado **ignorado** |
| ~15:12 | Gmail SMTP | `localhost:3000/auth/confirm?…&type=recovery` | correto — E2E passou |

**Causa raiz:** desde **2026-06-03**, projetos free criados após essa data e usando o provider
de e-mail nativo do Supabase não podem customizar templates de auth. Este projeto foi criado
em **2026-08-22T18:59:34Z**, em org free. Com o provider nativo, o envio usa o template padrão
(`{{ .ConfirmationURL }}`) por mais correto que esteja o Dashboard.

Fonte: <https://supabase.com/changelog/46599-changes-to-email-template-customisation-on-free-tier>

**Substituição registrada:** o SMTP provisório de desenvolvimento deixa de ser Brevo Free e
passa a ser **Gmail SMTP** (`smtp.gmail.com`, autenticação por App Password de conta Gmail
pessoal, sem click tracking). Enquadramento no mandato: a 001F l.214 exige a prova "através do
SMTP de desenvolvimento configurado" e l.313 exclui apenas "domínio/SMTP **de produção**";
`estado.md` registrava o Brevo como item de baseline. É substituição de baseline, não ampliação
de escopo. Nenhum segredo SMTP foi solicitado, exibido ou versionado.

O sucesso do E2E é, em si, prova de que o SMTP customizado estava ativo: o link SSR só existe
no template versionado, que este projeto só aplica com SMTP próprio.

---

## 7. Correções no instrumento de prova

O smoke acusou três defeitos próprios, todos corrigidos:

1. **Falso positivo de sessão.** `temSessao()` contava o *code verifier* do PKCE como sessão.
   Agora ignora só cookies terminados em `code-verifier`, e há prova empírica de que eles não
   abrem `/conta`. Isso também eliminava um falso **negativo** adiante, pois o verifier
   sobrevive ao logout.
2. **Falso alarme de §5.4.** O script anunciava "logout global sem efeito" mesmo quando a troca
   de senha nem ocorrera. Agora essa prova só é avaliada se a troca aconteceu.
3. **Classificação errada do link.** A checagem comparava o host apenas com o da aplicação, de
   modo que o domínio do **próprio projeto Supabase** era acusado de rastreador. A lógica foi
   extraída para `scripts/lib/recovery-link.mjs` e coberta por 8 testes, distinguindo link SSR,
   ConfirmationURL nativa e rastreador de terceiro — com comparação por igualdade exata de
   host, nunca por sufixo.

---

## 8. Branch

`claude/rodada-001f-recovery-fechamento-fase1`, reconciliada com `origin/main`. Sem merge na
`main`, sem force push, sem reescrita de histórico.

---

## 9. Pendências e riscos

1. **Revogar a App Password do Gmail** em `myaccount.google.com/apppasswords` após auditoria e
   promoção da 001F. Ela concede envio pela conta Gmail usada.
2. Gmail SMTP é **desenvolvimento**, não produção: limites de envio e reputação de remetente o
   tornam inadequado para clientes reais.
3. Se o provider migrar `amr` para o formato sem timestamp, o recovery para de autorizar
   (falha fechada por decisão) — o smoke detecta.
4. Habilitar magic link, phone OTP, invite ou social login exige reabrir o guard antes
   (correção §3.1).
5. Access token já emitido pode seguir válido até `exp` — propriedade conhecida do Supabase.
6. `auth_leaked_password_protection` desabilitado (recurso Pro+).
7. Falha técnica em `/conta` não é registrada em log — não há redator de logs no projeto.

---

## 10. Conclusão

O predicado da Correção 001F-01 §3 está implementado com as seis condições verificadas
server-side e a sétima duplicada entre página e Server Action. O logout global é explícito e
seu retorno é tratado. Formato, unidade e recência do `amr` foram medidos contra o provider,
não deduzidos de documentação. O fluxo completo — pedido sem enumeração, e-mail real, template
hosted efetivo, confirmação SSR, troca de senha, senha antiga invalidada, link de uso único e
revogação do refresh anterior — foi exercitado ponta a ponta e aprovado em 40/40 provas, com a
sequência confirmada de forma independente nos logs de Auth do projeto.

`001F EXECUTADA COM CORREÇÃO 001F-01 — CANDIDATA A FECHAMENTO DA FASE 1 — AGUARDANDO AUDITORIA GPT`
