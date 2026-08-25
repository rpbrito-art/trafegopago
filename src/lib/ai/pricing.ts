import type { AIAdapterUsage, AIPriceVersion } from "./contracts";

/**
 * Cálculo de custo de uma chamada de IA (Rodada 004A §8).
 *
 * ## Por que não `number`
 *
 * Uma chamada Tier 1 custa frações de centavo. `0.15 / 1_000_000 * 1234` em
 * ponto flutuante devolve um número plausível e errado, e o erro se acumula
 * silenciosamente ao longo de milhares de execuções — até a soma do mês não
 * bater com a fatura do provider. Aqui tudo é `bigint` em escala fixa, e o
 * valor persistido é texto decimal exato.
 *
 * Nenhuma dependência nova: o mandato manda parar e devolver a decisão ao GPT
 * antes de adicionar biblioteca decimal, e `bigint` resolve sem isso.
 *
 * ## A regra dos tokens cacheados
 *
 * `cachedTokens` é **disjunto** de `inputTokens` — o adapter reporta os dois
 * separadamente, e somá-los cobraria duas vezes pelo mesmo token. Quando o
 * modelo tem preço de cache, os cacheados vão por ele; quando não tem, vão
 * pelo preço de input. Cobrar zero por ausência de preço afirmaria gratuidade
 * onde o correto é "este provider não distingue cache".
 */

/** Casas decimais do `numeric(20,12)` das colunas de preço e custo. */
export const ESCALA_DECIMAL = 12;

// `BigInt(...)` em vez de literais `10n`: o projeto compila para ES2017, que
// não tem a sintaxe de literal — só o construtor.
const ZERO = BigInt(0);
const UM = BigInt(1);
const DOIS = BigInt(2);

const FATOR = BigInt(10) ** BigInt(ESCALA_DECIMAL);
const TOKENS_POR_UNIDADE_DE_PRECO = BigInt(1_000_000);

/**
 * Texto decimal → inteiro escalado por 10^12.
 *
 * Aceita o que o Postgres devolve de um `numeric`: `"0.15"`, `"0.000000150000"`,
 * `"3"`, `"-0.1"`. Rejeita notação científica e qualquer coisa que não seja um
 * decimal simples — um preço que chega como `1e-7` é um preço que ninguém
 * conferiu.
 */
export function parseDecimalParaEscala(valor: string): bigint | null {
  const texto = valor.trim();

  if (!/^-?\d+(\.\d+)?$/.test(texto)) return null;

  const negativo = texto.startsWith("-");
  const semSinal = negativo ? texto.slice(1) : texto;
  const [inteiro, fracao = ""] = semSinal.split(".");

  // Mais casas do que a escala suporta: truncar aqui esconderia perda de
  // precisão dentro de um número que parece exato.
  if (fracao.length > ESCALA_DECIMAL) return null;

  const fracaoCompleta = fracao.padEnd(ESCALA_DECIMAL, "0");
  const escalado = BigInt(inteiro) * FATOR + BigInt(fracaoCompleta || "0");

  return negativo ? -escalado : escalado;
}

/** Inteiro escalado → texto decimal com exatamente `ESCALA_DECIMAL` casas. */
export function formatarEscalaParaDecimal(escalado: bigint): string {
  const negativo = escalado < ZERO;
  const absoluto = negativo ? -escalado : escalado;

  const inteiro = absoluto / FATOR;
  const fracao = (absoluto % FATOR).toString().padStart(ESCALA_DECIMAL, "0");

  return `${negativo ? "-" : ""}${inteiro}.${fracao}`;
}

/**
 * Divisão com arredondamento half-up.
 *
 * Truncar enviesaria todo custo para baixo — de forma pequena por chamada e
 * consistente no agregado, que é a pior combinação para uma conta financeira.
 */
function dividirArredondando(numerador: bigint, denominador: bigint): bigint {
  const negativo = numerador < ZERO;
  const absoluto = negativo ? -numerador : numerador;

  const quociente = absoluto / denominador;
  const resto = absoluto % denominador;
  const arredondado = resto * DOIS >= denominador ? quociente + UM : quociente;

  return negativo ? -arredondado : arredondado;
}

export type CalculoDeCusto =
  | { ok: true; custo: string; currency: string }
  | { ok: false; motivo: "PRECO_INVALIDO" | "USAGE_INVALIDO" };

/**
 * Custo reproduzível a partir do usage observado e de uma versão de preço.
 *
 * Reproduzível é o requisito central: dados os mesmos tokens e a mesma
 * `ai_price_versions`, o resultado é o mesmo hoje e daqui a um ano — inclusive
 * depois de o provider mudar a tabela de preços.
 */
export function calcularCusto(input: {
  usage: AIAdapterUsage;
  price: Pick<
    AIPriceVersion,
    | "inputPricePerMillion"
    | "outputPricePerMillion"
    | "cachedInputPricePerMillion"
    | "currency"
  >;
}): CalculoDeCusto {
  const { usage, price } = input;

  const inputTokens = usage.inputTokens;
  const outputTokens = usage.outputTokens;
  const cachedTokens = usage.cachedTokens ?? 0;

  for (const quantidade of [inputTokens, outputTokens, cachedTokens]) {
    if (!Number.isInteger(quantidade) || quantidade < 0) {
      return { ok: false, motivo: "USAGE_INVALIDO" };
    }
  }

  const precoInput = parseDecimalParaEscala(price.inputPricePerMillion);
  const precoOutput = parseDecimalParaEscala(price.outputPricePerMillion);

  if (precoInput === null || precoOutput === null) {
    return { ok: false, motivo: "PRECO_INVALIDO" };
  }

  if (precoInput < ZERO || precoOutput < ZERO) {
    return { ok: false, motivo: "PRECO_INVALIDO" };
  }

  // Sem preço de cache declarado, o token cacheado custa o mesmo que um token
  // de input. Ver a nota no topo sobre por que não é zero.
  let precoCached = precoInput;

  if (price.cachedInputPricePerMillion !== null) {
    const parseado = parseDecimalParaEscala(price.cachedInputPricePerMillion);
    if (parseado === null || parseado < ZERO) {
      return { ok: false, motivo: "PRECO_INVALIDO" };
    }
    precoCached = parseado;
  }

  const bruto =
    BigInt(inputTokens) * precoInput +
    BigInt(outputTokens) * precoOutput +
    BigInt(cachedTokens) * precoCached;

  const custo = dividirArredondando(bruto, TOKENS_POR_UNIDADE_DE_PRECO);

  return {
    ok: true,
    custo: formatarEscalaParaDecimal(custo),
    currency: price.currency,
  };
}
