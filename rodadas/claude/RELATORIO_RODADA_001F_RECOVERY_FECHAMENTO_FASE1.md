# RELATÓRIO — RODADA 001F + CORREÇÕES 001F-01 E 001F-02 — RECOVERY DE ACESSO

Executor: Claude Code
Data: 2026-08-23
Branch: `claude/rodada-001f-recovery-fechamento-fase1`

Status: **001F EXECUTADA COM CORREÇÕES 001F-01 E 001F-02 — CANDIDATA A FECHAMENTO DA FASE 1 — AGUARDANDO REAUDITORIA GPT**

---

## 1. Preflight e reconciliação

| item | resultado |
| --- | --- |
| raiz git | `C:/Users/rpbri/Documents/trafegopago` |
| remote `origin` | `rpbrito-art/trafegopago` |
| Supabase project ref | `cbnxdoxpyioxjwgjhbtq`, org `zksyfyxfokixzlzxuubr` ("Trafego Pago"), free |
| divergência ao retomar | `origin/main` 6 à frente, branch 4 à frente |
| reconciliação | `git merge origin/main` — sem rebase, sem force, sem reescrita |
| conflito | só `estado.md`; resolvido pela versão da `main` (o GPT é dono do estado) |
| governança incorporada | `PROJECT_PROMPT.md`, `ACTIVE_DOCS.md`, `DOCUMENTATION_LIFECYCLE.md` |

READ SET da retomada 001F-02 cumprido. `GROWTH_INTELLIGENCE_CANONICAL.md` lido integralmente
e inalterado no merge.

---

## 2. Delta da Correção 001F-02

### 2.1 Bloqueio A — canal de enumeração por rate limit (fechado)

`requestPasswordResetAction` ramificava a resposta pública em `429` e em `5xx`. O texto era
neutro; o **comportamento** não era. Como o `/recover` do Supabase Auth procura o usuário antes
de enviar — inexistente volta `200` de imediato, existente entra no envio e passa pelo controle
de frequência —, repetir o pedido distinguia conta cadastrada de não cadastrada.

Agora o retorno do provider é deliberadamente ignorado: passada a validação sintática, a
resposta é sempre `{ requested: true }`.

**Custo assumido e registrado em código:** numa indisponibilidade real do Auth, quem pediu vê a
mesma confirmação e não recebe e-mail. É a troca da 001F-02 §2.2. Nenhum rate limiter próprio,
CAPTCHA, tabela ou fila foi introduzido.

### 2.2 Bloqueio B — AMR fail-closed por claim (corrigido)

`readAmrEntries()` descartava entradas malformadas e preservava as válidas, de modo que um
claim misto — `otp` recente ao lado de um item corrompido — seguia autorizando a troca de
senha. Agora o parser devolve `null` para o claim inteiro se **qualquer** entrada for
estruturalmente inválida, se não for array ou se for array vazio; `grantsPasswordReset` nega
nesse caso.

Entrada bem formada **sem** timestamp continua válida estruturalmente e é recusada onde deve:
na exigência de recência, não no parser.

### 2.3 Contradição documental

Resolvida pela própria reconciliação: o `estado.md` da branch passou a ser o da `main`, já
reescrito pelo GPT, que não contém mais a frase sobre verificação de template pendente.
Confirmado por busca — nenhuma ocorrência remanescente.

---

## 3. Predicado de autorização vigente (001F-01 §3 + 001F-02 §3)

| # | condição | onde |
| --- | --- | --- |
| 1 | claims de `getClaims()` verificado server-side | `session.ts` |
| 2 | `sub` string não vazia | `session.ts` |
| 3 | `email` string não vazia | `session.ts` |
| 4 | `amr` array não vazio, **toda** entrada estruturalmente válida | `recovery.ts` |
| 5 | entrada `recovery` **ou** `otp` presente | `recovery.ts` |
| 6 | nenhuma entrada com método `password` | `recovery.ts` |
| 7 | autorizador com timestamp utilizável, ≤ 15 min, skew futuro ≤ 60 s | `recovery.ts` |
| 8 | formulário invisível **e** Server Action negando quando 1–7 falham | `page.tsx` + `auth.ts` |

Métodos adicionais bem formados podem coexistir. O residual da 001F-01 §3.1 não foi ampliado;
nenhum marcador, cookie, tabela ou hook foi introduzido.

---

## 4. Decisões não óbvias

1. **Fail-closed por claim, não por entrada.** Sanear um claim inesperado até que ele passe é o
   oposto do contrato. Um item corrompido invalida o conjunto.
2. **`amr` sem timestamp não autoriza.** O formato RFC-8176 não declara instante, logo não prova
   recência. Se o provider migrar para ele, o guard nega e o smoke acusa.
3. **Timestamp em segundos**, medido contra o provider, não presumido.
4. **Skew de 60 s não é folga arbitrária:** o relógio do Auth veio 0,6 s adiantado na medição.
5. **`email` obrigatório só no caminho de recovery.**
6. **Falha do logout global não vira erro de formulário.** A senha já mudou; a mensagem informa
   que sessões em outros aparelhos podem seguir abertas (`GROWTH_INTELLIGENCE_CANONICAL.md` §2.2).
7. **`hasRecoveryMethod()` permanece como diagnóstico**, não como critério.

---

## 5. Provas

| prova | comando/fonte | resultado |
| --- | --- | --- |
| suíte completa | `npx vitest run` | 20 arquivos, **372** testes, 0 falhas (357 antes da 001F-02) |
| resposta idêntica em 8 desfechos do provider | `auth.test.ts` | sucesso, `user_not_found`, `email_not_confirmed`, `validation_failed`, `429` com e sem code, `500`, `503` → todos `{ requested: true }`; conjunto de respostas serializadas tem cardinalidade **1** |
| resposta não vaza e-mail/código/status | `auth.test.ts` | ausentes em todos os desfechos |
| AMR misto com entrada malformada | `recovery.test.ts` | **nega** — em ambas as ordens, para `null`, número, objeto sem `method`, `method` não-string e array aninhado |
| AMR com `password` ao lado de `otp` recente | `recovery.test.ts` | **nega** |
| AMR com método adicional bem formado | `recovery.test.ts` | **autoriza** |
| `otp` sem timestamp utilizável | `recovery.test.ts` | **nega** |
| lint | `npm run lint` | limpo, 0 warnings |
| typecheck | `npm run typecheck` | limpo |
| build | `npm run build` | ok |
| migrations (read-only) | MCP `execute_sql` | **5**, última `20260823111051` |
| fixture residual (read-only) | MCP `execute_sql` | `auth.users` = 1 conta real, **0** fixtures |
| tenancy intacta | MCP `execute_sql` | organizations/members/business_profiles = 0 |
| segredo no diff | busca do valor de `SUPABASE_SECRET_KEY` | ausente |

**E2E de e-mail real: não repetido**, conforme 001F-02 §1 e §5 — os bloqueios corrigidos não
tocam SMTP, template, `/auth/confirm`, troca de senha nem efeito remoto. O resultado válido
continua sendo o de 40/40 já auditado.

---

## 6. Provas anteriores que permanecem válidas

Da 001F e da 001F-01, confirmadas pela auditoria GPT e não refeitas aqui: E2E real 40/40;
sequência nos logs de Auth (`/recover` → `/verify` → `/user` → `/logout` → `login` → `/verify`
reuso → `DELETE /admin/users`); template hosted efetivo em formato SSR com `type=recovery`;
`amr` como `{method, timestamp}` em segundos; logout global sem erro e refresh anterior recusado
(HTTP 400); Advisor apenas com `auth_leaked_password_protection`.

---

## 7. Configuração remota

**Nenhuma alteração.** Nada tocado em Gmail, SMTP, Dashboard ou Supabase além de leituras. Zero
migration, zero DDL. Nenhuma ação manual foi pedida ao fundador nesta correção.

---

## 8. Branch

`claude/rodada-001f-recovery-fechamento-fase1`, reconciliada com `origin/main`. Sem merge na
`main`, sem force push, sem reescrita de histórico. PR #7 segue draft.

---

## 9. Pendências e riscos

1. **Revogar a App Password do Gmail** em `myaccount.google.com/apppasswords` — somente **após**
   a promoção final da 001F, para não derrubar a configuração antes do fechamento.
2. Gmail SMTP é desenvolvimento, não produção.
3. Indisponibilidade do Auth no pedido de recovery é silenciosa para o usuário — consequência
   deliberada da 001F-02 §2.2. Se em fase futura isso passar a incomodar, a saída é observabilidade
   server-side, não mensagem pública diferenciada.
4. Se o provider migrar `amr` para o formato sem timestamp, o recovery para de autorizar (falha
   fechada por decisão) — o smoke detecta.
5. Habilitar magic link, phone OTP, invite ou social login exige reabrir o guard antes.
6. Access token já emitido pode seguir válido até `exp`.
7. `auth_leaked_password_protection` desabilitado (recurso Pro+).
8. Falha técnica em `/conta` não é registrada em log — não há redator de logs no projeto.

---

## 10. Conclusão

Os dois bloqueios da auditoria foram fechados no ponto exato apontado, sem ampliar escopo,
sem infraestrutura nova e sem repetir o E2E já provado. A anti-enumeração deixou de depender do
texto da mensagem e passou a valer no comportamento observável, com prova de que as respostas
são indistinguíveis entre si. O parser de AMR passou a negar claim estruturalmente inesperado
em vez de saneá-lo. A governança mais nova foi incorporada pela reconciliação e a contradição
documental desapareceu com ela.

`001F EXECUTADA COM CORREÇÕES 001F-01 E 001F-02 — CANDIDATA A FECHAMENTO DA FASE 1 — AGUARDANDO REAUDITORIA GPT`
