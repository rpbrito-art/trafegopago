# AUDITORIA GPT — CORREÇÃO 004E-04 — SWITCH FIRST PROVIDER TO ANTHROPIC

Data: 2026-08-26

Mandato auditado: `rodadas/gpt/CORRECAO_004E_04_SWITCH_FIRST_PROVIDER_TO_ANTHROPIC.md`

Branch: `claude/rodada-004e-declared-context-review-first-real-ai`

PR: #17 — draft/open/não mergeada.

HEAD final auditado: `22555677c86012bd16293e16bb3e1f3e78c15585`.

CI do HEAD: run `32961935875` — **success**; install, lint, typecheck, Edge Functions, testes e build verdes.

## Veredito

**004E-04 EXECUTOU CORRETAMENTE A TROCA DE PROVIDER, MAS O GATE ANTHROPIC CONTINUA FECHADO ATÉ UMA MICROCORREÇÃO DE `stop_reason` E CONTABILIZAÇÃO DE CUSTO EM FALHAS PÓS-RESPOSTA.**

Não disponibilizar `ANTHROPIC_API_KEY`, não executar E2E/eval pagos e não mergear/promover o PR #17 ainda.

## 1. Troca de provider — APROVADA

A migration aditiva `20260826120000_switch_first_provider_to_anthropic.sql` preserva o histórico Gemini e cria a configuração Anthropic sem reescrever migrations já aplicadas.

Verificação independente no Supabase remoto confirmou:

- migrations `20260825250000`, `20260825260000`, `20260825270000`, `20260825280000` e `20260826120000` aplicadas;
- `anthropic_claude` = ACTIVE;
- `claude-haiku-4-5-20251001` = ACTIVE, Tier 1, structured output, 200K contexto, 64K saída;
- preço vigente Anthropic = USD 1.00/M input e USD 5.00/M output; cache price nulo;
- `google_gemini` e `gemini-2.5-flash-lite` = DISABLED, com vigência/preço encerrados;
- o filtro equivalente ao Router encontra **um único candidato elegível** para a task: Anthropic Haiku 4.5;
- `declared_context_review_attempts = 0`;
- `declared_context_reviews = 0`;
- `ai_runs` reais da task = 0.

Nenhuma chamada real de IA ocorreu.

## 2. Adapter Anthropic — APROVADO NOS PONTOS DO MANDATO

Auditado em `src/lib/ai/adapters/anthropic.ts`:

- `@anthropic-ai/sdk@0.120.0` fixado;
- chave server-only em `ANTHROPIC_API_KEY`;
- ausência de chave falha sem provider/fake;
- modelo vem do Router;
- `output_config.format.type = json_schema`;
- schema reutiliza o contrato versionado da task;
- `max_tokens = 2048`;
- `maxRetries = 0` no cliente e no request;
- timeout de 45s no cliente e no request;
- sem tools/web search/citations/thinking;
- usage obrigatório falha fechado;
- cache read/creation inesperado falha fechado;
- erro externo não vaza mensagem/chave.

O registro de produção contém somente o adapter Anthropic; o adapter/dependência Gemini foram removidos do runtime produtivo.

## 3. Contrato externo revalidado em 2026-08-26

Documentação oficial Anthropic confirma:

- Claude API ID do Haiku 4.5: `claude-haiku-4-5-20251001`;
- 200K de contexto e até 64K de saída;
- preço USD 1/M input e USD 5/M output;
- structured outputs por `output_config.format` com JSON Schema;
- SDK TypeScript faz 2 retries automáticos por padrão e permite `maxRetries: 0`.

A revalidação também trouxe um requisito operacional que precisa ser tratado antes da primeira chamada paga:

- toda resposta Messages API possui `stop_reason`;
- `refusal` é HTTP 200 e é cobrado; a saída pode não respeitar o schema;
- `max_tokens` também pode produzir saída incompleta fora do schema;
- a documentação orienta verificar `stop_reason` antes de usar a resposta.

Fontes oficiais:

- `https://platform.claude.com/docs/en/about-claude/models/overview`
- `https://platform.claude.com/docs/pt-BR/about-claude/pricing`
- `https://platform.claude.com/docs/pt-BR/build-with-claude/structured-outputs`
- `https://platform.claude.com/docs/en/build-with-claude/handling-stop-reasons`
- `https://platform.claude.com/docs/en/cli-sdks-libraries/sdks/typescript`

## 4. BLOQUEIO 004E-05A — `stop_reason` é ignorado

O tipo local do cliente já inclui `stop_reason`, mas `execute()` não o verifica.

Consequências:

1. `refusal` pode chegar como HTTP 200 e ser cobrado;
2. `max_tokens` pode chegar como HTTP 200 com output truncado;
3. conteúdo desses casos pode atravessar o caminho normal caso seja parseável;
4. o sistema não distingue uma conclusão normal (`end_turn`) de uma resposta que não deve virar artefato.

Obrigatório antes do gate pago:

- somente `stop_reason === "end_turn"` pode seguir para parse/validação normal nesta task;
- `refusal` deve falhar fechado como `PROVIDER_REJECTED`;
- `max_tokens` deve falhar fechado sem persistir revisão;
- qualquer outro stop reason inesperado deve falhar fechado; não criar fallback nesta rodada.

## 5. BLOQUEIO 004E-05B — falha pós-resposta perde usage/custo

O problema é mais geral que `refusal`.

Hoje `AIAdapterResult` permite `usage` somente quando `ok: true`. Se a API já respondeu e o adapter depois falha por:

- `refusal`;
- `max_tokens`;
- JSON ausente/malformado;
- outro erro de interpretação com usage confiável,

o adapter devolve `ok: false` sem usage. O Router então encerra o `ai_run` em falha apenas com latência, sem tokens nem custo.

Isso viola a invariante econômica central da 004A/004E: **uma chamada que pode ter sido cobrada não pode desaparecer da contabilidade como se não tivesse consumo conhecido.**

Correção requerida:

- permitir que falha do adapter carregue `usage` quando o provider respondeu com metadata confiável;
- no Router, se uma falha vier com usage confiável, calcular o custo pela versão já resolvida e gravar tokens/custo/moeda no `ai_run` FAILED;
- falhas anteriores à resposta ou com usage não confiável continuam sem custo inventado;
- JSON inválido após resposta deve preservar usage para o ledger;
- `refusal` e `max_tokens` devem preservar usage para o ledger;
- não criar retry/fallback.

## 6. Provas mínimas exigidas

Adicionar testes determinísticos que provem:

1. `end_turn` + JSON válido segue normalmente;
2. `refusal` não produz output/revisão e devolve falha normalizada;
3. `max_tokens` não produz output/revisão;
4. stop reason inesperado falha fechado;
5. refusal com usage confiável fecha o run FAILED com tokens e custo;
6. max_tokens com usage confiável fecha o run FAILED com tokens e custo;
7. JSON inválido com usage confiável fecha o run FAILED com tokens e custo;
8. erro de conexão sem usage não inventa custo;
9. nenhuma chamada real Anthropic é feita durante a correção;
10. E2E/eval continuam bloqueados sem chave;
11. CI completa verde.

## 7. Governança/documentação

O `estado.md` da branch possui trechos históricos que ainda dizem que a 004E-04 está apenas autorizada, enquanto uma seção posterior registra a execução. Na próxima correção, harmonizar o estado da branch para uma única situação operacional corrente, sem apagar histórico de auditoria.

O relatório Claude também mantém no início referências antigas ao gate `GEMINI_API_KEY`; harmonizar o handoff final para o gate Anthropic atual.

## 8. Próxima ação

Correção formal:

`rodadas/gpt/CORRECAO_004E_05_PAID_RESPONSE_ACCOUNTING.md`

Após autorização em `estado.md`, próximo ator: **Claude Code**.

Até reauditoria da 004E-05:

- não disponibilizar `ANTHROPIC_API_KEY`;
- não chamar Claude API real;
- não rodar E2E/eval pagos;
- não mergear/promover PR #17;
- não tocar Meta/003B.