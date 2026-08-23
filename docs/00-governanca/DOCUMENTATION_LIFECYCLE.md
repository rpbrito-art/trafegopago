# CICLO DE VIDA E EFICIÊNCIA DOCUMENTAL — TRÁFEGO PAGO

Status: canônico
Atualizado: 2026-08-23

## 1. Objetivo

Preservar rastreabilidade sem transformar histórico, documentação e provas em custo crescente de contexto.

Princípios:

`preservar tudo ≠ ler tudo`

`rigor ≠ repetição`

`evidência suficiente ≠ maior quantidade possível de evidência`

Fonte operacional: `estado.md` + conteúdo efetivamente incorporado à `main`.

---

## 2. Classes documentais

### A. HOT do GPT / continuidade

Para novo chat de planejamento/auditoria:

- `.gpt/PROJECT_PROMPT.md`;
- `estado.md`;
- `docs/00-governanca/ACTIVE_DOCS.md`;
- mandato/correção vigente;
- READ SET necessário à decisão.

Quando disponível, o GPT recupera antes o último chat relevante do projeto.

### B. HOT do Claude Code

O executor possui bootstrap próprio e menor:

- `CLAUDE.md` — carregado automaticamente;
- `estado.md`;
- mandato/correção vigente.

Depois disso lê somente o READ SET **OBRIGATÓRIO** do mandato.

**Não são HOT do Claude por padrão:**

- `.gpt/PROJECT_PROMPT.md`;
- `ACTIVE_DOCS.md`;
- `HISTORY_SUMMARY.md`;
- relatórios/auditorias antigos.

Esses arquivos são abertos somente quando o mandato exigir ou surgir dependência concreta/ambiguidade.

### C. ACTIVE CANONICAL

Contratos atuais de produto, arquitetura e segurança. Ler somente as seções relevantes indicadas pelo mandato.

### D. HISTORY / EVIDENCE

Rodadas antigas, relatórios Claude, auditorias GPT, pesquisas, logs e PRs. Não ler por padrão.

Quando histórico for necessário, usar primeiro `HISTORY_SUMMARY.md`; abrir evidência original apenas se o resumo não resolver.

### E. ARCHIVED / SUPERSEDED

Documentos canônicos substituídos podem ir para `docs/99-archive/` se sua presença ativa causar ambiguidade. Não mover por estética.

---

## 3. READ SET por rodada

Todo mandato substantivo deve dividir o READ SET em:

### OBRIGATÓRIO

Somente o mínimo necessário para executar corretamente.

Alvo normal além de `estado.md + mandato`: **até 5 documentos/arquivos**. Mais de 7 exige justificativa explícita.

Sempre que possível apontar **seções**, não o documento inteiro.

### SOB DEMANDA

Material que pode ser aberto se uma dependência concreta surgir.

### NÃO LER POR PADRÃO

Histórico, pesquisas, canônicos fora do escopo e evidência já promovida.

Não incluir no obrigatório apenas “por segurança”:

- roadmap quando o mandato já contém contexto suficiente da fase;
- `HISTORY_SUMMARY.md` sem necessidade histórica;
- migrations antigas sem dependência direta;
- relatórios/auditorias promovidos;
- canônicos inteiros quando poucas seções resolvem o contrato.

---

## 4. Distinção entre documentação e auditoria

O executor não precisa reproduzir a auditoria do GPT.

### Claude

- implementa;
- roda provas proporcionais;
- entrega índice de evidências.

### GPT

- inspeciona diff/código/CI/Supabase independentemente;
- decide suficiência da evidência;
- classifica bloqueios, ressalvas e promoção.

Não exigir ao Claude consultas extras apenas para produzir um relatório mais completo se o GPT pode consultá-las diretamente.

---

## 5. Orçamento de prova

Estado promovido é baseline. A pergunta de cada rodada é:

**“o que mudou e o que essa mudança pode realisticamente quebrar?”**

### Risco A — crítico

Auth, tenancy/RLS, secrets, dinheiro, permissões, endpoint público, mutação externa, idempotência ou migration destrutiva/compartilhada.

Provar o delta, a fronteira crítica e invariantes diretamente afetadas. CI completa final uma vez.

### Risco B — funcional

Regra de domínio, state machine, worker interno, migration não destrutiva, transformação.

Testes afetados + integração principal quando necessária + CI final.

### Risco C — baixo

Docs, comentários, organização e config sem runtime.

Somente checks pertinentes. Não rodar suíte local completa.

### Correções pequenas

Testar:

1. o defeito;
2. o raio de impacto direto;
3. invariantes compartilhadas realmente tocadas.

Não repetir toda a bateria anterior salvo primitive compartilhada alterada, raio de impacto desconhecido ou exigência explícita do GPT.

---

## 6. Execução local e CI

Por padrão:

- `npm ci` local só se dependências/lockfile mudarem, ambiente estiver inconsistente ou mandato exigir;
- testes locais somente novos/afetados;
- lint/typecheck apenas quando relevantes ao delta;
- build local apenas quando build/rotas/configuração forem afetados ou mandato exigir;
- suíte completa do repositório **uma única vez na CI final**.

Não duplicar localmente a mesma suíte completa que será executada na CI sem justificativa concreta.

Operações remotas devem ser agrupadas quando um único snapshot responder vários critérios.

---

## 7. Relatórios do Claude

Relatório é índice, não diário.

Padrão:

- rodada normal: ≤100 linhas / ~10 KB;
- microcorreção: ≤60 linhas / ~6 KB;
- exceder somente por incidente, divergência de segurança ou decisão arquitetural complexa.

Conteúdo:

- preflight resumido;
- arquivos alterados;
- decisões não óbvias;
- `prova → fonte/comando → resultado`;
- migrations/config remota;
- gates/CI;
- branch;
- pendências.

Não copiar logs, SQL/código inteiro, documentação oficial, histórico nem outputs extensos.

---

## 8. ACTIVE_DOCS.md

É índice para GPT/continuidade, não segunda especificação e não leitura obrigatória do Claude.

Deve conter somente:

- fase/rodada/status;
- mandato vigente;
- baseline curto;
- READ SET obrigatório/sob demanda em forma de índice;
- dívidas que afetam a rodada;
- próxima ação.

Alvo: permanecer curto e não repetir o mandato.

---

## 9. HISTORY_SUMMARY.md

Resume somente estado promovido e decisões duradouras.

Para cada rodada:

- objetivo;
- resultado promovido;
- decisão estrutural persistente;
- dívida aberta;
- referência da auditoria/PR.

Não copiar execução detalhada.

---

## 10. Retomadas de branch

Antes de confiar no estado local:

1. `git fetch origin`;
2. comparar branch com `origin/main`;
3. verificar mudanças em `estado.md`, `CLAUDE.md` e mandato/correção;
4. reconciliar governança atual quando seguro;
5. parar apenas diante de conflito substantivo.

O fundador não deve transportar manualmente correções já publicadas no Git.

---

## 11. Gates humanos

Quando resolvível na sessão:

`EXECUÇÃO AUTÔNOMA → GATE HUMANO ATIVO → AÇÃO DO FUNDADOR → EXECUÇÃO RETOMADA → AUDITORIA GPT`

Claude conclui antes tudo que puder sozinho, pede somente a intervenção necessária, aguarda e continua.

---

## 12. Gatilhos de reciclagem

Reciclar dentro da próxima rodada substantiva quando ocorrer:

1. fechamento de fase;
2. cinco rodadas substantivas promovidas desde a última reciclagem;
3. mais de 20 pares mandato/relatório ainda não resumidos;
4. `ACTIVE_DOCS.md` começar a duplicar mandato/canônicos;
5. novo agente precisar abrir repetidamente histórico para compreender o presente;
6. bootstrap do executor voltar a exigir mais de ~5 documentos além de `estado + mandato` sem justificativa.

Não criar rodada isolada de housekeeping se não houver risco operacional.

---

## 13. Auditoria de eficiência de 2026-08-23

Problema encontrado:

- `/proxima` ~13 KB;
- `PROJECT_PROMPT` ~20 KB;
- `estado.md` + `ACTIVE_DOCS` + mandato repetiam regras;
- a 002C originalmente exigia mais de dez itens/documentos antes da implementação;
- correções pequenas vinham repetindo regressões promovidas e relatórios longos.

Decisão incorporada:

- `CLAUDE.md` passa a conter o contrato curto do executor;
- `/proxima` passa a ser apenas orquestrador;
- Claude lê por padrão `estado + mandato + READ SET obrigatório`;
- prompt canônico/ACTIVE_DOCS/histórico deixam de ser leitura ritual do executor;
- prova por delta e orçamento por risco tornam-se regra permanente;
- relatório padrão reduz para ≤100 linhas e microcorreção ≤60;
- suíte completa passa a ser uma única CI final por padrão.

A redução é de repetição, não de rigor.

---

## 14. Resultado esperado

O custo de bootstrap e prova deve permanecer aproximadamente constante mesmo com anos de histórico.

O repositório pode crescer; a quantidade de contexto obrigatório para executar a próxima ação não deve crescer junto.