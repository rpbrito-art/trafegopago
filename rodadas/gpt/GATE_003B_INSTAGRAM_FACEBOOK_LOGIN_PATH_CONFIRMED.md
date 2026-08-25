# GATE 003B — CAMINHO CORRETO DO INSTAGRAM CONFIRMADO

Status: **DIAGNÓSTICO CONFIRMADO — NÃO ALTERAR ARQUITETURA**
Data: 2026-08-24

## Fato observado

Após adicionar o caso de uso **Gerenciar mensagens e conteúdo no Instagram**, o painel Meta abriu a seção **API do Instagram** no caminho de configuração por **Instagram Login**.

A própria tela exibiu permissões `instagram_business_*` (`instagram_business_basic`, `instagram_business_manage_comments`, `instagram_business_manage_messages`) e informou explicitamente que, para hashtags e Insights, deve-se trocar para **API setup with Facebook Login**.

Esse caminho `instagram_business_*` NÃO corresponde à arquitetura promovida/implementada na Rodada 003B, que usa:

- Facebook Login for Business;
- `graph.facebook.com`;
- permissões `instagram_basic`, `instagram_manage_insights`, `pages_read_engagement` e capacidades Meta/Ads associadas conforme o papel/Business Manager.

## Decisão

Não clicar em `Add all required permissions`, não adicionar conta por esse caminho, não configurar webhook e não configurar Business Login for Instagram.

A próxima ação manual é selecionar no menu lateral da configuração do caso de uso a opção **API setup with Facebook Login** (na UI em português aparece como uma segunda entrada `Configuração da API com login ...`) e então habilitar/confirmar as permissões do caminho Facebook Login.

A conexão real atual no Tráfego Pago deve permanecer intacta durante esse gate.
