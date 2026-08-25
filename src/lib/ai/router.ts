import "server-only";

import type { AIAdapterRegistry } from "./adapter-registry";
import type { AICatalog } from "./catalog";
import {
  aceitaTarefaNova,
  type AICapability,
  type AIErrorClass,
  type AIModelCandidate,
  type AIPriceVersion,
  type AITaskDefinition,
  type AITaskRequest,
  type AITaskResult,
} from "./contracts";
import { calcularCusto } from "./pricing";
import type { AIRunLedger } from "./run-ledger";
import type { AITaskRegistry } from "./task-registry";

/**
 * AI Router (Rodada 004A §5.6, endurecido pela Correção 004A-01).
 *
 * Recebe uma **task** e devolve output validado. Nenhuma feature escolhe
 * provider, modelo, temperatura ou endpoint — é essa indireção que permite
 * trocar o modelo de uma capacidade sem reescrever a feature
 * (`AI_ARCHITECTURE.md` §4, §22).
 *
 * A ordem das decisões é a garantia principal:
 *
 * 1. resolver a definição versionada da task;
 * 2. conferir escopo tenant/global — antes de qualquer leitura;
 * 3. validar o input;
 * 4. escolher candidato por tier, vigência e capacidades;
 * 5. resolver **um** preço vigente, ou falhar;
 * 6. abrir o run `STARTED`;
 * 7. só então chamar o adapter;
 * 8. calcular o custo e validar o output;
 * 9. fechar o run — e **conferir que fechou**.
 *
 * Tudo que falha antes do passo 6 falha **sem ledger**: não há execução para
 * registrar, e inventar um run com modelo nulo poluiria a conta de custo com
 * linhas que nunca chamaram ninguém. Do passo 6 em diante, todo desfecho é
 * registrado — inclusive a ausência de adapter, que é falha de configuração
 * digna de auditoria e não um silêncio (Correção 004A-01 §10).
 *
 * ## Sucesso exige prova
 *
 * O Router só devolve `ok: true` depois de o ledger confirmar a conclusão. Um
 * output entregue sem registro seria uma chamada paga que a contabilidade não
 * conhece — e, se o custo não puder ser calculado com confiança, a execução
 * termina em falha mesmo que o provider tenha respondido bem (§§4 e 5).
 */

export type AIRouterDeps = {
  tasks: AITaskRegistry;
  catalog: AICatalog;
  adapters: AIAdapterRegistry;
  ledger: AIRunLedger;
  /** Injetável para o custo e a vigência de um teste serem reproduzíveis. */
  agora?: () => Date;
  gerarCorrelationId?: () => string;
};

function falha(errorClass: AIErrorClass, runId: string | null): AITaskResult<never> {
  return { ok: false, errorClass, runId };
}

/**
 * O candidato satisfaz todas as capacidades exigidas?
 *
 * Exigência ausente no catálogo derruba o candidato. Não há "quase compatível":
 * mandar uma task de `VISION` a um modelo sem visão produz uma resposta que
 * parece válida e não olhou para a imagem.
 */
function atendeCapacidades(
  candidato: AIModelCandidate,
  exigidas: readonly AICapability[],
): boolean {
  return exigidas.every((capacidade) =>
    candidato.capabilityTags.includes(capacidade),
  );
}

/**
 * Ordem de preferência entre candidatos elegíveis.
 *
 * Menor tier primeiro — `AI_ARCHITECTURE.md` §2 manda usar o caminho mais
 * barato que resolve — e, dentro do tier, `ACTIVE` antes de `DEGRADED`. O
 * desempate final é o `modelKey`, para a escolha ser determinística: um Router
 * que decide por ordem de retorno do banco produz custo irreprodutível entre
 * duas execuções idênticas.
 */
function ordenarCandidatos(
  candidatos: AIModelCandidate[],
  allowedTiers: readonly number[],
): AIModelCandidate[] {
  const posicaoDoTier = new Map(allowedTiers.map((tier, i) => [tier, i]));

  return [...candidatos].sort((a, b) => {
    const tierA = posicaoDoTier.get(a.tier) ?? Number.MAX_SAFE_INTEGER;
    const tierB = posicaoDoTier.get(b.tier) ?? Number.MAX_SAFE_INTEGER;
    if (tierA !== tierB) return tierA - tierB;

    const saudavelA = a.status === "ACTIVE" && a.providerStatus === "ACTIVE";
    const saudavelB = b.status === "ACTIVE" && b.providerStatus === "ACTIVE";
    if (saudavelA !== saudavelB) return saudavelA ? -1 : 1;

    return a.modelKey.localeCompare(b.modelKey);
  });
}

export function criarAIRouter(deps: AIRouterDeps) {
  const agora = deps.agora ?? (() => new Date());
  const gerarCorrelationId =
    deps.gerarCorrelationId ?? (() => crypto.randomUUID());

  return {
    async run<TOutput>(
      request: AITaskRequest,
    ): Promise<AITaskResult<TOutput>> {
      // ---------------------------------------------------------------- task
      const definicao = deps.tasks.resolve(
        request.taskType,
        request.taskVersion,
      ) as AITaskDefinition<unknown, TOutput> | undefined;

      if (!definicao) return falha("NO_CANDIDATE_MODEL", null);

      // Tier 0 não chega aqui. Uma task que declara apenas tiers fora de 1..3
      // não é uma tarefa barata: é uma tarefa determinística no lugar errado.
      if (definicao.allowedTiers.length === 0) {
        return falha("NO_CANDIDATE_MODEL", null);
      }

      // -------------------------------------------------------------- escopo
      const organizationId = request.organizationId ?? null;

      if (definicao.scope === "TENANT" && !organizationId) {
        return falha("NO_CANDIDATE_MODEL", null);
      }

      if (definicao.scope === "GLOBAL" && organizationId) {
        return falha("NO_CANDIDATE_MODEL", null);
      }

      // Fallback é vínculo dentro de um tenant. Sem organização não há como o
      // banco provar que os dois runs pertencem ao mesmo cliente.
      if (request.fallbackFromRunId && !organizationId) {
        return falha("NO_CANDIDATE_MODEL", null);
      }

      // --------------------------------------------------------------- input
      const inputValidado = definicao.inputSchema.safeParse(request.input);

      if (!inputValidado.success) {
        // Classe própria: isto é erro de quem chamou, detectado antes de
        // qualquer gasto, e por isso não escala para modelo melhor nem abre run
        // pago (`AI_ARCHITECTURE.md` §6, Correção 004A-01 §9).
        return falha("INPUT_SCHEMA_INVALID", null);
      }

      // ----------------------------------------------------------- candidato
      const instante = agora();
      const todos = await deps.catalog.listarCandidatos(instante);

      const elegiveis = todos.filter(
        (candidato) =>
          aceitaTarefaNova(candidato.status) &&
          candidato.providerStatus !== "DISABLED" &&
          definicao.allowedTiers.includes(candidato.tier) &&
          atendeCapacidades(candidato, definicao.requiredCapabilities),
      );

      const escolhido = ordenarCandidatos(
        elegiveis,
        definicao.allowedTiers,
      )[0];

      if (!escolhido) return falha("NO_CANDIDATE_MODEL", null);

      // --------------------------------------------------------------- preço
      const precos = await deps.catalog.listarPrecosVigentes(
        escolhido.id,
        instante,
      );

      if (precos.length === 0) return falha("NO_PRICE_VERSION", null);
      // Duas versões vigentes significam que o custo desta chamada seria uma
      // escolha, não um cálculo. Falhar é mais honesto que arbitrar.
      if (precos.length > 1) return falha("AMBIGUOUS_PRICE_VERSION", null);

      const preco: AIPriceVersion = precos[0];

      // ----------------------------------------------------------------- run
      const runId = await deps.ledger.abrir({
        organizationId,
        correlationId: request.correlationId ?? gerarCorrelationId(),
        taskType: definicao.taskType,
        taskVersion: definicao.taskVersion,
        providerId: escolhido.providerId,
        aiModelId: escolhido.id,
        aiPriceVersionId: preco.id,
        tier: escolhido.tier,
        promptVersion: definicao.promptVersion,
        schemaVersion: definicao.schemaVersion,
        fallbackFromRunId: request.fallbackFromRunId ?? null,
      });

      if (!runId) return falha("LEDGER_WRITE_FAILED", null);

      /** Fecha o run em falha e devolve o desfecho. */
      const encerrarComFalha = async (
        errorClass: AIErrorClass,
        extras: Partial<{
          latencyMs: number | null;
          inputTokens: number;
          outputTokens: number;
          cachedTokens: number | null;
          estimatedCost: string | null;
          currency: string | null;
        }> = {},
      ): Promise<AITaskResult<TOutput>> => {
        const registrou = await deps.ledger.falhar({
          runId,
          organizationId,
          errorClass,
          latencyMs: extras.latencyMs ?? null,
          ...extras,
        });

        // Nem a falha pôde ser registrada: o desfecho passa a ser o do próprio
        // ledger, que é o problema mais grave dos dois.
        return falha(registrou ? errorClass : "LEDGER_WRITE_FAILED", runId);
      };

      // ------------------------------------------------------------- adapter
      const adapter = deps.adapters.resolve(escolhido.providerKey);

      // Nada de fallback silencioso para fake. Com o run já aberto, a ausência
      // de adapter vira `FAILED / ADAPTER_NOT_REGISTERED` — auditável, e sem
      // nenhuma chamada externa (Correção 004A-01 §10).
      if (!adapter) return encerrarComFalha("ADAPTER_NOT_REGISTERED");

      // ------------------------------------------------------------ execução
      let resultado;

      try {
        resultado = await adapter.execute({
          modelKey: escolhido.modelKey,
          promptVersion: definicao.promptVersion,
          schemaVersion: definicao.schemaVersion,
          input: inputValidado.data,
          latencyClass: definicao.latencyClass,
        });
      } catch {
        // Adapter que lança em vez de devolver erro normalizado ainda produz
        // ledger — e a exceção não sobe com a mensagem original, que pode
        // citar credencial.
        return encerrarComFalha("UNKNOWN");
      }

      if (!resultado.ok) {
        return encerrarComFalha(resultado.errorClass, {
          latencyMs: resultado.latencyMs ?? null,
        });
      }

      const latencyMs = resultado.latencyMs ?? null;

      // --------------------------------------------------------------- custo
      //
      // Depois de o provider ter sido chamado, custo desconhecido encerra a
      // execução. Concluir `SUCCEEDED` com custo nulo criaria uma chamada paga
      // fora da conta do mês — e o banco também recusa (§§5 e 7).
      const custo = calcularCusto({ usage: resultado.usage, price: preco });

      if (!custo.ok) {
        return encerrarComFalha(
          custo.motivo === "USAGE_INVALIDO"
            ? "USAGE_INVALID"
            : "COST_CALCULATION_FAILED",
          { latencyMs },
        );
      }

      // ------------------------------------------------------------ validação
      //
      // O output só vira tipo aqui. Antes disto é `unknown`, e é assim que
      // atravessa o adapter — conteúdo produzido por modelo é dado não
      // confiável como qualquer outro (`SECURITY_MODEL.md` §14).
      const validado = definicao.outputSchema.safeParse(resultado.output);

      if (!validado.success) {
        // A chamada consumiu tokens mesmo tendo produzido lixo. O custo entra
        // no ledger: escondê-lo faria a conta do mês não fechar.
        return encerrarComFalha("OUTPUT_SCHEMA_INVALID", {
          latencyMs,
          inputTokens: resultado.usage.inputTokens,
          outputTokens: resultado.usage.outputTokens,
          cachedTokens: resultado.usage.cachedTokens ?? null,
          estimatedCost: custo.custo,
          currency: custo.currency,
        });
      }

      // ------------------------------------------------------------ conclusão
      const concluiu = await deps.ledger.concluir({
        runId,
        organizationId,
        inputTokens: resultado.usage.inputTokens,
        outputTokens: resultado.usage.outputTokens,
        cachedTokens: resultado.usage.cachedTokens ?? null,
        estimatedCost: custo.custo,
        currency: custo.currency,
        latencyMs,
        confidence: resultado.confidence ?? null,
      });

      // Sem confirmação de escrita não há sucesso. O output existe, mas
      // entregá-lo afirmaria uma execução que o sistema não consegue provar —
      // e o run ficaria `STARTED` para sempre, sem explicação.
      if (!concluiu) return falha("LEDGER_WRITE_FAILED", runId);

      return {
        ok: true,
        output: validado.data,
        runId,
        modelKey: escolhido.modelKey,
        tier: escolhido.tier,
        estimatedCost: custo.custo,
        currency: custo.currency,
      };
    },
  };
}

export type AIRouter = ReturnType<typeof criarAIRouter>;
