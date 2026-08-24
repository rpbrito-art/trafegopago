# GATE 003B — CONFIGURAÇÃO META CRIADA

Data: 2026-08-24

Status: **EXECUTADO PELO FUNDADOR — RESULTADO REGISTRADO PELO GPT — AGUARDANDO ATUALIZAÇÃO LOCAL DO `META_LOGIN_CONFIG_ID` ANTES DO OAUTH REAL**

## Resultado do gate externo

No app Meta **Trafego Pago Business Dev** (App ID `2940404272985831`) foi criada uma nova configuração de Facebook Login for Business para a Rodada 003B:

- nome: `Quoron Instagram Dev Login`;
- Configuration ID: `38307908848822330`;
- variação: General;
- token: System-user access token / BISU;
- ativos obrigatórios: Pages + Instagram Accounts;
- Ad Accounts não foram tornadas obrigatórias nesta configuração;
- permissões da configuração orgânica/Insights:
  - `pages_show_list`;
  - `pages_read_engagement`;
  - `instagram_basic`;
  - `instagram_manage_insights`.

A capacidade de anúncios permanece opcional e será autorizada separadamente quando houver necessidade real. Não incluir `ads_read` nesta configuração evita obrigar usuários do modo orgânico a conceder acesso publicitário.

## Configuração histórica da 003A

Permanece existente:

- nome: `Trafego Pago Dev Login`;
- Configuration ID: `1549901823029730`.

Ela não deve ser usada pela 003B. Também não deve ser apagada antes da promoção da 003B, pois serve como referência histórica/rollback do E2E da 003A.

## Próxima ação autorizada

Claude Code pode:

1. trazer o estado atual da `main` para a branch da 003B se necessário;
2. atualizar **somente no ambiente local não versionado** `META_LOGIN_CONFIG_ID=38307908848822330`;
3. confirmar sem imprimir segredos que o ambiente reconhece o novo Configuration ID;
4. iniciar/reiniciar o servidor local se necessário;
5. parar antes do OAuth real e devolver `003B — CONFIGURAÇÃO LOCAL PRONTA — AGUARDANDO OAUTH REAL CONDUZIDO PELO GPT`.

Não autorizado nesta etapa:

- editar novamente o painel Meta;
- apagar a configuração histórica da 003A;
- ampliar permissões;
- executar o OAuth em nome do fundador;
- criar anúncio/gasto;
- persistir Page Access Token;
- promover a 003B.
