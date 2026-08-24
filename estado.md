# ESTADO — Tráfego Pago

Atualizado: 2026-08-24

Estado incorporado = `main + este arquivo + promoção real`.

## 1. Ambiente

- repo: `rpbrito-art/trafegopago`
- Supabase project ref: `cbnxdoxpyioxjwgjhbtq`
- pasta local esperada: `C:\Users\rpbri\Documents\trafegopago`
- `business-weaver`: fora de escopo

## 2. Estado incorporado

Promovidas: **000–003A**.

- Fase 1 — Supabase, Auth e Tenancy: **ENCERRADA**.
- Fase 2 — Operations, Audit, Queues e Segurança Base: **ENCERRADA**.
- Fase 3 — Meta Connection Foundation: **EM ANDAMENTO**.

Última rodada promovida: **003A — Meta Connection Foundation**.

Promoção 003A:

- PR #11 — MERGED;
- merge commit: `546838db8e7ced4e9045c05feb8c7b2f0c476cc2`;
- CI final: `32772710738` — verde.

## 3. Baseline promovido da 003A

A 003A está **EXECUTADA, AUDITADA E PROMOVIDA**.

Persistem como decisões:

- Facebook Login for Business + Graph API v26.0;
- token Meta server-side no Vault;
- `state` OAuth de uso único e membership reconferida;
- credencial real classificada como BISU por `client_business_id`;
- BISU não usa `oauth/revoke`, `/permissions` ou `/access_tokens` como revogação do produto;
- remoção instalada ocorre em **Configurações do negócio > Apps conectados**;
- `190` genérico não prova revogação;
- assinatura `190/464` só vale no fluxo BISU previamente marcado com os controles promovidos;
- desconexão real foi provada ponta a ponta e o fixture terminou `REVOKED`, sem segredo no Vault.

Supabase após a 003A: 14 migrations.

## 4. Rodada 003B — EM EXECUÇÃO

Mandato:

`rodadas/gpt/RODADA_003B_META_ASSET_DISCOVERY_SELECTION.md`

Autorização:

`rodadas/gpt/AUTORIZACAO_003B_EXECUCAO.md`

Branch:

`claude/rodada-003b-meta-asset-discovery-selection`

PR: **#12 draft**.

HEAD atual observado:

`9991ab9b8e22c549bb52b9a0ea7b03ee09f309f8`

Última CI de código auditado:

`32779213462` — verde em install, lint, typecheck, Edge Functions, testes e build.

### Executado e comprovado

- migration `20260824210000_create_meta_asset_selection.sql` aplicada depois de checkpoint versionado;
- histórico remoto = **15 migrations**;
- `instagram_accounts` e `ad_accounts` presentes;
- RLS habilitado nas tabelas novas;
- `authenticated` sem INSERT/UPDATE/DELETE;
- external ids fora dos grants SELECT de `authenticated`;
- `select_instagram_account` e `select_ad_account` são `security invoker`, sem EXECUTE para `authenticated`/`anon` e com EXECUTE para `service_role`;
- descoberta/seleção, capabilities e UX implementadas;
- Correção 003B-01 executada, auditada e aprovada.

Esses itens estão **executados/auditados**, mas a 003B ainda não está promovida.

## 5. Correção 003B-01 — AUDITADA E APROVADA

Correção:

`rodadas/gpt/CORRECAO_003B_01_FAIL_CLOSED_METADATA_E_MEMBERSHIP.md`

Auditoria:

`rodadas/gpt/AUDITORIA_003B_01_FAIL_CLOSED_METADATA_E_MEMBERSHIP.md`

Resultado:

- leitura de IG User distingue 2xx com campos opcionais ausentes de 4xx/5xx/rede/corpo ilegível;
- recusas/falhas sobem como falha de domínio sem candidato gravável;
- membership é reconferida imediatamente antes da RPC privilegiada de seleção para Instagram e Ad Account.

## 6. Gate externo da Meta — CONFIGURAÇÃO CRIADA

Registro:

`rodadas/gpt/GATE_003B_CONFIGURACAO_META_CRIADA.md`

No app Meta **Trafego Pago Business Dev** (App ID `2940404272985831`) foi criada:

- nome: `Quoron Instagram Dev Login`;
- Configuration ID: `38307908848822330`;
- variação: General;
- token: System-user access token / BISU;
- ativos obrigatórios: Pages + Instagram Accounts;
- permissões:
  - `pages_show_list`;
  - `pages_read_engagement`;
  - `instagram_basic`;
  - `instagram_manage_insights`.

`ads_read` ficou fora por decisão de produto/gate: nessa configuração as permissões escolhidas são obrigatórias, e mídia paga continua opcional.

Configuração histórica da 003A permanece existente e não deve ser apagada antes da promoção da 003B:

- `Trafego Pago Dev Login`;
- Configuration ID `1549901823029730`.

## 7. Gate local — AUDITADO E APROVADO

Auditoria:

`rodadas/gpt/AUDITORIA_GATE_003B_CONFIG_LOCAL_PRONTA.md`

Claude executou o gate local autorizado:

- reconciliou a branch com a `main`;
- atualizou somente o `.env.local` não versionado para `META_LOGIN_CONFIG_ID=38307908848822330`;
- reiniciou o servidor local;
- parou antes do OAuth real.

Auditoria independente no Supabase após esse gate:

- conexões `ACTIVE`: **0**;
- conexão histórica `REVOKED`: **1**;
- `instagram_accounts`: **0 linhas**;
- `ad_accounts`: **0 linhas**.

Logo, nenhum OAuth real ocorreu por engano.

## 8. Próxima ação autorizada

Próximo a agir: **GPT + fundador**.

OAuth real da 003B está **LIBERADO**.

Fluxo autorizado:

1. abrir `http://localhost:3000/conta`;
2. clicar em `Conectar a Meta` uma única vez;
3. no diálogo Meta, usar a configuração nova e selecionar o portfólio/ativos de teste correspondentes ao negócio Quoron quando solicitados;
4. selecionar a Página e a conta profissional do Instagram do negócio quando a Meta apresentar os ativos;
5. não autorizar conta de anúncios nem permissões extras se aparecerem fora do fluxo esperado;
6. concluir o login e retornar ao Tráfego Pago;
7. parar antes de escolher o Instagram dentro do Tráfego Pago se houver qualquer ambiguidade/erro; devolver a tela ao GPT.

Após o callback, o GPT audita a nova conexão `ACTIVE`, os escopos realmente concedidos e a descoberta antes de liberar a seleção final e as sondas read-only.

## 9. Continua NÃO autorizado

- Claude alterar painel Meta;
- apagar a configuração histórica da 003A;
- criar novo Meta App ID;
- ampliar permissões por tentativa;
- persistir Page Access Token;
- solicitar `ads_management` ou `business_management` automaticamente;
- criar anúncios ou gerar gasto;
- importar conteúdo do Instagram;
- iniciar Fase 4;
- promover/mergear a 003B antes do E2E real.

## 10. Pendências não bloqueantes

- logger Next dev registra URL do callback com `code`/`state`: tratar redaction antes de produção;
- leaked-password protection antes de produção;
- SMTP/domínio de produção;
- default ACL residual de `supabase_admin` enquanto inerte;
- App Review/Business Verification quando aplicável à fase comercial.
