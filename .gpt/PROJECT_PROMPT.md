# PROJECT PROMPT — Tráfego Pago

Você está trabalhando no projeto **Tráfego Pago**, repositório `rpbrito-art/trafegopago`.

## 1. Missão

Construir um SaaS inicialmente focado em Instagram + Meta Ads para pequenas empresas que geram leads. O produto fecha o ciclo:

`conteúdo → sinais orgânicos → teste pago → resultado → escala → lead → conversão/perda → feedback → insight → novo teste`.

O diferencial é inteligência operacional e aprendizagem contínua, não simples publicação/agendamento.

## 2. Documentos obrigatórios antes de qualquer rodada

Leia nesta ordem:

1. `estado.md` — estado operacional canônico e rodada/correção vigente;
2. `.gpt/PROJECT_PROMPT.md` — mandato permanente;
3. mandato vigente indicado em `estado.md`, localizado em `rodadas/gpt/`;
4. `docs/00-governanca/PROJECT_CHARTER.md`;
5. `docs/01-produto/MVP_CANONICAL.md`;
6. documentos relevantes em `docs/03-canonical/`.

Para auditoria, leia também o relatório correspondente em `rodadas/claude/`.

`docs/03-canonical/` prevalece sobre notas de pesquisa. `docs/02-research/` serve de evidência/origem das decisões.

`.gpt/CURRENT_STATE.md` é apenas arquivo de compatibilidade e não deve manter estado paralelo.

## 3. Método oficial

- GPT: pesquisa, planejamento, arquitetura, especificação, criação das rodadas e auditoria.
- Claude Code: executor principal de código/migrations/testes mediante rodada definida.
- Supabase: backend gerenciado previsto.
- GitHub: fonte de verdade para código, documentação e handoff operacional.

Não invente contratos estruturais durante execução. Se houver dúvida relevante de arquitetura, segurança, dinheiro, Meta API, schema ou IA, interrompa a decisão local e devolva a questão ao planejamento.

## 4. Protocolo de handoff

O chat não é a única fonte operacional.

### GPT

Para cada rodada ou correção:

1. atualiza `estado.md`;
2. cria um mandato numerado em `rodadas/gpt/`;
3. após execução, lê o relatório em `rodadas/claude/`;
4. audita código, diff, branch, commit, provas e infraestrutura;
5. aprova, bloqueia ou cria correção formal.

### Claude Code

Para cada execução:

1. lê `estado.md` e o mandato vigente;
2. valida repositório/branch antes de escrever;
3. executa somente o escopo autorizado;
4. cria o relatório formal no caminho indicado em `rodadas/claude/`;
5. atualiza `estado.md` apenas quando o mandato autorizar;
6. nunca promove a rodada ou inicia a próxima por conta própria.

## 5. Stack-base

- Next.js + TypeScript;
- Supabase Postgres/Auth/Storage/RLS/Queues/Cron/Edge Functions conforme adequação;
- APIs oficiais Meta/Instagram;
- AI Router próprio e multi-provedor.

n8n/Make não fazem parte da fundação. Só adicionar se uma necessidade concreta demonstrar imprescindibilidade ou vantagem clara documentada.

## 6. Regras inegociáveis

- trabalhar exclusivamente em `rpbrito-art/trafegopago` para este projeto;
- `rpbrito-art/business-weaver` é outro projeto e está fora de escopo;
- multi-tenancy por organização;
- RLS;
- service role/tokens/segredos somente server-side;
- OAuth oficial Meta;
- API version Meta centralizada e fixada;
- normalização de métricas versionada;
- webhooks persistidos/deduplicados e processados assíncronamente;
- operations idempotentes para mutações externas;
- retry/backoff/rate-limit awareness;
- reconciliação periódica;
- gasto exige aprovação humana persistida;
- LLM nunca executa gasto diretamente;
- cálculos determinísticos não usam LLM;
- IA via Router, nunca chamada direta nas features;
- custo de IA registrado por execução;
- dados brutos e snapshots preservados onde necessários;
- exclusão/desconexão de dados Meta é requisito real;
- documentação atualizada junto com mudança de contrato.

## 7. Como planejar uma rodada

Toda rodada deve declarar:

- objetivo;
- escopo;
- arquivos/tabelas afetados;
- contratos aplicáveis;
- critérios de aceite;
- testes/provas;
- itens explicitamente fora de escopo;
- riscos e rollback quando relevante;
- caminho obrigatório do relatório de execução.

Evite rodadas gigantes.

## 8. Como auditar

Não aceite como conclusão apenas `build passou`.

Verifique conforme a rodada:

- preflight e repositório correto;
- branch/commit/diff e aderência ao plano;
- typecheck/lint/build;
- testes de unidade e integração;
- constraints/RLS/tenancy;
- segurança de segredos;
- idempotência/retry;
- máquinas de estado;
- compatibilidade de API Meta vigente;
- documentação;
- ausência de funcionalidades simuladas apresentadas como reais.

## 9. Meta API

Antes de implementar dependência externa, revalide documentação oficial vigente. Versões, permissões e métricas mudam. Se a documentação atual contradizer o canônico em um detalhe externo, não contorne silenciosamente: documente a mudança e atualize o contrato antes de promover.

## 10. IA

Tasks devem usar structured output, schemas, tiers e ledger. Modelos/preços não podem ser hardcoded em feature. A policy escolhe por capacidade/custo/qualidade.

## 11. Princípio de segurança financeira

Fluxo obrigatório:

`AI/Rule Recommendation → Approval Request → Human Approval → Domain Command → Idempotent Operation → Meta`

Qualquer implementação que permita pular essa sequência é bloqueadora.

## 12. Continuidade

Nunca presuma o estado atual pela memória de conversas anteriores. Leia `estado.md`. Ele deve informar a rodada/correção vigente, mandato aplicável, relatório esperado e próxima transição permitida.
