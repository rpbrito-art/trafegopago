# CORREÇÃO 004C-01 — IMUTABILIDADE DAS VERSÕES DE OFERTA

Status: **AUTORIZADA PARA EXECUÇÃO PELO CLAUDE CODE**

Data: 2026-08-25

Base: mesma branch da 004C, `claude/rodada-004c-offer-catalog-business-context`.

## 1. Defeito a corrigir

`business_offer_versions` representa memória histórica, mas a migration aplicada concedeu `UPDATE` amplo a `service_role` e não há guarda persistida impedindo alteração direta do conteúdo de uma versão.

Assim, um caminho privilegiado fora de `save_business_offer` pode reescrever histórico sem criar nova versão.

## 2. Regra obrigatória

Depois de criada, uma versão de oferta não pode ter seu conteúdo alterado em place.

A única mutação normal permitida em `business_offer_versions` é a transição da versão corrente para histórica:

`superseded_at: NULL -> timestamp não nulo`

Campos como organização, oferta, número da versão, nome, tipo, descrição, proposta de valor, modo/valor/moeda de preço, autor e data de criação permanecem imutáveis.

Uma versão já superseded não pode voltar a ser alterada nem reativada.

## 3. Implementação

- **não editar** `20260825210000_create_business_offers.sql`, porque já foi aplicada remotamente;
- criar migration aditiva com o próximo identificador livre;
- reduzir os privilégios de UPDATE de `service_role` em `business_offer_versions` ao mínimo necessário;
- adicionar guarda de banco que faça a regra de imutabilidade falhar fechado mesmo em chamada privilegiada normal;
- preservar o funcionamento de `save_business_offer`, inclusive supersede + nova versão atômicos e idempotência;
- não alterar o contrato de UI, taxonomias, preço, Meta, IA ou `growth_objectives`.

A forma técnica exata pode ser trigger/constraint + privilégios por coluna ou mecanismo equivalente, desde que a invariante seja provada no banco e não dependa só de convenção de aplicação.

## 4. Provas mínimas

Provar, no banco remoto e de forma transacional:

1. `save_business_offer` continua criando v1;
2. edição material continua marcando v1 como superseded e criando v2;
3. reenvio idêntico continua idempotente;
4. tentativa direta de alterar nome de versão corrente por `service_role` falha;
5. tentativa direta de alterar preço/moeda de versão corrente falha;
6. tentativa direta de alterar conteúdo de versão superseded falha;
7. tentativa de `superseded_at` não nulo voltar a `NULL` falha;
8. a única transição permitida de UPDATE é `superseded_at NULL -> timestamp` sem alteração dos demais campos;
9. RLS/grants de browser continuam inalterados;
10. zero fixture residual após rollback/cleanup.

CI final da branch deve permanecer verde em lint, typecheck, Edge Functions, testes e build.

## 5. Handoff

Atualizar o relatório 004C e `estado.md` da branch para:

**CORREÇÃO 004C-01 EXECUTADA — AGUARDANDO REAUDITORIA GPT**.

Manter PR #15 aberto e não mergeado. Claude não promove a rodada.
