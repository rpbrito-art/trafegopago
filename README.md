# Tráfego Pago

Plataforma SaaS de otimização contínua de aquisição por tráfego pago assistida por IA, inicialmente focada em Instagram + Meta Ads para pequenas empresas.

## Missão

Transformar conteúdo orgânico, experimentação paga, leads, conversões e feedback de clientes em um ciclo contínuo de aprendizagem e decisão:

`conteúdo → desempenho orgânico → hipótese → experimento pago → resultado → vencedor → escala → lead → conversão → feedback → nova estratégia`

## Estado

Projeto em fundação documental. Nenhum código de produção deve ser criado antes da leitura de `.gpt/PROJECT_PROMPT.md`, `.gpt/CURRENT_STATE.md` e dos documentos canônicos em `docs/03-canonical/`.

## Documentação

- `docs/00-governanca/PROJECT_CHARTER.md` — mandato, princípios e processo de desenvolvimento.
- `docs/01-produto/MVP_CANONICAL.md` — definição funcional canônica do MVP.
- `docs/02-research/RESEARCH_SYNTHESIS.md` — síntese da investigação técnica e revisão adversarial.
- `docs/03-canonical/TECHNICAL_SPEC.md` — especificação técnica principal.
- `docs/03-canonical/DATA_MODEL.md` — modelo conceitual de dados.
- `docs/03-canonical/API_CONTRACTS.md` — contratos das integrações e serviços.
- `docs/03-canonical/SECURITY_MODEL.md` — modelo de segurança e isolamento multi-tenant.
- `docs/03-canonical/AI_ARCHITECTURE.md` — arquitetura de IA em cascata e controle de custos.
- `.gpt/PROJECT_PROMPT.md` — mandato permanente para planejadores/auditores.
- `.gpt/CURRENT_STATE.md` — estado operacional corrente.

## Stack-base prevista

- Next.js + TypeScript
- Supabase: Postgres, Auth, Storage, RLS, Edge Functions, Queues e Cron
- Meta/Instagram APIs oficiais
- Camada própria de roteamento de IA multi-provedor

n8n, Make ou outros orquestradores externos não fazem parte da fundação e só poderão ser adicionados se uma necessidade concreta provar que a implementação própria é inadequada.
