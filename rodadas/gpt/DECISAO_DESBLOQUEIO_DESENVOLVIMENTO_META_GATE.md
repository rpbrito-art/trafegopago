# DECISÃO — DESENVOLVIMENTO INDEPENDENTE DURANTE GATE EXTERNO META

Status: **APROVADA PELO FUNDADOR**
Data: 2026-08-25

## 1. Problema

A Rodada 003B permanece não promovida porque o E2E canônico BISU depende de uma condição externa da Meta que o projeto não controla no momento: o portfólio Quoron possui o app e não pode atuar como cliente do próprio app no fluxo observado; a conta do fundador já atingiu o limite atual de Business Portfolios e existe um portfólio bloqueado/inutilizável (`Bizzman5po`).

Esse gate é real e continua obrigatório para promover a parte correspondente da integração Meta. Porém ele não deve bloquear capacidades do produto que não dependem de uma conexão Meta real.

## 2. Decisão

O gate Meta deixa de ser **bloqueio global de desenvolvimento** e passa a ser **gate externo pendente de uma trilha específica**.

Isso significa:

- 003B continua não promovida enquanto o E2E BISU obrigatório não for provado;
- nenhuma evidência USER substitui a prova BISU;
- nenhuma parte do código Meta é declarada comercialmente pronta por esta decisão;
- o desenvolvimento pode avançar em capacidades tecnicamente independentes da Meta;
- a ordem do roadmap pode ser antecipada de forma documentada quando as dependências reais permitirem.

## 3. Primeiro avanço autorizado

Antecipar a **Fase 6 — AI Foundation**, dividida em sub-rodadas pequenas.

Primeira sub-rodada planejada:

**Rodada 004A — AI Foundation Core**

Objetivo: construir a infraestrutura interna de IA sem qualquer chamada paga ou segredo de provedor externo.

Ela deve cobrir:

- catálogo de providers/modelos/preços;
- ledger `ai_runs`;
- contrato único de AI Task;
- Router server-only;
- seleção por tier/capability/status;
- structured output validado;
- cálculo de custo reproduzível;
- adapter fake/determinístico apenas para provar o contrato;
- testes de tenancy, segurança e falhas.

A seleção e integração de um provedor real ficam para uma sub-rodada seguinte, depois de pesquisa atual de custo/qualidade/capacidades. Isso evita criar segredo/API paga apenas para destravar fundação arquitetural.

## 4. Dependências preservadas

Esta reordenação não autoriza construir como se dados Meta reais já existissem.

Continuam dependentes do gate Meta real:

- importação real de conteúdo Instagram;
- sincronização real de métricas Instagram;
- publicação real Instagram;
- criação/gestão real de Ads;
- Lead Ads;
- conversões Meta;
- qualquer E2E que alegue funcionamento comercial da integração Meta.

## 5. Capacidades que poderão avançar enquanto o gate externo estiver pendente

Depois da AI Foundation, o GPT pode avaliar e autorizar, respeitando dependências reais:

- contexto progressivo do negócio, objetivos e jornadas;
- domínio interno de conteúdo/criativos sem alegar publicação/importação Meta;
- recomendações/hipóteses/evidências sobre fixtures controladas;
- Financial Approval Foundation;
- partes independentes de CRM/nutrição com entrada manual/fixture;
- estruturas de insights e aprendizado que não dependam de dados externos inexistentes.

Cada uma continua exigindo mandato próprio; esta decisão não autoriza execução automática de todas elas.

## 6. Não regressão

É proibido usar esta decisão para:

- promover 003B sem E2E BISU;
- declarar USER como arquitetura canônica;
- fabricar dados Meta e apresentá-los como reais;
- construir adapter de provider de IA direto dentro de feature;
- conceder à IA ferramenta financeira ou capacidade de gasto;
- adicionar segredo/API paga sem decisão explícita posterior;
- iniciar duas mutações concorrentes na mesma worktree do Claude.

## 7. Estado operacional durante a conclusão da 003B-09

A 003B-09 já está em execução no Claude Code. Portanto:

- este documento pode ser publicado agora;
- a Rodada 004A pode ser planejada/publicada agora;
- **não alterar ainda `estado.md` para apontar o Claude à 004A enquanto a 003B-09 não terminar e for auditada**;
- após a auditoria da 003B-09, o GPT atualiza `estado.md` para liberar a 004A sem reabrir esta decisão.

Fundador aprovou explicitamente esta reordenação em 2026-08-25 com a instrução: **“ok, comece”**.
