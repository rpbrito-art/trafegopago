import { z } from "zod";

/**
 * Comprimento mínimo de senha exigido pelo produto.
 *
 * O projeto Supabase aceita 6 (default). O app exige 8: a validação server-side
 * é a primeira barreira e não deve ser mais frouxa que a do provider.
 */
export const MIN_PASSWORD_LENGTH = 8;

/** Teto defensivo: evita hashing de payload arbitrariamente grande. */
export const MAX_PASSWORD_LENGTH = 72;

const email = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Informe seu e-mail.")
  .max(254, "E-mail inválido.")
  .pipe(z.email("Informe um e-mail válido."));

/**
 * Cadastro: valida força mínima antes de chamar o provider.
 */
export const signUpSchema = z.object({
  email,
  password: z
    .string()
    .min(
      MIN_PASSWORD_LENGTH,
      `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`,
    )
    .max(MAX_PASSWORD_LENGTH, "A senha é longa demais."),
});

/**
 * Login: valida apenas formato/presença.
 *
 * Não aplica a regra de força aqui de propósito — dizer "sua senha é curta" no
 * login revelaria que a conta existe e qual política ela usa. Credencial
 * inválida sempre devolve a mesma mensagem genérica.
 */
export const signInSchema = z.object({
  email,
  password: z
    .string()
    .min(1, "Informe sua senha.")
    .max(MAX_PASSWORD_LENGTH, "Credenciais inválidas."),
});

/**
 * Pedido de recuperação: só o e-mail.
 *
 * Nenhum outro campo entra aqui. O formulário é público e a resposta é neutra
 * — quanto menos entrada, menos superfície para transformar a tela em sonda de
 * existência de conta.
 */
export const passwordResetRequestSchema = z.object({ email });

/**
 * Definição da nova senha.
 *
 * Mesma regra de força do cadastro, mais confirmação. A comparação vive no
 * schema (e não na UI) porque é validação server-side que decide; o cliente
 * pode ser contornado.
 */
export const newPasswordSchema = z
  .object({
  password: z
    .string()
    .min(
      MIN_PASSWORD_LENGTH,
      `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`,
    )
    .max(MAX_PASSWORD_LENGTH, "A senha é longa demais."),
    passwordConfirmation: z.string().min(1, "Repita a nova senha."),
  })
  .refine((value) => value.password === value.passwordConfirmation, {
    path: ["passwordConfirmation"],
    message: "As senhas não coincidem.",
  });

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type PasswordResetRequestInput = z.infer<
  typeof passwordResetRequestSchema
>;
export type NewPasswordInput = z.infer<typeof newPasswordSchema>;

export type FieldErrors = {
  email?: string;
  password?: string;
  passwordConfirmation?: string;
};

/**
 * Reduz o erro do Zod a no máximo uma mensagem por campo conhecido.
 */
export function toFieldErrors(error: z.ZodError): FieldErrors {
  const fieldErrors: FieldErrors = {};

  for (const issue of error.issues) {
    const field = issue.path[0];
    if (field === "email" && !fieldErrors.email) {
      fieldErrors.email = issue.message;
    }
    if (field === "password" && !fieldErrors.password) {
      fieldErrors.password = issue.message;
    }
    if (
      field === "passwordConfirmation" &&
      !fieldErrors.passwordConfirmation
    ) {
      fieldErrors.passwordConfirmation = issue.message;
    }
  }

  return fieldErrors;
}
