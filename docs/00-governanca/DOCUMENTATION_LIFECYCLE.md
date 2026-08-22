# CICLO DE VIDA E RECICLAGEM DOCUMENTAL — TRÁFEGO PAGO

Status: canônico
Atualizado: 2026-08-22

## 1. Objetivo

Impedir que o crescimento do histórico do projeto obrigue GPT, Claude Code ou qualquer agente futuro a reler centenas ou milhares de documentos para reconstruir contexto.

O projeto preserva evidência histórica, mas trabalha com um **working set documental pequeno e explícito**.

Princípio:

`preservar tudo ≠ ler tudo`

A fonte de verdade operacional continua sendo `estado.md` + conteúdo efetivamente incorporado à `main`.

---

## 2. Classes documentais

### A. HOT — bootstrap obrigatório

Devem permanecer poucos e curtos:

- `estado.md`;
- `.gpt/PROJECT_PROMPT.md`;
- `docs/00-governanca/ACTIVE_DOCS.md`;
- mandato vigente indicado por `estado.md`, quando houver.

Esses arquivos devem permitir descobrir **o que mais precisa ser lido**, sem obrigar leitura do acervo inteiro.

### B. ACTIVE CANONICAL — ler somente quando relevante

Contratos atuais de produto, arquitetura e segurança, por exemplo:

- `docs/01-produto/MVP_CANONICAL.md`;
- documentos vigentes de `docs/03-canonical/`;
- roadmap/charter quando a rodada depender deles.

Eles não são automaticamente obrigatórios em toda rodada. O mandato deve declarar o subconjunto necessário em seu `READ SET`.

### C. HISTORY / EVIDENCE — não ler por padrão

Inclui:

- rodadas antigas em `rodadas/gpt/`;
- relatórios antigos em `rodadas/claude/`;
- pesquisas em `docs/02-research/`;
- PRs, logs e provas históricas;
- documentos substituídos mas ainda úteis para auditoria.

Esses arquivos continuam no Git para rastreabilidade, mas **não pertencem ao bootstrap normal**.

Quando contexto histórico for necessário, preferir primeiro:

`docs/00-governanca/HISTORY_SUMMARY.md`

Só abrir o documento histórico original se o resumo não for suficiente para a decisão atual.

### D. ARCHIVED / SUPERSEDED

Quando um documento canônico for realmente substituído e mantê-lo no conjunto ativo gerar ambiguidade, ele pode ser movido para `docs/99-archive/`.

Arquivar não apaga histórico. O Git preserva versões anteriores.

Não mover arquivos apenas por estética ou numeração.

---

## 3. READ SET por rodada

Todo mandato substantivo deve conter uma seção `READ SET`.

Ela deve separar:

### Obrigatórios

Somente os documentos necessários para executar corretamente a rodada.

### Sob demanda

Documentos que devem ser abertos apenas se uma dependência concreta surgir.

### Não ler por padrão

Histórico e áreas fora do escopo que não precisam ser consumidos pela IA naquela rodada.

Regra: se um documento não estiver no READ SET e não surgir uma dependência concreta, o executor não deve lê-lo apenas “por segurança”.

Exceções permanentes: `estado.md`, `.gpt/PROJECT_PROMPT.md`, `ACTIVE_DOCS.md` e o mandato vigente são sempre lidos.

---

## 4. ACTIVE_DOCS.md

`docs/00-governanca/ACTIVE_DOCS.md` é o índice compacto do working set atual.

Deve registrar:

- rodada/fase corrente;
- documentos HOT;
- documentos canônicos ativos por área;
- resumo histórico vigente;
- documentos explicitamente históricos;
- data/rodada da última reciclagem;
- próximo gatilho de reciclagem.

O arquivo deve ser mantido curto. Ele é um índice, não uma segunda especificação.

---

## 5. HISTORY_SUMMARY.md

`docs/00-governanca/HISTORY_SUMMARY.md` comprime o passado já promovido.

Para cada rodada encerrada, registrar apenas:

- objetivo;
- resultado promovido;
- decisões estruturais que continuam relevantes;
- ressalvas/dívidas que permanecem abertas;
- links para auditoria/relatório originais.

Não copiar logs, outputs, SQL completo ou narrativa de execução.

O objetivo é permitir reconstruir meses de desenvolvimento em poucos minutos e abrir evidência antiga somente quando necessário.

---

## 6. Gatilhos de reciclagem

A reciclagem documental deve acontecer **dentro da próxima rodada substantiva**, sem criar uma rodada exclusiva, quando qualquer um destes ocorrer:

1. fechamento de uma fase macro;
2. cinco rodadas substantivas promovidas desde a última reciclagem;
3. mais de 20 pares mandato/relatório ainda não resumidos em `HISTORY_SUMMARY.md`;
4. `ACTIVE_DOCS.md` ultrapassar aproximadamente 15 documentos ativos;
5. documentação ativa começar a conter contratos claramente substituídos;
6. novo agente precisar abrir repetidamente documentos históricos para compreender o presente.

Se houver ambiguidade operacional ou risco de executar contrato obsoleto, a reciclagem deixa de ser housekeeping e passa a ser bloqueante.

---

## 7. Procedimento de reciclagem

Quando um gatilho ocorrer:

1. identificar somente o que está **promovido/incorporado**;
2. atualizar `HISTORY_SUMMARY.md` com as rodadas fechadas desde a última reciclagem;
3. atualizar `ACTIVE_DOCS.md` removendo do working set referências que viraram apenas históricas;
4. consolidar duplicações em documentos canônicos atuais quando necessário;
5. mover para `docs/99-archive/` apenas documentos efetivamente substituídos cuja presença ativa gere confusão;
6. preservar links para auditorias/relatórios originais;
7. atualizar `estado.md` somente se a reciclagem mudar a leitura operacional atual;
8. não renumerar fases/rodadas apenas para estética.

Não reescrever histórico de Git e não apagar evidência necessária para auditoria.

---

## 8. Regra de tamanho e duplicação

Documentos canônicos devem conter contrato atual, não diário de bordo.

Relatórios de execução não devem repetir documentação oficial, código inteiro ou consultas completas quando basta referenciar arquivo/comando/resultado.

Se uma decisão já está canônica, relatórios posteriores devem apontar para ela, não reproduzi-la.

Se um relatório antigo tiver 800 linhas, isso não obriga um novo agente a lê-lo. O resumo histórico deve registrar apenas o que sobreviveu à auditoria.

---

## 9. Responsabilidades

### GPT

- manter `ACTIVE_DOCS.md` e `HISTORY_SUMMARY.md` coerentes após promoções relevantes;
- detectar gatilhos de reciclagem;
- definir READ SET mínimo nos mandatos;
- não exigir do Claude relatórios que dupliquem sua própria auditoria independente.

### Claude Code

- respeitar o READ SET;
- não varrer `rodadas/`, `docs/02-research/` ou arquivos arquivados sem necessidade concreta;
- registrar evidências de forma compacta;
- sinalizar se encontrou contrato ativo duplicado ou claramente obsoleto.

### Fundador

Não precisa transportar contexto manualmente entre agentes. O repositório e o working set documental devem cumprir essa função.

---

## 10. Resultado esperado

O custo de bootstrap deve permanecer aproximadamente constante mesmo que o repositório acumule anos de histórico.

A quantidade de documentos armazenados pode crescer; a quantidade de documentos **obrigatórios para entender a próxima ação** não deve crescer na mesma proporção.