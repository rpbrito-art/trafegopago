# RODADA 001B — AUTH REAL

Status: **AUTORIZADA**
Data: 2026-08-22

Branch esperada:

`claude/rodada-001b-auth-real`

Relatório esperado:

`rodadas/claude/RELATORIO_RODADA_001B_AUTH_REAL.md`

## 0. Objetivo

Implementar autenticação real por e-mail/senha com Supabase Auth em Next.js 16, incluindo confirmação de e-mail, sessão SSR, logout e uma rota protegida mínima.

Esta rodada prova **identidade e sessão**. Não cria tenancy nem domínio.

---

# 1. PRECONDIÇÕES

Antes de escrever:

- confirmar repo `rpbrito-art/trafegopago`;
- atualizar referências remotas sem operação destrutiva;
- partir da `main` atualizada;
- confirmar project ref Supabase `cbnxdoxpyioxjwgjhbtq`;
- criar a branch esperada;
- não tocar `business-weaver` nem outro projeto Supabase.

Se a `main` local estiver divergente/suja de forma insegura, parar e reportar.

---

# 2. READ SET — OBRIGATÓRIO E MÍNIMO

## Ler integralmente

1. `estado.md`
2. `.gpt/PROJECT_PROMPT.md`
3. `docs/00-governanca/ACTIVE_DOCS.md`
4. este mandato
5. `docs/03-canonical/SECURITY_MODEL.md`

## Leitura dirigida, somente seções relevantes a Auth/SSR/env

- `docs/03-canonical/TECHNICAL_SPEC.md`
- código atual em `src/lib/supabase/`, `src/app/`, `.env.example`, `package.json`, `package-lock.json`

## Sob demanda

- `docs/00-governanca/HISTORY_SUMMARY.md`
- `docs/03-canonical/API_CONTRACTS.md`
- roadmap/charter apenas se surgir dependência concreta

## NÃO ler por padrão

- relatórios antigos em `rodadas/claude/`;
- auditorias antigas completas em `rodadas/gpt/`;
- `docs/02-research/`;
- `AI_ARCHITECTURE.md`;
- `DATA_MODEL.md` além de dependência concreta;
- documentos Meta.

Se precisar de um fato histórico, consultar primeiro `HISTORY_SUMMARY.md`.

---

# 3. DOCUMENTAÇÃO EXTERNA VIGENTE

Antes de implementar, revalidar somente documentação oficial necessária.

Pontos já confirmados pelo GPT em 2026-08-22 e que devem ser conferidos contra a documentação corrente:

- Next.js 16 depreca `middleware.ts` e usa `proxy.ts` / export `proxy`;
- `@supabase/ssr` é o pacote recomendado para sessão em cookies;
- browser client e server client têm papéis distintos;
- Proxy atualiza/propaga cookies de Auth;
- `supabase.auth.getClaims()` é o método preferido para verificar identidade/proteger páginas;
- não confiar em `getSession()` como prova de identidade server-side;
- em SSR, confirmação de e-mail pode usar `token_hash` + `/auth/confirm` + `verifyOtp`;
- Site URL/Redirect URLs precisam corresponder ao fluxo configurado.

Não reproduzir a documentação consultada no relatório. Registrar apenas URLs/títulos e decisões que ela alterou.

---

# 4. ESCOPO FUNCIONAL

Implementar um fluxo mínimo e real:

`cadastro → e-mail de confirmação → confirmação → sessão → área protegida → logout → login posterior`

## 4.1 Cadastro

Criar rota/tela simples para cadastro por e-mail e senha.

Requisitos:

- validação de entrada server-side;
- mensagens úteis sem vazar detalhes sensíveis;
- chamar Supabase Auth real;
- após cadastro com confirmação obrigatória, orientar o usuário a verificar o e-mail;
- não criar profiles, organizations ou qualquer tabela própria.

## 4.2 Confirmação de e-mail

Implementar endpoint SSR compatível com padrão oficial atual, preferencialmente:

`/auth/confirm`

O endpoint deve:

- receber somente parâmetros esperados;
- validar o tipo de OTP permitido;
- verificar `token_hash` com Supabase;
- gravar sessão via cookies pelo server client;
- remover token/parâmetros sensíveis da URL de destino;
- impedir open redirect: qualquer `next` deve ser estritamente interno/allowlisted;
- redirecionar sucesso para a área protegida mínima e falha para página segura de erro.

## 4.3 Login

Implementar login e-mail/senha com Supabase Auth real.

- validar entrada;
- erro genérico para credenciais inválidas;
- sucesso → área protegida.

## 4.4 Logout

Logout server-side com limpeza correta da sessão e redirecionamento para login/home pública.

## 4.5 Área protegida mínima

Criar uma rota mínima, sem domínio empresarial, que prove:

- usuário não autenticado não acessa;
- usuário autenticado acessa;
- identidade é verificada server-side com mecanismo confiável (`getClaims()` ou substituto oficial vigente se a documentação tiver mudado);
- não confiar apenas em cookie cru ou `getSession()`.

Não transformar essa página em dashboard do produto ainda.

---

# 5. SSR E PROXY

Implementar/ajustar o padrão atual recomendado para Next.js 16 + Supabase.

Esperado, salvo mudança oficial documentada:

- `src/proxy.ts` (ou localização correta conforme a estrutura `src/`);
- helper de atualização de sessão em `src/lib/supabase/proxy.ts`;
- clientes browser/server atuais e seguros;
- matcher restrito ao necessário, evitando assets estáticos;
- nenhuma lógica lenta ou de domínio no Proxy.

O Proxy serve para refresh/propagação de sessão, não como substituto de autorização de domínio.

---

# 6. CONFIGURAÇÃO REMOTA DE AUTH

Inspecionar a configuração necessária para o fluxo SSR:

- confirmação de e-mail habilitada;
- Site URL adequada ao ambiente de desenvolvimento;
- Redirect URLs necessárias;
- template de confirmação compatível com `token_hash` e endpoint SSR.

## Regra de eficiência/human gate

Antes de pedir qualquer ação ao fundador:

1. concluir código e verificações não destrutivas possíveis;
2. identificar exatamente todas as mudanças remotas necessárias;
3. concentrar tudo em **uma única solicitação humana**, se a CLI/API oficial disponível não puder fazer isso com segurança.

Não pedir token/senha no chat.

Se uma API/CLI oficial autenticada já disponível puder aplicar a configuração sem expor segredo e estiver dentro do mandato, pode usá-la após confirmar a sintaxe vigente.

Não inventar endpoint/flag da CLI.

---

# 7. ALINHAMENTO DO `/proxima` COM O MÉTODO NOVO

Atualizar `.claude/commands/proxima.md` nesta mesma rodada para refletir:

- leitura obrigatória de `ACTIVE_DOCS.md`;
- READ SET mínimo por mandato;
- histórico não lido por padrão;
- `HISTORY_SUMMARY.md` antes de relatórios antigos;
- relatório compacto (alvo ≤150 linhas/15 KB);
- gates proporcionais;
- operações remotas agrupadas;
- um único handoff/push auditável quando possível;
- branch/head resolvidos pelo GPT, sem commit extra só para preencher SHA em relatório.

Não duplicar todo `DOCUMENTATION_LIFECYCLE.md` dentro de `/proxima`; referenciá-lo.

---

# 8. TESTES E PROVAS

Criar testes proporcionais ao risco da rodada.

No mínimo provar automaticamente, quando tecnicamente viável sem falsificar integração:

- validação de formulário;
- redirect seguro / bloqueio de open redirect;
- guard de rota protegida;
- tratamento de sessão autenticada vs não autenticada;
- logout;
- confirmação: parâmetros válidos/inválidos e comportamento de erro;
- helpers SSR/cookies relevantes.

Não criar mocks que sejam apresentados como prova de Supabase real.

## Prova real

Depois da configuração remota estar correta, executar um smoke test real de Auth usando uma conta de teste controlada.

Se a confirmação de e-mail exigir clique humano, pedir **uma única intervenção** ao fundador no final das demais verificações.

Não registrar e-mail pessoal, token, senha ou conteúdo de sessão no relatório.

Limpar artefatos de teste que puderem ser removidos com segurança. Se um usuário de teste precisar permanecer temporariamente, registrar isso como pendência sem expor dados sensíveis.

---

# 9. GATES DE ENGENHARIA — MÉTODO EFICIENTE

Como esta rodada altera TypeScript/Next.js, executar localmente:

- `npm run lint`;
- `npm run typecheck`;
- `npm test`;
- `npm run build`.

Executar `npm ci` local **somente** se `package.json`/`package-lock.json` mudarem, dependências precisarem ser reinstaladas ou houver inconsistência de ambiente.

A CI remota completa continua obrigatória sobre o conjunto final auditável.

Evitar segundo ciclo de CI apenas por um commit posterior de relatório/estado.

---

# 10. GIT E HANDOFF

- não trabalhar diretamente na `main`;
- não force push;
- não fazer merge/promoção;
- preferir um único commit/push final com implementação + testes + relatório + `estado.md`, quando seguro;
- o relatório **não precisa conter o próprio SHA final**; GPT o resolve pela branch no GitHub.

Atualizar `estado.md` para:

`RODADA 001B — EXECUTADA — AGUARDANDO AUDITORIA GPT`

sem autorizar 001C.

---

# 11. FORMATO DO RELATÓRIO — COMPACTO

Alvo: **≤150 linhas ou ≤15 KB**.

Estrutura:

1. preflight resumido;
2. arquivos alterados;
3. decisões relevantes;
4. tabela de provas:
   `prova | fonte/comando | resultado`;
5. configuração Auth remota aplicada/pendente;
6. gates locais + CI;
7. branch;
8. pendências/riscos;
9. conclusão.

Não colar código/SQL inteiro, documentação oficial, logs longos ou cronologia minuto a minuto.

Se houver incidente real que exija mais contexto, criar uma seção excepcional curta ou arquivo de evidência separado e referenciá-lo.

---

# 12. FORA DE ESCOPO

Expressamente proibido antecipar:

- `organizations`;
- `organization_members`;
- profiles próprios;
- migrations de tenancy/domínio;
- policies RLS de domínio;
- onboarding empresarial;
- Meta/Instagram;
- campanhas, anúncios ou leads;
- IA;
- pagamentos;
- deploy de produção;
- social login;
- recuperação de senha, MFA ou magic link como feature de produto nesta rodada.

Não há necessidade planejada de migration de banco própria nesta 001B.

---

# 13. CRITÉRIO DE CONCLUSÃO

A Rodada 001B só pode ser entregue para auditoria se:

- cadastro/login/logout estiverem implementados;
- confirmação SSR estiver correta;
- sessão/cookies funcionarem segundo padrão oficial vigente;
- rota protegida negar não autenticado e aceitar autenticado;
- open redirect estiver bloqueado;
- não existir credencial privilegiada no cliente/Git;
- configuração remota necessária estiver aplicada ou houver bloqueio humano claramente identificado;
- testes relevantes passarem;
- lint/typecheck/test/build passarem;
- CI final estiver verde;
- nenhuma tabela/tenancy/domínio tiver sido criada;
- relatório compacto e `estado.md` estiverem entregues.

Ao concluir, **pare**. Não iniciar Organizations/Membership/RLS.