import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";

import { criarFakeAdapter } from "../../../test/support/fake-ai-adapter";
import { criarAdapterRegistry } from "./adapter-registry";
import type { AICatalog } from "./catalog";
import type {
  AIErrorClass,
  AIModelCandidate,
  AIPriceVersion,
  AITaskDefinition,
} from "./contracts";
import type {
  AbrirRunInput,
  AIRunLedger,
  ConcluirRunInput,
  FalharRunInput,
} from "./run-ledger";
import { criarAIRouter } from "./router";
import { criarTaskRegistry } from "./task-registry";

/**
 * AI Router — provas da Rodada 004A §10.
 *
 * O catálogo, o ledger e o provider são duplos. O que se prova não é o
 * comportamento de um provedor real: é **a ordem das decisões** — o que precisa
 * ser verdade antes de o adapter ser chamado, o que nunca chega a acontecer
 * depois de uma recusa, e o que fica registrado em cada desfecho.
 */

const ORG_A = "11111111-1111-1111-1111-111111111111";
const ORG_B = "22222222-2222-2222-2222-222222222222";
const PROVIDER_ID = "aaaaaaaa-0000-0000-0000-000000000001";
const MODELO_ID = "bbbbbbbb-0000-0000-0000-000000000001";
const PRECO_ID = "cccccccc-0000-0000-0000-000000000001";
const RUN_ID = "dddddddd-0000-0000-0000-000000000001";
const AGORA = new Date("2026-08-25T12:00:00.000Z");

const OUTPUT_SCHEMA = z.object({
  categoria: z.string(),
  confianca: z.number(),
});

const TASK: AITaskDefinition = {
  taskType: "fixture.classificacao",
  taskVersion: "1",
  promptVersion: "p1",
  schemaVersion: "s1",
  scope: "TENANT",
  inputSchema: z.object({ texto: z.string() }),
  outputSchema: OUTPUT_SCHEMA,
  requiredCapabilities: ["TEXT_CLASSIFICATION"],
  allowedTiers: [1, 2],
  qualityRequirement: "LOW",
  latencyClass: "ASYNC",
};

const TASK_GLOBAL: AITaskDefinition = {
  ...TASK,
  taskType: "fixture.global",
  scope: "GLOBAL",
};

function modelo(over: Partial<AIModelCandidate> = {}): AIModelCandidate {
  return {
    id: MODELO_ID,
    providerId: PROVIDER_ID,
    providerKey: "fixture",
    providerStatus: "ACTIVE",
    modelKey: "fixture-mini",
    tier: 1,
    capabilityTags: ["TEXT_CLASSIFICATION", "LOW_COST"],
    status: "ACTIVE",
    supportsStructuredOutput: true,
    contextWindowTokens: 128000,
    maxOutputTokens: 4096,
    ...over,
  };
}

function preco(over: Partial<AIPriceVersion> = {}): AIPriceVersion {
  return {
    id: PRECO_ID,
    aiModelId: MODELO_ID,
    inputPricePerMillion: "0.150000000000",
    outputPricePerMillion: "0.600000000000",
    cachedInputPricePerMillion: null,
    currency: "USD",
    effectiveFrom: "2026-01-01T00:00:00.000Z",
    effectiveTo: null,
    ...over,
  };
}

/** Estado dos duplos. */
let candidatos: AIModelCandidate[] = [];
let precos: AIPriceVersion[] = [];
let abertos: AbrirRunInput[] = [];
let concluidos: ConcluirRunInput[] = [];
let falhados: FalharRunInput[] = [];
let abrirDevolve: string | null = RUN_ID;

let instanteRecebido: Date | null = null;

const catalogo: AICatalog = {
  async listarCandidatos(em) {
    instanteRecebido = em;
    return candidatos;
  },
  async listarPrecosVigentes() {
    return precos;
  },
};

const ledger: AIRunLedger = {
  async abrir(input) {
    abertos.push(input);
    return abrirDevolve;
  },
  async concluir(input) {
    concluidos.push(input);
    return true;
  },
  async falhar(input) {
    falhados.push(input);
    return true;
  },
};

function router(adapters: Parameters<typeof criarAdapterRegistry>[0], tasks = [TASK, TASK_GLOBAL]) {
  return criarAIRouter({
    tasks: criarTaskRegistry(tasks),
    catalog: catalogo,
    adapters: criarAdapterRegistry(adapters),
    ledger,
    agora: () => AGORA,
    gerarCorrelationId: () => "eeeeeeee-0000-0000-0000-000000000001",
  });
}

const OUTPUT_BOM = { categoria: "duvida", confianca: 0.9 };

function adapterOk(usage = { input: 1000, output: 500 }) {
  return criarFakeAdapter({
    providerKey: "fixture",
    desfecho: { tipo: "ok", output: OUTPUT_BOM, usage, latencyMs: 42 },
  });
}

const PEDIDO = {
  taskType: TASK.taskType,
  taskVersion: TASK.taskVersion,
  input: { texto: "não consigo pagar" },
  organizationId: ORG_A,
};

beforeEach(() => {
  candidatos = [modelo()];
  precos = [preco()];
  abertos = [];
  concluidos = [];
  falhados = [];
  abrirDevolve = RUN_ID;
});

// ---------------------------------------------------------------------------
// A feature não escolhe modelo
// ---------------------------------------------------------------------------

describe("a feature entrega uma task, não um modelo", () => {
  it("o pedido não carrega provider nem modelo, e ainda assim executa", () => {
    // O tipo já impede: `AITaskRequest` não tem onde escrever provider/model.
    expect(Object.keys(PEDIDO).sort()).toEqual([
      "input",
      "organizationId",
      "taskType",
      "taskVersion",
    ]);
  });

  it("é o Router que resolve o modelo, a partir do catálogo", async () => {
    const adapter = adapterOk();
    const r = await router([adapter]).run(PEDIDO);

    expect(r.ok && r.modelKey).toBe("fixture-mini");
    expect(adapter.chamadas[0]?.modelKey).toBe("fixture-mini");
  });

  it("o adapter recebe prompt/schema version, nunca organização ou token", async () => {
    const adapter = adapterOk();
    await router([adapter]).run(PEDIDO);

    const chamada = adapter.chamadas[0];
    expect(chamada?.promptVersion).toBe("p1");
    expect(chamada?.schemaVersion).toBe("s1");
    expect(Object.keys(chamada ?? {}).sort()).toEqual([
      "input",
      "latencyClass",
      "modelKey",
      "promptVersion",
      "schemaVersion",
    ]);
  });
});

// ---------------------------------------------------------------------------
// Tier
// ---------------------------------------------------------------------------

describe("tiers", () => {
  it("task sem tier permitido não chega a consultar catálogo nem adapter", async () => {
    const adapter = adapterOk();
    const semTier: AITaskDefinition = { ...TASK, allowedTiers: [] };

    const r = await router([adapter], [semTier]).run(PEDIDO);

    // Tier 0 é o caminho determinístico: uma task que não declara tier de LLM
    // é uma tarefa que não deveria ter chegado a esta camada.
    expect(r).toEqual({ ok: false, errorClass: "NO_CANDIDATE_MODEL", runId: null });
    expect(adapter.chamadas).toHaveLength(0);
    expect(abertos).toHaveLength(0);
  });

  it("candidato de tier não permitido é descartado", async () => {
    candidatos = [modelo({ tier: 3 })];

    const r = await router([adapterOk()]).run(PEDIDO);

    expect(r).toEqual({ ok: false, errorClass: "NO_CANDIDATE_MODEL", runId: null });
  });

  it("entre tiers permitidos, o mais barato vem primeiro", async () => {
    candidatos = [
      modelo({ id: "m2", modelKey: "fixture-grande", tier: 2 }),
      modelo({ id: "m1", modelKey: "fixture-mini", tier: 1 }),
    ];

    const r = await router([adapterOk()]).run(PEDIDO);

    expect(r.ok && r.tier).toBe(1);
    expect(r.ok && r.modelKey).toBe("fixture-mini");
  });
});

// ---------------------------------------------------------------------------
// Status e capacidades
// ---------------------------------------------------------------------------

describe("seleção por status e capacidade", () => {
  it("modelo ACTIVE compatível é selecionado", async () => {
    const r = await router([adapterOk()]).run(PEDIDO);

    expect(r.ok).toBe(true);
    expect(abertos[0]?.aiModelId).toBe(MODELO_ID);
  });

  it("DEPRECATED não recebe tarefa nova", async () => {
    candidatos = [modelo({ status: "DEPRECATED" })];

    const r = await router([adapterOk()]).run(PEDIDO);

    expect(!r.ok && r.errorClass).toBe("NO_CANDIDATE_MODEL");
  });

  it("DISABLED não recebe tarefa nova", async () => {
    candidatos = [modelo({ status: "DISABLED" })];

    const r = await router([adapterOk()]).run(PEDIDO);

    expect(!r.ok && r.errorClass).toBe("NO_CANDIDATE_MODEL");
  });

  it("DEGRADED ainda é elegível, mas perde para um ACTIVE do mesmo tier", async () => {
    candidatos = [
      modelo({ id: "m1", modelKey: "a-degradado", status: "DEGRADED" }),
      modelo({ id: "m2", modelKey: "z-saudavel", status: "ACTIVE" }),
    ];

    const r = await router([adapterOk()]).run(PEDIDO);

    // Mesmo perdendo no desempate alfabético, o saudável vence.
    expect(r.ok && r.modelKey).toBe("z-saudavel");
  });

  it("provider DISABLED derruba o modelo mesmo ACTIVE", async () => {
    candidatos = [modelo({ providerStatus: "DISABLED" })];

    const r = await router([adapterOk()]).run(PEDIDO);

    expect(!r.ok && r.errorClass).toBe("NO_CANDIDATE_MODEL");
  });

  it("capacidade exigida ausente falha sem chamar o adapter", async () => {
    candidatos = [modelo({ capabilityTags: ["LOW_COST"] })];
    const adapter = adapterOk();

    const r = await router([adapter]).run(PEDIDO);

    expect(r).toEqual({ ok: false, errorClass: "NO_CANDIDATE_MODEL", runId: null });
    expect(adapter.chamadas).toHaveLength(0);
    expect(abertos).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Preço
// ---------------------------------------------------------------------------

describe("resolução de preço", () => {
  it("sem versão vigente, falha fechado antes do adapter", async () => {
    precos = [];
    const adapter = adapterOk();

    const r = await router([adapter]).run(PEDIDO);

    expect(r).toEqual({ ok: false, errorClass: "NO_PRICE_VERSION", runId: null });
    expect(adapter.chamadas).toHaveLength(0);
  });

  it("duas versões vigentes é ambiguidade, não escolha", async () => {
    precos = [preco({ id: "p1" }), preco({ id: "p2" })];
    const adapter = adapterOk();

    const r = await router([adapter]).run(PEDIDO);

    expect(!r.ok && r.errorClass).toBe("AMBIGUOUS_PRICE_VERSION");
    expect(adapter.chamadas).toHaveLength(0);
  });

  it("a versão usada fica registrada no run", async () => {
    await router([adapterOk()]).run(PEDIDO);

    expect(abertos[0]?.aiPriceVersionId).toBe(PRECO_ID);
  });
});

// ---------------------------------------------------------------------------
// Adapter ausente
// ---------------------------------------------------------------------------

describe("adapter", () => {
  it("sem adapter registrado, falha de forma auditável — e não cai em fake", async () => {
    // Uma aplicação que responde com dados inventados e custo zero é pior do
    // que uma que falha. E a falha de configuração fica registrada: o run já
    // estava aberto quando a ausência foi descoberta.
    const r = await router([]).run(PEDIDO);

    expect(r).toEqual({
      ok: false,
      errorClass: "ADAPTER_NOT_REGISTERED",
      runId: RUN_ID,
    });
    expect(concluidos).toHaveLength(0);
    expect(falhados[0]?.errorClass).toBe("ADAPTER_NOT_REGISTERED");
  });

  /**
   * A 004A mantinha este registro vazio porque não havia provider real. A 004E
   * registra o primeiro — e o que continua valendo é que ele seja **um**, com a
   * chave que existe no catálogo: um adapter registrado sob chave que o
   * catálogo não conhece nunca seria alcançado, e um provider do catálogo sem
   * adapter falha em `ADAPTER_NOT_REGISTERED` depois de já ter aberto run.
   */
  it("o registro de produção tem exatamente o provider catalogado", async () => {
    const { PRODUCTION_ADAPTERS } = await import("./adapter-registry");

    expect(PRODUCTION_ADAPTERS).toHaveLength(1);
    expect(PRODUCTION_ADAPTERS[0].providerKey).toBe("anthropic_claude");
  });
});

// ---------------------------------------------------------------------------
// Structured output
// ---------------------------------------------------------------------------

describe("structured output", () => {
  it("output válido passa no schema e conclui o run", async () => {
    const r = await router([adapterOk()]).run(PEDIDO);

    expect(r.ok && r.output).toEqual(OUTPUT_BOM);
    expect(concluidos).toHaveLength(1);
    expect(falhados).toHaveLength(0);
  });

  it("output inválido não atravessa a fronteira e vira run FAILED", async () => {
    const adapter = criarFakeAdapter({
      providerKey: "fixture",
      desfecho: {
        tipo: "ok",
        output: { categoria: 42, confianca: "muita" },
        usage: { input: 1000, output: 500 },
      },
    });

    const r = await router([adapter]).run(PEDIDO);

    expect(r).toEqual({
      ok: false,
      errorClass: "OUTPUT_SCHEMA_INVALID",
      runId: RUN_ID,
    });
    expect(concluidos).toHaveLength(0);
    expect(falhados[0]?.errorClass).toBe("OUTPUT_SCHEMA_INVALID");
  });

  it("output rejeitado ainda registra o custo consumido", async () => {
    const adapter = criarFakeAdapter({
      providerKey: "fixture",
      desfecho: { tipo: "ok", output: { nada: true }, usage: { input: 1000, output: 500 } },
    });

    await router([adapter]).run(PEDIDO);

    // A chamada gastou tokens mesmo produzindo lixo. Esconder isso faria a
    // conta do mês não fechar.
    expect(falhados[0]?.estimatedCost).toBe("0.000450000000");
    expect(falhados[0]?.currency).toBe("USD");
  });

  it("input inválido tem classe própria e falha antes do catálogo", async () => {
    const adapter = adapterOk();

    const r = await router([adapter]).run({ ...PEDIDO, input: { texto: 123 } });

    // Distinto de `OUTPUT_SCHEMA_INVALID`: um é erro de quem chamou, antes de
    // qualquer gasto; o outro é o provider devolvendo lixo depois de consumir
    // tokens.
    expect(r).toEqual({
      ok: false,
      errorClass: "INPUT_SCHEMA_INVALID",
      runId: null,
    });
    expect(adapter.chamadas).toHaveLength(0);
    expect(abertos).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Falha de provider
// ---------------------------------------------------------------------------

describe("falha de provider", () => {
  it("erro normalizado do adapter vira ledger de falha", async () => {
    const adapter = criarFakeAdapter({
      providerKey: "fixture",
      desfecho: { tipo: "erro", errorClass: "PROVIDER_RATE_LIMITED", latencyMs: 12 },
    });

    const r = await router([adapter]).run(PEDIDO);

    expect(r).toEqual({
      ok: false,
      errorClass: "PROVIDER_RATE_LIMITED",
      runId: RUN_ID,
    });
    expect(falhados[0]).toEqual({
      runId: RUN_ID,
      organizationId: ORG_A,
      errorClass: "PROVIDER_RATE_LIMITED",
      latencyMs: 12,
    });
  });

  it("adapter que lança não vaza a mensagem original", async () => {
    const adapter = criarFakeAdapter({
      providerKey: "fixture",
      desfecho: { tipo: "excecao" },
    });

    const r = await router([adapter]).run(PEDIDO);

    expect(r).toEqual({ ok: false, errorClass: "UNKNOWN", runId: RUN_ID });
    // A mensagem do provider — que pode citar credencial — não aparece em
    // lugar nenhum do que sai daqui.
    expect(JSON.stringify(r)).not.toContain("token-no-texto");
    expect(JSON.stringify(falhados)).not.toContain("token-no-texto");
  });

  it("ledger que não abre impede a chamada ao provider", async () => {
    abrirDevolve = null;
    const adapter = adapterOk();

    const r = await router([adapter]).run(PEDIDO);

    // Sem run aberto não há onde registrar o gasto — e um gasto que não pode
    // ser registrado não deve acontecer.
    expect(r).toEqual({
      ok: false,
      errorClass: "LEDGER_WRITE_FAILED",
      runId: null,
    });
    expect(adapter.chamadas).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Ledger
// ---------------------------------------------------------------------------

describe("ledger", () => {
  it("o run é aberto ANTES da chamada ao provider", async () => {
    const ordem: string[] = [];

    const adapter = criarFakeAdapter({
      providerKey: "fixture",
      desfecho: { tipo: "ok", output: OUTPUT_BOM, usage: { input: 10, output: 10 } },
    });
    const originalExecute = adapter.execute.bind(adapter);
    adapter.execute = async (req) => {
      ordem.push("provider");
      return originalExecute(req);
    };

    const ledgerOrdenado: AIRunLedger = {
      async abrir(input) {
        ordem.push("abrir");
        abertos.push(input);
        return RUN_ID;
      },
      async concluir(input) {
        ordem.push("concluir");
        concluidos.push(input);
        return true;
      },
      async falhar(input) {
        falhados.push(input);
        return true;
      },
    };

    await criarAIRouter({
      tasks: criarTaskRegistry([TASK]),
      catalog: catalogo,
      adapters: criarAdapterRegistry([adapter]),
      ledger: ledgerOrdenado,
      agora: () => AGORA,
    }).run(PEDIDO);

    // Se o processo morrer no meio de uma chamada paga, o gasto fica
    // registrado como iniciado em vez de desaparecer.
    expect(ordem).toEqual(["abrir", "provider", "concluir"]);
  });

  it("prompt_version e schema_version ficam no run", async () => {
    await router([adapterOk()]).run(PEDIDO);

    expect(abertos[0]?.promptVersion).toBe("p1");
    expect(abertos[0]?.schemaVersion).toBe("s1");
  });

  it("custo determinístico é registrado com a moeda", async () => {
    await router([adapterOk({ input: 1234, output: 567 })]).run(PEDIDO);

    expect(concluidos[0]?.estimatedCost).toBe("0.000525300000");
    expect(concluidos[0]?.currency).toBe("USD");
  });

  it("nenhum input, prompt ou output bruto entra no ledger", async () => {
    await router([adapterOk()]).run(PEDIDO);

    const registrado = JSON.stringify([abertos, concluidos, falhados]);

    expect(registrado).not.toContain("não consigo pagar");
    expect(registrado).not.toContain("duvida");
    for (const chave of ["input", "output", "prompt", "texto", "categoria"]) {
      expect(Object.keys(abertos[0] ?? {})).not.toContain(chave);
    }
  });

  it("a correlação do pedido é preservada quando informada", async () => {
    await router([adapterOk()]).run({
      ...PEDIDO,
      correlationId: "ffffffff-0000-0000-0000-000000000009",
    });

    expect(abertos[0]?.correlationId).toBe(
      "ffffffff-0000-0000-0000-000000000009",
    );
  });
});

// ---------------------------------------------------------------------------
// Escopo e tenancy
// ---------------------------------------------------------------------------

describe("escopo tenant/global", () => {
  it("task TENANT sem organização falha sem executar", async () => {
    const adapter = adapterOk();

    const r = await router([adapter]).run({ ...PEDIDO, organizationId: null });

    expect(r.ok).toBe(false);
    expect(adapter.chamadas).toHaveLength(0);
    expect(abertos).toHaveLength(0);
  });

  it("task GLOBAL com organização falha sem executar", async () => {
    const adapter = adapterOk();

    const r = await router([adapter]).run({
      taskType: TASK_GLOBAL.taskType,
      taskVersion: TASK_GLOBAL.taskVersion,
      input: { texto: "manutenção" },
      organizationId: ORG_A,
    });

    expect(r.ok).toBe(false);
    expect(adapter.chamadas).toHaveLength(0);
  });

  it("a organização do pedido é a que vai para o run", async () => {
    await router([adapterOk()]).run({ ...PEDIDO, organizationId: ORG_B });

    expect(abertos[0]?.organizationId).toBe(ORG_B);
  });

  it("fallback sem organização é recusado", async () => {
    // Sem organização, o banco não tem como provar que os dois runs pertencem
    // ao mesmo cliente — e um encadeamento não verificado não pode existir.
    const r = await router([adapterOk()]).run({
      taskType: TASK_GLOBAL.taskType,
      taskVersion: TASK_GLOBAL.taskVersion,
      input: { texto: "x" },
      organizationId: null,
      fallbackFromRunId: RUN_ID,
    });

    expect(r.ok).toBe(false);
    expect(abertos).toHaveLength(0);
  });

  it("fallback tenant-scoped propaga organização e run anterior", async () => {
    await router([adapterOk()]).run({
      ...PEDIDO,
      fallbackFromRunId: "99999999-0000-0000-0000-000000000001",
    });

    expect(abertos[0]?.organizationId).toBe(ORG_A);
    expect(abertos[0]?.fallbackFromRunId).toBe(
      "99999999-0000-0000-0000-000000000001",
    );
  });
});

// ---------------------------------------------------------------------------
// Registro de tasks
// ---------------------------------------------------------------------------

describe("registro de tasks", () => {
  it("task desconhecida não executa nada", async () => {
    const adapter = adapterOk();

    const r = await router([adapter]).run({
      ...PEDIDO,
      taskType: "fixture.inexistente",
    });

    expect(r.ok).toBe(false);
    expect(adapter.chamadas).toHaveLength(0);
  });

  it("versão diferente é outra task", async () => {
    const r = await router([adapterOk()]).run({ ...PEDIDO, taskVersion: "2" });

    expect(r.ok).toBe(false);
  });

  it("registrar a mesma task duas vezes é erro, não sobrescrita", () => {
    expect(() => criarTaskRegistry([TASK, TASK])).toThrow();
  });

  /**
   * A 004A não registrava task alguma: inventar uma feature só para ter o que
   * registrar produziria política que ninguém pediu. A 004E traz a primeira
   * task real, e o que se prova agora é que ela é uma só, versionada e de
   * escopo tenant — uma task de contexto de negócio sem organização seria um
   * vazamento esperando acontecer.
   */
  it("o registro de produção tem a task real, versionada e tenant-scoped", async () => {
    const { PRODUCTION_TASKS } = await import("./task-registry");

    expect(PRODUCTION_TASKS).toHaveLength(1);

    const task = PRODUCTION_TASKS[0];

    expect(task.taskType).toBe("DECLARED_BUSINESS_CONTEXT_REVIEW");
    expect(task.taskVersion).toBe("v1");
    expect(task.scope).toBe("TENANT");
    // Só Tier 1: a task é síntese do que já está estruturado, e permitir
    // escalada compraria raciocínio caro para trabalho que não o exige.
    expect(task.allowedTiers).toEqual([1]);
  });
});

// ---------------------------------------------------------------------------
// Correção 004A-01 — sucesso exige prova
// ---------------------------------------------------------------------------

/**
 * Correção 004E-05 §6.
 *
 * Uma resposta HTTP 200 é cobrada mesmo quando o produto não pode usá-la:
 * recusa do modelo, saída truncada, JSON malformado. Se o run fechasse como
 * falha sem tokens, a conta do mês teria chamadas pagas que o ledger não
 * conhece — e é o ledger que sustenta qualquer afirmação sobre custo.
 */
describe("falha cobrável registra custo", () => {
  /** Adapter que responde erro **com** usage: a chamada aconteceu e custou. */
  function adapterFalhaComUsage(
    errorClass: AIErrorClass,
    usage = { inputTokens: 1000, outputTokens: 500, cachedTokens: null },
  ) {
    return {
      providerKey: "fixture",
      async execute() {
        return { ok: false as const, errorClass, usage, latencyMs: 77 };
      },
    };
  }

  it("recusa do provider fecha o run com tokens, moeda e custo", async () => {
    const r = await router([adapterFalhaComUsage("PROVIDER_REJECTED")]).run(PEDIDO);

    expect(r.ok).toBe(false);
    expect(!r.ok && r.errorClass).toBe("PROVIDER_REJECTED");

    expect(falhados).toHaveLength(1);
    expect(falhados[0].inputTokens).toBe(1000);
    expect(falhados[0].outputTokens).toBe(500);
    expect(falhados[0].currency).toBe("USD");
    // 1000 * 0,15/1M + 500 * 0,60/1M = 0,00015 + 0,0003
    expect(falhados[0].estimatedCost).toBe("0.000450000000");
    expect(falhados[0].latencyMs).toBe(77);
  });

  /**
   * A classe original precisa sobreviver ao registro do custo: quem lê o
   * ledger tem de saber que houve recusa, não apenas que houve gasto.
   */
  it("preserva a classe de erro original ao registrar custo", async () => {
    await router([adapterFalhaComUsage("OUTPUT_SCHEMA_INVALID")]).run(PEDIDO);

    expect(falhados[0].errorClass).toBe("OUTPUT_SCHEMA_INVALID");
    expect(falhados[0].estimatedCost).toBe("0.000450000000");
  });

  it("stop reason inesperado também registra o que consumiu", async () => {
    await router([adapterFalhaComUsage("UNKNOWN")]).run(PEDIDO);

    expect(falhados[0].errorClass).toBe("UNKNOWN");
    expect(falhados[0].inputTokens).toBe(1000);
  });

  /**
   * Correção 004E-06 §4 — a recusa oficial da Anthropic, com o preço do Haiku
   * 4.5 vigente no catálogo (USD 1,00/MTok de input, USD 5,00/MTok de output).
   *
   * O ponto é aritmético e é o motivo da correção existir: saída zero zera a
   * parcela de output, não a conta. O run precisa fechar com o input conhecido
   * registrado — e com `PROVIDER_REJECTED`, para quem lê o ledger saber que
   * houve recusa, não apenas gasto.
   */
  it("recusa com saída zero registra o custo do input consumido", async () => {
    precos = [
      preco({
        inputPricePerMillion: "1.000000000000",
        outputPricePerMillion: "5.000000000000",
      }),
    ];

    const r = await router([
      adapterFalhaComUsage("PROVIDER_REJECTED", {
        inputTokens: 412,
        outputTokens: 0,
        cachedTokens: null,
      }),
    ]).run(PEDIDO);

    expect(!r.ok && r.errorClass).toBe("PROVIDER_REJECTED");

    expect(falhados).toHaveLength(1);
    expect(falhados[0].errorClass).toBe("PROVIDER_REJECTED");
    expect(falhados[0].inputTokens).toBe(412);
    expect(falhados[0].outputTokens).toBe(0);
    expect(falhados[0].currency).toBe("USD");

    // 412 * 1,00/1M + 0 * 5,00/1M = 0,000412. Zero de output não é conta zero.
    expect(falhados[0].estimatedCost).toBe("0.000412000000");
    expect(Number(falhados[0].estimatedCost)).toBeGreaterThan(0);
  });

  /**
   * `end_turn` com saída zero chega ao Router já classificado como
   * `USAGE_INVALID` pelo adapter — nunca como sucesso. O Router não descarta o
   * consumo por causa disso: o input foi gasto do mesmo jeito.
   */
  it("end_turn com saída zero não vira sucesso e ainda registra o input", async () => {
    const r = await router([
      adapterFalhaComUsage("USAGE_INVALID", {
        inputTokens: 412,
        outputTokens: 0,
        cachedTokens: null,
      }),
    ]).run(PEDIDO);

    expect(r.ok).toBe(false);
    expect(concluidos).toHaveLength(0);
    expect(falhados[0].errorClass).toBe("USAGE_INVALID");
    expect(falhados[0].inputTokens).toBe(412);
    expect(falhados[0].outputTokens).toBe(0);
    expect(Number(falhados[0].estimatedCost)).toBeGreaterThan(0);
  });

  /**
   * Sem resposta confiável não há consumo conhecido. Inventar tokens aqui
   * poluiria a conta com uma chamada que talvez nem tenha chegado ao provider.
   */
  it("falha sem usage não inventa custo", async () => {
    const adapter = criarFakeAdapter({
      providerKey: "fixture",
      desfecho: { tipo: "erro", errorClass: "PROVIDER_UNAVAILABLE" },
    });

    await router([adapter]).run(PEDIDO);

    expect(falhados).toHaveLength(1);
    expect(falhados[0].estimatedCost ?? null).toBeNull();
    expect(falhados[0].inputTokens ?? null).toBeNull();
  });

  /**
   * Usage veio, o custo não fechou. Registrar zero seria pior do que reportar a
   * falha de cálculo: a classe passa a ser a do custo, que é o problema mais
   * grave dos dois.
   */
  it("usage impossível não vira custo zero", async () => {
    const adapter = {
      providerKey: "fixture",
      async execute() {
        return {
          ok: false as const,
          errorClass: "PROVIDER_REJECTED" as const,
          usage: { inputTokens: -5, outputTokens: 500, cachedTokens: null },
          latencyMs: 10,
        };
      },
    };

    const r = await router([adapter]).run(PEDIDO);

    expect(!r.ok && r.errorClass).toBe("USAGE_INVALID");
    expect(falhados[0].estimatedCost ?? null).toBeNull();
  });

  it("sucesso continua registrando conclusão, não falha", async () => {
    const r = await router([adapterOk()]).run(PEDIDO);

    expect(r.ok).toBe(true);
    expect(falhados).toHaveLength(0);
    expect(concluidos).toHaveLength(1);
  });
});

describe("o ledger é a condição do sucesso", () => {
  it("conclusão não confirmada não vira sucesso", async () => {
    // O output existe, mas entregá-lo afirmaria uma execução que o sistema não
    // consegue provar — e o run ficaria `STARTED` para sempre.
    const ledgerMudo: AIRunLedger = {
      async abrir(i) {
        abertos.push(i);
        return RUN_ID;
      },
      async concluir(i) {
        concluidos.push(i);
        return false;
      },
      async falhar(i) {
        falhados.push(i);
        return true;
      },
    };

    const r = await criarAIRouter({
      tasks: criarTaskRegistry([TASK]),
      catalog: catalogo,
      adapters: criarAdapterRegistry([adapterOk()]),
      ledger: ledgerMudo,
      agora: () => AGORA,
    }).run(PEDIDO);

    expect(r).toEqual({
      ok: false,
      errorClass: "LEDGER_WRITE_FAILED",
      runId: RUN_ID,
    });
  });

  it("falha não registrada devolve a falha do próprio ledger", async () => {
    // Não conseguir registrar a falha é o problema mais grave dos dois, e é
    // ele que sobe.
    const ledgerMudo: AIRunLedger = {
      async abrir(i) {
        abertos.push(i);
        return RUN_ID;
      },
      async concluir(i) {
        concluidos.push(i);
        return true;
      },
      async falhar(i) {
        falhados.push(i);
        return false;
      },
    };

    const adapter = criarFakeAdapter({
      providerKey: "fixture",
      desfecho: { tipo: "erro", errorClass: "PROVIDER_UNAVAILABLE" },
    });

    const r = await criarAIRouter({
      tasks: criarTaskRegistry([TASK]),
      catalog: catalogo,
      adapters: criarAdapterRegistry([adapter]),
      ledger: ledgerMudo,
      agora: () => AGORA,
    }).run(PEDIDO);

    expect(r).toEqual({
      ok: false,
      errorClass: "LEDGER_WRITE_FAILED",
      runId: RUN_ID,
    });
  });

  it("a organização vai junto em toda mutação terminal", async () => {
    // É o filtro por organização que impede um `runId` vazado de outro tenant
    // de reescrever o ledger alheio — `service_role` ignora RLS.
    await router([adapterOk()]).run(PEDIDO);

    expect(concluidos[0]?.organizationId).toBe(ORG_A);
  });

  it("run global conclui com organização nula", async () => {
    await router([adapterOk()]).run({
      taskType: TASK_GLOBAL.taskType,
      taskVersion: TASK_GLOBAL.taskVersion,
      input: { texto: "manutenção" },
      organizationId: null,
    });

    expect(concluidos[0]?.organizationId).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Custo fail-closed
// ---------------------------------------------------------------------------

describe("custo desconhecido encerra a execução", () => {
  it("usage fracionário depois do adapter não vira SUCCEEDED", async () => {
    const adapter = criarFakeAdapter({
      providerKey: "fixture",
      desfecho: { tipo: "ok", output: OUTPUT_BOM, usage: { input: 1.5, output: 10 } },
    });

    const r = await router([adapter]).run(PEDIDO);

    expect(r).toEqual({ ok: false, errorClass: "USAGE_INVALID", runId: RUN_ID });
    expect(concluidos).toHaveLength(0);
    expect(falhados[0]?.errorClass).toBe("USAGE_INVALID");
  });

  it("usage negativo depois do adapter não vira SUCCEEDED", async () => {
    const adapter = criarFakeAdapter({
      providerKey: "fixture",
      desfecho: { tipo: "ok", output: OUTPUT_BOM, usage: { input: -1, output: 0 } },
    });

    const r = await router([adapter]).run(PEDIDO);

    expect(!r.ok && r.errorClass).toBe("USAGE_INVALID");
    expect(concluidos).toHaveLength(0);
  });

  it("preço ilegível não entrega o output como sucesso", async () => {
    // Concluir com custo nulo criaria uma chamada paga fora da conta do mês.
    precos = [preco({ inputPricePerMillion: "grátis" })];

    const r = await router([adapterOk()]).run(PEDIDO);

    expect(r).toEqual({
      ok: false,
      errorClass: "COST_CALCULATION_FAILED",
      runId: RUN_ID,
    });
    expect(concluidos).toHaveLength(0);
  });

  it("sucesso sempre carrega custo e moeda", async () => {
    const r = await router([adapterOk()]).run(PEDIDO);

    expect(r.ok && r.estimatedCost).toBeTruthy();
    expect(r.ok && r.currency).toBe("USD");
    expect(concluidos[0]?.estimatedCost).toBeTruthy();
    expect(concluidos[0]?.currency).toBe("USD");
  });
});

// ---------------------------------------------------------------------------
// Vigência de modelo
// ---------------------------------------------------------------------------

describe("vigência do catálogo", () => {
  it("o instante do Router é o mesmo passado ao catálogo", async () => {
    // Mesmo relógio para candidato e preço: usar dois tornaria a seleção
    // dependente do intervalo entre duas chamadas.
    await router([adapterOk()]).run(PEDIDO);

    expect(instanteRecebido).toEqual(AGORA);
  });

  it("modelo expirado não é selecionado mesmo continuando ACTIVE", async () => {
    // Status descreve saúde; vigência descreve se ainda deve ser usado. O
    // filtro real vive na query, e aqui se prova o contrato: o catálogo recebe
    // o instante e o Router respeita o que ele devolve.
    candidatos = [];

    const r = await router([adapterOk()]).run(PEDIDO);

    expect(!r.ok && r.errorClass).toBe("NO_CANDIDATE_MODEL");
  });
});
