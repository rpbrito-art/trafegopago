import type {
  AIAdapterRequest,
  AIErrorClass,
  AIProviderAdapter,
} from "@/lib/ai/contracts";

/**
 * Adapter determinístico de IA — **apenas para testes**.
 *
 * Mora em `test/`, e não em `src/`, de propósito: o mandato 004A §5.5 proíbe
 * cadastrar o fake como provider de produção, e a forma mais confiável de
 * garantir isso é o código produtivo não conseguir importá-lo. Nenhuma chamada
 * de rede, nenhuma chave, nenhum SDK.
 *
 * O que ele oferece é controle total sobre o desfecho — output, usage, erro,
 * exceção — para que as provas do Router sejam sobre **a ordem das decisões**,
 * não sobre o comportamento de um provider real.
 */
export type DesfechoFake =
  | { tipo: "ok"; output: unknown; usage?: { input: number; output: number; cached?: number | null }; confidence?: number | null; latencyMs?: number | null }
  | { tipo: "erro"; errorClass: AIErrorClass; latencyMs?: number | null }
  | { tipo: "excecao" };

export function criarFakeAdapter(input: {
  providerKey: string;
  desfecho: DesfechoFake;
}): AIProviderAdapter & { chamadas: AIAdapterRequest[] } {
  const chamadas: AIAdapterRequest[] = [];

  return {
    providerKey: input.providerKey,
    chamadas,
    async execute(request) {
      chamadas.push(request);

      const desfecho = input.desfecho;

      if (desfecho.tipo === "excecao") {
        throw new Error("provider explodiu com token-no-texto");
      }

      if (desfecho.tipo === "erro") {
        return {
          ok: false,
          errorClass: desfecho.errorClass,
          latencyMs: desfecho.latencyMs ?? null,
        };
      }

      return {
        ok: true,
        output: desfecho.output,
        usage: {
          inputTokens: desfecho.usage?.input ?? 0,
          outputTokens: desfecho.usage?.output ?? 0,
          cachedTokens: desfecho.usage?.cached ?? null,
        },
        confidence: desfecho.confidence ?? null,
        latencyMs: desfecho.latencyMs ?? null,
      };
    },
  };
}
