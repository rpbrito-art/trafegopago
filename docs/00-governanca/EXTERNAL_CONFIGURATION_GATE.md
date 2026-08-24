# GATE DE CONFIGURAÇÃO EXTERNA — TRÁFEGO PAGO

Status: **CANÔNICO ATIVO**
Atualizado: 2026-08-24.

## Objetivo

Definir quem conduz o fundador quando uma rodada exige configuração manual em sistema externo.

A regra existe porque o fundador não deve precisar interpretar documentação técnica, traduzir instruções entre GPT e Claude Code nem ser guiado por tentativa e erro em painéis externos.

## Regra principal

Quando uma etapa exigir que o fundador opere manualmente um sistema externo — por exemplo Meta, Supabase Dashboard, Vercel, Google, DNS, painel de provedor, console de API, permissões, OAuth, credenciais, contas empresariais ou configuração equivalente — **a condução humana pertence ao GPT**.

Claude Code deve:

1. concluir antes todo o trabalho técnico que puder executar autonomamente;
2. parar no ponto exato em que a interface externa exigir ação humana;
3. declarar `GATE DE CONFIGURAÇÃO EXTERNA — AGUARDANDO GPT`;
4. entregar ao GPT, de forma compacta:
   - objetivo técnico da configuração;
   - sistema/tela que precisa ser operado;
   - valores não secretos que precisam ser configurados;
   - invariantes e riscos que não podem ser violados;
   - segredos que devem permanecer fora do chat;
   - resultado técnico esperado para retomar a execução;
5. não instruir o fundador clique a clique no painel externo;
6. aguardar o resultado do gate antes de continuar.

GPT deve:

1. validar a necessidade e o desenho da configuração;
2. pesquisar documentação atual quando a interface ou comportamento puder ter mudado;
3. conduzir o fundador em linguagem simples, **uma ação principal por vez**;
4. informar onde a ação deve ser executada, o que ela faz e por que é necessária;
5. dizer explicitamente o que não deve ser feito quando houver risco de erro, permissão excessiva, perda de dados ou exposição de segredo;
6. nunca pedir que segredo seja colado no chat;
7. ao concluir, devolver ao Claude somente o resultado técnico necessário para retomar a execução.

## Limites

Esta regra se aplica a **configuração manual externa**. Ela não transfere ao GPT tarefas que Claude Code consegue executar diretamente e com segurança por código, terminal, API ou ferramenta conectada dentro do mandato autorizado.

Exemplos que permanecem com Claude Code quando autorizados:

- editar código e arquivos locais;
- criar migrations;
- executar testes;
- consultar banco;
- aplicar ação remota diretamente por ferramenta autorizada quando não exige escolha manual do fundador;
- verificar logs, CI e estado técnico.

Se a ação externa puder causar gasto, publicar conteúdo, alterar permissão sensível, revogar autorização, apagar dados/ativos ou produzir efeito irreversível, o GPT deve tratar o gate como decisão crítica mesmo quando a interface parecer simples.

## Segredos

Segredos, tokens, chaves privadas e credenciais nunca devem passar pelo chat GPT ↔ fundador ↔ Claude.

Quando o fundador precisar inserir um segredo manualmente:

- GPT orienta o local exato onde inserir;
- o valor é copiado diretamente do provedor para o arquivo/campo de destino;
- o fundador confirma apenas que concluiu;
- Claude valida por comportamento/configuração, sem pedir o segredo em texto.

## Fluxo canônico

`Claude executa autonomamente → identifica configuração externa manual → entrega requisitos ao GPT → GPT conduz fundador → fundador conclui → GPT devolve resultado técnico → Claude retoma → GPT audita`

O fundador **não é barramento de contexto entre agentes** e não deve transformar explicações do Claude em ações por conta própria.
