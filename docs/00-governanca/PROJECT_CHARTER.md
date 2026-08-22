# PROJECT CHARTER — Tráfego Pago

## 1. Mandato

Construir um MVP comercializável de uma plataforma SaaS que conecte Instagram e Meta Ads para transformar conteúdo orgânico em experimentos pagos, identificar vencedores, escalar campanhas mediante aprovação humana, capturar e qualificar leads, registrar conversões e gerar aprendizado estratégico contínuo com IA.

## 2. Princípio de produto

O diferencial não é publicar posts nem criar anúncios. O núcleo é fechar o ciclo de aprendizagem:

`conteúdo → sinais orgânicos → seleção → experimento → resultado → lead → venda/perda → feedback → insight → nova ação`

## 3. Público inicial

Pequenas empresas orientadas a geração de leads, com operação relevante no Instagram e sem estrutura sofisticada de marketing. O MVP não será inicialmente um produto para e-commerce complexo nem uma plataforma multicanal.

## 4. Escopo inicial obrigatório

- autenticação e conta;
- organizações/workspaces e membros;
- onboarding empresarial;
- conexão segura com Meta/Instagram;
- importação e publicação de conteúdo;
- sincronização de métricas orgânicas;
- análise e seleção de candidatos a teste;
- aprovação humana de gasto;
- criação e acompanhamento de experimentos/campanhas Meta;
- coleta de resultados;
- recomendação de vencedor e escala;
- aprovação humana de novo orçamento;
- Lead Ads e micro-CRM;
- qualificação de leads;
- estados ganho/perda;
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

## 7. Regras arquitetônicas inegociáveis

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

Documentos de `docs/03-canonical/` são canônicos. Pesquisa em `docs/02-research/` explica a origem das decisões, mas não prevalece sobre especificações canônicas posteriores. `.gpt/CURRENT_STATE.md` registra somente o estado operacional atual.

Mudanças de contrato devem atualizar a documentação na mesma rodada.
