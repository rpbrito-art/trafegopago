# MVP CANÔNICO — Tráfego Pago

Status: canônico para a primeira construção do produto.

## 1. Definição

Tráfego Pago é uma plataforma SaaS de otimização contínua de aquisição por tráfego pago assistida por IA. O primeiro produto é restrito ao ecossistema Instagram + Meta Ads e a empresas que usam campanhas para gerar leads.

O produto deve transformar atividade de marketing em um ciclo fechado de aprendizagem:

`conteúdo → desempenho orgânico → seleção → experimento pago → resultado → escala → lead → qualificação → venda/perda → pesquisa → insight → nova estratégia`

A publicação e o gerenciamento de anúncios são meios. O valor está em decidir melhor o que testar, medir o resultado real até o desfecho comercial e aprender continuamente.

## 2. Usuário-alvo inicial

Pequenas empresas que:

- operam Instagram profissional;
- investem ou pretendem investir em Meta Ads;
- vendem serviços/produtos por geração de leads;
- não dispõem de equipe analítica sofisticada;
- precisam de orientação objetiva sobre conteúdo, campanha e conversão.

Casos adequados incluem clínicas, estética, academias, escolas, imobiliárias, serviços profissionais e negócios locais. E-commerce complexo não é foco inicial.

## 3. Promessa do MVP

O usuário conecta sua estrutura Meta e o sistema deve ajudá-lo a:

1. entender o desempenho dos conteúdos já publicados;
2. identificar quais conteúdos merecem teste pago;
3. criar testes/campanhas após aprovação financeira;
4. acompanhar performance e qualidade dos resultados;
5. escolher o vencedor com critérios determinísticos e interpretação por IA;
6. escalar somente com nova aprovação do proprietário;
7. acompanhar o lead até ganho/perda;
8. descobrir por que pessoas converteram ou não;
9. transformar esses dados em recomendações estratégicas.

## 4. Onboarding

### 4.1 Conta

O usuário deve poder:

- criar conta por e-mail e senha;
- confirmar e-mail;
- entrar/sair;
- recuperar acesso;
- gerenciar dados básicos e sessões.

### 4.2 Organização

Após autenticar, cria uma organização/workspace e informa:

- nome da empresa;
- segmento;
- cidade/região relevante;
- produto/serviço principal;
- proposta/oferta;
- ticket médio;
- público-alvo;
- principais diferenciais;
- principais objeções conhecidas;
- objetivo de aquisição;
- meta comercial opcional;
- limites financeiros padrão.

O sistema deve permitir múltiplos membros no mesmo negócio, mesmo que a primeira UI exponha apenas papéis básicos.

### 4.3 Meta

O usuário conecta, por fluxo oficial de autorização:

- identidade/Business apropriado;
- conta profissional do Instagram;
- página/ativos exigidos pela Meta;
- conta de anúncios.

A interface deve mostrar status da integração, permissões ausentes, última sincronização e erros acionáveis.

## 5. Área Hoje / Visão geral

Tela principal orientada a ação, não um dashboard decorativo.

Deve priorizar:

- integrações com erro;
- conteúdo com oportunidade de teste;
- experimento aguardando aprovação;
- experimento concluído aguardando decisão;
- campanha com alerta relevante;
- lead quente/prioritário;
- pesquisa/feedback relevante;
- novo insight estratégico.

## 6. Conteúdo

### 6.1 Importação

Após conectar Instagram, o sistema importa conteúdos suportados e mantém sincronização incremental.

Cada item deve possuir:

- identificador externo;
- tipo/formato;
- mídia e/ou referência de mídia;
- legenda;
- data de publicação;
- permalink quando aplicável;
- status;
- métricas normalizadas e snapshots;
- payload bruto suficiente para auditoria/reprocessamento;
- atributos derivados pela IA quando autorizados.

### 6.2 Publicação

O MVP também deve permitir criar/publicar conteúdo suportado pela API, com estados explícitos:

`DRAFT → SCHEDULED/QUEUED → PUBLISHING → PUBLISHED | FAILED`

Upload manual é complementar; conexão com Instagram é o fluxo principal.

### 6.3 Inteligência de conteúdo

O sistema pode derivar, com IA barata sempre que possível:

- tema;
- formato;
- gancho;
- CTA;
- oferta;
- tom;
- promessa;
- público presumido;
- características visuais/textuais úteis.

Esses atributos servem para encontrar padrões, não para substituir métricas reais.

## 7. Oportunidades de teste

O sistema calcula sinais orgânicos e histórico para sugerir conteúdos candidatos.

A recomendação deve conter:

- conteúdos sugeridos;
- motivo objetivo;
- evidências/métricas;
- hipótese a testar;
- variável principal do teste;
- orçamento/período sugeridos quando possível;
- nível de confiança;
- limitações conhecidas.

A IA nunca deve declarar causalidade sem evidência compatível.

## 8. Aprovação financeira

Qualquer ação que possa gerar gasto exige aprovação persistida do usuário autorizado.

Fluxo:

`RECOMMENDATION → APPROVAL_REQUEST → APPROVED/REJECTED → COMMAND → EXECUTION`

A aprovação registra:

- organização;
- usuário aprovador;
- objeto/campanha/experimento;
- orçamento solicitado;
- orçamento aprovado;
- moeda;
- data/hora;
- escopo da autorização.

A LLM não recebe credencial ou função que permita contornar esse gate.

## 9. Experimentos pagos

Quando o usuário aprova, o sistema configura teste utilizando capacidades oficiais da Meta quando disponíveis e adequadas.

Objetivo inicial: comparar criativos/conteúdos de maneira controlada.

O produto deve registrar:

- hipótese;
- variantes;
- campanha/ad set/ad/creative externos;
- público/objetivo/posicionamentos relevantes;
- orçamento;
- janela do teste;
- critério de avaliação;
- status;
- eventos de execução e erros.

O sistema não deve inventar um A/B test informal se a Meta oferecer mecanismo oficial apropriado.

## 10. Métricas pagas

A coleta deve preservar snapshots e dados brutos suficientes, normalizando para conceitos internos como:

- gasto;
- impressões/visualizações conforme semântica vigente;
- alcance quando disponível e semanticamente compatível;
- cliques;
- CTR;
- CPC;
- leads;
- CPL;
- leads qualificados;
- CPQL;
- conversões/vendas;
- CPA;
- receita atribuível quando disponível;
- ROAS quando calculável.

Métricas Meta são versionadas e podem ser removidas; a UI e o domínio não devem depender diretamente do nome de um campo externo.

## 11. Determinação de resultado

Vencedor não é escolhido por uma LLM livre.

Pipeline:

1. validar qualidade/volume dos dados;
2. calcular métricas determinísticas;
3. aplicar critérios de elegibilidade/comparabilidade;
4. usar resultado oficial do teste Meta quando aplicável;
5. incorporar desfechos de lead/conversão, quando já disponíveis;
6. IA interpreta e explica;
7. sistema produz recomendação com confiança e limitações.

Hierarquia de valor preferencial:

`receita/venda > oportunidade/lead qualificado > lead > clique > engajamento`

Uma campanha não deve ser priorizada apenas por interação ou CTR se produz pior resultado comercial.

## 12. Escala

Quando houver recomendação de escala, o usuário recebe evidências e escolhe o orçamento.

Fluxo:

`RESULT → SCALE_RECOMMENDATION → APPROVAL → SCALE_COMMAND → EXECUTION`

O sistema pode sugerir valores, mas não autoriza sozinho aumento de gasto.

## 13. Leads

### 13.1 Fonte inicial

Lead Ads/formulários da Meta são a principal fonte canônica do MVP.

Interações como comentário, curtida ou salvamento são sinais de interesse, não leads por padrão.

### 13.2 Micro-CRM

Estados mínimos:

`NEW → CONTACTED → QUALIFIED → OPPORTUNITY → WON | LOST`

O sistema deve permitir registrar eventos, notas mínimas, responsável e motivo de perda.

### 13.3 Linhagem

Sempre que tecnicamente possível, cada lead deve manter vínculo com:

`lead → anúncio → criativo → experimento/campanha → conteúdo original`

Isso permite aprender qual conteúdo realmente gera resultado comercial.

## 14. Priorização de leads

O sistema pode calcular score a partir de dados estruturados e comportamento disponível. IA pode interpretar campos abertos, mas o score deve ser auditável.

A UI deve destacar leads que exigem ação sem afirmar certeza indevida.

## 15. Conversão e feedback à Meta

Ao marcar um lead como ganho, o produto registra:

- data;
- valor opcional;
- produto/serviço;
- origem;
- observações estruturadas relevantes.

Quando permitido e configurado, eventos adequados podem ser enviados à Meta via mecanismo oficial de conversões para melhorar medição/otimização.

## 16. Pesquisas pós-desfecho

Mudanças para `WON` ou `LOST` podem gerar pedido de pesquisa.

MVP: micro-pesquisa por link próprio distribuível por canal configurado/manual. WhatsApp automatizado não é requisito estrutural da primeira versão.

Perguntas devem privilegiar respostas estruturadas + campo aberto opcional.

Exemplos de razões:

- preço;
- momento;
- concorrente;
- confiança;
- produto inadequado;
- comunicação/oferta pouco clara;
- atendimento;
- conveniência/experiência;
- outro.

IA classifica texto aberto e agrupa temas, preservando resposta original.

## 17. Insights estratégicos

O sistema cruza:

- atributos de conteúdo;
- desempenho orgânico;
- mídia paga;
- leads;
- qualificação;
- vendas/perdas;
- pesquisas.

Insights devem separar:

- fato observado;
- interpretação;
- hipótese;
- recomendação de próximo teste.

Áreas possíveis:

- preço;
- oferta;
- aderência;
- posicionamento;
- copywriting;
- UX writing;
- criativo/formato;
- público;
- objeções;
- experiência comercial.

## 18. IA em cascata

Todo uso de IA passa por roteador central.

- Tier 0: sem IA para cálculo/regra.
- Tier 1: modelo econômico para classificação, extração e resumo.
- Tier 2: modelo intermediário para comparação e hipótese.
- Tier 3: modelo premium apenas para análise estratégica complexa/baixa confiança.

Fornecedor e modelo são configuração substituível. Toda execução gera registro de custo.

## 19. Navegação mínima

- Hoje
- Conteúdo
- Oportunidades
- Experimentos
- Campanhas
- Leads
- Insights
- Configurações

A UI deve ser simples e orientada a decisão.

## 20. Configurações mínimas

- conta e sessão;
- organização e membros;
- perfil do negócio;
- conexão Meta/Instagram;
- conta de anúncios;
- limites financeiros;
- preferências de notificação;
- status de integrações;
- privacidade/exclusão/desconexão.

## 21. Critério de MVP comercializável

O MVP só é considerado comercialmente demonstrável quando o happy path abaixo funciona com segurança e auditabilidade:

`criar conta → criar organização → conectar Meta → importar/publicar conteúdo → sincronizar métricas → recomendar teste → aprovar gasto → criar teste/campanha → sincronizar resultado → recomendar vencedor → aprovar escala → executar → receber lead → qualificar → marcar ganho/perda → coletar feedback → gerar insight`

Cada transição crítica deve sobreviver a retry, erro parcial e reconciliação.
