# RODADA 004D — GUIDED GROWTH JOURNEY FOUNDATION

Status documental: **ESPECIFICAÇÃO DA RODADA**. A autorização operacional vive em `estado.md`.

Data: 2026-08-25

Base obrigatória: `main` após a promoção da 004C e após a consolidação da tese agêntica do produto.

Produto canônico: **Quoron**.

Branch de execução sugerida:

`claude/rodada-004d-guided-growth-journey`

## 1. Objetivo

Materializar pela primeira vez a tese de que o Quoron **conduz** o pequeno negócio pelo processo de marketing, em vez de apenas oferecer telas para o usuário descobrir sozinho o que fazer.

A rodada deve entregar duas fundações complementares e independentes de Meta e de IA real:

1. **Foco atual de crescimento** — registrar se o objetivo vigente está orientado a uma oferta específica ou ao negócio como um todo;
2. **Motor determinístico de próximo passo** — derivar do estado real do negócio qual é a próxima ação que o usuário deve realizar, explicar em linguagem simples por que ela importa e conduzi-lo diretamente para essa ação.

Ao final da rodada, o fluxo inicial deve deixar de ser uma coleção de páginas isoladas e passar a se comportar como uma trilha:

`negócio → objetivo → ofertas → foco → base estratégica pronta`

Esta rodada cria o **esqueleto de condução** sobre o qual futuras capacidades poderão acrescentar conexão Meta, observação, análise, recomendação, aprovação, execução, CRM e aprendizado.

A 004D não deve fingir inteligência inexistente: o próximo passo é derivado por regras explícitas e auditáveis, sem provider de IA.

---

## 2. Fundamento de produto

Leis canônicas obrigatórias:

- **A complexidade pertence ao sistema, não ao usuário.**
- **O usuário não precisa saber operar marketing digital para usar o Quoron; o Quoron deve ensinar o necessário para preservar soberania humana sobre as decisões do negócio.**
- experiência padrão: `Quoron entende o contexto → identifica o próximo passo → explica → recomenda → pede decisão quando necessária → executa o autorizado → mede → aprende`;
- aprendizagem e recomendação material devem permanecer baseadas em evidência;
- não perguntar aquilo que o sistema possa inferir com segurança;
- não inferir como fato aquilo que exige decisão empresarial do usuário.

Nesta rodada, “agêntico” significa **orquestração determinística do próximo passo**, não autonomia irrestrita e não uso obrigatório de LLM.

---

## 3. READ SET OBRIGATÓRIO

Além de `CLAUDE.md`, `estado.md` e este mandato, ler integralmente:

1. `docs/01-produto/AGENTIC_PRODUCT_CANONICAL.md`;
2. `docs/01-produto/GROWTH_INTELLIGENCE_CANONICAL.md`;
3. `docs/01-produto/PAID_MEDIA_CANONICAL.md`;
4. `docs/03-canonical/SECURITY_MODEL.md`;
5. `docs/03-canonical/AI_ARCHITECTURE.md`;
6. `supabase/migrations/20260825180000_create_growth_objectives.sql`;
7. `supabase/migrations/20260825210000_create_business_offers.sql`;
8. `supabase/migrations/20260825220000_enforce_offer_version_immutability.sql`;
9. `src/lib/business/organization-context.ts`;
10. `src/lib/growth/objective-state.ts`;
11. `src/lib/offers/offer-catalog.ts`;
12. `src/lib/auth/routes.ts` e `src/lib/auth/redirect.ts`.

### Sob demanda

- `src/app/actions/growth.ts` e testes;
- `src/app/actions/offers.ts` e testes;
- `src/app/actions/auth.ts` e testes;
- `src/app/conta/page.tsx`;
- `src/app/objetivo/page.tsx`;
- `src/app/ofertas/page.tsx`;
- componentes de `growth`, `offers` e `business`;
- `docs/03-canonical/DATA_MODEL.md`;
- `docs/03-canonical/TECHNICAL_SPEC.md`;
- `docs/00-governanca/IMPLEMENTATION_ROADMAP.md` somente se necessário para registrar a nova fundação de orquestração.

Não reler a trilha 003B/Meta por ritual. A 004D parte da `main` e não toca integração externa.

---

## 4. Conceito de foco atual

Um objetivo de crescimento pode estar orientado:

- a uma **oferta específica** do catálogo estruturado; ou
- ao **negócio como um todo**.

Exemplos:

- “gerar mais agendamentos” + “Implante dentário” → foco em oferta;
- “aumentar audiência qualificada do perfil” → pode ser foco no negócio;
- “gerar conversas” + “Consultoria inicial” → foco em oferta.

O Quoron não deve escolher silenciosamente o foco quando essa escolha puder alterar a estratégia. Mesmo que exista uma única oferta, ela pode ser sugerida/preselecionada, mas a persistência do foco exige confirmação explícita do usuário.

---

## 5. Evolução de `growth_objectives`

Criar migration **aditiva**; não reescrever migrations 004B/004C já aplicadas.

Adicionar a `public.growth_objectives`:

- `focus_type text null`;
- `focus_offer_id uuid null`.

Taxonomia interna inicial:

`focus_type`:

- `BUSINESS` — negócio como um todo;
- `OFFER` — uma oferta específica.

Regras de coerência no banco:

- `focus_type is null` significa **foco ainda não definido** e exige `focus_offer_id is null`;
- `BUSINESS` exige `focus_offer_id is null`;
- `OFFER` exige `focus_offer_id is not null`;
- valores desconhecidos são rejeitados;
- `(organization_id, focus_offer_id)` deve referenciar `business_offers (organization_id, id)` de modo tenant-safe;
- nenhuma relação cross-tenant pode depender apenas da aplicação;
- adicionar índice de cobertura da FK quando materialmente necessário.

Não tornar `focus_type` `NOT NULL` nesta rodada: objetivos já promovidos existem sem foco e esse estado é válido como **contexto progressivamente incompleto**.

Não ligar objetivo a `business_offer_versions`. O objetivo aponta para a identidade estável da oferta. O histórico de versões da oferta permanece separado e preservado pela 004C.

---

## 6. Histórico do objetivo ao escolher ou mudar foco

Definir foco é mudança estratégica material e não deve reescrever silenciosamente o objetivo vigente em place.

Criar uma RPC pequena, por exemplo:

`set_growth_objective_focus(...)`

A nomenclatura exata pode variar, mas o contrato deve cumprir:

- chamada somente por `service_role`;
- `p_user_id` vem da identidade validada server-side, nunca do formulário;
- organização vem de `resolveOrganizationContext()`, nunca de escolha implícita;
- owner/admin com organização e membership `ACTIVE` podem alterar foco;
- member comum é somente leitura;
- o objetivo informado/selecionado precisa ser o objetivo `ACTIVE` da mesma organização;
- `OFFER` exige oferta `ACTIVE` da mesma organização;
- oferta arquivada não pode ser selecionada como novo foco;
- cross-tenant falha fechado;
- operação serializada por organização;
- reenvio idêntico é idempotente;
- ao definir/mudar foco, arquivar o objetivo vigente e criar uma nova linha copiando os campos de objetivo/jornada/sucesso e aplicando o foco novo, na mesma transação;
- o novo `created_by` deve representar o usuário que tomou a decisão de foco;
- uma única linha `ACTIVE` continua garantida no banco.

Decisão importante:

**não alterar o contrato existente de `set_active_growth_objective` para preservar foco automaticamente.**

Se o usuário alterar o próprio objetivo, a nova versão criada pelo fluxo atual pode nascer novamente com `focus_type = null`. Isso é desejável: uma mudança de direção exige que o Quoron confirme novamente o que deve ser priorizado, em vez de carregar silenciosamente um foco antigo para um objetivo novo.

---

## 7. Oferta focada arquivada

Arquivar uma oferta não deve apagar nem reescrever o histórico do objetivo.

Se o objetivo `ACTIVE` estiver com `focus_type = OFFER` e a oferta correspondente tiver sido arquivada depois:

- não apagar `focus_offer_id` silenciosamente;
- não reativar a oferta;
- não escolher outra oferta automaticamente;
- o motor de próximo passo deve detectar que o foco ficou indisponível e orientar o usuário a escolher um novo foco.

Assim, o estado passado permanece auditável e a decisão nova continua humana.

---

## 8. Motor determinístico de próximo passo

Criar uma fronteira server-only pequena, por exemplo:

`resolveGuidedGrowthJourney()`

ou nome equivalente.

Ela deve derivar o próximo passo a partir dos dados reais já promovidos, sem gravar “recomendação” em tabela nesta rodada.

O resultado deve ser um union/type explícito, nunca prosa livre como contrato.

Estados mínimos esperados:

1. `SEM_ORGANIZACAO`
   - ação principal: criar/completar o negócio;
2. `NEGOCIO_INDISPONIVEL`
   - sem fingir ação disponível;
3. `MULTIPLAS_ORGANIZACOES`
   - falha fechado; nenhuma organização escolhida implicitamente;
4. `DEFINIR_OBJETIVO`
   - organização existe, mas não há objetivo ativo;
5. `ADICIONAR_OFERTA`
   - objetivo existe, mas não há oferta estruturada ativa;
6. `ESCOLHER_FOCO`
   - objetivo e ofertas existem, mas o foco ainda não foi confirmado;
7. `REESCOLHER_FOCO`
   - foco aponta para oferta agora arquivada/indisponível;
8. `BASE_ESTRATEGICA_PRONTA`
   - negócio, objetivo, oferta(s) e foco coerente existem.

Pode haver nomenclatura técnica diferente se semanticamente equivalente e tipada.

### 8.1 Ordem canônica desta fundação

Para a experiência inicial da 004D, usar:

`negócio → objetivo → ofertas → foco → base pronta`

Essa ordem é de condução inicial, não uma lei universal para todas as futuras jornadas do produto.

### 8.2 Sem falsa recomendação

`BASE_ESTRATEGICA_PRONTA` não deve fabricar um próximo passo de Meta ou IA que ainda esteja bloqueado.

A tela deve dizer, em linguagem simples, que a base estratégica inicial está pronta e que os próximos módulos de observação/análise serão acrescentados conforme as integrações do produto forem habilitadas.

Não oferecer CTA para fluxo Meta bloqueado nesta rodada.

---

## 9. Experiência guiada `/inicio`

Criar rota protegida inicial:

`/inicio`

Ela é a primeira superfície de **condução**, mas **não é o App Shell/Hoje definitivo**.

Objetivo da página:

- mostrar uma única ação principal coerente com o estado atual;
- explicar brevemente **o que precisa ser feito**;
- explicar **por que isso importa** para o crescimento do negócio;
- mostrar **o que muda depois** desse passo;
- levar diretamente à página correta;
- não exibir enum, UUID, tabela, status técnico ou jargão de Ads/Meta;
- não transformar a tela em dashboard de cartões.

Estrutura conceitual mínima:

**Seu próximo passo**

- título humano;
- explicação curta;
- ensinamento/contexto mínimo;
- CTA principal;
- indicação simples do progresso da base inicial, se isso puder ser feito sem virar checklist técnico.

Evitar gamificação infantil, porcentagens falsas ou “score de maturidade” sem contrato.

---

## 10. Tela de escolha de foco

Preferir rota protegida dedicada:

`/foco`

ou equivalente simples e coerente.

A pergunta deve ser de negócio, por exemplo:

**“O que você quer priorizar agora?”**

Opções visíveis:

- ofertas `ACTIVE` pelo nome humano;
- opção **“Meu negócio como um todo”**.

Regras:

- nenhuma oferta arquivada aparece;
- se existir uma única oferta, ela pode aparecer destacada/preselecionada, mas não persistir sem confirmação;
- se o usuário não tiver permissão de owner/admin, mostrar o foco atual quando houver, mas não permitir mudança;
- não mostrar `focus_type`, IDs ou linguagem de banco;
- após salvar, voltar para `/inicio` para que o motor derive novamente o próximo passo.

---

## 11. Entrada autenticada passa a ser guiada

A 004D deve alterar o destino padrão depois de autenticação bem-sucedida para `/inicio`.

Atualizar com cuidado:

- `ROUTES`;
- `PROTECTED_PREFIXES`;
- `DEFAULT_AUTHENTICATED_REDIRECT`;
- allowlist de redirects internos;
- fluxos de login/cadastro/confirm quando aplicável;
- testes de open redirect/regressão de autenticação.

`/conta` continua existindo como superfície de conta/configuração/resumo e não deve ser removida.

Não criar navegação final completa nem App Shell nesta rodada.

---

## 12. Segurança e tenancy

Aplicar as invariantes vigentes:

- `organization_id` é fronteira de tenant;
- leituras de usuário usam cliente com sessão + RLS;
- escrita privilegiada valida organização, membership, papel e identidade novamente no servidor/banco;
- `service_role` nunca no browser;
- browser não recebe INSERT/UPDATE/DELETE em `growth_objectives`;
- nova RPC não tem EXECUTE para `anon`/`authenticated`;
- cross-tenant FK e RPC falham fechado;
- multi-organização continua sem escolha implícita;
- não usar `SECURITY DEFINER` como atalho de autorização;
- nenhuma decisão de foco vem de `user_metadata`;
- nenhuma string do browser é aceita como papel, organização ou identidade confiável.

---

## 13. IA — explicitamente Tier 0 nesta rodada

A 004D **não usa provider de IA**.

O motor de próximo passo é regra determinística porque os estados dependem de fatos estruturados já existentes.

Não criar:

- prompt;
- chamada ao AI Router;
- provider adapter;
- API key;
- fallback;
- geração de texto por LLM;
- “confiança” inventada;
- recomendação estratégica não sustentada.

Os textos pedagógicos de cada estado podem ser conteúdo estático/versionado em código, pois explicam uma regra de produto conhecida e não uma análise de mercado.

---

## 14. Meta — permanece bloqueada

A 004D não toca:

- 003B;
- OAuth Meta;
- BISU/System User;
- scopes;
- Business Login Configuration;
- Meta onboarding guiado;
- Instagram import/publish;
- Ad Account;
- campanha/anúncio/gasto.

Não criar botão que leve o usuário para uma integração externa ainda bloqueada.

O estado `BASE_ESTRATEGICA_PRONTA` deve ser honesto sobre a capacidade atual.

---

## 15. Compatibilidade com 004B e 004C

Preservar:

- histórico de `growth_objectives`;
- uma única linha `ACTIVE` por organização;
- idempotência e serialização do objetivo;
- `business_offers` como identidade estável;
- `business_offer_versions` imutáveis;
- `business_profiles.primary_offer` apenas como legado/sugestão;
- nenhuma conversão automática de texto legado em oferta estruturada;
- nenhuma reescrita de migration aplicada.

A 004D é a primeira rodada autorizada a criar o vínculo oferta → objetivo por meio do conceito explícito de **foco**.

---

## 16. Documentação a harmonizar no próprio delta

Atualizar proporcionalmente apenas quando necessário:

- `docs/03-canonical/DATA_MODEL.md` — campos de foco no objetivo;
- `docs/03-canonical/TECHNICAL_SPEC.md` — jornada guiada/entrada autenticada se o trecho correspondente existir;
- `docs/00-governanca/IMPLEMENTATION_ROADMAP.md` — somente se necessário para registrar que a fundação de condução foi antecipada como ponte independente da Meta;
- `.gpt/PROJECT_PROMPT.md` somente se houver formulação operacional realmente conflitante.

Não reescrever `AGENTIC_PRODUCT_CANONICAL.md` ou `GROWTH_INTELLIGENCE_CANONICAL.md` por estilo. Eles já são fonte do mandato.

---

## 17. Fora de escopo

Não implementar nesta rodada:

- Meta/Instagram;
- provider real de IA;
- Content Intelligence/Oportunidades;
- personas/públicos;
- geração ou crítica real de conteúdo;
- Financial Approval;
- campanhas/Ads/experimentos/scale;
- CRM/leads;
- WhatsApp/e-mail automatizado;
- pesquisas com clientes;
- conversões;
- Strategic Insights;
- App Shell/Hoje definitivo;
- notificações;
- seletor multi-organização;
- múltiplos focos simultâneos por organização;
- foco em múltiplas ofertas na mesma versão do objetivo;
- e-commerce, estoque, SKU, pedidos ou pagamentos;
- score de maturidade/gamificação;
- qualquer nova capacidade não necessária para `negócio → objetivo → ofertas → foco → base pronta`.

Se um item fora de escopo parecer tecnicamente necessário, parar e devolver a decisão ao GPT em vez de ampliar silenciosamente.

---

## 18. Provas mínimas — banco

Provar de forma transacional, preferencialmente no remoto quando houver DDL:

1. objetivo existente sem foco continua válido após migration;
2. `BUSINESS` persiste sem `focus_offer_id`;
3. `OFFER` exige `focus_offer_id`;
4. `focus_type = null` exige `focus_offer_id = null`;
5. taxonomia desconhecida é recusada;
6. cross-tenant de `focus_offer_id` é recusado pela FK/contrato de banco;
7. oferta arquivada não pode ser escolhida pela RPC;
8. objetivo arquivado/não ativo não pode receber foco;
9. owner/admin ativo consegue definir foco;
10. member comum não consegue;
11. organização/membership inativa não consegue;
12. reenvio idêntico não cria histórico falso;
13. mudança de foco arquiva objetivo anterior e cria um novo `ACTIVE` na mesma transação;
14. campos de objetivo/jornada/sucesso são preservados ao mudar foco;
15. continua existindo no máximo um objetivo `ACTIVE` por organização;
16. RPC indisponível para `anon` e `authenticated`;
17. browser continua sem escrita direta em `growth_objectives`;
18. zero fixture residual após rollback/cleanup.

---

## 19. Provas mínimas — motor de condução

Cobrir pelo menos:

- sem organização → criar/completar negócio;
- organização sem objetivo → definir objetivo;
- objetivo sem ofertas → adicionar oferta;
- objetivo + ofertas sem foco → escolher foco;
- foco `BUSINESS` válido → base pronta;
- foco `OFFER` com oferta ativa → base pronta;
- oferta focada arquivada → reescolher foco;
- multi-org → nenhum tenant escolhido e nenhuma orientação baseada em dados de organização arbitrária;
- erro técnico não vira estado vazio;
- member vê orientação, mas não recebe ação de escrita que não pode executar;
- nenhuma condição chama AI Router ou Meta.

O motor deve ser puro/determinístico na parte de decisão sempre que possível, separando coleta de dados da função que escolhe o estado.

---

## 20. Provas mínimas — UX/autenticação

Cobrir:

- `/inicio` protegida;
- `/foco` protegida;
- login sem `next` seguro termina em `/inicio`;
- `next` externo/malformado continua recusado;
- `/conta` permanece acessível;
- cada estado de `/inicio` possui uma única ação principal quando ação é possível;
- textos não mostram enum/UUID/jargão técnico;
- `BASE_ESTRATEGICA_PRONTA` não oferece Meta bloqueada nem promete análise que ainda não existe;
- escolha de foco mostra somente ofertas ativas;
- uma única oferta não é persistida automaticamente sem confirmação;
- após definir foco, o usuário volta para `/inicio` e recebe o novo estado.

---

## 21. DDL e durabilidade remota

Se houver migration:

1. criar branch a partir da `main` atualizada;
2. migration e prova versionada devem estar commitadas/pushadas antes do primeiro `db push` remoto;
3. não editar migrations já aplicadas;
4. aplicar migration somente após checkpoint durável;
5. prova SQL deve usar transação + rollback quando possível;
6. conferir pós-estado remoto e fixtures residuais;
7. verificar Advisors relevantes apenas para o delta;
8. se surgir gate humano ou de segurança para mutação remota, parar no gate e devolver ao GPT; não improvisar instrução ao fundador.

---

## 22. Orçamento de prova e CI

Risco principal: mudança de domínio versionado + autorização + redirects de autenticação.

Exigir:

- testes focados no delta;
- prova integrada do banco para foco/tenant/permissão;
- regressões de objetivo/ofertas/autenticação apenas no raio realmente tocado;
- CI final completa uma vez.

CI final:

- lint;
- typecheck;
- Edge Functions typecheck;
- testes;
- build.

Não duplicar suíte completa local por ritual se a CI final já cobrir.

---

## 23. Critérios de conclusão

A 004D só pode ser declarada executada quando:

- o foco atual estiver persistido com histórico seguro;
- tenant e papéis estiverem protegidos no banco/server;
- o motor derivar corretamente o próximo passo a partir de estado real;
- `/inicio` for a entrada autenticada padrão;
- `/foco` permitir decisão humana simples;
- multi-organização continuar fail-closed;
- nenhum Meta/IA real tiver sido introduzido;
- migration/provas remotas, se aplicável, estiverem concluídas sem fixture residual;
- CI final estiver verde;
- documentação técnica mínima estiver harmonizada;
- relatório e `estado.md` da branch estiverem atualizados.

---

## 24. Handoff obrigatório do Claude

Relatório esperado:

`rodadas/claude/RELATORIO_RODADA_004D_GUIDED_GROWTH_JOURNEY_FOUNDATION.md`

O handoff deve informar:

- branch publicada + HEAD;
- migrations criadas/aplicadas;
- resumo do delta;
- prova de banco e resultado;
- testes do motor/UX/auth;
- Advisors relevantes;
- PR;
- CI final;
- working tree limpa ou explicação objetiva;
- qualquer pendência real.

Atualizar `estado.md` **na branch** para:

**004D EXECUTADA — AGUARDANDO AUDITORIA GPT**

Claude não aprova, não promove e não mergeia a rodada.

Próximo ator após a execução: **GPT auditor**.
