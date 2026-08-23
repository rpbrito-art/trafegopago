# Tráfego Pago

Plataforma SaaS de inteligência e automação de performance para pequenas empresas, inicialmente focada em Instagram + Meta Ads.

## Missão

Transformar contexto do negócio, conteúdo, distribuição orgânica/paga, resultados e feedback em um ciclo contínuo de aprendizagem e ação.

Modelo vigente:

`contexto do negócio → objetivo → jornada → público/personas → conteúdo/criativo → distribuição orgânica, paga ou ambas → resultado → aprendizado → nova ação`

## Continuidade do projeto

### GPT / novo chat

- `.gpt/CHAT_ENTRY_PROMPT.md` — entrada curta;
- `.gpt/PROJECT_PROMPT.md` — contrato canônico completo;
- `estado.md` — estado operacional;
- `docs/00-governanca/ACTIVE_DOCS.md` — índice do working set.

### Claude Code

Claude Code carrega `CLAUDE.md` automaticamente. Para executar a próxima rodada:

`/proxima`

O executor lê por padrão:

`CLAUDE.md automático → estado.md → mandato vigente → READ SET obrigatório`

Ele **não relê `PROJECT_PROMPT.md`, ACTIVE_DOCS ou HISTORY_SUMMARY por ritual** a cada rodada.

## Protocolo GPT ↔ Claude

`GPT planeja/especifica → fundador autoriza quando necessário → Claude executa o delta → GPT audita independentemente → correção ou promoção`

- `rodadas/gpt/` — mandatos, correções e auditorias;
- `rodadas/claude/` — índices de evidências da execução;
- `estado.md` — ponte operacional;
- `docs/00-governanca/HISTORY_SUMMARY.md` — passado promovido comprimido.

## Regra de eficiência

Estado promovido é baseline. Cada rodada prova **o que mudou + raio de impacto real**.

- testes locais: novos/afetados;
- correção pequena: defeito + impacto direto;
- suíte completa: uma única CI final por padrão;
- relatório Claude: normal ≤100 linhas/~10 KB; microcorreção ≤60 linhas/~6 KB;
- READ SET normal: até 5 documentos além de `estado + mandato`.

Detalhes: `.gpt/PROJECT_PROMPT.md` e `docs/00-governanca/DOCUMENTATION_LIFECYCLE.md`.

## Documentação canônica

- `docs/00-governanca/PROJECT_CHARTER.md`
- `docs/00-governanca/IMPLEMENTATION_ROADMAP.md`
- `docs/01-produto/MVP_CANONICAL.md`
- `docs/01-produto/GROWTH_INTELLIGENCE_CANONICAL.md`
- `docs/03-canonical/TECHNICAL_SPEC.md`
- `docs/03-canonical/DATA_MODEL.md`
- `docs/03-canonical/API_CONTRACTS.md`
- `docs/03-canonical/SECURITY_MODEL.md`
- `docs/03-canonical/AI_ARCHITECTURE.md`

Pesquisa em `docs/02-research/` é histórico/contexto e não prevalece sobre canônicos posteriores.

## Stack-base

- Next.js + TypeScript
- Supabase: Postgres, Auth, Storage, RLS, Edge Functions e Queues
- Supabase Cron quando surgir necessidade periódica real
- APIs oficiais Meta/Instagram
- AI Router próprio multi-provedor

## Executar localmente

Pré-requisitos: Node.js >= 20.9 e npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Somente valores públicos podem usar `NEXT_PUBLIC_*`. Credenciais privilegiadas são server-only e nunca entram no Git.

### Gates disponíveis

```bash
npm run lint
npm run typecheck
npm run typecheck:functions
npm test
npm run build
```

A combinação exata de gates locais depende do delta. A CI executa a suíte limpa/reprodutível final definida em `.github/workflows/ci.yml`.