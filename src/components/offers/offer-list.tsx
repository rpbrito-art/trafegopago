"use client";

import { useActionState, useState } from "react";

import { archiveOfferAction } from "@/app/actions/offers";
import {
  OFFER_TYPE_LABELS,
  descreverPreco,
  type BusinessOffer,
} from "@/lib/offers/offers";

import { OfferForm } from "./offer-form";

/**
 * Ofertas ativas, em linguagem humana.
 *
 * A lista não mostra número de versão, id nem taxonomia interna (mandato §9.3).
 * O versionamento existe embaixo e aparece só como promessa: o que você já
 * informou não se perde.
 */
export function OfferList({
  ofertas,
  podeGerenciar,
}: {
  ofertas: BusinessOffer[];
  podeGerenciar: boolean;
}) {
  const [editando, setEditando] = useState<string | null>(null);

  return (
    <ul className="flex flex-col gap-3">
      {ofertas.map((oferta) => (
        <li
          key={oferta.id}
          className="flex flex-col gap-3 rounded border border-neutral-200 p-4"
        >
          {editando === oferta.id ? (
            <OfferForm oferta={oferta} onCancelar={() => setEditando(null)} />
          ) : (
            <>
              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-semibold">{oferta.name}</h3>
                <p className="text-sm text-neutral-600">
                  {OFFER_TYPE_LABELS[oferta.offerType]} ·{" "}
                  {descreverPreco(oferta)}
                </p>
              </div>

              {oferta.description ? (
                <p className="text-sm text-neutral-700">{oferta.description}</p>
              ) : null}

              {oferta.valueProposition ? (
                <p className="text-sm text-neutral-700">
                  <span className="text-neutral-500">
                    Por que escolhem:{" "}
                  </span>
                  {oferta.valueProposition}
                </p>
              ) : null}

              {podeGerenciar ? (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setEditando(oferta.id)}
                    className="rounded border border-neutral-300 px-3 py-2 text-sm font-medium"
                  >
                    Editar
                  </button>

                  <Arquivar oferta={oferta} />
                </div>
              ) : null}
            </>
          )}
        </li>
      ))}
    </ul>
  );
}

/**
 * Arquivar em duas etapas.
 *
 * A confirmação é inline, e não um diálogo do navegador: o texto precisa dizer
 * o que acontece de verdade — a oferta sai da lista, o histórico fica — e um
 * `confirm()` não permite explicar isso.
 */
function Arquivar({ oferta }: { oferta: BusinessOffer }) {
  const [state, action, pending] = useActionState(archiveOfferAction, undefined);
  const [confirmando, setConfirmando] = useState(false);

  if (!confirmando) {
    return (
      <button
        type="button"
        onClick={() => setConfirmando(true)}
        className="text-sm text-neutral-600 underline"
      >
        Arquivar
      </button>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="offerId" value={oferta.id} />

      <p className="text-sm text-neutral-700">
        Arquivar “{oferta.name}”? Ela sai da sua lista, e o que você informou
        continua guardado.
      </p>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending ? "Arquivando…" : "Sim, arquivar"}
        </button>

        <button
          type="button"
          onClick={() => setConfirmando(false)}
          className="text-sm text-neutral-600 underline"
        >
          Cancelar
        </button>
      </div>

      {state?.message ? (
        <p role="alert" className="text-sm text-red-700">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
