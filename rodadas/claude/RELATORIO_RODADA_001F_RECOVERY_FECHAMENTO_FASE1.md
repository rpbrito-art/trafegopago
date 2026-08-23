# RELATÓRIO — RODADA 001F + CORREÇÃO 001F-01 — RECOVERY DE ACESSO

Executor: Claude Code
Data: 2026-08-23 (001F) / retomada com a Correção 001F-01
Branch: `claude/rodada-001f-recovery-fechamento-fase1`

Status entregue: **CORREÇÃO 001F-01 IMPLEMENTADA — E2E COM E-MAIL REAL NÃO EXECUTADO (gate humano) — AGUARDANDO AUDITORIA GPT**

**Não declaro a Fase 1 candidata a fechamento:** o critério §7 da correção exige
o E2E com e-mail real, que não pode ser executado pelo executor (§7 abaixo).

---

## 1. Preflight e reconciliação

| item | resultado |
| --- | --- |
| raiz git | `C:/Users/rpbri/Documents/trafegopago` |
| remote `origin` | `rpbrito-art/trafegopago` |
| Supabase project ref | `cbnxdoxpyioxjwgjhbtq` (`supabase/.temp/project-ref` e host do `.env.local`) |
| divergência inicial | `origin/main` 6 commits à frente, branch 1 à frente |
| reconciliação | `git merge origin/main` — sem rebase, sem force |
| conflito | só `estado.md`; resolvido pela versão da `main`, que já incorpora os fatos de execução da branch |
| implementação preservada | 31 arquivos da 001F intactos no diff `origin/main..HEAD` |

READ SET cumprido, incluindo leitura integral de `GROWTH_INTELLIGENCE_CANONICAL.md`
e da Correção 001F-01.

---

## 2. Arquivos alterados nesta retomada

- `src/lib/auth/recovery.ts` — predicado temporal (reescrito);
- `src/lib/auth/session.ts` — `getRecoveryUser` exige `email` não vazio; novo tipo `RecoveryUser`;
- `src/lib/auth/errors.ts` — nova `PASSWORD_CHANGED_SESSIONS_KEPT`;
- `src/app/actions/auth.ts` — `signOut({ scope: "global" })` explícito, retorno tratado;
- `scripts/recovery-001f.mjs` — provas de recência do AMR e de revogação do refresh anterior;
- comentários corrigidos em `src/lib/auth/routes.ts` e `src/app/(auth)/redefinir-senha/page.tsx`;
- testes: `recovery.test.ts`, `session.test.ts`, `auth.test.ts`, `routes.test.ts`.

Zero migration, zero DDL, zero mudança de schema/RLS/grants. Harmonização
MVP/roadmap da 001F preservada sem reedição.

---

## 3. Decisões não óbvias

1. **`amr` sem timestamp não autoriza.** O formato RFC-8176 (lista de strings)
   não declara instante, logo não prova recência. Se o provider migrar para ele,
   o guard **nega** em vez de abrir janela indefinida — e o smoke acusa. Falha
   fechada, coberta por teste.
2. **Timestamp interpretado como segundos**, medido e não presumido (§5).
3. **Skew de 60 s não é folga arbitrária:** o relógio do Auth veio 0,6 s
   adiantado na medição. Sem tolerância, um link recém-usado cairia como
   "timestamp no futuro".
4. **`email` obrigatório só no caminho de recovery.** `getVerifiedUser` continua
   tolerando a claim ausente; quem troca senha sem informar a atual, não.
5. **Falha do logout global não vira erro de formulário.** A senha já mudou —
   repetir o erro sugeriria que nada aconteceu. A mensagem diz o que ocorreu, a
   consequência (sessões em outros aparelhos podem seguir abertas) e o que
   fazer. Calar violaria `GROWTH_INTELLIGENCE_CANONICAL.md` §2.2.
6. **`hasRecoveryMethod()` sobrevive como diagnóstico**, não como critério, para
   manter mensurável a diferença entre o que o Supabase documenta e o que emite.

---

## 4. Predicado implementado (Correção 001F-01 §3)

Autoriza a nova senha somente quando **todas** valem:

| # | condição | onde |
| --- | --- | --- |
| 1 | claims de `getClaims()` verificado server-side | `session.ts` |
| 2 | `sub` string não vazia | `session.ts` |
| 3 | `email` string não vazia | `session.ts` |
| 4 | `amr` bem formado com entrada `recovery` **ou** `otp` | `recovery.ts` |
| 5 | nenhuma entrada com método `password` | `recovery.ts` |
| 6 | entrada autorizadora com timestamp válido, ≤ 15 min, skew futuro ≤ 60 s | `recovery.ts` |
| 7 | formulário invisível **e** Server Action negando quando 1–6 falham | `page.tsx` + `auth.ts` |

O residual aceito pela §3.1 — sessão recente de outro OTP por e-mail — está
documentado em `recovery.ts`, junto da instrução de reabrir o guard antes de
habilitar magic link, phone OTP, invite ou social login.

---

## 5. Provas

| prova | comando/fonte | resultado |
| --- | --- | --- |
| suíte completa | `npx vitest run` | 19 arquivos, **349** testes, 0 falhas (eram 319) |
| lint | `npm run lint` | limpo, 0 warnings |
| typecheck | `npm run typecheck` | limpo |
| build | `npm run build` | ok; `/redefinir-senha` dinâmica |
| formato real do `amr` | ensaio direto contra o Auth hospedado | `[{"method":"password","timestamp":1787491229}]` |
| unidade do timestamp | mesmo ensaio | **segundos** — idade −0,6 s; leitura como ms daria ~56 anos |
| claim `email` presente | mesmo ensaio | sim |
| `signOut({scope:"global"})` retorna erro? | ensaio isolado | não |
| refresh da sessão anterior após logout global | `POST /auth/v1/token?grant_type=refresh_token` | **HTTP 400 — revogado** |
| critério de parada §5.4 | consequência do anterior | **não acionado** |
| migration history | MCP `list_migrations` | 5, última `20260823111051` — inalterada |
| Advisor security | MCP `get_advisors` | só `auth_leaked_password_protection` (WARN de baseline) |
| E2E com e-mail real | `npm run smoke:recovery` | **NÃO EXECUTADO** — ver §7 |

Os ensaios criam e apagam a própria identidade de teste; nenhuma chave, token ou
endereço foi impresso. Zero fixtures remanescentes.

### 5.1 Divergência com a medição da 001F

A correção §5 parte de que "`updateUser({ password })` sozinho não revogou uma
sessão anterior". No ensaio isolado de agora, **revogou** (HTTP 400 já antes do
`signOut`). Não afirmo a causa: usar um refresh token o rotaciona, e uma
verificação prévia contamina a medição seguinte — o ensaio da 001F não isolava
isso. Provado está o que a correção exige: **depois** do logout global, o refresh
anterior é recusado. O E2E no fluxo real é a prova que vale.

---

## 6. Configuração remota

Nada aplicado pelo executor. `supabase config push` segue não usado: empurraria
todo o `config.toml` local (`site_url = http://localhost:3000`, sem SMTP) sobre o
projeto hospedado.

O fundador informou em 2026-08-23 ter atualizado o template **Reset Password /
Recovery** com o conteúdo de `supabase/templates/recovery.html`. **Isso ainda não
está verificado tecnicamente** — o smoke prova o link efetivo do e-mail real e é
o único caminho aceito.

---

## 7. Gate humano — uma solicitação

O E2E da §7 da correção depende de abrir uma caixa de entrada real e colar a URL
do link no processo. Não há caminho para o executor fazer isso. Todas as
verificações não destrutivas possíveis foram concluídas antes de pedir.

Com a aplicação de pé (`npm run dev`):

    RECOVERY_TEST_EMAIL=<caixa real de teste> npm run smoke:recovery

O script cria e apaga a identidade de teste, para uma vez para receber a URL por
stdin — o token nunca é impresso nem gravado — e imprime a tabela de provas:
template hosted efetivo, recência do AMR, senha antiga/nova, link one-time e
revogação do refresh anterior.

Se o link não chegar como
`{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery` sem
`next`, o script acusa e a correção §6 manda parar — não contornar.

---

## 8. Branch

`claude/rodada-001f-recovery-fechamento-fase1`, reconciliada com `origin/main`.
Sem merge na `main`, sem force push, sem reescrita de histórico.

---

## 9. Pendências e riscos

Bloqueante para o fechamento:

1. E2E com e-mail real (§7) — gate humano.

Registrar:

2. se o provider migrar `amr` para o formato sem timestamp, o recovery para de
   autorizar (falha fechada por decisão) — o smoke detecta;
3. habilitar magic link, phone OTP, invite ou social login exige reabrir o guard
   antes (correção §3.1);
4. access token já emitido pode seguir válido até `exp` — propriedade conhecida
   do Supabase, não falha desta rodada;
5. `auth_leaked_password_protection` desabilitado (recurso Pro+);
6. Brevo Free segue como SMTP de desenvolvimento;
7. falha técnica em `/conta` não é registrada em log — não há redator de logs no
   projeto, e log cru poderia arrastar dado sensível.

---

## 10. Conclusão

O predicado da Correção 001F-01 §3 está implementado com as seis condições
verificadas server-side e a sétima duplicada entre página e Server Action. O
logout global é explícito, seu retorno é tratado, e sua eficácia sobre o refresh
token anterior foi medida contra o provider — não deduzida da documentação. O
formato e a unidade do `amr` foram medidos, porque o predicado temporal depende
deles. Gates locais verdes, migration history intacta, advisor sem regressão.

Falta a prova que só um humano com caixa de entrada pode produzir. Por isso
**não** declaro o critério §10 da correção atendido.

`001F COM CORREÇÃO 001F-01 IMPLEMENTADA — E2E REAL PENDENTE DE GATE HUMANO — AGUARDANDO AUDITORIA GPT`
