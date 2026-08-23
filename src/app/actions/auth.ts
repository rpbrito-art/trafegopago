"use server";

import { redirect } from "next/navigation";

import {
  describePasswordUpdateError,
  describeSignInError,
  describeSignUpError,
  GENERIC_ERROR,
  isRateLimited,
  PASSWORD_CHANGED_SESSIONS_KEPT,
  RECOVERY_SESSION_REQUIRED,
} from "@/lib/auth/errors";
import { sanitizeRedirect } from "@/lib/auth/redirect";
import { PASSWORD_RESET_DONE_PARAM, ROUTES } from "@/lib/auth/routes";
import {
  newPasswordSchema,
  passwordResetRequestSchema,
  signInSchema,
  signUpSchema,
  toFieldErrors,
  type FieldErrors,
} from "@/lib/auth/schemas";
import { getRecoveryUser } from "@/lib/auth/session";
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

export type PasswordResetRequestState = {
  errors?: FieldErrors;
  /** Erro acionável (indisponibilidade, rate limit). Nunca enumera contas. */
  message?: string;
  /** Pedido aceito: a UI deve mostrar a mensagem neutra. */
  requested?: boolean;
  email?: string;
};

export type NewPasswordState = {
  errors?: FieldErrors;
  message?: string;
};

/**
 * Pedido de recuperação de senha.
 *
 * A resposta é a mesma para e-mail cadastrado e não cadastrado — inclusive
 * quando o provider devolve erro. As duas exceções são situações que não
 * dependem do e-mail existir: excesso de tentativas e indisponibilidade do
 * provider. Qualquer outro erro vira a mensagem neutra, porque tratá-lo de
 * forma distinta é exatamente o que permitiria sondar a base.
 *
 * Usa o cliente Supabase comum, com a chave publicável. A secret key não
 * participa deste fluxo (`SECURITY_MODEL.md` §6).
 */
export async function requestPasswordResetAction(
  _prevState: PasswordResetRequestState | undefined,
  formData: FormData,
): Promise<PasswordResetRequestState> {
  const parsed = passwordResetRequestSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return {
      errors: toFieldErrors(parsed.error),
      email: asString(formData.get("email")),
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
  );

  if (error) {
    if (isRateLimited(error)) {
      return {
        message: "Muitas tentativas em pouco tempo. Aguarde alguns minutos.",
        email: parsed.data.email,
      };
    }

    if (typeof error.status === "number" && error.status >= 500) {
      return { message: GENERIC_ERROR, email: parsed.data.email };
    }
  }

  // Sem eco do e-mail: a tela de confirmação é acessível por navegação direta,
  // e repetir o endereço nela daria a um terceiro uma forma de confirmar o que
  // foi digitado.
  return { requested: true };
}

/**
 * Definição da nova senha.
 *
 * Três barreiras, nesta ordem: schema (força e confirmação), sessão de
 * recovery (`getRecoveryUser`) e o próprio provider. A troca é feita com
 * `updateUser({ password })` no contexto do próprio usuário — nenhuma
 * chamada admin e nenhuma secret key participam do caminho funcional.
 *
 * Depois da troca vem `signOut({ scope: "global" })`, explícito. Duas razões
 * para não deixar o escopo implícito: quem acabou de recuperar a conta pode
 * estar justamente expulsando quem tinha acesso indevido, e o default do SDK é
 * detalhe de versão — algo que uma decisão de segurança não deve herdar sem
 * dizer. Isso encerra também a própria sessão de recovery, que existe para
 * trocar a senha e não para virar login.
 *
 * Se o logout falhar, a senha já mudou: o usuário é informado de que as outras
 * sessões podem seguir abertas, em vez de receber um erro que sugeriria que
 * nada aconteceu.
 */
export async function resetPasswordAction(
  _prevState: NewPasswordState | undefined,
  formData: FormData,
): Promise<NewPasswordState> {
  const parsed = newPasswordSchema.safeParse({
    password: formData.get("password"),
    passwordConfirmation: formData.get("passwordConfirmation"),
  });

  if (!parsed.success) {
    // Nenhum campo é devolvido: senha digitada nunca volta para o formulário.
    return { errors: toFieldErrors(parsed.error) };
  }

  const recoveryUser = await getRecoveryUser();

  if (!recoveryUser) {
    return { message: RECOVERY_SESSION_REQUIRED };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return { message: describePasswordUpdateError(error) };
  }

  const { error: signOutError } = await supabase.auth.signOut({
    scope: "global",
  });

  if (signOutError) {
    return { message: PASSWORD_CHANGED_SESSIONS_KEPT };
  }

  redirect(`${ROUTES.signIn}?${PASSWORD_RESET_DONE_PARAM}=1`);
}

function asString(value: FormDataEntryValue | null): string | undefined {
  return typeof value === "string" ? value : undefined;
}
