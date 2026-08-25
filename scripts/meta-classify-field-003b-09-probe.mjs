/**
 * Sonda read-only — o campo `client_business_id` recusa o User Token?
 *
 * Contexto: o E2E de desconexão da 003B-09 parou na etapa `CLASSIFICACAO` com
 * HTTP 400 / code 190, sem chegar a `/permissions`. No mesmo instante, o
 * `debug_token` do mesmo token dizia `is_valid: true`, e `GET /me?fields=id,name`
 * respondia 200. A hipótese é que a recusa venha do **campo pedido**, não da
 * credencial: `classifyCredential` chama `GET /me?fields=client_business_id`.
 *
 * Isola a variável comparando três leituras do mesmo nó, com o mesmo token, na
 * mesma versão da API — mudando apenas `fields`.
 *
 * Somente leitura. Nenhuma escrita, nenhum OAuth, nenhum endpoint mutável.
 * Nada de segredo é impresso: nem token, nem App Secret, nem URL, nem
 * `message` da Meta. Só HTTP, code/subcode/type e as chaves do corpo.
 *
 * Uso:
 *   node scripts/meta-classify-field-003b-09-probe.mjs
 */

import { readFileSync } from "node:fs";

import { createClient } from "@supabase/supabase-js";

const CONNECTION_ID = "655da6e6-9056-456d-a81d-5e2570da5faf";

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

for (const nome of ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SECRET_KEY"]) {
  if (!env[nome]) {
    console.error(`falta ${nome} em .env.local`);
    process.exit(1);
  }
}

const VERSAO = env.META_GRAPH_API_VERSION || "v26.0";
const BASE = `https://graph.facebook.com/${VERSAO}`;

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

/**
 * Reproduz a chamada da classificação: token na query, como o código faz hoje.
 * A URL nunca é impressa.
 */
async function lerMe(fields, token) {
  const url = new URL(`${BASE}/me`);
  url.searchParams.set("fields", fields);
  url.searchParams.set("access_token", token);

  try {
    const resposta = await fetch(url, { method: "GET" });
    const corpo = await resposta.json().catch(() => null);
    return { http: resposta.status, ok: resposta.ok, corpo };
  } catch {
    return { http: 0, ok: false, corpo: null };
  }
}

function relatar(fields, r) {
  if (r.ok) {
    const chaves = r.corpo && typeof r.corpo === "object"
      ? Object.keys(r.corpo).sort().join(",")
      : "(corpo ilegível)";
    console.log(`   fields=${fields}`);
    console.log(`     -> OK (HTTP ${r.http}) chaves={${chaves}}`);
    return;
  }

  const e = r.corpo?.error ?? {};
  console.log(`   fields=${fields}`);
  console.log(
    `     -> FALHOU (HTTP ${r.http}, code ${e.code ?? "n/d"}, ` +
      `subcode ${e.error_subcode ?? "n/d"}, ${e.type ?? "n/d"})`,
  );
}

async function main() {
  console.log("=== 003B-09 — o campo client_business_id recusa o User Token? ===\n");
  console.log(`Graph API: ${VERSAO}\n`);

  const { data: conexao, error } = await supabase
    .from("meta_connections")
    .select("id, status")
    .eq("id", CONNECTION_ID)
    .maybeSingle();

  if (error || !conexao) {
    console.log("leitura da conexão: FALHOU");
    process.exit(1);
  }

  console.log(`conexão ${conexao.id} em ${conexao.status}`);

  const { data: token, error: erroToken } = await supabase.rpc(
    "read_meta_connection_token",
    { p_connection_id: conexao.id },
  );

  if (erroToken || !token) {
    console.log("leitura do token: FALHOU");
    process.exit(1);
  }

  console.log(`token lido do Vault: ${token.length} caracteres\n`);

  console.log("Mesmo nó, mesmo token, mesma versão — muda só `fields`:\n");

  // Controle: o nó responde para este token?
  relatar("id,name", await lerMe("id,name", token));

  // Exatamente o que `classifyCredential` pede hoje.
  relatar("client_business_id", await lerMe("client_business_id", token));

  // Variação: o campo acompanhado de um campo aceito.
  relatar("id,client_business_id", await lerMe("id,client_business_id", token));

  console.log("\n=== fim — nenhuma mutação executada ===");
}

main().catch(() => {
  console.error("sonda falhou de forma inesperada");
  process.exit(1);
});
