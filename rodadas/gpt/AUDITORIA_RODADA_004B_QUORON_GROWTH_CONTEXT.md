# AUDITORIA — RODADA 004B: QUORON BRANDING + GROWTH CONTEXT FOUNDATION

Data: 2026-08-25

Mandato: `rodadas/gpt/RODADA_004B_QUORON_GROWTH_CONTEXT.md`

Branch auditada: `claude/rodada-004b-quoron-growth-context`

PR: #14 — draft, aberta, não mergeada

HEAD auditado: `c0be0427b837e71a2532fbf228618f400b180070`

## 1. Veredito

**EXECUTADA; BASE SUBSTANTIVA APROVADA; REPROVADA PARA PROMOÇÃO ATÉ CORREÇÃO 004B-01.**

A rodada entregou corretamente a maior parte do mandato: branding visível Quoron, onboarding reduzido, entidade versionada `growth_objectives`, escrita privilegiada com autorização no banco, RLS de leitura, histórico/idempotência, distinção entre resultado desejado e observabilidade e quitação dos índices de FK da 004A.

Há, porém, um bloqueador funcional/tenancy no caminho de objetivo e duas lacunas menores do próprio mandato. Nenhuma exige reabrir a arquitetura ou as migrations já aplicadas.

## 2. Evidência independente aprovada

### 2.1 GitHub / CI

PR #14 está `mergeable=true`, draft e não mergeada.

CI `32877064536`: **success**.

O job final confirmou:

- lint verde;
- typecheck verde;
- Edge Functions verde;
- **766/766 testes** em 33 arquivos;
- build verde;
- rota `/objetivo` incluída no build;
- package runtime identificado como `quoron@0.0.0`.

### 2.2 Supabase remoto

Confirmado independentemente no project ref canônico:

- migration `20260825180000_create_growth_objectives` aplicada;
- migration `20260825190000_index_growth_objectives_created_by` aplicada;
- `growth_objectives` existe e está vazia após as provas;
- RLS habilitado;
- uma policy SELECT;
- `anon` sem grants;
- `authenticated` apenas SELECT;
- `service_role` SELECT/INSERT/UPDATE e sem DELETE;
- RPC `set_active_growth_objective` executável somente por `service_role` entre os papéis da aplicação;
- `target_audience` e `acquisition_goal` agora são nullable;
- constraints de status/taxonomias/detalhes presentes;
- índice único parcial garante um único `ACTIVE` por organização;
- os quatro índices de cobertura de FK de `ai_runs` exigidos pela 004B existem;
- índice de `growth_objectives.created_by` existe.

O advisor de performance não mostra mais os quatro `unindexed_foreign_keys` de `ai_runs`. Restam apenas dívidas anteriores da trilha Meta e avisos de índices ainda não utilizados em tabelas novas/vazias.

O advisor de segurança não trouxe regressão nova da 004B. O WARN de leaked-password protection é anterior.

## 3. Partes aprovadas

### A. Branding no runtime

A constante `APP_NAME = "Quoron"` centraliza a marca e os títulos usam `pageTitle()` quando aplicável.

Home, metadata, páginas de autenticação, conta e textos ativos tocados pela rodada migraram para Quoron sem renomear repo, pasta, Supabase ref ou recursos Meta.

A Home deixou de exibir estágio técnico de rodada e não promete campanha/automação inexistente.

### B. Onboarding progressivo

O primeiro formulário foi reduzido aos quatro campos autorizados:

- nome;
- segmento;
- cidade/região;
- oferta principal.

A action lê somente esses campos e grava os progressivos como `NULL`, sem aceitar valores injetados pelo POST. Após bootstrap, redireciona para `/objetivo`.

### C. Domínio `growth_objectives`

A modelagem separada de `business_profiles` está coerente com o canônico.

A migration preserva histórico, impede dois objetivos `ACTIVE`, relaciona estado/timestamp e restringe taxonomias.

A RPC:

- roda como `security invoker`;
- é restrita a `service_role`;
- lê papel/status no banco;
- exige organização e membership ativas;
- restringe mutação a owner/admin;
- usa lock por organização;
- arquiva + insere atomicamente;
- trata reenvio idêntico de forma idempotente.

### D. UX do objetivo

A superfície `/objetivo` usa as três perguntas do mandato em linguagem comum e não expõe UUID, enum ou terminologia de Ads Manager.

A UI declara corretamente que o resultado desejado não equivale a mensuração já disponível.

## 4. BLOQUEADOR A — seleção silenciosa de organização

### Fato

O produto já possui uma regra explícita em `getAccountBusinessState()`: quando existem várias memberships, o estado é `multiplas-organizacoes` e **nada é selecionado automaticamente**.

A 004B introduziu dois caminhos que quebram essa regra:

1. `src/lib/growth/objective-state.ts` filtra memberships ativas e usa `ativas[0]`;
2. `src/app/actions/growth.ts` consulta memberships ativas com `.limit(1)` e usa a primeira `organization_id` retornada.

### Consequência

Uma conta participante de dois negócios pode abrir `/objetivo` e visualizar/alterar o objetivo de um negócio escolhido implicitamente pela ordem de retorno do banco.

A RPC continua impedindo acesso a organização da qual o usuário não participa; portanto não é um bypass clássico de autorização. O problema é outro e ainda bloqueante: **mutação potencial no tenant errado**, sem seleção explícita do negócio.

Também surgem contradições de UX:

- `/conta` pode dizer “Mais de um negócio nesta conta; nada é selecionado automaticamente” e, na mesma página, o bloco de objetivo mostrar um negócio escolhido silenciosamente;
- com uma única membership inativa, o negócio é “indisponível” no estado já promovido, enquanto o novo estado de objetivo pode classificá-lo como “sem organização” e sugerir cadastrar outro negócio.

### Veredito

**BLOQUEANTE PARA PROMOÇÃO.**

Enquanto ainda não existe seletor multi-organização, o caminho de objetivo deve falhar fechado diante de ambiguidade e refletir os mesmos estados já promovidos de conta.

## 5. ACHADO B — contrato nullable incompleto

A migration tornou `business_profiles.target_audience` nullable, como exigido.

Porém `src/lib/business/account.ts` permanece com:

- `targetAudience: string`;
- leitura `asText(row.target_audience) ?? ""`.

Isso transforma ausência real do banco em string vazia inventada, contrariando a regra desta própria rodada de que ausência progressiva é `NULL` e o requisito explícito de atualizar tipos/leitura/UI para os campos agora opcionais.

A UI atual acaba exibindo “Não informado”, mas o contrato de domínio fica incorreto.

**Correção pequena e obrigatória na 004B-01.**

## 6. ACHADO C — branding incompleto em documentação ativa

O passe de branding atualizou produto e canônicos técnicos, mas deixou documentos atuais — não históricos — com o nome antigo como identidade vigente.

Confirmados na `main`:

- `.gpt/CHAT_ENTRY_PROMPT.md`;
- `docs/00-governanca/ACTIVE_DOCS.md`;
- `docs/00-governanca/PROJECT_CHARTER.md`;
- `docs/00-governanca/IMPLEMENTATION_ROADMAP.md`;
- `docs/00-governanca/ARCHITECTURE_EXECUTION_BOUNDARY.md`;
- `docs/00-governanca/EXTERNAL_CONFIGURATION_GATE.md`;
- `docs/00-governanca/DOCUMENTATION_LIFECYCLE.md`;
- `docs/00-governanca/HISTORY_SUMMARY.md` no título/identidade corrente.

O histórico dentro de `HISTORY_SUMMARY.md` não deve ser reescrito; apenas a identificação corrente do documento/projeto.

O mandato 004B exigia harmonizar documentos canônicos/ativos onde `Tráfego Pago` ainda fosse o nome atual do produto. Portanto a saída não está completa.

## 7. Nuance da prova RLS

O script SQL da 004B prova ACL, presença de RLS/policy e reproduz a expressão da policy para fixtures. Ele não executa a leitura efetivamente sob `role authenticated + auth.uid()`; portanto a frase do relatório de que o caso foi provado “via RLS” é mais forte que a evidência do script.

A policy implementada segue o padrão promovido e a inspeção independente não encontrou erro estrutural. Isso não é motivo isolado para reabrir a migration, mas a Correção 004B-01 deve acrescentar **uma prova remota focada do efeito real da policy**, sem repetir os 29 casos anteriores.

## 8. Fora da correção

Não reabrir na 004B-01:

- Meta/003B;
- classifier Meta;
- importação Instagram;
- provider real de IA;
- API key/SDK/chamada paga;
- campanha/anúncio/gasto;
- Financial Approval;
- CRM/leads;
- App Shell/Hoje;
- schema de `growth_objectives`, salvo se surgir evidência concreta nova.

## 9. Próximo passo

Executar somente `CORRECAO_004B_01_MULTI_ORG_NULLABLE_BRANDING.md` na mesma branch/PR #14.

Após execução, retornar a GPT para reauditoria. Não promover a PR #14 antes disso.