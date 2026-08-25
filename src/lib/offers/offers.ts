/**
 * Ofertas do negócio — vocabulário, tradução e apresentação (Rodada 004C §4).
 *
 * Os `CHECK` da migration `20260825210000_create_business_offers.sql` são a
 * autoridade sobre os conjuntos fechados; aqui ficam os mesmos valores em
 * TypeScript, para que a divergência apareça no compilador em vez de virar
 * `23514` em produção.
 *
 * As chaves são **internas**. A UI mostra apenas os rótulos em português — um
 * usuário não deve encontrar `STARTING_AT` na tela, do mesmo modo que não deve
 * encontrar SKU, versão ou id de registro
 * (`GROWTH_INTELLIGENCE_CANONICAL.md` §2.1).
 */

import { formatMinorAmount } from "@/lib/business/money";

export const OFFER_TYPES = ["PRODUCT", "SERVICE", "PACKAGE", "OTHER"] as const;

export type OfferType = (typeof OFFER_TYPES)[number];

export const PRICE_MODES = [
  "FIXED",
  "STARTING_AT",
  "RANGE",
  "QUOTE",
  "FREE",
  "NOT_INFORMED",
] as const;

export type PriceMode = (typeof PRICE_MODES)[number];

export const OFFER_STATUSES = ["ACTIVE", "ARCHIVED"] as const;

export type OfferStatus = (typeof OFFER_STATUSES)[number];

/** Limites espelhados dos CHECKs da tabela. */
export const MAX_OFFER_NAME_LENGTH = 120;
export const MAX_OFFER_DESCRIPTION_LENGTH = 600;
export const MAX_OFFER_VALUE_PROPOSITION_LENGTH = 400;

// ---------------------------------------------------------------------------
// Tradução para linguagem de negócio
// ---------------------------------------------------------------------------

/** "É um produto, serviço ou pacote?" */
export const OFFER_TYPE_LABELS: Record<OfferType, string> = {
  PRODUCT: "Produto",
  SERVICE: "Serviço",
  PACKAGE: "Pacote ou plano",
  OTHER: "Outro",
};

/** "Como você cobra?" */
export const PRICE_MODE_LABELS: Record<PriceMode, string> = {
  FIXED: "Preço fixo",
  STARTING_AT: "A partir de um valor",
  RANGE: "Uma faixa de preço",
  QUOTE: "Sob orçamento",
  FREE: "Gratuito",
  NOT_INFORMED: "Prefiro não informar agora",
};

/**
 * Modos que exigem valor numérico — e quantos.
 *
 * O formulário usa isto para mostrar os campos de dinheiro só quando fazem
 * sentido, e o schema usa o mesmo mapa para validar. Duas listas separadas
 * divergiriam na primeira alteração de taxonomia.
 */
export const PRICE_MODE_AMOUNTS: Record<PriceMode, "nenhum" | "minimo" | "faixa"> =
  {
    FIXED: "minimo",
    STARTING_AT: "minimo",
    RANGE: "faixa",
    QUOTE: "nenhum",
    FREE: "nenhum",
    NOT_INFORMED: "nenhum",
  };

export function isOfferType(value: unknown): value is OfferType {
  return (OFFER_TYPES as readonly unknown[]).includes(value);
}

export function isPriceMode(value: unknown): value is PriceMode {
  return (PRICE_MODES as readonly unknown[]).includes(value);
}

// ---------------------------------------------------------------------------
// Oferta resolvida
// ---------------------------------------------------------------------------

/**
 * Uma oferta como o produto a enxerga: identidade + conteúdo corrente.
 *
 * A separação entre `business_offers` e `business_offer_versions` é do banco.
 * Acima daqui, quem lê não precisa saber que existem versões — só que o
 * histórico é preservado.
 */
export type BusinessOffer = {
  id: string;
  name: string;
  offerType: OfferType;
  description: string | null;
  valueProposition: string | null;
  priceMode: PriceMode;
  priceMinMinor: number | null;
  priceMaxMinor: number | null;
  currency: string;
  /** Quando a oferta passou a existir, não quando a versão corrente nasceu. */
  createdAt: string;
};

/**
 * Como o preço aparece na tela.
 *
 * Cada modo tem uma frase própria porque as afirmações são diferentes:
 * "gratuito" é um preço, "sob orçamento" é a ausência deliberada de um, e
 * "não informado" é a ausência de resposta. Colapsar os três em "—" apagaria a
 * distinção que o usuário acabou de fazer.
 */
export function descreverPreco(oferta: BusinessOffer): string {
  const { priceMode, priceMinMinor, priceMaxMinor, currency } = oferta;

  switch (priceMode) {
    case "FIXED":
      return priceMinMinor === null
        ? "Preço não informado"
        : formatMinorAmount(priceMinMinor, currency);

    case "STARTING_AT":
      return priceMinMinor === null
        ? "Preço não informado"
        : `A partir de ${formatMinorAmount(priceMinMinor, currency)}`;

    case "RANGE":
      return priceMinMinor === null || priceMaxMinor === null
        ? "Preço não informado"
        : `De ${formatMinorAmount(priceMinMinor, currency)} a ${formatMinorAmount(
            priceMaxMinor,
            currency,
          )}`;

    case "QUOTE":
      return "Sob orçamento";

    case "FREE":
      return "Gratuito";

    case "NOT_INFORMED":
      return "Preço não informado";
  }
}

/**
 * Texto pré-preenchido para o campo de valor, na edição.
 *
 * Devolve o valor em unidade menor como texto pt-BR **sem símbolo de moeda**,
 * porque é isso que volta ao input e será relido por `parseAmountToMinor`.
 * Reaproveitar `formatMinorAmount` aqui colocaria "R$" dentro do campo.
 *
 * A conversão é textual, como a de `money.ts` e pelo mesmo motivo: dividir por
 * 100 traria ponto flutuante para o caminho de ida e volta de um valor que o
 * usuário vai reenviar.
 */
export function valorParaCampo(amountMinor: number | null): string {
  if (amountMinor === null) return "";

  const digitos = String(Math.trunc(Math.abs(amountMinor))).padStart(3, "0");
  const inteiro = digitos.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  return `${inteiro},${digitos.slice(-2)}`;
}
