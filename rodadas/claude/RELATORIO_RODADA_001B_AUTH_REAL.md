# RELATÓRIO — RODADA 001B — AUTH REAL

Executor: Claude Code
Data: 2026-08-22
Branch: `claude/rodada-001b-auth-real`
Status entregue: **EXECUTADA — AGUARDANDO AUDITORIA GPT**

---

## 1. Preflight

| Item | Resultado |
| --- | --- |
| Raiz do git | `C:/Users/rpbri/Documents/trafegopago` |
| Remote `origin` | `https://github.com/rpbrito-art/trafegopago.git` |
| Branch de partida | `main`, limpa, sincronizada com `origin/main` (`642e421`) |
| Supabase linkado | `cbnxdoxpyioxjwgjhbtq` (`supabase/.temp/project-ref` + `supabase projects list` → `linked: true`) |
| `business-weaver` | não tocado |

`git fetch --all --prune` não trouxe divergência. Nenhuma operação destrutiva executada.

READ SET cumprido: `estado.md`, `.gpt/PROJECT_PROMPT.md`, `ACTIVE_DOCS.md`, este mandato,
`SECURITY_MODEL.md`, leitura dirigida do código atual. Documentação externa consultada na
cópia versionada em `node_modules/next/dist/docs/` (guia `proxy`, referência
`file-conventions/proxy`, guia `authentication`, referência `cookies`) e nos `.d.ts` de
`@supabase/auth-js` para confirmar as assinaturas de `getClaims` e `verifyOtp`.

---

## 2. Arquivos alterados

**Novos** (lista completa no diff da branch): `src/proxy.ts` + teste;
`src/lib/supabase/proxy.ts`; `src/lib/auth/` (`routes`, `redirect`, `otp`, `schemas`,
`errors`, `session` — cada um com `.test.ts`); `src/app/actions/auth.ts` + teste;
`src/app/auth/confirm/route.ts` + teste; páginas `/(auth)/entrar`, `/(auth)/cadastro`,
`/(auth)/cadastro/confirme-seu-email`, `/auth/erro`, `/conta`;
`src/components/auth/` (shell, sign-in, sign-up, sign-out);
`supabase/templates/confirmation.html`; `scripts/smoke-auth.mjs`.

**Modificados:** `src/app/page.tsx` + teste (home passa a linkar login/cadastro),
`src/lib/supabase/server.ts` (comentário obsoleto sobre middleware),
`supabase/config.toml`, `.env.example`, `package.json` (script `smoke:auth`),
`.claude/commands/proxima.md`.

Nenhuma migration criada. Nenhuma tabela, `organizations`, `organization_members`,
profile ou policy de domínio — o schema `public` segue sem tabelas de domínio.
`package-lock.json` inalterado (nenhuma dependência nova).

---

## 3. Decisões não óbvias

1. **`getClaims()` como prova de identidade, nunca `getSession()`.** Verificado no fonte
   de `auth-js`: sem argumento, `getClaims` resolve a sessão (disparando refresh) e então
   valida a assinatura do JWT — caindo em `getUser()` quando a chave é simétrica. Usado
   tanto no Proxy quanto em `requireUser()`.

2. **Duas camadas de guard.** O Proxy faz redirect otimista; a decisão que vale é
   `requireUser()` dentro de `/conta`. O Proxy não consulta banco nem regra de domínio,
   como o mandato §5 exige.

3. **Cookies preservados no redirect do Proxy.** `redirectPreservingCookies` copia os
   cookies do refresh para a resposta de redirect. Sem isso, um token renovado seria
   descartado a cada passagem e o usuário cairia da sessão. Coberto por teste.

4. **Anti open redirect por allowlist exata, não por heurística.** `sanitizeRedirect`
   exige caminho interno *e* pertencente a `ALLOWED_REDIRECT_PATHS`. Qualquer outra coisa
   cai no destino padrão, silenciosamente e sem eco do valor recebido.

5. **Tipos de OTP restritos a `signup` e `email`.** `recovery`, `invite`, `magiclink` e
   `email_change` são recusados no endpoint: recuperação de senha, convite e magic link
   são explicitamente fora de escopo, e aceitá-los abriria fluxos não implementados.

6. **Mensagens que não permitem enumeração de contas.** Falha de login devolve sempre a
   mesma frase; `email_exists`/`user_already_exists` no cadastro caem na mensagem
   genérica. Provado em `errors.test.ts` e `auth.test.ts`.

7. **Template de e-mail com `token_hash`, não `{{ .ConfirmationURL }}`.** O fluxo padrão
   entrega a sessão ao browser (fragmento/PKCE), o que não serve quando quem precisa
   gravar o cookie é o servidor.

8. **Secret key fora da aplicação.** `SUPABASE_SECRET_KEY` não é lida por nenhum módulo em
   `src/`; só por `scripts/smoke-auth.mjs`, para gerar o link de confirmação sem depender
   de entrega de e-mail e apagar o usuário de teste no fim.

---

## 4. Provas

### 4.1 Smoke test real — `npm run smoke:auth` (Supabase e app reais, 27/27)

Projeto `cbnxdoxpyioxjwgjhbtq`, aplicação servida por `next start` em `:3000`. Usuário de
teste criado e **removido** ao final.

| Prova | Resultado |
| --- | --- |
| Rota protegida nega visitante sem sessão | 307 → `/entrar` |
| Cadastro cria usuário real, sem e-mail confirmado | `email_confirmed_at = null` |
| Login antes da confirmação é recusado | `code=email_not_confirmed` |
| Confirmação recusa: sem parâmetros / sem `token_hash` / sem `type` / `type=recovery` / token forjado | 5× → `/auth/erro`, sem cookie de sessão |
| Confirmação bloqueia open redirect (`next=https://evil.example`) | `location=/auth/erro` |
| Tela de login sanitiza o destino antes do formulário | campo `next` = `/conta` |
| Confirmação válida grava sessão e redireciona | → `/conta`, cookie `sb-cbnxdoxpyioxjwgjhbtq-auth-token` |
| Destino da confirmação não carrega o token | sem `token_hash` no `Location` |
| Usuário autenticado acessa a área protegida | 200, com `id` e e-mail verificados server-side |
| Token de confirmação não pode ser reutilizado | 2ª tentativa → `/auth/erro` |
| Login com a senha real após confirmação | sessão emitida |
| Sessão de login dá acesso à área protegida | 200 |
| Logout remove cookies de sessão | 0 cookies `sb-` restantes |
| Logout revoga o refresh token no provider | HTTP 400 no `grant_type=refresh_token` |
| Login posterior funciona / senha errada recusada | ok / `code=invalid_credentials` |
| Usuário de teste removido | ok |

Ressalva de honestidade: o **logout do produto** é a Server Action `signOutAction`. O
smoke test exercita a mesma cadeia (`@supabase/ssr` → `signOut()` → cookies removidos →
refresh revogado) fora do runtime do Next, porque acionar uma Server Action por HTTP
exigiria o ID de ação gerado no build. O comportamento da action em si está coberto pelos
testes unitários (§4.2).

### 4.2 Testes automatizados — `npm test`

11 arquivos, **188 testes**, todos passando. Cobrem: allowlist de redirect contra 16
vetores de open redirect e caracteres de controle; parsing de `/auth/confirm`
(parâmetros ausentes, token longo, tipos fora do escopo, `next` hostil, parâmetros
extras ignorados); schemas de cadastro/login; mensagens de erro sem enumeração de contas;
`getVerifiedUser`/`requireUser` (incluindo recusa de claims sem `sub` e não exposição de
`user_metadata`); Proxy (guard, subrotas, propagação de cookies em resposta normal e em
redirect, matcher vs assets); Server Actions; Route Handler de confirmação.

### 4.3 Segredos fora do cliente

Varredura de `.next` após `npm run build` por `sb_secret_`, `"role":"service_role"` e
`SUPABASE_SECRET_KEY`:

- `.next/static` (bundle do browser): **0 ocorrências** em 14 arquivos;
- `.next/server`: ocorrências apenas do literal `"sb_secret_"` usado pelo próprio
  `supabase-js` para detectar formato de chave, e do *nome* `SUPABASE_SECRET_KEY` vindo de
  `src/lib/env/server.ts`. Nenhum valor de segredo.

`.env.local` (criado localmente com as chaves) não é rastreado — coberto por `.gitignore:34`.
Nenhum arquivo a commitar contém chave real.

---

## 5. Configuração remota de Auth

Inspecionado por `GET /auth/v1/settings` e pelo `action_link` devolvido por
`admin.generateLink`:

| Item | Estado remoto | Necessário | Situação |
| --- | --- | --- | --- |
| Confirmação de e-mail obrigatória | `mailer_autoconfirm: false` | obrigatória | **já correto** |
| Cadastro por e-mail | habilitado (`disable_signup: false`) | habilitado | **já correto** |
| Social login / anonymous | todos desabilitados | fora de escopo | **já correto** |
| Site URL | `http://localhost:3000` | `http://localhost:3000` | **já correto** |
| Template de confirmação | não inspecionável pelas ferramentas disponíveis | apontar para `/auth/confirm?token_hash=…` | **PENDENTE — gate humano** |
| `additional_redirect_urls` | não exposto pela API pública | incluir `/auth/confirm` | **PENDENTE — gate humano** |
| `minimum_password_length` | não exposto (default 6) | 8 | pendente, não bloqueante (o app já valida 8) |

`supabase/config.toml` foi versionado com todos esses valores e o template criado em
`supabase/templates/confirmation.html`.

### Intervenção humana única solicitada

```bash
supabase config push
```

Efeito: aplica ao projeto `cbnxdoxpyioxjwgjhbtq` o `config.toml` versionado — template de
confirmação apontando para `/auth/confirm`, redirect URLs, `enable_confirmations = true`
e senha mínima 8.

**Não executei por decisão deliberada.** `config push` envia o `config.toml` inteiro
(`[api]`, `[db]`, `[storage]`, `[auth]`, …), não apenas o bloco de Auth, e não oferece
`--dry-run`. Aplicar isso unilateralmente a um projeto com hardening promovido na 001A
excede o que considero seguro decidir sozinho. O risco medido é baixo — Site URL local e
remota são idênticas e o restante do `config.toml` é o default da CLI — mas a decisão é
do fundador ou do GPT.

**Impacto enquanto pendente:** o fluxo SSR funciona ponta a ponta (provado em §4.1), mas o
e-mail real de confirmação ainda usa o template padrão, cujo link leva a
`/auth/v1/verify?...&redirect_to=http://localhost:3000` — ou seja, o usuário cairia na home
sem sessão gravada server-side em vez de passar por `/auth/confirm`. Alternativa ao
`config push`: ajustar o template "Confirm signup" no Dashboard, colando o conteúdo de
`supabase/templates/confirmation.html`.

---

## 6. Gates

| Gate | Comando | Resultado |
| --- | --- | --- |
| Lint | `npm run lint` | sem erros |
| Typecheck | `npm run typecheck` | sem erros (`next typegen` + `tsc --noEmit`) |
| Testes | `npm test` | 188/188 |
| Build | `npm run build` | compilado; rotas `/`, `/auth/confirm`, `/auth/erro`, `/cadastro`, `/cadastro/confirme-seu-email`, `/conta`, `/entrar` + `ƒ Proxy (Middleware)` |
| Smoke real | `npm run smoke:auth` | 27/27 |

`npm ci` local não executado: `package-lock.json` inalterado e ambiente consistente
(critério §9 do mandato). CI remota roda sobre o push desta branch.

---

## 7. Pendências e riscos

1. **Config remota de Auth** (§5) — gate humano único. Bloqueia o e-mail real de
   confirmação; não bloqueia o fluxo SSR já provado.
2. `additional_redirect_urls` remota não é legível pelas ferramentas disponíveis; o valor
   correto está versionado no `config.toml` mas não pôde ser confirmado no projeto.
3. Pendências herdadas da 001A seguem abertas e não foram tocadas: `service_role` ainda
   executa `public.rls_auto_enable()`; default privileges para futuras funções em schema
   exposto ainda não definidos.
4. `getClaims()` valida a assinatura do JWT localmente, então um access token já emitido
   continua criptograficamente válido até expirar (`jwt_expiry = 3600`) mesmo após
   logout. O logout revoga o refresh token e remove os cookies — comportamento normal de
   JWT assimétrico, registrado aqui para que a decisão seja consciente antes de haver
   dado sensível atrás da sessão.
5. Rate limiting de login depende hoje apenas dos limites do Supabase
   (`sign_in_sign_ups = 30 / 5 min`). `SECURITY_MODEL.md` §19 prevê limite próprio; não
   foi implementado por estar fora do escopo desta rodada.

Nenhuma divergência encontrada entre o mandato e a documentação canônica.

---

## 8. Conclusão

O fluxo `cadastro → confirmação → sessão → área protegida → logout → login posterior`
está implementado e provado contra o Supabase real e a aplicação real. Open redirect
bloqueado, identidade verificada server-side por `getClaims()`, nenhuma credencial
privilegiada no cliente ou no Git, nenhuma tabela ou tenancy criada.

Resta uma única ação humana: aplicar a configuração remota de Auth (§5).

Não iniciei a 001C nem qualquer trabalho de Organizations/Membership/RLS.
