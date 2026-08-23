/**
 * Prova adversarial de isolamento multi-tenant — Rodada 001D (§9 do mandato).
 *
 * Fala com o projeto Supabase real. Não há mock: os usuários são criados pela
 * API administrativa, as sessões são JWTs reais obtidos por Auth, e todas as
 * leituras/escritas passam pela Data API com a publishable key — o mesmo
 * caminho que o browser usaria. `SET ROLE` em SQL não substitui esta prova.
 *
 * Fixtures: 2 usuários x 2 organizações, com roles diferentes (A=owner,
 * B=member) para demonstrar que `role` não amplia acesso nesta etapa.
 *
 * Tudo é removido ao final e o resíduo é conferido. Nenhuma credencial,
 * e-mail ou token é impresso.
 *
 * Uso: node scripts/rls-isolation-001d.mjs
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

const results = [];
let failures = 0;

function check(name, passed, detail) {
  results.push({ name, passed, detail });
  if (!passed) failures += 1;
  console.log(`${passed ? "PASS  " : "FALHOU"} ${name}${detail ? ` — ${detail}` : ""}`);
}

/** Escrita negada = erro do Postgres. Grant ausente responde 42501. */
function deniedDetail(error, data) {
  if (error) return `${error.code ?? "?"}`;
  return `SEM ERRO, ${Array.isArray(data) ? data.length : 0} linha(s)`;
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const created = { users: [], orgs: [] };

async function createUser(tag) {
  const email = `rls-001d-${tag}-${randomUUID()}@example.com`;
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

async function createOrg(name, userId, role) {
  const { data: org, error: orgError } = await admin
    .from("organizations")
    .insert({ name })
    .select()
    .single();
  if (orgError) throw new Error(`createOrg: ${orgError.message}`);
  created.orgs.push(org.id);

  const { error: memberError } = await admin
    .from("organization_members")
    .insert({ organization_id: org.id, user_id: userId, role });
  if (memberError) throw new Error(`membership: ${memberError.message}`);

  return org;
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

// ---------------------------------------------------------------------------
// Provas
// ---------------------------------------------------------------------------

async function run() {
  const userA = await createUser("a");
  const userB = await createUser("b");

  const orgA = await createOrg(`RLS 001D Org A ${randomUUID().slice(0, 8)}`, userA.id, "owner");
  const orgB = await createOrg(`RLS 001D Org B ${randomUUID().slice(0, 8)}`, userB.id, "member");

  const clientA = await signIn(userA);
  const clientB = await signIn(userB);

  // --- leitura de organizations ---------------------------------------------

  {
    const { data } = await clientA.from("organizations").select("id");
    const ids = (data ?? []).map((r) => r.id);
    check(
      "A le organizations: somente a propria",
      ids.length === 1 && ids[0] === orgA.id,
      `${ids.length} linha(s)`,
    );
  }
  {
    const { data } = await clientA.from("organizations").select("id").eq("id", orgB.id);
    check("A consulta org B diretamente: zero linhas", (data ?? []).length === 0);
  }
  {
    const { data } = await clientB.from("organizations").select("id");
    const ids = (data ?? []).map((r) => r.id);
    check(
      "B le organizations: somente a propria",
      ids.length === 1 && ids[0] === orgB.id,
      `${ids.length} linha(s)`,
    );
  }
  {
    const { data } = await clientB.from("organizations").select("id").eq("id", orgA.id);
    check("B consulta org A diretamente: zero linhas", (data ?? []).length === 0);
  }

  // --- leitura de organization_members --------------------------------------

  {
    const { data } = await clientA.from("organization_members").select("organization_id, user_id");
    const own =
      (data ?? []).length === 1 &&
      data[0].user_id === userA.id &&
      data[0].organization_id === orgA.id;
    check("A le organization_members: somente a propria linha", own, `${(data ?? []).length} linha(s)`);
  }
  {
    const { data } = await clientA.from("organization_members").select("user_id").eq("user_id", userB.id);
    check("A consulta membership de B: zero linhas", (data ?? []).length === 0);
  }
  {
    const { data } = await clientB.from("organization_members").select("organization_id, user_id");
    const own =
      (data ?? []).length === 1 &&
      data[0].user_id === userB.id &&
      data[0].organization_id === orgB.id;
    check("B le organization_members: somente a propria linha", own, `${(data ?? []).length} linha(s)`);
  }
  {
    const { data } = await clientB.from("organization_members").select("user_id").eq("user_id", userA.id);
    check("B consulta membership de A: zero linhas", (data ?? []).length === 0);
  }

  // --- membership inativa perde o tenant ------------------------------------

  {
    await admin
      .from("organization_members")
      .update({ status: "INACTIVE" })
      .eq("organization_id", orgA.id)
      .eq("user_id", userA.id);

    const { data } = await clientA.from("organizations").select("id");
    check(
      "A com membership INACTIVE: nenhum tenant visivel",
      (data ?? []).length === 0,
      `${(data ?? []).length} linha(s)`,
    );

    await admin
      .from("organization_members")
      .update({ status: "ACTIVE" })
      .eq("organization_id", orgA.id)
      .eq("user_id", userA.id);

    const { data: back } = await clientA.from("organizations").select("id");
    check("A com membership reativada: tenant volta", (back ?? []).length === 1);
  }

  // --- organizacao inativa some do tenant -----------------------------------

  {
    await admin.from("organizations").update({ status: "INACTIVE" }).eq("id", orgA.id);
    const { data } = await clientA.from("organizations").select("id");
    check("Org A INACTIVE: nao e lida nem pelo owner", (data ?? []).length === 0);
    await admin.from("organizations").update({ status: "ACTIVE" }).eq("id", orgA.id);
  }

  // --- anon -----------------------------------------------------------------

  {
    const anon = browserClient();
    const org = await anon.from("organizations").select("id");
    const mem = await anon.from("organization_members").select("user_id");
    check("anon le organizations: negado", org.error?.code === "42501", deniedDetail(org.error, org.data));
    check(
      "anon le organization_members: negado",
      mem.error?.code === "42501",
      deniedDetail(mem.error, mem.data),
    );
  }

  // --- escrita negada, inclusive para owner ---------------------------------

  {
    const r = await clientA.from("organizations").update({ name: "hijack" }).eq("id", orgA.id);
    check("A (owner) UPDATE na propria org: negado", r.error?.code === "42501", deniedDetail(r.error, r.data));
  }
  {
    const r = await clientA.from("organizations").update({ name: "hijack" }).eq("id", orgB.id);
    check("A UPDATE na org B: negado", r.error?.code === "42501", deniedDetail(r.error, r.data));
  }
  {
    const r = await clientA.from("organizations").insert({ name: "nova org pelo browser" });
    check("A (owner) INSERT em organizations: negado", r.error?.code === "42501", deniedDetail(r.error, r.data));
  }
  {
    const r = await clientA.from("organizations").delete().eq("id", orgA.id);
    check("A (owner) DELETE da propria org: negado", r.error?.code === "42501", deniedDetail(r.error, r.data));
  }
  {
    const r = await clientA
      .from("organization_members")
      .insert({ organization_id: orgB.id, user_id: userA.id, role: "owner" });
    check("A auto-adiciona membership na org B: negado", r.error?.code === "42501", deniedDetail(r.error, r.data));
  }
  {
    const r = await clientB
      .from("organization_members")
      .update({ role: "owner" })
      .eq("organization_id", orgB.id)
      .eq("user_id", userB.id);
    check("B (member) escala a propria role: negado", r.error?.code === "42501", deniedDetail(r.error, r.data));
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

  // As memberships devem ter caído por CASCADE, não por delete explícito.
  let orphanMemberships = 0;
  for (const orgId of created.orgs) {
    const { data } = await admin
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", orgId);
    orphanMemberships += (data ?? []).length;
  }
  check("memberships removidas por CASCADE", orphanMemberships === 0, `${orphanMemberships} orfa(s)`);

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
