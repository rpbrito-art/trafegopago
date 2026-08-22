# Tráfego Pago

Plataforma SaaS de otimização contínua de aquisição por tráfego pago assistida por IA, inicialmente focada em Instagram + Meta Ads para pequenas empresas.

## Missão

Transformar conteúdo orgânico, experimentação paga, leads, conversões e feedback de clientes em um ciclo contínuo de aprendizagem e decisão:

`conteúdo → desempenho orgânico → hipótese → experimento pago → resultado → vencedor → escala → lead → conversão → feedback → nova estratégia`

## Entrada para novos chats

Para continuidade do projeto:

- `.gpt/CHAT_ENTRY_PROMPT.md` — prompt curto para iniciar novos chats e encaminhá-los ao contexto correto;
- `.gpt/PROJECT_PROMPT.md` — prompt permanente e canônico, com método, papéis, regras, arquitetura e protocolo de continuidade;
- `estado.md` — estado operacional corrente.

Novo chat deve começar pelo prompt curto, que exige a leitura do prompt canônico e do estado antes de qualquer planejamento, auditoria ou execução.

## Estado operacional

O estado corrente do projeto está em:

`estado.md`

Esse arquivo informa a rodada/correção vigente, o mandato que deve ser executado e o relatório esperado.

`.gpt/CURRENT_STATE.md` existe apenas por compatibilidade e aponta para `estado.md`.

## Protocolo GPT ↔ Claude Code

- `rodadas/gpt/` — mandatos de execução, correções e auditorias preparados pelo GPT.
- `rodadas/claude/` — relatórios de execução e evidências entregues pelo Claude Code.
- `estado.md` — ponte operacional entre ambos.

Fluxo:

`GPT publica mandato → Claude executa → Claude grava relatório → GPT audita → aprova ou publica correção`

O usuário não precisa copiar e colar relatórios entre os agentes quando ambos tiverem acesso ao repositório.

## Documentação canônica

- `docs/00-governanca/PROJECT_CHARTER.md` — mandato, princípios e processo de desenvolvimento.
- `docs/00-governanca/IMPLEMENTATION_ROADMAP.md` — sequência macro de implementação.
- `docs/01-produto/MVP_CANONICAL.md` — definição funcional canônica do MVP.
- `docs/02-research/RESEARCH_SYNTHESIS.md` — síntese da investigação técnica e revisão adversarial.
- `docs/03-canonical/TECHNICAL_SPEC.md` — especificação técnica principal.
- `docs/03-canonical/DATA_MODEL.md` — modelo conceitual de dados.
- `docs/03-canonical/API_CONTRACTS.md` — contratos das integrações e serviços.
- `docs/03-canonical/SECURITY_MODEL.md` — modelo de segurança e isolamento multi-tenant.
- `docs/03-canonical/AI_ARCHITECTURE.md` — arquitetura de IA em cascata e controle de custos.
- `.gpt/PROJECT_PROMPT.md` — mandato permanente para planejadores/auditores/executor.

## Stack-base prevista

- Next.js + TypeScript
- Supabase: Postgres, Auth, Storage, RLS, Edge Functions, Queues e Cron
- Meta/Instagram APIs oficiais
- Camada própria de roteamento de IA multi-provedor

n8n, Make ou outros orquestradores externos não fazem parte da fundação e só poderão ser adicionados se uma necessidade concreta provar que a implementação própria é inadequada.

## Executar localmente

Pré-requisitos: Node.js >= 20.9 e npm.

```bash
npm install
cp .env.example .env.local   # preencher os valores
npm run dev
```

Variáveis de ambiente: ver `.env.example`. Somente valores públicos podem usar
o prefixo `NEXT_PUBLIC_`; credenciais privilegiadas são server-only e nunca
entram no Git.

### Gates de verificação

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Os mesmos gates rodam na CI (`.github/workflows/ci.yml`) em todo push e pull
request. O build não depende de credenciais Supabase.

### Estrutura

```text
src/app/            App Router (rotas, layout, página inicial)
src/lib/env/        validação e convenção de variáveis de ambiente
src/lib/supabase/   clientes Supabase (browser e servidor)
supabase/           configuração da CLI do projeto vinculado
test/stubs/         stubs restritos ao ambiente de teste
```

O domínio do MVP (organizações, Meta, conteúdo, experimentos, leads, IA) ainda
não foi implementado. A ordem de construção está em
`docs/00-governanca/IMPLEMENTATION_ROADMAP.md`.
