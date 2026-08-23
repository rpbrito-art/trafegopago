/**
 * Prova funcional da fundação Queue + Worker — Rodada 002B (§6 do mandato).
 *
 * Fala com o projeto Supabase real e invoca a Edge Function `integration-worker`
 * remota de verdade. Não há mock: a fila é PGMQ no Postgres hospedado, o claim é
 * o UPDATE condicional da migration e o worker é o que foi deployado.
 *
 * O que este script NÃO cobre, por não alcançar `pg_catalog` pela Data API:
 * owner/`search_path`/`SECURITY DEFINER`/ACL das funções, persistência da fila e
 * Advisor. Essas provas estruturais estão em
 * `scripts/sql/queue-worker-002b-catalog.sql`, versionado ao lado.
 *
 * Fixtures: 1 usuário + 1 organização + operations `SYSTEM_HEALTHCHECK`.
 * Tudo é removido ao final — inclusive mensagens ativas e arquivadas da prova.
 *
 * Uso: node scripts/queue-worker-002b.mjs
 */

import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

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

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Registro de provas
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

const codigoDe = (error) => error?.code ?? "(sem erro)";

/**
 * Invoca a Edge Function como um chamador interno faria.
 *
 * A secret key vai **somente** em `apikey`. Sem `Authorization: Bearer`: o
 * contrato de `auth: 'secret'` é o header `apikey`, e mandar a mesma chave nos
 * dois lugares mascararia qual deles está de fato autorizando.
 */
async function invocarWorker(headersExtra = null) {
  const headers = headersExtra ?? { apikey: SECRET_KEY };

  const resposta = await fetch(
    `${SUPABASE_URL}/functions/v1/integration-worker`,
    {
      method: "POST",
      headers: { ...headers, "content-type": "application/json" },
      body: "{}",
    },
  );

  const texto = await resposta.text();
  let corpo = null;
  try {
    corpo = JSON.parse(texto);
  } catch {
    corpo = { raw: texto.slice(0, 200) };
  }
  return { status: resposta.status, corpo };
}

function envelope(overrides = {}) {
  return {
    version: 1,
    organizationId: orgId,
    jobType: "SYSTEM_HEALTHCHECK",
    operationId: null,
    correlationId: randomUUID(),
    payload: {},
    ...overrides,
  };
}

async function criarOperation(correlationId) {
  const { data, error } = await admin
    .from("operations")
    .insert({
      organization_id: orgId,
      operation_type: "SYSTEM_HEALTHCHECK",
      idempotency_key: `healthcheck-${randomUUID()}`,
      correlation_id: correlationId,
    })
    .select("id, status, attempt_count, correlation_id")
    .single();
  if (error) throw new Error(`criar operation: ${error.message}`);
  return data;
}

async function lerOperation(id) {
  const { data } = await admin
    .from("operations")
    .select("status, attempt_count, completed_at")
    .eq("id", id)
    .single();
  return data;
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const carimbo = Date.now();
const EMAIL = `queue-002b-${carimbo}@trafegopago-teste.com`;
const SENHA = `Queue-002B-${carimbo}!`;

let userId = null;
let orgId = null;

async function criarFixtures() {
  const { data: criado, error: erroUser } = await admin.auth.admin.createUser({
    email: EMAIL,
    password: SENHA,
    email_confirm: true,
  });
  if (erroUser) throw new Error(`createUser: ${erroUser.message}`);
  userId = criado.user.id;

  const { data: org, error: erroOrg } = await admin
    .from("organizations")
    .insert({ name: `Org 002B ${carimbo}` })
    .select("id")
    .single();
  if (erroOrg) throw new Error(`criar organization: ${erroOrg.message}`);
  orgId = org.id;

  const { error: erroMembro } = await admin
    .from("organization_members")
    .insert({
      organization_id: orgId,
      user_id: userId,
      role: "owner",
      status: "ACTIVE",
    });
  if (erroMembro) throw new Error(`criar membership: ${erroMembro.message}`);

  prova("fixtures criadas: usuário + organização + membership", true);
}

/**
 * Esvazia a fila de mensagens desta execução.
 *
 * O arquivo (`pgmq.a_integration_jobs`) não tem wrapper de remoção — de
 * propósito: arquivar existe para não perder rastro. A limpeza de fixture usa o
 * CLI, e é DML sobre linhas de teste, nunca DDL.
 */
function limparFilaDeTeste() {
  // O SQL vai por arquivo, não por argumento: no Windows o `npx.cmd` recusa
  // argumentos multilinha e o escaping de shell viraria fonte de erro.
  const sql = `
    delete from pgmq.q_integration_jobs
    where (message ->> 'organizationId') = '${orgId}';
    delete from pgmq.a_integration_jobs
    where (message ->> 'organizationId') = '${orgId}';
  `;

  const dir = mkdtempSync(join(tmpdir(), "tp-002b-"));
  const arquivo = join(dir, "cleanup.sql");

  try {
    writeFileSync(arquivo, sql, "utf8");
    execFileSync("npx", ["supabase", "db", "query", "--linked", "--file", arquivo], {
      stdio: "pipe",
      timeout: 180000,
      shell: true,
    });
    return true;
  } catch (erro) {
    console.error("INFO   limpeza da fila via CLI falhou:", erro.message);
    return false;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// Execução
// ---------------------------------------------------------------------------

try {
  await criarFixtures();

  // -- 1. Fronteira fechada para o browser ------------------------------------

  const anon = browserClient();
  const usuario = browserClient();
  await usuario.auth.signInWithPassword({ email: EMAIL, password: SENHA });

  const FRONTEIRA = [
    ["enqueue_integration_job", { p_message: envelope() }],
    ["read_integration_jobs", { p_visibility_seconds: 30, p_quantity: 1 }],
    ["complete_integration_job", { p_msg_id: 1 }],
    ["archive_integration_job", { p_msg_id: 1 }],
    ["defer_integration_job", { p_msg_id: 1, p_visibility_seconds: 30 }],
    ["claim_operation", { p_operation_id: randomUUID(), p_organization_id: randomUUID(), p_correlation_id: randomUUID() }],
    ["complete_operation", { p_operation_id: randomUUID(), p_organization_id: randomUUID(), p_correlation_id: randomUUID() }],
    ["fail_operation", { p_operation_id: randomUUID(), p_organization_id: randomUUID(), p_correlation_id: randomUUID(), p_error_class: null, p_error_summary: "x" }],
    ["is_valid_integration_job_message", { p_message: {} }],
  ];

  for (const [fn, args] of FRONTEIRA) {
    const { error: erroAnon } = await anon.rpc(fn, args);
    prova(`anon não executa ${fn}`, Boolean(erroAnon), `code=${codigoDe(erroAnon)}`);

    const { error: erroUser } = await usuario.rpc(fn, args);
    prova(
      `authenticated não executa ${fn}`,
      Boolean(erroUser),
      `code=${codigoDe(erroUser)}`,
    );
  }

  // `pgmq` e `pgmq_public` não são alcançáveis pela Data API.
  const { error: erroSchemaPgmq } = await anon
    .schema("pgmq_public")
    .rpc("send", { queue_name: "integration_jobs", message: {} });
  prova(
    "pgmq_public não está exposto na Data API",
    Boolean(erroSchemaPgmq),
    `code=${codigoDe(erroSchemaPgmq)}`,
  );

  const { data: orgVisivel } = await usuario
    .from("organizations")
    .select("id")
    .eq("id", orgId);
  prova(
    "browser continua lendo as tabelas de domínio autorizadas",
    (orgVisivel ?? []).length === 1,
  );

  await usuario.auth.signOut();

  // -- 2. Validação do envelope na fronteira de escrita ------------------------

  const INVALIDOS = [
    ["versão não suportada", envelope({ version: 2 })],
    ["organizationId inválido", envelope({ organizationId: "nao-uuid" })],
    ["correlationId inválido", envelope({ correlationId: "nao-uuid" })],
    ["jobType vazio", envelope({ jobType: "   " })],
    ["jobType acima do teto", envelope({ jobType: "x".repeat(121) })],
    ["operationId inválido", envelope({ operationId: "nao-uuid" })],
    ["payload não é objeto", envelope({ payload: [1, 2, 3] })],
    ["payload acima do teto", envelope({ payload: { t: "x".repeat(4100) } })],
    // Bloqueio B da auditoria: o predicado SQL antigo lia os campos com `->>`,
    // que converte qualquer escalar para texto — então estes passavam na fila e
    // só seriam recusados no consumidor.
    ["version como string", envelope({ version: "1" })],
    ["version booleana", envelope({ version: true })],
    ["jobType numérico", envelope({ jobType: 123 })],
    ["jobType booleano", envelope({ jobType: true })],
    ["organizationId numérico", envelope({ organizationId: 11111111 })],
    ["correlationId não-string", envelope({ correlationId: 123 })],
    ["operationId não-string", envelope({ operationId: 123 })],
  ];

  for (const [nome, msg] of INVALIDOS) {
    const { error } = await admin.rpc("enqueue_integration_job", {
      p_message: msg,
    });
    prova(`fila recusa envelope com ${nome}`, Boolean(error), `code=${codigoDe(error)}`);
  }

  // A recusa tem de acontecer ANTES da fila: nenhuma das tentativas acima pode
  // ter deixado mensagem para trás.
  const { data: aposInvalidos } = await admin.rpc("read_integration_jobs", {
    p_visibility_seconds: 5,
    p_quantity: 10,
  });
  prova(
    "nenhum envelope inválido entrou na fila",
    (aposInvalidos ?? []).length === 0,
    `mensagens=${(aposInvalidos ?? []).length}`,
  );

  // Envelope válido continua entrando normalmente depois do endurecimento.
  const corrSanidade = randomUUID();
  const { data: msgSanidade, error: erroSanidade } = await admin.rpc(
    "enqueue_integration_job",
    { p_message: envelope({ correlationId: corrSanidade }) },
  );
  prova(
    "envelope válido continua sendo aceito",
    !erroSanidade && typeof msgSanidade === "number",
    erroSanidade ? `code=${codigoDe(erroSanidade)}` : "",
  );
  await admin.rpc("archive_integration_job", { p_msg_id: msgSanidade });

  // -- 2b. Auth da Edge Function (Correção 002B-01 §5.3) ----------------------

  const semChave = await invocarWorker({});
  prova(
    "Edge Function recusa chamada sem apikey",
    semChave.status === 401 || semChave.status === 403,
    `status=${semChave.status}`,
  );

  const comPublishable = await invocarWorker({ apikey: PUBLISHABLE_KEY });
  prova(
    "Edge Function recusa publishable key",
    comPublishable.status === 401 || comPublishable.status === 403,
    `status=${comPublishable.status}`,
  );

  const comSecret = await invocarWorker();
  prova(
    "Edge Function aceita secret key somente no header apikey",
    comSecret.status === 200,
    `status=${comSecret.status}`,
  );

  // -- 3. Tetos dos parâmetros de leitura --------------------------------------

  for (const [nome, args] of [
    ["quantidade acima do teto", { p_visibility_seconds: 30, p_quantity: 50 }],
    ["quantidade zero", { p_visibility_seconds: 30, p_quantity: 0 }],
    ["visibilidade acima do teto", { p_visibility_seconds: 5000, p_quantity: 1 }],
    ["visibilidade abaixo do mínimo", { p_visibility_seconds: 1, p_quantity: 1 }],
  ]) {
    const { error } = await admin.rpc("read_integration_jobs", args);
    prova(`leitura recusa ${nome}`, Boolean(error), `code=${codigoDe(error)}`);
  }

  // -- 4. Redelivery por visibility timeout ------------------------------------

  const corrRedelivery = randomUUID();
  const opRedelivery = await criarOperation(corrRedelivery);
  const { data: msgRedelivery, error: erroEnfileirar } = await admin.rpc(
    "enqueue_integration_job",
    {
      p_message: envelope({
        operationId: opRedelivery.id,
        correlationId: corrRedelivery,
      }),
    },
  );
  prova(
    "service_role enfileira pela fronteira autorizada",
    !erroEnfileirar && typeof msgRedelivery === "number",
    erroEnfileirar ? `code=${codigoDe(erroEnfileirar)}` : `msg_id=${msgRedelivery}`,
  );

  const { data: leitura1 } = await admin.rpc("read_integration_jobs", {
    p_visibility_seconds: 5,
    p_quantity: 5,
  });
  const lida1 = (leitura1 ?? []).find((m) => m.msg_id === msgRedelivery);
  prova("mensagem é lida com read_ct = 1", lida1?.read_ct === 1, `read_ct=${lida1?.read_ct}`);

  const { data: leituraImediata } = await admin.rpc("read_integration_jobs", {
    p_visibility_seconds: 5,
    p_quantity: 5,
  });
  prova(
    "mensagem fica invisível durante a visibility timeout",
    !(leituraImediata ?? []).some((m) => m.msg_id === msgRedelivery),
  );

  nota("aguardando a visibility timeout expirar (6s)...");
  await esperar(6000);

  const { data: leitura2 } = await admin.rpc("read_integration_jobs", {
    p_visibility_seconds: 5,
    p_quantity: 5,
  });
  const lida2 = (leitura2 ?? []).find((m) => m.msg_id === msgRedelivery);
  prova(
    "mensagem não confirmada reaparece após a visibility timeout",
    Boolean(lida2),
  );
  prova(
    "read_ct incrementa a cada entrega",
    lida2?.read_ct === 2,
    `read_ct=${lida2?.read_ct}`,
  );

  // Confirmar remove em definitivo.
  const { data: removida } = await admin.rpc("complete_integration_job", {
    p_msg_id: msgRedelivery,
  });
  prova("mensagem confirmada é removida da fila", removida === true);

  nota("aguardando para confirmar que a mensagem removida não volta (6s)...");
  await esperar(6000);
  const { data: leitura3 } = await admin.rpc("read_integration_jobs", {
    p_visibility_seconds: 5,
    p_quantity: 5,
  });
  prova(
    "mensagem removida não reaparece",
    !(leitura3 ?? []).some((m) => m.msg_id === msgRedelivery),
  );

  // -- 5. Claim atômico --------------------------------------------------------

  const corrClaim = randomUUID();
  const opClaim = await criarOperation(corrClaim);
  prova("operation nasce PENDING com attempt_count 0", opClaim.status === "PENDING" && opClaim.attempt_count === 0);

  // Dois claims concorrentes: só um pode vencer.
  const [claimA, claimB] = await Promise.all([
    admin.rpc("claim_operation", {
      p_operation_id: opClaim.id,
      p_organization_id: orgId,
      p_correlation_id: corrClaim,
      p_stale_after_seconds: 900,
    }),
    admin.rpc("claim_operation", {
      p_operation_id: opClaim.id,
      p_organization_id: orgId,
      p_correlation_id: corrClaim,
      p_stale_after_seconds: 900,
    }),
  ]);

  const vencedores = [claimA.data, claimB.data].filter((r) => r === "CLAIMED");
  prova(
    "dois claims concorrentes: exatamente um vence",
    vencedores.length === 1,
    `resultados=${claimA.data},${claimB.data}`,
  );

  const aposClaim = await lerOperation(opClaim.id);
  prova("claim move para CLAIMED", aposClaim.status === "CLAIMED");
  prova(
    "attempt_count incrementa exatamente uma vez no claim vencedor",
    aposClaim.attempt_count === 1,
    `attempt_count=${aposClaim.attempt_count}`,
  );

  // Identidade tripla: id certo, organização errada não reivindica.
  const { data: claimOrgErrada } = await admin.rpc("claim_operation", {
    p_operation_id: opClaim.id,
    p_organization_id: randomUUID(),
    p_correlation_id: corrClaim,
    p_stale_after_seconds: 900,
  });
  prova(
    "claim com organização errada não encontra a operação",
    claimOrgErrada === "NOT_FOUND",
    `resultado=${claimOrgErrada}`,
  );

  const { data: claimCorrErrada } = await admin.rpc("claim_operation", {
    p_operation_id: opClaim.id,
    p_organization_id: orgId,
    p_correlation_id: randomUUID(),
    p_stale_after_seconds: 900,
  });
  prova(
    "claim com correlation errada não encontra a operação",
    claimCorrErrada === "NOT_FOUND",
    `resultado=${claimCorrErrada}`,
  );

  // Concluir e provar idempotência da conclusão.
  const { data: conclusao } = await admin.rpc("complete_operation", {
    p_operation_id: opClaim.id,
    p_organization_id: orgId,
    p_correlation_id: corrClaim,
  });
  prova("conclusão move CLAIMED para SUCCEEDED", conclusao === "SUCCEEDED");

  const { data: conclusaoRepetida } = await admin.rpc("complete_operation", {
    p_operation_id: opClaim.id,
    p_organization_id: orgId,
    p_correlation_id: corrClaim,
  });
  prova(
    "conclusão repetida é idempotente",
    conclusaoRepetida === "ALREADY_SUCCEEDED",
    `resultado=${conclusaoRepetida}`,
  );

  const { data: claimAposSucesso } = await admin.rpc("claim_operation", {
    p_operation_id: opClaim.id,
    p_organization_id: orgId,
    p_correlation_id: corrClaim,
    p_stale_after_seconds: 900,
  });
  prova(
    "operação SUCCEEDED não é reivindicada de novo",
    claimAposSucesso === "ALREADY_SUCCEEDED",
    `resultado=${claimAposSucesso}`,
  );

  const finalClaim = await lerOperation(opClaim.id);
  prova(
    "attempt_count não muda em tentativa recusada",
    finalClaim.attempt_count === 1,
    `attempt_count=${finalClaim.attempt_count}`,
  );
  prova("completed_at é preenchido na conclusão", Boolean(finalClaim.completed_at));

  // -- 6. Worker real ponta a ponta -------------------------------------------

  const corrWorker = randomUUID();
  const opWorker = await criarOperation(corrWorker);
  await admin.rpc("enqueue_integration_job", {
    p_message: envelope({
      operationId: opWorker.id,
      correlationId: corrWorker,
    }),
  });

  const execucao = await invocarWorker();
  prova(
    "Edge Function responde com secret key",
    execucao.status === 200,
    `status=${execucao.status}`,
  );
  prova(
    "worker processou o job com sucesso",
    execucao.corpo?.outcomes?.succeeded >= 1,
    `outcomes=${JSON.stringify(execucao.corpo?.outcomes ?? {})}`,
  );

  const opAposWorker = await lerOperation(opWorker.id);
  prova(
    "worker levou a operation de PENDING a SUCCEEDED",
    opAposWorker.status === "SUCCEEDED",
    `status=${opAposWorker.status}`,
  );
  prova(
    "worker incrementou attempt_count exatamente uma vez",
    opAposWorker.attempt_count === 1,
    `attempt_count=${opAposWorker.attempt_count}`,
  );

  // -- 7. Mensagem duplicada tardia não reexecuta ------------------------------

  await admin.rpc("enqueue_integration_job", {
    p_message: envelope({
      operationId: opWorker.id,
      correlationId: corrWorker,
    }),
  });

  const segundaExecucao = await invocarWorker();
  prova(
    "mensagem duplicada é reconhecida como já concluída",
    segundaExecucao.corpo?.outcomes?.already_succeeded >= 1,
    `outcomes=${JSON.stringify(segundaExecucao.corpo?.outcomes ?? {})}`,
  );

  const opAposDuplicata = await lerOperation(opWorker.id);
  prova(
    "estado final continua uma única SUCCEEDED",
    opAposDuplicata.status === "SUCCEEDED" &&
      opAposDuplicata.attempt_count === 1,
    `status=${opAposDuplicata.status} attempt_count=${opAposDuplicata.attempt_count}`,
  );

  // -- 8. Tipo não suportado é arquivado --------------------------------------

  const corrDesconhecido = randomUUID();
  const opDesconhecido = await criarOperation(corrDesconhecido);
  await admin.rpc("enqueue_integration_job", {
    p_message: envelope({
      jobType: "META_PUBLISH_NAO_SUPORTADO",
      operationId: opDesconhecido.id,
      correlationId: corrDesconhecido,
    }),
  });

  const execucaoDesconhecido = await invocarWorker();
  prova(
    "job de tipo não suportado é arquivado",
    execucaoDesconhecido.corpo?.outcomes?.archived_unsupported >= 1,
    `outcomes=${JSON.stringify(execucaoDesconhecido.corpo?.outcomes ?? {})}`,
  );

  nota("aguardando para confirmar que o job arquivado não volta (8s)...");
  await esperar(8000);
  const reexecucao = await invocarWorker();
  prova(
    "job arquivado não reaparece na fila",
    (reexecucao.corpo?.read ?? 0) === 0,
    `read=${reexecucao.corpo?.read}`,
  );

  const opDesconhecidoFinal = await lerOperation(opDesconhecido.id);
  prova(
    "operação de job não suportado permanece PENDING, não executada",
    opDesconhecidoFinal.status === "PENDING",
    `status=${opDesconhecidoFinal.status}`,
  );

  // -- 9. Poison message real (Correção 002B-01 §3) ---------------------------

  const corrPoison = randomUUID();
  const opPoison = await criarOperation(corrPoison);
  const { data: msgPoison } = await admin.rpc("enqueue_integration_job", {
    p_message: envelope({
      operationId: opPoison.id,
      correlationId: corrPoison,
    }),
  });

  // Levar `read_ct` acima do teto sem esperar quatro visibility timeouts:
  // ler e devolver imediatamente com `defer(0)`. Cada leitura conta.
  let readCtPoison = 0;
  for (let i = 0; i < 4; i += 1) {
    const { data: lote } = await admin.rpc("read_integration_jobs", {
      p_visibility_seconds: 5,
      p_quantity: 10,
    });
    const alvo = (lote ?? []).find((m) => m.msg_id === msgPoison);
    if (alvo) readCtPoison = alvo.read_ct;
    await admin.rpc("defer_integration_job", {
      p_msg_id: msgPoison,
      p_visibility_seconds: 0,
    });
  }

  prova(
    "read_ct da mensagem ultrapassa o teto de tentativas",
    readCtPoison >= 4,
    `read_ct=${readCtPoison}`,
  );

  const execucaoPoison = await invocarWorker();
  prova(
    "worker arquiva a poison message",
    execucaoPoison.corpo?.outcomes?.archived_poison >= 1,
    `outcomes=${JSON.stringify(execucaoPoison.corpo?.outcomes ?? {})}`,
  );

  const opPoisonFinal = await lerOperation(opPoison.id);
  prova(
    "operação da poison message termina FAILED",
    opPoisonFinal.status === "FAILED",
    `status=${opPoisonFinal.status}`,
  );

  const { data: detalhePoison } = await admin
    .from("operations")
    .select("last_error_class, last_error_summary")
    .eq("id", opPoison.id)
    .single();

  // O bloqueio A: falha interna da fila não pode carregar classe de erro
  // externo. `null` é a única resposta honesta — nenhum provider foi chamado.
  prova(
    "last_error_class é NULL, sem taxonomia externa falsa",
    detalhePoison?.last_error_class === null,
    `last_error_class=${detalhePoison?.last_error_class}`,
  );
  prova(
    "last_error_summary interno é preenchido e não cita erro externo",
    typeof detalhePoison?.last_error_summary === "string" &&
      detalhePoison.last_error_summary.includes("fila interna") &&
      !/UPSTREAM|RATE_LIMITED|AUTH_REQUIRED/.test(
        detalhePoison.last_error_summary,
      ),
    `summary=${detalhePoison?.last_error_summary}`,
  );

  nota("aguardando para confirmar que a poison não reaparece (8s)...");
  await esperar(8000);
  const aposPoison = await invocarWorker();
  prova(
    "poison message arquivada não reaparece",
    (aposPoison.corpo?.read ?? 0) === 0,
    `read=${aposPoison.corpo?.read}`,
  );

  nota(
    "O ramo 'poison sem desfecho seguro' (RPC com erro ou retorno " +
      "desconhecido) não é forçável remotamente sem DDL ad hoc, que a correção " +
      "proíbe. Ele é coberto de forma determinística por " +
      "src/lib/operations/poison.test.ts, e o worker usa exatamente essa função.",
  );
} finally {
  // -- 9. Cleanup --------------------------------------------------------------

  const filaLimpa = limparFilaDeTeste();
  prova("mensagens de teste removidas da fila e do arquivo", filaLimpa);

  if (orgId) await admin.from("organizations").delete().eq("id", orgId);
  if (userId) await admin.auth.admin.deleteUser(userId);

  const { data: usuarios } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const fixtures = (usuarios?.users ?? []).filter((u) =>
    (u.email ?? "").includes("trafegopago-teste.com"),
  ).length;

  const { count: operations } = await admin
    .from("operations")
    .select("id", { count: "exact", head: true });
  const { count: orgs } = await admin
    .from("organizations")
    .select("id", { count: "exact", head: true });

  prova("nenhuma identidade de teste restante", fixtures === 0);
  prova("nenhuma operation restante", operations === 0, `count=${operations}`);
  prova("nenhuma organização restante", orgs === 0, `count=${orgs}`);

  nota(
    "Provas estruturais (owner, search_path, SECURITY DEFINER, ACL, " +
      "persistência da fila, Advisor) estão em " +
      "scripts/sql/queue-worker-002b-catalog.sql.",
  );
}

console.log(
  `\n${provas.filter((p) => p.ok).length}/${provas.length} provas passaram.`,
);

process.exit(falhas === 0 ? 0 : 1);
