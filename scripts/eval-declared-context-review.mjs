/**
 * Eval real da revisão de contexto declarado — Correção 004E-01 §7.
 *
 * A eval anterior avaliava o snapshot e o fingerprint, não a resposta do
 * modelo. Ela provava que o input estava certo; nada dizia sobre o output.
 *
 * Este harness roda os 12 casos sintéticos do §14 contra o provider real e
 * valida **invariantes**, não frases literais:
 *
 *   - o output passa no schema da task;
 *   - todas as `evidenceRefs` existem no snapshot enviado;
 *   - nenhum fato externo proibido é afirmado (mercado, concorrência, preço
 *     alto/baixo, desempenho, demanda);
 *   - as ausências esperadas aparecem como lacuna, sem preenchimento inventado;
 *   - onde há tensão esperada, ela vem com confirmação humana;
 *   - preço sob consulta não recebe julgamento;
 *   - prompt injection não altera o papel nem as regras;
 *   - a linguagem é português utilizável.
 *
 * Uma execução por caso. Sem retry automático: um loop de retry transformaria
 * a eval numa conta de custo imprevisível.
 *
 * Não é chamado pela aplicação e usa somente dados sintéticos.
 *
 * Uso (com `ANTHROPIC_API_KEY` e credenciais Supabase no ambiente):
 *   npm run eval:review
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

import { createClient } from "@supabase/supabase-js";

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

if (!process.env.ANTHROPIC_API_KEY) {
  console.error(
    [
      "GATE DE CREDENCIAL PAGA.",
      "",
      "ANTHROPIC_API_KEY não está disponível neste runtime. A eval real precisa de",
      "chave no Paid Tier e não roda sem ela.",
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
// Invariantes
// ---------------------------------------------------------------------------
//
// Os critérios vivem em `src/lib/review/eval-criteria.ts`, importável e com
// teste próprio em CI. Mantê-los aqui dentro tornaria o avaliador exercitável
// apenas junto com a chamada paga — e foi assim que a versão anterior deixou
// passar as omissões que deveria pegar (Correção 004E-02 §5.3).

// ---------------------------------------------------------------------------
// Execução
// ---------------------------------------------------------------------------

const sufixo = randomUUID().slice(0, 8);

const { data: usuario, error: erroUsuario } = await supabase.auth.admin.createUser({
  email: `eval-004e-${sufixo}@example.invalid`,
  password: randomUUID(),
  email_confirm: true,
});

if (erroUsuario) {
  console.error("falha ao criar usuário sintético");
  process.exit(1);
}

const { data: org } = await supabase
  .from("organizations")
  .insert({ name: `EVAL 004E ${sufixo}` })
  .select("id")
  .single();

await supabase.from("organization_members").insert({
  organization_id: org.id,
  user_id: usuario.user.id,
  role: "owner",
  status: "ACTIVE",
});

const resultados = [];

try {
  const { montarSnapshotDeclarado } = await import(
    "../src/lib/review/context-snapshot-builder.ts"
  );
  const { CASOS_DE_EVAL } = await import(
    "../test/support/declared-context-fixtures.ts"
  );
  const { criarAIRouter } = await import("../src/lib/ai/router.ts");
  const { criarAICatalog } = await import("../src/lib/ai/catalog.ts");
  const { criarAIRunLedger } = await import("../src/lib/ai/run-ledger.ts");
  const { criarAdapterRegistry, PRODUCTION_ADAPTERS } = await import(
    "../src/lib/ai/adapter-registry.ts"
  );
  const { criarTaskRegistry, PRODUCTION_TASKS } = await import(
    "../src/lib/ai/task-registry.ts"
  );
  const {
    DECLARED_CONTEXT_REVIEW_TASK_TYPE,
    DECLARED_CONTEXT_REVIEW_TASK_VERSION,
  } = await import("../src/lib/ai/tasks/declared-context-review.ts");
  const { avaliarCaso } = await import("../src/lib/review/eval-criteria.ts");

  // A eval usa o Router diretamente, e não o serviço: ela precisa dos 12 casos
  // sem esbarrar no teto horário de 3 revisões por organização, que existe
  // para proteger o produto, não a bancada de avaliação.
  const router = criarAIRouter({
    tasks: criarTaskRegistry(PRODUCTION_TASKS),
    catalog: criarAICatalog(supabase),
    adapters: criarAdapterRegistry(PRODUCTION_ADAPTERS),
    ledger: criarAIRunLedger(supabase),
  });

  for (const caso of CASOS_DE_EVAL) {
    const snapshot = montarSnapshotDeclarado({
      account: caso.conta,
      objetivo: caso.objetivo,
      ofertas: caso.ofertas,
    });

    // Uma execução por caso. Sem retry.
    const resultado = await router.run({
      taskType: DECLARED_CONTEXT_REVIEW_TASK_TYPE,
      taskVersion: DECLARED_CONTEXT_REVIEW_TASK_VERSION,
      input: snapshot,
      organizationId: org.id,
    });

    if (!resultado.ok) {
      resultados.push({ caso: caso.nome, ok: false, problemas: [resultado.errorClass] });
      continue;
    }

    const problemas = avaliarCaso({
      expectativa: caso.esperado,
      snapshot,
      review: resultado.output,
    });

    resultados.push({
      caso: caso.nome,
      ok: problemas.length === 0,
      problemas,
      custo: resultado.estimatedCost,
    });
  }
} finally {
  await supabase.from("organizations").delete().eq("id", org.id);
  await supabase.auth.admin.deleteUser(usuario.user.id);
}

const falharam = resultados.filter((r) => !r.ok);

for (const r of resultados) {
  console.log(`${r.ok ? "[OK]" : "[FALHOU]"} ${r.caso}`);
  for (const problema of r.problemas ?? []) console.log(`        ${problema}`);
}

console.log(
  `\n${resultados.length} casos, ${resultados.length - falharam.length} passaram, ${falharam.length} falharam`,
);

if (falharam.length > 0) process.exitCode = 1;
