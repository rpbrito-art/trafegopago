/**
 * Prova E2E real da revisão de contexto declarado — Rodada 004E §15,
 * reescrita pela Correção 004E-01 §6.
 *
 * A versão anterior chamava o Router diretamente e não criava o artefato. Ela
 * provava que o provider responde; não provava o caminho que o produto usa —
 * reserva, grounding, persistência e cache.
 *
 * Esta versão chama o **serviço produtivo** e verifica, na ordem:
 *
 *   1. a revisão é criada;
 *   2. o artefato existe no banco, com `ai_run_id` do mesmo tenant;
 *   3. o modelo usado é o do catálogo, e o custo bate com a versão de preço;
 *   4. a segunda chamada com o mesmo contexto devolve cache;
 *   5. nenhum segundo `ai_run` e nenhuma segunda tentativa paga aparecem.
 *
 * Dados 100% sintéticos, organização temporária removida por cascade ao final.
 * A chave nunca é impressa, nem em erro, nem em log.
 *
 * Uso (com `GEMINI_API_KEY` e credenciais Supabase no ambiente):
 *   npm run e2e:review
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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SECRET = process.env.SUPABASE_SECRET_KEY;

if (!process.env.GEMINI_API_KEY) {
  console.error(
    [
      "GATE DE CREDENCIAL PAGA.",
      "",
      "GEMINI_API_KEY não está disponível neste runtime.",
      "A prova E2E exige uma chave de projeto no Paid Tier — o Free Tier não é",
      "autorizado para dados de clientes, e esta prova roda pelo caminho",
      "produtivo.",
      "",
      "Nada foi chamado. Nenhum custo foi gerado.",
    ].join("\n"),
  );
  process.exit(2);
}

if (!SUPABASE_URL || !SUPABASE_SECRET) {
  console.error("Credenciais do Supabase ausentes no ambiente. Nada foi chamado.");
  process.exit(2);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ---------------------------------------------------------------------------
// Fixture sintética
// ---------------------------------------------------------------------------

const sufixo = randomUUID().slice(0, 8);
const falhas = [];

function verificar(nome, condicao, detalhe) {
  if (condicao) {
    console.log(`[OK] ${nome}`);
    return;
  }

  falhas.push(nome);
  console.error(`[FALHOU] ${nome}`, detalhe ?? "");
}

async function criarFixture() {
  const { data: usuario, error: erroUsuario } = await supabase.auth.admin.createUser({
    email: `e2e-004e-${sufixo}@example.invalid`,
    password: randomUUID(),
    email_confirm: true,
  });

  if (erroUsuario) throw new Error(`falha ao criar usuário sintético: ${erroUsuario.status}`);

  const { data: org, error: erroOrg } = await supabase
    .from("organizations")
    .insert({ name: `E2E 004E ${sufixo}` })
    .select("id")
    .single();

  if (erroOrg) throw new Error(`falha ao criar organização: ${erroOrg.code}`);

  const { error: erroMembro } = await supabase
    .from("organization_members")
    .insert({
      organization_id: org.id,
      user_id: usuario.user.id,
      role: "owner",
      status: "ACTIVE",
    });

  if (erroMembro) throw new Error(`falha ao criar membership: ${erroMembro.code}`);

  return { organizationId: org.id, userId: usuario.user.id };
}

async function removerFixture({ organizationId, userId }) {
  // `on delete cascade` leva junto membros, runs, tentativas e a revisão.
  const { error } = await supabase
    .from("organizations")
    .delete()
    .eq("id", organizationId);

  if (error) console.error("ATENÇÃO: organização não removida", { code: error.code });

  const { error: erroUsuario } = await supabase.auth.admin.deleteUser(userId);

  if (erroUsuario) console.error("ATENÇÃO: usuário sintético não removido");
}

// ---------------------------------------------------------------------------
// Execução
// ---------------------------------------------------------------------------

const fixture = await criarFixture();

try {
  const { revisarContextoDeclarado } = await import(
    "../src/lib/review/declared-context-review.ts"
  );
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

  const primeira = await revisarContextoDeclarado({
    organizationId: fixture.organizationId,
    userId: fixture.userId,
    snapshot,
    deps: { supabase },
  });

  verificar("01 revisão criada pelo caminho produtivo", primeira.kind === "criada", primeira.kind);

  if (primeira.kind !== "criada") {
    throw new Error(`primeira revisão não foi criada: ${primeira.kind}`);
  }

  // ------------------------------------------------------------- artefato
  const { data: artefato } = await supabase
    .from("declared_context_reviews")
    .select("id, organization_id, ai_run_id, input_fingerprint, review_json")
    .eq("id", primeira.review.id)
    .single();

  verificar("02 artefato persistido no banco", Boolean(artefato));
  verificar(
    "03 artefato pertence ao tenant da fixture",
    artefato?.organization_id === fixture.organizationId,
  );

  const { data: run } = await supabase
    .from("ai_runs")
    .select(
      "id, organization_id, status, input_tokens, output_tokens, cached_tokens, estimated_cost, currency, ai_model_id, ai_price_version_id",
    )
    .eq("id", artefato?.ai_run_id)
    .single();

  verificar("04 run do artefato é do mesmo tenant", run?.organization_id === fixture.organizationId);
  verificar("05 run concluído com sucesso", run?.status === "SUCCEEDED", run?.status);

  const { data: modelo } = await supabase
    .from("ai_models")
    .select("model_key, ai_providers!inner(key)")
    .eq("id", run?.ai_model_id)
    .single();

  verificar(
    "06 modelo usado é o catalogado",
    modelo?.model_key === "gemini-2.5-flash-lite",
    modelo?.model_key,
  );

  // --------------------------------------------------------------- custo
  const { data: preco } = await supabase
    .from("ai_price_versions")
    .select("input_price_per_million, output_price_per_million, currency")
    .eq("id", run?.ai_price_version_id)
    .single();

  verificar("07 usage registrado", Number(run?.input_tokens) > 0 && Number(run?.output_tokens) > 0);
  verificar("08 custo registrado na moeda do preço", run?.currency === preco?.currency);

  // Reprodução do custo pela versão de preço, em centavos de milionésimo para
  // evitar float: (tokens * preço) / 1e6.
  const esperado =
    (BigInt(run?.input_tokens ?? 0) * BigInt(Math.round(Number(preco?.input_price_per_million) * 1e12)) +
      BigInt(run?.output_tokens ?? 0) * BigInt(Math.round(Number(preco?.output_price_per_million) * 1e12))) /
    1_000_000n;

  const registrado = BigInt(Math.round(Number(run?.estimated_cost) * 1e12));

  // Tolerância de uma unidade na última casa: o banco arredonda `numeric`.
  const diferenca = esperado > registrado ? esperado - registrado : registrado - esperado;

  verificar(
    "09 custo reproduzível pela versão de preço",
    diferenca <= 1n,
    { esperado: esperado.toString(), registrado: registrado.toString() },
  );

  // --------------------------------------------------------------- cache
  const segunda = await revisarContextoDeclarado({
    organizationId: fixture.organizationId,
    userId: fixture.userId,
    snapshot,
    deps: { supabase },
  });

  verificar("10 segunda chamada devolve cache", segunda.kind === "cache", segunda.kind);

  const { count: runs } = await supabase
    .from("ai_runs")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", fixture.organizationId);

  verificar("11 nenhum segundo run foi criado", runs === 1, runs);

  const { count: tentativas } = await supabase
    .from("declared_context_review_attempts")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", fixture.organizationId);

  verificar("12 nenhuma segunda tentativa paga foi reservada", tentativas === 1, tentativas);

  console.log(
    JSON.stringify(
      {
        prova: "E2E 004E — revisão de contexto declarado",
        modelo: modelo?.model_key,
        runId: run?.id,
        usage: {
          inputTokens: run?.input_tokens,
          outputTokens: run?.output_tokens,
          cachedTokens: run?.cached_tokens,
        },
        custo: { estimado: run?.estimated_cost, moeda: run?.currency },
        // Conteúdo sintético, truncado: o relatório não precisa do texto
        // inteiro para provar que houve resposta.
        resumo: String(primeira.review.review.summary).slice(0, 160),
        declaredFacts: primeira.review.review.declaredFacts.length,
        gaps: primeira.review.review.gaps.length,
        tensions: primeira.review.review.tensions.length,
        casos: 12,
        falharam: falhas.length,
      },
      null,
      2,
    ),
  );

  if (falhas.length > 0) process.exitCode = 1;
} finally {
  await removerFixture(fixture);
}
