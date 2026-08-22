# RESEARCH SYNTHESIS — Etapa 2

## Objetivo

Registrar os achados técnicos que fundamentam os documentos canônicos. Este arquivo é evidência de pesquisa, não prevalece sobre `docs/03-canonical/`.

## 1. Meta/Instagram

- Contas profissionais do Instagram podem ser integradas por APIs oficiais.
- Publicação por API é suportada para tipos de mídia compatíveis.
- Insights/métricas podem ser consultados, mas nomes e disponibilidade evoluem entre versões.
- Comentários e determinados eventos devem privilegiar webhooks quando suportados.
- Senhas nunca devem ser capturadas; integração deve usar autorização oficial/OAuth.

## 2. Marketing API

- A Meta expõe recursos para campanhas, ad sets, ads, creatives e insights.
- A plataforma possui mecanismos próprios de split/creative testing; o produto deve usá-los quando adequados em vez de simular testes de forma artesanal.
- Acesso comercial a ativos de terceiros depende de permissões, revisão/verificação e níveis de acesso aplicáveis.
- Rate limits e mudanças de versão exigem isolamento da integração, filas, backoff e versionamento explícito.

## 3. Lead Ads

- Lead Ads podem entregar eventos via webhook e dados podem ser recuperados pela Graph API conforme permissões.
- O webhook deve ser tratado como sinal de evento, não como local de processamento pesado.
- A arquitetura recomendada é `receber → validar → persistir/deduplicar → responder → processar assíncrono`.

## 4. Tracking e conversões

- O MVP deve preservar linhagem entre conteúdo, anúncio, lead e resultado comercial.
- Eventos de conversão podem ser enviados à Meta por mecanismos oficiais quando configurados e legalmente apropriados.
- Atribuição publicitária tem limitações; o produto deve distinguir medição observada, atribuição da plataforma e inferência própria.

## 5. Supabase

Supabase cobre a fundação necessária ao MVP:

- Postgres;
- Auth;
- Storage;
- RLS;
- Edge Functions;
- Cron;
- Queues/pgmq;
- Realtime quando necessário;
- secrets/Vault conforme desenho final.

Conclusão: n8n/Make não são necessários como dependência inicial.

## 6. Processamento assíncrono

Necessidades identificadas:

- webhook inbox;
- filas duráveis;
- retries com backoff;
- visibility timeout;
- idempotência;
- reconciliação periódica;
- jobs de sincronização de métricas;
- separação entre processamento síncrono da UI e operações externas.

## 7. Segurança

Regras derivadas:

- multi-tenancy por organização;
- RLS em tabelas expostas;
- service credentials apenas no servidor;
- tokens externos tratados como segredo;
- auditoria de ações financeiras;
- exclusão/desconexão efetiva de dados de plataforma;
- least privilege nas permissões Meta;
- payloads externos considerados não confiáveis até validação.

## 8. Métricas e versionamento

A revisão adversarial confirmou que métricas e versões da Meta mudam. Portanto:

- versão da API deve ser explícita e centralizada;
- payload bruto relevante deve ser preservado;
- métricas devem passar por normalização canônica;
- semanticamente diferentes não podem ser fundidas apenas porque têm nomes parecidos;
- migração de versão exige testes antes de promoção.

A investigação identificou v26.0 como versão recém-lançada em julho de 2026 durante esta etapa; essa informação deve ser revalidada antes de implementação/upgrade porque versões continuam mudando.

## 9. IA

- Cálculo e regra determinística não devem usar LLM.
- Structured outputs/JSON schema devem ser preferidos para resultados consumidos pela aplicação.
- Modelos e preços mudam rapidamente; fornecedor/modelo não deve ser hardcoded nas features.
- A aplicação precisa de roteador de IA, catálogo de modelos/preços e ledger por execução.
- Escalonamento deve ocorrer por capacidade, custo, confiança e criticidade, não apenas por uma lista fixa de modelos.

## 10. Experimentação

A escolha de vencedor deve combinar:

- resultado oficial do teste quando disponível;
- volume/qualidade dos dados;
- métricas determinísticas;
- desfechos comerciais;
- interpretação por IA separada da decisão matemática.

Hierarquia de negócio recomendada:

`venda/receita > oportunidade/qualificação > lead > clique > engajamento`.

## 11. Principais brechas evitadas pela revisão

1. depender de documentação de versão anterior da Meta;
2. espalhar nomes de métricas externas pelo código;
3. processar webhooks de forma síncrona;
4. usar polling para eventos que possuem webhook;
5. não prever reconciliação quando webhooks falham;
6. não proteger operações que geram gasto contra duplicação;
7. permitir que LLM execute orçamento diretamente;
8. atrelar tenancy a `user_id` em vez de organização;
9. expor tokens/service role ao browser;
10. hardcodar modelo/preço de IA;
11. perder payload bruto e snapshots históricos;
12. não tratar exclusão de dados Meta como requisito de produto.

## 12. Decisão resultante

A arquitetura-base aprovada para a Etapa 3 é:

`Next.js/TypeScript + Supabase + APIs oficiais Meta + AI Router próprio`

com processamento assíncrono via Queues/Cron/workers e sem n8n/Make no núcleo.
