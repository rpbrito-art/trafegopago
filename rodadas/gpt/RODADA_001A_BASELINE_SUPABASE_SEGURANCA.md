# TRÁFEGO PAGO — RODADA 001A — BASELINE SUPABASE E SEGURANÇA

Status: **AUTORIZADA PELO FUNDADOR EM 2026-08-22**

Esta rodada é a primeira parte da Fundação de Identidade e Tenancy. Ela prepara e endurece a base antes de Auth, Organizations e RLS de domínio.

## 0. Repositório e projeto únicos autorizados — gate bloqueante

Repositório único:

`rpbrito-art/trafegopago`

Pasta local esperada:

`C:\Users\rpbri\Documents\trafegopago`

Supabase project ref único autorizado:

`cbnxdoxpyioxjwgjhbtq`

`rpbrito-art/business-weaver` e qualquer outro repositório/projeto Supabase estão fora de escopo.

Antes de qualquer escrita, registre:

```bash
pwd
git rev-parse --show-toplevel
git remote -v
git branch --show-current
git status -sb
git fetch --all --prune
supabase --version
```

Confirme também o project ref vinculado localmente. Se repositório ou project ref divergirem, pare sem alterar nada.

Observação conhecida: o projeto Supabase correto aparece atualmente no painel com o nome `quoron`. O nome é cosmético; **não renomeie o projeto nesta rodada**.

## 1. Bootstrap documental obrigatório

Leia integralmente, nesta ordem:

1. `estado.md`;
2. `.gpt/PROJECT_PROMPT.md`;
3. `rodadas/gpt/AUDITORIA_RODADA_000_BOOTSTRAP_TECNICO.md`;
4. este mandato;
5. `docs/00-governanca/PROJECT_CHARTER.md`;
6. `docs/00-governanca/IMPLEMENTATION_ROADMAP.md`;
7. `docs/03-canonical/TECHNICAL_SPEC.md`;
8. `docs/03-canonical/DATA_MODEL.md`;
9. `docs/03-canonical/SECURITY_MODEL.md`;
10. `docs/03-canonical/API_CONTRACTS.md`.

Leia os demais documentos apenas quando necessários para resolver alguma dependência.

## 2. Verificação de documentação atual — obrigatória antes de DDL

Supabase muda com frequência. Antes de implementar:

1. consulte o changelog/documentação oficial vigente relevante a CLI, migrations, RLS, Security Advisor, Data API e funções `SECURITY DEFINER`;
2. confira a sintaxe atual da CLI por `supabase --help` e pelos `--help` dos subcomandos usados;
3. não confie em sintaxe memorizada ou documentação antiga;
4. registre no relatório quais fontes oficiais atuais sustentaram as decisões críticas.

Se a documentação vigente contradizer os contratos canônicos em ponto material, não contorne silenciosamente: pare e reporte.

## 3. Estado conhecido da auditoria

A Rodada 000 foi aprovada e promovida.

O banco remoto não possui tabelas de domínio e o histórico de migrations do projeto estava vazio na auditoria.

O Supabase Security Advisor encontrou o seguinte objeto pré-existente:

`public.rls_auto_enable()`

Características auditadas:

- `SECURITY DEFINER`;
- owner `postgres`;
- ligado ao event trigger `ensure_rls`;
- o trigger atua em `CREATE TABLE`, `CREATE TABLE AS` e `SELECT INTO`;
- função usada para habilitar RLS automaticamente em novas tabelas `public`;
- `EXECUTE` atualmente concedido a `PUBLIC`, `anon` e `authenticated`;
- Security Advisor gera warnings por essa exposição.

A Rodada 001A deve endurecer isso **sem destruir o mecanismo de auto-enable RLS**.

## 4. Objetivo da rodada

Ao final desta rodada deve existir:

- baseline de segurança do Supabase conhecida e documentada;
- primeira migration versionada do projeto, se necessária para o hardening aprovado;
- privilégios de `public.rls_auto_enable()` endurecidos de forma reproduzível;
- prova de que `ensure_rls` continua habilitando RLS automaticamente;
- Security Advisor reexecutado e sem os warnings indevidos desse objeto;
- `/proxima` versionado no repositório;
- normalização de line endings versionada;
- nenhum domínio, Auth ou tenancy ainda implementado.

## 5. Escopo autorizado

### 5.1 Baseline e inventário do banco

Antes de alterar DDL, registre de forma não destrutiva:

- migration history remoto;
- tabelas existentes em `public`;
- funções próprias/relevantes em `public`;
- event triggers relevantes;
- ACL/privilégios de `public.rls_auto_enable()`;
- estado do Security Advisor.

Diferencie objetos Supabase/plataforma de objetos pertencentes ao produto.

Não faça `db pull` indiscriminado que transforme objetos gerenciados pela plataforma em schema do produto sem justificativa.

### 5.2 Migration versionada de hardening

Qualquer DDL persistente desta rodada deve estar representado por migration criada pela CLI atual (use o comando oficial descoberto via `--help`; não invente nome/timestamp manualmente).

A migration deve ser mínima e focada no hardening necessário.

Para `public.rls_auto_enable()`:

- verifique a abordagem correta na documentação atual;
- remova/restrinja capacidade de execução por papéis públicos (`PUBLIC`, `anon`, `authenticated`) quando tecnicamente seguro;
- não altere a lógica interna da função se isso não for necessário;
- não remova/desabilite o event trigger `ensure_rls`;
- não use `SECURITY DEFINER` como atalho para corrigir permissões futuras.

Não crie tabelas de domínio permanentes nesta rodada.

### 5.3 Prova real do auto-enable RLS

Depois do hardening, prove de forma controlada e reversível que:

1. uma tabela de teste criada em `public` recebe RLS automaticamente;
2. o event trigger continua operacional;
3. a tabela de prova não permanece no banco ao final.

Prefira uma prova transacional/rollback quando tecnicamente correta. Se a plataforma/DDL impedir esse desenho, use uma criação/remoção explícita e documentada, garantindo limpeza final.

Apenas consultar a existência do trigger **não é prova suficiente**.

### 5.4 Security Advisor

Execute o Security Advisor:

- antes da mudança;
- depois da mudança.

A rodada não passa se os warnings de execução pública de `rls_auto_enable()` continuarem sem justificativa técnica formal.

Registre qualquer outro warning encontrado, distinguindo:

- criado pela rodada;
- pré-existente;
- relevante para as próximas fases.

### 5.5 Protocolo `/proxima`

Existe localmente:

`.claude/commands/proxima.md`

Essa pendência foi registrada na auditoria da Rodada 000.

Nesta rodada:

- leia o arquivo local;
- confirme que ele implementa o protocolo aprovado: `estado.md` → bootstrap documental → mandato vigente → executar somente se autorizado → relatório → aguardar auditoria;
- confirme que bloqueia operação fora de `rpbrito-art/trafegopago`;
- versioná-lo em `.claude/commands/proxima.md`.

Se o conteúdo local divergir materialmente do protocolo canônico, não substitua silenciosamente; corrija apenas para aderir ao comportamento já aprovado e descreva o diff no relatório.

### 5.6 Line endings

Adicionar `.gitattributes` simples e apropriado ao projeto para normalizar arquivos de texto e reduzir ruído Windows/Linux.

Não faça uma regravação massiva de todo o repositório só para trocar line endings nesta rodada. Evite diff cosmético gigante.

## 6. Explicitamente fora de escopo

NÃO implementar:

- cadastro/login;
- confirmação de e-mail;
- `proxy.ts` de Auth;
- Organizations;
- Membership;
- tabelas de negócio;
- policies RLS do domínio;
- onboarding;
- Meta/Instagram;
- campanhas;
- leads;
- IA;
- filas de domínio;
- pagamentos;
- deploy;
- n8n/Make;
- renome do projeto Supabase.

A Rodada 001B será responsável por Auth somente após esta rodada passar pela auditoria GPT.

## 7. Git e branch

Parta da `main` atualizada após o merge da Rodada 000.

Branch esperada:

`claude/rodada-001a-baseline-supabase-seguranca`

Não trabalhe diretamente na `main`.

A presença inicial de `.claude/commands/proxima.md` como arquivo local/untracked é **esperada** e não deve, isoladamente, bloquear o preflight. Nenhum outro arquivo inesperado deve ser absorvido sem investigação.

Não force push e não faça merge na `main`.

## 8. Provas obrigatórias de aplicação

Após a migration/hardening:

- confira migration list local/remoto;
- prove o ACL final da função;
- prove o event trigger ativo;
- execute a prova real de criação temporária de tabela + RLS automático + limpeza;
- rode Security Advisor novamente;
- confira que não surgiram tabelas de domínio inesperadas.

A migration deve ser idempotente no sentido operacional esperado pelo mecanismo de migrations: não pode depender de estado local oculto ou Dashboard manual.

## 9. Gates do código

Mesmo sendo rodada majoritariamente de infraestrutura, execute ao final:

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

A CI deve passar na branch.

Revise também:

```bash
git status
git diff
```

## 10. Segurança

Bloqueadores:

- secret real versionado;
- `service_role`/secret key exposta ao browser;
- migration aplicada sem arquivo versionado correspondente;
- warning relevante de `rls_auto_enable()` mantido sem justificativa;
- event trigger quebrado;
- tabela de prova deixada no remoto;
- DDL fora do project ref autorizado;
- alteração de outro repositório/Supabase.

## 11. Handoff obrigatório

Ao concluir, grave:

`rodadas/claude/RELATORIO_RODADA_001A_BASELINE_SUPABASE_SEGURANCA.md`

O relatório deve conter no mínimo:

### Preflight
- diretório, remote, branch, working tree;
- Supabase CLI;
- project ref confirmado.

### Pesquisa/documentação atual
- documentação oficial consultada;
- decisões afetadas por versão atual.

### Baseline anterior
- migrations;
- objetos `public` relevantes;
- definição/resumo do trigger/função;
- ACL anterior;
- Security Advisor anterior.

### Implementação
- migration criada;
- SQL/DDL efetivamente aplicado;
- `.claude/commands/proxima.md` versionado;
- `.gitattributes` e demais arquivos.

### Provas Supabase
- migration list;
- ACL final;
- trigger final;
- prova real de auto-enable RLS;
- limpeza da tabela de teste;
- Security Advisor final.

### Gates
- lint;
- typecheck;
- testes;
- build;
- CI.

### Git
- branch;
- commits;
- push;
- working tree final.

### Pendências/riscos
- qualquer warning remanescente;
- qualquer decisão que deva entrar na Rodada 001B.

## 12. Atualização de `estado.md`

Ao finalizar, atualize `estado.md` somente para registrar:

- Rodada 001A como `EXECUTADA — AGUARDANDO AUDITORIA GPT`;
- branch/head/commit relevante;
- caminho do relatório;
- estado dos gates;
- resultado dos Advisors;
- bloqueios/pendências.

Não marque a rodada como aprovada. Não autorize 001B.

## 13. Commit e push

Somente após as provas locais/remotas e os gates passarem:

- revise o diff;
- faça commit(s) descritivo(s) na branch da rodada;
- faça push;
- observe a CI real;
- atualize o relatório com o resultado final da CI em commit de handoff, se necessário.

Não abra merge automático e não promova a rodada.

## 14. Critério de sucesso

A Rodada 001A só está pronta para auditoria quando pudermos afirmar, com prova:

> O banco remoto correto está conhecido, o hardening do mecanismo automático de RLS está versionado e seguro, o mecanismo continua funcionando, o Security Advisor foi revalidado, o protocolo `/proxima` é reproduzível pelo Git e nenhuma funcionalidade de domínio foi antecipada.
