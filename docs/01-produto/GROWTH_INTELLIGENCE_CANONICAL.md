# GROWTH INTELLIGENCE CANONICAL — Quoron

Status: **CANÔNICO PARA PLANEJAMENTO DE PRODUTO FUTURO**
Data da consolidação: 2026-08-23

Este documento registra uma redefinição conceitual do MVP a partir da análise do produto já construído, das necessidades do público-alvo e das capacidades atuais do ecossistema Meta/Instagram.

Ele **não altera o mandato técnico da Rodada 001E já autorizada** e não exige retrabalho das Rodadas 000–001D. A partir da auditoria da 001E, as próximas rodadas e futuras harmonizações de `MVP_CANONICAL.md`, `IMPLEMENTATION_ROADMAP.md`, `DATA_MODEL.md` e demais canônicos devem respeitar este modelo.

---

## 1. Redefinição central do produto

O produto não deve ser modelado como um funil rígido:

`post do Instagram → escolher 3 melhores → impulsionar → lead → atendimento → venda`

Esse fluxo é apenas um caso possível.

O modelo canônico passa a ser:

`contexto do negócio → objetivo → jornada desejada → público/personas → conteúdo/criativo → distribuição orgânica, paga ou ambas → evento mensurável → resultado → aprendizado → próxima recomendação`

O sistema existe para aprender continuamente:

- o que o negócio oferece;
- para quem a proposta funciona;
- quais mensagens e criativos atraem atenção relevante;
- quais canais e jornadas produzem o resultado desejado;
- quais públicos demonstram interesse;
- quais públicos efetivamente geram resultado comercial ou operacional;
- onde existe queda entre interesse e resultado;
- quais hipóteses devem ser testadas em seguida.

Mídia paga é uma ferramenta desse ciclo, não a única fonte de valor do produto.

---

# 2. LEI DE PRODUTO — SIMPLICIDADE GUIADA

Esta é uma regra inegociável do Quoron.

**A complexidade pertence ao sistema, não ao usuário.**

O público inicial é formado por pequenos negócios sem estrutura sofisticada de marketing. O produto não pode exigir que o usuário compreenda Ads Manager, hierarquia campanha/ad set/anúncio, nomenclatura de APIs, modelos estatísticos, pixels, eventos técnicos, estratégias avançadas de targeting ou conceitos especializados para completar o fluxo principal.

A experiência deve ser estruturada como **trilha guiada**.

Em cada momento relevante, o sistema deve procurar apresentar:

1. **o que está acontecendo** em linguagem comum;
2. **o que o sistema recomenda fazer agora**;
3. **por que recomenda**;
4. **qual resultado se espera**;
5. **qual decisão simples o usuário precisa tomar**, quando houver;
6. opções avançadas somente quando realmente necessárias ou solicitadas.

### 2.1 Princípios obrigatórios de UX

- uma ação principal clara por etapa;
- progressive disclosure: complexidade avançada fica escondida até ser necessária;
- defaults seguros e recomendados;
- linguagem de negócio, não linguagem de plataforma publicitária;
- o sistema propõe configurações em vez de pedir que o usuário monte campanhas manualmente;
- o sistema não pergunta algo que possa inferir com segurança a partir dos dados disponíveis;
- quando precisar perguntar, deve explicar por que a resposta importa;
- formulários longos devem ser quebrados em etapas curtas ou preenchidos progressivamente;
- o usuário deve poder corrigir a interpretação do sistema;
- estados vazios devem orientar o próximo passo;
- erros devem dizer o que o usuário pode fazer, não apenas exibir código técnico;
- não obrigar o usuário a sair do Quoron para operar rotineiramente o Ads Manager;
- detalhes técnicos podem existir em uma camada avançada/auditável, mas não devem dominar o fluxo padrão.

### 2.2 Simplicidade não significa esconder risco

O sistema pode esconder complexidade técnica, mas não pode esconder consequência relevante.

Exemplos:

- orçamento e gasto continuam exigindo aprovação humana explícita;
- limitações de mensuração devem ser mostradas;
- o sistema deve diferenciar fato, interpretação e hipótese;
- quando não conseguir medir a conversão final, não pode afirmar que ela ocorreu;
- quando a recomendação depender de poucos dados, isso deve ser informado.

A regra é:

**esconder complexidade operacional, nunca esconder risco, custo, incerteza ou consequência.**

---

## 3. Contexto do negócio como base da inteligência

A qualidade das recomendações depende da compreensão do negócio.

O sistema deve construir progressivamente um contexto estruturado que possa incluir, conforme aplicável:

- nome e descrição do negócio;
- segmento e subsegmentos;
- produtos e serviços;
- proposta de valor;
- ofertas ativas;
- preços ou faixas de preço;
- ticket médio;
- endereço, cidade, região e raio de atendimento quando relevantes;
- funcionamento físico, digital ou híbrido;
- horários de atendimento;
- capacidade operacional e restrições relevantes;
- público que a empresa acredita atender;
- diferenciais;
- objeções conhecidas;
- concorrentes quando informados ou legitimamente identificáveis;
- sazonalidade;
- metas de aquisição;
- metas comerciais ou operacionais;
- jornada desejada até o resultado;
- eventos que significam sucesso;
- dados históricos de conteúdo, mídia e resultados.

### 3.1 Perfil progressivo

O onboarding não deve exigir que o usuário preencha todo esse contexto de uma vez.

Fluxo preferido:

`essencial inicial → uso do produto → dados observados → perguntas contextuais adicionais → confirmação/correção pelo usuário`

O sistema pode sugerir informações inferidas, mas não deve transformar inferência incerta em fato sem confirmação quando isso puder afetar recomendação relevante.

O `business_profile` da fundação é a primeira camada desse contexto, não necessariamente sua forma final.

Futuramente, o domínio poderá separar conceitos como:

- ofertas/serviços;
- localizações;
- jornadas de cliente;
- objetivos;
- segmentos/personas;
- restrições/capacidade.

Não criar uma tabela gigantesca apenas para centralizar tudo em um único registro.

---

## 4. Jornada do cliente não é fixa

O sistema não deve pressupor que todo fluxo termina em atendimento humano ou venda tradicional.

Exemplos válidos:

- Instagram → WhatsApp → orçamento → venda;
- Instagram → site → cadastro;
- Instagram → site → agendamento;
- Instagram → formulário Meta → atendimento;
- Instagram → aplicativo → criação de conta;
- Instagram → loja física;
- Instagram → seguir perfil / consumir conteúdo;
- Instagram → evento ou comunidade;
- Instagram → outra ação mensurável relevante ao negócio.

O produto deve perguntar em linguagem simples:

**“Depois que uma pessoa vê seu conteúdo ou anúncio, o que você quer que aconteça?”**

E depois:

**“Qual ação significa sucesso para este objetivo?”**

Essa resposta orienta:

- recomendação de conteúdo;
- modalidade orgânica/paga;
- objetivo publicitário compatível;
- evento de mensuração;
- critério de resultado;
- leitura do funil/jornada.

### 4.1 Resultado desejado x resultado mensurável

O sistema deve manter distinção explícita entre:

- **resultado desejado**: o que o negócio quer que aconteça;
- **resultado observável**: até onde o Quoron consegue medir com os dados conectados.

Exemplo:

Se a jornada desejada é `Instagram → site → criar conta`, mas o cliente ainda não integrou o evento de criação de conta, o sistema pode medir clique/visita disponível, mas não deve apresentar cadastro como conversão confirmada.

Quando necessário, futuras integrações podem utilizar mecanismos oficiais como Pixel, Conversions API, App Events ou equivalentes vigentes para receber eventos do sistema/site do cliente.

---

## 5. Conteúdo, criativo publicitário e anúncio são conceitos distintos

O produto não deve tratar “post” e “anúncio” como sinônimos.

### 5.1 Conteúdo

Material pertencente à estratégia de comunicação do negócio, que pode ser publicado organicamente no Instagram.

### 5.2 Criativo publicitário

Material produzido ou escolhido para distribuição paga.

Pode:

- nascer de um conteúdo orgânico já publicado;
- ser produzido dentro do Quoron e nunca entrar no feed/perfil orgânico;
- ser uma adaptação de conteúdo existente;
- ter variantes específicas por placement/público quando permitido.

### 5.3 Anúncio

Instância de distribuição paga de um criativo dentro da estrutura publicitária da Meta.

Consequentemente, os fluxos válidos incluem:

`conteúdo → somente orgânico`

`conteúdo orgânico → também usado como anúncio`

`criativo → somente anúncio`

`conteúdo → adaptação → criativo → anúncio`

O domínio futuro deve preservar linhagem entre essas entidades sem exigir que todo anúncio tenha um `content_item` orgânico correspondente.

---

## 6. “Oportunidade” e “Experimento” não são a mesma coisa

O sistema não deve impor um número fixo de candidatos.

O resultado de uma análise pode ser:

- **0 candidatos**: dados insuficientes ou nenhum conteúdo merece investimento agora;
- **1 candidato**: existe uma oportunidade clara de amplificação;
- **2 ou mais**: podem existir alternativas comparáveis e hipótese para experimento;
- qualquer outro número justificado pelos dados.

A regra “escolher três posts” deixa de existir como contrato.

### 6.1 Oportunidade

Uma recomendação de que determinado conteúdo/criativo merece uma ação, por exemplo:

- continuar organicamente;
- republicar/adaptar;
- transformar em criativo;
- investir mídia;
- produzir variação;
- testar nova oferta/gancho/público.

### 6.2 Experimento

Existe quando há hipótese, variável sob teste, alternativas comparáveis e critério de avaliação.

Não criar artificialmente um A/B test quando existe apenas uma oportunidade de promoção ou quando os dados não justificam comparação.

---

## 7. O modo orgânico deve entregar valor por si só

Investimento em mídia paga é opcional do ponto de vista do usuário.

O produto deve conseguir operar um ciclo orgânico:

`conteúdo → métricas → padrões → interpretação → recomendação → novo conteúdo/ajuste → nova medição`

Exemplos de valor sem gasto:

- quais temas atraem mais alcance relevante;
- quais formatos geram mais interação;
- quais conteúdos atraem novos públicos;
- quais ganchos ou ofertas parecem funcionar;
- horários e padrões quando os dados permitirem;
- diferenças entre público alcançado e público engajado;
- recomendações de próximo conteúdo;
- hipóteses de melhoria de mensagem, oferta, formato ou posicionamento;
- identificação de conteúdo que **poderia** ser amplificado caso o usuário queira investir.

### 7.1 Limite estratégico

O Quoron não deve virar um gerenciador genérico de redes sociais cujo valor principal é agendar post.

Publicação é meio. O núcleo continua sendo:

**compreender resposta do mercado e recomendar o próximo passo com base em evidência.**

---

## 8. Personas devem ser vivas e baseadas em evidência

O sistema pode criar uma ou mais personas, mas deve separar três conceitos.

### 8.1 Persona hipotética

Construída com informações fornecidas pelo negócio e hipóteses iniciais.

### 8.2 Público observado

Pessoas que realmente seguem, alcançam ou interagem com conteúdo, dentro dos dados agregados que a plataforma disponibilizar.

### 8.3 Público de resultado

Pessoas/segmentos associados aos eventos finais relevantes: cadastro, lead qualificado, agendamento, compra, visita, assinatura ou outro resultado configurado.

Esses três públicos podem divergir.

### 8.4 Persona como hipótese versionada

A persona não deve ser um texto decorativo inventado por LLM.

Quando possível, deve carregar:

- origem dos dados;
- nível de evidência/confiança;
- data da última atualização;
- principais atributos observados;
- comportamentos/resultados associados;
- limitações;
- possibilidade de correção pelo usuário.

A IA pode resumir e nomear personas, mas não deve fabricar atributos demográficos ou comportamentais ausentes.

---

## 9. Inteligência de público e resultado

Uma função central do sistema deve ser comparar:

**quem a empresa acredita que compra**

versus

**quem demonstra interesse**

versus

**quem efetivamente gera resultado**.

Exemplos de análise futura:

- um segmento representa grande parte do engajamento, mas pequena parte das conversões;
- um público menor no topo do funil gera proporcionalmente mais vendas;
- determinado criativo atrai volume, mas baixa qualidade;
- outro criativo atrai menos pessoas, porém maior taxa de cadastro/compra;
- uma faixa demográfica demonstra interesse, mas abandona em uma etapa específica;
- pesquisas de perda sugerem preço, confiança, momento ou proposta inadequada como possível explicação.

O sistema pode então produzir hipóteses como:

- ajustar oferta;
- testar produto de entrada;
- alterar mensagem;
- mudar formato do criativo;
- investigar novo público;
- melhorar etapa da jornada;
- separar campanhas por objetivo;
- deixar de investir em conteúdo que gera atenção sem resultado.

Essas conclusões devem respeitar a hierarquia:

`observação → interpretação → hipótese → teste recomendado`

Hipótese não deve ser apresentada como causalidade comprovada.

---

## 10. Persona não deve virar targeting rígido automaticamente

A Meta utiliza cada vez mais automação e expansão de audiência. Informações como idade, gênero, interesses, listas e outros sinais podem funcionar como sugestões para o sistema de entrega, enquanto alguns controles permanecem rígidos conforme o produto/configuração vigente.

Portanto, o Quoron não deve reduzir o processo a:

`persona → filtros rígidos → anúncio`

O modelo preferido é:

`persona + dados históricos + objetivo → hipótese de público → configuração Meta permitida → resultado → atualização da hipótese`

O produto deve acompanhar o comportamento real da plataforma e revalidar capacidades/limitações antes da implementação.

---

## 11. O usuário não deve operar o Ads Manager como requisito rotineiro

O produto deve absorver a hierarquia técnica da Meta sempre que as APIs oficiais permitirem.

O usuário pode precisar, em momentos de configuração, possuir/autorizar:

- conta Meta apropriada;
- conta profissional Instagram;
- ativos exigidos;
- conta de anúncios;
- método de pagamento;
- permissões/scopes necessários.

Depois da conexão, a experiência padrão deve acontecer dentro do Quoron.

### 11.1 Modelo de decisão simples para conteúdo/criativo

Quando aplicável, o usuário pode receber opções como:

- **Publicar no Instagram**;
- **Usar somente como anúncio**;
- **Publicar e também anunciar**.

A UI não precisa expor a estrutura campanha → conjunto de anúncios → anúncio, salvo quando informação avançada for necessária.

Por baixo, o sistema continua criando e administrando os objetos exigidos pela Marketing API, com auditoria e aprovação financeira.

### 11.2 Não confundir simplicidade com automação financeira irrestrita

Mesmo que o sistema proponha objetivo, público, placement, criativo, orçamento sugerido e duração, nenhuma ação que gere gasto pode contornar o fluxo:

`Recommendation → Approval Request → Human Approval → Domain Command → Idempotent Operation → Meta`

---

## 12. Publicar e anunciar devem ser capacidades independentes

A capacidade de publicação orgânica e a capacidade de criar anúncio devem ser desacopladas.

O sistema deve poder:

- publicar organicamente sem anunciar;
- anunciar conteúdo já publicado;
- anunciar criativo que não foi publicado organicamente;
- adaptar conteúdo para anúncio sem alterar o post original;
- quando permitido pela plataforma, produzir variações adequadas a placements.

Isso evita forçar campanhas de aquisição a poluir o feed/perfil orgânico do cliente.

---

## 13. Medição e qualidade de evidência

Toda inteligência deve declarar o nível de observabilidade disponível.

### 13.1 Fontes possíveis

- métricas orgânicas Instagram;
- métricas pagas Meta;
- eventos de site/app do cliente quando conectados;
- Lead Ads;
- micro-CRM;
- conversões registradas;
- pesquisas pós-desfecho;
- dados estruturados fornecidos pelo usuário.

### 13.2 Regras

- não inferir dado demográfico individual a partir de agregados;
- respeitar thresholds de privacidade da plataforma;
- não inventar atributo ausente;
- não confundir alcance/engajamento com conversão;
- não confundir evento enviado à Meta com atribuição confirmada;
- preservar origem e janela temporal das métricas;
- preferir resultado comercial/operacional ao proxy de vaidade quando disponível;
- mostrar limitações quando a amostra for pequena ou incompleta.

---

## 14. Trilhas de produto

O sistema deve organizar sua experiência por decisões e próximos passos, não por complexidade técnica.

Exemplo conceitual de trilha inicial:

1. **Conheça seu negócio** — confirmar contexto essencial;
2. **Defina o que quer conseguir agora** — objetivo;
3. **Mostre como o cliente chega lá** — jornada;
4. **Conecte os dados necessários** — Instagram/Meta/site/app quando aplicável;
5. **Veja o que está funcionando** — evidências;
6. **Receba a próxima recomendação**;
7. **Escolha agir organicamente, testar ou investir**;
8. **Aprove gasto quando existir gasto**;
9. **Veja o resultado**;
10. **Aprenda quem respondeu e por quê**;
11. **Receba a próxima ação sugerida**.

A trilha pode se ramificar conforme o tipo de negócio e objetivo, mas o usuário não deve ter que desenhar a arquitetura sozinho.

---

## 15. Regras de não regressão conceitual

Futuras implementações não podem silenciosamente reintroduzir estas premissas erradas:

1. “todo anúncio é um post orgânico”;
2. “todo post orgânico deve poder virar anúncio, mas todo anúncio precisa existir no feed”;
3. “sempre existem exatamente três candidatos”;
4. “toda recomendação paga é um A/B test”;
5. “todo funil termina em atendimento humano”;
6. “todo objetivo termina em venda”;
7. “o usuário precisa investir em mídia para receber valor”;
8. “persona é texto inventado pela IA”;
9. “persona deve virar targeting rígido automaticamente”;
10. “engajamento alto significa resultado comercial alto”;
11. “clique significa conversão quando a conversão não é observável”;
12. “o usuário deve aprender Ads Manager para operar o produto”;
13. “quanto mais opções expostas, mais poderoso o produto”.

A regra correta é o oposto da última: **o sistema pode ser internamente sofisticado e externamente simples**.

---

## 16. Compatibilidade com o que já foi construído

Esta redefinição não invalida:

- Bootstrap técnico;
- Auth;
- organizations;
- organization_members;
- RLS/grants/isolamento;
- business_profile mínimo da 001E.

Essas camadas são fundação transversal.

A maior parte do impacto ocorre em etapas ainda não implementadas:

- conexão Meta;
- conteúdo/importação/publicação;
- modelo de criativos;
- oportunidades;
- experimentos;
- Ads;
- captura de eventos/resultados;
- personas/audience intelligence;
- insights estratégicos;
- UX/orquestração da trilha.

Portanto, a decisão deve ser incorporada **antes** dessas fases, não por retrabalho sobre a fundação já auditada.

---

## 17. Impacto documental futuro

Após a auditoria da 001E, harmonizar progressivamente, sem criar housekeeping isolado:

- `docs/01-produto/MVP_CANONICAL.md`;
- `docs/00-governanca/IMPLEMENTATION_ROADMAP.md`;
- `docs/03-canonical/DATA_MODEL.md`;
- `docs/03-canonical/TECHNICAL_SPEC.md` quando necessário;
- `docs/03-canonical/API_CONTRACTS.md` nas fases Meta/medição;
- `docs/03-canonical/AI_ARCHITECTURE.md` para personas/insights;
- `docs/03-canonical/SECURITY_MODEL.md` apenas se novos dados/PII/permissões exigirem alteração.

Não alterar retrospectivamente rodadas já promovidas quando os contratos antigos foram corretos para sua fundação.

---

## 18. Evidência externa vigente em 2026-08-23

As decisões acima são coerentes com capacidades oficiais observadas no ecossistema Meta na data desta consolidação:

- Meta Ads permite trabalhar com criativo novo no nível do anúncio e também promover publicação existente, inclusive em Reels;
- objetivos publicitários são escolhidos conforme o resultado de negócio desejado, e não apenas “venda”;
- Instagram Insights para contas profissionais fornece métricas de conteúdo e, quando thresholds são satisfeitos, demografia agregada como países/cidades/faixas etárias/gênero;
- Advantage+ Audience pode usar idade, gênero, interesses e outros sinais como sugestões e expandir além deles, mantendo alguns controles rígidos conforme configuração;
- Advantage+ e placements automatizados mostram que a própria Meta está movendo complexidade operacional para automação;
- publicação de conteúdo Instagram e criação/gestão de mídia paga são capacidades distintas e devem permanecer desacopladas no produto.

Referências oficiais consultadas:

- Meta for Business — Ad objectives: https://www.facebook.com/business/ads/ad-objectives
- Meta for Business — Advantage+ audience: https://www.facebook.com/business/ads/meta-advantage-plus/audience
- Meta for Business — Advantage+ placements: https://www.facebook.com/business/ads/meta-advantage-plus/placements
- Meta for Business — Reels ads / existing post versus new creative: https://www.facebook.com/business/ads/facebook-instagram-reels-ads
- Instagram Help Center — About Instagram Insights: https://www.facebook.com/help/instagram/788388387972460

Como Meta/Instagram mudam frequentemente, detalhes de API, objetivos, campos, permissões, placements e thresholds devem ser revalidados no início da rodada de implementação correspondente.

---

## 19. Síntese executiva

O Quoron não deve ser “um sistema que escolhe posts para impulsionar”.

Ele deve ser uma plataforma que aprende continuamente:

**o que o negócio vende/oferece, quem responde, quem gera resultado, qual mensagem funciona, qual jornada funciona e qual deve ser o próximo teste ou ação.**

Esse aprendizado pode ocorrer organicamente, com mídia paga ou combinando os dois.

E o usuário deve acessar essa sofisticação por uma experiência simples, guiada e orientada ao próximo passo — sem precisar se transformar em especialista em tráfego pago para usar o produto.
