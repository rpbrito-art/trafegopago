import { z } from "zod";

import { MAX_AMOUNT_MINOR, parseAmountToMinor } from "./money";

/**
 * Validação do formulário de criação do negócio inicial.
 *
 * Os limites espelham os CHECKs da migration `..._create_business_profiles_and_bootstrap`.
 * Duplicação deliberada: o banco é a garantia, o Zod é a mensagem. Se um deles
 * ficar mais frouxo, o usuário recebe erro de constraint em vez de instrução —
 * e é o banco que ganha.
 *
 * O que este schema NÃO faz é tão importante quanto o que faz: não existe campo
 * `userId`, `organizationId`, `role` nem `status`. Um `.strict()` recusaria
 * esses nomes; aqui eles simplesmente não têm por onde entrar, porque a action
 * lê campo a campo do `FormData` e a identidade vem de `getClaims()`.
 */

const requiredText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .min(1, `Informe ${label}.`)
    .max(max, `Use no máximo ${max} caracteres.`);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Use no máximo ${max} caracteres.`)
    // Campo opcional em branco é ausência, não string vazia — o CHECK
    // `..._not_blank` da tabela rejeitaria `''`.
    .transform((value) => (value === "" ? null : value))
    .nullable();

export const MAX_COMMERCIAL_GOAL_LENGTH = 500;

export const createInitialBusinessSchema = z.object({
  organizationName: requiredText(160, "o nome da empresa"),
  segment: requiredText(120, "o segmento"),
  locationSummary: requiredText(160, "a cidade ou região"),
  primaryOffer: requiredText(280, "o produto, serviço ou oferta principal"),
  targetAudience: requiredText(280, "o público-alvo"),
  acquisitionGoal: requiredText(280, "o objetivo de aquisição"),
  differentiators: optionalText(1000),
  knownObjections: optionalText(1000),
  commercialGoal: optionalText(MAX_COMMERCIAL_GOAL_LENGTH),

  /**
   * Ticket médio chega como texto e sai como unidade menor inteira.
   *
   * A conversão vive em `money.ts` e é testada isoladamente; aqui ela só
   * empresta o resultado ao Zod para que a falha vire erro de campo em vez de
   * exceção no meio da action.
   */
  averageTicket: z
    .string()
    .trim()
    .transform((value, ctx) => {
      const parsed = parseAmountToMinor(value);

      if (!parsed.ok) {
        ctx.addIssue({
          code: "custom",
          message:
            parsed.reason === "excede"
              ? "Valor alto demais. Confira o ticket médio informado."
              : parsed.reason === "negativo"
                ? "O ticket médio não pode ser negativo."
                : "Use um valor como 1.250,00.",
        });
        return z.NEVER;
      }

      return parsed.amountMinor;
    })
    .refine(
      (value) => value === null || (value >= 0 && value <= MAX_AMOUNT_MINOR),
      "Valor fora do intervalo aceito.",
    ),
});

export type CreateInitialBusinessInput = z.infer<
  typeof createInitialBusinessSchema
>;

export type BusinessFieldErrors = Partial<
  Record<keyof CreateInitialBusinessInput, string>
>;

/** Reduz o erro do Zod a no máximo uma mensagem por campo. */
export function toBusinessFieldErrors(error: z.ZodError): BusinessFieldErrors {
  const errors: BusinessFieldErrors = {};

  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field !== "string") continue;

    const key = field as keyof CreateInitialBusinessInput;
    if (errors[key] === undefined) errors[key] = issue.message;
  }

  return errors;
}

/**
 * Meta comercial como objeto JSON.
 *
 * O CHECK da tabela exige objeto — não string solta, não array. A forma final
 * da meta (valor, prazo, unidade) ainda não foi decidida pelo produto; até lá
 * o texto do usuário fica sob uma chave nomeada, que pode ganhar irmãs sem
 * quebrar o que já foi gravado.
 */
export function toCommercialGoalJson(
  commercialGoal: string | null,
): { summary: string } | null {
  return commercialGoal === null ? null : { summary: commercialGoal };
}
