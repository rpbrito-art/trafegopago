"use client";

import { useActionState } from "react";

import {
  requestPasswordResetAction,
  type PasswordResetRequestState,
} from "@/app/actions/auth";
import { PASSWORD_RESET_REQUESTED } from "@/lib/auth/errors";

const initialState: PasswordResetRequestState = {};

/**
 * Formulário de pedido de recuperação.
 *
 * Um campo só. Depois de um pedido aceito o formulário some e dá lugar à
 * mensagem neutra: manter o campo visível convidaria a repetir o envio para
 * comparar respostas, que é a forma mais direta de sondar quais e-mails
 * existem.
 */
export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(
    requestPasswordResetAction,
    initialState,
  );

  if (state?.requested) {
    return (
      <p
        role="status"
        className="rounded border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700"
      >
        {PASSWORD_RESET_REQUESTED}
      </p>
    );
  }

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
        {pending ? "Enviando…" : "Enviar instruções"}
      </button>
    </form>
  );
}
