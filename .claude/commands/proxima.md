---
description: Tráfego Pago — reconstrói o contexto canônico (estado.md + mandato vigente) e executa somente a próxima ação formalmente autorizada
argument-hint: "[opcional: observação ou restrição adicional]"
disable-model-invocation: true
---

# /proxima — EXECUTOR DETERMINÍSTICO DO PROJETO TRÁFEGO PAGO

`/proxima` **não** significa "faça o que você acha que vem depois".

Significa: **"leia o estado canônico, reconstrua o contexto documental e execute
somente a próxima ação formalmente autorizada"**.

Idioma de comunicação: **Português do Brasil**.

Argumento opcional do usuário (pode estar vazio): $ARGUMENTS

Se houver argumento, ele é apenas comentário/restrição adicional. Ele **nunca** cria
mandato, **nunca** autoriza execução e **nunca** sobrepõe `estado.md`.

---

## REGRA SOBERANA

A fonte operacional primária é `estado.md` na raiz do repositório.
O mandato executável é o arquivo em `rodadas/gpt/` indicado por `estado.md`.

Nada do que estiver na memória da conversa, em relatórios antigos, em `.gpt/CURRENT_STATE.md`
ou neste próprio arquivo substitui esses dois documentos.

Se este comando divergir do mandato vigente, **o mandato vence** — exceto nas
proibições da seção "PROIBIÇÕES PERMANENTES", que só podem ser levantadas por
autorização explícita e escrita dentro do próprio mandato.

---

## PASSO 1 — PREFLIGHT DE REPOSITÓRIO (BLOQUEANTE)

Antes de qualquer leitura profunda, escrita ou comando de build, execute e registre a saída de:

```bash
pwd
git rev-parse --show-toplevel
git remote -v
git branch --show-current
git status
```

Critérios de aceite do preflight:

- diretório raiz do git = `C:\Users\rpbri\Documents\trafegopago`
  (equivalente POSIX `/c/Users/rpbri/Documents/trafegopago`);
- remote `origin` apontando para `rpbrito-art/trafegopago`;
- existência de `estado.md` e `.gpt/PROJECT_PROMPT.md` na raiz.

Se **qualquer** critério falhar — em especial se o remote for `rpbrito-art/business-weaver`,
que pertence a **outro projeto e é expressamente proibido nesta rotina** —
**pare imediatamente, não altere nenhum arquivo** e reporte:

- o que foi encontrado;
- o que era esperado;
- o que o usuário precisa fazer para corrigir.

Nunca "corrija" o repositório por conta própria (nada de `git remote set-url`, clone,
troca de pasta ou criação de repositório).

---

## PASSO 2 — ATUALIZAR CONHECIMENTO DO GIT (NÃO DESTRUTIVO)

Atualize apenas referências remotas, sem tocar na working tree:

```bash
git fetch --all --prune
git status -sb
git log --oneline -5
```

**Proibido automaticamente:** `merge`, `rebase`, `reset`, `checkout` destrutivo,
`clean`, `stash drop`, `push --force`, reescrita de histórico.

Se houver divergência entre local e remoto (ahead e behind simultâneos), conflito
pendente, rebase/merge em andamento, ou working tree suja de forma que torne inseguro
prosseguir: **pare e reporte**, descrevendo a divergência e as opções.
Arquivos não rastreados irrelevantes ao mandato não bloqueiam por si só, mas devem
ser mencionados no relatório.

---

## PASSO 3 — LER O ESTADO OPERACIONAL

Leia **integralmente** `estado.md`. Nunca pule este arquivo, nunca leia parcialmente,
nunca deduza a próxima tarefa pela memória da conversa.

Extraia e registre explicitamente:

- etapa atual;
- rodada atual;
- status da rodada;
- correção em andamento (se houver);
- mandato vigente (caminho em `rodadas/gpt/`);
- relatório esperado (caminho em `rodadas/claude/`);
- branch esperada;
- próxima ação permitida.

---

## PASSO 4 — BOOTSTRAP DOCUMENTAL

Leia `.gpt/PROJECT_PROMPT.md` integralmente. Depois leia os documentos que ele e o
`estado.md` indicarem. Quando relevantes ao mandato vigente:

```text
README.md
docs/00-governanca/PROJECT_CHARTER.md
docs/00-governanca/IMPLEMENTATION_ROADMAP.md
docs/01-produto/MVP_CANONICAL.md
docs/02-research/RESEARCH_SYNTHESIS.md
docs/03-canonical/TECHNICAL_SPEC.md
docs/03-canonical/DATA_MODEL.md
docs/03-canonical/API_CONTRACTS.md
docs/03-canonical/SECURITY_MODEL.md
docs/03-canonical/AI_ARCHITECTURE.md
```

Se o mandato vigente delimitar claramente o subconjunto necessário, não é obrigatório
reler tudo. Mas é **sempre obrigatório** ler: `estado.md`, `.gpt/PROJECT_PROMPT.md`
e o mandato vigente.

Precedência documental: `docs/03-canonical/` prevalece sobre `docs/02-research/`.
`.gpt/CURRENT_STATE.md` é arquivo de compatibilidade e não mantém estado paralelo.

---

## PASSO 5 — ABRIR O MANDATO VIGENTE

Abra e leia integralmente o arquivo em `rodadas/gpt/` indicado por `estado.md`.
Ele é a instrução executável da rodada ou correção atual.

Não procure uma rodada "mais nova" por conta própria. Se `estado.md` já aponta o
mandato vigente, esse é o mandato — mesmo que existam arquivos mais recentes na pasta.

Se o arquivo indicado não existir, **pare e reporte** (estado inconsistente).

---

## PASSO 6 — DETERMINAR SE EXISTE AUTORIZAÇÃO PARA EXECUTAR

Só execute código, migrations, alterações, commits ou integrações se o mandato
vigente autorizar **explicitamente**.

**Não inicie nada** se o estado indicar qualquer um destes:

- aguardando auditoria GPT;
- bloqueado;
- aguardando correção;
- concluído;
- sem mandato vigente;
- mandato apontado inexistente ou ilegível.

Nesses casos vá direto para o **CASO B** (abaixo).

---

## PASSO 7 — EXECUTAR SOMENTE O ESCOPO AUTORIZADO

Havendo mandato executável:

- cumpra-o integralmente;
- respeite rigorosamente os itens declarados fora de escopo;
- não antecipe fases;
- não invente arquitetura ou contratos estruturais;
- não introduza dependências, serviços ou ferramentas sem justificativa registrada;
- não altere documentos canônicos silenciosamente;
- não use outro repositório;
- não use outro projeto Supabase;
- não promova a própria execução.

Se encontrar contradição entre o mandato e a documentação canônica: **pare, não escolha
silenciosamente uma interpretação** e registre a inconsistência (no relatório e na
resposta ao usuário).

---

## PASSO 8 — SUPABASE

Quando a rodada envolver Supabase:

- confirme **primeiro** que o projeto correto está vinculado
  (`supabase/.temp/project-ref` e comandos equivalentes da CLI);
- nunca altere outro projeto;
- preserve migrations versionadas (não reescreva nem apague migrations já aplicadas);
- não exponha secrets — service role, tokens e chaves somente server-side, nunca em
  código cliente, log, commit ou relatório;
- siga as regras canônicas de RLS, multi-tenancy por organização e segurança;
- execute as provas exigidas pelo mandato.

**Uma migration não está concluída só porque o banco a aceitou.** Verifique o
comportamento resultante (tabelas, constraints, políticas RLS efetivas, negação de
acesso cruzado entre tenants) com provas reproduzíveis.

---

## PASSO 9 — VERIFICAÇÕES

Execute todos os testes e gates exigidos pela rodada. Quando aplicáveis ao estágio atual:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Mais as provas específicas de domínio, banco, RLS, integração ou segurança determinadas
no mandato.

Registre comando + resultado real. **Nunca** relate um gate como aprovado sem ter
executado. Se um gate falhar e você não conseguir corrigir dentro do escopo autorizado,
reporte a falha com a saída real — não a esconda e não a contorne.

---

## PASSO 10 — RELATÓRIO DO CLAUDE

Ao concluir, escreva o relatório no caminho exato especificado por `estado.md`, dentro
de `rodadas/claude/`.

O relatório deve conter evidências suficientes para auditoria independente pelo GPT,
incluindo, quando aplicável:

- preflight (saídas de repositório/branch/status);
- arquivos alterados;
- decisões tomadas e justificativas;
- migrations;
- provas;
- testes;
- comandos executados;
- resultados obtidos;
- branch;
- commit SHA;
- push;
- pendências;
- riscos;
- divergências encontradas;
- estado final.

---

## PASSO 11 — ATUALIZAR `estado.md`

Atualize **somente** os campos de execução que a rodada autorizar. Normalmente:

- rodada executada;
- status: `AGUARDANDO AUDITORIA GPT`;
- branch;
- commit;
- relatório entregue;
- bloqueios ou pendências.

**Você NÃO pode:**

- marcar a própria execução como aprovada;
- promover a próxima rodada;
- criar por conta própria um novo mandato em `rodadas/gpt/`;
- declarar uma fase encerrada sem auditoria do GPT.

---

## PASSO 12 — GIT

- siga a estratégia de branch definida pelo mandato;
- **não** faça merge na `main` automaticamente;
- **não** faça force push;
- **não** reescreva histórico salvo autorização explícita e escrita no mandato;
- commits devem ser descritivos e referenciar a rodada.

---

## PROIBIÇÕES PERMANENTES

1. Operar em qualquer repositório que não seja `rpbrito-art/trafegopago`.
   `rpbrito-art/business-weaver` é outro projeto e está **proibido** nesta rotina.
2. Executar implementação sem mandato vigente autorizado em `estado.md`.
3. Auto-aprovar execução, auto-promover rodada ou criar o próprio mandato.
4. `merge` na `main`, `push --force`, `reset --hard`, reescrita de histórico automáticos.
5. Alterar projeto Supabase diferente do vinculado ao projeto.
6. Expor ou commitar secrets.
7. Apresentar funcionalidade simulada como real, ou gate não executado como aprovado.

---

## RESULTADO ESPERADO DE `/proxima`

### CASO A — existe rodada/correção autorizada

preflight → bootstrap documental → execução do escopo autorizado → testes/provas →
relatório em `rodadas/claude/` → atualização controlada de `estado.md` → entrega do
resultado ao usuário com: rodada executada, branch, commit, gates, pendências e
próxima ação (auditoria do GPT).

### CASO B — não existe execução autorizada

preflight → bootstrap documental → **nenhuma alteração de código** → informe ao usuário:

- etapa e rodada atuais;
- status exato;
- mandato vigente (ou ausência dele);
- por que não há autorização para executar;
- **qual agente precisa agir a seguir** (GPT planejando/auditando, ou o fundador
  decidindo algo) e o que exatamente é esperado desse agente.

Em ambos os casos, termine sua resposta com um resumo curto e verificável do estado
final do repositório.
