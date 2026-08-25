import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Ledger de IA — provas da Correção 004A-01 §§4 e 11.
 *
 * O Supabase é um duplo que **aplica os filtros de verdade**: cada `.eq`/`.is`
 * vira um predicado sobre linhas em memória, e o `update` só toca as que casam.
 * Sem isso, o teste provaria que o código chama métodos, não que ele isola
 * tenant e recusa reescrita de run terminal.
 *
 * `service_role` é BYPASSRLS no projeto real, então o filtro por
 * `organization_id` **é** o isolamento — é ele que o duplo precisa exercitar.
 */

type Linha = {
  id: string;
  organization_id: string | null;
  status: string;
  [coluna: string]: unknown;
};

const ORG_A = "11111111-1111-1111-1111-111111111111";
const ORG_B = "22222222-2222-2222-2222-222222222222";
const RUN_A = "aaaaaaaa-0000-0000-0000-000000000001";
const RUN_GLOBAL = "aaaaaaaa-0000-0000-0000-000000000002";

let tabela: Linha[] = [];
let erroDoBanco: { code: string } | null = null;

type Predicado = (linha: Linha) => boolean;

function construtorDeUpdate(patch: Record<string, unknown>) {
  const filtros: Predicado[] = [];

  const builder = {
    eq(coluna: string, valor: unknown) {
      filtros.push((linha) => linha[coluna] === valor);
      return builder;
    },
    is(coluna: string, valor: null) {
      filtros.push((linha) => linha[coluna] === valor);
      return builder;
    },
    async select() {
      if (erroDoBanco) return { data: null, error: erroDoBanco };

      const atingidas = tabela.filter((linha) =>
        filtros.every((filtro) => filtro(linha)),
      );

      for (const linha of atingidas) Object.assign(linha, patch);

      return { data: atingidas.map((l) => ({ id: l.id })), error: null };
    },
  };

  return builder;
}

const supabaseFalso = {
  from: vi.fn(() => ({
    update: (patch: Record<string, unknown>) => construtorDeUpdate(patch),
    insert: (linha: Record<string, unknown>) => ({
      select: () => ({
        async maybeSingle() {
          if (erroDoBanco) return { data: null, error: erroDoBanco };
          const nova = { ...linha, id: "novo-run" } as Linha;
          tabela.push(nova);
          return { data: { id: nova.id }, error: null };
        },
      }),
    }),
  })),
};

vi.mock("@/lib/supabase/privileged", () => ({
  createSupabasePrivilegedClient: () => supabaseFalso,
}));

const { criarAIRunLedger } = await import("./run-ledger");

const ledger = criarAIRunLedger(
  supabaseFalso as unknown as Parameters<typeof criarAIRunLedger>[0],
);

const CONCLUSAO = {
  inputTokens: 100,
  outputTokens: 50,
  cachedTokens: null,
  estimatedCost: "0.000045000000",
  currency: "USD",
  latencyMs: 12,
  confidence: null,
};

beforeEach(() => {
  erroDoBanco = null;
  tabela = [
    { id: RUN_A, organization_id: ORG_A, status: "STARTED" },
    { id: RUN_GLOBAL, organization_id: null, status: "STARTED" },
  ];
});

describe("conclusão de run", () => {
  it("conclui o run do próprio tenant", async () => {
    const ok = await ledger.concluir({
      runId: RUN_A,
      organizationId: ORG_A,
      ...CONCLUSAO,
    });

    expect(ok).toBe(true);
    expect(tabela[0].status).toBe("SUCCEEDED");
    expect(tabela[0].estimated_cost).toBe("0.000045000000");
  });

  it("run inexistente não conta como sucesso", async () => {
    const ok = await ledger.concluir({
      runId: "99999999-0000-0000-0000-000000000009",
      organizationId: ORG_A,
      ...CONCLUSAO,
    });

    // Zero linhas afetadas é falha: quem chamou estava prestes a afirmar algo
    // que não aconteceu.
    expect(ok).toBe(false);
  });

  it("tenant B não conclui run do tenant A", async () => {
    const ok = await ledger.concluir({
      runId: RUN_A,
      organizationId: ORG_B,
      ...CONCLUSAO,
    });

    expect(ok).toBe(false);
    expect(tabela[0].status).toBe("STARTED");
  });

  it("escopo global não alcança run de tenant", async () => {
    const ok = await ledger.concluir({
      runId: RUN_A,
      organizationId: null,
      ...CONCLUSAO,
    });

    expect(ok).toBe(false);
    expect(tabela[0].status).toBe("STARTED");
  });

  it("run global é concluído com organização nula", async () => {
    const ok = await ledger.concluir({
      runId: RUN_GLOBAL,
      organizationId: null,
      ...CONCLUSAO,
    });

    expect(ok).toBe(true);
    expect(tabela[1].status).toBe("SUCCEEDED");
  });

  it("run terminal não é reescrito na segunda tentativa", async () => {
    await ledger.concluir({ runId: RUN_A, organizationId: ORG_A, ...CONCLUSAO });

    const segunda = await ledger.concluir({
      runId: RUN_A,
      organizationId: ORG_A,
      ...CONCLUSAO,
      estimatedCost: "9.999999999999",
    });

    expect(segunda).toBe(false);
    // O custo original permanece: o caminho normal da aplicação não reescreve
    // o passado do ledger.
    expect(tabela[0].estimated_cost).toBe("0.000045000000");
  });

  it("erro do banco é falha, não sucesso silencioso", async () => {
    erroDoBanco = { code: "42501" };

    const ok = await ledger.concluir({
      runId: RUN_A,
      organizationId: ORG_A,
      ...CONCLUSAO,
    });

    expect(ok).toBe(false);
  });
});

describe("registro de falha", () => {
  it("falha o run do próprio tenant", async () => {
    const ok = await ledger.falhar({
      runId: RUN_A,
      organizationId: ORG_A,
      errorClass: "PROVIDER_UNAVAILABLE",
      latencyMs: 5,
    });

    expect(ok).toBe(true);
    expect(tabela[0].status).toBe("FAILED");
    expect(tabela[0].error_class).toBe("PROVIDER_UNAVAILABLE");
  });

  it("tenant B não falha run do tenant A", async () => {
    const ok = await ledger.falhar({
      runId: RUN_A,
      organizationId: ORG_B,
      errorClass: "UNKNOWN",
      latencyMs: null,
    });

    expect(ok).toBe(false);
    expect(tabela[0].status).toBe("STARTED");
  });

  it("run já terminal não é marcado como falho depois", async () => {
    await ledger.concluir({ runId: RUN_A, organizationId: ORG_A, ...CONCLUSAO });

    const ok = await ledger.falhar({
      runId: RUN_A,
      organizationId: ORG_A,
      errorClass: "UNKNOWN",
      latencyMs: null,
    });

    expect(ok).toBe(false);
    expect(tabela[0].status).toBe("SUCCEEDED");
  });

  it("usage ausente fica nulo, não zero", async () => {
    await ledger.falhar({
      runId: RUN_A,
      organizationId: ORG_A,
      errorClass: "PROVIDER_UNAVAILABLE",
      latencyMs: null,
    });

    // `0` afirmaria que a chamada foi gratuita; ausência de dado é outra coisa.
    expect(tabela[0].input_tokens).toBeUndefined();
    expect(tabela[0].estimated_cost).toBeUndefined();
  });

  it("usage conhecido numa falha é preservado", async () => {
    await ledger.falhar({
      runId: RUN_A,
      organizationId: ORG_A,
      errorClass: "OUTPUT_SCHEMA_INVALID",
      latencyMs: 9,
      inputTokens: 1000,
      outputTokens: 500,
      cachedTokens: null,
      estimatedCost: "0.000450000000",
      currency: "USD",
    });

    // A chamada consumiu tokens mesmo produzindo lixo: o custo entra na conta.
    expect(tabela[0].input_tokens).toBe(1000);
    expect(tabela[0].estimated_cost).toBe("0.000450000000");
  });
});

describe("abertura de run", () => {
  it("nasce STARTED e sem hora de término", async () => {
    const id = await ledger.abrir({
      organizationId: ORG_A,
      correlationId: "cccccccc-0000-0000-0000-000000000001",
      taskType: "fixture.t",
      taskVersion: "1",
      providerId: "p",
      aiModelId: "m",
      aiPriceVersionId: "pv",
      tier: 1,
      promptVersion: "p1",
      schemaVersion: "s1",
    });

    expect(id).toBe("novo-run");
    const nova = tabela.find((l) => l.id === "novo-run");
    expect(nova?.status).toBe("STARTED");
    expect(nova?.completed_at).toBeUndefined();
  });

  it("erro na abertura devolve null em vez de id inventado", async () => {
    erroDoBanco = { code: "23503" };

    const id = await ledger.abrir({
      organizationId: ORG_A,
      correlationId: "cccccccc-0000-0000-0000-000000000001",
      taskType: "fixture.t",
      taskVersion: "1",
      providerId: "p",
      aiModelId: "m",
      aiPriceVersionId: "pv",
      tier: 1,
      promptVersion: "p1",
      schemaVersion: "s1",
    });

    expect(id).toBeNull();
  });
});
