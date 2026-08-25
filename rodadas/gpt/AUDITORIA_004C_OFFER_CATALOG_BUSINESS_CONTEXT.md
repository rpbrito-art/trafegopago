# AUDITORIA GPT — RODADA 004C — OFFER CATALOG + BUSINESS CONTEXT FOUNDATION

Data: 2026-08-25

Mandato: `rodadas/gpt/RODADA_004C_OFFER_CATALOG_BUSINESS_CONTEXT.md`

Branch auditada: `claude/rodada-004c-offer-catalog-business-context`

PR: #15

HEAD auditado: `bff3aaea804de90e8d03a7586f262d6060b5cad0`

## Veredito

**BLOQUEADA PARA PROMOÇÃO — CORREÇÃO 004C-01 OBRIGATÓRIA.**

A rodada está executada e a maior parte do contrato foi implementada corretamente, mas existe uma quebra material do objetivo central de versionamento: as linhas de `business_offer_versions` são descritas e usadas como versões imutáveis, porém `service_role` recebeu `UPDATE` amplo na tabela e não existe guarda de banco impedindo alteração direta do conteúdo de uma versão já criada.

Isso significa que código server-side futuro usando o cliente privilegiado pode alterar `name`, `offer_type`, descrição, proposta de valor, preço, moeda, `version_no`, `organization_id`, `offer_id` ou outros campos sem passar por `save_business_offer`, destruindo silenciosamente a memória histórica que a 004C foi criada para preservar.

## O que foi aprovado na auditoria

- separação entre identidade (`business_offers`) e conteúdo versionado (`business_offer_versions`);
- FK composta tenant-safe entre versão e oferta;
- um único conteúdo corrente por oferta por índice único parcial;
- fluxo normal de edição supersede + insert na mesma transação;
- idempotência do reenvio idêntico;
- taxonomias e constraints de preço;
- dinheiro em unidade menor inteira;
- autorização owner/admin, organização/membership ACTIVE e tenant resolvido no servidor;
- RLS de leitura e browser sem escrita;
- multi-organização fail-closed;
- preservação do `business_profiles.primary_offer` como sugestão, não fato migrado;
- UI `/ofertas` em linguagem simples;
- harmonização documental prevista no mandato;
- PR #15 aberto/draft/não mergeado;
- CI do HEAD `bff3aaea...` verde em lint, typecheck, Edge Functions, testes e build.

## Bloqueio 004C-01 — versão não é realmente imutável

O mandato exige que uma edição material crie nova versão e que versão superseded não volte a ser alterada. A migration atual concede:

`grant select, insert, update on table public.business_offer_versions to service_role;`

A função `save_business_offer` respeita o versionamento, mas a própria tabela não impede um UPDATE privilegiado fora da RPC. Logo, o histórico depende de disciplina de chamador, não de uma invariante persistida.

Para esta entidade isso é insuficiente: a finalidade declarada da tabela é justamente ser memória histórica confiável para análises futuras.

## Correção exigida

Executar `rodadas/gpt/CORRECAO_004C_01_IMUTABILIDADE_VERSOES_OFERTA.md` na mesma branch.

Não editar nem reescrever a migration aplicada `20260825210000_create_business_offers.sql`.

## Itens não bloqueadores

O relatório do Claude registra que `growth_objectives` ainda não aparece em `DATA_MODEL.md`. A lacuna é anterior e não foi criada pela 004C; não ampliar esta correção para housekeeping documental.

## Estado após auditoria

- 004C: **EXECUTADA, AUDITADA E BLOQUEADA**;
- 004C: **NÃO APROVADA**;
- 004C: **NÃO PROMOVIDA**;
- PR #15: deve permanecer aberto e não mergeado;
- próximo ator: Claude Code, apenas para a Correção 004C-01.
