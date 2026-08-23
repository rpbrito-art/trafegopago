/**
 * Provas do bootstrap de negócio — Rodada 001E (§10.1 do mandato).
 *
 * Fala com o projeto Supabase real. Não há mock: os usuários são criados pela
 * API administrativa, as sessões são JWTs reais obtidos por Auth, e todas as
 * leituras/escritas do lado do browser passam pela Data API com a publishable
 * key — o mesmo caminho que o navegador usaria. `SET ROLE` em SQL não
 * substituiria esta prova.
 *
 * Cobre criação atômica, negação de escrita direta, isolamento cross-tenant,
 * recusa da RPC para `anon`/`authenticated` e dupla submissão concorrente.
 *
 * Tudo é removido ao final e o resíduo é conferido. Nenhuma credencial,
 * e-mail ou token é impresso.
 *
 * Uso: node scripts/business-bootstrap-001e.mjs
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

const RPC = "bootstrap_organization_business_profile";

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

const results = [];
let failures = 0;

function check(name, passed, detail) {
  results.push({ name, passed });
  if (!passed) failures += 1;
  console.log(
    `${passed ? "PASS  " : "FALHOU"} ${name}${detail ? ` — ${detail}` : ""}`,
  );
}

/** Negação esperada = erro do Postgres. Grant ausente responde 42501. */
function deniedDetail(error, data) {
  if (error) return `${error.code ?? "?"}`;
  return `SEM ERRO, ${Array.isArray(data) ? data.length : 0} linha(s)`;
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const created = { users: [], orgs: [] };

async function createUser(tag) {
  const email = `bootstrap-001e-${tag}-${randomUUID()}@example.com`;
  const password = `${randomUUID()}Aa1`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw new Error(`createUser(${tag}): ${error.message}`);
  created.users.push(data.user.id);
  return { id: data.user.id, email, password };
}

async function signIn(user) {
  const client = browserClient();
  const { data, error } = await client.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  });
  if (error) throw new Error(`signIn: ${error.message}`);
  if (!data.session?.access_token) throw new Error("sessão sem access_token");
  return client;
}

/** Argumentos da RPC, no formato que a Server Action usa. */
function bootstrapArgs(userId, orgName, overrides = {}) {
  return {
    p_user_id: userId,
    p_organization_name: orgName,
    p_segment: "Odontologia",
    p_location_summary: "Campinas, SP",
    p_primary_offer: "Implantes e clareamento",
    p_target_audience: "Adultos de 30 a 55 anos",
    p_acquisition_goal: "Agendar 40 avaliacoes por mes",
    p_average_ticket_minor: 125000,
    p_differentiators: null,
    p_known_objections: null,
    p_commercial_goal_json: { summary: "Dobrar o faturamento" },
    p_timezone: "America/Sao_Paulo",
    p_currency: "BRL",
    ...overrides,
  };
}

function uniqueOrgName(tag) {
  return `001E ${tag} ${randomUUID().slice(0, 8)}`;
}

async function countOrgsNamed(name) {
  const { data } = await admin.from("organizations").select("id").eq("name", name);
  return (data ?? []).length;
}

async function membershipsOf(userId) {
  const { data } = await admin
    .from("organization_members")
    .select("organization_id, role, status")
    .eq("user_id", userId);
  return data ?? [];
}

// ---------------------------------------------------------------------------
// Provas
// ---------------------------------------------------------------------------

async function run() {
  const userA = await createUser("a");
  const userB = await createUser("b");

  // --- 1. bootstrap pelo caminho privilegiado (service_role) ---------------

  const orgNameA = uniqueOrgName("A");
  const { data: orgIdA, error: bootstrapError } = await admin.rpc(
    RPC,
    bootstrapArgs(userA.id, orgNameA),
  );

  check(
    "service_role executa o bootstrap server-only",
    !bootstrapError && typeof orgIdA === "string",
    bootstrapError ? bootstrapError.code : "org criada",
  );
  if (orgIdA) created.orgs.push(orgIdA);

  {
    const memberships = await membershipsOf(userA.id);
    const { data: orgs } = await admin
      .from("organizations")
      .select("id, status, timezone, default_currency")
      .eq("id", orgIdA);
    const { data: profiles } = await admin
      .from("business_profiles")
      .select("organization_id, currency, average_ticket_minor, commercial_goal_json")
      .eq("organization_id", orgIdA);

    check(
      "cria exatamente 1 org + 1 membership owner ACTIVE + 1 profile",
      memberships.length === 1 &&
        memberships[0].organization_id === orgIdA &&
        memberships[0].role === "owner" &&
        memberships[0].status === "ACTIVE" &&
        (orgs ?? []).length === 1 &&
        orgs[0].status === "ACTIVE" &&
        (profiles ?? []).length === 1,
      `memberships=${memberships.length} orgs=${(orgs ?? []).length} profiles=${(profiles ?? []).length}`,
    );

    check(
      "defaults de timezone/moeda e ticket em unidade menor inteira",
      orgs?.[0]?.timezone === "America/Sao_Paulo" &&
        orgs?.[0]?.default_currency === "BRL" &&
        profiles?.[0]?.currency === "BRL" &&
        profiles?.[0]?.average_ticket_minor === 125000,
      `ticket=${profiles?.[0]?.average_ticket_minor}`,
    );
  }

  // --- 2. atomicidade: falha de constraint não deixa criação parcial -------

  {
    const userD = await createUser("d");
    const orgNameD = uniqueOrgName("D-atomicidade");

    // `segment` em branco viola `business_profiles_segment_not_blank`, e a
    // violação acontece DEPOIS de organizations e organization_members terem
    // sido inseridos. É exatamente o caso que provaria criação parcial.
    const { error } = await admin.rpc(
      RPC,
      bootstrapArgs(userD.id, orgNameD, { p_segment: "   " }),
    );

    const memberships = await membershipsOf(userD.id);
    const orgsResiduais = await countOrgsNamed(orgNameD);

    check(
      "falha de constraint no profile deixa zero org/membership residual",
      error?.code === "23514" &&
        memberships.length === 0 &&
        orgsResiduais === 0,
      `erro=${error?.code} memberships=${memberships.length} orgs=${orgsResiduais}`,
    );
  }

  // --- 3. dupla submissão concorrente -------------------------------------

  {
    const userC = await createUser("c");
    const nome1 = uniqueOrgName("C-concorrente-1");
    const nome2 = uniqueOrgName("C-concorrente-2");

    // Duas requisições HTTP simultâneas = duas transações distintas. Sem o
    // advisory lock na função, ambas leem "sem membership" e criam um tenant.
    const [r1, r2] = await Promise.all([
      admin.rpc(RPC, bootstrapArgs(userC.id, nome1)),
      admin.rpc(RPC, bootstrapArgs(userC.id, nome2)),
    ]);

    const sucessos = [r1, r2].filter((r) => !r.error);
    const recusas = [r1, r2].filter((r) => r.error?.code === "P0001");
    const memberships = await membershipsOf(userC.id);
    const orgsCriadas =
      (await countOrgsNamed(nome1)) + (await countOrgsNamed(nome2));

    for (const r of sucessos) if (r.data) created.orgs.push(r.data);

    check(
      "dupla submissao concorrente cria no maximo um tenant",
      sucessos.length === 1 &&
        recusas.length === 1 &&
        memberships.length === 1 &&
        orgsCriadas === 1,
      `sucessos=${sucessos.length} recusas=${recusas.length} orgs=${orgsCriadas}`,
    );

    // Chamada sequencial depois do fato: mesma recusa, sem depender de corrida.
    const repetida = await admin.rpc(
      RPC,
      bootstrapArgs(userC.id, uniqueOrgName("C-repetida")),
    );
    check(
      "segundo bootstrap para usuario com membership e recusado",
      repetida.error?.code === "P0001",
      deniedDetail(repetida.error, repetida.data),
    );
  }

  // --- 4/5. leitura tenant-scoped pela Data API ---------------------------

  const clientA = await signIn(userA);
  const clientB = await signIn(userB);

  {
    const r = await clientA.from("business_profiles").select("organization_id, segment");
    check(
      "A le o proprio business_profile pela Data API",
      !r.error && (r.data ?? []).length === 1 && r.data[0].organization_id === orgIdA,
      deniedDetail(r.error, r.data),
    );
  }
  {
    const r = await clientB.from("business_profiles").select("organization_id");
    check(
      "B nao le o business_profile de A",
      !r.error && (r.data ?? []).length === 0,
      deniedDetail(r.error, r.data),
    );
  }
  {
    const r = await clientB
      .from("business_profiles")
      .select("organization_id")
      .eq("organization_id", orgIdA);
    check(
      "B nao le o profile de A nem apontando o organization_id",
      !r.error && (r.data ?? []).length === 0,
      deniedDetail(r.error, r.data),
    );
  }

  // --- 6. anon --------------------------------------------------------------

  {
    const anon = browserClient();
    const r = await anon.from("business_profiles").select("organization_id");
    check(
      "anon nao le business_profiles",
      r.error?.code === "42501",
      deniedDetail(r.error, r.data),
    );
  }

  // --- 7/8. escrita direta negada, inclusive para o owner -------------------

  {
    const r = await clientA
      .from("business_profiles")
      .insert({
        organization_id: orgIdA,
        segment: "x",
        location_summary: "x",
        primary_offer: "x",
        target_audience: "x",
        acquisition_goal: "x",
      });
    check(
      "A (owner) INSERT em business_profiles: negado",
      r.error?.code === "42501",
      deniedDetail(r.error, r.data),
    );
  }
  {
    const r = await clientA
      .from("business_profiles")
      .update({ segment: "hijack" })
      .eq("organization_id", orgIdA);
    check(
      "A (owner) UPDATE no proprio business_profile: negado",
      r.error?.code === "42501",
      deniedDetail(r.error, r.data),
    );
  }
  {
    const r = await clientA
      .from("business_profiles")
      .delete()
      .eq("organization_id", orgIdA);
    check(
      "A (owner) DELETE do proprio business_profile: negado",
      r.error?.code === "42501",
      deniedDetail(r.error, r.data),
    );
  }
  {
    const r = await clientA.from("organizations").insert({ name: "nova org pelo browser" });
    check(
      "A INSERT em organizations: negado",
      r.error?.code === "42501",
      deniedDetail(r.error, r.data),
    );
  }
  {
    const r = await clientA
      .from("organization_members")
      .insert({ organization_id: orgIdA, user_id: userB.id, role: "owner" });
    check(
      "A adiciona membership pelo browser: negado",
      r.error?.code === "42501",
      deniedDetail(r.error, r.data),
    );
  }

  // --- 9/10. RPC negada para os papeis do browser --------------------------

  {
    const r = await clientB.rpc(RPC, bootstrapArgs(userB.id, uniqueOrgName("B-rpc")));
    const orgs = await countOrgsNamed(r.data ? String(r.data) : "__nenhuma__");
    check(
      "RPC de bootstrap como authenticated: negada",
      r.error?.code === "42501" && orgs === 0,
      deniedDetail(r.error, r.data),
    );
  }
  {
    const anon = browserClient();
    const r = await anon.rpc(RPC, bootstrapArgs(userB.id, uniqueOrgName("anon-rpc")));
    check(
      "RPC de bootstrap como anon: negada",
      r.error?.code === "42501",
      deniedDetail(r.error, r.data),
    );
  }
  {
    // B tenta forjar a identidade de A na RPC. Deve parar no privilégio, antes
    // de qualquer discussão sobre o valor de p_user_id.
    const r = await clientB.rpc(RPC, bootstrapArgs(userA.id, uniqueOrgName("B-forja-A")));
    check(
      "authenticated nao executa a RPC nem com p_user_id de outro usuario",
      r.error?.code === "42501",
      deniedDetail(r.error, r.data),
    );
  }
  {
    // ACL de `rls_auto_enable()` (Rodada 001A) permanece fechada.
    const r = await clientA.rpc("rls_auto_enable");
    check(
      "rls_auto_enable segue inacessivel a authenticated",
      r.error?.code === "42501",
      deniedDetail(r.error, r.data),
    );
  }

  // --- 12. estados INACTIVE retiram a leitura ------------------------------

  {
    await admin
      .from("organization_members")
      .update({ status: "INACTIVE" })
      .eq("organization_id", orgIdA)
      .eq("user_id", userA.id);

    const r = await clientA.from("business_profiles").select("organization_id");
    check(
      "membership INACTIVE retira a leitura do profile",
      !r.error && (r.data ?? []).length === 0,
      deniedDetail(r.error, r.data),
    );

    await admin
      .from("organization_members")
      .update({ status: "ACTIVE" })
      .eq("organization_id", orgIdA)
      .eq("user_id", userA.id);
  }
  {
    await admin.from("organizations").update({ status: "INACTIVE" }).eq("id", orgIdA);

    const r = await clientA.from("business_profiles").select("organization_id");
    check(
      "organizacao INACTIVE retira a leitura do profile",
      !r.error && (r.data ?? []).length === 0,
      deniedDetail(r.error, r.data),
    );

    await admin.from("organizations").update({ status: "ACTIVE" }).eq("id", orgIdA);
  }
  {
    const r = await clientA.from("business_profiles").select("organization_id");
    check(
      "leitura volta quando org e membership sao ACTIVE de novo",
      !r.error && (r.data ?? []).length === 1,
      deniedDetail(r.error, r.data),
    );
  }

  await clientA.auth.signOut();
  await clientB.auth.signOut();
}

// ---------------------------------------------------------------------------
// Limpeza e conferência de resíduo
// ---------------------------------------------------------------------------

async function cleanup() {
  for (const orgId of created.orgs) {
    await admin.from("organizations").delete().eq("id", orgId);
  }

  // Profiles e memberships devem cair por CASCADE, não por delete explícito.
  let orfas = 0;
  for (const orgId of created.orgs) {
    const { data: members } = await admin
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", orgId);
    const { data: profiles } = await admin
      .from("business_profiles")
      .select("organization_id")
      .eq("organization_id", orgId);
    orfas += (members ?? []).length + (profiles ?? []).length;
  }
  check("memberships e profiles removidos por CASCADE", orfas === 0, `${orfas} orfa(s)`);

  for (const userId of created.users) {
    await admin.auth.admin.deleteUser(userId);
  }

  let residualOrgs = 0;
  for (const orgId of created.orgs) {
    const { data } = await admin.from("organizations").select("id").eq("id", orgId);
    residualOrgs += (data ?? []).length;
  }
  let residualUsers = 0;
  for (const userId of created.users) {
    const { data } = await admin.auth.admin.getUserById(userId);
    if (data?.user) residualUsers += 1;
  }
  check(
    "zero residuo de fixtures",
    residualOrgs === 0 && residualUsers === 0,
    `orgs=${residualOrgs} users=${residualUsers}`,
  );
}

try {
  await run();
} finally {
  await cleanup();
}

console.log(`\n${results.length - failures}/${results.length} provas aprovadas.`);
if (failures > 0) process.exit(1);
