# ESTADO — Tráfego Pago

Atualizado: 2026-08-24

Estado incorporado = `main + este arquivo + promoção real`.

## 1. Ambiente

- repo: `rpbrito-art/trafegopago`
- Supabase project ref: `cbnxdoxpyioxjwgjhbtq`
- pasta local esperada: `C:\Users\rpbri\Documents\trafegopago`
- `business-weaver`: fora de escopo

## 2. Estado incorporado

Promovidas: **000–002C**.

- Fase 1 — Supabase, Auth e Tenancy: **ENCERRADA**.
- Fase 2 — Operations, Audit, Queues e Segurança Base: **ENCERRADA**.

Última rodada promovida: **002C — Webhook Inbox + Observabilidade Base**.

## 3. Rodada corrente

**003A — META CONNECTION FOUNDATION**

Status: **003A-10B AUDITADA E APROVADA — MARCADOR E2E PERSISTIDO — VERIFICAÇÃO FINAL HUMANA AUTORIZADA — 003A AINDA NÃO PROMOVIDA**.

Mandato original:

`rodadas/gpt/RODADA_003A_META_CONNECTION_FOUNDATION.md`

Auditorias/decisões vigentes:

- `rodadas/gpt/AUDITORIA_RODADA_003A_META_CONNECTION_FOUNDATION.md`
- `rodadas/gpt/REAUDITORIA_003A_05_INVESTIGACAO_DESCONEXAO.md`
- `rodadas/gpt/REAUDITORIA_003A_06A_CLASSIFICACAO_BISU.md`
- `rodadas/gpt/DECISAO_ARQUITETURAL_003A_06_REVOGACAO_TOKEN_BUSINESS_LOGIN.md`
- `rodadas/gpt/REAUDITORIA_003A_07_DESCONEXAO_BISU_GUIADA.md`
- `rodadas/gpt/REAUDITORIA_003A_08_CLASSIFICACAO_FAIL_CLOSED.md`
- `rodadas/gpt/REAUDITORIA_003A_09_POS_REMOCAO_APPS_CONECTADOS.md`
- `rodadas/gpt/REAUDITORIA_003A_10_VERIFICACAO_BISU_POS_REMOCAO.md`
- `rodadas/gpt/REAUDITORIA_003A_10B_MARCADOR_E2E_POS_MIGRATION.md`

Correção executada/auditada:

`rodadas/gpt/CORRECAO_003A_10_VERIFICACAO_BISU_POS_REMOCAO.md`

Branch:

`claude/rodada-003a-meta-connection-foundation`

PR: **#11 draft**.

Head funcional auditado da 003A-10:

`12c179a6d114ede60d5f8675c4813ea03bd75ba6`

Head observado após o gate documental/one-off 003A-10B:

`ceffa3f92d86622a73ea0162a02526b8273bb0f6`

CI aplicável ao código funcional:

`32768038482` — **verde** em install, lint, typecheck, Edge Functions, testes e build.

## 4. Estado comprovado da conexão real

A integração externa correta **já foi removida** em **Business Settings > Apps conectados**.

A migration `20260824170000_add_meta_external_disconnect_pending.sql` está aplicada no Supabase remoto:

- histórico remoto = **14 migrations**;
- `20260824170000` presente;
- coluna `external_disconnect_pending_at` presente;
- RPC `mark_meta_external_disconnect_pending` presente e protegida para `service_role`;
- `revoke_meta_connection` recriada conforme a migration.

O gate 003A-10B foi auditado pelo GPT. A conexão real `9d256edf-0a89-4436-8d60-f375bc087c08` está:

- `status = ACTIVE`;
- `connected_at = 2026-08-24 01:47:57Z`;
- `updated_at = 2026-08-24 19:57:57Z`;
- `external_disconnect_pending_at = 2026-08-24 19:57:57Z`;
- `disconnected_at = null`;
- `token_expires_at = 2026-10-23 01:47:55Z`;
- `external_user_id = 122103866379446065`;
- escopos preservados: `pages_show_list`, `pages_read_engagement`, `public_profile`;
- referência do token presente;
- segredo correspondente no Vault presente.

Há uma única conexão e um único marcador pendente no ambiente.

## 5. Sequência real do gate BISU

1. `Desconectar` local classificou a credencial como BISU e entrou no fluxo externo sem limpar estado.
2. Houve um desvio manual: `Contas > Apps` foi confundido com a integração instalada; a associação foi removida e depois restaurada corretamente com App ID `2940404272985831`.
3. A superfície correta foi localizada em **Business Settings > Apps conectados**.
4. Nessa tela, `Trafego Pago Business Dev` (App ID `2940404272985831`) foi removido e confirmado pelo fundador.
5. Um novo login/reload local perdeu o estado visual antigo do fluxo e houve cliques adicionais; a UI terminou em `?meta=erro`.
6. O fail-closed funcionou: nenhuma limpeza local ocorreu.
7. A 003A-09 provou que, depois da remoção correta, o token alvo deixou de operar, embora `debug_token` não devolva `is_valid=false` nesse caso.
8. A 003A-10 implementou marcador persistente e prova composta contextual para o comportamento real observado.
9. A migration da 003A-10 foi aplicada e auditada no remoto.
10. Como o E2E havia começado antes da coluna existir, o gate 003A-10B reconstruiu somente o marcador one-off do fluxo já comprovado. Status, token, Vault e `disconnected_at` permaneceram intactos.

## 6. 003A-10/10B — resultado auditado

A correção e o gate foram aprovados:

- marcador persistente `external_disconnect_pending_at` sobrevive a reload/login;
- RPC idempotente restrita a `service_role`;
- UI deriva `remocao-externa-pendente` do estado persistido;
- caminho manual correto: **Configurações do negócio > Apps conectados**;
- BISU continua sem endpoint mutável de revogação pelo produto;
- `is_valid=false` explícito continua sendo prova forte;
- no fluxo BISU pendente, a prova composta pós-remoção exige marcador + app token saudável + assinatura real observada do token alvo;
- `190` genérico, outro subcode, falha do app token, rede, 5xx ou ambiguidade continuam fail-closed;
- verificações repetidas são idempotentes;
- desde o HEAD funcional auditado da 003A-10 até o HEAD da 003A-10B houve somente alterações documentais/governança, sem novo delta funcional.

A regra **não** é `190 => revogado`.

## 7. Próxima ação autorizada

Gate humano final do E2E:

1. fundador deve abrir a tela de conta local do Tráfego Pago;
2. a UI deve mostrar o estado persistido **Falta concluir na Meta** mesmo após reload/login;
3. fundador deve clicar **uma única vez** em `Já removi — verificar`;
4. GPT deve auditar imediatamente o Supabase;
5. sucesso exige: `status=REVOKED`, `disconnected_at` preenchido, `token_secret_reference=null`, segredo removido do Vault e `external_disconnect_pending_at=null`;
6. se qualquer pós-condição falhar, não promover e não repetir ações na Meta por tentativa;
7. somente após esse gate passar a 003A pode ser promovida.

## 8. Continua NÃO autorizado

Até o gate final concluir:

- clicar `Desconectar`;
- nova remoção/reassociação no painel Meta;
- novo OAuth;
- seleção de ativos;
- limpeza manual do segredo;
- iniciar 003B;
- promover/mergear 003A.

## 9. Pendências não bloqueantes

- escopos `ads_*`/`business_management` e seleção detalhada de ativos ficam para 003B;
- logger Next dev registra URL do callback com `code`/`state`: tratar redaction antes de produção;
- leaked-password protection antes de produção;
- SMTP/domínio de produção;
- default ACL residual de `supabase_admin` enquanto inerte;
- App Review/Business Verification para fase comercial quando aplicável.
