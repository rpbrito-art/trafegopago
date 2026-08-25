/**
 * Prova E2E real da revisão de contexto declarado — Rodada 004E §15.
 *
 * Executa o caminho produtivo inteiro contra o provider pago: catálogo do
 * banco → Router → adapter Gemini → structured output → `ai_run` com usage e
 * custo → grounding → artefato persistido.
 *
 * Regras desta prova:
 *
 * - dados **100% sintéticos**, de `test/support/declared-context-fixtures.ts`;
 * - organização temporária, removida ao final por cascade;
 * - a chave nunca é impressa, nem em erro, nem em log;
 * - se a chave não existir, o script para com instrução de gate, sem tentar
 *   nada.
 *
 * Uso (com `GEMINI_API_KEY` e credenciais Supabase no ambiente):
 *   node scripts/e2e-declared-context-review.mjs
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Ambiente
// ---------------------------------------------------------------------------

function carregarEnvLocal() {
  try {
    const conteudo = readFileSync(".env.local", "utf8");

    for (const linha of conteudo.split(/\r?\n/)) {
      const par = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (!par) continue;

      const [, chave, bruto] = par;
      if (process.env[chave]) continue;

      process.env[chave] = bruto.replace(/^["']|["']$/g, "").trim();
    }
  } catch {
    // Sem `.env.local` seguimos com o que o ambiente já tiver.
  }
}

carregarEnvLocal();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SECRET = process.env.SUPABASE_SECRET_KEY;

if (!GEMINI_API_KEY) {
  console.error(
    [
      "GATE DE CREDENCIAL PAGA.",
      "",
      "GEMINI_API_KEY não está disponível neste runtime.",
      "A prova E2E real exige uma chave de projeto no Paid Tier — o Free Tier",
      "não é autorizado para dados de clientes, e esta prova roda pelo caminho",
      "produtivo.",
      "",
      "Nada foi chamado. Nenhum custo foi gerado.",
    ].join("\n"),
  );
  process.exit(2);
}

if (!SUPABASE_URL || !SUPABASE_SECRET) {
  console.error(
    "Credenciais do Supabase ausentes no ambiente. Nada foi chamado.",
  );
  process.exit(2);
}

// ---------------------------------------------------------------------------
// Fixture sintética
// ---------------------------------------------------------------------------

const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const sufixo = randomUUID().slice(0, 8);

async function criarFixture() {
  const { data: org, error: erroOrg } = await supabase
    .from("organizations")
    .insert({ name: `E2E 004E ${sufixo}` })
    .select("id")
    .single();

  if (erroOrg) throw new Error(`falha ao criar organização: ${erroOrg.code}`);

  return org.id;
}

async function removerFixture(organizationId) {
  // `on delete cascade` leva junto membros, objetivo, ofertas, runs e a
  // revisão: a fixture não deixa rastro no tenant real.
  const { error } = await supabase
    .from("organizations")
    .delete()
    .eq("id", organizationId);

  if (error) {
    console.error("ATENÇÃO: fixture não removida", { code: error.code });
  }
}

// ---------------------------------------------------------------------------
// Execução
// ---------------------------------------------------------------------------

const organizationId = await criarFixture();

try {
  // O import é dinâmico e vem **depois** da fixture existir: estes módulos são
  // `server-only` e carregam o registro de produção.
  const { criarAIRouter } = await import("../src/lib/ai/router.ts");
  const { criarAICatalog } = await import("../src/lib/ai/catalog.ts");
  const { criarAIRunLedger } = await import("../src/lib/ai/run-ledger.ts");
  const { criarAdapterRegistry, PRODUCTION_ADAPTERS } = await import(
    "../src/lib/ai/adapter-registry.ts"
  );
  const { criarTaskRegistry, PRODUCTION_TASKS } = await import(
    "../src/lib/ai/task-registry.ts"
  );
  const { validarGrounding, DECLARED_CONTEXT_REVIEW_TASK_TYPE, DECLARED_CONTEXT_REVIEW_TASK_VERSION } =
    await import("../src/lib/ai/tasks/declared-context-review.ts");
  const { montarSnapshotDeclarado } = await import(
    "../src/lib/review/context-snapshot-builder.ts"
  );
  const { CASOS_DE_EVAL } = await import(
    "../test/support/declared-context-fixtures.ts"
  );

  const caso = CASOS_DE_EVAL[0];

  const snapshot = montarSnapshotDeclarado({
    account: caso.conta,
    objetivo: caso.objetivo,
    ofertas: caso.ofertas,
  });

  const router = criarAIRouter({
    tasks: criarTaskRegistry(PRODUCTION_TASKS),
    catalog: criarAICatalog(supabase),
    adapters: criarAdapterRegistry(PRODUCTION_ADAPTERS),
    ledger: criarAIRunLedger(supabase),
  });

  const resultado = await router.run({
    taskType: DECLARED_CONTEXT_REVIEW_TASK_TYPE,
    taskVersion: DECLARED_CONTEXT_REVIEW_TASK_VERSION,
    input: snapshot,
    organizationId,
  });

  if (!resultado.ok) {
    console.error("PROVA E2E FALHOU", { errorClass: resultado.errorClass });
    process.exitCode = 1;
  } else {
    const grounding = validarGrounding(resultado.output, snapshot);

    const { data: run } = await supabase
      .from("ai_runs")
      .select(
        "id, status, input_tokens, output_tokens, cached_tokens, estimated_cost, currency, ai_model_id",
      )
      .eq("id", resultado.runId)
      .single();

    console.log(
      JSON.stringify(
        {
          prova: "E2E 004E — revisão de contexto declarado",
          modelo: resultado.modelKey,
          tier: resultado.tier,
          runId: resultado.runId,
          status: run?.status,
          usage: {
            inputTokens: run?.input_tokens,
            outputTokens: run?.output_tokens,
            cachedTokens: run?.cached_tokens,
          },
          custo: { estimado: run?.estimated_cost, moeda: run?.currency },
          grounding: grounding.ok ? "ok" : grounding.motivo,
          // O conteúdo é sintético, mas o resumo entra truncado: o relatório
          // não precisa do texto inteiro para provar que houve resposta.
          resumo: String(resultado.output.summary).slice(0, 160),
          declaredFacts: resultado.output.declaredFacts.length,
          gaps: resultado.output.gaps.length,
          tensions: resultado.output.tensions.length,
        },
        null,
        2,
      ),
    );

    if (!grounding.ok) process.exitCode = 1;
  }
} finally {
  await removerFixture(organizationId);
}
