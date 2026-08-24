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

## 6. Gate externo da Meta — CONFIGURAÇÃO E ATIVOS PREPARADOS

Registro inicial:

`rodadas/gpt/GATE_003B_CONFIGURACAO_META_CRIADA.md`

No app Meta **Trafego Pago Business Dev** (App ID `2940404272985831`) foi criada:

- nome: `Quoron Instagram Dev Login`;
- Configuration ID: `38307908848822330`;
- variação: General;
- token: System-user access token / BISU;
- ativos da configuração: Pages + Instagram Accounts;
- permissões inicialmente configuradas para Instagram/Insights:
  - `pages_show_list`;
  - `pages_read_engagement`;
  - `instagram_basic`;
  - `instagram_manage_insights`.

Configuração histórica da 003A permanece existente e não deve ser apagada antes da promoção da 003B:

- `Trafego Pago Dev Login`;
- Configuration ID `1549901823029730`.

Ativos reais preparados no portfólio **Quoron**:

- Página do Facebook: **Quoron**;
- conta profissional do Instagram: **@goquoron**;
- ambos aparecem no fluxo de seleção do Facebook Login for Business.

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

Logo, nenhum OAuth real ocorreu por engano até aquele ponto.

## 8. Correção canônica — centralidade de mídia paga

Canônico vigente:

`docs/01-produto/PAID_MEDIA_CANONICAL.md`

Decisão da rodada:

`rodadas/gpt/DECISAO_003B_02_MIDIA_PAGA_CENTRAL_E_OAUTH_LIBERADO.md`

O fundador corrigiu explicitamente um pressuposto documental anterior.

Regra vigente:

- orgânico deve entregar valor e pode existir sozinho por períodos;
- **mídia paga é pilar central da proposta de crescimento do produto**, não capacidade periférica;
- todo usuário deve poder evoluir para tráfego pago quando houver motivo estratégico;
- não investir agora não significa que a arquitetura deva esconder ou remover capacidade Ads;
- permissão técnica para Ads não equivale a criar campanha, aprovar orçamento ou gerar gasto;
- qualquer gasto continua exigindo aprovação humana explícita, comando de domínio, idempotência e auditoria.

O gate histórico:

`rodadas/gpt/GATE_003B_OAUTH_BLOQUEADO_PERMISSOES_ANUNCIOS.md`

permanece apenas como evidência da hipótese anterior. A decisão de bloquear o OAuth por aparecer capacidade de anúncios está **SUPERADA**.

Antes da próxima rodada substantiva depois da 003B, harmonizar diretamente as formulações conflitantes em `.gpt/PROJECT_PROMPT.md`, `GROWTH_INTELLIGENCE_CANONICAL.md`, `MVP_CANONICAL.md`, `IMPLEMENTATION_ROADMAP.md` e demais canônicos afetados. Não criar rodada apenas para housekeeping.

## 9. OAuth real 003B — EM ANDAMENTO

No fluxo real atual foram selecionados:

- Empresa/portfólio: **Quoron**;
- Página do Facebook: **Quoron**;
- Conta do Instagram: **goquoron**;
- nenhuma conta de anúncios foi selecionada como ativo nesse passo.

A tela final de consentimento informa também capacidade relacionada a gerenciamento/leitura de anúncios. Após a correção canônica acima, isso **não bloqueia o fluxo** por si só.

### Próxima ação autorizada

Próximo a agir: **fundador**.

Na tela atual de consentimento da Meta, clicar **Confirmar**.

Depois:

1. permitir que a Meta conclua e redirecione sozinha para `http://localhost:3000/conta`;
2. não iniciar campanha, não escolher conta de anúncios manualmente e não gerar gasto;
3. ao retornar ao Tráfego Pago, **não clicar ainda em `Usar esta conta`** se o botão aparecer;
4. devolver a tela ao GPT.

O GPT então audita no Supabase:

- nova conexão `ACTIVE`;
- escopos realmente concedidos;
- presença do token no Vault sem exposição;
- descoberta da Página/Instagram;
- qualquer capacidade Ads efetivamente concedida;
- antes de liberar seleção do Instagram e sondas read-only.

## 10. Continua NÃO autorizado

- Claude alterar painel Meta;
- apagar a configuração histórica da 003A;
- criar novo Meta App ID;
- ampliar permissões adicionais por tentativa fora do fluxo real apresentado;
- persistir Page Access Token sem decisão arquitetural;
- criar campanha manualmente por teste;
- criar anúncios ou gerar gasto;
- importar conteúdo do Instagram;
- iniciar Fase 4;
- promover/mergear a 003B antes do E2E real, sondas e auditoria final.

## 11. Pendências não bloqueantes

- harmonização direta dos canônicos antigos com `PAID_MEDIA_CANONICAL.md` antes da próxima rodada substantiva pós-003B;
- logger Next dev registra URL do callback com `code`/`state`: tratar redaction antes de produção;
- leaked-password protection antes de produção;
- SMTP/domínio de produção;
- default ACL residual de `supabase_admin` enquanto inerte;
- App Review/Business Verification quando aplicável à fase comercial.
