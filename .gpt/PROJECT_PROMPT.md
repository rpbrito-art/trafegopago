# PROJECT PROMPT — Tráfego Pago

Você está trabalhando no projeto **Tráfego Pago**, repositório `rpbrito-art/trafegopago`.

## 1. Missão

Construir um SaaS inicialmente focado em Instagram + Meta Ads para pequenas empresas que geram leads. O produto fecha o ciclo:

`conteúdo → sinais orgânicos → teste pago → resultado → escala → lead → conversão/perda → feedback → insight → novo teste`.

O diferencial é inteligência operacional e aprendizagem contínua, não simples publicação/agendamento.

## 2. Documentos obrigatórios antes de qualquer rodada

Leia nesta ordem:

1. `.gpt/CURRENT_STATE.md`;
2. `docs/00-governanca/PROJECT_CHARTER.md`;
3. `docs/01-produto/MVP_CANONICAL.md`;
4. documentos relevantes em `docs/03-canonical/`.

`docs/03-canonical/` prevalece sobre notas de pesquisa. `docs/02-research/` serve de evidência/origem das decisões.

## 3. Método oficial

- GPT: pesquisa, planejamento, arquitetura, especificação e auditoria.
- Claude Code: executor principal de código/migrations/testes mediante rodada definida.
- Supabase: backend gerenciado previsto.
- GitHub: fonte de verdade para código e documentação.

Não invente contratos estruturais durante execução. Se houver dúvida relevante de arquitetura, segurança, dinheiro, Meta API, schema ou IA, interrompa a decisão local e devolva a questão ao planejamento.

## 4. Stack-base

- Next.js + TypeScript;
- Supabase Postgres/Auth/Storage/RLS/Queues/Cron/Edge Functions conforme adequação;
- APIs oficiais Meta/Instagram;
- AI Router próprio e multi-provedor.

n8n/Make não fazem parte da fundação. Só adicionar se uma necessidade concreta demonstrar imprescindibilidade ou vantagem clara documentada.

## 5. Regras inegociáveis

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

## 6. Como planejar uma rodada

Toda rodada deve declarar:

- objetivo;
- escopo;
- arquivos/tabelas afetados;
- contratos aplicáveis;
- critérios de aceite;
- testes/provas;
- itens explicitamente fora de escopo;
- riscos e rollback quando relevante.

Evite rodadas gigantes.

## 7. Como auditar

Não aceite como conclusão apenas `build passou`.

Verifique conforme a rodada:

- diff e aderência ao plano;
- typecheck/lint/build;
- testes de unidade e integração;
- constraints/RLS/tenancy;
- segurança de segredos;
- idempotência/retry;
- máquinas de estado;
- compatibilidade de API Meta vigente;
- documentação;
- ausência de funcionalidades simuladas apresentadas como reais.

## 8. Meta API

Antes de implementar dependência externa, revalide documentação oficial vigente. Versões, permissões e métricas mudam. Se a documentação atual contradizer o canônico em um detalhe externo, não contorne silenciosamente: documente a mudança e atualize o contrato antes de promover.

## 9. IA

Tasks devem usar structured output, schemas, tiers e ledger. Modelos/preços não podem ser hardcoded em feature. A policy escolhe por capacidade/custo/qualidade.

## 10. Princípio de segurança financeira

Fluxo obrigatório:

`AI/Rule Recommendation → Approval Request → Human Approval → Domain Command → Idempotent Operation → Meta`

Qualquer implementação que permita pular essa sequência é bloqueadora.

## 11. Estado inicial

Não presuma que código, projeto Supabase, migrations, app Meta ou credenciais já existem. Consulte `.gpt/CURRENT_STATE.md` a cada nova conversa.
