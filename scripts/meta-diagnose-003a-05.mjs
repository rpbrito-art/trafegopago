/**
 * Diagnóstico da Investigação 003A-05 — por que o E2E real de desconexão
 * falhou fechado.
 *
 * O fundador acionou `Desconectar` uma vez; a UI voltou `/conta?meta=erro` e o
 * estado remoto ficou intacto. A action não propaga o `reason`, então o motivo
 * não aparece na URL — por desenho. Este script reconstrói o caminho pelas
 * **mesmas** chamadas que `revokeOnMeta` faz, parando antes de qualquer
 * revogação.
 *
 * O que ele executa, nesta ordem:
 *
 *   1. `read_meta_connection_token` (RPC server-side, service_role)
 *   2. `GET /debug_token` — a inspeção inicial, somente leitura
 *
 * O que ele **não** executa, e não deve passar a executar: `oauth/revoke`,
 * `DELETE /{user-id}/permissions`, `revoke_meta_connection`, nem qualquer
 * escrita no Supabase. A investigação 003A-05 é read-only.
 *
 * O token e o App Secret nunca são impressos, gravados nem colocados em
 * mensagem de erro. Do token só saem fatos: comprimento, `is_valid`, `type`,
 * `expires_at`, escopos, `app_id` e código de erro sanitizado.
 *
 * Uso:
 *   node scripts/meta-diagnose-003a-05.mjs
 *
 * Requer `.env.local` com NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY,
 * META_APP_ID e META_APP_SECRET.
 */

import { readFileSync } from "node:fs";

import { createClient } from "@supabase/supabase-js";

const VERSAO_GRAPH = "v26.0";

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

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

/** Só o que pode ser lido em voz alta. */
function fatosDoErro(corpo) {
  const e = corpo?.error;
  if (!e) return null;
  return {
    code: e.code ?? null,
    subcode: e.error_subcode ?? null,
    type: e.type ?? null,
    // `message` da Meta pode citar o token; fica de fora de propósito.
  };
}

async function main() {
  console.log("=== Investigação 003A-05 — diagnóstico read-only ===\n");

  // -------------------------------------------------------------------------
  // Etapa 0 — a conexão viva
  // -------------------------------------------------------------------------
  const { data: conexoes, error: erroConexao } = await supabase
    .from("meta_connections")
    .select("id, status, disconnected_at, token_secret_reference, updated_at")
    .in("status", ["PENDING", "ACTIVE", "ACTION_REQUIRED"]);

  if (erroConexao) {
    console.log("0. leitura da conexão: FALHOU", erroConexao.code);
    process.exit(1);
  }

  if (conexoes.length !== 1) {
    console.log(`0. conexões vivas: ${conexoes.length} (esperava 1)`);
    process.exit(1);
  }

  const conexao = conexoes[0];
  console.log("0. conexão viva");
  console.log(`   status ............ ${conexao.status}`);
  console.log(`   disconnected_at ... ${conexao.disconnected_at ?? "null"}`);
  console.log(`   tem referência .... ${conexao.token_secret_reference !== null}`);
  console.log(`   updated_at ........ ${conexao.updated_at}`);

  // -------------------------------------------------------------------------
  // Etapa 1 — leitura do token no Vault (a mesma RPC do gateway)
  // -------------------------------------------------------------------------
  const { data: token, error: erroLeitura } = await supabase.rpc(
    "read_meta_connection_token",
    { p_connection_id: conexao.id },
  );

  console.log("\n1. read_meta_connection_token");
  if (erroLeitura) {
    console.log(`   resultado ......... ERRO ${erroLeitura.code}`);
    console.log("   => a tentativa real teria parado aqui (TOKEN_READ_FAILED)");
    process.exit(0);
  }

  if (!token) {
    console.log("   resultado ......... vazio (sem token)");
    console.log("   => a tentativa real teria pulado a revogação remota");
    process.exit(0);
  }

  console.log("   resultado ......... token presente");
  console.log(`   comprimento ....... ${token.length} caracteres`);
  console.log("   => etapa 1 não é a causa");

  // -------------------------------------------------------------------------
  // Etapa 2 — inspeção inicial `debug_token`, idêntica à do gateway
  // -------------------------------------------------------------------------
  const url = new URL(`https://graph.facebook.com/${VERSAO_GRAPH}/debug_token`);
  url.searchParams.set("input_token", token);
  url.searchParams.set(
    "access_token",
    `${env.META_APP_ID}|${env.META_APP_SECRET}`,
  );

  console.log("\n2. GET /debug_token (somente leitura)");

  let resposta;
  try {
    resposta = await fetch(url, { method: "GET" });
  } catch (erro) {
    console.log(`   resultado ......... falha de rede (${erro.name})`);
    console.log("   => a tentativa real teria parado aqui");
    process.exit(0);
  }

  const corpo = await resposta.json().catch(() => null);

  console.log(`   HTTP .............. ${resposta.status}`);

  if (!resposta.ok) {
    console.log(`   erro .............. ${JSON.stringify(fatosDoErro(corpo))}`);
    console.log("   => inspeção inicial falha: o gateway para ANTES de revogar");
    process.exit(0);
  }

  const d = corpo?.data ?? {};
  const tipoIsValid = typeof d.is_valid;

  console.log(`   is_valid .......... ${d.is_valid} (${tipoIsValid})`);
  console.log(`   type .............. ${d.type ?? "ausente"}`);
  console.log(`   app_id ............ ${d.app_id ?? "ausente"}`);
  console.log(`   user_id ........... ${d.user_id ?? "ausente"}`);
  console.log(
    `   expires_at ........ ${d.expires_at ? new Date(d.expires_at * 1000).toISOString() : "ausente"}`,
  );
  console.log(`   scopes ............ ${(d.scopes ?? []).join(", ") || "nenhum"}`);
  // `data.error` vem da Meta e pode citar a credencial. Só os códigos saem.
  if (d.error) {
    console.log(
      `   data.error ........ code=${d.error.code ?? "?"} subcode=${d.error.subcode ?? "?"}`,
    );
  }

  console.log("\n=== leitura do caminho ===");

  if (tipoIsValid !== "boolean") {
    console.log("inspeção inicial devolve resposta ambígua → gateway para aqui");
  } else if (d.is_valid === false) {
    console.log("token JÁ INATIVO → o gateway pularia a revogação e limparia o local");
    console.log("(não é o que a tentativa real fez: o estado ficou intacto)");
  } else if (d.type === "SYSTEM_USER") {
    console.log("token ATIVO e SYSTEM_USER → etapas 1 e 2 passam");
    console.log("a classificação (003A-06A) provou BISU: encerramento é externo");
  } else {
    console.log(`token ATIVO com type=${d.type ?? "ausente"} → fail-closed por tipo`);
  }

  console.log("\nNenhuma revogação foi tentada por este script.");
}

main().catch((erro) => {
  console.error("diagnóstico falhou:", erro.name);
  process.exit(1);
});
