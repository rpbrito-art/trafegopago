/**
 * Sonda read-only do COMPLEMENTO 003B-05 — prova direta da Page Quoron.
 *
 * Mandato: `rodadas/gpt/COMPLEMENTO_003B_05_PAGE_DIRECT_READONLY.md`.
 *
 * Pergunta única: o User Access Token corrente **não consegue ler** o objeto
 * Page `1356474050873300`, ou consegue lê-lo diretamente e o problema está
 * apenas no edge `/me/accounts`, que não o enumera?
 *
 * Executa somente duas chamadas:
 *
 *   1. `GET /1356474050873300?fields=id,name`
 *   2. só se a primeira devolver HTTP 200,
 *      `GET /1356474050873300?fields=id,name,instagram_business_account`
 *
 * NÃO repete `debug_token`, `/me`, `/me/accounts` nem `/me/adaccounts` — a
 * investigação anterior já os provou. Nenhuma escrita, nenhum OAuth, nenhum
 * endpoint mutável, nenhum Page Access Token pedido ou persistido.
 *
 * Nada de segredo é impresso: nem token, nem App Secret, nem URL (que carrega
 * credencial na query), nem `message` da Meta — que pode citar a credencial.
 * Só HTTP, `id`, `name`, `instagram_business_account.id` e code/subcode/type.
 *
 * Uso:
 *   node scripts/meta-page-direct-003b-05-probe.mjs
 *
 * Requer `.env.local` com NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SECRET_KEY.
 */

import { readFileSync } from "node:fs";

import { createClient } from "@supabase/supabase-js";

/** Page Quoron — id público, fixado pelo mandato. */
const PAGE_ID = "1356474050873300";

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

/** Só o que pode ser lido em voz alta. */
function fatosDoErro(corpo) {
  const e = corpo?.error;
  if (!e) return null;
  return { code: e.code ?? null, subcode: e.error_subcode ?? null, type: e.type ?? null };
}

/** GET sanitizado: token no header, nunca na URL; URL nunca impressa. */
async function ler(path, params, token) {
  const url = new URL(`${BASE}/${path}`);
  for (const [chave, valor] of Object.entries(params)) url.searchParams.set(chave, valor);

  try {
    const resposta = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
    const corpo = await resposta.json().catch(() => null);
    return { http: resposta.status, ok: resposta.ok, corpo };
  } catch {
    return { http: 0, ok: false, corpo: null };
  }
}

function relatar(rotulo, resultado) {
  if (resultado.ok) {
    console.log(`   ${rotulo} ......... OK (HTTP ${resultado.http})`);
    return true;
  }

  const fatos = fatosDoErro(resultado.corpo);
  console.log(
    `   ${rotulo} ......... FALHOU (HTTP ${resultado.http}` +
      (fatos ? `, code ${fatos.code}, subcode ${fatos.subcode}, ${fatos.type}` : "") +
      ")",
  );
  return false;
}

async function main() {
  console.log("=== Complemento 003B-05 — prova direta da Page, read-only ===\n");
  console.log(`Graph API: ${VERSAO}`);
  console.log(`Page alvo: ${PAGE_ID}\n`);

  const { data: conexoes, error } = await supabase
    .from("meta_connections")
    .select("id, status")
    .eq("status", "ACTIVE");

  if (error) {
    console.log("0. leitura da conexão: FALHOU", error.code);
    process.exit(1);
  }

  if (conexoes.length !== 1) {
    console.log(`0. conexões ACTIVE: ${conexoes.length} (esperava 1)`);
    process.exit(1);
  }

  const conexao = conexoes[0];
  console.log(`0. conexão ACTIVE ... ${conexao.id}`);

  const { data: token, error: erroToken } = await supabase.rpc(
    "read_meta_connection_token",
    { p_connection_id: conexao.id },
  );

  if (erroToken || !token) {
    console.log("   leitura do token: FALHOU");
    process.exit(1);
  }

  console.log(`   token lido do Vault: ${token.length} caracteres`);

  // ---------------------------------------------------------------------------
  // 1. A Page é legível diretamente pelo User Token?
  // ---------------------------------------------------------------------------
  console.log(`\n1. GET /${PAGE_ID}?fields=id,name`);
  const basico = await ler(PAGE_ID, { fields: "id,name" }, token);

  if (!relatar("page", basico)) {
    console.log("\n   => o token NÃO lê a Page diretamente. Devolver o fato ao GPT.");
    console.log("\n=== fim — nenhuma mutação executada ===");
    return;
  }

  console.log(`   id ................ ${basico.corpo?.id ?? "n/d"}`);
  console.log(`   name .............. ${basico.corpo?.name ?? "n/d"}`);

  // ---------------------------------------------------------------------------
  // 2. Só se a 1 passou: a Page expõe a conta profissional vinculada?
  // ---------------------------------------------------------------------------
  console.log(`\n2. GET /${PAGE_ID}?fields=id,name,instagram_business_account`);
  const comIg = await ler(
    PAGE_ID,
    { fields: "id,name,instagram_business_account" },
    token,
  );

  if (relatar("page+ig", comIg)) {
    console.log(`   id ................ ${comIg.corpo?.id ?? "n/d"}`);
    console.log(`   name .............. ${comIg.corpo?.name ?? "n/d"}`);
    console.log(
      `   instagram_business_account.id: ${comIg.corpo?.instagram_business_account?.id ?? "(ausente)"}`,
    );
  }

  console.log("\n=== fim — nenhuma mutação executada ===");
}

main().catch(() => {
  console.error("sonda falhou de forma inesperada");
  process.exit(1);
});
