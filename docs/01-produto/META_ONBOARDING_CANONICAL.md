# META ONBOARDING CANONICAL — Quoron

Status: **CANÔNICO E VIGENTE COMO REQUISITO DE PRODUTO; EXECUÇÃO BLOQUEADA POR GATE EXTERNO**

Data: 2026-08-25
Origem: decisão explícita do fundador após a promoção da 004B e autorização da 004C.

## 1. Decisão central

A conexão do Quoron com o ecossistema Meta deve ser construída como uma **experiência guiada de onboarding**, e não como transferência da complexidade técnica da Meta para o cliente.

Princípio canônico:

> **A configuração técnica da Meta pertence ao Quoron; ao usuário pertencem identidade, consentimento, propriedade dos ativos e decisões financeiras.**

O usuário final não deve precisar compreender nem operar manualmente conceitos como Business Portfolio, System User, tokens, scopes, IDs de ativos, hierarquia de permissões ou detalhes de API apenas para conseguir usar as capacidades normais do Quoron.

Isso não significa eliminar requisitos que pertencem à própria Meta. Significa que o Quoron deve detectar, explicar e conduzir esses requisitos por um fluxo oficial e simples, mantendo a complexidade no sistema sempre que tecnicamente possível.

## 2. Resultado de experiência esperado

A experiência-alvo deve se aproximar de:

1. usuário escolhe **Conectar Meta** no Quoron;
2. abre-se o fluxo oficial de autenticação/autorização da Meta;
3. usuário entra na própria conta e concede as permissões necessárias;
4. Quoron verifica automaticamente quais ativos e pré-requisitos já existem;
5. quando houver pendência, o produto informa em linguagem simples o que falta e conduz ao próximo passo oficial;
6. quando os requisitos estiverem satisfeitos, o Quoron registra a conexão e mostra seu estado de forma compreensível.

O produto deve evitar instruções como “vá ao Business Manager e configure manualmente X” como caminho normal de onboarding.

Ação manual externa deve existir apenas quando a Meta realmente exigir intervenção humana que não possa ser incorporada ao fluxo oficial.

## 3. O que pode ser simplificado e o que não pode desaparecer

O Quoron deve simplificar ao máximo:

- descoberta de Página, Instagram profissional, conta de anúncios e demais ativos aplicáveis;
- seleção dos ativos corretos;
- diagnóstico de permissões ausentes;
- verificação de pré-requisitos;
- reconexão quando uma autorização expirar ou perder escopo;
- explicação de erros e pendências;
- passagem do usuário ao fluxo oficial adequado para criação/configuração de requisito ausente, quando a Meta permitir.

O Quoron não pode eliminar legitimamente:

- login do titular na Meta;
- consentimento/autorização do titular;
- existência ou criação dos ativos exigidos pela Meta;
- prova de que o usuário tem direito de operar esses ativos;
- definição de forma de pagamento quando houver mídia paga;
- aprovação humana explícita para qualquer gasto.

Portanto, a meta do produto não é “zero autorização”. A meta é **zero complexidade técnica desnecessária para o pequeno negócio**.

## 4. Propriedade dos ativos e do gasto

Arquitetura padrão:

- ativos Meta do negócio pertencem/controlados pelo próprio cliente;
- conta de anúncios do cliente permanece sob controle do cliente;
- forma de pagamento da mídia pertence ao cliente;
- Quoron recebe somente a autorização necessária para operar as capacidades contratadas;
- permissão técnica para operar anúncios não equivale a autorização para gastar.

Não adotar como arquitetura padrão um modelo em que o Quoron funcione como agência proprietária das contas/ativos publicitários dos clientes ou antecipe/pague mídia em nome deles.

Qualquer mudança futura para um modelo dessa natureza exigirá nova decisão arquitetural, financeira, jurídica e de risco.

## 5. Relação com a arquitetura Meta existente

A trilha 003B e a investigação BISU/System User permanecem evidência técnica válida do que já foi testado, mas **não definem automaticamente a experiência final de onboarding comercial**.

Antes de retomar implementação Meta, o GPT deve reavaliar, à luz da documentação oficial vigente da Meta naquele momento:

- qual fluxo oficial oferece o menor atrito para conectar empresas terceiras;
- se Facebook Login for Business, Meta Business Extension ou mecanismo sucessor é aplicável ao caso atual;
- onde BISU/System User continua necessário como mecanismo interno e onde não deve aparecer para o usuário;
- quais pré-requisitos podem ser detectados ou criados dentro do fluxo oficial;
- quais ações ainda exigem intervenção humana inevitável.

Nenhuma tecnologia específica citada acima é declarada definitiva por este documento. A escolha deve ser confirmada com documentação oficial vigente na rodada de retomada.

## 6. Critério de simplicidade guiada

A solução futura deve obedecer aos seguintes critérios:

- um ponto de entrada claro, preferencialmente **Conectar Meta**;
- nenhum requisito de o usuário copiar/colar token, ID técnico ou segredo;
- nenhum requisito de entender System User, Business Portfolio, scopes ou APIs para o fluxo normal;
- diagnóstico automático do máximo possível;
- mensagens em linguagem de negócio;
- pendências apresentadas uma por vez ou em sequência guiada;
- erros acionáveis: dizer o que falta, por que é necessário e qual é o próximo passo;
- retorno seguro ao Quoron após cada ação externa;
- reconexão e recuperação tratadas como estados normais do produto, não como falha catastrófica;
- nenhuma promessa de campanha, mensuração ou ativo disponível sem prova real de conexão.

## 7. Relação com campanhas automáticas

O objetivo desta camada é permitir que, futuramente, um usuário tecnicamente apto na Meta possa chegar à criação de campanhas pelo Quoron sem precisar configurar manualmente toda a infraestrutura externa.

Ainda assim, permanecem invariáveis:

`Permissão Meta ≠ Campanha ≠ Aprovação financeira ≠ Gasto`

Uma futura campanha automática pode automatizar planejamento e execução técnica dentro do escopo autorizado, mas não pode eliminar o gate humano de gasto definido pelo Quoron.

## 8. GATE EXTERNO — EXECUÇÃO BLOQUEADA

**Este documento é um requisito central planejado, não uma autorização de implementação.**

A implementação do onboarding Meta guiado fica explicitamente bloqueada até que o fundador informe que resolveu o problema atual do portfólio empresarial restrito no Facebook/Meta.

Condição mínima de retomada:

1. fundador informa que a restrição do portfólio empresarial foi resolvida ou que existe uma condição operacional nova e comprovadamente utilizável;
2. GPT reconcilia o novo estado com a Meta e com a `main`;
3. GPT verifica a documentação oficial vigente da Meta;
4. GPT decide a arquitetura de onboarding comercial adequada;
5. somente então uma nova rodada específica pode ser planejada e autorizada para Claude Code.

Até esse gate ser aberto, fica **NÃO AUTORIZADO**:

- criar nova rodada de implementação deste onboarding;
- alterar 003B para tentar contornar a restrição;
- criar terceiro Business Portfolio por tentativa;
- excluir ou mover portfolios/ativos por tentativa;
- usar portfolio de terceiro;
- alterar scopes, configuração do app ou Business Login Configuration para experimentar alternativas;
- promover 003B sem a prova externa exigida;
- tratar BISU/System User como arquitetura comercial definitiva apenas porque já existe código nessa direção.

## 9. Relação com o desenvolvimento corrente

Este gate é específico da trilha Meta.

Ele **não bloqueia a Rodada 004C** nem outras capacidades futuras que sejam comprovadamente independentes da Meta e explicitamente autorizadas pelo GPT.

A 004C permanece com seu mandato e escopo atuais, sem incorporar implementação deste documento.

## 10. Precedência e leitura obrigatória

Este documento passa a ser leitura obrigatória em qualquer rodada futura que toque:

- conexão Meta;
- onboarding Meta;
- autenticação/autorização Meta;
- descoberta/seleção de ativos;
- Instagram conectado;
- conta de anúncios;
- criação ou gestão de campanhas;
- reconexão/recuperação de integração Meta.

Quando houver conflito entre um fluxo histórico de implementação e o princípio de simplicidade guiada estabelecido aqui, a arquitetura futura deve ser devolvida ao GPT para decisão antes de executar.
