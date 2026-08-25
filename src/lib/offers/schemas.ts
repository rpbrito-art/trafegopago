import { z } from "zod";

import { MAX_AMOUNT_MINOR, parseAmountToMinor } from "@/lib/business/money";

import {
  MAX_OFFER_DESCRIPTION_LENGTH,
  MAX_OFFER_NAME_LENGTH,
  MAX_OFFER_VALUE_PROPOSITION_LENGTH,
  OFFER_TYPES,
  PRICE_MODES,
  PRICE_MODE_AMOUNTS,
  type PriceMode,
} from "./offers";

/**
 * Validação do formulário de oferta.
 *
 * Os limites espelham os CHECKs de `business_offer_versions`. Duplicação
 * deliberada, mesma disciplina de `business/schemas.ts`: o banco é a garantia,
 * o Zod é a mensagem. Se um dos dois ficar mais frouxo, o usuário recebe erro
 * de constraint em vez de instrução — e é o banco que ganha.
 *
 * O que este schema NÃO tem importa tanto quanto o que tem: não existe campo
 * `organizationId`, `userId`, `role` nem `currency`. Tenant e identidade são
 * resolvidos no servidor, e a moeda é lida da organização pela RPC. Aceitá-los
 * do formulário seria entregar a chave do tenant a quem envia o POST.
 */

const nome = z
  .string()
  .trim()
  .min(1, "Diga o que você oferece.")
  .max(
    MAX_OFFER_NAME_LENGTH,
    `Use no máximo ${MAX_OFFER_NAME_LENGTH} caracteres.`,
  );

const opcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Use no máximo ${max} caracteres.`)
    // Campo opcional em branco é ausência, não string vazia — o CHECK
    // `..._not_blank` da tabela rejeitaria `''`.
    .transform((valor) => (valor === "" ? null : valor))
    .nullable();

/** Texto de dinheiro → unidade menor, ou `null` quando em branco. */
const valorMonetario = z
  .string()
  .trim()
  .transform((valor, ctx) => {
    const parsed = parseAmountToMinor(valor);

    if (!parsed.ok) {
      ctx.addIssue({
        code: "custom",
        message:
          parsed.reason === "excede"
            ? "Valor alto demais. Confira o preço informado."
            : parsed.reason === "negativo"
              ? "O preço não pode ser negativo."
              : "Use um valor como 1.250,00.",
      });
      return z.NEVER;
    }

    return parsed.amountMinor;
  })
  .refine(
    (valor) => valor === null || (valor >= 0 && valor <= MAX_AMOUNT_MINOR),
    "Valor fora do intervalo aceito.",
  );

export const offerFormSchema = z
  .object({
    name: nome,
    offerType: z.enum(OFFER_TYPES, {
      message: "Escolha se é produto, serviço ou pacote.",
    }),
    description: opcional(MAX_OFFER_DESCRIPTION_LENGTH),
    valueProposition: opcional(MAX_OFFER_VALUE_PROPOSITION_LENGTH),
    priceMode: z.enum(PRICE_MODES, { message: "Escolha como você cobra." }),
    priceMin: valorMonetario,
    priceMax: valorMonetario,
  })
  /**
   * O modo de preço decide o que precisa existir — e o que **não pode**
   * existir. Sem a segunda metade, um usuário que digitasse um valor e depois
   * trocasse para "sob orçamento" enviaria número junto com o modo que o
   * proíbe, e a constraint `..._price_shape` responderia com erro de banco em
   * vez de instrução.
   */
  .superRefine((valores, ctx) => {
    const forma = PRICE_MODE_AMOUNTS[valores.priceMode as PriceMode];

    if (forma === "nenhum") return;

    if (valores.priceMin === null) {
      ctx.addIssue({
        code: "custom",
        path: ["priceMin"],
        message:
          forma === "faixa"
            ? "Informe o valor mínimo da faixa."
            : "Informe o valor.",
      });
    }

    if (forma === "faixa") {
      if (valores.priceMax === null) {
        ctx.addIssue({
          code: "custom",
          path: ["priceMax"],
          message: "Informe o valor máximo da faixa.",
        });
        return;
      }

      if (valores.priceMin !== null && valores.priceMax < valores.priceMin) {
        ctx.addIssue({
          code: "custom",
          path: ["priceMax"],
          message: "O valor máximo não pode ser menor que o mínimo.",
        });
      }
    }
  })
  /**
   * Normaliza depois de validar: os valores que o modo escolhido não usa são
   * descartados aqui, e não persistidos "por garantia". O que chega à RPC é
   * exatamente a forma que a tabela aceita.
   */
  .transform((valores) => {
    const forma = PRICE_MODE_AMOUNTS[valores.priceMode as PriceMode];

    return {
      ...valores,
      priceMin: forma === "nenhum" ? null : valores.priceMin,
      priceMax: forma === "faixa" ? valores.priceMax : null,
    };
  });

export type OfferFormInput = z.infer<typeof offerFormSchema>;

export type OfferFieldErrors = Partial<
  Record<
    "name" | "offerType" | "description" | "valueProposition" | "priceMode" | "priceMin" | "priceMax",
    string
  >
>;

/** Reduz o erro do Zod a no máximo uma mensagem por campo. */
export function toOfferFieldErrors(error: z.ZodError): OfferFieldErrors {
  const errors: OfferFieldErrors = {};

  for (const issue of error.issues) {
    const campo = issue.path[0];
    if (typeof campo !== "string") continue;

    const chave = campo as keyof OfferFieldErrors;
    if (errors[chave] === undefined) errors[chave] = issue.message;
  }

  return errors;
}
