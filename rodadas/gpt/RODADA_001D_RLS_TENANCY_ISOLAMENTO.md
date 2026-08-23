# RODADA 001D — DEFAULT PRIVILEGES + GRANTS + RLS + ISOLAMENTO

Status: **AUTORIZADA**
Data: 2026-08-22

Branch esperada:

`claude/rodada-001d-rls-tenancy-isolamento`

Relatório esperado:

`rodadas/claude/RELATORIO_RODADA_001D_RLS_TENANCY_ISOLAMENTO.md`

## 0. Objetivo

Fechar a fundação de autorização multi-tenant sobre as tabelas já promovidas:

- corrigir default privileges inseguros do schema `public`;
- definir grants mínimos para `organizations` e `organization_members`;
- criar policies RLS não recursivas baseadas em membership;
- provar isolamento real com **2 usuários × 2 organizações** usando sessões/JWTs reais;
- manter escrita direta do browser fechada nesta etapa.

Esta rodada fecha autorização de leitura e isolamento da fundação. **Não cria novas tabelas de domínio**, não cria onboarding e não implementa criação de organização pela aplicação.

---

## 1. Precondições

Antes de escrever:

- repo único: `rpbrito-art/trafegopago`;
- pasta local esperada: `C:\Users\rpbri\Documents\trafegopago`;
- Supabase único: project ref `cbnxdoxpyioxjwgjhbtq`;
- partir da `main` atualizada e limpa;
- usar somente a branch esperada;
- não tocar `rpbrito-art/business-weaver` nem outro projeto Supabase.

Preflight mínimo:

```bash
pwd
git rev-parse --show-toplevel
git remote -v
git branch --show-current
git status -sb
git fetch --all --prune
supabase --version
```

Confirmar link do project ref antes de qualquer mutação remota.

---

## 2. READ SET — obrigatório e mínimo

Ler integralmente:

1. `estado.md`
2. `.gpt/PROJECT_PROMPT.md`
3. `docs/00-governanca/ACTIVE_DOCS.md`
4. este mandato
5. `docs/03-canonical/DATA_MODEL.md` — seções 1, 2, 16 e 17
6. `docs/03-canonical/SECURITY_MODEL.md` — seções 4, 5, 6, 12, 15, 18, 20 e 24

Leitura dirigida:

- `docs/03-canonical/TECHNICAL_SPEC.md` — Organizations, multi-tenancy e segurança;
- migrations promovidas `20260822212544_*` e `20260822234354_*`;
- `supabase/config.toml` e migration history atual.

Histórico:

- usar `docs/00-governanca/HISTORY_SUMMARY.md` antes de abrir relatórios antigos;
- não ler relatórios antigos completos por padrão.

Documentação externa vigente:

- revalidar docs oficiais Supabase para grants/Data API, RLS, `auth.uid()`, policies e default privileges;
- usar `supabase --help`/subcomandos `--help` para CLI;
- não confiar em sintaxe memorizada.

---

## 3. Baseline conhecido que deve ser reconfirmado

Antes da migration, provar:

- `public.organizations` e `public.organization_members` existem;
- ambas têm RLS habilitado;
- ambas têm zero policies;
- ACL atual das duas tabelas não inclui `anon`/`authenticated`;
- `ensure_rls` continua ativo;
- `pg_default_acl` ainda concede privilégios de novas tabelas a `anon`/`authenticated` para os owners observados (`postgres` e `supabase_admin`), salvo mudança remota posterior;
- nenhuma outra tabela de domínio foi criada.

Se o baseline materialmente divergir do `estado.md`, parar antes de mutar.

---

## 4. Hardening de default privileges

A migration desta rodada deve tornar a exposição futura **opt-in**, sem depender de REVOKE manual após cada criação.

### 4.1 Tabelas

Para cada role criadora que efetivamente possua defaults em `public` — baseline esperado: `postgres` e `supabase_admin` — revogar dos defaults de novas tabelas pelo menos:

- `anon`;
- `authenticated`.

Objetivo: nova tabela em `public` não nascer acessível a papéis de browser.

`service_role` pode permanecer com default privilege se isso for necessário ao padrão atual do projeto; não ampliar privilégios além do baseline. Registrar a decisão no relatório.

### 4.2 Funções

Fechar também a pendência conhecida de futuras funções próprias:

- revogar default `EXECUTE` de `PUBLIC`, `anon` e `authenticated` para funções futuras em `public`, para cada role criadora relevante;
- não alterar a ACL efetiva de `public.rls_auto_enable()` além do que já foi promovido na 001A;
- não criar função própria persistente nesta rodada.

### 4.3 Sequências

Se `pg_default_acl` mostrar grants automáticos de sequência aos papéis de browser para as roles criadoras relevantes, revogar esses defaults também. Não criar regra desnecessária se o baseline não existir; registrar o que foi observado.

### 4.4 Segurança da mudança

- tudo via migration versionada;
- não editar Dashboard para DDL;
- não alterar default privileges de schemas fora de `public`;
- se `supabase_admin` não puder ser tratado de forma reprodutível por migration com o papel executor autorizado, **parar antes de aplicar solução parcial** e reportar ao GPT;
- não usar bypass improvisado nem SQL ad hoc persistente.

---

## 5. Grants mínimos das tabelas atuais

Configuração final desejada:

### `anon`

- nenhum `SELECT/INSERT/UPDATE/DELETE` em `organizations`;
- nenhum `SELECT/INSERT/UPDATE/DELETE` em `organization_members`.

### `authenticated`

Conceder somente:

- `SELECT` em `organizations`;
- `SELECT` em `organization_members`.

Não conceder nesta rodada:

- `INSERT`;
- `UPDATE`;
- `DELETE`;
- `TRUNCATE`;
- `REFERENCES`;
- `TRIGGER`.

### `service_role`

Preservar acesso server-side necessário já existente; não reduzir silenciosamente sem necessidade.

Motivo do corte: a criação/mutação de organização e membership será desenhada em etapa própria. Nesta 001D, o browser é **read-only** sobre a fundação de tenancy.

---

## 6. Policies RLS — desenho autorizado

Não usar `user_metadata`, `auth.role()` ou claims editáveis pelo usuário.

Usar `TO authenticated` e `(select auth.uid())` conforme padrão oficial vigente.

### 6.1 `organization_members` — SELECT próprio

Criar policy que permita ao usuário autenticado ler **somente a própria linha de membership**:

- `user_id = (select auth.uid())`;
- `auth.uid()` não nulo de forma explícita se a sintaxe final escolhida exigir clareza adicional.

Não permitir ao usuário listar memberships de outros usuários, mesmo dentro da própria organização, nesta rodada.

Nenhuma policy de INSERT/UPDATE/DELETE.

### 6.2 `organizations` — SELECT por membership ativa

Criar policy de SELECT para `authenticated` que permita ler uma organização somente quando:

- existe `organization_members` da mesma `organization_id`;
- `user_id = (select auth.uid())`;
- membership está `ACTIVE`;
- organização está `ACTIVE`.

A policy deve permanecer **não recursiva**: a policy de `organization_members` não pode depender de `organizations` nem consultar a própria tabela de modo recursivo.

### 6.3 Roles

Nesta rodada `owner|admin|member` **não alteram o direito de leitura**: qualquer membership ativa lê a própria organização e a própria linha de membership.

Nenhum desses papéis recebe mutação direta pelo browser. A prova deve demonstrar que `owner` não ganha escrita apenas pelo valor da coluna `role`.

### 6.4 Funções privilegiadas

Não criar helper `SECURITY DEFINER` se o desenho acima funcionar corretamente.

Se o Claude encontrar uma limitação real que exija função privilegiada, **parar e reportar antes de criar**. Não usar `SECURITY DEFINER` para contornar recursão/permissão sem nova decisão GPT.

---

## 7. Migration e aplicação

- conferir migration history local/remoto;
- criar migration com `supabase migration new <nome>` ou comando oficial vigente descoberto pela CLI;
- nenhum timestamp manual;
- aplicar pelo caminho oficial de migrations ao project ref autorizado;
- se `supabase db push` for bloqueado pelo classificador, concluir antes todas as verificações não destrutivas e concentrar em um único gate humano; não contornar por MCP/SQL ad hoc.

Rollback conceitual deve ser descrito no relatório, mas não executado: remover policies/grants adicionados e restaurar default privileges anteriores apenas se necessário em rollback formal.

---

## 8. Prova dos default privileges

Não basta inspecionar apenas `pg_default_acl`.

Depois da migration:

1. confirmar catalogicamente que defaults de `anon/authenticated` foram removidos para novas tabelas das roles criadoras relevantes;
2. executar prova transacional/reversível criando uma tabela-probe em `public` e confirmar:
   - RLS auto-habilitado por `ensure_rls`;
   - `anon` e `authenticated` não recebem grants automáticos;
3. se defaults de funções foram alterados, criar em transação uma função **SECURITY INVOKER** inofensiva de prova e confirmar `PUBLIC/anon/authenticated` sem `EXECUTE`, seguido de rollback;
4. se houver defaults de sequência tratados, provar da mesma forma quando tecnicamente simples.

Não deixar objeto-probe residual.

Quando houver mais de uma role criadora (`postgres`/`supabase_admin`), provar ambas quando `SET ROLE`/mecanismo oficial seguro estiver disponível. Se não for possível provar uma delas por execução, combinar catálogo + explicação técnica e destacar para auditoria GPT.

---

## 9. Prova adversarial real — 2 usuários × 2 organizações

Esta é a prova central da 001D.

### 9.1 Fixtures temporárias

Criar de forma controlada:

- usuário A temporário;
- usuário B temporário;
- organização A;
- organização B;
- membership A → org A;
- membership B → org B.

Preferir criação de usuários pela API administrativa oficial do Supabase usando segredo server-side já disponível localmente, sem expor senha/token/e-mail no relatório ou Git.

Pode usar roles diferentes na fixture, por exemplo A=`owner`, B=`member`, para provar que role não amplia acesso de escrita nesta etapa.

### 9.2 Sessões reais

Obter sessões/JWTs reais para A e B por Auth oficial e executar as leituras pelo cliente/Data API com publishable key, não apenas `SET ROLE` no SQL.

Provar no mínimo:

- A lista/consulta org A → permitido;
- A tenta ler org B → zero linhas/negado pela RLS;
- B lista/consulta org B → permitido;
- B tenta ler org A → zero linhas/negado;
- A lê própria membership → permitido;
- A tenta ler membership de B → zero linhas;
- B lê própria membership → permitido;
- B tenta ler membership de A → zero linhas;
- usuário autenticado sem membership não acessa tenant, se for possível provar sem adicionar um terceiro usuário permanente; pode usar estado intermediário controlado de uma das fixtures;
- `anon` não consegue ler as tabelas;
- A/B não conseguem INSERT/UPDATE/DELETE nem em própria org nem em org alheia por ausência de grant/policy;
- valor `role='owner'` não permite bypass de escrita.

### 9.3 Limpeza

Ao fim:

- remover organizações de prova;
- confirmar cascade das memberships;
- remover usuários temporários pela API administrativa;
- confirmar zero resíduo de fixtures da 001D;
- não remover o usuário real já existente no projeto.

Nenhuma PII deve aparecer no relatório.

---

## 10. Advisor e auditoria de segurança

Após a migration e as provas:

- rodar Security Advisor;
- os INFO `rls_enabled_no_policy` das duas tabelas devem desaparecer;
- o WARN conhecido `auth_leaked_password_protection` pode permanecer e não bloqueia esta rodada se for o único WARN pré-existente;
- qualquer novo WARN/ERROR de banco/RLS é bloqueante até explicação/correção;
- confirmar que `rls_auto_enable()` continua com ACL segura da 001A;
- confirmar `ensure_rls` ativo.

---

## 11. Fora de escopo

Expressamente proibido nesta 001D:

- nova tabela de domínio;
- `business_profiles`;
- onboarding;
- endpoint/action para criar organização;
- convite de membros;
- alteração de role pela aplicação;
- ownership transfer;
- UI de organizations;
- policy para listar todos os membros de uma org;
- policies de escrita de organization/membership;
- função `SECURITY DEFINER` persistente sem nova autorização;
- Meta/Instagram;
- campanhas/leads;
- IA;
- pagamentos;
- deploy.

Não iniciar etapa seguinte.

---

## 12. Gates de engenharia — eficientes

A rodada deve alterar SQL + documentação de handoff e, possivelmente, script de prova isolado se necessário.

- não rodar `npm ci` local se package/lockfile não mudarem;
- se nenhum TS/JS de runtime mudar, não rodar bateria frontend inteira por ritual;
- executar `git diff --check`;
- executar as provas SQL/Auth/Data API relevantes;
- se script JS de teste for alterado/criado, rodar somente testes/lint pertinentes se possível;
- CI remota completa sobre o head final continua obrigatória.

Mudança de código de produto fora do necessário à prova é desvio de escopo.

---

## 13. Git e handoff

- não trabalhar na `main`;
- não force push;
- não mergear/promover;
- preferir um único push final auditável;
- relatório alvo ≤150 linhas/15 KB;
- não colar logs extensos, JWTs, tokens, e-mails ou SQL inteiro no relatório.

Atualizar `estado.md` ao final para:

`RODADA 001D — EXECUTADA — AGUARDANDO AUDITORIA GPT`

sem autorizar qualquer etapa posterior.

---

## 14. Critério de conclusão

A 001D só pode ser entregue para auditoria se:

- default privileges inseguros de novas tabelas em `public` estiverem corrigidos para as roles criadoras relevantes;
- default EXECUTE inseguro de futuras funções em `public` estiver corrigido sem quebrar `rls_auto_enable()`;
- `authenticated` tiver somente SELECT nas duas tabelas atuais;
- `anon` continuar sem acesso;
- policies RLS não recursivas estiverem ativas;
- leitura própria funcionar e leitura cross-tenant falhar em sessões reais;
- escrita direta do browser falhar inclusive para `owner`;
- 2 usuários × 2 organizações tiverem sido provados e limpos;
- nenhuma fixture/objeto-probe tiver restado;
- Advisor não apresentar regressão nova de banco/RLS;
- migration local/remota estiver alinhada;
- CI final estiver verde;
- relatório compacto e `estado.md` estiverem entregues.

Ao concluir, **pare aguardando auditoria GPT**.