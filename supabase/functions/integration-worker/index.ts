/**
 * Worker interno da fila `integration_jobs` — Rodada 002B.
 *
 * Lê um lote pequeno, valida cada mensagem antes de qualquer efeito, processa
 * e só então confirma a remoção. Não há cron nesta rodada (mandato §5.6): a
 * função é invocável para prova e por um scheduler futuro.
 *
 * ## Autorização
 *
 * `auth: 'secret'` — o chamador apresenta uma secret key do projeto no header
 * `apikey`. Como secret key não é JWT, `verify_jwt = false` em
 * `supabase/config.toml`; a verificação real acontece aqui, no wrapper oficial,
 * nunca por request anônimo. Nenhum segredo humano novo foi criado: as chaves
 * são as que o próprio Supabase injeta na função.
 *
 * ## O contrato da mensagem é importado, não copiado
 *
 * `parseIntegrationJobMessage` vem de `src/lib/operations/job-message.ts`, o
 * mesmo módulo que a aplicação usa e que tem teste de paridade com o CHECK do
 * banco. Reescrevê-lo aqui criaria uma terceira definição do envelope, livre
 * para divergir em silêncio.
 *
 * ## Regras de segurança dos logs
 *
 * Só ids, contagens, motivos e `correlationId`. Nunca payload, secret ou PII
 * (`SECURITY_MODEL.md` §15).
 */

import { withSupabase } from "npm:@supabase/server@1";

import {
  isSupportedJobType,
  parseIntegrationJobMessage,
  requiresOperation,
  SYSTEM_HEALTHCHECK_JOB,
} from "../../../src/lib/operations/job-message.ts";

/**
 * Janela em que a mensagem fica invisível para outros consumidores.
 *
 * Precisa ser maior que o tempo de processamento de um lote e **menor** que
 * `STALE_CLAIM_SECONDS`: se fosse maior, uma operação poderia ser retomada como
 * "claim velho" enquanto a mensagem original ainda está invisível — e o efeito
 * rodaria duas vezes.
 */
const VISIBILITY_SECONDS = 60;

/** Lote pequeno e em série: provar correção antes de otimizar concorrência. */
const BATCH_SIZE = 5;

/**
 * Teto de entregas da mesma mensagem. `read_ct` do PGMQ conta as leituras;
 * acima disso a mensagem é poison e vai para o arquivo, em vez de circular
 * para sempre.
 */
const MAX_ATTEMPTS = 3;

/** Janela para considerar um claim abandonado. Maior que a visibilidade. */
const STALE_CLAIM_SECONDS = 900;

type QueueRow = {
  msg_id: number;
  read_ct: number;
  enqueued_at: string;
  vt: string;
  message: unknown;
};

type Outcome =
  | "succeeded"
  | "already_succeeded"
  | "left_for_retry"
  | "archived_invalid"
  | "archived_unsupported"
  | "archived_poison"
  | "archived_unclaimable"
  | "failed_unexpected";

export default {
  fetch: withSupabase(
    { auth: "secret" },
    async (_req: Request, ctx: { supabaseAdmin: SupabaseLike }) => {
      const supabase = ctx.supabaseAdmin;

      const { data, error } = await supabase.rpc("read_integration_jobs", {
        p_visibility_seconds: VISIBILITY_SECONDS,
        p_quantity: BATCH_SIZE,
      });

      if (error) {
        console.error("read_integration_jobs falhou", { code: error.code });
        return Response.json(
          { ok: false, stage: "read", code: error.code },
          { status: 500 },
        );
      }

      const rows = (data ?? []) as QueueRow[];
      const outcomes: Record<string, number> = {};
      const registrar = (o: Outcome) => {
        outcomes[o] = (outcomes[o] ?? 0) + 1;
      };

      for (const row of rows) {
        registrar(await processar(supabase, row));
      }

      return Response.json({ ok: true, read: rows.length, outcomes });
    },
  ),
};

/** Cliente Supabase reduzido ao que este worker usa. */
type SupabaseLike = {
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { code?: string } | null }>;
};

async function processar(
  supabase: SupabaseLike,
  row: QueueRow,
): Promise<Outcome> {
  const jobId = row.msg_id;
  const attempt = row.read_ct;

  try {
    // 1. Poison antes de qualquer coisa: uma mensagem que já voltou demais não
    //    merece mais uma tentativa, mesmo que pareça válida.
    if (attempt > MAX_ATTEMPTS) {
      const parsed = parseIntegrationJobMessage(row.message);

      if (parsed.ok && parsed.message.operationId) {
        // Encerrar a operação junto: deixá-la CLAIMED para sempre esconderia
        // um trabalho que nunca vai acontecer.
        await supabase.rpc("fail_operation", {
          p_operation_id: parsed.message.operationId,
          p_organization_id: parsed.message.organizationId,
          p_correlation_id: parsed.message.correlationId,
          p_error_class: "UNKNOWN_UPSTREAM",
          p_error_summary: `poison message arquivada apos ${attempt} entregas`,
        });
      }

      await supabase.rpc("archive_integration_job", { p_msg_id: jobId });
      console.warn("job arquivado por exceder tentativas", { jobId, attempt });
      return "archived_poison";
    }

    // 2. Validar o envelope antes de qualquer efeito.
    const parsed = parseIntegrationJobMessage(row.message);
    if (!parsed.ok) {
      await supabase.rpc("archive_integration_job", { p_msg_id: jobId });
      console.warn("job arquivado por envelope invalido", {
        jobId,
        reason: parsed.reason,
      });
      return "archived_invalid";
    }

    const message = parsed.message;
    const { organizationId, correlationId, operationId, jobType } = message;

    // 3. Tipo desconhecido não fica em loop: arquiva e segue.
    if (!isSupportedJobType(jobType)) {
      await supabase.rpc("archive_integration_job", { p_msg_id: jobId });
      console.warn("job arquivado por tipo nao suportado", {
        jobId,
        jobType,
        correlationId,
      });
      return "archived_unsupported";
    }

    if (requiresOperation(jobType) && !operationId) {
      await supabase.rpc("archive_integration_job", { p_msg_id: jobId });
      console.warn("job arquivado por falta de operationId", {
        jobId,
        jobType,
        correlationId,
      });
      return "archived_invalid";
    }

    // 4. Claim atômico. É aqui que a execução dupla é impedida — não no código
    //    deste worker, e sim no UPDATE condicional do banco.
    const { data: claim, error: erroClaim } = await supabase.rpc(
      "claim_operation",
      {
        p_operation_id: operationId,
        p_organization_id: organizationId,
        p_correlation_id: correlationId,
        p_stale_after_seconds: STALE_CLAIM_SECONDS,
      },
    );

    if (erroClaim) {
      console.error("claim_operation falhou", {
        jobId,
        correlationId,
        code: erroClaim.code,
      });
      return "left_for_retry";
    }

    if (claim === "ALREADY_SUCCEEDED") {
      // Reentrega tardia de trabalho já concluído. Remover a mensagem é o
      // correto: repetir o efeito é justamente o que a idempotência evita.
      await supabase.rpc("complete_integration_job", { p_msg_id: jobId });
      console.info("job ja concluido anteriormente", { jobId, correlationId });
      return "already_succeeded";
    }

    if (claim === "ALREADY_CLAIMED") {
      // Outro consumidor está com ela. Não arquivar e não remover: deixar a
      // visibilidade expirar é o comportamento correto.
      console.info("job em execucao por outro consumidor", {
        jobId,
        correlationId,
      });
      return "left_for_retry";
    }

    if (claim !== "CLAIMED") {
      // NOT_FOUND ou NOT_CLAIMABLE: a mensagem não tem mais o que fazer.
      await supabase.rpc("archive_integration_job", { p_msg_id: jobId });
      console.warn("job arquivado por operacao nao reivindicavel", {
        jobId,
        claim,
        correlationId,
      });
      return "archived_unclaimable";
    }

    // 5. Efeito. `SYSTEM_HEALTHCHECK` é interno: nenhuma chamada externa,
    //    nenhum gasto. Existe para provar o caminho completo.
    if (jobType === SYSTEM_HEALTHCHECK_JOB) {
      // Nada a fazer além de existir e concluir.
    }

    // 6. Concluir a operação e só então confirmar a mensagem. Se o processo
    //    morrer entre as duas, a mensagem reaparece e o claim seguinte
    //    encontra ALREADY_SUCCEEDED — que é tratado acima sem repetir efeito.
    const { data: conclusao, error: erroConclusao } = await supabase.rpc(
      "complete_operation",
      {
        p_operation_id: operationId,
        p_organization_id: organizationId,
        p_correlation_id: correlationId,
      },
    );

    if (erroConclusao) {
      console.error("complete_operation falhou", {
        jobId,
        correlationId,
        code: erroConclusao.code,
      });
      return "left_for_retry";
    }

    if (conclusao !== "SUCCEEDED" && conclusao !== "ALREADY_SUCCEEDED") {
      console.error("conclusao inesperada", { jobId, conclusao, correlationId });
      return "left_for_retry";
    }

    await supabase.rpc("complete_integration_job", { p_msg_id: jobId });
    console.info("job concluido", { jobId, attempt, correlationId });
    return "succeeded";
  } catch (erro) {
    // Erro inesperado NÃO remove a mensagem: ela volta quando a visibilidade
    // expirar. Só a mensagem comprovadamente sem futuro é arquivada.
    console.error("erro inesperado ao processar job", {
      jobId,
      attempt,
      erro: erro instanceof Error ? erro.name : "desconhecido",
    });
    return "failed_unexpected";
  }
}
