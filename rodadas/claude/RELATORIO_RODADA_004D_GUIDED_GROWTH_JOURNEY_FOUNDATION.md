# RELATÓRIO — RODADA 004D — GUIDED GROWTH JOURNEY FOUNDATION

Mandato: `rodadas/gpt/RODADA_004D_GUIDED_GROWTH_JOURNEY_FOUNDATION.md`

Branch: `claude/rodada-004d-guided-growth-journey` · base: `main` em `b389e2d`, após a promoção da 004C.

Status: **CORREÇÃO 004D-01 EXECUTADA — AGUARDANDO REAUDITORIA GPT**.

Auditoria da 004D: `rodadas/gpt/AUDITORIA_004D_GUIDED_GROWTH_JOURNEY_FOUNDATION.md` — bloqueada por imutabilidade de `growth_objectives`. Correção: `rodadas/gpt/CORRECAO_004D_01_IMUTABILIDADE_GROWTH_OBJECTIVES.md`, executada nesta mesma branch e registrada na §6 abaixo.

## 1. Preflight

Raiz e remote corretos, working tree limpa, `git fetch` sem pendência. `main` local avançada por fast-forward; branch da rodada criada a partir dela. Nenhum reset, clean ou force-push.

## 2. Delta

### 2.1 Schema — `supabase/migrations/20260825230000_add_growth_objective_focus.sql`

Aditiva. Nenhuma migration aplicada foi tocada.

- `growth_objectives` ganha `focus_type` (`BUSINESS|OFFER|NULL`) e `focus_offer_id`;
- FK composta `(organization_id, focus_offer_id)` → `business_offers (organization_id, id)`: é o banco que impede um objetivo apontar para oferta de outro tenant;
- `..._focus_shape` amarra cada estado a uma forma única — foco nulo e `BUSINESS` exigem oferta ausente, `OFFER` exige oferta presente;
- índice parcial cobrindo a FK na mesma ordem das colunas;
- `focus_type` continua nulo por design: os objetivos já promovidos existem sem foco, e isso é contexto incompleto, não dado inválido.

`set_growth_objective_focus`: `security invoker`, `search_path` vazio, EXECUTE só para `service_role`. Autorização lida do banco (owner/admin, organização e membership ACTIVE); o objetivo precisa ser o `ACTIVE` da organização resolvida; oferta arquivada é recusada com `55000`; reenvio idêntico é idempotente; a troca arquiva a versão vigente e cria a próxima copiando objetivo, jornada e sucesso, com `created_by` de quem decidiu.

Decisão não óbvia: o advisory lock usa **a mesma chave** de `set_active_growth_objective`. As duas operações disputam a única linha `ACTIVE` da organização; uma chave diferente deixaria uma troca de objetivo e uma troca de foco correrem em paralelo sobre ela.

Segunda decisão: a FK usa `on delete cascade`. O único DELETE que alcança `business_offers` no fluxo real é o cascade de `organizations` — o produto arquiva ofertas e `service_role` não tem grant de DELETE. Com `no action`, esse cascade poderia falhar por ordem de avaliação.

### 2.2 Motor determinístico

`src/lib/growth/journey.ts` — `decideJourneyStep()` é **pura**: recebe o estado já lido e devolve o passo, sem IO. `src/lib/growth/guided-journey.ts` faz a coleta reaproveitando `getObjectiveState()` e `getOffersState()`, em vez de reconsultar as tabelas — custa uma resolução de contexto a mais e evita duas definições divergentes de "o objetivo ativo deste negócio", que foi o defeito corrigido em 004B-01.

Nove estados: `SEM_ORGANIZACAO`, `NEGOCIO_INDISPONIVEL`, `MULTIPLAS_ORGANIZACOES`, `DEFINIR_OBJETIVO`, `ADICIONAR_OFERTA`, `ESCOLHER_FOCO`, `REESCOLHER_FOCO`, `BASE_ESTRATEGICA_PRONTA` e `ERRO_TECNICO` — este último porque falha de leitura não pode virar estado vazio.

Cada passo carrega título, explicação, **por que importa**, **o que muda depois** e no máximo uma ação. A ação é `null` quando quem está olhando não pode executá-la: oferecer um botão que a autorização vai recusar é pior do que dizer quem pode agir. Nenhum provider de IA participa — Tier 0 de `AI_ARCHITECTURE.md` §3.

### 2.3 Experiência e autenticação

- `/inicio`: entrada autenticada guiada, um passo por vez, com indicação textual da etapa (`Etapa N de 4`), sem porcentagem nem score;
- `/foco`: uma pergunta de negócio, ofertas pelo nome, opção "meu negócio como um todo". Com uma única oferta ela vem pré-selecionada, mas **nada é gravado sem confirmação**; quem não administra vê a prioridade atual e não o formulário;
- `DEFAULT_AUTHENTICATED_REDIRECT` passa a `/inicio`; `PROTECTED_PREFIXES` e a allowlist de redirect cobrem as duas rotas novas; `/conta` permanece intacta;
- o formulário envia **uma única resposta** — `BUSINESS` ou o id da oferta —, o que impede o estado impossível de "foco no negócio com oferta selecionada" chegar à constraint.

### 2.4 Documentação

`DATA_MODEL.md` passa a registrar `growth_objectives` com os campos de foco e suas invariantes; `TECHNICAL_SPEC.md` §3.3 ganha o foco e a subseção da jornada guiada/entrada autenticada. Nenhum canônico de produto foi reescrito.

## 3. Provas

| prova | fonte | resultado |
| --- | --- | --- |
| foco, tenant, autorização e histórico no remoto | `scripts/sql/growth-objective-focus-004d-proof.sql` via `supabase db query --linked` | **32 casos, 32 passaram, 0 falharam** |
| motor de condução | `src/lib/growth/journey.test.ts` | 17 casos |
| action de foco | `src/app/actions/focus.test.ts` | 12 casos |
| tela do próximo passo | `src/components/journey/next-step.test.tsx` | 6 casos |
| rotas, allowlist e regressão de autenticação | `routes.test.ts`, `redirect.test.ts`, `proxy.test.ts`, `auth.test.ts`, `confirm/route.test.ts` | verdes |
| suíte local | `npx vitest run` | **902/902** em 44 arquivos |
| tipos e lint | `tsc --noEmit`, `eslint` | limpos |
| advisors | MCP Supabase, security e performance | idênticos ao baseline; nenhuma FK do delta descoberta |
| CI final | `32892914249` no PR #16 | **success**, 902/902, lint/typecheck/Edge Functions/build verdes |

A prova SQL é transacional (`begin … rollback`) e a leitura final acontece sob `set local role authenticated`.

Cobertura remota: objetivo promovido sem foco continua válido; as quatro formas incoerentes de foco recusadas com `23514`; foco cross-tenant recusado com `23503`; papéis e status recusados com `42501`; taxonomia desconhecida com `22023`; oferta arquivada com `55000`; definir foco arquiva a versão anterior e preserva objetivo/jornada/sucesso; reenvio idêntico idempotente; um único `ACTIVE` por organização em cada etapa; arquivar a oferta não apaga o foco registrado; browser sem EXECUTE da RPC e sem escrita direta.

Correção durante a execução: o caso que arquivava a oferta estava dentro do bloco que espera exceção — o rollback do subbloco desfazia o próprio arquivamento, e o caso seguinte testaria um estado diferente do que afirmava. O arquivamento foi movido para fora, e o estado passou a ser verificado explicitamente.

Regressão de autenticação: 13 testes afirmavam `/conta` como destino padrão. Foram atualizados para `DEFAULT_AUTHENTICATED_REDIRECT` — a asserção passa a acompanhar a constante em vez de repetir o caminho —, e os vetores de open redirect continuam recusados.

## 4. Supabase remoto

Migration aplicada: `20260825230000_add_growth_objective_focus`, publicada na branch antes do `db push`. O primeiro `db push` falhou com erro transitório de conexão do pooler (`EAUTHQUERY ... timed out`) e foi repetido; nenhuma alteração parcial ficou.

Pós-estado independente: as duas colunas nullable presentes; as três constraints de foco presentes; índice de cobertura criado; RPC com EXECUTE apenas para `postgres` e `service_role`; grants de `growth_objectives` inalterados (`authenticated` só SELECT); **zero fixtures residuais**.

Advisors: um novo INFO `unused_index` em `growth_objectives_focus_offer_idx`, esperado em coluna recém-criada e vazia — mesmo raciocínio já registrado na 004A e na 004C.

## 5. Fora de escopo — não feito

Sem Meta, sem provider de IA, sem prompt ou chamada ao Router, sem CRM, sem Ads, sem App Shell, sem seletor multi-organização, sem múltiplos focos e sem score de maturidade. `BASE_ESTRATEGICA_PRONTA` não oferece link para integração bloqueada — há teste que falha se um aparecer.

## 6. Correção 004D-01 — imutabilidade de `growth_objectives`

### 6.1 Defeito

A auditoria confirmou por prova independente: `has_table_privilege('service_role', 'growth_objectives', 'UPDATE') = true` e zero trigger customizada. A memória estratégica dependia da disciplina de quem chamava — um caminho privilegiado fora das RPCs podia reescrever objetivo, jornada, sucesso, foco, tenant, autoria ou datas sem criar versão nova.

### 6.2 Delta — `supabase/migrations/20260825240000_enforce_growth_objective_immutability.sql`

Aditiva; nenhuma migration aplicada foi tocada.

- `revoke update` de tabela para `service_role`, seguido de `grant update (status, archived_at)` — o papel da aplicação escreve exatamente as duas colunas que o supersede altera;
- trigger `growth_objectives_immutable` (`before update … for each row`): recusa UPDATE em linha já arquivada, UPDATE que não leve a `ARCHIVED` com `archived_at` preenchido, e qualquer alteração de conteúdo mesmo acompanhada do arquivamento.

A forma é deliberadamente a mesma da correção 004C-01: duas entidades históricas com invariantes divergentes seriam duas regras para lembrar em vez de uma. A comparação é da linha inteira via `to_jsonb`, com `status` e `archived_at` neutralizados — campo a campo, `focus_type` e `focus_offer_id` teriam nascido fora da guarda quando a 004D os acrescentou.

### 6.3 Provas da correção

`scripts/sql/growth-objectives-immutability-004d01-proof.sql` → **30 casos, 30 passaram, 0 falharam**, transacional com rollback.

Cobre: as duas RPCs continuam criando, trocando e mantendo idempotência, com histórico e um único `ACTIVE`; `service_role` recusado com `42501` ao alterar objetivo/jornada/sucesso, foco, tenant/autoria/data e conteúdo de versão arquivada; dono do banco recusado com `55000` nos mesmos casos, mais reativação de arquivada, alteração junto do arquivamento e `archived_at` sem arquivar; a transição permitida continua funcionando para os dois papéis; e a fronteira do browser inalterada.

Regressão: `scripts/sql/growth-objective-focus-004d-proof.sql` reexecutado após a mudança → **32/32**, sem falhas. Reexecutado por ter sido alterado um primitive compartilhado (grants e gatilho da tabela) — as demais provas não foram repetidas.

Pós-estado remoto: `has_table_privilege('service_role', …, 'UPDATE')` agora **false**; UPDATE por coluna restrito a `status` e `archived_at`; trigger habilitada; função sem EXECUTE para `anon`/`authenticated`; `authenticated` só SELECT; zero fixtures residuais. Advisors idênticos ao baseline.

Nada de UI, motor de jornada, foco, ofertas, Meta ou IA foi alterado — o delta é exclusivamente de privilégio e guarda de banco.

## 7. Handoff

Branch `claude/rodada-004d-guided-growth-journey`, HEAD publicado em `origin`. PR #16 mantido **aberto, draft, base `main`, não mergeado**.

Branch atualizada com a `main` documental por merge, preservando o delta da 004D; o único conflito foi `estado.md`, resolvido pela versão da `main`, que é o estado soberano.

Migrations aplicadas nesta branch, nenhuma reescrita:

- `20260825230000_add_growth_objective_focus` (004D);
- `20260825240000_enforce_growth_objective_immutability` (004D-01).

`estado.md` da branch em **CORREÇÃO 004D-01 EXECUTADA — AGUARDANDO REAUDITORIA GPT**. Working tree limpa.

CI da correção: `32896982284` — success.

Nenhuma pendência técnica. Próximo ator: **GPT auditor**, para reauditoria.
