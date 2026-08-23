# PROJECT CHARTER — Tráfego Pago

## 1. Mandato

Construir um MVP comercializável de uma plataforma SaaS que conecte Instagram e Meta Ads para transformar dados do negócio, conteúdo, público, distribuição orgânica/paga e resultados em um ciclo contínuo de aprendizagem e recomendação.

O produto deve entregar valor tanto para empresas que desejam investir em mídia quanto para empresas que, em determinado momento, operam somente de forma orgânica. Mídia paga é uma capacidade importante do sistema, não uma obrigação de uso.

## 2. Princípio de produto

O diferencial não é publicar posts nem criar anúncios. O núcleo é fechar o ciclo de aprendizagem:

`contexto do negócio → objetivo → jornada → público/personas → conteúdo/criativo → distribuição orgânica, paga ou ambas → resultado → aprendizado → nova ação`

O sistema deve compreender progressivamente o negócio, distinguir atenção de resultado real, aprender quem responde e quem converte, e recomendar o próximo passo com evidências e limitações explícitas.

O modelo detalhado está em:

`docs/01-produto/GROWTH_INTELLIGENCE_CANONICAL.md`

### 2.1 Lei da simplicidade guiada

**A complexidade pertence ao sistema, não ao usuário.**

O Tráfego Pago deve ser operado como uma trilha guiada por pessoas que não dominam marketing digital, Ads Manager, APIs ou estruturas técnicas de campanha.

O fluxo padrão deve:

- usar linguagem de negócio;
- apresentar uma ação principal clara por etapa;
- recomendar defaults seguros;
- esconder complexidade avançada até ser necessária;
- explicar o motivo das recomendações;
- pedir ao usuário apenas decisões que realmente dependam dele;
- absorver internamente a complexidade de Meta/Ads sempre que as APIs oficiais permitirem;
- nunca esconder gasto, risco, incerteza ou limitação de mensuração em nome da simplicidade.

Nenhuma feature futura deve considerar aceitável transferir ao usuário complexidade técnica que o produto pode resolver de forma segura.

## 3. Público inicial

Pequenas empresas orientadas a aquisição e crescimento, com operação relevante no Instagram e sem estrutura sofisticada de marketing. O usuário típico não deve precisar conhecer Ads Manager para operar o fluxo principal.

O MVP não será inicialmente um produto para e-commerce complexo nem uma plataforma multicanal.

## 4. Escopo inicial obrigatório

- autenticação e conta;
- organizações/workspaces e membros;
- onboarding empresarial progressivo;
- contexto estruturado do negócio;
- conexão segura com Meta/Instagram;
- importação e publicação de conteúdo;
- sincronização de métricas orgânicas;
- análise orgânica e recomendações mesmo sem gasto;
- separação conceitual entre conteúdo orgânico e criativo publicitário;
- identificação variável de oportunidades, sem número fixo de candidatos;
- modelagem da jornada/resultado desejado do negócio;
- personas/públicos como hipóteses apoiadas por evidências quando disponíveis;
- aprovação humana de gasto;
- criação e acompanhamento de campanhas/experimentos Meta quando aplicável;
- coleta de resultados observáveis;
- recomendação de vencedor quando houver experimento comparável;
- recomendação e aprovação de escala quando aplicável;
- captura de leads/eventos e micro-CRM quando a jornada exigir lead;
- qualificação de leads quando aplicável;
- estados ganho/perda quando aplicáveis;
- pesquisas pós-desfecho;
- insights estratégicos;
- IA em cascata multi-provedor;
- ledger de consumo e custo de IA;
- auditoria, filas, retries, idempotência e observabilidade.

## 5. Fora do MVP

- TikTok, LinkedIn, Google Ads, YouTube Ads e X;
- CRM generalista;
- e-commerce completo;
- app mobile nativo;
- automação irrestrita de orçamento;
- gasto financeiro decidido autonomamente por LLM;
- agência multi-cliente sofisticada;
- n8n/Make como dependência estrutural;
- infraestrutura própria para problemas já resolvidos pelo Supabase ou Meta sem justificativa objetiva.

## 6. Stack-base

- aplicação: Next.js + TypeScript;
- backend gerenciado: Supabase/Postgres;
- autenticação: Supabase Auth;
- storage: Supabase Storage;
- segurança de dados: RLS;
- processamento assíncrono: Supabase Queues + workers/Edge Functions conforme adequação;
- tarefas agendadas: Supabase Cron;
- integrações: APIs oficiais Meta/Instagram;
- IA: AI Router próprio, desacoplado de fornecedor.

A stack só muda por decisão documentada.

## 7. Regras arquitetônicas e de produto inegociáveis

1. Multi-tenancy por `organization_id` desde o primeiro schema.
2. RLS em toda tabela exposta pela Data API.
3. `service_role` e segredos nunca no browser.
4. Tokens Meta nunca em localStorage nem expostos ao cliente.
5. Operações financeiras exigem aprovação humana persistida.
6. LLM produz recomendações; não executa gasto diretamente.
7. Operações externas mutáveis devem ser idempotentes.
8. Webhooks devem ser persistidos/deduplicados antes do processamento pesado.
9. Jobs externos devem tolerar retry, timeout e rate limit.
10. Métricas Meta devem passar por camada de normalização versionada.
11. Versão da Graph/Marketing API deve ser fixada e centralizada.
12. Dados brutos relevantes devem ser preservados para reconciliação/auditoria.
13. Cálculos determinísticos não devem chamar LLM.
14. Custos de IA devem ser contabilizados por execução e organização.
15. Modelos de IA não devem ser hardcoded nas features.
16. Exclusão/desconexão de dados Meta deve ser operação real, auditável.
17. A experiência padrão deve ser uma trilha guiada e não exigir domínio técnico de tráfego pago.
18. Conteúdo orgânico, criativo publicitário e anúncio são conceitos distintos.
19. O número de oportunidades/candidatos nunca é fixo por contrato.
20. O sistema deve entregar valor orgânico mesmo quando o usuário não pretende investir em mídia.
21. A jornada até o resultado é configurável por negócio; lead, atendimento e venda são casos possíveis, não universais.
22. Personas devem separar hipótese, público observado e público de resultado; IA não inventa atributos ausentes.
23. Resultado desejado e resultado mensurável devem ser distinguidos explicitamente.
24. Complexidade técnica pode ser escondida; gasto, risco, incerteza e consequência nunca podem ser escondidos.

## 8. Método de desenvolvimento

O método oficial é:

`GPT planeja/pesquisa/especifica → Claude Code executa → GPT audita → Claude corrige → GPT valida → promoção`

Claude Code não deve inventar contratos estruturais durante implementação. Dúvidas que afetem domínio, segurança, dinheiro, integrações, schema ou arquitetura devem retornar ao planejamento.

## 9. Gates de qualidade

Nenhuma rodada é considerada concluída apenas porque compila. Conforme o tipo de alteração, exigir:

- typecheck;
- lint;
- testes unitários;
- testes de integração;
- provas de RLS/tenancy;
- testes de idempotência/retry;
- testes de máquina de estados;
- testes de contratos Meta simulados;
- auditoria de segredos;
- build;
- documentação coerente com o código.

## 10. Governança documental

Documentos de `docs/03-canonical/` e documentos explicitamente marcados como canônicos em `docs/01-produto/` definem os contratos vigentes de arquitetura e produto.

Pesquisa em `docs/02-research/` explica a origem das decisões, mas não prevalece sobre especificações canônicas posteriores. `.gpt/CURRENT_STATE.md` registra somente compatibilidade histórica; o estado operacional vive em `estado.md`.

Mudanças de contrato devem atualizar a documentação na mesma rodada ou, quando a decisão for deliberadamente conceitual e não executável, registrar explicitamente a partir de qual rodada futura ela vincula implementação.
