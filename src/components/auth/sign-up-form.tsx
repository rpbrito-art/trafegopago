"use client";

import { useActionState } from "react";

import { signUpAction, type AuthFormState } from "@/app/actions/auth";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/schemas";

const initialState: AuthFormState = {};

/**
 * Formulário de cadastro.
 *
 * A senha nunca é devolvida pelo servidor para repopular o campo; só o e-mail.
 */
export function SignUpForm() {
  const [state, action, pending] = useActionState(signUpAction, initialState);

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">E-mail</span>
        <input
          type="email"
          name="email"
          autoComplete="email"
          required
          defaultValue={state?.email}
          aria-invalid={Boolean(state?.errors?.email)}
          className="rounded border border-neutral-300 px-3 py-2"
        />
        {state?.errors?.email ? (
          <span className="text-xs text-red-700">{state.errors.email}</span>
        ) : null}
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Senha</span>
        <input
          type="password"
          name="password"
          autoComplete="new-password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          aria-invalid={Boolean(state?.errors?.password)}
          className="rounded border border-neutral-300 px-3 py-2"
        />
        <span className="text-xs text-neutral-500">
          Pelo menos {MIN_PASSWORD_LENGTH} caracteres.
        </span>
        {state?.errors?.password ? (
          <span className="text-xs text-red-700">{state.errors.password}</span>
        ) : null}
      </label>

      {state?.message ? (
        <p role="alert" className="text-sm text-red-700">
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Criando conta…" : "Criar conta"}
      </button>
    </form>
  );
}
