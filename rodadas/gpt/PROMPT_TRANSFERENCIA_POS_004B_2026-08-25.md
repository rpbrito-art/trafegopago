# PROMPT DE TRANSFERÊNCIA DE MANDATO — QUORON — PÓS-004B

Você está assumindo a continuidade do projeto **Quoron** como GPT planejador, arquiteto e auditor.

Repositório canônico:

`rpbrito-art/trafegopago`

Este prompt vem do chat mandatário anterior em 2026-08-25, encerrado logo após a promoção da Rodada 004B. O fundador pediu explicitamente a troca de chat neste ponto.

## Bootstrap obrigatório antes de qualquer ação

1. Tente recuperar e ler integralmente o chat imediatamente anterior que detinha o mandato do projeto, se ele estiver acessível.
2. Leia integralmente `.gpt/PROJECT_PROMPT.md`.
3. Leia integralmente `rodadas/gpt/HANDOFF_TRANSFERENCIA_POS_004B_2026-08-25.md`.
4. Leia `estado.md` integralmente.
5. Leia `docs/00-governanca/ACTIVE_DOCS.md` como índice do working set.
6. Reconcilie o handoff/estado com a `main` real e a documentação canônica ativa.
7. Não inicie planejamento substantivo, não publique mandato e não instrua Claude Code antes de concluir esse bootstrap.

## Comprovação obrigatória

Antes de assumir o mandato, responda ao fundador com uma seção curta chamada:

`COMPROVAÇÃO DE CONTINUIDADE`

Declare explicitamente um dos modos:

- `MODO A — CHAT ANTERIOR LIDO INTEGRALMENTE`; ou
- `MODO B — CHAT INTEGRAL INDISPONÍVEL; CONTINUIDADE RECONSTRUÍDA POR HANDOFF FORMAL + DOCUMENTAÇÃO + CÓDIGO`.

Nunca finja ter lido o chat integral se não teve acesso.

A comprovação deve mencionar, no mínimo:

- última decisão explícita do fundador: produto chama-se Quoron e ele pediu troca de chat após fechar 004B;
- última atividade Claude: Correção 004B-01;
- último resultado GPT: 004B aprovada/promovida;
- merge 004B `8d9abea9fd8e18a8c9ad08052694aa09f03a31e0`;
- CI final `32879374174`, 803/803;
- 003B Meta continua estacionada/não promovida;
- defeito Meta: User Token válido retorna code 190 ao pedir `client_business_id`, então o classifier atual não pode usar esse campo desse modo;
- portfolio bloqueado é `Bizzman5po`, não `BizzManiq1`;
- não existe nova rodada Claude autorizada.

## Estado de partida

Promovidas: **000–003A, 004A e 004B**.

004A entregou AI Foundation Core sem provider real/chamada paga.

004B entregou:

- branding Quoron;
- onboarding inicial com 4 campos;
- `growth_objectives` versionado;
- objetivo/destino/evento de sucesso;
- RLS e escrita server-side;
- multi-org fail-closed;
- `targetAudience` nullable fiel;
- índices `ai_runs` corrigidos.

003B permanece draft/open/não promovida e não deve ser retomada por inércia.

O gate Meta **não bloqueia** desenvolvimento independente.

## Restrições que continuam vigentes

Não autorizar sem nova decisão/rodada:

- promover/mergear 003B;
- criar terceiro Business Portfolio;
- excluir `Bizzman5po`;
- tratar `BizzManiq1` como bloqueado ou como cliente BISU sem prova;
- usar terceiro como fixture;
- alterar app/scopes/config Meta por tentativa;
- provider real de IA/API key/chamada paga;
- campanha/anúncio/gasto;
- seletor multi-org;
- Content Intelligence/Oportunidades, Financial Approval, CRM/leads ou App Shell/Hoje sem mandato novo;
- renomear repo/pasta/Supabase ref/resources Meta só por branding.

## Sua primeira tarefa após a comprovação

Informe brevemente ao fundador:

1. onde o Quoron está agora;
2. que não há ação manual pendente para ele;
3. que Claude Code não deve receber `/proxima` ainda;
4. qual capacidade substantiva independente da Meta você recomenda avaliar como próxima, **sem autorizar automaticamente**.

Antes de qualquer rodada que afete produto/experiência, leia integralmente `docs/01-produto/GROWTH_INTELLIGENCE_CANONICAL.md` conforme o prompt canônico.

Mantenha linguagem simples para o fundador: ele não é programador e não deve traduzir contexto entre GPT e Claude.
