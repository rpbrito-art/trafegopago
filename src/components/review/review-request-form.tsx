"use client";

import { useActionState } from "react";

import { requestContextReviewAction } from "@/app/actions/review";

/**
 * O único gesto que pode disparar uma chamada paga nesta rodada.
 *
 * O formulário não envia dado algum — tenant, papel e contexto são resolvidos
 * no servidor. O que ele carrega é a intenção explícita do usuário, que é
 * justamente o que falta quando uma página chama o provider ao renderizar
 * (mandato §9.1).
 */
export function ReviewRequestForm({
  temRevisaoDesatualizada,
}: {
  temRevisaoDesatualizada: boolean;
}) {
  const [state, action, pending] = useActionState(
    requestContextReviewAction,
    undefined,
  );

  return (
    <form action={action} className="flex flex-col gap-3">
      {temRevisaoDesatualizada ? (
        <p className="text-sm text-neutral-700">
          Você mudou alguma informação desde a última revisão. Uma nova revisão
          vai considerar o seu contexto atual.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Revisando…" : "Revisar meu contexto"}
      </button>

      {state?.message ? (
        <p role="alert" className="text-sm text-red-700">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
