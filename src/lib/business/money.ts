/**
 * Conversão de valor monetário digitado para unidade menor inteira.
 *
 * `DATA_MODEL.md` §1 exige `amount_minor` inteiro + `currency`. O ponto
 * sensível não é o formato de entrada, é o caminho: nenhuma etapa desta
 * conversão passa por ponto flutuante. `parseFloat("1234.56") * 100` devolve
 * `123455.99999999999` — e o arredondamento que consertaria isso é
 * exatamente o tipo de correção silenciosa que não se quer em dinheiro.
 *
 * A conversão aqui é textual: separa parte inteira e fracionária como string,
 * completa a fração com zeros até o expoente da moeda e concatena. O resultado
 * é exato por construção.
 */

/** Casas decimais da moeda. Só BRL nesta rodada. */
const MINOR_UNIT_EXPONENT: Record<string, number> = { BRL: 2 };

/** Moeda padrão desta fase (mandato 001E §8). */
export const DEFAULT_CURRENCY = "BRL";

/** Timezone padrão desta fase (mandato 001E §8). */
export const DEFAULT_TIMEZONE = "America/Sao_Paulo";

/**
 * Teto do ticket médio em unidade menor: R$ 1 bilhão.
 *
 * Existe para que um erro de digitação não vire um número absurdo persistido,
 * e para manter o valor confortavelmente dentro de `Number.MAX_SAFE_INTEGER`
 * antes de chegar ao `bigint` do Postgres.
 */
export const MAX_AMOUNT_MINOR = 100_000_000_000;

export type ParsedAmount =
  | { ok: true; amountMinor: number | null }
  | { ok: false; reason: "formato" | "negativo" | "excede" };

/**
 * Converte o texto digitado em unidade menor.
 *
 * Aceita vazio (campo opcional) devolvendo `null`, não `0`: "não informei meu
 * ticket médio" e "meu ticket médio é zero" não são a mesma afirmação.
 *
 * Separadores: aceita os dois estilos que um usuário brasileiro digita de
 * fato. As regras são determinísticas e sem adivinhação estatística:
 *
 * - dois tipos presentes (`1.234,56`) → o ÚLTIMO é o decimal, o outro é
 *   agrupamento;
 * - um tipo, repetido (`1.234.567`) → agrupamento;
 * - um tipo, uma vez, seguido de 1 ou 2 dígitos (`12,5`) → decimal;
 * - um PONTO, uma vez, seguido de exatamente 3 dígitos (`1.234`) →
 *   agrupamento, pela convenção pt-BR;
 * - uma VÍRGULA, uma vez, seguida de exatamente 3 dígitos (`1,234`) →
 *   recusado. Em pt-BR a vírgula é o separador decimal, e três casas decimais
 *   não existem em BRL; ler isso como agrupamento multiplicaria o valor por
 *   mil silenciosamente. Melhor devolver o campo ao usuário.
 * - qualquer outro arranjo → `formato`, sem tentar salvar a entrada.
 */
export function parseAmountToMinor(
  input: string | null | undefined,
  currency: string = DEFAULT_CURRENCY,
): ParsedAmount {
  const exponent = MINOR_UNIT_EXPONENT[currency];
  if (exponent === undefined) return { ok: false, reason: "formato" };

  const raw = (input ?? "").trim();
  if (raw === "") return { ok: true, amountMinor: null };

  // Remove símbolo de moeda e espaços (inclusive o não separável que vem de
  // copiar/colar de planilha). O sinal e os dígitos permanecem.
  const cleaned = raw.replace(/R\$/gi, "").replace(/[\s ]/g, "");

  if (cleaned.startsWith("-")) return { ok: false, reason: "negativo" };
  if (!/^[0-9.,]+$/.test(cleaned)) return { ok: false, reason: "formato" };

  const dots = cleaned.split(".").length - 1;
  const commas = cleaned.split(",").length - 1;

  let decimalSeparator: "." | "," | null = null;

  if (dots > 0 && commas > 0) {
    decimalSeparator = cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".") ? "," : ".";
  } else if (dots === 1 || commas === 1) {
    const separator = dots === 1 ? "." : ",";
    const decimals = cleaned.length - cleaned.lastIndexOf(separator) - 1;

    if (decimals >= 1 && decimals <= 2) decimalSeparator = separator;
    else if (decimals !== 3 || separator === ",") {
      return { ok: false, reason: "formato" };
    }
  }

  const [integerText, fractionText] = splitOn(cleaned, decimalSeparator);

  // A fração não admite separador algum.
  if (fractionText !== "" && !/^[0-9]+$/.test(fractionText)) {
    return { ok: false, reason: "formato" };
  }
  if (fractionText.length > exponent) return { ok: false, reason: "formato" };

  // O que sobrou na parte inteira só pode ser agrupamento — e agrupamento tem
  // forma fixa. Sem esta verificação, `1.2.3,4` passaria como 1234,40: os
  // separadores seriam removidos e o lixo viraria um número plausível.
  if (!isWellFormedInteger(integerText)) {
    return { ok: false, reason: "formato" };
  }

  // `,50` é entrada legítima: a parte inteira ausente vale zero.
  const integerDigits = integerText.replace(/[.,]/g, "") || "0";

  const minorText = integerDigits + fractionText.padEnd(exponent, "0");

  // `BigInt` e não `Number` para a soma: o valor só vira `number` depois de
  // provado dentro do teto.
  const amountMinor = BigInt(minorText);
  if (amountMinor > BigInt(MAX_AMOUNT_MINOR)) {
    return { ok: false, reason: "excede" };
  }

  return { ok: true, amountMinor: Number(amountMinor) };
}

/**
 * Formata unidade menor para exibição em pt-BR.
 *
 * Aqui a divisão por potência de 10 é aceitável — e só aqui. O valor persistido
 * continua inteiro; este número existe por microssegundos, só para o `Intl`
 * arredondar de volta às mesmas duas casas. Para qualquer inteiro abaixo do
 * teto desta rodada o erro de representação fica muitas ordens de grandeza
 * abaixo de meio centavo, então o texto produzido é sempre exato. Nenhum
 * cálculo de domínio pode usar este caminho.
 */
export function formatMinorAmount(
  amountMinor: number,
  currency: string = DEFAULT_CURRENCY,
): string {
  const exponent = MINOR_UNIT_EXPONENT[currency] ?? 2;

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
    minimumFractionDigits: exponent,
    maximumFractionDigits: exponent,
  }).format(amountMinor / 10 ** exponent);
}

/**
 * Aceita `1234`, `1.234.567`, `1,234,567` e a parte inteira vazia de `,50`.
 * Recusa agrupamento irregular (`1.23.456`) e mistura de separadores.
 */
function isWellFormedInteger(integerText: string): boolean {
  if (integerText === "" || /^[0-9]+$/.test(integerText)) return true;

  const grouping = integerText.includes(".") ? "." : ",";
  if (integerText.includes(grouping === "." ? "," : ".")) return false;

  const pattern = grouping === "." ? /^[0-9]{1,3}(\.[0-9]{3})+$/ : /^[0-9]{1,3}(,[0-9]{3})+$/;
  return pattern.test(integerText);
}

function splitOn(value: string, separator: "." | "," | null): [string, string] {
  if (separator === null) return [value, ""];

  const at = value.lastIndexOf(separator);
  return [value.slice(0, at), value.slice(at + 1)];
}
