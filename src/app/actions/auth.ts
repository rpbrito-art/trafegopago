"use server";

import { redirect } from "next/navigation";

import { describeSignInError, describeSignUpError } from "@/lib/auth/errors";
import { sanitizeRedirect } from "@/lib/auth/redirect";
import { ROUTES } from "@/lib/auth/routes";
import {
  signInSchema,
  signUpSchema,
  toFieldErrors,
  type FieldErrors,
} from "@/lib/auth/schemas";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AuthFormState = {
  /** Erros por campo, vindos da validação server-side. */
  errors?: FieldErrors;
  /** Erro geral já traduzido para mensagem segura. */
  message?: string;
  /** E-mail digitado, devolvido para repopular o formulário. Senha nunca. */
  email?: string;
};

/**
 * Cadastro por e-mail/senha.
 *
 * O projeto exige confirmação de e-mail, então o caso normal termina sem sessão
 * e com o usuário mandado para a tela de "verifique sua caixa de entrada". O
 * ramo com sessão existe porque um projeto com auto-confirmação ligada devolve
 * sessão imediatamente — e nesse caso mandar o usuário esperar um e-mail que
 * nunca chega seria um beco sem saída.
 *
 * Não cria profile, organization nem qualquer tabela própria: tenancy é
 * explicitamente fora de escopo desta rodada.
 */
export async function signUpAction(
  _prevState: AuthFormState | undefined,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  const rawEmail = asString(formData.get("email"));

  if (!parsed.success) {
    return { errors: toFieldErrors(parsed.error), email: rawEmail };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { message: describeSignUpError(error), email: parsed.data.email };
  }

  if (data.session) {
    redirect(ROUTES.account);
  }

  redirect(ROUTES.checkEmail);
}

/**
 * Login por e-mail/senha.
 *
 * Qualquer falha de credencial devolve a mesma mensagem, para não permitir
 * enumeração de contas.
 */
export async function signInAction(
  _prevState: AuthFormState | undefined,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  const rawEmail = asString(formData.get("email"));
  // O destino vem de um campo oculto controlado pelo cliente: passa pela
  // allowlist antes de virar redirect.
  const next = sanitizeRedirect(asString(formData.get("next")));

  if (!parsed.success) {
    return { errors: toFieldErrors(parsed.error), email: rawEmail };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { message: describeSignInError(error), email: parsed.data.email };
  }

  redirect(next);
}

/**
 * Logout server-side.
 *
 * `signOut()` revoga a sessão no Supabase e o server client remove os cookies
 * correspondentes; limpar só o cookie deixaria o refresh token válido no
 * servidor.
 */
export async function signOutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  redirect(ROUTES.home);
}

function asString(value: FormDataEntryValue | null): string | undefined {
  return typeof value === "string" ? value : undefined;
}
