# AUDITORIA — CORREÇÃO 003B-09: RESET E2E DA CONEXÃO META

Data: 2026-08-25

Veredito: **PARCIALMENTE APROVADA EM CÓDIGO; REPROVADA/INCOMPLETA NO CRITÉRIO OPERACIONAL E2E**.

## 1. O que foi executado

Branch: `claude/rodada-003b-meta-asset-discovery-selection`

HEAD auditado: `895dd0dc8b0d0d0c005c64edb95161518540deb8`.

PR #12: aberto, draft, não mergeado, `mergeable=true`.

CI: `32854313271` — `success`.

CI executou lint, typecheck, typecheck das Edge Functions, testes e build. Resultado da suíte normal: **759/759 testes passando**.

Delta de produto relevante:

- `revokeUserPermissions()` aceita sucesso explícito como JSON literal `true` e também `{ success: true }`;
- token USER saiu da query string do `DELETE /permissions` e passou para `Authorization: Bearer`;
- formas `false`, objeto sem `success` e corpo ilegível continuam falhando fechadas;
- BISU continua fora do endpoint USER;
- estado `conexao-recusada` agora oferece `Conectar novamente` e `Desconectar e começar de novo`;
- o cartão verde de conexão saudável pode ser suprimido quando a descoberta já provou que a credencial foi recusada;
- foi criado `scripts/e2e/meta-disconnect-003b-09.e2e.ts` e `vitest.e2e.config.ts` para a prova real.

A auditoria de código não encontrou alteração de app Meta, scopes, `.env.local`, Business Login Configuration, portfolios, Page, Instagram, Ad Account, campanha ou gasto no delta publicado.

## 2. Falha de execução contra o mandato

O mandato 003B-09 exigia explicitamente:

1. executar uma desconexão USER real pelo backend canônico;
2. provar a forma da resposta real da Meta;
3. deixar a conexão `REVOKED`;
4. provar no Supabase a limpeza da referência do token, expiração e scopes;
5. não reconectar;
6. escrever `rodadas/claude/RELATORIO_CORRECAO_003B_09_RESET_E2E_CONEXAO_META.md`.

Isso **não foi concluído**.

Evidências independentes:

- o arquivo de relatório exigido não existe no HEAD auditado;
- o harness E2E foi deliberadamente excluído da suíte normal/CI e exige `META_E2E_DISCONNECT=1`;
- a CI verde, portanto, não prova a desconexão real;
- snapshot independente do Supabase após o Claude terminar mostra a conexão `655da6e6-9056-456d-a81d-5e2570da5faf` ainda:
  - `status=ACTIVE`;
  - `scope_count=6`;
  - `has_token_reference=true`;
  - `disconnected_at=null`;
  - `external_disconnect_pending_at=null`;
  - nenhum Instagram ou Ad Account selecionado.

Logo o objetivo principal — **zerar o ambiente para o fundador testar do zero** — não foi atingido.

## 3. Avaliação do código publicado

A correção de parser é coerente com o mandato:

- sucesso booleano literal `true` é aceito;
- objeto com `success === true` ou `"true"` é aceito por compatibilidade;
- demais respostas não viram sucesso;
- pós-condição continua exigindo que o token deixe de estar válido antes da limpeza local;
- não existe fallback para apagar localmente sem prova.

A mudança do token para header no `DELETE` melhora a segurança porque evita credencial em URL/logs.

A UX também corrige a contradição anterior: quando a descoberta classifica a credencial como recusada, a tela passa a apresentar um único estado acionável em vez de combinar cartão verde saudável com aviso de recusa.

Portanto o **código pode permanecer**. Não há motivo para revertê-lo.

## 4. Complemento obrigatório imediatamente autorizado

Claude Code deve continuar na mesma branch e **não abrir nova arquitetura**.

Executar agora somente a conclusão faltante da 003B-09:

1. rodar o harness real já criado com a flag explícita prevista pelo próprio código;
2. usar a conexão alvo e identidade já fixadas pelo mandato;
3. não simular revogação via SQL;
4. observar apenas metadados sanitizados da resposta da Meta;
5. se o E2E revelar uma forma de resposta não coberta, corrigir minimamente `revokeUserPermissions()` dentro do contrato USER e repetir;
6. ao final, provar no Supabase:
   - `status=REVOKED`;
   - sem referência de token;
   - `token_expires_at=null`;
   - scopes vazios;
   - `disconnected_at` preenchido;
   - nenhum ativo selecionado;
7. não reconectar;
8. escrever `rodadas/claude/RELATORIO_CORRECAO_003B_09_RESET_E2E_CONEXAO_META.md`;
9. se houver novo commit de código, rodar novamente testes/typecheck/lint/CI;
10. parar em `AGUARDANDO AUDITORIA GPT`.

Se o harness falhar por comportamento real da Meta, Claude deve registrar o erro sanitizado e corrigir apenas o necessário dentro desta mesma correção. Não está autorizado a alterar app, scopes, portfolios, ativos, `.env.local` ou arquitetura BISU.

## 5. Estado

003B-09:

- planejada: sim;
- autorizada: sim;
- código executado: sim;
- código auditado: **aprovado**;
- E2E real obrigatório: **não executado/comprovado**;
- reset da conexão: **não realizado**;
- rodada operacionalmente aprovada: **não**;
- promoção 003B: **não autorizada**.
