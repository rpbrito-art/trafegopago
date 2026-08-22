/**
 * Smoke test real do fluxo de autenticação da Rodada 001B.
 *
 * Fala com o projeto Supabase de verdade e com a aplicação Next de verdade —
 * não há mock aqui. Prova, em uma passagem:
 *
 *   cadastro -> confirmação SSR -> sessão em cookie -> área protegida ->
 *   logout -> login posterior
 *
 * Além do caminho feliz, exercita os vetores de abuso do endpoint de
 * confirmação: token inválido, token reutilizado, tipo de OTP fora do escopo e
 * open redirect.
 *
 * Uso:
 *   node scripts/smoke-auth.mjs
 *   SMOKE_APP_URL=http://localhost:3100 node scripts/smoke-auth.mjs
 *
 * Requer `.env.local` com NEXT_PUBLIC_SUPABASE_URL, a chave publicável e
 * SUPABASE_SECRET_KEY. A secret key é usada somente aqui — fora do bundle da
 * aplicação — para gerar o link de confirmação sem depender da entrega do
 * e-mail e para remover o usuário de teste ao final.
 */

import { readFileSync } from "node:fs";

import { createServerClient } from "@supabase/ssr";
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
const PUBLISHABLE_KEY =
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SECRET_KEY = env.SUPABASE_SECRET_KEY;
const APP_URL = (process.env.SMOKE_APP_URL ?? "http://localhost:3000").replace(
  /\/$/,
  "",
);

for (const [name, value] of Object.entries({
  NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: PUBLISHABLE_KEY,
  SUPABASE_SECRET_KEY: SECRET_KEY,
})) {
  if (!value) {
    console.error(`Faltando ${name} em .env.local`);
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Utilidades de prova
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

/** Esconde qualquer coisa que pareça token ou chave antes de imprimir. */
function redigir(texto) {
  return String(texto)
    .replace(
      /(token_hash|token|access_token|refresh_token|code)=[^&\s]+/gi,
      "$1=<REDIGIDO>",
    )
    .replace(/sb_(publishable|secret)_[A-Za-z0-9_-]+/g, "sb_$1_<REDIGIDO>");
}

/** Jar de cookies mínimo: nome -> valor, como um browser enxergaria. */
class CookieJar {
  #cookies = new Map();

  absorverSetCookie(lista) {
    for (const raw of lista) {
      const [pair] = raw.split(";");
      const eq = pair.indexOf("=");
      if (eq === -1) continue;

      const name = pair.slice(0, eq).trim();
      const value = pair.slice(eq + 1).trim();
      const expirado = /max-age=0|expires=Thu, 01 Jan 1970/i.test(raw);

      if (expirado || value === "") this.#cookies.delete(name);
      else this.#cookies.set(name, value);
    }
  }

  absorver(response) {
    this.absorverSetCookie(response.headers.getSetCookie());
  }

  header() {
    return [...this.#cookies]
      .map(([name, value]) => `${name}=${value}`)
      .join("; ");
  }

  nomes() {
    return [...this.#cookies.keys()];
  }

  temSessao() {
    return this.nomes().some((name) => name.startsWith("sb-"));
  }
}

async function pedir(path, { jar, ...init } = {}) {
  const headers = { ...(init.headers ?? {}) };

  if (jar) {
    const cookie = jar.header();
    if (cookie) headers.cookie = cookie;
  }

  const response = await fetch(`${APP_URL}${path}`, {
    ...init,
    headers,
    redirect: "manual",
  });

  if (jar) jar.absorver(response);
  return response;
}

function destino(response) {
  const location = response.headers.get("location");
  return location ? new URL(location, APP_URL).pathname : null;
}

// ---------------------------------------------------------------------------
// Execução
// ---------------------------------------------------------------------------

const admin = createClient(SUPABASE_URL, SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const publico = createClient(SUPABASE_URL, PUBLISHABLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const carimbo = process.env.SMOKE_STAMP ?? String(Date.now());
const EMAIL = `smoke-001b-${carimbo}@trafegopago-teste.com`;
const SENHA = `Smoke-001B-${carimbo}!`;

let userId = null;

try {
  // -- 0. Aplicação de pé -----------------------------------------------------
  const home = await pedir("/");
  prova("aplicação responde na home", home.status === 200, `status ${home.status}`);

  // -- 1. Guard antes de existir qualquer sessão ------------------------------
  const semSessao = await pedir("/conta");
  prova(
    "rota protegida nega visitante sem sessão",
    semSessao.status === 307 && destino(semSessao) === "/entrar",
    `status ${semSessao.status} -> ${destino(semSessao)}`,
  );

  // -- 2. Cadastro real -------------------------------------------------------
  const { data: criado, error: erroCriacao } =
    await admin.auth.admin.generateLink({
      type: "signup",
      email: EMAIL,
      password: SENHA,
    });

  if (erroCriacao) throw new Error(`generateLink falhou: ${erroCriacao.message}`);

  userId = criado.user?.id ?? null;
  const tokenHash = criado.properties?.hashed_token;

  prova("cadastro cria usuário real no Supabase", Boolean(userId));
  prova("Supabase emite token_hash de confirmação", Boolean(tokenHash));
  prova(
    "usuário nasce sem e-mail confirmado",
    !criado.user?.email_confirmed_at,
    `email_confirmed_at=${criado.user?.email_confirmed_at ?? "null"}`,
  );

  // O action_link revela a Site URL configurada no projeto remoto: é assim que
  // o e-mail real montaria o endereço de confirmação.
  console.log(
    `        Site URL remota em uso: ${redigir(criado.properties?.action_link ?? "")}`,
  );

  // -- 3. Login antes da confirmação deve falhar ------------------------------
  const { error: erroPreConfirmacao } = await publico.auth.signInWithPassword({
    email: EMAIL,
    password: SENHA,
  });

  prova(
    "login é recusado enquanto o e-mail não está confirmado",
    erroPreConfirmacao?.code === "email_not_confirmed",
    `code=${erroPreConfirmacao?.code ?? "sem erro"}`,
  );

  // -- 4. Endpoint de confirmação sob entradas hostis -------------------------
  const invalidos = [
    ["sem parâmetros", ""],
    ["sem token_hash", "?type=signup"],
    ["sem type", `?token_hash=${tokenHash}`],
    ["tipo fora do escopo (recovery)", `?token_hash=${tokenHash}&type=recovery`],
    ["token forjado", "?token_hash=nao-existe-esse-token&type=signup"],
  ];

  for (const [rotulo, query] of invalidos) {
    const jarTemp = new CookieJar();
    const response = await pedir(`/auth/confirm${query}`, { jar: jarTemp });

    prova(
      `confirmação recusa: ${rotulo}`,
      destino(response) === "/auth/erro" && !jarTemp.temSessao(),
      `-> ${destino(response)}, cookies de sessão=${jarTemp.temSessao()}`,
    );
  }

  const jarRedirect = new CookieJar();
  const openRedirect = await pedir(
    `/auth/confirm?token_hash=token-invalido&type=signup&next=${encodeURIComponent(
      "https://evil.example",
    )}`,
    { jar: jarRedirect },
  );

  prova(
    "confirmação bloqueia open redirect",
    !(openRedirect.headers.get("location") ?? "").includes("evil.example"),
    `location=${redigir(openRedirect.headers.get("location") ?? "")}`,
  );

  const loginComNextExterno = await pedir(
    `/entrar?next=${encodeURIComponent("https://evil.example")}`,
  );
  const htmlLogin = await loginComNextExterno.text();
  const campoNext = /name="next"\s+value="([^"]*)"/.exec(htmlLogin)?.[1];

  // O payload RSC ecoa a URL pedida — isso é o framework repetindo o endereço
  // que o próprio browser já tem, não um destino. O que importa é o valor que o
  // formulário vai enviar de volta ao servidor.
  prova(
    "tela de login sanitiza o destino antes de colocá-lo no formulário",
    campoNext === "/conta",
    `campo next=${campoNext}`,
  );

  // -- 5. Confirmação real ----------------------------------------------------
  const jar = new CookieJar();
  const confirmacao = await pedir(
    `/auth/confirm?token_hash=${tokenHash}&type=signup`,
    { jar },
  );

  prova(
    "confirmação válida redireciona para a área protegida",
    destino(confirmacao) === "/conta",
    `-> ${destino(confirmacao)}`,
  );
  prova(
    "confirmação grava sessão em cookies",
    jar.temSessao(),
    `cookies=${jar.nomes().join(", ")}`,
  );
  prova(
    "destino da confirmação não carrega o token",
    !(confirmacao.headers.get("location") ?? "").includes(tokenHash),
  );

  // -- 6. Área protegida com sessão ------------------------------------------
  const conta = await pedir("/conta", { jar });
  const htmlConta = await conta.text();

  prova(
    "usuário autenticado acessa a área protegida",
    conta.status === 200,
    `status ${conta.status}`,
  );
  prova(
    "área protegida mostra a identidade verificada no servidor",
    htmlConta.includes(userId) && htmlConta.includes(EMAIL),
  );

  const jarReuso = new CookieJar();
  const reuso = await pedir(
    `/auth/confirm?token_hash=${tokenHash}&type=signup`,
    { jar: jarReuso },
  );

  prova(
    "token de confirmação não pode ser reutilizado",
    destino(reuso) === "/auth/erro" && !jarReuso.temSessao(),
    `-> ${destino(reuso)}`,
  );

  // -- 7. Login e logout ------------------------------------------------------
  // O logout do produto é uma Server Action. Aqui exercita-se a mesma cadeia
  // sobre a sessão real — mesma biblioteca de cookies que a aplicação usa —
  // provando revogação no provider e remoção dos cookies.
  const cookiesSSR = new Map();

  const ssr = createServerClient(SUPABASE_URL, PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => [...cookiesSSR].map(([name, value]) => ({ name, value })),
      setAll: (lista) => {
        for (const { name, value } of lista) {
          if (value === "") cookiesSSR.delete(name);
          else cookiesSSR.set(name, value);
        }
      },
    },
  });

  const { data: sessaoLogin, error: erroLogin } =
    await ssr.auth.signInWithPassword({ email: EMAIL, password: SENHA });

  prova(
    "login com a senha real funciona após a confirmação",
    !erroLogin && Boolean(sessaoLogin?.session),
    erroLogin ? `code=${erroLogin.code}` : "",
  );

  const jarSSR = new CookieJar();
  jarSSR.absorverSetCookie(
    [...cookiesSSR].map(([name, value]) => `${name}=${value}; Path=/`),
  );

  const contaPosLogin = await pedir("/conta", { jar: jarSSR });
  prova(
    "sessão criada por login dá acesso à área protegida",
    contaPosLogin.status === 200,
    `status ${contaPosLogin.status}`,
  );

  const refreshToken = sessaoLogin?.session?.refresh_token;
  const { error: erroLogout } = await ssr.auth.signOut();

  prova("logout não retorna erro", !erroLogout);
  prova(
    "logout remove os cookies de sessão",
    ![...cookiesSSR.keys()].some((name) => name.startsWith("sb-")),
    `cookies de sessão restantes=${[...cookiesSSR.keys()].filter((n) => n.startsWith("sb-")).length}`,
  );

  const refreshResponse = await fetch(
    `${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,
    {
      method: "POST",
      headers: { apikey: PUBLISHABLE_KEY, "content-type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    },
  );

  prova(
    "logout revoga o refresh token no provider",
    refreshResponse.status >= 400,
    `status ${refreshResponse.status}`,
  );

  // -- 8. Login posterior -----------------------------------------------------
  const { error: erroRelogin } = await publico.auth.signInWithPassword({
    email: EMAIL,
    password: SENHA,
  });

  prova("login posterior continua funcionando", !erroRelogin);

  const { error: erroSenhaErrada } = await publico.auth.signInWithPassword({
    email: EMAIL,
    password: `${SENHA}-errada`,
  });

  prova(
    "senha errada é recusada",
    erroSenhaErrada?.code === "invalid_credentials",
    `code=${erroSenhaErrada?.code}`,
  );
} finally {
  // -- 9. Limpeza -------------------------------------------------------------
  if (userId) {
    const { error } = await admin.auth.admin.deleteUser(userId);
    prova("usuário de teste removido do projeto", !error, error?.message ?? "");
  }
}

console.log(
  `\n${provas.filter((p) => p.ok).length}/${provas.length} provas passaram.`,
);

process.exit(falhas === 0 ? 0 : 1);
