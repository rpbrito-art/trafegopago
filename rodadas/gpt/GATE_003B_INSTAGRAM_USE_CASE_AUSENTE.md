# GATE 003B — PERMISSÕES INSTAGRAM AUSENTES DO CATÁLOGO DA CONFIGURAÇÃO

Status: **DIAGNÓSTICO CONFIRMADO — AJUSTE EXTERNO DO APP NECESSÁRIO**

## Fato observado

Na edição da configuração `Quoron Instagram Dev Login` (Configuration ID `38307908848822330`), o seletor de permissões oferece exatamente cinco opções:

- `ads_management`;
- `ads_read`;
- `business_management`;
- `pages_read_engagement`;
- `pages_show_list`.

`instagram_basic` e `instagram_manage_insights` não aparecem sequer como opções disponíveis.

Isso explica o OAuth real anterior: a conexão ficou `ACTIVE`, mas o token recebeu apenas `pages_show_list`, `pages_read_engagement` e `public_profile`, sem capacidade Instagram.

## Interpretação GPT

O problema não é escolha incompleta do fundador no diálogo OAuth. O app Meta ainda não expõe o conjunto de permissões do caso de uso Instagram API with Facebook Login para essa configuração.

A arquitetura vigente continua sendo Facebook Login for Business + `graph.facebook.com`, porque o produto combina Instagram e Meta Ads. Não migrar para Instagram Login/`graph.instagram.com` nesta correção.

## Próxima ação externa autorizada

No Meta for Developers do app `Trafego Pago Business Dev`:

1. abrir `Casos de uso`;
2. habilitar/personalizar o caso de uso de gerenciamento de conteúdo/mensagens do Instagram;
3. dentro dele usar **API setup with Facebook Login**;
4. habilitar as permissões `instagram_basic` e `instagram_manage_insights`;
5. retornar a `Login do Facebook para empresas > Configurações > Quoron Instagram Dev Login > Editar > Permissões`;
6. adicionar `instagram_basic` e `instagram_manage_insights` à configuração, preservando as permissões já selecionadas;
7. salvar;
8. não repetir OAuth ainda até o GPT definir a reautorização da conexão `ACTIVE` sem destruir evidência.

Nenhuma alteração de código está autorizada por este gate.
