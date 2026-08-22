"use client";

import { useActionState } from "react";

import { signInAction, type AuthFormState } from "@/app/actions/auth";

const initialState: AuthFormState = {};

/**
 * Formulário de login.
 *
 * A validação exibida aqui é conveniência; a que decide é a do Server Action.
 * `next` viaja em campo oculto e é reavaliado contra a allowlist no servidor —
 * o valor que chega do cliente nunca é usado como destino direto.
 */
export function SignInForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(signInAction, initialState);

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="next" value={next} />

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
          autoComplete="current-password"
          required
          aria-invalid={Boolean(state?.errors?.password)}
          className="rounded border border-neutral-300 px-3 py-2"
        />
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
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
