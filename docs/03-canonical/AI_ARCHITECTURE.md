# AI ARCHITECTURE — Quoron MVP

Status: canônico.

## 1. Objetivo

Usar IA apenas onde agrega valor, priorizando custo baixo, resultados estruturados e escalonamento por necessidade. O produto deve permanecer multi-provedor e capaz de trocar modelos sem alterar features.

## 2. Princípio central

`Regra/cálculo primeiro; IA depois.`

Nenhuma tarefa determinística deve chamar LLM só por conveniência.

## 3. Tiers

### Tier 0 — sem IA

Usar para:

- métricas;
- agregações;
- ranking determinístico;
- state machines;
- filtros;
- validações;
- regras financeiras;
- winner engine matemático;
- deduplicação.

### Tier 1 — econômico

Usar para:

- classificação de conteúdo;
- extração estruturada;
- tags;
- taxonomia de respostas;
- resumos curtos;
- normalização semântica simples.

### Tier 2 — intermediário

Usar para:

- comparação de criativos;
- síntese de múltiplas evidências;
- hipóteses de marketing;
- explicação de resultados;
- priorização com contexto maior.

### Tier 3 — premium

Somente para:

- análise estratégica complexa;
- conflitos entre evidências;
- contexto amplo;
- baixa confiança após tier inferior;
- geração de recomendação que justifique custo maior.

## 4. Roteamento

Features enviam uma `AI Task`, não um nome de modelo.

Exemplo conceitual:

```ts
type AITaskRequest<T> = {
  taskType: string;
  taskVersion: string;
  input: unknown;
  outputSchema: JsonSchema;
  allowedTiers: number[];
  qualityRequirement: 'LOW' | 'MEDIUM' | 'HIGH';
  maxEstimatedCost?: Money;
  latencyClass?: 'INTERACTIVE' | 'ASYNC';
  organizationId?: string;
};
```

O Router resolve:

- provider;
- model;
- temperature/configuração;
- timeout;
- retry;
- fallback.

## 5. Catálogo de capacidades

Modelos recebem `capability_tags`, por exemplo:

- `TEXT_CLASSIFICATION`;
- `STRUCTURED_EXTRACTION`;
- `LONG_CONTEXT`;
- `VISION`;
- `REASONING`;
- `LOW_COST`;
- `FAST`;
- `JSON_SCHEMA_NATIVE`.

Policies selecionam por capacidades, não por marca.

## 6. Fallback

Fallback não é sempre "modelo mais caro".

Escalonar quando:

- output falha no schema repetidamente;
- confiança abaixo do mínimo quando medível;
- contexto excede capacidade do modelo;
- tarefa exige capacidade ausente;
- provider indisponível;
- policy estratégica pede segunda opinião.

Não escalar se erro for causado por input inválido ou regra de negócio.

## 7. Structured outputs

Outputs consumidos pela aplicação devem ter schema explícito.

Exemplo de recomendação:

```json
{
  "summary": "string",
  "confidence": 0.0,
  "evidence_refs": ["id"],
  "hypothesis": "string",
  "recommended_action": "TEST|WAIT|DO_NOT_TEST",
  "limitations": ["string"]
}
```

Parsing livre de prosa não é contrato aceitável.

## 8. Prompts versionados

Prompts de produção devem ter:

- task type;
- versão;
- schema version;
- policy version;
- changelog quando alteração semântica relevante.

Não espalhar prompts grandes em componentes UI.

## 9. Segurança de prompt

Conteúdo de cliente é dado não confiável.

System/developer instructions do task runner devem deixar claro que textos de posts, comentários, surveys e leads não podem substituir instruções do sistema.

A IA não recebe:

- access tokens;
- service role;
- senhas;
- funções diretas de gasto;
- acesso irrestrito ao banco.

## 10. Ferramentas/ações

No MVP, preferir arquitetura onde IA produz estruturas/recomendações e o application service executa regras.

Se tool calling for usado futuramente:

- allowlist por task;
- argumentos schema-validated;
- comandos críticos exigem autorização externa à IA;
- ferramentas financeiras não ficam disponíveis sem gate determinístico/humano.

## 11. Uso por feature

### Content feature extraction

Tier 1 por padrão; visão somente quando atributos visuais realmente necessários.

### Test candidate analysis

Filtro/ranking Tier 0 reduz conjunto; Tier 1/2 interpreta candidatos.

### Experiment explanation

Winner Engine Tier 0 decide estado; Tier 1/2 gera explicação.

### Survey classification

Tier 1.

### Strategic insight

Tier 2 por padrão; Tier 3 somente conforme policy/confiança/contexto.

### Lead scoring

Preferir regras/modelos determinísticos auditáveis; IA só para extrair sinais de texto não estruturado.

## 12. Ledger

Toda chamada produtiva registra `ai_run` com:

- organization;
- task type/version;
- provider/model;
- tier;
- tokens;
- preço efetivo/versionado;
- custo estimado;
- latência;
- status;
- fallback;
- confidence quando disponível;
- prompt/schema version.

## 13. Catálogo de preços

Preço nunca hardcoded na feature.

`ai_price_versions` guarda vigência. Quando preço muda, criar nova versão.

O custo de uma chamada deve ser calculado com a versão vigente no momento da execução e permanecer historicamente reproduzível.

## 14. Budget policy

Podem existir limites:

- por task;
- por organização;
- por período;
- por tier;
- globais.

Em tarefas não críticas, exceder orçamento pode degradar para modelo barato ou adiar. Em tarefas essenciais, policy define fallback/erro explícito.

## 15. Cache/reuso

Antes de chamar IA, verificar se resultado versionado equivalente já existe quando a tarefa for determinística em relação ao input.

Exemplo: não reclassificar o mesmo post a cada visualização se `content hash + task version` não mudou.

Cache nunca deve reutilizar resultado entre tenants quando input/contexto sensível puder diferir.

## 16. Avaliação de qualidade

Cada task relevante deve ter conjunto de casos de avaliação, não depender só de impressão humana.

Exemplos:

- classificação de survey: accuracy/F1 em fixture rotulada;
- structured extraction: schema + exact/field accuracy;
- recomendação: avaliação humana por rubric, evidência e ausência de invenção;
- insight: groundedness em evidence refs.

## 17. Confidence

Não assumir que toda API fornece confiança confiável.

`confidence` pode vir de:

- score do próprio classificador;
- regras de consistência;
- consenso entre execuções/modelos em casos selecionados;
- heurística explícita.

Nunca fabricar precisão matemática sem base.

## 18. Grounding

Recomendações devem referenciar registros internos/evidências.

Prompt recebe dados estruturados, não dumps indiscriminados do banco.

Output ideal contém `evidence_refs` que o backend valida contra os inputs fornecidos.

## 19. Privacidade

Minimizar dados enviados.

Para análise de marketing, preferir:

- métricas agregadas;
- conteúdo do criativo;
- categorias/tags;
- respostas anonimizadas quando identidade não agrega.

Não enviar telefone/e-mail/nome de lead para classificar motivo de perda se não necessário.

## 20. Provider adapters

Cada adapter implementa interface comum e traduz:

- request;
- structured output;
- token usage;
- erros;
- rate limits;
- model metadata.

Feature nunca contém `if provider === ...`.

## 21. Estado de modelo

Modelos podem ser:

- `ACTIVE`;
- `DEGRADED`;
- `DEPRECATED`;
- `DISABLED`.

Router não envia novas tarefas a modelos deprecated/disabled.

## 22. Troca de modelo

Trocar o modelo de uma capability deve ser configuração/deploy simples e acompanhado de:

1. atualização de catálogo/preço;
2. eval suite do task;
3. comparação custo/qualidade/latência;
4. promoção da policy.

## 23. Observabilidade

Dashboard administrativo futuro deve permitir:

- custo total/per org;
- custo por task;
- volume por provider/model;
- taxa de fallback;
- erro/schema failure;
- latência;
- custo por insight/campanha/lead quando relacionável.

Mesmo que a UI administrativa não entre no primeiro MVP, os dados devem nascer disponíveis.

## 24. Critérios de aceite da camada IA

Antes de uso comercial:

- nenhuma feature chama provider diretamente;
- tasks possuem schema;
- ai_runs são persistidos;
- custo calculado;
- pelo menos um fallback testado onde necessário;
- input malicioso não consegue acionar comando financeiro;
- prompts/versionamento definidos;
- eval mínima por task crítica.
