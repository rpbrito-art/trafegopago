# RODADA 003B — META ASSET DISCOVERY & SELECTION

Status: **PLANEJADA PELO GPT — AGUARDANDO AUTORIZAÇÃO DO FUNDADOR — NÃO EXECUTAR AINDA**

Fase: **3 — Meta Connection Foundation**

Dependência promovida: **003A — Meta Connection Foundation**

Objetivo da rodada: transformar a conexão Meta já provada em uma conexão utilizável pelo produto para identificar e selecionar a conta profissional do Instagram que será lida na Fase 4, mantendo a conta de anúncios como capacidade opcional e sem antecipar qualquer mutação publicitária.

---

## 1. Decisão de produto/arquitetura

A Fase 3 não deve obrigar todo usuário a conceder capacidade de mídia paga para usar o modo orgânico.

A 003B deve separar capacidades:

- **Instagram orgânico/insights**: capacidade principal e necessária para seguir à Fase 4;
- **conta de anúncios**: descoberta/seleção opcional quando a autorização `ads_read` existir;
- ausência de conta de anúncios **não invalida** a conexão do Instagram e **não bloqueia** o caminho orgânico.

Isto segue `GROWTH_INTELLIGENCE_CANONICAL.md`: mídia paga é capacidade, não obrigação.

Não criar campanha, anúncio, conjunto, criativo, orçamento ou gasto nesta rodada.

---

## 2. Revalidação Meta — 2026-08-24

Fontes prioritárias consultadas pelo GPT:

1. Meta official Postman — Instagram API with Facebook Login:
   - `https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api`
2. Meta official Postman — Instagram Insights:
   - `https://www.postman.com/meta/instagram/folder/23987686-f659d7d1-d74c-44e4-9192-9b1e8694c511`
3. Meta official Postman — Facebook Marketing API:
   - `https://www.postman.com/meta/facebook-marketing-api/overview`
4. SDK oficial Meta/Facebook Business SDK para edges `accounts`/`adaccounts`, quando necessário como confirmação estrutural.

Fatos revalidados:

- o caminho escolhido pelo projeto continua sendo **Instagram API with Facebook Login**, usando `graph.facebook.com` e **Facebook Login for Business**;
- esse caminho exige uma **Instagram Professional Account** (Business ou Creator) vinculada a uma Facebook Page;
- `instagram_business_*` pertence ao caminho **Instagram Login / graph.instagram.com** e não deve substituir `instagram_basic` no fluxo atual;
- para descobrir a conta profissional, a Meta documenta `GET /me/accounts` e o vínculo `instagram_business_account`;
- para Insights com Facebook Login, a documentação atual aponta `instagram_basic`, `instagram_manage_insights` e `pages_read_engagement`;
- `pages_show_list` é necessário para listar as Páginas gerenciadas;
- `GET /me/adaccounts` é o caminho padrão de descoberta de contas de anúncios do usuário/token;
- `ads_read` é permissão de leitura; `ads_management` é permissão mais ampla e não deve ser pedida por antecipação;
- a documentação de Insights registra uma condição: quando o papel sobre a Página vier via Business Manager, podem ser exigidos também `ads_management` e `ads_read`. Isso deve ser **provado no E2E**, não presumido.

### Regra de privilégio mínimo

Configuração inicial pretendida para o novo login de 003B:

**Obrigatórias para Instagram**

- `pages_show_list`
- `pages_read_engagement`
- `instagram_basic`
- `instagram_manage_insights`

**Opcional/read-only para conta de anúncios**

- `ads_read`

**NÃO solicitar inicialmente**

- `ads_management`
- `business_management`
- `instagram_content_publish`
- `instagram_manage_comments`
- `leads_retrieval`
- qualquer permissão de escrita/publicação/lead fora do objetivo desta rodada.

Se o E2E provar que `ads_management` é tecnicamente indispensável para Insights neste arranjo de ativos, o executor deve parar em:

`DECISÃO ARQUITETURAL NECESSÁRIA — AGUARDANDO GPT`

Não ampliar permissões automaticamente.

---

## 3. Gate externo conduzido pelo GPT

A configuração manual da Meta pertence ao GPT, não ao Claude.

Quando a execução for autorizada, o GPT conduzirá o fundador pela interface atual da Meta.

### Preferência

Criar **uma nova configuração de Facebook Login for Business para a 003B**, preservando a configuração histórica usada na 003A em vez de alterá-la silenciosamente.

Nome interno sugerido:

`Quoron Instagram Dev Login`

Configuração pretendida:

- Login variation: `General`;
- token: `System-user access token` / BISU;
- expiração: 60 dias no ambiente de desenvolvimento;
- ativos: Pages + Instagram Accounts + Ad Accounts;
- permissões conforme §2.

A seleção de Ad Account deve poder ser omitida pelo fundador se a Meta a apresentar como opcional.

Se `instagram_basic` ou `instagram_manage_insights` não aparecerem como permissões disponíveis, o GPT deve primeiro confirmar se o app precisa habilitar/customizar o produto/use case do Instagram compatível com **Facebook Login**, sem criar novo App ID por tentativa.

O novo `config_id` não é segredo. O App Secret continua proibido em chat/documentação.

---

## 4. Escopo técnico da 003B

### 4.1 Descoberta server-side de Instagram

Criar uma única fronteira de leitura no módulo Meta para descobrir Páginas elegíveis e contas profissionais vinculadas.

Chamada-base documentada:

`GET /{version}/me/accounts`

Campos mínimos de descoberta:

- `id` da Page;
- `name` da Page;
- `tasks` quando necessário para validar capacidade;
- `instagram_business_account`.

Depois, para cada Instagram ID elegível, consultar somente metadados mínimos necessários para seleção, por exemplo:

- `id`;
- `username`;
- `name` quando disponível;
- `account_type` quando disponível.

**Não pedir `access_token` da Page na descoberta normal.**

A Meta documenta Page Access Token para diversos fluxos de Instagram, mas a 003B deve primeiro provar se o BISU selecionado consegue ler o IG User diretamente. Se não conseguir, o executor pode fazer uma sonda read-only para esclarecer a necessidade, mas **não deve criar nova persistência de segredo sem decisão GPT**.

### 4.2 Descoberta server-side opcional de Ad Account

Somente se `granted_scopes` contiver `ads_read`:

`GET /{version}/me/adaccounts`

Campos mínimos:

- `id`;
- `name`;
- `account_status`;
- `currency`;
- `timezone_name`;
- `business` somente se necessário para desambiguação.

Se `ads_read` não tiver sido concedido, retornar capacidade `ads_not_authorized` em vez de erro global.

### 4.3 Capabilities, não conexão monolítica

Introduzir avaliação explícita de capacidade a partir dos escopos realmente concedidos.

No mínimo:

- `instagram_discovery`;
- `instagram_insights`;
- `ads_discovery`.

A conexão `ACTIVE` não deve virar erro apenas porque `ads_read` está ausente.

Nunca inferir permissão concedida a partir da configuração desejada; usar `granted_scopes` real da conexão.

### 4.4 Persistência

Implementar as entidades canônicas previstas em `DATA_MODEL.md`:

#### `instagram_accounts`

Persistir **somente a conta escolhida**, não todas as candidatas descobertas.

Campos mínimos esperados:

- `id` interno UUID;
- `organization_id`;
- `meta_connection_id`;
- `external_instagram_account_id`;
- `external_page_id` associado;
- `username`/display metadata mínimo permitido;
- `account_type` quando disponível;
- `selected_by`;
- `selected_at`;
- `last_verified_at`;
- timestamps.

Unique apropriado por conexão + external IG id.

#### `ad_accounts`

Persistir somente se o usuário realmente selecionar uma conta de anúncios.

Campos mínimos esperados:

- `id` interno UUID;
- `organization_id`;
- `meta_connection_id`;
- `external_ad_account_id`;
- `name`;
- `currency`;
- `timezone`;
- provider account status mínimo quando útil;
- `selected_by`;
- `selected_at`;
- `last_verified_at`;
- timestamps.

A ausência de linha em `ad_accounts` é válida.

### 4.5 Browser não decide pertencimento do ativo

A UI pode devolver um external ID escolhido, mas o servidor deve **redescobrir/revalidar** o ativo antes de persistir.

É proibido confiar que um `page_id`, `ig_id` ou `ad_account_id` enviado pelo browser pertence à organização/conexão.

Seleção de ID inventado ou pertencente a outro conjunto de ativos deve falhar fechado.

### 4.6 Candidatos não persistidos

Por minimização de dados, a lista de candidatos pode existir apenas na resposta server-side para a tela.

Não criar tabela de inventário de todos os ativos apenas para seleção.

### 4.7 Paginação

Listas Meta devem suportar paginação.

Não seguir uma URL `paging.next` arbitrária devolvida pelo provider. Preferir extrair cursor e reconstruir a chamada contra o host/base/version controlados pelo gateway.

### 4.8 Erros e estados vazios

Distinguir em linguagem de produto:

- nenhuma Page elegível;
- Page existe, mas não há Instagram profissional vinculado;
- Instagram existe, mas permissão necessária não foi concedida;
- conta de anúncios não autorizada (válido/optional);
- nenhuma conta de anúncios disponível;
- falha temporária da Meta;
- conexão expirada/revogada.

Não expor códigos técnicos na UI principal.

---

## 5. UX mínima

Na tela de Conta/integração Meta:

### Instagram

Se não há conta selecionada:

- título em linguagem de negócio: `Escolha o Instagram do negócio`;
- mostrar `@username` e nome quando disponíveis;
- se houver mais de uma, pedir escolha;
- se houver uma única, apresentar essa única opção de forma direta, sem formulário técnico;
- ação principal: `Usar esta conta` / `Conectar este Instagram`.

### Conta de anúncios

Ramo secundário e opcional:

- se `ads_read` foi concedido e houver contas, permitir selecionar uma;
- se não foi concedido, não bloquear o Instagram;
- não usar linguagem que faça parecer que anúncios são obrigatórios.

Não mostrar scopes, Graph API version, Page IDs ou Ad Account IDs na interface padrão.

---

## 6. Provas mínimas de código

### Segurança / tenancy

- membro de org A não lê/escreve seleção da org B;
- browser não grava diretamente tabelas de seleção;
- seleção de external ID arbitrário é recusada;
- conexão de outra org não pode ser usada para descoberta;
- token/segredo não é retornado ao browser/log/test snapshot.

### Descoberta

- 0, 1 e múltiplos Instagram candidates;
- Page sem `instagram_business_account`;
- múltiplas páginas apontando para respostas válidas;
- paginação por cursor;
- provider 4xx/5xx/rede em fail-closed;
- ad discovery ausente sem `ads_read` não quebra Instagram.

### Persistência

- seleção válida é idempotente;
- reenvio não duplica conta;
- seleção inválida não cria linha;
- unique/tenancy corretos;
- ad account é opcional.

### Capability

- conjunto exato para `instagram_discovery`;
- conjunto exato para `instagram_insights`;
- `ads_read` controla apenas capacidade de descoberta Ads;
- ausência de `ads_read` não muda conexão Instagram para erro;
- `ads_management` não deve aparecer como requisito hardcoded inicial.

---

## 7. E2E real obrigatório antes de promover

Usar a conta do próprio produto/Quoron destinada aos testes reais.

Sequência esperada:

1. GPT conduz configuração externa nova/ajustada no painel Meta;
2. novo OAuth real pelo Tráfego Pago usando a configuração 003B;
3. fundador seleciona os ativos corretos no diálogo Meta quando oferecidos;
4. callback persiste uma nova conexão `ACTIVE` e guarda o BISU no Vault;
5. sistema descobre a Page e o Instagram profissional vinculado;
6. fundador seleciona o Instagram do Quoron;
7. GPT/Claude prova no banco a linha correta e o isolamento;
8. executar uma **sonda read-only**, sem importar conteúdo, contra o IG User selecionado;
9. executar uma **sonda mínima de Insights** suficiente para provar que a Fase 4 poderá ler métricas, sem persistir snapshots nesta rodada;
10. se `ads_read` tiver sido concedido e existir ad account, provar descoberta/seleção opcional; ausência não reprova o caminho orgânico.

### Gate sobre token para IG User

Primeiro testar a leitura do IG User com o token principal da conexão.

Se falhar e a evidência indicar necessidade de Page Access Token:

- não persistir novo token automaticamente;
- registrar resposta sanitizada;
- parar em decisão arquitetural GPT.

### Gate sobre Insights e `ads_management`

Se a sonda de Insights falhar especificamente porque a Meta exige `ads_management`/`ads_read` em razão do papel da Page via Business Manager:

- não ampliar config por conta própria;
- parar em decisão GPT;
- preservar conexão/seleção já seguras.

---

## 8. Fora de escopo

- importação/persistência de posts;
- snapshots de métricas;
- sync incremental;
- publicação de conteúdo;
- criação/edição/pausa de anúncios;
- campanha/ad set/ad/creative;
- orçamento/gasto;
- Lead Ads;
- webhooks Instagram;
- IA;
- App Review/produção pública;
- mudança para Instagram Login / `graph.instagram.com`.

---

## 9. READ SET obrigatório do Claude quando autorizado

Além de `CLAUDE.md + estado.md + este mandato`:

1. `docs/01-produto/GROWTH_INTELLIGENCE_CANONICAL.md` — §§2, 5, 7 e princípios de orgânico/pago;
2. `docs/03-canonical/DATA_MODEL.md` — §3 Integração Meta + §17 RLS;
3. `docs/03-canonical/SECURITY_MODEL.md` — fronteira de segredo, tenancy e logs;
4. `src/lib/meta/gateway.ts`;
5. migrations 003A relevantes para `meta_connections`/Vault apenas quando necessário para compatibilidade.

Sob demanda:

- `docs/03-canonical/TECHNICAL_SPEC.md` se surgir dúvida de versão/gateway;
- documentação externa Meta somente para provar fato técnico específico; decisão arquitetural continua com GPT.

---

## 10. Critério de fechamento da 003B

A rodada só pode ser promovida quando:

- código/CI auditados;
- migration remota aplicada e auditada, se houver;
- OAuth real 003B concluído;
- Instagram profissional real descoberto e selecionado;
- seleção arbitrária/cross-tenant provada impossível;
- sonda read-only do IG User passa ou a arquitetura necessária é explicitamente decidida/corrigida;
- capacidade de Insights é provada para preparar F4;
- ausência de Ads continua válida para o modo orgânico;
- nenhum segredo aparece no browser/log;
- nenhuma mutação publicitária ocorreu.

Depois disso, a Fase 3 pode ser reavaliada para encerramento e a Fase 4 pode ser planejada.

---

## 11. Proibições durante a execução

- não criar novo Meta App ID por tentativa;
- não trocar para Instagram Login sem decisão GPT;
- não adicionar `ads_management`/`business_management` por conveniência;
- não pedir/pastar App Secret em chat;
- não persistir Page Access Token sem decisão GPT se essa necessidade surgir;
- não importar posts antecipadamente;
- não iniciar F4 automaticamente;
- não promover sem auditoria GPT.
