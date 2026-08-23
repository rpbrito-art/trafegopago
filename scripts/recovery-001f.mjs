/**
 * Prova real do fluxo de recuperação de senha da Rodada 001F.
 *
 * Fala com o projeto Supabase hospedado e com a aplicação Next de verdade. O
 * e-mail de recuperação é o e-mail real, entregue pelo SMTP configurado no
 * projeto — `admin.generateLink()` **não** é usado para produzir o link do
 * fluxo, porque isso provaria o endpoint e não o caminho que o usuário
 * percorre.
 *
 * Com o serviço nativo de e-mail do Supabase (sem SMTP customizado), a entrega
 * só ocorre para endereços de membros da equipe da organização, e o limite de
 * envio é baixo. `RECOVERY_TEST_EMAIL` precisa ser um desses endereços, e cada
 * execução gasta um envio.
 *
 * O link chega a uma caixa de entrada humana, então o script para uma vez e
 * pede que o operador cole a URL. Esse valor carrega um token de uso único: é
 * lido de stdin, nunca é impresso, nunca vai para arquivo e some com o
 * processo.
 *
 * O que fica provado, em uma passagem:
 *
 *   pedido pela UI pública (sem enumeração) -> e-mail real -> template hosted
 *   efetivo -> confirmação SSR -> sessão de OTP por e-mail recente (ver o
 *   predicado em `src/lib/auth/recovery.ts`) -> nova senha -> senha antiga
 *   morre, nova vale -> link não se reutiliza -> logout global revoga o
 *   refresh token da sessão que já existia
 *
 * As submissões de formulário usam o caminho de progressive enhancement do
 * Next (POST multipart com os campos ocultos da própria página). É a mesma
 * requisição que um browser sem JavaScript enviaria — e não um atalho por
 * dentro da aplicação.
 *
 * Uso:
 *   RECOVERY_TEST_EMAIL=voce+tp001f@exemplo.com node scripts/recovery-001f.mjs
 *
 * `RECOVERY_TEST_EMAIL` precisa ser uma caixa que o operador consiga abrir. O
 * usuário é criado e removido pelo próprio script.
 *
 * Requer `.env.local` com NEXT_PUBLIC_SUPABASE_URL, a chave publicável e
 * SUPABASE_SECRET_KEY. A secret key é usada **somente** para criar e apagar a
 * identidade de teste — nunca dentro do fluxo funcional de recuperação.
 */

import { readFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

import {
  classificarLinkRecovery,
  LINK_CONFIRMATION_URL_NATIVA,
  LINK_SSR,
  LINK_TERCEIRO,
} from "./lib/recovery-link.mjs";

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
const TEST_EMAIL = process.env.RECOVERY_TEST_EMAIL;

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

if (!TEST_EMAIL) {
  console.error(
    "Faltando RECOVERY_TEST_EMAIL: informe uma caixa de entrada real e descartável.",
  );
  process.exit(1);
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

function nota(texto) {
  console.log(`INFO   ${texto}`);
}

/** Esconde token, chave e o endereço de teste antes de qualquer impressão. */
function redigir(texto) {
  return String(texto)
    .replace(
      /(token_hash|token|access_token|refresh_token|code)=[^&\s]+/gi,
      "$1=<REDIGIDO>",
    )
    .replace(/sb_(publishable|secret)_[A-Za-z0-9_-]+/g, "sb_$1_<REDIGIDO>")
    .replaceAll(TEST_EMAIL, "<E-MAIL DE TESTE>");
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

  pares() {
    return [...this.#cookies].map(([name, value]) => ({ name, value }));
  }

  /**
   * Cookies que realmente carregam sessão.
   *
   * `resetPasswordForEmail` grava o *code verifier* do PKCE com prefixo `sb-`.
   * Ele não é sessão: não carrega access nem refresh token e não autentica
   * ninguém — a prova disso é o ensaio contra `/conta` logo abaixo. Contá-lo
   * como sessão dava falso positivo no pedido e falso negativo depois da
   * troca, quando o verifier sobrevive ao logout.
   */
  nomesDeSessao() {
    return this.nomes().filter(
      (name) => name.startsWith("sb-") && !name.endsWith("code-verifier"),
    );
  }

  temSessao() {
    return this.nomesDeSessao().length > 0;
  }
}

async function pedir(url, { jar, ...init } = {}) {
  const headers = { ...(init.headers ?? {}) };

  if (jar) {
    const cookie = jar.header();
    if (cookie) headers.cookie = cookie;
  }

  const response = await fetch(
    url.startsWith("http") ? url : `${APP_URL}${url}`,
    { ...init, headers, redirect: "manual" },
  );

  if (jar) jar.absorver(response);
  return response;
}

function destino(response) {
  const location = response.headers.get("location");
  return location ? new URL(location, APP_URL).pathname : null;
}

function desescapar(texto) {
  return texto
    .replaceAll("&quot;", '"')
    .replaceAll("&#x27;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}

/** Campos ocultos que o Next embute no formulário para funcionar sem JS. */
function camposOcultos(html) {
  const campos = {};

  for (const match of html.matchAll(/<input([^>]*)>/g)) {
    const atributos = match[1];
    if (!atributos.includes("hidden")) continue;

    const nome = /name="([^"]*)"/.exec(atributos)?.[1];
    if (!nome) continue;

    campos[desescapar(nome)] = desescapar(
      /value="([^"]*)"/.exec(atributos)?.[1] ?? "",
    );
  }

  return campos;
}

/**
 * Envia o formulário da página como um browser sem JavaScript enviaria.
 */
async function enviarFormulario(path, jar, valores) {
  const pagina = await pedir(path, { jar });
  const html = await pagina.text();
  const campos = { ...camposOcultos(html), ...valores };

  const boundary = `----trafegopago${Math.random().toString(16).slice(2)}`;
  const corpo = `${Object.entries(campos)
    .map(
      ([nome, valor]) =>
        `--${boundary}\r\nContent-Disposition: form-data; name="${nome}"\r\n\r\n${valor}\r\n`,
    )
    .join("")}--${boundary}--\r\n`;

  return pedir(path, {
    jar,
    method: "POST",
    headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
    body: corpo,
  });
}

async function perguntar(texto) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return (await rl.question(texto)).trim();
  } finally {
    rl.close();
  }
}

/** Cliente SSR alimentado por um jar, para ler claims como a aplicação lê. */
function clienteDoJar(jar) {
  return createServerClient(SUPABASE_URL, PUBLISHABLE_KEY, {
    cookies: { getAll: () => jar.pares(), setAll: () => {} },
  });
}

function entradasAmr(claims) {
  const amr = claims?.amr;
  if (!Array.isArray(amr)) return [];

  return amr
    .map((entrada) =>
      typeof entrada === "string"
        ? { method: entrada, timestamp: null }
        : { method: entrada?.method, timestamp: entrada?.timestamp ?? null },
    )
    .filter((entrada) => typeof entrada.method === "string");
}

function metodosAmr(claims) {
  return entradasAmr(claims).map((entrada) => entrada.method);
}

/**
 * Idade, em segundos, da entrada de `amr` que autoriza a troca de senha.
 *
 * `null` quando não há entrada de OTP por e-mail com instante utilizável — que
 * é exatamente o caso em que o guard nega.
 */
function idadeDoAutorizador(claims) {
  const agora = Date.now();

  const idades = entradasAmr(claims)
    .filter((entrada) => ["recovery", "otp"].includes(entrada.method))
    .filter((entrada) => typeof entrada.timestamp === "number")
    .map((entrada) => (agora - entrada.timestamp * 1000) / 1000);

  return idades.length ? Math.min(...idades) : null;
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

const carimbo = String(Date.now());
const SENHA_ANTIGA = `Antiga-001F-${carimbo}!`;
const SENHA_NOVA = `Nova-001F-${carimbo}!`;
const INEXISTENTE = `nao-existe-001f-${carimbo}@trafegopago-teste.com`;
const NEUTRA = "Se houver uma conta com esse e-mail";

let userId = null;

try {
  // -- 0. Aplicação de pé -----------------------------------------------------
  const home = await pedir("/");
  prova(
    "aplicação responde na home",
    home.status === 200,
    `status ${home.status}`,
  );

  // -- 1. Caminho descoberto a partir do login --------------------------------
  const login = await pedir("/entrar");
  const htmlLogin = await login.text();

  prova(
    "tela de login oferece o caminho de recuperação",
    htmlLogin.includes("/recuperar-senha") &&
      htmlLogin.includes("Esqueci minha senha"),
  );
  prova(
    "página pública de login não carrega a secret key",
    !htmlLogin.includes(SECRET_KEY),
  );

  // -- 2. Anti-enumeração na UI pública ---------------------------------------
  const primeiroInexistente = await enviarFormulario(
    "/recuperar-senha",
    new CookieJar(),
    { email: INEXISTENTE },
  );
  const htmlInexistente = await primeiroInexistente.text();

  const segundoInexistente = await enviarFormulario(
    "/recuperar-senha",
    new CookieJar(),
    { email: INEXISTENTE.replace("nao-existe", "tambem-nao-existe") },
  );
  const htmlSegundoInexistente = await segundoInexistente.text();

  prova(
    "pedido para e-mail inexistente responde de forma neutra",
    primeiroInexistente.status === 200 && htmlInexistente.includes(NEUTRA),
    `status ${primeiroInexistente.status}`,
  );
  prova(
    "resposta neutra não repete o e-mail digitado",
    !htmlInexistente.includes(INEXISTENTE),
  );
  prova(
    "dois e-mails inexistentes distintos produzem a mesma resposta",
    htmlSegundoInexistente.includes(NEUTRA),
  );

  const formatoInvalido = await enviarFormulario(
    "/recuperar-senha",
    new CookieJar(),
    { email: "isto-nao-e-email" },
  );
  const htmlFormatoInvalido = await formatoInvalido.text();

  prova(
    "e-mail malformado vira erro de campo, não resposta neutra",
    !htmlFormatoInvalido.includes(NEUTRA) &&
      /e-mail v[aá]lido/i.test(htmlFormatoInvalido),
  );

  // -- 3. Guarda da tela de nova senha antes de existir recovery --------------
  const semSessao = await pedir("/redefinir-senha");
  const htmlSemSessao = await semSessao.text();

  prova(
    "tela de nova senha sem sessão não mostra formulário",
    semSessao.status === 200 &&
      !htmlSemSessao.includes('name="password"') &&
      htmlSemSessao.includes("não é mais válido"),
    `status ${semSessao.status}`,
  );

  // -- 4. Identidade de teste -------------------------------------------------
  // Antes de criar: o endereço já pertence a alguém? O script cria e APAGA a
  // identidade que usa. Se o e-mail informado for de uma conta real, apagá-la
  // no final destruiria dado de verdade. Diante de qualquer conta preexistente
  // o smoke recusa e pede outro endereço — nunca toca no que já existe.
  const { data: existentes, error: erroLista } =
    await admin.auth.admin.listUsers({ perPage: 1000 });

  if (erroLista) {
    throw new Error(`não foi possível verificar auth.users: ${erroLista.message}`);
  }

  const jaExiste = existentes.users.some(
    (u) => (u.email ?? "").toLowerCase() === TEST_EMAIL.toLowerCase(),
  );

  prova(
    "endereço de teste não colide com conta existente em auth.users",
    !jaExiste,
    jaExiste ? "já existe — nada foi tocado" : "livre",
  );

  if (jaExiste) {
    throw new Error(
      "o endereço informado já tem conta neste projeto. O smoke NÃO usa nem " +
        "remove contas preexistentes. Informe outro endereço autorizado da " +
        "equipe da organização Supabase e repita.",
    );
  }

  const { data: criado, error: erroCriacao } =
    await admin.auth.admin.createUser({
      email: TEST_EMAIL,
      password: SENHA_ANTIGA,
      email_confirm: true,
    });

  if (erroCriacao) {
    throw new Error(
      `criação da identidade de teste falhou: ${erroCriacao.message}`,
    );
  }

  userId = criado.user?.id ?? null;
  prova("identidade de teste criada e confirmada", Boolean(userId));

  // Sessão comum, anterior à troca. Serve a dois propósitos: provar que sessão
  // de login não abre a tela de nova senha, e medir o efeito real da troca de
  // senha sobre sessões que já existiam.
  const cookiesLogin = new Map();
  const ssrLogin = createServerClient(SUPABASE_URL, PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => [...cookiesLogin].map(([name, value]) => ({ name, value })),
      setAll: (lista) => {
        for (const { name, value } of lista) {
          if (value === "") cookiesLogin.delete(name);
          else cookiesLogin.set(name, value);
        }
      },
    },
  });

  const { data: sessaoLogin, error: erroLogin } =
    await ssrLogin.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: SENHA_ANTIGA,
    });

  prova(
    "login com a senha antiga funciona antes da troca",
    !erroLogin && Boolean(sessaoLogin?.session),
    erroLogin ? `code=${erroLogin.code}` : "",
  );

  const refreshTokenAntigo = sessaoLogin?.session?.refresh_token;
  const jarLogin = new CookieJar();
  jarLogin.absorverSetCookie(
    [...cookiesLogin].map(([name, value]) => `${name}=${value}; Path=/`),
  );

  const contaComLogin = await pedir("/conta", { jar: jarLogin });
  prova(
    "sessão comum acessa a área protegida",
    contaComLogin.status === 200,
    `status ${contaComLogin.status}`,
  );

  const redefinirComLogin = await pedir("/redefinir-senha", { jar: jarLogin });
  const htmlRedefinirComLogin = await redefinirComLogin.text();

  prova(
    "sessão comum NÃO abre a tela de nova senha",
    !htmlRedefinirComLogin.includes('name="password"') &&
      htmlRedefinirComLogin.includes("não é mais válido"),
  );

  const claimsLogin = await clienteDoJar(jarLogin).auth.getClaims();
  const metodosLogin = metodosAmr(claimsLogin.data?.claims);

  prova(
    "sessão comum não declara recovery em amr",
    metodosLogin.length > 0 && !metodosLogin.includes("recovery"),
    `amr=${metodosLogin.join(",") || "vazio"}`,
  );

  // -- 5. Pedido real pela UI pública -----------------------------------------
  const jarPedido = new CookieJar();
  const pedidoReal = await enviarFormulario("/recuperar-senha", jarPedido, {
    email: TEST_EMAIL,
  });
  const htmlPedidoReal = await pedidoReal.text();

  prova(
    "pedido para conta existente responde exatamente como para inexistente",
    htmlPedidoReal.includes(NEUTRA),
  );
  prova(
    "pedido de recuperação não cria sessão",
    !jarPedido.temSessao(),
    `cookies de sessão=${jarPedido.nomesDeSessao().join(", ") || "nenhum"}`,
  );

  // O verifier do PKCE fica no jar, então a prova de que ele não vale como
  // credencial é empírica: com esses cookies, a área protegida continua fechada.
  const contaComPedido = await pedir("/conta", { jar: jarPedido });
  prova(
    "cookies do pedido não abrem a área protegida",
    destino(contaComPedido) === "/entrar" || contaComPedido.status >= 300,
    `HTTP ${contaComPedido.status} -> ${destino(contaComPedido) ?? "sem redirect"}`,
  );

  // -- 6. Gate humano: o link chega por e-mail real ---------------------------
  console.log("");
  nota("Um e-mail de recuperação real foi solicitado ao Auth hospedado.");
  nota("Abra a caixa de entrada de teste e copie o endereço completo do link.");
  nota("O valor colado NÃO é impresso, NÃO é gravado e some com o processo.");
  const linkColado = await perguntar("URL do link de recuperação: ");
  console.log("");

  let urlRecovery;
  let link;
  try {
    urlRecovery = new URL(linkColado);
    link = classificarLinkRecovery(linkColado, {
      appUrl: APP_URL,
      supabaseUrl: SUPABASE_URL,
    });
  } catch {
    throw new Error("o valor colado não é uma URL");
  }

  // A classificação vive em `scripts/lib/recovery-link.mjs`, com testes: as
  // três formas possíveis exigem reações diferentes e confundi-las já produziu
  // um diagnóstico falso nesta rodada.
  prova(
    "link do e-mail aponta para o endpoint SSR da própria aplicação",
    link.tipo === LINK_SSR,
    `host=${link.host} classificado como ${link.tipo}`,
  );

  if (link.tipo === LINK_CONFIRMATION_URL_NATIVA) {
    throw new Error(
      "o link recebido é a ConfirmationURL nativa do Supabase " +
        `(${link.host}${link.path}). É um link LEGÍTIMO do provider, não um ` +
        "rastreador — mas significa que o template efetivo do envio é o " +
        "padrão, e não o versionado em supabase/templates/recovery.html. " +
        "Em projeto Free criado depois de 2026-06-03, o SMTP nativo do " +
        "Supabase ignora templates customizados: é preciso SMTP de " +
        "desenvolvimento próprio para provar o template. Correção 001F-01 §6 " +
        "manda parar, não contornar.",
    );
  }

  if (link.tipo === LINK_TERCEIRO) {
    throw new Error(
      `o link foi reescrito por um host de terceiro (${link.host}), ` +
        "tipicamente click tracking do provedor SMTP. O token de recuperação " +
        "passa por fora do Supabase e da aplicação. Desabilite o rastreamento " +
        "de cliques no provedor e repita — não contornar.",
    );
  }

  const tokenHash = urlRecovery.searchParams.get("token_hash");

  prova(
    "link do e-mail declara type=recovery e traz token_hash",
    link.type === "recovery" && link.temTokenHash,
    `type=${link.type}`,
  );
  prova("link do e-mail não carrega next", !link.temNext);

  if (link.type !== "recovery" || !link.temTokenHash) {
    throw new Error(
      `o link recebido declara type=${link.type}, não \`recovery\`. O ` +
        "template hospedado em Authentication > Emails > Reset Password não é " +
        "o versionado em supabase/templates/recovery.html (o de confirmação " +
        "de cadastro usa type=email). Corrija o template e repita — correção " +
        "001F-01 §6 manda parar, não contornar.",
    );
  }

  const caminhoRecovery = `${urlRecovery.pathname}${urlRecovery.search}`;

  // -- 7. Confirmação SSR do recovery -----------------------------------------
  const jarRecovery = new CookieJar();
  const confirmacao = await pedir(caminhoRecovery, { jar: jarRecovery });
  const locationConfirmacao = confirmacao.headers.get("location") ?? "";

  prova(
    "confirmação de recovery leva à tela de nova senha",
    destino(confirmacao) === "/redefinir-senha",
    `-> ${destino(confirmacao)}`,
  );
  prova(
    "URL final não carrega token_hash nem o token bruto",
    !locationConfirmacao.includes("token_hash") &&
      !locationConfirmacao.includes(tokenHash ?? "impossível"),
    `location=${redigir(locationConfirmacao)}`,
  );
  prova(
    "confirmação de recovery grava sessão em cookies",
    jarRecovery.temSessao(),
    `cookies=${jarRecovery.nomes().length}`,
  );

  const claimsRecovery = await clienteDoJar(jarRecovery).auth.getClaims();
  const metodosRecovery = metodosAmr(claimsRecovery.data?.claims);

  // O provider vigente registra `otp` — e não `recovery` — para a sessão de
  // recuperação. A prova mede o que existe e nomeia a divergência em vez de
  // fingir que o método documentado apareceu. Ver `src/lib/auth/recovery.ts`.
  prova(
    "sessão de recovery nasce de OTP por e-mail e não de senha",
    metodosRecovery.some((metodo) => ["recovery", "otp"].includes(metodo)) &&
      !metodosRecovery.includes("password"),
    `amr=${metodosRecovery.join(",") || "vazio"}`,
  );
  nota(
    `método literal "recovery" presente em amr: ` +
      `${metodosRecovery.includes("recovery") ? "sim" : "NÃO (provider emite otp)"}`,
  );

  // O predicado da Correção 001F-01 §3.6 depende do instante gravado em `amr`.
  // Se o provider parar de emitir timestamp — ou passar a emiti-lo em outra
  // unidade —, o guard nega e é aqui que isso aparece, em vez de virar uma
  // tela de "link inválido" sem explicação.
  const idadeAmrSegundos = idadeDoAutorizador(claimsRecovery.data?.claims);

  prova(
    "amr da sessão de recovery declara instante utilizável",
    idadeAmrSegundos !== null,
    idadeAmrSegundos === null
      ? "nenhuma entrada recovery/otp com timestamp numérico"
      : `idade=${idadeAmrSegundos.toFixed(1)}s`,
  );
  prova(
    "método autorizador é recente o bastante para a janela de 15 min",
    idadeAmrSegundos !== null &&
      idadeAmrSegundos < 15 * 60 &&
      idadeAmrSegundos > -60,
    `idade=${idadeAmrSegundos === null ? "n/d" : `${idadeAmrSegundos.toFixed(1)}s`}`,
  );

  const claimsEmail = claimsRecovery.data?.claims?.email;
  prova(
    "claims de recovery trazem e-mail utilizável",
    typeof claimsEmail === "string" && claimsEmail.length > 0,
  );

  const telaNovaSenha = await pedir("/redefinir-senha", { jar: jarRecovery });
  const htmlNovaSenha = await telaNovaSenha.text();

  prova(
    "tela de nova senha aparece sob sessão de recovery",
    telaNovaSenha.status === 200 &&
      htmlNovaSenha.includes('name="password"') &&
      htmlNovaSenha.includes('name="passwordConfirmation"'),
    `status ${telaNovaSenha.status}`,
  );
  prova(
    "tela de nova senha não expõe segredo nem identidade",
    !htmlNovaSenha.includes(SECRET_KEY) && !htmlNovaSenha.includes(TEST_EMAIL),
  );

  // -- 8. Validação de campo antes da troca -----------------------------------
  const curta = await enviarFormulario("/redefinir-senha", jarRecovery, {
    password: "curta",
    passwordConfirmation: "curta",
  });
  const htmlCurta = await curta.text();

  prova(
    "senha curta é recusada sem ecoar o valor digitado",
    /pelo menos 8 caracteres/i.test(htmlCurta) &&
      !htmlCurta.includes('value="curta"'),
  );

  const divergente = await enviarFormulario("/redefinir-senha", jarRecovery, {
    password: SENHA_NOVA,
    passwordConfirmation: `${SENHA_NOVA}x`,
  });
  const htmlDivergente = await divergente.text();

  prova(
    "confirmação divergente é recusada sem ecoar a senha",
    /não coincidem/i.test(htmlDivergente) &&
      !htmlDivergente.includes(SENHA_NOVA),
  );

  // -- 9. Troca efetiva -------------------------------------------------------
  const troca = await enviarFormulario("/redefinir-senha", jarRecovery, {
    password: SENHA_NOVA,
    passwordConfirmation: SENHA_NOVA,
  });
  const locationTroca = troca.headers.get("location") ?? "";
  const trocaEfetivada =
    destino(troca) === "/entrar" && locationTroca.includes("redefinida=1");

  prova(
    "troca bem-sucedida volta ao login com aviso",
    destino(troca) === "/entrar" && locationTroca.includes("redefinida=1"),
    `-> ${redigir(locationTroca)}`,
  );
  prova(
    "destino da troca não carrega a senha",
    !locationTroca.includes(SENHA_NOVA),
  );
  prova(
    "sessão de recovery é encerrada depois da troca",
    !jarRecovery.temSessao(),
    `cookies de sessão=${jarRecovery.nomesDeSessao().length}`,
  );

  const loginPosTroca = await pedir("/entrar?redefinida=1");
  const htmlLoginPosTroca = await loginPosTroca.text();

  prova(
    "tela de login confirma a troca em linguagem simples",
    /Senha alterada/i.test(htmlLoginPosTroca),
  );

  // -- 10. Efeito real sobre as credenciais -----------------------------------
  const { error: erroSenhaAntiga } = await publico.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: SENHA_ANTIGA,
  });

  prova(
    "senha antiga deixa de autenticar",
    erroSenhaAntiga?.code === "invalid_credentials",
    `code=${erroSenhaAntiga?.code ?? "sem erro"}`,
  );

  const { data: loginNovo, error: erroSenhaNova } =
    await publico.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: SENHA_NOVA,
    });

  prova(
    "senha nova autentica",
    !erroSenhaNova && Boolean(loginNovo?.session),
    erroSenhaNova ? `code=${erroSenhaNova.code}` : "",
  );

  // -- 11. Link de uso único --------------------------------------------------
  const jarReuso = new CookieJar();
  const reuso = await pedir(caminhoRecovery, { jar: jarReuso });

  prova(
    "link de recuperação não pode ser reutilizado",
    destino(reuso) === "/auth/erro" && !jarReuso.temSessao(),
    `-> ${destino(reuso)}`,
  );

  // -- 12. Efeito sobre a sessão que já existia -------------------------------
  // A Correção 001F-01 §5 exige que o logout global tenha efeito verificável:
  // o refresh token da sessão de login anterior tem de deixar de ser aceito.
  // Medido no endpoint do Auth, não deduzido da documentação.
  const refreshDepois = await fetch(
    `${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,
    {
      method: "POST",
      headers: { apikey: PUBLISHABLE_KEY, "content-type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshTokenAntigo }),
    },
  );

  const sessaoAnteriorRevogada = refreshDepois.status >= 400;
  const contaSessaoAntiga = await pedir("/conta", { jar: jarLogin });

  // Só é prova de logout global se a troca realmente ocorreu. Sem isso, um
  // fluxo que morreu antes da troca produziria um "§5.4 acionado" falso — e um
  // alarme falso aqui desvaloriza o alarme verdadeiro.
  if (trocaEfetivada) {
    prova(
      "refresh token da sessão anterior é recusado após o logout global",
      sessaoAnteriorRevogada,
      `HTTP ${refreshDepois.status}`,
    );
  } else {
    prova(
      "revogação do refresh anterior NÃO avaliada: a troca de senha não ocorreu",
      false,
      "corrija a causa raiz acima e repita o smoke",
    );
  }
  nota(
    `área protegida com os cookies da sessão anterior: HTTP ${contaSessaoAntiga.status} ` +
      `-> ${destino(contaSessaoAntiga) ?? "sem redirect"}`,
  );
  nota(
    "access token já emitido pode seguir válido até `exp`: é propriedade " +
      "conhecida do Supabase (Correção 001F-01 §5.3), não falha desta rodada.",
  );

  if (trocaEfetivada && !sessaoAnteriorRevogada) {
    nota(
      "PARADA §5.4 da correção: logout global sem efeito sobre o refresh " +
        "anterior. Não contornar — retornar ao GPT.",
    );
  }
} finally {
  if (userId) {
    const { error } = await admin.auth.admin.deleteUser(userId);
    prova(
      "identidade de teste removida do projeto",
      !error,
      error?.message ?? "",
    );
  }
}

console.log(
  `\n${provas.filter((p) => p.ok).length}/${provas.length} provas passaram.`,
);

process.exit(falhas === 0 ? 0 : 1);
