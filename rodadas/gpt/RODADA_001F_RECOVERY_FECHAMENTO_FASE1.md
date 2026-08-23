# RODADA 001F — RECOVERY DE ACESSO + FECHAMENTO DA FASE 1

Status: **AUTORIZADA**
Data: 2026-08-23
Executor esperado: Claude Code
Repositório único: `rpbrito-art/trafegopago`
Supabase project ref: `cbnxdoxpyioxjwgjhbtq`
Branch esperada: `claude/rodada-001f-recovery-fechamento-fase1`
Relatório esperado: `rodadas/claude/RELATORIO_RODADA_001F_RECOVERY_FECHAMENTO_FASE1.md`

---

## 1. Objetivo

Fechar a lacuna funcional objetiva restante da Fase 1 — recuperação segura de acesso por e-mail/senha — e deixar a fundação Auth + tenancy pronta para auditoria de encerramento da fase.

A rodada deve entregar um fluxo real e simples:

`entrar → esqueci minha senha → informar e-mail → receber e-mail real → abrir link → sessão de recovery SSR → definir nova senha → voltar ao login → entrar com a nova senha`

A rodada também deve fazer a harmonização documental **proporcional** necessária para que as próximas fases não voltem a interpretar o produto como funil rígido/paid-first, sem transformar esta etapa em reescrita geral da documentação.

**A 001F não autoriza Meta/Instagram, gestão de membros, multi-org, IA, Ads nem nova fase funcional.**

---

## 2. Estado incorporado obrigatório antes da execução

Antes de qualquer mutação, confirmar que a `main` contém 000–001E promovidas e que o baseline relevante permanece:

- Auth real por e-mail/senha e confirmação SSR funcionando;
- `public.organizations`, `public.organization_members` e `public.business_profiles` com RLS;
- isolamento tenant e grants mínimos da 001D;
- bootstrap de negócio server-only da 001E;
- default privileges endurecidos;
- `ensure_rls` ativo;
- nenhuma migration posterior à `20260823111051_create_business_profiles_and_bootstrap.sql`;
- Advisor sem nova regressão conhecida além de `auth_leaked_password_protection` enquanto o projeto permanecer no plano atual;
- `GROWTH_INTELLIGENCE_CANONICAL.md` vigente e vinculante.

Se houver divergência material, parar antes de alterar.

---

## 3. READ SET OBRIGATÓRIO

Ler na ordem do método do projeto:

1. `estado.md`;
2. `.gpt/PROJECT_PROMPT.md`;
3. `docs/00-governanca/ACTIVE_DOCS.md`;
4. este mandato;
5. `docs/00-governanca/HISTORY_SUMMARY.md` — apenas resumo promovido;
6. `docs/01-produto/GROWTH_INTELLIGENCE_CANONICAL.md` — **integralmente**;
7. `docs/01-produto/MVP_CANONICAL.md` — §§1–4, 19–21;
8. `docs/00-governanca/IMPLEMENTATION_ROADMAP.md` — Fase 1 e sequência imediata;
9. `docs/03-canonical/SECURITY_MODEL.md` — somente trechos de Auth/sessão/secrets aplicáveis;
10. código Auth atual, no mínimo:
   - `src/app/actions/auth.ts`;
   - `src/app/auth/confirm/route.ts`;
   - `src/lib/auth/otp.ts`;
   - `src/lib/auth/routes.ts`;
   - `src/lib/auth/redirect.ts`;
   - `src/lib/auth/schemas.ts`;
   - `src/lib/auth/errors.ts`;
   - `src/lib/auth/session.ts`;
   - `src/lib/supabase/server.ts`;
   - `src/proxy.ts` e helper de proxy;
   - páginas/componentes atuais de login/cadastro/erro;
   - `supabase/config.toml`;
   - `supabase/templates/confirmation.html`;
11. documentação oficial Supabase vigente para:
   - `resetPasswordForEmail()`;
   - password recovery em SSR/PKCE;
   - `verifyOtp(type: recovery)`;
   - `updateUser({ password })`;
   - JWT `amr` e método `recovery`;
   - sessões e efeito de troca de senha;
   - templates de e-mail recovery;
   - redirect URLs;
   - rate limits de Auth.

Não reler relatórios antigos completos salvo dependência concreta.

---

## 4. Escopo funcional obrigatório

### 4.1 Pedido de recuperação

Criar uma experiência pública simples a partir de `/entrar`, com ação clara como **“Esqueci minha senha”**.

Rota sugerida:

`/recuperar-senha`

Requisitos:

- formulário curto: apenas e-mail;
- validação server-side;
- usar cliente Supabase não privilegiado apropriado ao fluxo Auth;
- chamar `resetPasswordForEmail()` conforme documentação vigente;
- não usar `SUPABASE_SECRET_KEY` para o fluxo funcional de recovery;
- após submissão válida, mostrar resposta neutra equivalente a:
  `Se houver uma conta com esse e-mail, enviaremos as instruções de recuperação.`
- não revelar se o e-mail existe;
- não devolver erro bruto/código Supabase ao usuário;
- não ecoar senha/token/secret em log, URL ou resposta.

O tratamento de indisponibilidade/rate limit pode ser acionável, mas nunca pode revelar existência da conta.

### 4.2 Template de recovery versionado

Adicionar template versionado, por exemplo:

`supabase/templates/recovery.html`

E alinhar `supabase/config.toml` com `auth.email.template.recovery` para desenvolvimento local.

O link deve usar o padrão SSR com `token_hash` e `type=recovery`, direcionando ao endpoint `/auth/confirm`.

O template não deve incluir token bruto em relatório/log.

Para o projeto hospedado, verificar o template remoto efetivo antes do E2E. A documentação Supabase vigente informa que templates do projeto hosted são configurados no Dashboard. Se o executor não tiver caminho autorizado/reprodutível para aplicar a configuração remota:

1. preparar código/template e todas as verificações não destrutivas;
2. concentrar em **um único gate humano** com instruções exatas para atualizar apenas o template Recovery no Dashboard;
3. não pedir senha SMTP nem qualquer segredo;
4. depois do gate, revalidar o template por fluxo real.

Não contornar essa limitação trocando de arquitetura ou usando link admin como substituto do e-mail real.

### 4.3 Confirmação SSR de recovery

Ampliar `/auth/confirm` de forma explícita e testada para aceitar `recovery` **sem enfraquecer os tipos já permitidos de confirmação de cadastro**.

Regras:

- `signup/email` continuam com comportamento vigente;
- `recovery` deve trocar `token_hash` por sessão via `verifyOtp()`;
- token inválido, expirado, reutilizado ou tipo não permitido → erro genérico seguro;
- o URL final não pode manter `token_hash`, token bruto ou parâmetro sensível;
- `recovery` não pode respeitar um `next` arbitrário fornecido na URL;
- após recovery bem-sucedido, o destino deve ser **forçado** para a rota de nova senha definida pela aplicação;
- preservar proteção contra open redirect.

### 4.4 Página de nova senha restrita a sessão de recovery

Criar rota de redefinição, sugerida:

`/redefinir-senha`

A página não pode confiar apenas em “há um usuário autenticado”. Antes de permitir a alteração, verificar identidade/sessão validada e confirmar nas claims JWT que `amr` contém método `recovery`, conforme documentação vigente do Supabase.

Uma sessão comum de login por senha **não pode** acessar o caminho de recovery como atalho para alterar senha sem o fluxo adequado.

Se a sessão de recovery estiver ausente, expirada ou não possuir o método esperado:

- não mostrar formulário funcional de nova senha;
- orientar o usuário a iniciar novamente a recuperação;
- não expor detalhes técnicos.

### 4.5 Definição da nova senha

A nova senha deve:

- usar regra mínima coerente com o app/Supabase atual (mínimo 8 caracteres, salvo contrato vigente mais forte encontrado no preflight);
- ter confirmação de senha na UI;
- nunca ser repopulada após erro;
- ser atualizada por `updateUser({ password })` com cliente/sessão do próprio usuário;
- não usar admin API/secret key para alterar a senha.

Após sucesso:

- garantir limpeza coerente da sessão/cookies locais;
- redirecionar para login com mensagem de sucesso simples;
- provar empiricamente o comportamento de sessões do Supabase após a alteração, em vez de assumir;
- a senha antiga deve deixar de autenticar e a nova deve autenticar.

Se o comportamento real de revogação de sessões divergir da documentação vigente, parar e reportar antes de inventar mecanismo privilegiado adicional.

### 4.6 UX de erro técnico em `/conta`

Corrigir apenas a dívida pequena já registrada na 001E: quando a leitura do estado do negócio falhar tecnicamente, a UI deve mostrar mensagem acionável e segura, em vez de parecer simplesmente estado vazio/incompleto.

Não redesenhar `/conta` nem ampliar onboarding.

---

## 5. Provas obrigatórias de segurança e comportamento

### 5.1 Testes automatizados

Cobrir no mínimo:

- rota/link “Esqueci minha senha”;
- e-mail inválido;
- resposta neutra anti-enumeração;
- `recovery` aceito no parser OTP;
- tipos não autorizados continuam recusados;
- recovery ignora/recusa `next` arbitrário e força rota de redefinição;
- token ausente/inválido → erro seguro;
- rota de nova senha sem sessão → recusada;
- sessão autenticada comum sem `amr=recovery` → recusada;
- sessão de recovery → formulário permitido;
- senha curta/mismatch → erro de campo sem eco da senha;
- sucesso de alteração → destino esperado;
- nenhum detalhe bruto do Supabase é devolvido ao usuário;
- regressão das rotas de signup/login/logout/confirm atuais;
- estado de erro técnico de `/conta` claramente distinto de zero tenant.

### 5.2 E2E real hospedado — obrigatório para fechar a rodada

A prova final deve usar o **e-mail real de recovery enviado pelo Auth hospedado através do SMTP de desenvolvimento configurado**, não `admin.generateLink()` e não link fabricado.

Fluxo mínimo:

1. solicitar recovery pela UI pública;
2. confirmar que a mensagem pública não enumera conta;
3. receber e-mail real;
4. abrir link real;
5. chegar à página de nova senha sem `token_hash` na URL final;
6. confirmar que a sessão usada possui `amr.method = recovery` sem registrar JWT/token;
7. definir nova senha;
8. confirmar retorno ao login;
9. provar que senha antiga falha;
10. provar que nova senha entra;
11. provar que link de recovery não pode ser reutilizado;
12. verificar efeito real sobre sessões anteriores de forma segura e sem expor tokens.

Preferir identidade de teste controlada e removível. Se a prova depender da conta real do fundador, isso é gate humano e deve ser explicitado antes de alterar senha. Não registrar e-mail/PII no relatório; usar descrições opacas.

### 5.3 Segredos e logs

Provar que:

- `SUPABASE_SECRET_KEY` não entra em código cliente nem é necessária ao fluxo funcional;
- nenhum token/hash completo de recovery aparece em relatório, teste versionado ou log persistido;
- `.env.local` permanece ignorado;
- UI não exibe mensagem crua de Auth.

---

## 6. Banco/Supabase

Não criar tabela, policy, função de domínio, trigger ou migration SQL nesta rodada.

A 001F é de Auth/UI/documentação.

Antes e depois, confirmar que:

- migration history permanece em 5 migrations incorporadas até `20260823111051`;
- schema/grants/RLS da 001E permanecem inalterados;
- Advisor não apresenta regressão nova de banco/RLS;
- WARN `auth_leaked_password_protection` permanece dívida pré-produção enquanto indisponível no plano vigente.

Se surgir necessidade de migration/schema para implementar recovery, **parar e retornar ao GPT**; não ampliar escopo.

---

## 7. Harmonização documental proporcional

Esta rodada deve atualizar somente o necessário para eliminar contradições operacionais que afetariam as próximas fases.

### 7.1 `MVP_CANONICAL.md`

Harmonizar principalmente §§1–4 e §21 para refletir, sem apagar detalhes úteis:

- modelo Growth Intelligence em vez de funil rígido;
- mídia paga como capacidade opcional, não pré-condição de valor;
- objetivo/jornada configuráveis por negócio;
- `business_profile` como primeira camada de contexto progressivo;
- onboarding em trilha/progressive disclosure, sem formulário total obrigatório;
- conteúdo, criativo e anúncio como conceitos distintos;
- happy path comercial não pode exigir Lead Ads/CRM/venda em todos os negócios; deve admitir ramificações conforme objetivo e observabilidade.

Não reescrever todas as seções futuras apenas por estética. Onde o `GROWTH_INTELLIGENCE_CANONICAL.md` já resolve a hierarquia, referenciá-lo e deixar a harmonização detalhada para a fase substantiva correspondente.

### 7.2 `IMPLEMENTATION_ROADMAP.md`

- alinhar Fase 1 ao estado real e ao fechamento pretendido desta rodada;
- deixar explícito que gestão de membros avançada não bloqueia o encerramento da Fase 1;
- adicionar regra de interpretação de que as fases posteriores são dependências/capacidades, não um funil obrigatório idêntico para todo cliente;
- registrar que antes de cada fase Meta/produto deve haver revalidação contra `GROWTH_INTELLIGENCE_CANONICAL.md` e documentação externa vigente;
- não executar reordenação ampla de fases técnicas sem necessidade demonstrada nesta rodada.

### 7.3 Fase 1

Claude **não declara a Fase 1 encerrada**. Ao final deve reportar:

`001F EXECUTADA — CANDIDATA A FECHAMENTO DA FASE 1 — AGUARDANDO AUDITORIA GPT`

Somente a auditoria GPT pode declarar o fechamento após validar recovery real e ausência de regressões.

---

## 8. Fora de escopo

Não implementar:

- convite de membros;
- gestão de roles/status/ownership;
- tenant switcher/múltiplas organizações na UI;
- edição ampla do business profile;
- exclusão de conta/organização;
- OAuth Meta/Instagram;
- publicação ou leitura Instagram;
- Ads/campanhas/creatives;
- Operations/Queues/Audit da Fase 2;
- IA/personas;
- MFA/passkeys/social login;
- mudança para plano Supabase pago;
- domínio/SMTP de produção;
- hardening comercial da Fase 17.

Não criar esses itens “porque já está mexendo em Auth”.

---

## 9. Gates técnicos

Como haverá mudança TS/React/Auth:

- `git diff --check`;
- lint;
- typecheck;
- testes relevantes;
- suíte completa Vitest;
- build;
- CI final limpa no GitHub.

Não executar `npm ci` local por ritual se dependências/lockfile não mudarem e o ambiente estiver consistente.

Não adicionar dependência sem necessidade objetiva; recovery deve ser implementável com stack atual.

---

## 10. Relatório do Claude

Criar:

`rodadas/claude/RELATORIO_RODADA_001F_RECOVERY_FECHAMENTO_FASE1.md`

Alvo: até ~150 linhas/~15 KB salvo incidente real.

Estrutura compacta:

1. preflight;
2. arquivos alterados;
3. decisões não óbvias;
4. tabela `prova → fonte/comando → resultado`;
5. estado do template recovery hospedado;
6. E2E real sem PII/token;
7. gates/CI;
8. pendências/riscos;
9. branch;
10. conclusão.

Não copiar JWT, token_hash, e-mail completo, segredo, template inteiro ou logs extensos.

Atualizar em `estado.md` somente o estado de execução autorizado, deixando a rodada em aguardando auditoria GPT.

---

## 11. Critérios de parada

Parar e retornar ao GPT antes de contornar se ocorrer qualquer um:

- recovery hosted exige configuração remota não aplicável pelo executor e o gate humano ainda não foi cumprido;
- sessão de recovery não puder ser distinguida de sessão comum de forma confiável com o contrato vigente;
- efeito de troca de senha sobre sessões divergir materialmente da documentação e exigir arquitetura adicional;
- necessidade de migration/schema;
- necessidade de secret/admin API no fluxo funcional do usuário;
- qualquer regressão de signup/login/confirm/session;
- qualquer exposição de token/secret/PII;
- necessidade de mudar de plano Supabase ou contratar serviço;
- divergência material entre `main`, `estado.md` e baseline deste mandato.

---

## 12. Critério de conclusão

A execução só pode ser entregue para auditoria quando:

- recovery completo está funcional;
- template versionado e hosted efetivo estão coerentes;
- e-mail real foi usado na prova final;
- anti-enumeração está preservada;
- `/auth/confirm` mantém confirmação de cadastro e adiciona recovery sem open redirect;
- nova senha exige sessão `amr=recovery`;
- senha antiga falha e nova senha funciona;
- comportamento das sessões após a troca foi provado;
- link não reutiliza;
- `/conta` distingue erro técnico;
- zero mudança de schema/RLS/grants;
- harmonização documental proporcional foi feita;
- testes/build/CI estão verdes;
- relatório está publicado;
- branch foi enviada ao GitHub;
- `estado.md` está em **EXECUTADA — CANDIDATA A FECHAMENTO DA FASE 1 — AGUARDANDO AUDITORIA GPT**.

Nenhuma Fase 2 ou rodada posterior é autorizada por esta conclusão.
