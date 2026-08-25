# RODADA 004C — OFFER CATALOG + BUSINESS CONTEXT FOUNDATION

Status documental: **ESPECIFICAÇÃO DA RODADA**. A autorização operacional vive em `estado.md`.

Data: 2026-08-25

Base obrigatória: `main` após a promoção da 004B e após os documentos de transferência pós-004B.

Produto canônico: **Quoron**.

Branch de execução sugerida: `claude/rodada-004c-offer-catalog-business-context`.

## 1. Objetivo

Criar a primeira memória estruturada das **ofertas reais do negócio** sem depender da Meta nem de provider real de IA.

Ao final da rodada, o Quoron deve conseguir representar, de forma simples para o usuário e segura internamente:

- o que a empresa oferece;
- se é produto, serviço, pacote/plano ou outro tipo;
- uma descrição curta;
- a principal proposta de valor daquela oferta;
- como o preço é apresentado ao cliente;
- o valor/faixa quando houver preço numérico;
- o histórico de alterações relevantes da oferta sem sobrescrever silenciosamente a versão anterior.

A rodada cria a ponte conceitual:

`contexto do negócio → ofertas estruturadas → objetivo → jornada → resultado`

Nesta rodada, porém, **não ligar ainda uma oferta específica a `growth_objectives`**. A relação oferta ↔ objetivo será avaliada depois que o catálogo estruturado existir e estiver auditado.

## 2. Fundamento de produto

O `GROWTH_INTELLIGENCE_CANONICAL.md` determina que o Quoron construa progressivamente contexto sobre produtos/serviços, proposta de valor, ofertas, preços e demais sinais do negócio, e afirma explicitamente que `business_profile` é apenas a primeira camada desse contexto.

A rodada deve obedecer à Lei da Simplicidade Guiada:

- a complexidade fica no sistema;
- o usuário não deve preencher ficha técnica de catálogo;
- nenhuma terminologia de banco, API, enum ou modelagem aparece na experiência padrão;
- campos avançados não entram agora sem necessidade comprovada.

Mídia paga permanece pilar central conforme `PAID_MEDIA_CANONICAL.md`, mas esta rodada não cria campanha, anúncio, gasto ou integração Meta.

## 3. READ SET OBRIGATÓRIO

Além de `CLAUDE.md`, `estado.md` e este mandato:

1. `docs/01-produto/GROWTH_INTELLIGENCE_CANONICAL.md` §§2–4, 7, 13–17 e 19;
2. `docs/01-produto/PAID_MEDIA_CANONICAL.md` §§2–9;
3. `docs/03-canonical/DATA_MODEL.md` §§1–2, 16–18;
4. `docs/03-canonical/SECURITY_MODEL.md` §§3–5, 12, 15, 18, 20 e 25;
5. `supabase/migrations/20260825180000_create_growth_objectives.sql` + `src/lib/business/organization-context.ts` como referência de autorização, RLS e contexto multi-organização já promovidos.

### Sob demanda

- `docs/03-canonical/TECHNICAL_SPEC.md` §§3–5 e 30;
- `src/lib/business/schemas.ts`;
- `src/lib/business/money.ts`;
- `src/app/actions/business.ts`;
- `src/components/business/*`;
- `src/app/conta/page.tsx`;
- `src/app/objetivo/page.tsx` apenas para coerência visual/navegação, sem alterar seu contrato de objetivo.

Não reler histórico de 003B/Meta por ritual. Esta rodada parte da `main`, não da branch 003B.

## 4. Escopo de domínio — ofertas estruturadas

Criar duas entidades para separar **identidade estável da oferta** de **versões imutáveis do seu conteúdo**.

### 4.1 `public.business_offers`

Representa a identidade lógica de uma oferta ao longo do tempo.

Campos mínimos:

- `id uuid` PK;
- `organization_id uuid not null`;
- `status text not null` — `ACTIVE | ARCHIVED`;
- `created_by uuid null` FK `auth.users` com `on delete set null`;
- `created_at timestamptz not null`;
- `archived_at timestamptz null`.

Regras:

- `ACTIVE` exige `archived_at is null`;
- `ARCHIVED` exige `archived_at is not null`;
- fluxo normal não usa DELETE;
- arquivamento preserva todas as versões e a identidade da oferta.

Criar unique/constraint suficiente para permitir FK composta tenant-safe de versões para `(organization_id, id)`.

### 4.2 `public.business_offer_versions`

Representa o conteúdo versionado de uma oferta.

Campos mínimos:

- `id uuid` PK;
- `organization_id uuid not null`;
- `offer_id uuid not null`;
- `version_no integer not null`;
- `name text not null`;
- `offer_type text not null`;
- `description text null`;
- `value_proposition text null`;
- `price_mode text not null`;
- `price_min_minor bigint null`;
- `price_max_minor bigint null`;
- `currency text not null`;
- `created_by uuid null` FK `auth.users` com `on delete set null`;
- `created_at timestamptz not null`;
- `superseded_at timestamptz null`.

Relação obrigatória:

- `(organization_id, offer_id)` deve referenciar `business_offers (organization_id, id)` de modo que uma versão nunca possa apontar para oferta de outro tenant.

### 4.3 Taxonomias iniciais

`offer_type`:

- `PRODUCT` — produto;
- `SERVICE` — serviço;
- `PACKAGE` — pacote/plano;
- `OTHER` — outro.

`price_mode`:

- `FIXED` — preço fixo;
- `STARTING_AT` — a partir de;
- `RANGE` — faixa de preço;
- `QUOTE` — sob orçamento;
- `FREE` — gratuito;
- `NOT_INFORMED` — usuário prefere não informar agora.

Identificadores são internos. A UI usa apenas português simples.

### 4.4 Regras de preço

As constraints devem impedir estados contraditórios:

- valores monetários nunca negativos;
- `FIXED`: `price_min_minor` obrigatório e `price_max_minor` ausente;
- `STARTING_AT`: `price_min_minor` obrigatório e `price_max_minor` ausente;
- `RANGE`: mínimo e máximo obrigatórios, com máximo >= mínimo;
- `QUOTE`, `FREE` e `NOT_INFORMED`: nenhum valor numérico persistido;
- `currency` vem da moeda padrão da organização validada server-side; o browser não escolhe moeda nesta rodada.

Reutilizar helpers monetários existentes quando adequado. Não usar float para dinheiro.

### 4.5 Regras de texto

Aplicar limites proporcionais e recusar strings vazias que fingem informação.

Referência de UX, não obrigação literal de tamanho se houver justificativa melhor no código:

- nome: curto, aproximadamente até 120 caracteres;
- descrição: aproximadamente até 600;
- proposta de valor: aproximadamente até 400.

`description` e `value_proposition` podem ser `NULL`.

## 5. Versionamento

Uma edição material de oferta **não atualiza silenciosamente a versão corrente em place**.

Regras:

- cada oferta começa em `version_no = 1`;
- no máximo uma versão corrente por oferta, identificada por `superseded_at is null`;
- editar a oferta marca a versão corrente com `superseded_at` e cria uma nova versão `version_no + 1` na mesma transação;
- reenvio idêntico deve ser idempotente e retornar a versão corrente sem criar histórico falso;
- concorrência deve ser serializada por oferta para impedir duas versões correntes;
- versão superseded não volta a ser alterada.

O objetivo é preservar a memória de como a empresa apresentava sua oferta em cada período, base futura para análises sem reconstrução por adivinhação.

## 6. Escrita server-side segura

Browser não grava diretamente `business_offers` nem `business_offer_versions`.

Criar primitive/RPC server-side com nomes claros. É aceitável usar:

- uma RPC de criar/revisar oferta com `offer_id` opcional; e
- uma RPC separada de arquivamento;

ou separação equivalente, desde que o contrato fique pequeno, auditável e fail-closed.

Obrigatório:

- execução apenas por `service_role`;
- `p_user_id` vem de identidade validada server-side, nunca do formulário;
- `organization_id` vem de `resolveOrganizationContext()`; não escolher tenant por ordem de query;
- organização deve estar `ACTIVE`;
- membership deve estar `ACTIVE`;
- somente `owner` ou `admin` cria, revisa ou arquiva oferta;
- `member` comum pode ler, não alterar;
- offer/version id de outro tenant falha fechado;
- oferta `ARCHIVED` não é revisada silenciosamente;
- archive repetido é idempotente;
- browser não recebe `service_role`, IDs internos desnecessários ou qualquer segredo.

Não usar `SECURITY DEFINER` para contornar autorização.

## 7. RLS e grants

Ativar RLS nas duas tabelas.

Leitura:

- membro `ACTIVE` de organização `ACTIVE` pode ler ofertas/versões da própria organização;
- não membro não lê;
- membro de outra organização não lê;
- histórico não vaza cross-tenant.

Escrita:

- `anon` e `authenticated` sem INSERT/UPDATE/DELETE direto;
- RPC(s) sem EXECUTE para `anon`/`authenticated` e com EXECUTE apenas para `service_role`;
- server path continua validando organização e papel mesmo usando credencial privilegiada.

## 8. Compatibilidade com `business_profiles.primary_offer`

O campo legado `business_profiles.primary_offer` permanece preservado nesta rodada.

Não:

- apagá-lo;
- torná-lo automaticamente a nova fonte canônica;
- criar `business_offers` em migration a partir dele sem confirmação humana;
- sincronizar silenciosamente os dois sentidos.

Quando a organização ainda não tiver oferta estruturada e `primary_offer` legado estiver preenchido, a UI **pode usá-lo como sugestão/prefill editável** para reduzir retrabalho. Persistir só após ação explícita do usuário.

Após existir ao menos uma oferta estruturada, novas capacidades do produto devem preferir a estrutura nova quando seu contrato exigir oferta. A retirada definitiva do campo legado será decisão futura, não escopo desta rodada.

## 9. Experiência do usuário

Criar superfície protegida simples, preferencialmente `/ofertas`, com acesso claro a partir de `/conta`.

### 9.1 Estado vazio

Explicar em linguagem simples por que a informação é útil.

Ação principal:

**Adicionar uma oferta**

Não falar em catálogo técnico, entidade, registro ou versão.

### 9.2 Cadastro/edição

Perguntas visíveis devem ser curtas:

1. **O que você oferece?**
2. **É um produto, serviço ou pacote?**
3. **Como você descreveria essa oferta?** — opcional;
4. **Por que um cliente escolheria essa oferta?** — opcional;
5. **Como você cobra?**

Preço numérico só aparece quando o modo escolhido exigir.

A moeda padrão da empresa é aplicada pelo sistema sem pedir escolha ao usuário nesta rodada.

### 9.3 Lista

Mostrar ofertas ativas em linguagem humana, no mínimo:

- nome;
- tipo;
- preço/faixa/sob orçamento/gratuito/não informado;
- ação de editar;
- ação de arquivar com confirmação adequada.

Não mostrar `version_no`, UUID, `offer_type`, `price_mode` ou termos de banco.

### 9.4 Histórico

O histórico precisa existir no domínio, mas **não é obrigatório criar uma tela detalhada de histórico nesta rodada**.

A UI pode apenas indicar que alterações são preservadas, se isso for útil. Não ampliar escopo para timeline completa.

### 9.5 Multi-organização

Preservar o comportamento fail-closed da 004B:

- nenhuma organização é escolhida implicitamente;
- se a conta possuir múltiplas memberships, não gravar oferta;
- mostrar estado explícito e seguro;
- não implementar seletor multi-organização nesta rodada.

## 10. Harmonização documental absorvida nesta rodada

Existe uma dívida documental já registrada pelo `PAID_MEDIA_CANONICAL.md`: documentos anteriores ainda possuem formulações que podem fazer mídia paga parecer periférica.

Como esta é a próxima rodada substantiva, absorver a correção sem criar housekeeping separado.

Revisar e harmonizar **somente onde houver conflito real**:

- `docs/01-produto/MVP_CANONICAL.md`;
- `docs/00-governanca/IMPLEMENTATION_ROADMAP.md`;
- `.gpt/PROJECT_PROMPT.md` se ainda contiver formulação conflitante;
- `docs/03-canonical/DATA_MODEL.md` para registrar `business_offers` + `business_offer_versions` como novo contrato implementado;
- `docs/03-canonical/TECHNICAL_SPEC.md` apenas na seção de Business Profile/Context se necessário para não declarar `business_profiles` como estrutura única de oferta.

Regra de precedência a preservar:

- orgânico entrega valor próprio;
- mídia paga é pilar central da trajetória do Quoron;
- usuário não é obrigado a gastar para começar;
- permissão técnica ≠ campanha ≠ aprovação ≠ gasto;
- gasto exige aprovação humana explícita.

Não reescrever canônicos inteiros e não tocar histórico antigo por estilo.

## 11. Fora de escopo

Não implementar nesta rodada:

- vínculo `offer_id` em `growth_objectives`;
- produtos de estoque, SKU, variação, categoria fiscal, custo, margem ou inventário;
- checkout, pedido, pagamento ou e-commerce;
- personas/públicos estruturados;
- concorrentes;
- calendário/sazonalidade;
- Content Intelligence/Oportunidades;
- provider real de IA, API key, SDK, fallback ou chamada paga;
- geração de copy/imagem;
- qualquer alteração da 003B ou fluxo Meta;
- importação/publicação Instagram;
- campanhas, anúncios, aprovação financeira ou gasto;
- seletor multi-organização;
- App Shell/Hoje definitivo.

Se algum item fora de escopo parecer necessário para concluir a rodada, **parar e devolver a decisão ao GPT** em vez de ampliar silenciosamente.

## 12. Testes mínimos

### 12.1 Schema/constraints

Provar:

1. cria oferta v1 válida;
2. edição material arquiva/supersede v1 e cria v2;
3. reenvio idêntico não cria v2 falsa;
4. nunca existem duas versões correntes da mesma oferta;
5. versão aponta apenas para oferta do mesmo tenant;
6. `ACTIVE/ARCHIVED` coerentes com `archived_at`;
7. `FIXED` exige mínimo e rejeita máximo;
8. `STARTING_AT` exige mínimo e rejeita máximo;
9. `RANGE` exige ambos e máximo >= mínimo;
10. `QUOTE/FREE/NOT_INFORMED` recusam valores numéricos;
11. valor negativo é recusado;
12. moeda persistida é a moeda validada da organização;
13. taxonomia desconhecida é recusada;
14. string vazia indevida é recusada;
15. versões antigas permanecem legíveis após edição/arquivo.

### 12.2 Autorização/RLS

Com ao menos duas organizações e usuários distintos:

1. owner ACTIVE cria/revisa/arquiva;
2. admin ACTIVE cria/revisa/arquiva;
3. member comum não escreve;
4. usuário de outra organização não escreve;
5. organização inativa não escreve;
6. membership inativa não escreve;
7. membro ACTIVE lê própria organização;
8. não lê outra organização;
9. browser não INSERT/UPDATE/DELETE;
10. RPC não executa para anon/authenticated;
11. cross-tenant por ID arbitrário falha fechado;
12. conta multi-organização não escolhe tenant implicitamente pela aplicação.

### 12.3 UI

- estado vazio orienta com CTA único;
- cadastro funciona com nome + tipo + modo de preço, mantendo campos opcionais realmente opcionais;
- campos monetários aparecem somente quando necessários;
- preço é apresentado em formato humano;
- editar preserva experiência simples apesar do versionamento interno;
- arquivar pede confirmação e remove da lista ativa;
- legacy `primary_offer` pode aparecer como prefill, mas não é persistido automaticamente;
- nenhum enum/UUID aparece ao usuário;
- nenhuma superfície afirma usar IA ou Meta nesta capacidade.

## 13. Prova remota, durabilidade e CI

Se houver DDL:

1. criar branch da rodada a partir da `main` atualizada;
2. migration e artefatos responsáveis pela mutação devem estar commitados e publicados em `origin` antes do primeiro `db push`;
3. executar `supabase db push --linked` somente após esse checkpoint durável;
4. criar prova SQL transacional versionada para constraints, versionamento, RLS, grants e cross-tenant;
5. garantir rollback/cleanup sem fixtures residuais;
6. conferir Advisors apenas no que toca o delta;
7. não reescrever migrations antigas já aplicadas.

Se a camada de segurança exigir aprovação humana para a mutação remota, parar exatamente nesse gate e informar ao GPT. O fundador não deve receber uma sequência técnica para interpretar sozinho.

CI final da PR deve passar:

- lint;
- typecheck;
- typecheck Edge Functions;
- testes;
- build.

Suíte completa uma vez na CI final por padrão, sem duplicação desnecessária.

## 14. Handoff obrigatório

Antes de declarar a rodada concluída, Claude deve entregar um único handoff contendo:

- branch e HEAD publicados;
- migrations criadas/aplicadas;
- resumo do delta;
- provas locais/remotas relevantes;
- resultado dos Advisors afetados;
- PR para `main`;
- CI final;
- relatório em `rodadas/claude/RELATORIO_RODADA_004C_OFFER_CATALOG_BUSINESS_CONTEXT.md`;
- `estado.md` da branch atualizado para **EXECUTADA / AGUARDANDO AUDITORIA GPT**, nunca promovida;
- working tree limpa ou explicação objetiva do que sobrou.

Claude **não promove, não mergeia e não declara a rodada aprovada**.

## 15. Critério de saída

A 004C só pode ser considerada executada quando existir prova suficiente de que:

1. uma empresa consegue cadastrar uma oferta de forma simples;
2. alterações preservam a versão anterior em vez de apagá-la silenciosamente;
3. preço é estruturado sem usar float e sem estados contraditórios;
4. dados não vazam nem podem ser escritos cross-tenant;
5. multi-organização continua fail-closed;
6. o campo legado `primary_offer` não foi convertido automaticamente em fato estruturado;
7. nenhuma dependência Meta ou provider real de IA foi introduzida;
8. a documentação ativa tocada não reintroduz mídia paga como capacidade periférica;
9. branch, migration, relatório, PR e CI estão duráveis e auditáveis.

Depois disso, o próximo ator é o **GPT auditor**.