# FRONTEIRA ARQUITETURA ↔ EXECUÇÃO — QUORON

Status: **CANÔNICO ATIVO**
Atualizado: 2026-08-24.

## Objetivo

Separar de forma explícita a responsabilidade de pesquisar/decidir **como o sistema deve ser construído** da responsabilidade de **executar tecnicamente o que foi decidido**.

Princípio central:

**Claude investiga para provar fatos. GPT pesquisa para tomar decisões.**

## GPT — arquitetura, pesquisa e decisão

Cabe ao GPT:

- pesquisar documentação oficial e comportamento atual de providers, frameworks, APIs e serviços externos quando isso puder afetar arquitetura ou contrato;
- escolher arquitetura, mecanismo de integração, fluxo OAuth, modelo de token, estratégia de autorização, política de revogação/offboarding, permissões, contratos e invariantes;
- interpretar documentação externa ambígua ou conflitante;
- decidir entre alternativas técnicas que tenham impacto de produto, segurança, operação, custo, compatibilidade ou evolução futura;
- transformar essas decisões em mandato suficientemente específico para execução;
- atualizar canônicos antes da execução quando a descoberta exigir mudança de contrato;
- auditar se a implementação corresponde ao mecanismo autorizado.

Se uma rodada exigir que o executor pesquise substancialmente **qual arquitetura escolher** ou **como uma integração deve funcionar conceitualmente**, o mandato está incompleto e a decisão deve retornar ao GPT.

## Claude Code — execução e investigação factual

Cabe ao Claude Code:

- ler e compreender o código necessário para executar o mandato;
- localizar funções, tabelas, migrations, testes, tipos e dependências afetadas;
- implementar o delta autorizado;
- reproduzir defeitos;
- medir raio de impacto;
- executar testes e provas;
- inspecionar comportamento real de runtime, banco, CI e provider;
- coletar evidência factual que ajude a confirmar ou refutar uma hipótese definida pelo mandato;
- reportar divergências entre o comportamento real e o contrato autorizado.

Claude pode consultar documentação externa **apenas como apoio factual à execução** quando a decisão arquitetural já está definida e a consulta serve para confirmar detalhe operacional específico.

Exemplos válidos:

- confirmar nome/formato exato de um parâmetro já escolhido pelo mandato;
- verificar resposta real de uma API para provar um comportamento;
- consultar mensagem/código de erro para diagnosticar implementação;
- confirmar versão/sintaxe de SDK já autorizado.

## Quando Claude deve parar

Claude deve parar e devolver ao GPT quando encontrar qualquer uma destas situações:

1. duas ou mais arquiteturas plausíveis e o mandato não escolhe uma;
2. necessidade de trocar provider, tipo de token, mecanismo OAuth, estratégia de revogação, modelo de autorização ou fronteira de segurança;
3. documentação oficial ambígua, contraditória, desatualizada ou incompatível com o mandato;
4. necessidade de ampliar/reduzir permissões ou escopos de forma material;
5. descoberta que altere contrato de produto, segurança, dados, API ou operação;
6. alternativa que reduza segurança para facilitar a implementação;
7. necessidade de decidir entre solução provisória e arquitetura definitiva;
8. qualquer escolha que possa gerar dívida estrutural relevante não prevista.

Formato de parada:

`DECISÃO ARQUITETURAL NECESSÁRIA — AGUARDANDO GPT`

Claude deve entregar somente:

- fato observado;
- evidência técnica;
- por que o mandato atual não resolve;
- alternativas identificadas, sem escolher entre elas;
- impacto conhecido de cada alternativa quando factual.

Claude **não deve** escolher a alternativa por conta própria nem ampliar o escopo para "fazer funcionar".

## Mandatos GPT

Por padrão, um mandato que envolve integração externa ou mecanismo tecnicamente mutável deve chegar ao Claude já contendo, quando aplicável:

- arquitetura escolhida;
- provider/API e versão relevante;
- fluxo de autorização;
- tipo de token/credencial;
- semântica de conexão e desconexão;
- permissões/escopos mínimos;
- invariantes de segurança;
- comportamento esperado em falha;
- critérios de prova.

O Claude não deve ser usado como substituto para pesquisa arquitetural que poderia ter sido feita antes da autorização.

## Relação com configuração externa manual

Esta regra é complementar a `EXTERNAL_CONFIGURATION_GATE.md`:

- **decisão sobre o que/configurar e por quê** = GPT;
- **condução manual do fundador no painel externo** = GPT;
- **implementação técnica e prova do que foi autorizado** = Claude;
- **descoberta factual durante execução** = Claude;
- **nova decisão arquitetural causada pela descoberta** = volta ao GPT.

## Fluxo canônico

`GPT pesquisa → GPT decide arquitetura → GPT publica mandato → Claude executa → Claude prova fatos → divergência material? → GPT decide → Claude retoma → GPT audita`

O objetivo é evitar que o executor se torne arquiteto improvisado e evitar que o fundador tenha de arbitrar decisões técnicas entre agentes.