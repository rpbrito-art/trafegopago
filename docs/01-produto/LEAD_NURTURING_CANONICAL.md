# LEAD NURTURING CANONICAL — QUORON

Status: **CANÔNICO PARA PLANEJAMENTO FUTURO DE LEADS, MICRO-CRM E NUTRIÇÃO**
Data: 2026-08-24

Este documento transforma em contrato explícito uma capacidade que já aparecia parcialmente em `MVP_CANONICAL.md`, `DATA_MODEL.md`, `TECHNICAL_SPEC.md` e `IMPLEMENTATION_ROADMAP.md`, mas ainda não estava suficientemente detalhada: o Quoron não deve apenas capturar e armazenar leads; quando a jornada do negócio envolver atendimento comercial, deve ajudar a **trabalhar o lead ao longo do tempo até o próximo desfecho relevante**, preservando simplicidade, auditabilidade e controle humano.

Este documento:

- refina `MVP_CANONICAL.md` §§13–16;
- refina a Fase 12 e a Fase 16 de `IMPLEMENTATION_ROADMAP.md`;
- orienta o schema final de Leads em `DATA_MODEL.md`;
- orienta o módulo Leads de `TECHNICAL_SPEC.md`;
- permanece subordinado a `GROWTH_INTELLIGENCE_CANONICAL.md` no modelo geral de crescimento, jornada, evidência e simplicidade guiada.

## REGRA OBRIGATÓRIA DE PLANEJAMENTO

**Toda rodada futura que tocar Leads, Lead Ads, Micro-CRM, Conversões, Hoje, Notificações, jornada comercial ou priorização comercial deve incluir este documento no READ SET antes de definir escopo.**

Uma fase de Micro-CRM **não pode ser considerada completa** se entregar apenas cadastro de lead + mudança manual de status. O produto deve também oferecer, proporcionalmente ao estágio do MVP, mecanismos de **priorização, acompanhamento, próxima ação e reativação**.

---

## 1. Papel do Micro-CRM no produto

O Quoron não pretende competir com CRMs empresariais genéricos. O Micro-CRM existe para fechar o ciclo de aprendizagem entre marketing e resultado comercial:

`conteúdo/criativo → distribuição → lead → atendimento → qualificação → oportunidade → resultado → aprendizado`

A função do CRM é permitir que o sistema responda não apenas:

- quantos leads chegaram;

mas também:

- quais leads merecem atenção agora;
- quais foram trabalhados ou esquecidos;
- quais avançaram ou esfriaram;
- por que avançaram ou foram perdidos;
- quais anúncios/conteúdos geram leads de maior qualidade;
- qual próxima ação comercial é mais adequada quando houver evidência suficiente.

Quando a jornada do negócio **não** envolver lead ou atendimento humano, o Micro-CRM não deve ser forçado artificialmente no fluxo.

---

## 2. Três dimensões independentes do lead

O sistema deve separar três conceitos. Eles não podem ser colapsados em um único campo.

### 2.1 Estágio comercial

Representa **onde o lead está no processo**, com baseline inicial:

`NEW → CONTACTED → QUALIFIED → OPPORTUNITY → WON | LOST`

O estágio é um estado de processo. Ele não informa sozinho urgência nem probabilidade.

### 2.2 Temperatura / prioridade

Representa **quanta atenção o lead merece agora**.

A implementação pode usar rótulos simples como:

`FRIO → MORNO → QUENTE → PRIORITÁRIO`

ou outra taxonomia validada na rodada da Fase 12.

A temperatura não deve ser tratada como verdade absoluta nem ser inferida secretamente por LLM. Deve derivar de score ou regras auditáveis, com evidências compreensíveis.

Exemplos de sinais possíveis, quando disponíveis e legítimos:

- recência de entrada;
- resposta ao contato;
- pedido de preço/orçamento;
- intenção temporal declarada;
- aderência geográfica;
- produto/serviço de interesse;
- faixa de ticket ou capacidade declarada;
- agendamento realizado;
- visita/proposta iniciada;
- tempo sem resposta;
- repetição de interação;
- mudança de intenção;
- sinais de desqualificação.

Ausência de dados não deve ser inventada pela IA.

### 2.3 Próxima ação

Representa **o que deve acontecer agora**.

Exemplos:

- fazer primeiro contato;
- responder hoje;
- solicitar informação faltante;
- enviar orçamento;
- confirmar agendamento;
- fazer follow-up em uma data;
- retomar lead parado;
- aguardar até uma data combinada;
- encerrar como perdido com motivo;
- não agir porque ainda não há evidência suficiente.

A próxima ação deve ser separada do estágio e da temperatura.

---

## 3. Nutrição e acompanhamento obrigatórios

Quando a jornada comercial exigir acompanhamento, o produto deve suportar progressivamente:

- primeiro contato;
- follow-up;
- lembrete por tempo sem ação;
- tarefa com prazo;
- responsável;
- notas mínimas;
- registro de tentativa e resultado;
- adiamento/snooze com motivo ou data;
- reativação de lead que esfriou;
- sinalização de lead abandonado ou sem resposta;
- mudança de score/temperatura com justificativa;
- recomendação da próxima melhor ação quando houver dados suficientes.

O produto deve evitar que um lead simplesmente permaneça parado em `CONTACTED` ou `QUALIFIED` sem que o usuário saiba que há uma pendência comercial.

---

## 4. Next Best Action — próxima melhor ação

O Quoron deve evoluir para uma camada de **Next Best Action** comercial.

Entrada possível:

`estágio + temperatura + histórico + contexto do negócio + intenção declarada + eventos observados + restrições`

Saída esperada:

- ação recomendada;
- motivo;
- prioridade;
- prazo sugerido;
- evidências usadas;
- confiança/limitações quando aplicável.

Exemplo de experiência:

> Este lead pediu preço e disponibilidade, respondeu ao último contato e está há 6 horas sem retorno. Recomendo responder hoje.

Outro exemplo:

> Este lead informou que só pretende contratar no próximo mês. Não é prioritário agora. Retomar em 20 dias.

A IA pode interpretar texto e produzir explicação, mas regras objetivas de prazo, estágio, score e elegibilidade devem permanecer auditáveis. A IA não deve fabricar urgência.

---

## 5. Cadência e reativação

O Micro-CRM deve suportar cadência de acompanhamento sem obrigar o usuário a desenhar workflows complexos.

O sistema pode sugerir ou aplicar configurações simples, por exemplo:

- primeiro contato em até X horas;
- follow-up se não houver resposta;
- novo follow-up em janela definida;
- pausa quando o lead pede contato futuro;
- alerta quando oportunidade quente fica sem ação;
- reativação após período de inatividade.

As cadências devem ser configuráveis e adequadas ao segmento, sem assumir que toda empresa vende da mesma forma.

A cadência é uma **capacidade de acompanhamento**, não autorização para enviar mensagens automaticamente por qualquer canal.

---

## 6. Canais e automação

Na primeira versão, o valor do Micro-CRM **não depende de automatizar WhatsApp ou e-mail**.

O baseline aceitável é:

- sistema identifica a próxima ação;
- cria/organiza a tarefa;
- mostra ao usuário o que deve ser feito;
- permite registrar o resultado;
- pode sugerir uma mensagem, quando útil;
- aprende com o desfecho registrado.

Automação de envio por WhatsApp, e-mail ou outro canal só entra quando houver integração oficial, segurança, consentimento/base legal, governança e política de produto compatíveis.

Nunca usar automação de mensagem como atalho que transforme o produto em ferramenta de spam.

---

## 7. Área Hoje como fila comercial inteligente

A Fase 16 não deve mostrar apenas uma lista genérica de “leads prioritários”.

Quando o Micro-CRM estiver ativo, a área Hoje deve funcionar também como uma **fila de trabalho comercial guiada**, priorizando, conforme aplicável:

- novo lead ainda não contatado;
- lead quente sem resposta da empresa;
- follow-up vencido;
- oportunidade sem ação;
- lead que pediu retorno em data específica;
- lead elegível para reativação;
- conversão ou perda que exige registro/pesquisa.

A UX deve continuar seguindo a Lei da Simplicidade Guiada: uma ação principal clara, motivo e consequência.

---

## 8. Aprendizado de marketing até resultado comercial

O Micro-CRM deve preservar a linhagem já prevista:

`lead → anúncio → criativo → experimento/campanha → conteúdo original`

E ampliar o aprendizado com:

`lead → estágio → temperatura/score → ações de acompanhamento → oportunidade → WON/LOST → motivo`

Isso permite comparar, por exemplo:

- conteúdo A gera muitos leads, mas poucos qualificados;
- conteúdo B gera menos leads, mas mais oportunidades;
- campanha C gera CPL barato, mas baixa conversão comercial;
- criativo D gera leads mais caros, porém mais receita;
- determinado público responde, mas esfria na etapa de preço;
- leads com determinado sinal avançam mais rapidamente.

A hierarquia continua:

`resultado comercial > oportunidade/qualificação > lead > clique > engajamento`

quando esses desfechos estiverem realmente observáveis.

---

## 9. Modelo conceitual mínimo a preservar na Fase 12

A implementação final pode ajustar nomes/tabelas, mas deve preservar conceitualmente:

### Lead

- estágio;
- score atual quando aplicável;
- temperatura/prioridade derivada;
- responsável;
- motivo de perda;
- origem e linhagem;
- datas relevantes.

### Histórico do lead

Eventos append-oriented para:

- mudança de estágio;
- alteração relevante de score/temperatura;
- contato/tentativa;
- resposta;
- tarefa concluída;
- adiamento;
- reativação;
- WON/LOST;
- automação/IA relevante quando houver.

### Tarefa / próxima ação

A Fase 12 deve avaliar entidade ou contrato equivalente para representar pelo menos:

- lead;
- tipo de ação;
- prioridade;
- responsável;
- prazo;
- status;
- origem da recomendação (`USER|SYSTEM|AI` ou equivalente);
- motivo/evidências quando recomendada pelo sistema;
- resultado da ação.

### Score auditável

Quando houver score:

- versão da regra;
- fatores usados;
- valor calculado;
- momento do cálculo;
- origem dos sinais;
- possibilidade de recalcular sem perder o histórico necessário.

Não persistir apenas um número opaco sem explicabilidade mínima.

---

## 10. Gate mínimo da Fase 12

A Fase 12 — Lead Ads e Micro-CRM não deve ser encerrada apenas porque um formulário Meta cria uma linha em `leads`.

O gate substantivo deve provar, no mínimo:

1. lead real/sintético entra sem duplicação e com tenant correto;
2. linhagem de origem é preservada até onde os dados permitem;
3. estágio pode avançar com histórico auditável;
4. score/temperatura, quando usados, possuem motivo verificável;
5. tipo desconhecido ou dado ausente não produz prioridade inventada;
6. existe próxima ação/tarefa para os casos em que acompanhamento é necessário;
7. lead sem ação relevante pode ser identificado como pendente/atrasado;
8. follow-up pode ser concluído, adiado e retomado;
9. reativação não destrói histórico anterior;
10. WON/LOST preserva desfecho e motivo quando disponível;
11. duas organizações permanecem isoladas;
12. PII não vaza em logs, notificações técnicas ou IA sem necessidade.

O desenho detalhado pode ser dividido em sub-rodadas na época apropriada, mas **não criar etapas artificiais só para alinhar numeração documental**.

---

## 11. Não regressões de produto

As seguintes simplificações são proibidas sem decisão arquitetural/produto explícita do GPT + fundador:

1. reduzir o Micro-CRM a `NEW → WON/LOST`;
2. considerar “pipeline visual” suficiente sem follow-up/próxima ação;
3. usar estágio como sinônimo de temperatura;
4. usar score opaco gerado por LLM;
5. chamar qualquer lead de “quente” sem evidência rastreável;
6. esquecer lead sem ação futura quando a jornada exigir acompanhamento;
7. obrigar automação de WhatsApp para o CRM gerar valor;
8. transformar o produto em CRM genérico desconectado da origem de marketing;
9. perder a linhagem anúncio/conteúdo → lead → resultado;
10. medir sucesso apenas por volume de leads quando qualificação/oportunidade/venda estiverem observáveis.

---

## 12. Relação com as fases futuras

### Fase 12 — Lead Ads e Micro-CRM

Deve construir a fundação operacional do lead: ingestão, deduplicação, pipeline, score/temperatura, histórico, responsável, próxima ação, follow-up, reativação e linhagem.

### Fase 13 — Conversões

Aprofunda `WON/LOST`, valor e conversões, preservando a história comercial produzida pelo Micro-CRM.

### Fase 14 — Surveys

Captura razões estruturadas de vitória/perda e retroalimenta score, hipóteses e recomendações quando apropriado.

### Fase 15 — Strategic Insights

Cruza conteúdo, mídia, qualidade do lead, velocidade de avanço, motivos de perda e conversões.

### Fase 16 — Hoje, Notificações e UX

Transforma o CRM em operação simples e orientada a ação: quem precisa de atenção, por quê e qual ação vem agora.

---

## 13. Resultado esperado para o pequeno negócio

O usuário não deve precisar “operar um CRM”.

A experiência-alvo é algo como:

**“Você tem 3 pessoas que merecem atenção hoje. Duas ainda não receberam resposta. Uma pediu orçamento e está pronta para avançar. Faça estas ações agora.”**

O sistema organiza a complexidade, preserva as evidências e aprende com o que acontece depois.
