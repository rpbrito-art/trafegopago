"use client";

import { useActionState } from "react";

import { resetPasswordAction, type NewPasswordState } from "@/app/actions/auth";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/schemas";

const initialState: NewPasswordState = {};

/**
 * Formulário de nova senha.
 *
 * Nenhum campo tem `defaultValue`: uma senha rejeitada não volta para a tela,
 * nem mesmo para conveniência de correção. Quem decide se a senha serve é o
 * Server Action; o `minLength` aqui é só o aviso antecipado do navegador.
 */
export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(
    resetPasswordAction,
    initialState,
  );

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Nova senha</span>
        <input
          type="password"
          name="password"
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          required
          aria-invalid={Boolean(state?.errors?.password)}
          className="rounded border border-neutral-300 px-3 py-2"
        />
        {state?.errors?.password ? (
          <span className="text-xs text-red-700">{state.errors.password}</span>
        ) : (
          <span className="text-xs text-neutral-500">
            Pelo menos {MIN_PASSWORD_LENGTH} caracteres.
          </span>
        )}
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Repita a nova senha</span>
        <input
          type="password"
          name="passwordConfirmation"
          autoComplete="new-password"
          required
          aria-invalid={Boolean(state?.errors?.passwordConfirmation)}
          className="rounded border border-neutral-300 px-3 py-2"
        />
        {state?.errors?.passwordConfirmation ? (
          <span className="text-xs text-red-700">
            {state.errors.passwordConfirmation}
          </span>
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
        {pending ? "Salvando…" : "Salvar nova senha"}
      </button>
    </form>
  );
}
