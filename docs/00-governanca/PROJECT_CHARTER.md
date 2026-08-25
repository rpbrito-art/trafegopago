# PROJECT CHARTER — Quoron

## 1. Mandato

Construir um MVP comercializável de uma plataforma SaaS que conecte Instagram e Meta Ads para transformar dados do negócio, conteúdo, público, distribuição orgânica/paga e resultados em um ciclo contínuo de aprendizagem e recomendação.

O produto deve entregar valor tanto para empresas que investem em mídia quanto para empresas que operam apenas de forma orgânica em determinado momento.

## 2. Princípio de produto

Núcleo:

`contexto do negócio → objetivo → jornada → público/personas → conteúdo/criativo → distribuição orgânica, paga ou ambas → resultado → aprendizado → nova ação`

Canônico detalhado:

`docs/01-produto/GROWTH_INTELLIGENCE_CANONICAL.md`

### Lei da simplicidade guiada

**A complexidade pertence ao sistema, não ao usuário.**

O fluxo padrão deve usar linguagem de negócio, defaults seguros, explicar recomendações, esconder complexidade técnica desnecessária e pedir apenas decisões realmente humanas. Gasto, risco, incerteza e limitações nunca podem ser escondidos.

## 3. Público inicial

Pequenas empresas orientadas a aquisição/crescimento, com presença relevante no Instagram e sem estrutura sofisticada de marketing. O usuário típico não precisa dominar Ads Manager.

## 4. Escopo inicial obrigatório

- autenticação/conta;
- organizações/membros;
- onboarding/contexto do negócio;
- conexão segura Meta/Instagram;
- importação/publicação de conteúdo;
- métricas orgânicas;
- inteligência/recomendações orgânicas e pagas quando aplicável;
- jornada/resultado configurável;
- personas/públicos como hipóteses apoiadas por evidência;
- aprovação humana de gasto;
- campanhas/experimentos Meta quando aplicável;
- leads/micro-CRM quando a jornada exigir;
- conversões, pesquisas e insights;
- AI Router multi-provedor e ledger de custo;
- auditoria, filas, retries, idempotência e observabilidade.

## 5. Fora do MVP

- canais além de Meta/Instagram no início;
- CRM generalista/e-commerce completo;
- app mobile nativo;
- gasto decidido autonomamente por LLM;
- agência multi-cliente sofisticada;
- n8n/Make como dependência estrutural;
- infraestrutura própria sem necessidade concreta quando Supabase/Meta já resolvem o problema.

## 6. Stack-base

- Next.js + TypeScript;
- Supabase/Postgres/Auth/Storage/RLS/Queues/Edge Functions;
- Cron quando existir necessidade periódica real;
- APIs oficiais Meta/Instagram;
- AI Router próprio desacoplado de fornecedor.

A stack só muda por decisão documentada.

## 7. Regras inegociáveis

1. Multi-tenancy por `organization_id`.
2. RLS em tabela exposta pela Data API.
3. `service_role`/segredos nunca no browser.
4. Tokens Meta server-side.
5. Gasto exige aprovação humana persistida.
6. LLM recomenda; não autoriza gasto.
7. Mutação externa deve ser idempotente/reconciliável.
8. Webhook persistido/deduplicado antes de processamento pesado.
9. Jobs toleram retry/timeout/rate limit.
10. Métricas Meta normalizadas/versionadas.
11. Versão Meta centralizada.
12. Dados brutos relevantes preservados quando necessários à reconciliação/auditoria.
13. Cálculos determinísticos fora de LLM.
14. Custo de IA por execução/organização.
15. Modelo de IA não hardcoded na feature.
16. Disconnect/delete reais e auditáveis.
17. UX guiada sem exigir domínio técnico.
18. Conteúdo orgânico, criativo e anúncio são distintos.
19. Oportunidades não têm número fixo.
20. Valor orgânico existe mesmo sem mídia paga.
21. Jornada varia por negócio.
22. Personas distinguem hipótese de evidência observada.
23. Resultado desejado e mensurável são distintos.
24. Complexidade técnica pode ser escondida; consequências não.

## 8. Método de desenvolvimento

Fluxo oficial:

`GPT planeja/especifica → fundador autoriza quando necessário → Claude executa o delta → GPT audita independentemente → correção ou promoção`

Claude não deve inventar contrato estrutural durante implementação. Dúvida que mude domínio, segurança, dinheiro, integração, schema ou arquitetura volta ao GPT.

### Separação de responsabilidades

- **Claude:** implementação + provas proporcionais + índice de evidências.
- **GPT:** auditoria independente + julgamento de suficiência + promoção.

Claude não deve reproduzir uma auditoria completa para facilitar o trabalho do GPT.

## 9. Qualidade proporcional ao risco

Nenhuma rodada termina só porque compila, mas também não deve repetir provas sem risco concreto.

Estado promovido é baseline.

### Risco crítico

Auth, RLS/tenancy, secrets, dinheiro, permissões, endpoint público, mutação externa, idempotência e migration destrutiva/compartilhada: prova focada real da fronteira + regressões diretamente relacionadas + CI final.

### Risco funcional

Regra de domínio, state machine, worker interno e migration não destrutiva: testes afetados + integração principal quando necessária + CI final.

### Risco baixo

Docs/config sem runtime/comentários: apenas checks pertinentes.

### Correções

Correção pequena prova defeito + raio direto. Não repete bateria anterior salvo primitive compartilhada alterada, raio desconhecido ou exigência explícita do GPT.

### Execução de testes

- local: testes novos/afetados;
- suíte completa: uma única CI final por padrão;
- `npm ci` local somente quando necessário;
- build local apenas se o delta afetar build/rotas/config ou mandato exigir.

A política detalhada está em `PROJECT_PROMPT.md` e `DOCUMENTATION_LIFECYCLE.md`.

## 10. Governança documental

Canônicos de produto/arquitetura contêm contrato atual; pesquisa explica origem, mas não prevalece sobre decisão posterior.

Bootstrap deve ser pequeno:

- GPT: prompt canônico + estado + índice/mandato conforme necessidade;
- Claude: `CLAUDE.md` automático + `estado.md` + mandato + READ SET obrigatório.

`ACTIVE_DOCS.md` é índice para continuidade, não segunda especificação. `HISTORY_SUMMARY.md` é histórico comprimido, não leitura ritual do executor.

Mudança de contrato deve atualizar o canônico correspondente na mesma etapa substantiva quando necessário.