/**
 * Sonda read-only do COMPLEMENTO 003B-05 — IG User + Insights diretos.
 *
 * Mandato: `rodadas/gpt/COMPLEMENTO_003B_05_IG_DIRECT_INSIGHTS_READONLY.md`.
 *
 * Pergunta única: apesar de `/me/accounts` não enumerar a Page, o **mesmo**
 * User Access Token corrente consegue ler diretamente o Instagram profissional
 * já identificado e a capacidade mínima de Insights que a Fase 4 consumiria?
 *
 * Executa somente duas chamadas:
 *
 *   A. `GET /17841429590351285?fields=id,username,media_count,followers_count`
 *   B. só se A devolver HTTP 200,
 *      `GET /17841429590351285/insights?metric=reach&period=day`
 *
 * O IG ID é **fixture diagnóstica**, não desenho de produto: nada aqui vira
 * descoberta por ID fixo. NÃO repete `debug_token`, `/me`, `/me/accounts`,
 * `/me/adaccounts` nem a prova direta da Page — todas já concluídas.
 *
 * Nenhuma escrita, nenhum OAuth, nenhum endpoint mutável, nenhum Page Access
 * Token pedido ou persistido, nenhum Instagram/Ad Account persistido, nenhuma
 * importação de conteúdo.
 *
 * Nada de segredo é impresso: nem token, nem App Secret, nem URL (que carrega
 * credencial na query), nem `message` da Meta — que pode citar a credencial.
 * Só HTTP, os campos pedidos e code/subcode/type.
 *
 * Uso:
 *   node scripts/meta-ig-direct-003b-05-probe.mjs
 *
 * Requer `.env.local` com NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SECRET_KEY.
 */

import { readFileSync } from "node:fs";

import { createClient } from "@supabase/supabase-js";

/** Conexão e IG User fixados pelo mandato — fixture diagnóstica. */
const CONNECTION_ID = "655da6e6-9056-456d-a81d-5e2570da5faf";
const IG_USER_ID = "17841429590351285";

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
  console.log("=== Complemento 003B-05 — IG direto + Insights, read-only ===\n");
  console.log(`Graph API: ${VERSAO}`);
  console.log(`IG User alvo (fixture diagnóstica): ${IG_USER_ID}\n`);

  const { data: conexao, error } = await supabase
    .from("meta_connections")
    .select("id, status")
    .eq("id", CONNECTION_ID)
    .maybeSingle();

  if (error || !conexao) {
    console.log("0. leitura da conexão: FALHOU", error?.code ?? "(não encontrada)");
    process.exit(1);
  }

  if (conexao.status !== "ACTIVE") {
    console.log(`0. conexão em ${conexao.status} (esperava ACTIVE)`);
    process.exit(1);
  }

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
  // A. O token lê o IG User diretamente?
  // ---------------------------------------------------------------------------
  console.log(`\nA. GET /${IG_USER_ID}?fields=id,username,media_count,followers_count`);
  const igUser = await ler(
    IG_USER_ID,
    { fields: "id,username,media_count,followers_count" },
    token,
  );

  if (!relatar("IG User", igUser)) {
    console.log("\n   => o token NÃO lê o IG User diretamente. B não tem alvo.");
    console.log("      Devolver a falha sanitizada ao GPT, sem ampliar scope.");
    console.log("\n=== fim — nenhuma mutação executada ===");
    return;
  }

  console.log(`   id ................ ${igUser.corpo?.id ?? "n/d"}`);
  console.log(`   username .......... ${igUser.corpo?.username ?? "n/d"}`);
  console.log(`   media_count ....... ${igUser.corpo?.media_count ?? "n/d"}`);
  console.log(`   followers_count ... ${igUser.corpo?.followers_count ?? "n/d"}`);

  // ---------------------------------------------------------------------------
  // B. Só se A passou: a capacidade mínima de Insights responde?
  // ---------------------------------------------------------------------------
  console.log(`\nB. GET /${IG_USER_ID}/insights?metric=reach&period=day`);
  const insights = await ler(
    `${IG_USER_ID}/insights`,
    { metric: "reach", period: "day" },
    token,
  );

  if (relatar("Insights", insights)) {
    const series = Array.isArray(insights.corpo?.data) ? insights.corpo.data : [];
    console.log(`   métricas retornadas: ${series.length}`);

    for (const m of series) {
      console.log(
        `     - name=${m?.name ?? "?"} period=${m?.period ?? "?"} ` +
          `pontos=${Array.isArray(m?.values) ? m.values.length : 0}`,
      );
    }
  }

  console.log("\n=== fim — nenhuma mutação executada ===");
}

main().catch(() => {
  console.error("sonda falhou de forma inesperada");
  process.exit(1);
});
