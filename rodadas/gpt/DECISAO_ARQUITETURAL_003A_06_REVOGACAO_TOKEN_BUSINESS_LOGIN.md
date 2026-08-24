# DECISÃO ARQUITETURAL 003A-06 — REVOGAÇÃO DO TOKEN DO FACEBOOK LOGIN FOR BUSINESS

Status: **PESQUISA/DECISÃO GPT EM ANDAMENTO — E2E DE DESCONEXÃO BLOQUEADO**
Data: 2026-08-24

## 1. Motivo

O E2E real de desconexão da 003A foi executado uma vez e falhou fechado. A Investigação 003A-05 comprovou que o token continua válido na Meta e eliminou como causa a leitura do Vault, a inspeção inicial e o reconhecimento do tipo `SYSTEM_USER`.

Restou materialmente incerto o contrato de revogação externa usado pelo software.

A implementação atual usa `oauth/revoke` quando `debug_token.type === SYSTEM_USER`. Uma nova chamada destrutiva não pode ser usada como mecanismo de descoberta arquitetural.

## 2. Distinção obrigatória de tipos de credencial

Não assumir que todo token que `debug_token` chama de `SYSTEM_USER` possui o mesmo ciclo de vida.

A documentação vigente do ecossistema Meta distingue, entre outros conceitos:

- System User Access Token clássico, associado a system user criado/gerido no Business Manager para server-to-server;
- token emitido a partir de Facebook Login for Business / onboarding de negócio, frequentemente descrito no ecossistema como System-user Access Token ou Business Integration System User (BISU) token.

A conexão real da 003A foi obtida por **Facebook Login for Business**, mediante authorization code, com configuração que escolheu token de usuário do sistema. Portanto o mecanismo de revogação deve ser comprovado para **essa origem concreta da credencial**, e não inferido apenas do valor `SYSTEM_USER` de `debug_token`.

## 3. Evidência disponível até agora

### Fatos do runtime

- token atual válido (`is_valid=true`);
- `type=SYSTEM_USER`;
- token emitido pelo mesmo app atualmente configurado;
- expiração em aproximadamente 60 dias;
- primeira chamada de desconexão não invalidou o token;
- não existe evidência da resposta real do primeiro `oauth/revoke` porque a instrumentação de etapa ainda não existia.

### Pesquisa GPT

A documentação recente de autenticação da Marketing API descreve o **System User Access Token clássico** como credencial de system user do Business Manager para interação server-to-server e remete ao fluxo próprio de geração de tokens de system user.

Documentação Meta espelhada para system users também registra mecanismo de invalidação ligado aos tokens do system user. Isso, porém, não prova automaticamente que a mesma operação seja o contrato correto para a credencial emitida pelo Facebook Login for Business.

Por outro lado, a pesquisa não encontrou ainda documentação oficial vigente suficiente que estabeleça de forma inequívoca o contrato `oauth/revoke` usado atualmente para esse token específico de Facebook Login for Business.

Conclusão: **há ambiguidade arquitetural material**.

## 4. Pergunta arquitetural que precisa ser resolvida

Qual é o mecanismo oficial, suportado e seguro para o próprio Tráfego Pago revogar uma autorização/token emitido pelo Facebook Login for Business com configuração de System-user Access Token, preservando as seguintes invariantes?

1. o software consegue desconectar sem depender de o usuário entrar manualmente no painel Meta;
2. a revogação é direcionada à autorização/credencial correta, evitando revogar tokens não relacionados;
3. existe resposta ou pós-condição observável que permita comprovar inatividade antes de apagar nossa única referência local;
4. o fluxo funciona para o tipo real de credencial entregue ao nosso produto;
5. não inferimos semântica apenas pelo rótulo `SYSTEM_USER`.

## 5. Evidência necessária antes de novo E2E

O GPT deve confirmar por fonte oficial vigente ou prova equivalente suficientemente forte:

- como a Meta classifica o token emitido pelo nosso Facebook Login for Business;
- endpoint/ação oficial de revogação aplicável a essa classe;
- credencial usada para autenticar a revogação;
- granularidade da revogação (um token, autorização da integração, ou todos os tokens do system user);
- semântica de sucesso/erro;
- método seguro de verificar a pós-condição.

Se a única revogação oficialmente suportada for uma remoção da integração/Business Integration por outro mecanismo, o desenho da 003A deve ser ajustado antes do E2E.

## 6. Proibições enquanto a decisão está aberta

Não está autorizado:

- clicar `Desconectar` novamente;
- chamar `oauth/revoke` novamente;
- testar `DELETE /{system-user-id}/access_tokens` ou qualquer outro endpoint mutável;
- revogar pelo painel Meta como atalho;
- limpar segredo/referência local;
- refazer OAuth;
- selecionar ativos;
- iniciar 003B;
- promover 003A.

Claude Code não deve pesquisar e escolher a arquitetura de revogação. Pode ser convocado apenas para provar fatos do runtime/código que o GPT peça explicitamente.

## 7. Estado

`DECISÃO ARQUITETURAL NECESSÁRIA — GPT EM PESQUISA — E2E BLOQUEADO`
