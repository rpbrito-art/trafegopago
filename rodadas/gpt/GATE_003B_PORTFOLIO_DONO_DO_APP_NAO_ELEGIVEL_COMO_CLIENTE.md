# GATE 003B — PORTFÓLIO DONO DO APP NÃO ELEGÍVEL COMO CLIENTE

Status: **BLOQUEIO REAL OBSERVADO — AGUARDANDO DECISÃO GPT**
Data: 2026-08-24
Rodada pai: **003B — Meta Asset Discovery & Selection**

## 1. Fato observado no E2E

Após a Correção 003B-03 ser executada, auditada e aprovada, o fundador iniciou **Atualizar autorização** usando a configuração `Quoron Instagram Dev Login` (`config_id=38307908848822330`).

No seletor de ativos do Facebook Login for Business, o campo **Portfólio empresarial** não permitiu selecionar o portfólio existente **Quoron**. A opção apareceu desabilitada com a mensagem literal:

`This Meta Business Account owns the app`

O fluxo deixou selecionado **Criar um portfólio empresarial** e, ao avançar, passou a exigir dados para uma nova empresa/novos ativos, incluindo nome, e-mail, país e site.

O fundador informou corretamente que o fluxo não estava pedindo para escolher o portfólio existente, mas para criar um novo.

## 2. Interpretação segura

A captura prova que, neste fluxo/configuração corrente, a Meta está tratando o portfólio que **possui o app** como inelegível para ocupar também o papel de **portfólio cliente a ser integrado**.

Portanto, **não é válido contornar o bloqueio criando `Quoron 1`, inventando site ou duplicando o portfólio apenas para concluir o OAuth**.

Este é um gate de arquitetura/configuração de teste, não um erro de preenchimento do fundador.

## 3. Ação imediata

O fundador deve **Cancelar** o diálogo atual.

Preservar:

- app `Trafego Pago Business Dev`;
- portfólio Quoron atual;
- Página Quoron;
- Instagram profissional `@goquoron`;
- conexão Meta atual no produto, ainda `ACTIVE` com token antigo;
- configuração histórica da 003A.

## 4. Proibições até decisão

- não criar `Quoron 1`;
- não inventar domínio/site;
- não criar outro portfólio por tentativa;
- não mover Página ou Instagram entre portfólios por tentativa;
- não transferir a propriedade do app sem decisão arquitetural;
- não trocar BISU por user token sem decisão arquitetural;
- não promover a 003B;
- não iniciar F4.

## 5. Questão arquitetural aberta

O GPT deve decidir como separar corretamente, para desenvolvimento e produção, os papéis de:

1. **empresa provedora/dona do app SaaS**;
2. **empresa cliente que conecta seus próprios ativos Meta**.

A decisão deve preservar o objetivo comercial do produto: onboarding de negócios terceiros, acesso orgânico + mídia paga e automação server-side segura.

Antes de autorizar nova ação manual, pesquisar/confirmar o comportamento atual do Facebook Login for Business e comparar as alternativas de fixture de teste, portfólio provedor/cliente e tipo de token.
