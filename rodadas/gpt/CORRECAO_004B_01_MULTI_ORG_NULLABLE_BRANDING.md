# CORREÇÃO 004B-01 — MULTI-ORG, NULLABLE E BRANDING ATIVO

Status: **AUTORIZADA PARA EXECUÇÃO PELO CLAUDE CODE**

Data: 2026-08-25

Rodada-base: `rodadas/gpt/RODADA_004B_QUORON_GROWTH_CONTEXT.md`

Auditoria: `rodadas/gpt/AUDITORIA_RODADA_004B_QUORON_GROWTH_CONTEXT.md`

Branch: `claude/rodada-004b-quoron-growth-context`

PR: #14

## 1. Objetivo

Corrigir somente três lacunas encontradas na auditoria da 004B:

1. impedir seleção/mutação silenciosa de organização no fluxo de objetivo quando a conta possui contexto multi-organização ou membership indisponível;
2. preservar `NULL` de `target_audience` no contrato de leitura, sem convertê-lo em string vazia;
3. concluir o branding Quoron nos documentos ativos de governança/entrada que ainda usam o nome antigo como identidade corrente.

Adicionar também uma prova remota **focada** do efeito real da policy RLS de `growth_objectives`.

Não reabrir o restante da rodada nem repetir sua bateria inteira por ritual.

## 2. Preflight

1. `git fetch`;
2. permanecer na branch `claude/rodada-004b-quoron-growth-context`;
3. reconciliar com a `main` atual, que contém a auditoria e esta correção;
4. confirmar PR #14 como destino;
5. não iniciar nova rodada.

## 3. Correção A — contexto de organização deve falhar fechado

### 3.1 Regra de produto já promovida

O estado de conta já distingue:

- zero memberships → `sem-organizacao`;
- uma membership cuja organização não está disponível → `organizacao-indisponivel`;
- mais de uma membership → `multiplas-organizacoes`;
- somente contexto inequívoco → organização pronta.

A 004B não pode escolher `membership[0]`, `ativas[0]` ou `.limit(1)` como substituto de seleção explícita de negócio.

### 3.2 `getObjectiveState()`

Corrigir para que o estado de objetivo seja coerente com o estado de conta.

Obrigatório:

- `sem-organizacao` somente quando realmente não existe membership;
- uma única membership indisponível/inativa não vira “crie outro negócio”; deve produzir estado equivalente a negócio indisponível;
- mais de uma membership, ativa ou não, deve produzir estado explícito de múltiplos negócios e **não consultar objetivo de uma organização escolhida implicitamente**;
- só quando houver exatamente um contexto de organização inequívoco e acessível o objetivo pode ser consultado;
- owner/admin continuam controlando somente a disponibilidade do botão; autorização real permanece na RPC.

A forma interna pode reutilizar/alinhar o resolver já existente de conta ou criar helper server-only compartilhado, desde que não duplique duas semânticas divergentes de seleção de organização.

### 3.3 `setGrowthObjectiveAction()`

Remover a escolha silenciosa com `.limit(1)`.

Obrigatório:

- não aceitar `organizationId` do formulário/browser como atalho;
- resolver memberships do usuário no servidor;
- se o contexto não for exatamente um negócio inequívoco e utilizável, **não chamar** `set_active_growth_objective`;
- em multi-org, não mutar nenhum objetivo até existir seletor/contexto explícito em fase futura;
- em membership/organização indisponível, não oferecer criação de outro tenant nem mutar;
- manter a RPC como garantia final de organização ACTIVE + membership ACTIVE + owner/admin.

A resposta pode redirecionar para `/conta` ou mostrar mensagem simples, mas não deve revelar ids/roles técnicos.

### 3.4 UI

Adicionar tratamento claro em `ObjectiveSection` e `/objetivo` para:

- negócio indisponível;
- mais de um negócio.

Linguagem simples. Não adicionar seletor multi-org nesta correção.

## 4. Correção B — nulabilidade fiel

Em `src/lib/business/account.ts`:

- `BusinessProfileSummary.targetAudience` deve aceitar `null`;
- `toProfileSummary()` deve preservar `NULL` como `null`, sem `?? ""`;
- `acquisitionGoal` já é nullable e deve permanecer assim;
- `BusinessSection` deve continuar mostrando “Não informado” quando ausente.

Não criar update/backfill nem converter dados existentes.

## 5. Correção C — branding nos documentos ativos restantes

Atualizar apenas ocorrências em que o nome é a **identidade corrente do projeto/produto** para Quoron em:

1. `.gpt/CHAT_ENTRY_PROMPT.md`;
2. `docs/00-governanca/ACTIVE_DOCS.md`;
3. `docs/00-governanca/PROJECT_CHARTER.md`;
4. `docs/00-governanca/IMPLEMENTATION_ROADMAP.md`;
5. `docs/00-governanca/ARCHITECTURE_EXECUTION_BOUNDARY.md`;
6. `docs/00-governanca/EXTERNAL_CONFIGURATION_GATE.md`;
7. `docs/00-governanca/DOCUMENTATION_LIFECYCLE.md`;
8. `docs/00-governanca/HISTORY_SUMMARY.md` — somente título/identidade corrente, preservando referências históricas reais ao nome anterior.

Não fazer substituição cega em rodadas, relatórios, migrations, hashes, repo, pasta local, Supabase ref ou recursos Meta.

As ocorrências em minúsculas que significam o conceito **tráfego pago** continuam válidas.

## 6. Prova RLS focada

A migration não precisa mudar para isso.

Acrescentar uma prova transacional pequena, separada ou incorporada ao script existente, que execute de fato a leitura como papel autenticado com identidade simulada suportada pelo ambiente Supabase/Postgres.

Provar pelo efeito da policy:

- usuário A, membro ACTIVE da organização A, vê objetivo A;
- o mesmo usuário não vê objetivo B;
- após membership A ficar INACTIVE, vê zero;
- rollback deixa zero fixture.

Não basta reproduzir manualmente a expressão `organization_id in (...)` como owner; a consulta a `growth_objectives` deve atravessar a policy RLS no papel autenticado.

Se o ambiente/CLI impedir de simular `auth.uid()` de forma confiável, parar e registrar tecnicamente o impedimento em vez de fabricar prova.

Se o classificador pedir autorização humana para a prova mutável, pedir somente essa aprovação e retomar depois; não contornar.

## 7. Testes focados mínimos

Adicionar/ajustar provas para:

1. `getObjectiveState` com zero memberships → sem organização;
2. uma membership indisponível/inativa → negócio indisponível, não sem organização;
3. duas memberships → estado multi-org e nenhuma consulta/seleção arbitrária de objetivo;
4. action com duas memberships → RPC não chamada;
5. action com uma membership indisponível/inativa → RPC não chamada;
6. contexto único válido continua chamando a RPC normalmente;
7. `targetAudience null` permanece `null` no summary;
8. UI mostra “Não informado” para público ausente;
9. estados de objetivo multi-org/indisponível orientam sem expor ids internos;
10. documentos ativos listados no §5 passam a usar Quoron como identidade corrente.

Não criar teste global que exija ausência total da string `Tráfego Pago` no repositório; histórico legítimo permanece.

## 8. Gates

Como a correção não deve alterar schema:

- testes novos/afetados localmente;
- lint/typecheck se o delta exigir;
- prova RLS focada remota;
- uma CI final completa no PR #14.

Não repetir os 29 casos SQL da 004B por ritual, salvo se uma mudança inesperada tocar migration/RPC/policy.

## 9. Fora de escopo

- nova migration/DDL, salvo impedimento técnico comprovado e devolvido ao GPT antes de executar;
- seletor multi-organização;
- alterar modelo de tenancy já promovido;
- tocar Meta/003B;
- alterar classifier Meta;
- importação/publicação Instagram;
- provider real de IA, API key, SDK ou chamada paga;
- geração de conteúdo/recomendação inteligente;
- campanha/anúncio/gasto;
- Financial Approval;
- CRM/leads;
- App Shell/Hoje;
- renomear repo/pasta/Supabase/resources Meta.

## 10. Entrega

Atualizar/criar relatório compacto:

`rodadas/claude/RELATORIO_CORRECAO_004B_01_MULTI_ORG_NULLABLE_BRANDING.md`

Máximo recomendado: 60 linhas / ~6 KB.

Registrar:

- arquivos alterados;
- comportamento multi-org corrigido;
- prova nullable;
- docs de branding corrigidos;
- resultado da prova RLS real;
- testes focados;
- novo HEAD;
- CI final.

Parar em:

**AGUARDANDO AUDITORIA GPT**.

## 11. Critério de saída

A 004B volta para promoção somente quando:

- nenhum caminho de objetivo selecionar organização implicitamente em contexto ambíguo;
- estados de objetivo e conta forem coerentes para zero/uma indisponível/múltiplas memberships;
- `targetAudience` preservar null corretamente;
- branding ativo restante estiver concluído;
- efeito real da RLS tiver prova focada ou impedimento técnico explícito devolvido ao GPT;
- CI estiver verde;
- nenhum escopo proibido tiver sido absorvido.