/**
 * Sonda read-only da Rodada 003B — §7 do mandato, etapas 8 a 10.
 *
 * Roda **depois** do OAuth real da 003B, contra a conexão viva. Serve para
 * provar, com fatos, três coisas que só o provider pode responder:
 *
 *   1. o token da conexão consegue descobrir a Página e a conta profissional;
 *   2. o mesmo token consegue **ler o IG User selecionado** — ou não, e nesse
 *      caso qual é a resposta sanitizada da Meta;
 *   3. o mesmo token consegue **ler Insights**, que é a capacidade que a Fase 4
 *      vai consumir.
 *
 * O que ele NÃO faz, e não deve passar a fazer: nenhuma escrita no Supabase,
 * nenhum endpoint mutável da Meta, nenhuma importação de post, nenhum Page
 * Access Token pedido ou persistido, nenhuma ampliação de permissão. Se a
 * leitura falhar por falta de `ads_management` ou por exigir Page Access
 * Token, o desfecho é **decisão arquitetural do GPT**, não um ajuste aqui.
 *
 * Nada de segredo é impresso: nem token, nem App Secret, nem `message` da Meta
 * — que pode citar a credencial. Só código, subcódigo, tipo e contagens.
 *
 * Uso:
 *   node scripts/meta-assets-003b-probe.mjs
 *
 * Requer `.env.local` com NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY e
 * META_GRAPH_API_VERSION (ou usa o default v26.0).
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

async function ler(path, params) {
  const url = new URL(`${BASE}/${path}`);
  for (const [chave, valor] of Object.entries(params)) url.searchParams.set(chave, valor);

  try {
    const resposta = await fetch(url, { method: "GET" });
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
  console.log("=== Sonda 003B — read-only, sem mutação ===\n");

  const { data: conexoes, error } = await supabase
    .from("meta_connections")
    .select("id, status, granted_scopes")
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
  const escopos = conexao.granted_scopes ?? [];

  console.log("0. conexão ACTIVE");
  console.log(`   escopos concedidos: ${escopos.join(", ") || "(nenhum)"}`);

  const { data: token, error: erroToken } = await supabase.rpc(
    "read_meta_connection_token",
    { p_connection_id: conexao.id },
  );

  if (erroToken || !token) {
    console.log("\n1. leitura do token: FALHOU");
    process.exit(1);
  }

  console.log(`\n1. token presente (${token.length} caracteres)`);

  // -------------------------------------------------------------------------
  // 2. Descoberta — Páginas e conta profissional
  // -------------------------------------------------------------------------
  console.log("\n2. GET /me/accounts");
  const contas = await ler("me/accounts", {
    fields: "id,name,instagram_business_account",
    limit: "50",
    access_token: token,
  });

  if (!relatar("descoberta", contas)) process.exit(1);

  const paginas = Array.isArray(contas.corpo?.data) ? contas.corpo.data : [];
  const comInstagram = paginas.filter((p) => p?.instagram_business_account?.id);

  console.log(`   páginas ........... ${paginas.length}`);
  console.log(`   com Instagram ..... ${comInstagram.length}`);

  if (comInstagram.length === 0) {
    console.log("\n   => nenhuma conta profissional vinculada. As sondas 3 e 4");
    console.log("      não têm alvo; devolver o fato ao GPT.");
    process.exit(0);
  }

  // Alvo: a conta já selecionada pelo produto, se houver; senão a primeira
  // descoberta. A seleção é lida sem expor o id no console.
  const { data: selecionada } = await supabase
    .from("instagram_accounts")
    .select("external_instagram_account_id, username")
    .eq("meta_connection_id", conexao.id)
    .eq("status", "SELECTED")
    .maybeSingle();

  const igId =
    selecionada?.external_instagram_account_id ??
    comInstagram[0].instagram_business_account.id;

  console.log(
    `   alvo das sondas ... ${selecionada ? "conta selecionada no produto" : "primeira descoberta"}` +
      (selecionada?.username ? ` (@${selecionada.username})` : ""),
  );

  // -------------------------------------------------------------------------
  // 3. Sonda do IG User — o gate sobre Page Access Token
  // -------------------------------------------------------------------------
  console.log("\n3. GET /{ig-user} — leitura de metadados");
  const igUser = await ler(igId, {
    fields: "id,username,media_count,followers_count",
    access_token: token,
  });

  const leituraOk = relatar("IG User", igUser);

  if (leituraOk) {
    console.log(`   media_count ....... ${igUser.corpo?.media_count ?? "n/d"}`);
    console.log(`   followers_count ... ${igUser.corpo?.followers_count ?? "n/d"}`);
  } else {
    console.log("\n   => o token da conexão não leu o IG User.");
    console.log("      NÃO persistir Page Access Token. Parar em");
    console.log("      DECISÃO ARQUITETURAL NECESSÁRIA — AGUARDANDO GPT.");
  }

  // -------------------------------------------------------------------------
  // 4. Sonda de Insights — o gate sobre ads_management
  // -------------------------------------------------------------------------
  console.log("\n4. GET /{ig-user}/insights — capacidade da Fase 4");
  const insights = await ler(`${igId}/insights`, {
    metric: "reach",
    period: "day",
    access_token: token,
  });

  if (relatar("Insights", insights)) {
    const series = Array.isArray(insights.corpo?.data) ? insights.corpo.data : [];
    console.log(`   métricas devolvidas: ${series.length}`);
    console.log("   => Fase 4 tem caminho de leitura de métricas.");
  } else {
    console.log("\n   => se a recusa citar ads_management/ads_read por causa do");
    console.log("      papel da Página via Business Manager, NÃO ampliar a config.");
    console.log("      Parar em DECISÃO ARQUITETURAL NECESSÁRIA — AGUARDANDO GPT.");
  }

  // -------------------------------------------------------------------------
  // 5. Ramo opcional — contas de anúncios
  // -------------------------------------------------------------------------
  console.log("\n5. contas de anúncios (opcional)");

  if (!escopos.includes("ads_read")) {
    console.log("   ads_read .......... não concedido");
    console.log("   => ramo opcional ausente. Não reprova o caminho orgânico.");
    return;
  }

  const adAccounts = await ler("me/adaccounts", {
    fields: "id,name,account_status,currency,timezone_name",
    limit: "50",
    access_token: token,
  });

  if (relatar("descoberta de anúncios", adAccounts)) {
    const contasAds = Array.isArray(adAccounts.corpo?.data) ? adAccounts.corpo.data : [];
    console.log(`   contas ............ ${contasAds.length}`);
  }
}

main().catch((erro) => {
  // Sem `erro.message`: uma URL com token pode estar dentro dele.
  console.error("sonda interrompida:", erro?.name ?? "erro desconhecido");
  process.exit(1);
});
