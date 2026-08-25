import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DeclaredContextReview } from "@/lib/ai/tasks/declared-context-review";
import type { DeclaredContextSnapshot } from "./snapshot";

/**
 * Execução da revisão — Rodada 004E §§8–9 e Correção 004E-01 §4.
 *
 * Esta é a primeira feature do Quoron que gasta dinheiro real, e o que se prova
 * aqui é **quando ela não gasta**.
 *
 * A diferença em relação à versão auditada: os testes de limite agora exercitam
 * **concorrência**, não sequência. Um teste sequencial passava com o código
 * antigo, que chamava o provider duas vezes quando duas requisições chegavam
 * juntas. O fake da reserva abaixo reproduz a atomicidade que a RPC garante no
 * banco — índice único para o in-flight e contagem sob lock.
 */

const ORG_A = "11111111-1111-1111-1111-111111111111";
const ORG_B = "22222222-2222-2222-2222-222222222222";
const USER = "33333333-3333-3333-3333-333333333333";

const MAX_POR_HORA = 3;

type LinhaReview = {
  id: string;
  organization_id: string;
  input_fingerprint: string;
  review_json: unknown;
  created_at: string;
};

type Tentativa = {
  id: string;
  organizationId: string;
  fingerprint: string;
  status: "RESERVED" | "COMPLETED" | "FAILED" | "EXPIRED";
  expirada: boolean;
};

let revisoes: LinhaReview[] = [];
let tentativas: Tentativa[] = [];
let papel = "owner";
let erroNaReserva = false;
let erroAoInserir = false;

const inseridos: Record<string, unknown>[] = [];
const finalizacoes: Record<string, unknown>[] = [];

let proximoId = 0;

/**
 * Reproduz a RPC de reserva.
 *
 * A implementação é síncrona de propósito: no banco, tudo isto acontece sob um
 * advisory lock por organização, e uma versão "assíncrona" aqui esconderia
 * justamente a corrida que o teste precisa provar que não existe mais.
 */
function adquirirSlot(organizationId: string, fingerprint: string) {
  if (erroNaReserva) return { data: null, error: { code: "XX000" } };

  if (papel !== "owner" && papel !== "admin") {
    return { data: null, error: { code: "42501" } };
  }

  for (const tentativa of tentativas) {
    if (tentativa.status === "RESERVED" && tentativa.expirada) {
      tentativa.status = "EXPIRED";
    }
  }

  const temCache = revisoes.some(
    (linha) =>
      linha.organization_id === organizationId &&
      linha.input_fingerprint === fingerprint,
  );

  if (temCache) return { data: [{ outcome: "CACHE", attempt_id: null }], error: null };

  const inFlight = tentativas.some(
    (t) =>
      t.organizationId === organizationId &&
      t.fingerprint === fingerprint &&
      t.status === "RESERVED",
  );

  if (inFlight) {
    return { data: [{ outcome: "IN_FLIGHT", attempt_id: null }], error: null };
  }

  const naJanela = tentativas.filter((t) => t.organizationId === organizationId);

  if (naJanela.length >= MAX_POR_HORA) {
    return { data: [{ outcome: "RATE_LIMITED", attempt_id: null }], error: null };
  }

  const id = `tentativa-${++proximoId}`;
  tentativas.push({
    id,
    organizationId,
    fingerprint,
    status: "RESERVED",
    expirada: false,
  });

  return { data: [{ outcome: "RESERVED", attempt_id: id }], error: null };
}

const supabase = {
  rpc(nome: string, args: Record<string, unknown>) {
    if (nome === "acquire_declared_context_review_slot") {
      const resposta = adquirirSlot(
        String(args.p_organization_id),
        String(args.p_input_fingerprint),
      );
      return Promise.resolve(resposta);
    }

    if (nome === "finalize_declared_context_review_attempt") {
      finalizacoes.push(args);

      const tentativa = tentativas.find((t) => t.id === args.p_attempt_id);
      if (tentativa && tentativa.status === "RESERVED") {
        tentativa.status = args.p_status as Tentativa["status"];
      }

      return Promise.resolve({ data: true, error: null });
    }

    return Promise.resolve({ data: null, error: { code: "42883" } });
  },

  from(tabela: string) {
    if (tabela !== "declared_context_reviews") {
      throw new Error(`tabela inesperada: ${tabela}`);
    }

    const filtros: Record<string, string> = {};

    const builder = {
      select: () => builder,
      eq(coluna: string, valor: string) {
        filtros[coluna] = valor;
        return builder;
      },
      async maybeSingle() {
        const achada = revisoes.find(
          (linha) =>
            linha.organization_id === filtros.organization_id &&
            linha.input_fingerprint === filtros.input_fingerprint,
        );
        return { data: achada ?? null, error: null };
      },
      insert(valores: Record<string, unknown>) {
        inseridos.push(valores);

        return {
          select: () => ({
            async single() {
              if (erroAoInserir) return { data: null, error: { code: "23505" } };

              const linha: LinhaReview = {
                id: `review-${revisoes.length + 1}`,
                organization_id: String(valores.organization_id),
                input_fingerprint: String(valores.input_fingerprint),
                review_json: valores.review_json,
                created_at: "2026-08-25T12:00:00.000Z",
              };
              revisoes.push(linha);

              return { data: linha, error: null };
            },
          }),
        };
      },
    };

    return builder;
  },
};

const REVIEW_VALIDA: DeclaredContextReview = {
  summary: "Você tem uma barbearia em Campinas.",
  declaredFacts: [
    { statement: "Barbearia em Campinas.", evidenceRefs: ["business.segment"] },
  ],
  gaps: [],
  tensions: [],
  nextQuestion: null,
  limitations: ["Baseado apenas no que você informou."],
};

let saidaDoRouter: unknown = REVIEW_VALIDA;
let routerFalha = false;

const runDoRouter = vi.fn(async () => {
  if (routerFalha) {
    return {
      ok: false as const,
      errorClass: "PROVIDER_UNAVAILABLE" as const,
      runId: "run-falho",
    };
  }

  return {
    ok: true as const,
    output: saidaDoRouter,
    runId: `run-${runDoRouter.mock.calls.length}`,
    modelKey: "modelo-do-catalogo",
    tier: 1 as const,
    estimatedCost: "0.000123",
    currency: "USD",
  };
});

const router = { run: runDoRouter };

vi.mock("@/lib/supabase/privileged", () => ({
  createSupabasePrivilegedClient: () => supabase,
}));

const { revisarContextoDeclarado } = await import("./declared-context-review");

function snapshot(valor = "Barbearia"): DeclaredContextSnapshot {
  return {
    snapshotVersion: "1",
    facts: [{ ref: "business.segment", label: "Segmento", value: valor }],
    missingTopics: [],
  };
}

async function revisar(input: {
  organizationId?: string;
  snapshot?: DeclaredContextSnapshot;
} = {}) {
  return revisarContextoDeclarado({
    organizationId: input.organizationId ?? ORG_A,
    userId: USER,
    snapshot: input.snapshot ?? snapshot(),
    deps: { supabase: supabase as never, router: router as never },
  });
}

beforeEach(() => {
  revisoes = [];
  tentativas = [];
  papel = "owner";
  erroNaReserva = false;
  erroAoInserir = false;
  inseridos.length = 0;
  finalizacoes.length = 0;
  proximoId = 0;
  saidaDoRouter = REVIEW_VALIDA;
  routerFalha = false;
  runDoRouter.mockClear();
});

describe("cache por fingerprint", () => {
  it("cria a revisão na primeira vez", async () => {
    const resultado = await revisar();

    expect(resultado.kind).toBe("criada");
    expect(runDoRouter).toHaveBeenCalledTimes(1);
  });

  it("reaproveita a revisão e não chama o provider outra vez", async () => {
    await revisar();
    runDoRouter.mockClear();

    const segunda = await revisar();

    expect(segunda.kind).toBe("cache");
    expect(runDoRouter).not.toHaveBeenCalled();
  });

  it("contexto diferente gera fingerprint novo e permite nova revisão", async () => {
    await revisar();
    runDoRouter.mockClear();

    const outro = await revisar({ snapshot: snapshot("Padaria") });

    expect(outro.kind).toBe("criada");
    expect(runDoRouter).toHaveBeenCalledTimes(1);
  });

  it("não reutiliza cache entre organizações", async () => {
    await revisar({ organizationId: ORG_A });
    runDoRouter.mockClear();

    const outraOrg = await revisar({ organizationId: ORG_B });

    expect(outraOrg.kind).toBe("criada");
    expect(runDoRouter).toHaveBeenCalledTimes(1);
  });

  /** Cache vence a reserva: existindo revisão, ninguém chega ao provider. */
  it("cache impede a reserva de autorizar chamada", async () => {
    await revisar();
    const antes = tentativas.length;
    runDoRouter.mockClear();

    await revisar();

    expect(runDoRouter).not.toHaveBeenCalled();
    expect(tentativas).toHaveLength(antes);
  });
});

describe("concorrência", () => {
  /**
   * O caso que o código auditado errava: duas requisições simultâneas para o
   * mesmo contexto encontravam o mesmo "sem cache" e as duas pagavam.
   */
  it("duas chamadas simultâneas do mesmo contexto: só uma chega ao provider", async () => {
    const [a, b] = await Promise.all([revisar(), revisar()]);

    expect(runDoRouter).toHaveBeenCalledTimes(1);

    const desfechos = [a.kind, b.kind].sort();
    expect(desfechos).toEqual(["criada", "em-andamento"]);
  });

  it("quatro contextos simultâneos: no máximo três adquirem reserva", async () => {
    await Promise.all([
      revisar({ snapshot: snapshot("A") }),
      revisar({ snapshot: snapshot("B") }),
      revisar({ snapshot: snapshot("C") }),
      revisar({ snapshot: snapshot("D") }),
    ]);

    expect(runDoRouter.mock.calls.length).toBeLessThanOrEqual(MAX_POR_HORA);
    expect(
      tentativas.filter((t) => t.organizationId === ORG_A),
    ).toHaveLength(MAX_POR_HORA);
  });

  it("um tenant não consome a cota do outro", async () => {
    await Promise.all([
      revisar({ organizationId: ORG_A, snapshot: snapshot("A1") }),
      revisar({ organizationId: ORG_A, snapshot: snapshot("A2") }),
      revisar({ organizationId: ORG_A, snapshot: snapshot("A3") }),
    ]);

    runDoRouter.mockClear();

    const outroTenant = await revisar({
      organizationId: ORG_B,
      snapshot: snapshot("B1"),
    });

    expect(outroTenant.kind).toBe("criada");
    expect(runDoRouter).toHaveBeenCalledTimes(1);
  });

  /** Reserva órfã não pode travar o contexto para sempre. */
  it("reserva vencida é recuperável", async () => {
    routerFalha = true;
    await revisar();

    // A tentativa ficou pendurada como se o processo tivesse morrido.
    tentativas[0].status = "RESERVED";
    tentativas[0].expirada = true;
    tentativas.length = 1;
    routerFalha = false;
    runDoRouter.mockClear();

    const retomada = await revisar();

    expect(retomada.kind).toBe("criada");
    expect(runDoRouter).toHaveBeenCalledTimes(1);
  });
});

describe("limite e permissão", () => {
  it("bloqueia a quarta tentativa da hora sem chegar ao provider", async () => {
    await revisar({ snapshot: snapshot("A") });
    await revisar({ snapshot: snapshot("B") });
    await revisar({ snapshot: snapshot("C") });
    runDoRouter.mockClear();

    const quarta = await revisar({ snapshot: snapshot("D") });

    expect(quarta.kind).toBe("limite-atingido");
    expect(runDoRouter).not.toHaveBeenCalled();
  });

  /**
   * Uma tentativa que falhou continua consumindo cota: o que custa é ter
   * chegado a chamar, não o resultado.
   */
  it("tentativa falha continua contando no teto", async () => {
    routerFalha = true;
    await revisar({ snapshot: snapshot("A") });
    await revisar({ snapshot: snapshot("B") });
    await revisar({ snapshot: snapshot("C") });
    routerFalha = false;
    runDoRouter.mockClear();

    const quarta = await revisar({ snapshot: snapshot("D") });

    expect(quarta.kind).toBe("limite-atingido");
    expect(runDoRouter).not.toHaveBeenCalled();
  });

  it("member não chega ao provider", async () => {
    papel = "member";

    const resultado = await revisar();

    expect(resultado.kind).toBe("sem-permissao");
    expect(runDoRouter).not.toHaveBeenCalled();
  });

  it("member lê a revisão existente pelo cache", async () => {
    await revisar();
    papel = "member";
    runDoRouter.mockClear();

    const resultado = await revisar();

    expect(resultado.kind).toBe("cache");
    expect(runDoRouter).not.toHaveBeenCalled();
  });

  /** Sem saber se há vaga, permitir a chamada abriria o teto às cegas. */
  it("falha ao adquirir reserva falha fechado", async () => {
    erroNaReserva = true;

    const resultado = await revisar();

    expect(resultado.kind).toBe("erro-tecnico");
    expect(runDoRouter).not.toHaveBeenCalled();
  });
});

describe("grounding, persistência e fechamento da reserva", () => {
  it("descarta revisão que cita evidência inexistente", async () => {
    saidaDoRouter = {
      ...REVIEW_VALIDA,
      declaredFacts: [
        { statement: "Inventado", evidenceRefs: ["business.faturamento"] },
      ],
    };

    const resultado = await revisar();

    expect(resultado.kind).toBe("revisao-invalida");
    expect(inseridos).toHaveLength(0);
    expect(finalizacoes[0]?.p_status).toBe("FAILED");
  });

  it("persiste snapshot, review e versões junto do run", async () => {
    await revisar();

    expect(inseridos).toHaveLength(1);

    const gravado = inseridos[0];

    expect(gravado.organization_id).toBe(ORG_A);
    expect(gravado.task_version).toBe("v1");
    expect(gravado.prompt_version).toBe("v1");
    expect(gravado.schema_version).toBe("v1");
    expect(gravado.input_snapshot_json).toBeDefined();
    expect(gravado.review_json).toBeDefined();
  });

  it("sucesso fecha a reserva como concluída e associa o run", async () => {
    await revisar();

    expect(finalizacoes).toHaveLength(1);
    expect(finalizacoes[0].p_status).toBe("COMPLETED");
    expect(finalizacoes[0].p_ai_run_id).toBe("run-1");
  });

  it("falha do Router fecha a reserva e não vira revisão", async () => {
    routerFalha = true;

    const resultado = await revisar();

    expect(resultado.kind).toBe("erro-tecnico");
    expect(inseridos).toHaveLength(0);
    expect(finalizacoes[0]?.p_status).toBe("FAILED");
  });

  it("falha ao persistir não é reportada como sucesso", async () => {
    erroAoInserir = true;

    const resultado = await revisar();

    expect(resultado.kind).toBe("erro-tecnico");
    expect(finalizacoes[0]?.p_status).toBe("FAILED");
  });

  it("o que vai ao Router é a task versionada, sem provider nem modelo", async () => {
    await revisar();

    const [pedido] = runDoRouter.mock.calls[0] as unknown as [
      Record<string, unknown>,
    ];

    expect(pedido.taskType).toBe("DECLARED_BUSINESS_CONTEXT_REVIEW");
    expect(pedido.taskVersion).toBe("v1");
    expect(pedido.organizationId).toBe(ORG_A);
    expect(JSON.stringify(pedido)).not.toMatch(/gemini|google|model/i);
  });
});
