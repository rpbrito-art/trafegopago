# CORREÇÃO RODADA 001B-01 — FECHAR AUTH REAL

Status: **AUTORIZADA**
Data: 2026-08-22
Branch: `claude/rodada-001b-auth-real`

## 0. Motivo

A auditoria GPT da 001B confirmou que código, CI e integração real com Supabase estão adequados, mas identificou dois gaps de aceite antes da promoção:

1. o template **Confirm signup** ainda não está aplicado no projeto Supabase hospedado; portanto um usuário que se cadastra pela UI recebe o fluxo padrão do Supabase, não o endpoint SSR `/auth/confirm` implementado;
2. `scripts/smoke-auth.mjs` é uma prova real de integração (Supabase + endpoint de confirmação + cookies + rota protegida + login/logout no provider), mas cria o usuário via `admin.generateLink()` e não percorre o cadastro/login/logout pelas Server Actions/telas do produto. Portanto não deve ser apresentado como E2E completo da UI.

Esta correção fecha somente esses dois pontos. Não altera arquitetura e não inicia 001C.

## 1. READ SET

Ler apenas:

- `estado.md`;
- `.gpt/PROJECT_PROMPT.md`;
- `docs/00-governanca/ACTIVE_DOCS.md`;
- este mandato;
- `rodadas/claude/RELATORIO_RODADA_001B_AUTH_REAL.md` somente nas seções de Auth remoto/smoke;
- arquivos de Auth já alterados na 001B quando necessários.

Não reler documentação histórica.

## 2. Ajuste documental/técnico mínimo

Revalidar a documentação oficial Supabase atual para confirmação SSR.

A direção confirmada pela auditoria GPT é usar o padrão documentado:

`{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`

Se o template versionado estiver usando `type=signup`, ajustar `supabase/templates/confirmation.html` para `type=email`, mantendo o endpoint capaz de rejeitar tipos fora do escopo e sem ampliar a allowlist desnecessariamente.

Não adicionar feature nova.

## 3. Configuração remota — NÃO usar push amplo

**Não executar `supabase config push` nesta correção.**

Motivo: o arquivo `config.toml` contém configuração ampla e o objetivo pendente é estreito. A documentação oficial para projeto Supabase hospedado permite editar o template diretamente em Authentication → Email Templates.

Concentrar a intervenção humana em um único gate:

1. orientar o fundador a abrir o projeto Supabase correto `cbnxdoxpyioxjwgjhbtq`;
2. Authentication/Auth → Email Templates → **Confirm signup**;
3. substituir o conteúdo pelo template versionado em `supabase/templates/confirmation.html` (já ajustado para `type=email`);
4. salvar;
5. não pedir senha, access token, secret key ou service role.

Não exigir alteração de Redirect URLs se o fluxo continuar usando `SiteURL` diretamente e nenhum `emailRedirectTo` for usado no `signUp()`; documentar essa conclusão.

O mínimo de 8 caracteres continua imposto pela aplicação. Não bloquear esta correção apenas porque o provider remoto aceita senha menor diretamente pela API; registrar como hardening futuro se necessário.

## 4. Prova E2E real do produto — uma única passagem humana

Depois de o template remoto estar salvo:

1. iniciar a aplicação local na branch atual;
2. pedir ao fundador para usar **um e-mail de teste que ele possa acessar** e uma senha de teste não reutilizada;
3. pela UI real do produto, executar:
   - abrir cadastro;
   - cadastrar e-mail/senha;
   - confirmar que a UI informa para verificar o e-mail;
   - abrir o e-mail real recebido;
   - clicar no link de confirmação;
   - confirmar que o navegador chega à rota protegida `/conta` autenticado;
   - clicar em Sair pela UI real;
   - confirmar que `/conta` volta a exigir autenticação;
   - entrar novamente pela UI real com e-mail/senha;
   - confirmar acesso a `/conta`.

Não pedir ao fundador que revele senha, token ou conteúdo do link.

Após a passagem, usar apenas evidência não sensível disponível (logs Auth do Supabase, status/rotas e resultado informado da UI) para registrar a prova. Não copiar tokens ou dados privados ao relatório.

Se o e-mail não chegar por limitação do SMTP padrão do Supabase, registrar exatamente o bloqueio; não falsificar a prova e não contornar criando usuário já confirmado via admin.

## 5. Smoke existente

Manter `scripts/smoke-auth.mjs` como prova automatizada útil, mas corrigir comentário/relatório se necessário para chamá-lo de **smoke de integração real**, não E2E completo da UI.

O smoke administrativo pode continuar existindo porque prova token, cookies, replay, guard e provider sem depender da entrega de e-mail; ele complementa, não substitui, o aceite E2E humano.

## 6. Gates proporcionais

Se só houver ajuste de template/comentário/documentação:

- não rodar `npm ci`;
- rodar apenas testes diretamente afetados + typecheck/lint se TS/JS mudar;
- build somente se código executável mudar;
- a CI do head final deve permanecer verde antes da promoção.

Não repetir smoke administrativo sem necessidade, salvo se código de Auth for alterado.

## 7. Relatório

Atualizar o relatório 001B de forma compacta, sem criar relatório enciclopédico.

Adicionar apenas:

- template remoto aplicado: sim/não;
- padrão final do link (`type=email`);
- E2E humano real: passos/resultados sem segredo;
- evidência de logs não sensíveis quando possível;
- arquivos alterados;
- gates executados;
- bloqueios remanescentes.

Alvo adicional desta correção: ≤80 linhas novas.

## 8. Estado final

Se tudo passar:

- atualizar `estado.md` para `001B EXECUTADA COM CORREÇÃO — AGUARDANDO AUDITORIA GPT`;
- push na mesma branch;
- não mergear na `main`;
- não iniciar 001C.

Se qualquer etapa real do fluxo falhar, manter status BLOQUEADA e registrar o ponto exato.
