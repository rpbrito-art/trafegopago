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
 * AI Router (Rodada 004A §5.6).
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
 * 3. escolher candidato por tier e capacidades;
 * 4. resolver **um** preço vigente, ou falhar;
 * 5. abrir o run `STARTED`;
 * 6. só então chamar o adapter;
 * 7. validar o output pelo schema;
 * 8. fechar o run com custo, ou com a classe de erro.
 *
 * Tudo que falha antes do passo 5 falha **sem ledger** — não há execução para
 * registrar, e inventar um run com modelo nulo poluiria a conta de custo com
 * linhas que nunca chamaram ninguém. Tudo que falha depois é registrado.
 */

export type AIRouterDeps = {
  tasks: AITaskRegistry;
  catalog: AICatalog;
  adapters: AIAdapterRegistry;
  ledger: AIRunLedger;
  /** Injetável para o custo de um teste ser reproduzível. */
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

      // ------------------------------------------------------------ input
      const inputValidado = definicao.inputSchema.safeParse(request.input);

      if (!inputValidado.success) {
        // Input inválido é erro de quem chamou, não do provider — e por isso
        // não escala para modelo melhor (`AI_ARCHITECTURE.md` §6).
        return falha("OUTPUT_SCHEMA_INVALID", null);
      }

      // ---------------------------------------------------------- candidato
      const todos = await deps.catalog.listarCandidatos();

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

      // -------------------------------------------------------------- preço
      const instante = agora();
      const precos = await deps.catalog.listarPrecosVigentes(
        escolhido.id,
        instante,
      );

      if (precos.length === 0) return falha("NO_PRICE_VERSION", null);
      // Duas versões vigentes significam que o custo desta chamada seria uma
      // escolha, não um cálculo. Falhar é mais honesto que arbitrar.
      if (precos.length > 1) return falha("AMBIGUOUS_PRICE_VERSION", null);

      const preco: AIPriceVersion = precos[0];

      // ------------------------------------------------------------ adapter
      const adapter = deps.adapters.resolve(escolhido.providerKey);

      // Nada de fallback silencioso para fake: sem adapter, a execução falha e
      // fica registrada. Uma aplicação que responde com dados inventados e
      // custo zero é pior do que uma que falha (mandato §10.14).
      if (!adapter) return falha("ADAPTER_NOT_REGISTERED", null);

      // ---------------------------------------------------------------- run
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

      if (!runId) return falha("UNKNOWN", null);

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
        await deps.ledger.falhar({
          runId,
          errorClass: "UNKNOWN",
          latencyMs: null,
        });
        return falha("UNKNOWN", runId);
      }

      if (!resultado.ok) {
        await deps.ledger.falhar({
          runId,
          errorClass: resultado.errorClass,
          latencyMs: resultado.latencyMs ?? null,
        });
        return falha(resultado.errorClass, runId);
      }

      // --------------------------------------------------------------- custo
      const custo = calcularCusto({ usage: resultado.usage, price: preco });

      // ------------------------------------------------------------ validação
      //
      // O output só vira tipo aqui. Antes disto é `unknown`, e é assim que
      // atravessa o adapter — conteúdo produzido por modelo é dado não
      // confiável como qualquer outro (`SECURITY_MODEL.md` §14).
      const validado = definicao.outputSchema.safeParse(resultado.output);

      if (!validado.success) {
        // A chamada consumiu tokens mesmo tendo produzido lixo. O custo entra
        // no ledger: escondê-lo faria a conta do mês não fechar.
        await deps.ledger.falhar({
          runId,
          errorClass: "OUTPUT_SCHEMA_INVALID",
          latencyMs: resultado.latencyMs ?? null,
          inputTokens: resultado.usage.inputTokens,
          outputTokens: resultado.usage.outputTokens,
          cachedTokens: resultado.usage.cachedTokens ?? null,
          estimatedCost: custo.ok ? custo.custo : null,
          currency: custo.ok ? custo.currency : null,
        });
        return falha("OUTPUT_SCHEMA_INVALID", runId);
      }

      await deps.ledger.concluir({
        runId,
        inputTokens: resultado.usage.inputTokens,
        outputTokens: resultado.usage.outputTokens,
        cachedTokens: resultado.usage.cachedTokens ?? null,
        estimatedCost: custo.ok ? custo.custo : null,
        currency: custo.ok ? custo.currency : null,
        latencyMs: resultado.latencyMs ?? null,
        confidence: resultado.confidence ?? null,
      });

      return {
        ok: true,
        output: validado.data,
        runId,
        modelKey: escolhido.modelKey,
        tier: escolhido.tier,
        estimatedCost: custo.ok ? custo.custo : null,
        currency: custo.ok ? custo.currency : null,
      };
    },
  };
}

export type AIRouter = ReturnType<typeof criarAIRouter>;
