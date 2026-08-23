/**
 * Prova funcional da fundação Operations + Audit — Rodada 002A (§5 do mandato).
 *
 * Fala com o projeto Supabase real, pela mesma Data API que a aplicação usaria.
 * Não há mock: `service_role` é o caminho interno server-side, e o usuário de
 * teste tem sessão JWT real obtida por Auth — exatamente o que o browser teria.
 *
 * O que este script NÃO cobre, por não alcançar `pg_catalog` pela Data API:
 * schema/constraints/índices/ACL/owner e Advisor. Essas provas estruturais
 * ficam em `scripts/sql/operations-audit-002a-catalog.sql`, versionado ao lado,
 * para que o auditor as reproduza no SQL Editor sem depender deste relatório.
 *
 * Fixtures: 1 usuário + 2 organizações, com membership ACTIVE na organização A.
 * A membership existe de propósito: a prova forte não é "estranho não acessa",
 * é **membro ativo também não acessa** as tabelas internas.
 *
 * Tudo é removido ao final e o resíduo é conferido. Nenhuma credencial, e-mail
 * ou token é impresso.
 *
 * Uso: node scripts/operations-audit-002a.mjs
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Ambiente
// ---------------------------------------------------------------------------

function loadEnvLocal() {
  const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    env[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
  }
  return env;
}

const env = loadEnvLocal();
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const PUBLISHABLE_KEY = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SECRET_KEY = env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !PUBLISHABLE_KEY || !SECRET_KEY) {
  throw new Error(".env.local incompleto (URL, publishable key, secret key).");
}

const admin = createClient(SUPABASE_URL, SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function browserClient() {
  return createClient(SUPABASE_URL, PUBLISHABLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ---------------------------------------------------------------------------
// Registro de provas
// ---------------------------------------------------------------------------

const provas = [];
let falhas = 0;

function prova(nome, condicao, detalhe = "") {
  const ok = Boolean(condicao);
  if (!ok) falhas += 1;
  provas.push({ nome, ok });
  console.log(
    `${ok ? "PASS " : "FALHA"}  ${nome}${detalhe ? ` — ${detalhe}` : ""}`,
  );
}

function nota(texto) {
  console.log(`INFO   ${texto}`);
}

/** Um erro do PostgREST/Postgres é esperado aqui: devolve o código. */
function codigoDe(error) {
  return error?.code ?? "(sem erro)";
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const carimbo = Date.now();
const EMAIL = `operations-002a-${carimbo}@trafegopago-teste.com`;
const SENHA = `Operations-002A-${carimbo}!`;

let userId = null;
let orgA = null;
let orgB = null;

async function criarFixtures() {
  const { data: criado, error: erroUser } = await admin.auth.admin.createUser({
    email: EMAIL,
    password: SENHA,
    email_confirm: true,
  });
  if (erroUser) throw new Error(`createUser: ${erroUser.message}`);
  userId = criado.user.id;

  const { data: orgs, error: erroOrgs } = await admin
    .from("organizations")
    .insert([
      { name: `Org A 002A ${carimbo}` },
      { name: `Org B 002A ${carimbo}` },
    ])
    .select("id, name");
  if (erroOrgs) throw new Error(`criar organizations: ${erroOrgs.message}`);

  orgA = orgs.find((o) => o.name.startsWith("Org A")).id;
  orgB = orgs.find((o) => o.name.startsWith("Org B")).id;

  const { error: erroMembro } = await admin
    .from("organization_members")
    .insert({
      organization_id: orgA,
      user_id: userId,
      role: "owner",
      status: "ACTIVE",
    });
  if (erroMembro) throw new Error(`criar membership: ${erroMembro.message}`);

  prova("fixtures criadas: 1 usuário + 2 organizações + membership ACTIVE", true);
}

async function removerFixtures() {
  // A remoção das organizações leva junto `operations` e `audit_events` pelo
  // CASCADE das FKs — e é por isso que `service_role` não precisa de DELETE
  // nessas tabelas para o ciclo de teste fechar sem resíduo.
  if (orgA || orgB) {
    await admin
      .from("organizations")
      .delete()
      .in("id", [orgA, orgB].filter(Boolean));
  }
  if (userId) await admin.auth.admin.deleteUser(userId);
}

// ---------------------------------------------------------------------------
// Execução
// ---------------------------------------------------------------------------

try {
  await criarFixtures();

  // -- 1. Browser não alcança as tabelas internas ----------------------------

  const anon = browserClient();

  for (const tabela of ["operations", "audit_events"]) {
    const { data, error } = await anon.from(tabela).select("id").limit(1);
    prova(
      `anon não lê ${tabela}`,
      Boolean(error) || (data ?? []).length === 0,
      `code=${codigoDe(error)}`,
    );

    const { error: erroInsert } = await anon
      .from(tabela)
      .insert({ organization_id: orgA });
    prova(
      `anon não escreve em ${tabela}`,
      Boolean(erroInsert),
      `code=${codigoDe(erroInsert)}`,
    );
  }

  const usuario = browserClient();
  const { error: erroLogin } = await usuario.auth.signInWithPassword({
    email: EMAIL,
    password: SENHA,
  });
  if (erroLogin) throw new Error(`login da fixture: ${erroLogin.message}`);

  // A prova que importa: este usuário é membro ACTIVE da organização A e lê
  // normalmente as tabelas de domínio. Ainda assim não alcança as tabelas
  // internas — porque elas não têm grant para `authenticated`, não porque ele
  // esteja fora do tenant.
  const { data: orgVisivel } = await usuario
    .from("organizations")
    .select("id")
    .eq("id", orgA);
  prova(
    "usuário membro lê a própria organização (baseline 001C/001D intacto)",
    (orgVisivel ?? []).length === 1,
  );

  for (const tabela of ["operations", "audit_events"]) {
    const { data, error } = await usuario.from(tabela).select("id").limit(1);
    prova(
      `authenticated MEMBRO ATIVO não lê ${tabela}`,
      Boolean(error) || (data ?? []).length === 0,
      `code=${codigoDe(error)}`,
    );

    const { error: erroInsert } = await usuario
      .from(tabela)
      .insert({ organization_id: orgA });
    prova(
      `authenticated não escreve em ${tabela}`,
      Boolean(erroInsert),
      `code=${codigoDe(erroInsert)}`,
    );
  }

  await usuario.auth.signOut();

  // -- 2. service_role opera `operations` ------------------------------------

  const CHAVE = `idem-${carimbo}`;
  const TIPO = "TEST_OPERATION";

  const { data: criada, error: erroCriar } = await admin
    .from("operations")
    .insert({
      organization_id: orgA,
      operation_type: TIPO,
      idempotency_key: CHAVE,
    })
    .select("id, status, attempt_count, correlation_id, created_at, updated_at")
    .single();

  prova(
    "service_role cria operation com defaults corretos",
    !erroCriar &&
      criada?.status === "PENDING" &&
      criada?.attempt_count === 0 &&
      Boolean(criada?.correlation_id),
    erroCriar ? `code=${codigoDe(erroCriar)}` : `status=${criada?.status}`,
  );

  const { data: atualizada, error: erroUpdate } = await admin
    .from("operations")
    .update({
      status: "CLAIMED",
      attempt_count: 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", criada.id)
    .select("status, attempt_count")
    .single();

  prova(
    "service_role atualiza operation",
    !erroUpdate &&
      atualizada?.status === "CLAIMED" &&
      atualizada?.attempt_count === 1,
    erroUpdate ? `code=${codigoDe(erroUpdate)}` : "",
  );

  const { data: consultada } = await admin
    .from("operations")
    .select("id")
    .eq("id", criada.id)
    .single();
  prova("service_role consulta operation", consultada?.id === criada.id);

  // -- 3. Idempotência --------------------------------------------------------

  const { error: erroDuplicada } = await admin.from("operations").insert({
    organization_id: orgA,
    operation_type: TIPO,
    idempotency_key: CHAVE,
  });

  prova(
    "mesma (org, tipo, chave) não cria segunda operation",
    erroDuplicada?.code === "23505",
    `code=${codigoDe(erroDuplicada)}`,
  );

  // Concorrência real: seis inserts disparados juntos, sem await entre eles.
  // Só um pode sobreviver, e quem garante isso é o índice único no banco — não
  // uma checagem de leitura na aplicação, que READ COMMITTED não protegeria.
  const CHAVE_CONCORRENTE = `idem-concorrente-${carimbo}`;
  const disparos = Array.from({ length: 6 }, () =>
    admin
      .from("operations")
      .insert({
        organization_id: orgA,
        operation_type: TIPO,
        idempotency_key: CHAVE_CONCORRENTE,
      })
      .select("id"),
  );
  const resultados = await Promise.all(disparos);
  const criadas = resultados.filter((r) => !r.error).length;
  const conflitos = resultados.filter((r) => r.error?.code === "23505").length;

  prova(
    "sob criação concorrente, exatamente uma operation sobrevive",
    criadas === 1 && conflitos === 5,
    `criadas=${criadas} conflitos=${conflitos}`,
  );

  const { error: erroOutraOrg } = await admin.from("operations").insert({
    organization_id: orgB,
    operation_type: TIPO,
    idempotency_key: CHAVE,
  });
  prova(
    "mesma chave coexiste em organização diferente",
    !erroOutraOrg,
    erroOutraOrg ? `code=${codigoDe(erroOutraOrg)}` : "",
  );

  // -- 4. Constraints de operations -------------------------------------------

  const invalidas = [
    [
      "attempt_count negativo",
      { attempt_count: -1 },
      "operations_attempt_count_non_negative",
    ],
    ["status fora da allowlist", { status: "DONE" }, "operations_status_valid"],
    [
      "error class fora da taxonomia",
      { last_error_class: "TIMEOUT" },
      "operations_last_error_class_valid",
    ],
    [
      "operation_type em branco",
      { operation_type: "   " },
      "operations_operation_type_not_blank",
    ],
    [
      "idempotency_key em branco",
      { idempotency_key: "" },
      "operations_idempotency_key_not_blank",
    ],
    [
      "operation_type acima do teto",
      { operation_type: "x".repeat(121) },
      "operations_operation_type_max_length",
    ],
  ];

  for (const [nome, override, constraint] of invalidas) {
    const { error } = await admin.from("operations").insert({
      organization_id: orgA,
      operation_type: `${TIPO}_INVALIDA`,
      idempotency_key: `invalida-${randomUUID()}`,
      ...override,
    });

    prova(
      `operations recusa ${nome}`,
      error?.code === "23514" && (error?.message ?? "").includes(constraint),
      `code=${codigoDe(error)}`,
    );
  }

  // -- 5. audit_events: insere, consulta, NÃO reescreve -----------------------

  const correlacao = randomUUID();

  const { data: evento, error: erroEvento } = await admin
    .from("audit_events")
    .insert({
      organization_id: orgA,
      event_type: "TEST_EVENT",
      actor_type: "SYSTEM",
      subject_type: "operation",
      subject_id: criada.id,
      correlation_id: correlacao,
      metadata_json: { origem: "prova-002a" },
    })
    .select("id, metadata_json")
    .single();

  prova(
    "service_role insere audit_event",
    !erroEvento && Boolean(evento?.id),
    erroEvento ? `code=${codigoDe(erroEvento)}` : "",
  );

  const { data: lido } = await admin
    .from("audit_events")
    .select("id")
    .eq("id", evento.id)
    .single();
  prova("service_role consulta audit_event", lido?.id === evento.id);

  // O coração do append-only: `service_role` ignora RLS, mas não ignora grant.
  // Sem UPDATE/DELETE na ACL, corrigir o passado pelo caminho da aplicação
  // falha em 42501.
  const { error: erroUpdateEvento } = await admin
    .from("audit_events")
    .update({ event_type: "REESCRITO" })
    .eq("id", evento.id);
  prova(
    "service_role NÃO consegue UPDATE em audit_events",
    Boolean(erroUpdateEvento),
    `code=${codigoDe(erroUpdateEvento)}`,
  );

  const { error: erroDeleteEvento } = await admin
    .from("audit_events")
    .delete()
    .eq("id", evento.id);
  prova(
    "service_role NÃO consegue DELETE em audit_events",
    Boolean(erroDeleteEvento),
    `code=${codigoDe(erroDeleteEvento)}`,
  );

  const { data: aposTentativas } = await admin
    .from("audit_events")
    .select("event_type")
    .eq("id", evento.id)
    .single();
  prova(
    "evento permanece íntegro após as tentativas de reescrita",
    aposTentativas?.event_type === "TEST_EVENT",
    `event_type=${aposTentativas?.event_type}`,
  );

  // -- 6. Constraints de audit_events -----------------------------------------

  const eventosInvalidos = [
    [
      "actor_type fora da allowlist",
      { actor_type: "ROBOT" },
      "audit_events_actor_type_valid",
    ],
    [
      "metadata que não é objeto",
      { metadata_json: [1, 2, 3] },
      "audit_events_metadata_json_is_object",
    ],
    [
      "metadata acima do teto",
      { metadata_json: { texto: "x".repeat(8100) } },
      "audit_events_metadata_json_max_length",
    ],
    [
      "event_type em branco",
      { event_type: "  " },
      "audit_events_event_type_not_blank",
    ],
    [
      "subject_type em branco",
      { subject_type: "" },
      "audit_events_subject_type_not_blank",
    ],
  ];

  for (const [nome, override, constraint] of eventosInvalidos) {
    const { error } = await admin.from("audit_events").insert({
      organization_id: orgA,
      event_type: "TEST_EVENT",
      actor_type: "SYSTEM",
      subject_type: "operation",
      ...override,
    });

    prova(
      `audit_events recusa ${nome}`,
      error?.code === "23514" && (error?.message ?? "").includes(constraint),
      `code=${codigoDe(error)}`,
    );
  }

  // metadata escalar é rejeitado antes do CHECK, pelo tipo da coluna.
  const { error: erroMetadataEscalar } = await admin
    .from("audit_events")
    .insert({
      organization_id: orgA,
      event_type: "TEST_EVENT",
      actor_type: "SYSTEM",
      subject_type: "operation",
      metadata_json: "texto solto",
    });
  prova(
    "audit_events recusa metadata escalar",
    Boolean(erroMetadataEscalar),
    `code=${codigoDe(erroMetadataEscalar)}`,
  );

  // -- 7. Correlação é localizável --------------------------------------------

  const { data: porCorrelacao } = await admin
    .from("audit_events")
    .select("id")
    .eq("correlation_id", correlacao);
  prova(
    "evento é localizável por correlation_id",
    (porCorrelacao ?? []).length === 1,
  );

  const { data: opsPorCorrelacao } = await admin
    .from("operations")
    .select("id")
    .eq("correlation_id", criada.correlation_id);
  prova(
    "operation é localizável por correlation_id",
    (opsPorCorrelacao ?? []).length >= 1,
  );

  // -- 8. Tenancy das tabelas novas -------------------------------------------

  const { data: opsOrgA } = await admin
    .from("operations")
    .select("id")
    .eq("organization_id", orgA);
  const { data: opsOrgB } = await admin
    .from("operations")
    .select("id")
    .eq("organization_id", orgB);
  prova(
    "operations ficam separadas por organização",
    (opsOrgA ?? []).length === 2 && (opsOrgB ?? []).length === 1,
    `A=${(opsOrgA ?? []).length} B=${(opsOrgB ?? []).length}`,
  );

  // FK real: organização inexistente não aceita operação órfã.
  const { error: erroOrgInexistente } = await admin.from("operations").insert({
    organization_id: randomUUID(),
    operation_type: TIPO,
    idempotency_key: `orfa-${randomUUID()}`,
  });
  prova(
    "operations recusa organização inexistente",
    erroOrgInexistente?.code === "23503",
    `code=${codigoDe(erroOrgInexistente)}`,
  );

  // -- 9. CASCADE limpa as tabelas internas -----------------------------------

  await admin.from("organizations").delete().eq("id", orgB);
  const { data: sobrouDeB } = await admin
    .from("operations")
    .select("id")
    .eq("organization_id", orgB);
  prova(
    "remover organização leva junto suas operations (CASCADE)",
    (sobrouDeB ?? []).length === 0,
  );
  orgB = null;
} finally {
  await removerFixtures();

  // -- 10. Zero resíduo -------------------------------------------------------

  const { data: usuariosRestantes } = await admin.auth.admin.listUsers({
    perPage: 1000,
  });
  const fixtureRestante = (usuariosRestantes?.users ?? []).filter((u) =>
    (u.email ?? "").includes("trafegopago-teste.com"),
  ).length;

  const { count: operationsRestantes } = await admin
    .from("operations")
    .select("id", { count: "exact", head: true });
  const { count: eventosRestantes } = await admin
    .from("audit_events")
    .select("id", { count: "exact", head: true });
  const { count: orgsRestantes } = await admin
    .from("organizations")
    .select("id", { count: "exact", head: true });

  prova("nenhuma identidade de teste restante", fixtureRestante === 0);
  prova(
    "nenhuma operation restante",
    operationsRestantes === 0,
    `count=${operationsRestantes}`,
  );
  prova(
    "nenhum audit_event restante",
    eventosRestantes === 0,
    `count=${eventosRestantes}`,
  );
  prova(
    "nenhuma organização restante",
    orgsRestantes === 0,
    `count=${orgsRestantes}`,
  );

  nota(
    "Provas estruturais (schema, constraints, índices, ACL, owner, RLS, " +
      "Advisor) estão em scripts/sql/operations-audit-002a-catalog.sql.",
  );
}

console.log(
  `\n${provas.filter((p) => p.ok).length}/${provas.length} provas passaram.`,
);

process.exit(falhas === 0 ? 0 : 1);
