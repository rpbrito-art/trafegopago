# RELATÓRIO — CORREÇÃO 004B-01: multi-org, nullable e branding ativo

Mandato: `rodadas/gpt/CORRECAO_004B_01_MULTI_ORG_NULLABLE_BRANDING.md`
Branch: `claude/rodada-004b-quoron-growth-context` · PR #14
Sem DDL: nenhuma migration nova, RPC e policy intactas.

## 1. Correção A — contexto de organização falha fechado

Criado `src/lib/business/organization-context.ts`: um resolvedor único, com a mesma semântica já promovida em `getAccountBusinessState()`. Existe para não haver duas definições divergentes de "a organização do usuário" no mesmo produto.

`ativas[0]` e `.limit(1)` foram removidos. Só `{ kind: "unica" }` devolve `organizationId`; zero, indisponível, múltiplas e erro técnico são estados próprios.

- `getObjectiveState()` — em múltiplas memberships **não consulta** `growth_objectives`: exibir o objetivo de um negócio escolhido pela ordem do banco é pior que não exibir nada. Ganhou `negocio-indisponivel` e `multiplos-negocios`.
- `setGrowthObjectiveAction()` — em contexto ambíguo ou indisponível a RPC **não é chamada**. `organizationId` do formulário continua sem caminho até o SQL.
- UI (`ObjectiveSection` e `/objetivo`) trata os dois estados em linguagem simples, sem id, papel ou contagem técnica. Nenhum seletor multi-org foi adicionado.

Membership `INACTIVE` continua contando para detectar múltiplos negócios: ignorá-la transformaria uma conta multi-negócio em "um negócio só" conforme o status mudasse.

## 2. Correção B — nulabilidade fiel

`BusinessProfileSummary.targetAudience` passou a `string | null` e `toProfileSummary()` deixou de aplicar `?? ""`.

O defeito era visível: com `""`, o `value ?? "Não informado"` da UI não disparava — string vazia não é `null` — e a tela mostrava um campo em branco como se fosse um valor. Agora mostra **Não informado**. Nenhum update ou backfill foi criado.

## 3. Correção C — branding ativo

Migrados os oito documentos do §5 (`.gpt/CHAT_ENTRY_PROMPT.md` e os sete de `docs/00-governanca/`), apenas onde o nome era identidade corrente — títulos e a frase de continuidade do projeto.

Preservados: referências históricas, rodadas, relatórios, auditorias, migrations, e os identificadores técnicos legados (`rpbrito-art/trafegopago`, pasta local, project ref). O conceito `tráfego pago` em minúsculas continua intacto.

## 4. Prova RLS real (§6)

`scripts/sql/growth-objectives-rls-004b01-proof.sql` → **7 casos, 7 passaram, 0 falharam**.

Diferente da prova da 004B, que avaliava a expressão da policy **como owner** — o que reproduzia a condição sem atravessar a RLS. Aqui a leitura roda sob `set local role authenticated` com `auth.uid()` simulado por `request.jwt.claims`, e a consulta a `growth_objectives` **não tem filtro de organização**: quem restringe é a policy.

Provado: usuário A vê exatamente 1 objetivo, o da própria organização; não vê o da organização B; membership `INACTIVE` lê zero; organização `INACTIVE` lê zero; `authenticated` recebe `42501` ao tentar INSERT e ao tentar executar a RPC.

Resíduo após rollback: zero objetivos, zero fixtures de organização e de usuário; a organização real intacta.

## 5. Testes focados

`npx vitest run` → **803/803** (36 arquivos). Novos: contexto de organização 12, action de objetivo 13, marca 6, estados de UI 3, nulabilidade 3.

Cobrem os dez itens do §7, incluindo: zero memberships → sem organização; uma indisponível → negócio indisponível, **não** sem organização; duas → estado multi-org sem consulta arbitrária; action não chama a RPC em multi-org nem em indisponível; contexto único continua chamando; `targetAudience` null preservado; UI mostra "Não informado"; mensagens sem ids internos; documentos ativos usando Quoron.

Nenhum teste exige ausência global da string antiga no repositório — histórico legítimo permanece.

`tsc --noEmit` e `npm run lint` → limpos.

## 6. Fora de escopo

Sem DDL, sem seletor multi-org, sem tocar Meta/003B, sem provider de IA, sem nova feature. Os 29 casos SQL da 004B não foram repetidos: nada tocou migration, RPC ou policy.

`AGUARDANDO AUDITORIA GPT`
