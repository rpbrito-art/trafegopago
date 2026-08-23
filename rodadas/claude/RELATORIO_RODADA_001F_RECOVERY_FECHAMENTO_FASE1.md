# RELATÓRIO — RODADA 001F — RECOVERY DE ACESSO + FECHAMENTO DA FASE 1

Executor: Claude Code
Data: 2026-08-23
Branch: `claude/rodada-001f-recovery-fechamento-fase1`

Status entregue: **EXECUTADA PARCIALMENTE — BLOQUEADA NO CRITÉRIO §11.2 — AGUARDANDO DECISÃO E AUDITORIA GPT**

**Não é candidata a fechamento da Fase 1.** O motivo está na §4 e é o eixo desta entrega.

---

## 1. Preflight

| item | resultado |
| --- | --- |
| raiz git | `C:/Users/rpbri/Documents/trafegopago` |
| remote `origin` | `rpbrito-art/trafegopago` |
| working tree inicial | limpa, `main` sincronizada com `origin/main` |
| Supabase project ref | `cbnxdoxpyioxjwgjhbtq` (`supabase/.temp/project-ref`), linked |
| migration history | 5 migrations, última `20260823111051` — inalterada |
| Advisor security | somente `auth_leaked_password_protection` (WARN conhecido) |

READ SET cumprido, incluindo leitura integral de `GROWTH_INTELLIGENCE_CANONICAL.md`.

---

## 2. Arquivos alterados

Novos: `src/lib/auth/recovery.ts`, `src/app/(auth)/recuperar-senha/page.tsx`,
`src/app/(auth)/redefinir-senha/page.tsx`,
`src/components/auth/forgot-password-form.tsx`,
`src/components/auth/reset-password-form.tsx`, `supabase/templates/recovery.html`,
`scripts/recovery-001f.mjs`, mais os testes `recovery.test.ts` e
`(auth)/redefinir-senha/page.test.tsx`.

Alterados: `src/lib/auth/{routes,otp,schemas,errors,session}.ts`,
`src/app/actions/auth.ts`, `src/app/(auth)/entrar/page.tsx`,
`src/lib/business/account.ts`, `src/components/business/business-section.tsx`,
`supabase/config.toml`, `package.json`, os testes correspondentes,
`docs/01-produto/MVP_CANONICAL.md`, `docs/00-governanca/IMPLEMENTATION_ROADMAP.md`.

Zero migration, zero DDL, zero mudança de schema/RLS/grants.

---

## 3. Decisões não óbvias

1. **Destino de recovery não é negociável.** `parseConfirmRequest` descarta
   `next` quando `type=recovery` e devolve `RECOVERY_DESTINATION`. O template
   nem sequer emite `next`. `/redefinir-senha` foi deliberadamente **deixado
   fora** de `ALLOWED_REDIRECT_PATHS`, para que nenhum outro fluxo consiga
   despejar sessão nessa rota. Há teste para os três fatos.
2. **`/redefinir-senha` fora de `PROTECTED_PREFIXES` e de `AUTH_ENTRY_PATHS`.**
   Como entrada de auth, o Proxy expulsaria para `/conta` a própria sessão de
   recovery; como rota protegida, mandaria para `/entrar` quem deveria ler a
   orientação de pedir novo link. O guard real é da página.
3. **`PASSWORD_RESET_DONE_PARAM` mora em `routes.ts`.** Arquivo `"use server"`
   só exporta função assíncrona — o build recusa a constante ali.
4. **Erro do provider no pedido de recuperação cai na mensagem neutra.** Só
   rate limit e `status >= 500` viram mensagem própria: são condições que não
   dependem de o e-mail existir. Qualquer outro código seria canal de sondagem.
5. **`/conta`:** `erro-tecnico` virou estado do union. Antes, falha na leitura
   de membership subia como 500 e falha nas leituras de organização/perfil era
   descartada pelo destructuring — virava "negócio indisponível" ou "perfil
   ausente". Era a dívida registrada na auditoria 001E.

---

## 4. BLOQUEIO — o provider não emite `amr=recovery`

O mandato §4.4 exige confirmar que `amr` contém o método `recovery`. **O
projeto hospedado não produz esse valor.** Medido contra GoTrue `v2.195.0`:

| origem da sessão | `amr[].method` no JWT | `auth.mfa_amr_claims.authentication_method` |
| --- | --- | --- |
| login por senha | `password` | `password` |
| `verifyOtp({type:'recovery'})` | `otp` | `otp` |
| `verifyOtp({type:'signup'})` | `otp` | `otp` |

A segunda coluna vem do JWT decodificado; a terceira, de consulta direta à
tabela de origem — não é artefato do SDK. A documentação do Supabase lista
`recovery` entre os métodos possíveis; o provider vigente não o emite.

Consequências:

- o ataque que o mandato **nomeia** — sessão comum de login por senha usada
  como atalho para trocar a senha — fica bloqueado com segurança;
- a sessão de recuperação **não** é distinguível de outra sessão nascida de OTP
  por e-mail (hoje, a confirmação de cadastro).

Isso é literalmente o critério de parada §11.2. Não contornei em silêncio:

- `getRecoveryUser()` usa `grantsPasswordReset()`, que exige método de OTP por
  e-mail **e** recusa qualquer `amr` contendo `password`;
- a divergência está documentada em `src/lib/auth/recovery.ts`, com a tabela
  acima, e coberta por teste que afirma explicitamente que `otp` **não** é
  `recovery`;
- `hasRecoveryMethod()` (literal) continua exportado e testado, para que o dia
  em que o provider passar a emitir `recovery` seja detectável;
- **não** declarei o critério §12 "nova senha exige sessão `amr=recovery`" como
  atendido.

Alternativas que **não** implementei por estarem fora do mandato: custom access
token hook adicionando claim própria; cookie marcador assinado emitido pelo
ramo de recovery do `/auth/confirm`; consulta privilegiada a `recovery_sent_at`.
As três criam contrato estrutural novo — decisão do GPT, não do executor.

---

## 5. Provas

| prova | comando/fonte | resultado |
| --- | --- | --- |
| suíte completa | `npx vitest run` | 19 arquivos, 319 testes, 0 falhas |
| lint | `npm run lint` | limpo |
| typecheck | `npm run typecheck` | limpo |
| build | `npm run build` | ok; `/recuperar-senha` estática, `/redefinir-senha` dinâmica |
| whitespace | `git diff --cached --check` | limpo |
| migrations inalteradas | MCP `list_migrations` | 5, última `20260823111051` |
| Advisor sem regressão | MCP `get_advisors(security)` | só `auth_leaked_password_protection` |
| `amr` real do provider | JWT decodificado + `auth.mfa_amr_claims` | `otp` para recovery e signup, `password` para login |
| sessão comum recusada na tela de nova senha | ensaio HTTP contra app + Auth reais | recusada; página mostra orientação, sem formulário |
| confirmação de recovery → `/redefinir-senha` | ensaio HTTP | redirect correto, sem `token_hash` no destino |
| troca de senha efetiva | ensaio HTTP | senha antiga passa a devolver `invalid_credentials`; nova autentica |
| link de recovery de uso único | ensaio HTTP | segunda visita → `/auth/erro`, sem cookie de sessão |
| sessão anterior após a troca | refresh grant HTTP | **HTTP 200 — não revogada**; cookies antigos seguem abrindo `/conta` |
| segredo fora do diff | busca do valor de `SUPABASE_SECRET_KEY` no diff staged | ausente |
| `.env.local` ignorado | `git check-ignore -v .env.local` | ignorado |
| identidades de teste removidas | `select ... from auth.users where email like '%trafegopago-teste.com'` | zero linhas |

**Sobre "ensaio HTTP":** são execuções contra a aplicação real e o Auth
hospedado real, mas o link de recuperação foi obtido por
`admin.generateLink()`. **Isso NÃO é a prova exigida pela §5.2** — serve para
não gastar o gate humano com código não exercitado. A prova final com e-mail
real ainda não foi executada (§7).

**Sessões anteriores:** o comportamento foi medido, não presumido. Trocar a
senha por `updateUser()` **não** revogou a sessão de login preexistente neste
projeto. É fato do provider; se o produto quiser revogação, isso é decisão de
arquitetura para o GPT.

---

## 6. Template de recovery

Versionado em `supabase/templates/recovery.html` e declarado em
`supabase/config.toml` como `[auth.email.template.recovery]`. Link no padrão
SSR `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery`,
sem `next`.

**Estado no projeto hospedado: não verificado e presumidamente o padrão.** A
CLI guarda o access token no keyring do Windows, sem arquivo legível, então não
há caminho autorizado e reprodutível para ler ou aplicar a configuração remota
daqui. `supabase config push` existe, mas empurraria todo o `config.toml` local
— incluindo `site_url = http://localhost:3000` e a ausência de SMTP — sobre o
projeto hospedado; seria destrutivo e não foi usado.

Enquanto o template hospedado for o padrão, o e-mail real levará a
`{{ .ConfirmationURL }}` (fluxo implícito/PKCE) e **não** ao endpoint SSR. Daí
o gate humano.

---

## 7. Gate humano — uma solicitação, três itens

1. **Decisão do GPT** sobre o critério de `amr` (§4). Sem ela a rodada não pode
   ser declarada conforme ao mandato.
2. **Dashboard → Authentication → Emails → Reset Password:** substituir assunto
   e corpo pelo conteúdo de `supabase/templates/recovery.html`, mantendo os
   placeholders `{{ .SiteURL }}` e `{{ .TokenHash }}`. Nenhum segredo é pedido.
3. **Rodar a prova final** com o app de pé:
   `RECOVERY_TEST_EMAIL=<caixa real de teste> npm run smoke:recovery`.
   O script cria e apaga a identidade de teste, para uma vez para receber a URL
   do e-mail por stdin — o token nunca é impresso nem gravado — e imprime a
   tabela de provas.

---

## 8. Harmonização documental

`MVP_CANONICAL.md`: ciclo Growth Intelligence no lugar do funil rígido (§1);
mídia paga opcional (§§1–2); Lei da Simplicidade Guiada referenciada (§2);
número de candidatos deixa de ser fixo (§3); contexto do negócio progressivo e
`business_profiles` como primeira camada (§4.2); nova §4.4 sobre objetivo,
jornada e resultado observável; §21 passa a ramificar por objetivo, com o ramo
pago e o ramo lead explicitamente condicionais.

`IMPLEMENTATION_ROADMAP.md`: regra de interpretação — fases são dependências e
capacidades, não funil obrigatório; revalidação contra Growth Intelligence e
documentação externa antes de cada fase de Meta/produto; Fase 1 passa a citar
recuperação de acesso e registra que gestão avançada de membros não bloqueia o
encerramento.

Seções de execução detalhada não foram reescritas por estética.

---

## 9. Pendências e riscos

Bloqueante agora:

1. critério de `amr` (§4) — decisão do GPT;
2. template Recovery hospedado (§6) — gate humano;
3. prova final com e-mail real (§7) — depende de 1 e 2.

Registrar como dívida/decisão:

4. troca de senha **não** revoga sessões anteriores neste provider;
5. `auth_leaked_password_protection` segue desabilitado (recurso Pro+);
6. Brevo Free continua SMTP de desenvolvimento;
7. falha técnica em `/conta` não é registrada em log — não há redator de logs no
   projeto, e um log cru poderia arrastar dado sensível.

---

## 10. Conclusão

Recovery implementado ponta a ponta, com anti-enumeração, destino forçado,
proteção de open redirect preservada, senha trocada por `updateUser()` no
contexto do próprio usuário, sem secret key no caminho funcional, sem migration
e sem regressão nos gates. A dívida de UX de `/conta` foi paga e a harmonização
documental proporcional foi feita.

A rodada **para** no critério §11.2: o provider vigente não emite
`amr=recovery`, e a substituição por um predicado equivalente é decisão de
contrato que pertence ao GPT.

`001F EXECUTADA PARCIALMENTE — NÃO CANDIDATA A FECHAMENTO DA FASE 1 — AGUARDANDO DECISÃO E AUDITORIA GPT`
