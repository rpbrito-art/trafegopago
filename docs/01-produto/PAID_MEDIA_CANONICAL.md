# PAID MEDIA CANONICAL — Quoron

Status: **CANÔNICO E VIGENTE**
Data: 2026-08-24
Origem: decisão explícita do fundador durante o gate real da Rodada 003B.

## 1. Motivo desta correção

A documentação anterior incorporou uma interpretação incorreta da intenção de produto ao tentar abrir espaço real para o modo orgânico.

A intenção correta nunca foi transformar mídia paga em capacidade periférica, secundária ou dispensável na proposta de valor. A intenção era impedir o erro oposto: modelar o produto como se todo valor dependesse de anunciar desde o primeiro uso e como se conteúdo orgânico não pudesse gerar aprendizado útil.

Este documento corrige essa interpretação.

## 2. Regra canônica

**Mídia paga é um pilar central do Quoron e faz parte da trajetória de crescimento que o produto deve ser capaz de oferecer a todo usuário.**

O produto pode entregar valor antes de existir investimento e deve compreender o desempenho orgânico. O usuário pode passar períodos operando apenas organicamente, pode ainda não possuir conta de anúncios ou pode decidir não investir naquele momento.

Isso não transforma mídia paga em funcionalidade periférica.

A intenção estratégica do produto é que, quando houver base, objetivo e segurança suficientes, o sistema possa conduzir o usuário também para aquisição paga, testes, campanhas, escala e aprendizagem combinada entre orgânico e pago.

Em termos simples:

- **orgânico tem valor próprio**;
- **pago é central para a proposta de crescimento**;
- **gasto nunca é automático**;
- **não investir agora não significa que o produto deva esconder, remover ou arquitetar mídia paga como ramo irrelevante**.

## 3. O que é opcional e o que não é

É preciso separar quatro conceitos.

### 3.1 Uso orgânico

Pode existir sozinho e deve gerar aprendizagem útil.

### 3.2 Capacidade de mídia paga do produto

É estrutural e central. O software deve possuir e evoluir capacidades de leitura, criação, medição, experimentação e escala de mídia paga.

### 3.3 Ativação de uma campanha pelo usuário

É contextual. Nem todo usuário precisa anunciar no primeiro dia ou em todo momento.

### 3.4 Gasto

É sempre uma ação de risco financeiro e continua condicionado a aprovação humana explícita e persistida.

Logo:

`ter permissão técnica para operar Ads ≠ criar campanha ≠ aprovar orçamento ≠ gerar gasto`

Essas etapas não podem ser colapsadas.

## 4. Consequência para conexão Meta e permissões

A política de menor privilégio continua vigente, mas deve ser interpretada em relação às capacidades legitimamente centrais do produto, e não a uma versão artificialmente reduzida do produto.

É aceitável que a conexão base Meta solicite permissões relacionadas a anúncios quando:

- elas correspondem a capacidades centrais já previstas no produto;
- a Meta as agrupa naturalmente no fluxo oficial de autorização utilizado;
- separar a autorização criaria complexidade relevante sem benefício proporcional;
- a permissão, por si só, não produz gasto;
- qualquer mutação onerosa continua bloqueada pelos gates financeiros internos.

Não solicitar permissões sem finalidade prevista. Permissões de anúncios não autorizam, por si, qualquer campanha ou gasto.

## 5. Conta de anúncios e onboarding

O usuário pode ainda não ter uma conta de anúncios ou pode não selecionar uma no primeiro contato. Isso não invalida o onboarding orgânico nem a conexão Instagram.

Entretanto, a experiência futura deve tornar a capacidade paga visível e acessível, conduzindo o usuário para configurá-la quando houver motivo estratégico.

A ausência temporária de Ad Account é um estado de produto, não evidência de que mídia paga é opcional na proposta de valor.

## 6. Relação entre orgânico e pago

O modelo continua sendo:

`contexto do negócio → objetivo → jornada → público/personas → conteúdo/criativo → distribuição orgânica, paga ou combinada → resultado → aprendizado → próxima ação`

A inteligência deve combinar evidências dos dois ambientes.

Exemplos:

- usar sinais orgânicos para identificar criativos promissores para distribuição paga;
- usar mídia paga para testar oferta, criativo, público ou jornada com maior velocidade/alcance;
- comparar atenção orgânica com resultado comercial pago;
- evitar confundir alto engajamento orgânico com maior capacidade de conversão;
- retroalimentar conteúdo orgânico com aprendizados obtidos em campanhas.

O produto não deve assumir que todo conteúdo será anunciado, nem que todo anúncio precisa nascer de post orgânico.

## 7. Segurança financeira permanece invariável

Esta correção **não enfraquece** a arquitetura financeira.

Continua canônico:

`Recommendation → Human Approval → Domain Command → Idempotent Operation → Meta`

Nunca:

`LLM → gasto na Meta`

Toda criação/alteração com potencial de gasto deve respeitar a Financial Approval Foundation, limites, autorização persistida, idempotência e auditoria previstos no produto.

## 8. Precedência documental

Em qualquer divergência sobre o papel estratégico de orgânico x mídia paga, este documento prevalece sobre formulações anteriores até que sejam harmonizadas diretamente.

Estão explicitamente **superadas no sentido antigo** formulações como:

- `.gpt/PROJECT_PROMPT.md`: “Mídia paga é capacidade, não obrigação” quando interpretada como capacidade periférica;
- `GROWTH_INTELLIGENCE_CANONICAL.md` §7: “Investimento em mídia paga é opcional do ponto de vista do usuário” quando interpretado como ausência de trajetória esperada para pago;
- `MVP_CANONICAL.md` §§1–3 e 21: trechos que façam mídia paga parecer apenas um ramo eventual sem centralidade estratégica;
- `IMPLEMENTATION_ROADMAP.md`: formulações que agrupem mídia paga com capacidades realmente opcionais como se fossem equivalentes em centralidade.

A leitura correta passa a ser:

**o usuário não é obrigado a gastar para começar ou para obter valor orgânico, mas a capacidade de tráfego pago é central ao produto e deve estar disponível e integrada à trajetória de crescimento.**

## 9. Regra para próximas rodadas

Qualquer rodada que toque Meta, onboarding, Conteúdo, Oportunidades, Financial Approval, Ads, Experimentos, Scale, Leads, Conversões, Hoje ou Insights deve evitar reintroduzir a ideia de que mídia paga é apenas um ramo periférico.

Antes da próxima rodada substantiva após a 003B, os documentos antigos com formulação conflitante devem ser harmonizados diretamente, sem criar rodada apenas de numeração/housekeeping.
