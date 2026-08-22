# API CONTRACTS — Tráfego Pago MVP

Status: canônico em nível de contrato. Endpoints/campos externos devem ser revalidados contra documentação vigente no momento da implementação.

## 1. Regra geral

Nenhuma feature chama SDK/HTTP externo diretamente. Integrações ficam atrás de gateways/adapters internos, com DTOs validados e mapeamento explícito.

Cada chamada externa deve registrar, conforme criticidade:

- provider;
- API version;
- organization/connection;
- correlation_id;
- operation_id para mutações;
- status HTTP/categoria de erro;
- external resource id retornado;
- timing/retry metadata.

Segredos e tokens nunca entram em logs.

## 2. Meta Auth Gateway

Responsabilidades:

- iniciar autorização;
- validar `state`/proteções aplicáveis;
- trocar código por credencial/token conforme fluxo vigente;
- identificar ativos autorizados;
- registrar scopes;
- verificar saúde/expiração;
- desconectar/revogar conforme mecanismo disponível.

Contrato conceitual:

```ts
interface MetaAuthGateway {
  buildAuthorizationUrl(input: AuthorizationRequest): Promise<AuthorizationUrl>;
  completeAuthorization(input: AuthorizationCallback): Promise<MetaConnectionResult>;
  inspectConnection(connectionId: string): Promise<ConnectionHealth>;
  disconnect(connectionId: string): Promise<void>;
}
```

Nunca expor token no retorno para browser.

## 3. Instagram Gateway

Responsabilidades:

- listar/importar mídia suportada;
- buscar detalhes de mídia;
- buscar insights suportados;
- criar/publicar mídia suportada;
- consultar estado de publicação;
- lidar com comentários/eventos quando o escopo for implementado.

Contrato conceitual:

```ts
interface InstagramGateway {
  listMedia(input: ListMediaInput): Promise<Page<ExternalMedia>>;
  getMedia(input: GetMediaInput): Promise<ExternalMedia>;
  getMediaInsights(input: MediaInsightsInput): Promise<ExternalMetricSet>;
  createPublication(input: PublicationCommand): Promise<ExternalPublicationResult>;
  getPublicationStatus(input: PublicationStatusQuery): Promise<ExternalPublicationStatus>;
}
```

Requisitos:

- paginação explícita;
- rate limits respeitados;
- tipos de mídia validados antes da chamada;
- external IDs tratados como strings opacas;
- normalização de métricas fora do adapter bruto.

## 4. Metric Normalizer

Contrato separado do gateway:

```ts
interface MetaMetricNormalizer {
  normalizeOrganic(input: RawMetricSet, apiVersion: string): CanonicalMetric[];
  normalizePaid(input: RawMetricSet, apiVersion: string): CanonicalMetric[];
}
```

Regras:

- nunca inventar equivalência entre métricas removidas/substitutas;
- preservar `raw_metric_name`;
- versionar mapper;
- falha de métrica desconhecida não deve necessariamente abortar todo sync; registrar unsupported/unknown.

## 5. Advertising Gateway

Responsabilidades:

- criar/consultar campanhas, ad sets, creatives e ads necessários;
- configurar teste oficial quando apropriado;
- pausar/alterar recursos dentro do escopo aprovado;
- consultar insights;
- consultar estado para reconciliação.

Contrato conceitual:

```ts
interface AdvertisingGateway {
  createExperiment(command: CreateExperimentCommand): Promise<ExternalExperimentResult>;
  createCampaign(command: CreateCampaignCommand): Promise<ExternalCampaignResult>;
  scaleCampaign(command: ScaleCampaignCommand): Promise<ExternalCampaignResult>;
  pauseCampaign(command: PauseCampaignCommand): Promise<void>;
  getInsights(query: AdvertisingInsightsQuery): Promise<ExternalMetricSet>;
  getResourceState(query: ExternalResourceQuery): Promise<ExternalResourceState>;
}
```

Toda mutação recebe `operation_id/idempotency context` interno.

## 6. Financial command contract

Nenhum adapter de publicidade deve aceitar simples `budget` vindo de texto/LLM/UI sem domínio validar aprovação.

Exemplo:

```ts
type ApprovedBudgetCommand = {
  organizationId: string;
  approvalId: string;
  operationId: string;
  targetId: string;
  amountMinor: number;
  currency: string;
};
```

Application service valida aprovação antes de chamar gateway.

## 7. Lead Ads Webhook

Endpoint público deve:

1. suportar verificação/challenge exigido pelo provider quando aplicável;
2. validar autenticidade/assinatura conforme documentação vigente;
3. limitar tamanho/tipo de payload;
4. calcular chave de dedupe;
5. persistir `webhook_event`;
6. enfileirar;
7. retornar rapidamente.

Não executar IA, CRM pesado ou chamadas em cadeia antes da resposta.

## 8. Lead Fetch Gateway

Evento webhook pode conter referência em vez de todos os dados. O worker usa gateway apropriado:

```ts
interface MetaLeadGateway {
  getLead(input: ExternalLeadQuery): Promise<ExternalLead>;
}
```

Mapeamento deve:

- aceitar campos customizados sem quebrar;
- preservar campos permitidos necessários;
- minimizar PII;
- fazer upsert idempotente por external id/contexto.

## 9. Conversions Gateway

```ts
interface ConversionGateway {
  send(events: ConversionEvent[]): Promise<ConversionDeliveryResult[]>;
}
```

Requisitos:

- somente eventos configurados/permitidos;
- dados normalizados e minimizados;
- registro do payload lógico e resultado sem segredos;
- retries apenas quando seguros;
- deduplicação por event id quando mecanismo externo permitir;
- separar sucesso de entrega de sucesso de atribuição.

## 10. Webhook contracts internos

`webhook_events` é inbox durável. Processadores internos recebem referência ao evento, não confiam diretamente no request original.

Exemplo:

```ts
type ProcessWebhookJob = {
  webhookEventId: string;
  correlationId: string;
};
```

## 11. Queue contracts

Payloads de fila são pequenos e referenciam registros persistidos. Evitar duplicar grandes payloads/PII na mensagem.

Exemplos:

```ts
type SyncContentJob = {
  organizationId: string;
  instagramAccountId: string;
  cursor?: string;
  correlationId: string;
};

type ExecuteAdOperationJob = {
  organizationId: string;
  operationId: string;
  correlationId: string;
};
```

## 12. Error taxonomy

Adapters traduzem erros externos para categorias internas:

- `AUTH_REQUIRED`;
- `PERMISSION_DENIED`;
- `RATE_LIMITED`;
- `VALIDATION_FAILED`;
- `NOT_FOUND`;
- `CONFLICT`;
- `TRANSIENT_UPSTREAM`;
- `UPSTREAM_UNAVAILABLE`;
- `UNKNOWN_UPSTREAM`.

Feature não deve depender de códigos Meta específicos espalhados pelo código.

O erro interno pode preservar external code em metadata restrita para debugging.

## 13. Retry policy

- `RATE_LIMITED`: respeitar retry-after/limites do provider;
- `TRANSIENT_UPSTREAM`/`UPSTREAM_UNAVAILABLE`: backoff com limite;
- `AUTH_REQUIRED`: não retry agressivo; marcar conexão `ACTION_REQUIRED`;
- `PERMISSION_DENIED`/`VALIDATION_FAILED`: falha permanente até ação/configuração;
- `UNKNOWN`: retry conservador + alerta após limite.

Mutação só pode retry se idempotência/reconciliação proteger duplicação.

## 14. AI Task Gateway

Features não chamam `openai`, `anthropic`, `gemini`, `kimi` etc.

```ts
interface AITaskGateway {
  execute<T>(request: AITaskRequest<T>): Promise<AITaskResult<T>>;
}
```

`AITaskRequest` contém:

- taskType;
- taskVersion;
- schema;
- input estruturado;
- quality requirement;
- max cost/budget policy;
- allowed tiers;
- organization context mínimo necessário.

Resposta validada contra schema antes do consumo.

## 15. Survey public API

Endpoint público por token não deve expor IDs internos nem dados do lead.

Operações:

- resolver token válido e obter definição sanitizada da pesquisa;
- submeter resposta uma única vez/regras definidas;
- invalidar/expirar conforme política.

Rate limiting e proteção contra abuso obrigatórios.

## 16. Internal application services

UI deve chamar casos de uso, por exemplo:

- `ConnectMeta`;
- `SyncInstagramContent`;
- `PublishContent`;
- `GenerateTestRecommendation`;
- `RequestExperimentApproval`;
- `ApproveBudget`;
- `LaunchExperiment`;
- `EvaluateExperiment`;
- `RequestScaleApproval`;
- `ScaleCampaign`;
- `TransitionLead`;
- `GenerateSurveyRequest`;
- `GenerateStrategicInsight`.

Handlers são finos; regras ficam nos serviços/domínio.

## 17. External data trust boundary

Todo dado Meta é externo e deve ser validado:

- schema parsing;
- campos opcionais;
- enums desconhecidos tolerados de forma segura;
- strings/tamanhos;
- números/moedas;
- timestamps;
- IDs como opacos;
- payloads inesperados registrados sem derrubar processamento global quando possível.

## 18. Contract tests

Antes de promover integração real:

- fixture de resposta feliz;
- paginação;
- campo ausente;
- campo novo/desconhecido;
- token expirado;
- permissão ausente;
- rate limit;
- 5xx;
- timeout;
- webhook duplicado;
- mutação com timeout após criação externa;
- reconciliação de operação `UNKNOWN`.

## 19. Atualização de contratos

Se a Meta alterar API, atualizar primeiro:

1. Research note/changelog relevante;
2. adapter/DTO/normalizer contract;
3. testes;
4. documento canônico se houver mudança semântica;
5. implementação.

Não corrigir por tentativa e erro diretamente nas features.
