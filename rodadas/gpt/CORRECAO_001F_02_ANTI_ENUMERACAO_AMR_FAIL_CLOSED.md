# CORREÇÃO 001F-02 — ANTI-ENUMERAÇÃO + AMR FAIL-CLOSED

Data: 2026-08-23
Origem: auditoria GPT independente da Rodada 001F após o handoff `1fcb8c6fbeaee755a034d1ca195b6625e758fe5e`
Status: **AUTORIZADA — BLOQUEIA PROMOÇÃO ATÉ CORREÇÃO E REAUDITORIA**
Branch existente: `claude/rodada-001f-recovery-fechamento-fase1`
PR: #7

Esta correção permanece dentro da Rodada 001F. **Não cria nova rodada, não abre Fase 2 e não amplia escopo.**

## 1. O que a auditoria confirmou como correto

A auditoria independente confirmou no GitHub e no Supabase hospedado:

- E2E real já executado pelo fundador: **40/40 provas**;
- logs de Auth compatíveis com recovery real, `verify`, troca de senha, logout, login novo, reuso recusado e remoção da fixture;
- `auth.users` voltou a apenas 1 conta real;
- exatamente 5 migrations, sem migration/DDL na 001F;
- RLS/grants/baseline da fundação preservados;
- Security Advisor apenas com o WARN conhecido `auth_leaked_password_protection`;
- CI do head entregue verde;
- template recovery versionado correto e Gmail SMTP funcional como infraestrutura provisória de desenvolvimento;
- harmonização de produto compatível com `GROWTH_INTELLIGENCE_CANONICAL.md`;
- `@supabase/supabase-js` está em `2.112.3`, posterior à correção upstream `2.110.2` que passou a limpar a sessão local em falhas de `signOut`; **não investigar nem alterar isso nesta correção**;
- a divergência observada sobre `updateUser({password})` possivelmente já revogar refresh token não bloqueia: o contrato autorizado continua sendo logout global explícito + prova de refresh anterior recusado, e isso já passou.

**O E2E real de e-mail NÃO deve ser repetido nesta correção**, porque os bloqueios abaixo não alteram SMTP, template, `/auth/confirm`, troca de senha nem o efeito remoto já provado. Repeti-lo só acrescentaria custo, rate limit e trabalho humano sem aumentar a evidência relevante.

## 2. BLOQUEIO A — anti-enumeração quebrada no rate limit de recovery

### 2.1 Problema

`requestPasswordResetAction` hoje devolve uma mensagem específica quando o Supabase responde `429` / rate limit.

Isso parece neutro no texto, mas cria um canal de enumeração por **diferença de comportamento**:

- no código atual do Supabase Auth, `/recover` procura primeiro o usuário;
- se o e-mail **não existe**, retorna `200 {}` imediatamente;
- se o e-mail **existe**, entra em `sendPasswordRecovery`, que aplica `validateSentWithinFrequencyLimit(u.RecoverySentAt, ...)` e pode retornar `429`.

Logo, repetir rapidamente o pedido permite distinguir conta existente de inexistente pela resposta da aplicação. Isso viola diretamente a 001F: “não revelar se o e-mail existe”.

### 2.2 Correção obrigatória

Depois que o e-mail passou pela validação sintática local, a resposta pública do pedido de recovery deve ser **idêntica** independentemente de:

- sucesso do provider;
- usuário inexistente;
- `429` / rate limit;
- erro 4xx do Auth;
- indisponibilidade 5xx do Auth.

Para esta fase, a solução mínima e segura é: **não transformar erro do provider em mensagem pública diferente no pedido de recovery**. Retornar o mesmo estado neutro `requested: true`.

Não criar tabela, rate limiter próprio, CAPTCHA, fila, logging novo ou infraestrutura adicional nesta correção.

### 2.3 Provas obrigatórias

Atualizar testes para provar que a saída pública é exatamente igual para, no mínimo:

1. provider sem erro;
2. `user_not_found`/equivalente;
3. `429` / `over_email_send_rate_limit`;
4. `500` ou `503`.

A senha, o e-mail e códigos crus do provider não podem aparecer na resposta.

## 3. BLOQUEIO B — AMR parcialmente malformado é aceito

### 3.1 Problema

A Correção 001F-01 exige que o `amr` seja **bem formado** antes de autorizar a troca de senha.

A implementação atual de `readAmrEntries()` descarta entradas malformadas e preserva as válidas. Assim, um claim misto como:

- uma entrada `otp` recente válida; e
- uma entrada estruturalmente inválida (`null`, número, objeto sem `method`, etc.)

pode continuar autorizando a redefinição.

O JWT é verificado e assinado pelo provider, portanto isto não equivale a uma exploração direta pelo usuário. Mesmo assim, o contrato de segurança autorizado é fail-closed: claim inesperado/malformado deve negar, não ser saneado silenciosamente até virar autorizável.

### 3.2 Correção obrigatória

Fazer o predicado negar quando o claim `amr` como um todo não for estruturalmente utilizável.

Requisitos mínimos:

- `amr` deve ser array não vazio;
- cada entrada deve estar em um formato reconhecido pelo parser vigente;
- entrada estruturalmente inválida torna o claim inteiro não autorizável;
- `password` em qualquer entrada continua negando;
- `recovery|otp` só autoriza com timestamp utilizável e dentro da janela já definida;
- formato sem timestamp continua falhando fechado para a autorização temporal;
- métodos adicionais bem formados podem coexistir, desde que não sejam `password` e exista o autorizador recente válido.

Não ampliar o residual aceito da 001F-01 e não introduzir novo marcador/cookie/tabela/hook.

### 3.3 Provas obrigatórias

Adicionar teste explícito de que:

- `[otp recente válido, entrada malformada]` → **nega**;
- `[otp recente válido, password]` → **nega**;
- `[otp recente válido, método adicional bem formado]` → pode continuar autorizando;
- `otp` sem timestamp utilizável → **nega**.

## 4. Reconciliação e documentação

Antes de editar código, fazer o preflight obrigatório da `.gpt/PROJECT_PROMPT.md` §4.1 e reconciliar a branch com a `main` atual.

No momento da auditoria, a branch estava **3 commits atrás da main**, e esses commits alteravam apenas governança (`PROJECT_PROMPT`, `ACTIVE_DOCS` e `DOCUMENTATION_LIFECYCLE`). Não há razão conhecida para reabrir código técnico por isso, mas a branch deve incorporar a governança vigente antes do novo handoff.

Também corrigir a contradição documental no `estado.md` da branch: a §7 ainda diz “verificação técnica ainda pendente no E2E final”, embora a própria §4/§8 já registre E2E **40/40 aprovado**.

Atualizar o relatório da 001F para registrar esta 001F-02 e os novos testes. Se o corpo do PR #7 ainda descrever o bloqueio antigo como estado atual, atualizá-lo para não contradizer o handoff.

## 5. Gates finais desta correção

Executar somente:

- lint;
- typecheck;
- suíte de testes;
- build;
- CI no head final reconciliado;
- confirmação read-only de que migrations continuam em 5 e `auth.users` não ganhou fixture/resíduo.

**Não:**

- repetir o E2E de e-mail real;
- mudar SMTP/Gmail/Supabase Dashboard;
- criar migration/DDL;
- tocar Meta, Ads, Fase 2 ou escopo posterior;
- pedir nova ação manual ao fundador.

## 6. Handoff esperado

Ao concluir, entregar na mesma branch:

`001F EXECUTADA COM CORREÇÕES 001F-01 E 001F-02 — CANDIDATA A FECHAMENTO DA FASE 1 — AGUARDANDO REAUDITORIA GPT`

Informar head final, CI, testes e arquivos alterados. Não promover e não iniciar Fase 2.
