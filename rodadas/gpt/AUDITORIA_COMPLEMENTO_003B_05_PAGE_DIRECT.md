# AUDITORIA GPT — COMPLEMENTO 003B-05: LEITURA DIRETA DA PAGE

Data: 2026-08-25

Status: **EXECUTADO, AUDITADO E APROVADO COMO EVIDÊNCIA READ-ONLY**.

Isto **não** promove a 003B e **não** torna User Access Token arquitetura definitiva.

## 1. Escopo auditado

Relatório Claude:

`rodadas/claude/RELATORIO_COMPLEMENTO_003B_05_PAGE_DIRECT.md`

Sonda:

`scripts/meta-page-direct-003b-05-probe.mjs`

Branch:

`claude/rodada-003b-meta-asset-discovery-selection`

## 2. Auditoria independente

O GPT verificou:

- o script executa somente GET e apenas as duas chamadas autorizadas;
- token é lido server-side do Vault e enviado em `Authorization`; token/secret/URL não são impressos;
- nenhum código de produto foi alterado por esta complementação;
- PR #12 permanece draft e não mergeada;
- snapshot remoto no Supabase mantém a conexão `655da6e6-9056-456d-a81d-5e2570da5faf` ACTIVE, mesma identidade e mesmos scopes;
- `instagram_accounts=0` e `ad_accounts=0`, portanto a complementação não persistiu seleção.

## 3. Resultado factual aprovado

Com o User Access Token corrente:

1. `GET /1356474050873300?fields=id,name` → HTTP 200, Page `Quoron`;
2. `GET /1356474050873300?fields=id,name,instagram_business_account` → HTTP 200;
3. `instagram_business_account.id = 17841429590351285`.

Logo:

- falta de acesso do usuário à Page já estava reprovada por prova visual Meta;
- agora também está reprovada a hipótese de que o token corrente não consiga ler diretamente a Page;
- o vínculo Page Quoron ↔ Instagram profissional `@goquoron` existe e é visível para o token;
- o comportamento anômalo está isolado na **enumeração** de Pages por `/me/accounts` neste experimento.

A investigação **não prova a causa interna da Meta** para o vazio de `/me/accounts`.

## 4. Revalidação documental Meta

A documentação oficial Meta/Postman consultada em 2026-08-25 continua documentando:

- User Access Token + `/me/accounts` para listar Pages gerenciadas;
- quando o `page_id` já é conhecido, consulta direta `/{page_id}` como caminho para a Page e seus dados/token;
- Instagram API with Facebook Login com Facebook Login for Business e Facebook User Access Token para leitura/Insights;
- para Insights: `instagram_basic`, `instagram_manage_insights` e `pages_read_engagement`; a documentação registra condição adicional de `ads_management` + `ads_read` quando o papel sobre a Page vier via Business Manager, o que deve ser provado e nunca presumido.

Portanto há divergência entre o caminho de enumeração documentado e o comportamento real observado. Não mascarar isso com hipótese.

## 5. Decisão de auditoria

**COMPLEMENTO APROVADO.**

Mas o experimento USER ainda **não passou o requisito genérico de descoberta automática da 003B**. Conhecer antecipadamente o Page ID da fixture Quoron não é solução canônica para clientes reais, e o produto não deve exigir que um pequeno empresário informe IDs técnicos.

Também não há evidência suficiente para:

- adicionar `business_management`;
- adicionar `ads_management`;
- persistir Page Access Token;
- trocar definitivamente BISU por USER;
- reescrever a descoberta para Page ID hardcoded/conhecido.

## 6. Próxima prova autorizável

Como o IG ID real já está provado (`17841429590351285`), o próximo passo de maior valor é testar **sem persistência e sem alterar arquitetura** se o User Access Token corrente consegue executar as capacidades downstream que a Fase 4 precisará:

1. ler metadados mínimos do IG User diretamente;
2. ler uma métrica mínima de Insights diretamente.

Esse complemento deve usar o ID conhecido apenas como **fixture diagnóstica**, não como desenho de produto.
