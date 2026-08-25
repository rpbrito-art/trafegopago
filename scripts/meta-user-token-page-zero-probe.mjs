/**
 * Sonda read-only da INVESTIGAÇÃO 003B-05 — `/me/accounts` vazio com User Token.
 *
 * Responde, por prova técnica e sem nenhuma mutação, por que um User Access
 * Token válido e com `pages_show_list` devolve zero Pages, apesar de o mesmo
 * perfil ter controle total da Página Quoron.
 *
 * Provas do mandato `rodadas/gpt/INVESTIGACAO_003B_05_PAGE_ZERO_GRANULAR_SCOPES.md`:
 *
 *   A. `debug_token` — validade, tipo, app correspondente, expiração, `scopes`
 *      e principalmente `granular_scopes`/`target_ids`;
 *   B. `GET /me?fields=id,name` — identidade efetiva do token;
 *   C. `GET /me/accounts` com e sem a expansão `instagram_business_account`,
 *      para separar "o edge devolve vazio" de "a expansão derruba o item";
 *   D. `GET /me/adaccounts` — controle independente, já que `ads_read` foi
 *      concedido: mostra se o token enxerga *outros* ativos Meta.
 *
 * O que ele NÃO faz: nenhuma escrita em lugar nenhum, nenhum endpoint mutável,
 * nenhum OAuth, nenhuma alteração de escopo, nenhum Page Access Token pedido ou
 * persistido, nenhuma edição de `.env.local`.
 *
 * Nada de segredo é impresso: nem token, nem App Secret, nem App Token, nem URL
 * (que carrega credencial na query), nem `message` da Meta — que pode citar a
 * credencial. Só HTTP, code/subcode/type, contagens e os IDs de ativo que o
 * próprio `estado.md` já registra.
 *
 * Uso:
 *   node scripts/meta-user-token-page-zero-probe.mjs
 *
 * Requer `.env.local` com NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY,
 * META_APP_ID e META_APP_SECRET.
 */

import { readFileSync } from "node:fs";

import { createClient } from "@supabase/supabase-js";

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

for (const nome of [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SECRET_KEY",
  "META_APP_ID",
  "META_APP_SECRET",
]) {
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

/**
 * GET sanitizado. O token vai no header `Authorization`, nunca na URL, e a URL
 * nunca é impressa. `params` só carrega campos públicos.
 */
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

/** Imprime `/me/accounts` só com os campos que o mandato autoriza. */
function relatarContas(rotulo, resultado) {
  console.log(`\n   ${rotulo}`);
  if (!relatar("chamada", resultado)) return;

  const itens = Array.isArray(resultado.corpo?.data) ? resultado.corpo.data : [];
  console.log(`   itens ............. ${itens.length}`);

  for (const item of itens) {
    const tasks = Array.isArray(item?.tasks) ? item.tasks.join("|") : "(sem tasks)";
    const ig = item?.instagram_business_account?.id ?? "(sem IG)";
    console.log(`     - id=${item?.id ?? "?"} name=${item?.name ?? "?"} tasks=${tasks} ig=${ig}`);
  }

  const paginacao = resultado.corpo?.paging;
  console.log(
    `   paging ............ ${paginacao ? Object.keys(paginacao).join(",") : "(ausente)"}`,
  );
}

async function main() {
  console.log("=== Investigação 003B-05 — read-only, sem mutação ===\n");
  console.log(`Graph API: ${VERSAO}\n`);

  const { data: conexoes, error } = await supabase
    .from("meta_connections")
    .select("id, status, granted_scopes, external_user_id")
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

  console.log("0. conexão ACTIVE");
  console.log(`   id ................ ${conexao.id}`);
  console.log(`   external_user_id .. ${conexao.external_user_id ?? "(nulo)"}`);
  console.log(`   escopos persistidos: ${(conexao.granted_scopes ?? []).join(", ") || "(nenhum)"}`);

  const { data: token, error: erroToken } = await supabase.rpc(
    "read_meta_connection_token",
    { p_connection_id: conexao.id },
  );

  if (erroToken || !token) {
    console.log("\n   leitura do token: FALHOU");
    process.exit(1);
  }

  console.log(`   token lido do Vault: ${token.length} caracteres`);

  // ---------------------------------------------------------------------------
  // A. debug_token — o coração da investigação
  // ---------------------------------------------------------------------------
  console.log("\nA. GET /debug_token");

  const appToken = `${env.META_APP_ID}|${env.META_APP_SECRET}`;
  const debug = await ler("debug_token", { input_token: token }, appToken);

  if (relatar("debug_token", debug)) {
    const d = debug.corpo?.data ?? {};

    console.log(`   is_valid .......... ${d.is_valid ?? "n/d"}`);
    console.log(`   type .............. ${d.type ?? "n/d"}`);
    console.log(`   matches_current_app: ${String(d.app_id) === String(env.META_APP_ID)}`);
    console.log(`   user_id ........... ${d.user_id ?? "n/d"}`);
    console.log(`   expires_at ........ ${d.expires_at ?? "n/d"}`);
    console.log(`   data_access_expires_at: ${d.data_access_expires_at ?? "n/d"}`);
    console.log(`   scopes ............ ${(d.scopes ?? []).join(", ") || "(nenhum)"}`);

    const granular = Array.isArray(d.granular_scopes) ? d.granular_scopes : [];
    console.log(`   granular_scopes ... ${granular.length} entrada(s)`);

    for (const g of granular) {
      const alvos = Array.isArray(g?.target_ids) ? g.target_ids : null;
      console.log(
        `     - ${g?.scope ?? "?"}: ` +
          (alvos === null
            ? "target_ids ausente (sem restrição declarada)"
            : `target_ids=[${alvos.join(", ")}] (${alvos.length})`),
      );
    }
  }

  // ---------------------------------------------------------------------------
  // B. Identidade
  // ---------------------------------------------------------------------------
  console.log("\nB. GET /me?fields=id,name");
  const me = await ler("me", { fields: "id,name" }, token);

  if (relatar("me", me)) {
    console.log(`   id ................ ${me.corpo?.id ?? "n/d"}`);
    console.log(`   name .............. ${me.corpo?.name ?? "n/d"}`);
    console.log(
      `   bate com a conexão: ${String(me.corpo?.id) === String(conexao.external_user_id)}`,
    );
  }

  // ---------------------------------------------------------------------------
  // C. Isolar /me/accounts — com e sem a expansão do Instagram
  // ---------------------------------------------------------------------------
  console.log("\nC. GET /me/accounts — duas variações");

  relatarContas(
    "C1. fields=id,name,tasks",
    await ler("me/accounts", { fields: "id,name,tasks", limit: "50" }, token),
  );

  relatarContas(
    "C2. fields=id,name,tasks,instagram_business_account",
    await ler(
      "me/accounts",
      { fields: "id,name,tasks,instagram_business_account", limit: "50" },
      token,
    ),
  );

  // ---------------------------------------------------------------------------
  // D. Ads como controle independente de ads_read
  // ---------------------------------------------------------------------------
  console.log("\nD. GET /me/adaccounts?fields=id,name,account_status");
  const ads = await ler(
    "me/adaccounts",
    { fields: "id,name,account_status", limit: "50" },
    token,
  );

  if (relatar("adaccounts", ads)) {
    const itens = Array.isArray(ads.corpo?.data) ? ads.corpo.data : [];
    console.log(`   itens ............. ${itens.length}`);
    for (const item of itens) {
      console.log(
        `     - id=${item?.id ?? "?"} name=${item?.name ?? "?"} status=${item?.account_status ?? "?"}`,
      );
    }
  }

  console.log("\n=== fim — nenhuma mutação executada ===");
}

main().catch(() => {
  console.error("sonda falhou de forma inesperada");
  process.exit(1);
});
