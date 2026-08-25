import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DeclaredContextReview } from "@/lib/ai/tasks/declared-context-review";
import type { DeclaredContextSnapshot } from "./snapshot";

/**
 * Execução da revisão — Rodada 004E §§8, 9 e 13.
 *
 * Esta é a primeira feature do Quoron que gasta dinheiro real, e o que se prova
 * aqui é **quando ela não gasta**: cache antes de tudo, papel antes do provider,
 * teto horário medido no servidor, e grounding antes de qualquer coisa ser
 * exibida ou persistida.
 */

const ORG_A = "11111111-1111-1111-1111-111111111111";
const ORG_B = "22222222-2222-2222-2222-222222222222";

type LinhaReview = {
  id: string;
  organization_id: string;
  input_fingerprint: string;
  review_json: unknown;
  created_at: string;
};

let revisoes: LinhaReview[] = [];
let chamadasNaJanela = 0;
let erroAoContar = false;
let erroAoInserir = false;

/** Registra o que chegou ao insert, para provar o que é persistido. */
const inseridos: Record<string, unknown>[] = [];

const supabase = {
  from(tabela: string) {
    if (tabela === "declared_context_reviews") {
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
                if (erroAoInserir) {
                  return { data: null, error: { code: "23505" } };
                }

                const linha: LinhaReview = {
                  id: "review-1",
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
    }

    // `ai_runs`: contagem da janela do rate limit.
    const builder = {
      select: () => builder,
      eq: () => builder,
      gte: () => builder,
      then(resolve: (r: unknown) => void) {
        resolve({
          count: erroAoContar ? null : chamadasNaJanela,
          error: erroAoContar ? { code: "42501" } : null,
        });
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
    return { ok: false as const, errorClass: "PROVIDER_UNAVAILABLE" as const, runId: null };
  }

  return {
    ok: true as const,
    output: saidaDoRouter,
    runId: "run-1",
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

const { revisarContextoDeclarado, RATE_LIMIT_MAX_CHAMADAS } = await import(
  "./declared-context-review"
);

function snapshot(extra?: Partial<DeclaredContextSnapshot>): DeclaredContextSnapshot {
  return {
    snapshotVersion: "1",
    facts: [{ ref: "business.segment", label: "Segmento", value: "Barbearia" }],
    missingTopics: [],
    ...extra,
  };
}

async function revisar(input: {
  organizationId?: string;
  role?: string;
  snapshot?: DeclaredContextSnapshot;
}) {
  return revisarContextoDeclarado({
    organizationId: input.organizationId ?? ORG_A,
    role: input.role ?? "owner",
    snapshot: input.snapshot ?? snapshot(),
    deps: { supabase: supabase as never, router: router as never },
  });
}

beforeEach(() => {
  revisoes = [];
  chamadasNaJanela = 0;
  erroAoContar = false;
  erroAoInserir = false;
  inseridos.length = 0;
  saidaDoRouter = REVIEW_VALIDA;
  routerFalha = false;
  runDoRouter.mockClear();
});

describe("cache por fingerprint", () => {
  it("cria a revisão na primeira vez", async () => {
    const resultado = await revisar({});

    expect(resultado.kind).toBe("criada");
    expect(runDoRouter).toHaveBeenCalledTimes(1);
  });

  /** O ponto da rodada: a segunda visita não paga de novo. */
  it("reaproveita a revisão e não chama o provider outra vez", async () => {
    await revisar({});
    runDoRouter.mockClear();

    const segunda = await revisar({});

    expect(segunda.kind).toBe("cache");
    expect(runDoRouter).not.toHaveBeenCalled();
  });

  it("contexto diferente gera fingerprint novo e permite nova revisão", async () => {
    await revisar({});
    runDoRouter.mockClear();

    const outro = await revisar({
      snapshot: snapshot({
        facts: [{ ref: "business.segment", label: "Segmento", value: "Padaria" }],
      }),
    });

    expect(outro.kind).toBe("criada");
    expect(runDoRouter).toHaveBeenCalledTimes(1);
  });

  /** Reutilizar entre tenants vazaria o contexto de um negócio para outro. */
  it("não reutiliza cache entre organizações", async () => {
    await revisar({ organizationId: ORG_A });
    runDoRouter.mockClear();

    const outraOrg = await revisar({ organizationId: ORG_B });

    expect(outraOrg.kind).toBe("criada");
    expect(runDoRouter).toHaveBeenCalledTimes(1);
  });
});

describe("quem pode gerar custo", () => {
  it("member não chega ao provider", async () => {
    const resultado = await revisar({ role: "member" });

    expect(resultado.kind).toBe("sem-permissao");
    expect(runDoRouter).not.toHaveBeenCalled();
  });

  /** Ler o que já existe não custa nada e não exige papel de escrita. */
  it("member lê a revisão existente pelo cache", async () => {
    await revisar({ role: "owner" });
    runDoRouter.mockClear();

    const resultado = await revisar({ role: "member" });

    expect(resultado.kind).toBe("cache");
    expect(runDoRouter).not.toHaveBeenCalled();
  });
});

describe("limite de chamadas", () => {
  it("bloqueia a quarta chamada da hora sem chegar ao provider", async () => {
    chamadasNaJanela = RATE_LIMIT_MAX_CHAMADAS;

    const resultado = await revisar({});

    expect(resultado.kind).toBe("limite-atingido");
    expect(runDoRouter).not.toHaveBeenCalled();
  });

  it("permite enquanto está abaixo do teto", async () => {
    chamadasNaJanela = RATE_LIMIT_MAX_CHAMADAS - 1;

    const resultado = await revisar({});

    expect(resultado.kind).toBe("criada");
  });

  /**
   * Sem saber quantas chamadas já houve, permitir mais uma abriria o teto
   * justamente quando o sistema está cego.
   */
  it("falha ao contar não libera a chamada", async () => {
    erroAoContar = true;

    const resultado = await revisar({});

    expect(resultado.kind).toBe("erro-tecnico");
    expect(runDoRouter).not.toHaveBeenCalled();
  });
});

describe("grounding e persistência", () => {
  it("descarta revisão que cita evidência inexistente", async () => {
    saidaDoRouter = {
      ...REVIEW_VALIDA,
      declaredFacts: [
        { statement: "Inventado", evidenceRefs: ["business.faturamento"] },
      ],
    };

    const resultado = await revisar({});

    expect(resultado.kind).toBe("revisao-invalida");
    // Nada de inválido é persistido: o artefato é o que a tela vai mostrar.
    expect(inseridos).toHaveLength(0);
  });

  it("persiste snapshot, review e versões junto do run", async () => {
    await revisar({});

    expect(inseridos).toHaveLength(1);

    const gravado = inseridos[0];

    expect(gravado.organization_id).toBe(ORG_A);
    expect(gravado.ai_run_id).toBe("run-1");
    expect(gravado.task_version).toBe("v1");
    expect(gravado.prompt_version).toBe("v1");
    expect(gravado.schema_version).toBe("v1");
    expect(gravado.input_snapshot_json).toBeDefined();
    expect(gravado.review_json).toBeDefined();
  });

  it("falha do Router não vira revisão", async () => {
    routerFalha = true;

    const resultado = await revisar({});

    expect(resultado.kind).toBe("erro-tecnico");
    expect(inseridos).toHaveLength(0);
  });

  /**
   * A chamada já custou, mas o artefato não pôde ser guardado. Devolver a
   * revisão sem persistir faria o próximo acesso pagar de novo pela mesma
   * resposta.
   */
  it("falha ao persistir não é reportada como sucesso", async () => {
    erroAoInserir = true;

    const resultado = await revisar({});

    expect(resultado.kind).toBe("erro-tecnico");
  });

  it("o que vai ao Router é a task versionada, sem provider nem modelo", async () => {
    await revisar({});

    const [pedido] = runDoRouter.mock.calls[0] as unknown as [
      Record<string, unknown>,
    ];

    expect(pedido.taskType).toBe("DECLARED_BUSINESS_CONTEXT_REVIEW");
    expect(pedido.taskVersion).toBe("v1");
    expect(pedido.organizationId).toBe(ORG_A);
    expect(JSON.stringify(pedido)).not.toMatch(/gemini|google|model/i);
  });
});
