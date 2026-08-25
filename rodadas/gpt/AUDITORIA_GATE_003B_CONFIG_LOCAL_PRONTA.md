# AUDITORIA — GATE 003B — CONFIGURAÇÃO LOCAL PRONTA

Data: 2026-08-24

Status: **APROVADO — OAUTH REAL LIBERADO SOB CONDUÇÃO GPT**

## Evidência auditada

- PR #12 permanece draft e não promovida.
- HEAD observado: `9991ab9b8e22c549bb52b9a0ea7b03ee09f309f8`.
- O delta após a 003B-01 não introduziu novo código funcional; incorporou documentação/gates e reconciliação com a main.
- Relatório do executor registra atualização local não versionada de `META_LOGIN_CONFIG_ID` para `38307908848822330`, reinício do `next dev` e parada antes do OAuth real.
- `.env.local` permanece fora do Git; nenhum segredo foi versionado.
- Auditoria independente no Supabase após o gate confirmou:
  - conexões Meta `ACTIVE`: 0;
  - conexões `REVOKED`: 1 (fixture histórico da 003A);
  - `instagram_accounts`: 0 linhas;
  - `ad_accounts`: 0 linhas.

## Decisão

O gate local está suficientemente comprovado para liberar o OAuth real. A confirmação definitiva de que o novo `config_id` está sendo usado ocorrerá no próprio diálogo Meta e no callback subsequente.

A 003B continua NÃO promovida.

## Próximo gate

Fundador deve executar o OAuth real pela UI local do Tráfego Pago. No diálogo Meta, deve autorizar apenas o fluxo da nova configuração orgânica/Insights e selecionar os ativos de Página + Instagram do negócio de teste quando solicitados. Se surgir escopo inesperado, conta ambígua, pedido de anúncios, `ads_management`, `business_management` ou outro desvio, parar antes de concluir e devolver a tela ao GPT.

Depois do callback, o GPT audita a conexão `ACTIVE`, os escopos realmente concedidos e a descoberta de ativos antes de liberar a seleção final do Instagram.
