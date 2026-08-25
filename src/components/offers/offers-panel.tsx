"use client";

import { useState } from "react";

import type { BusinessOffer } from "@/lib/offers/offers";

import { OfferForm } from "./offer-form";
import { OfferList } from "./offer-list";

/**
 * O que a página `/ofertas` mostra quando o contexto do negócio é inequívoco.
 *
 * Uma ação principal por vez: com catálogo vazio, o que existe na tela é o
 * convite para adicionar a primeira oferta; com ofertas cadastradas, a lista e
 * um botão. O formulário aparece quando a pessoa pede.
 */
export function OffersPanel({
  ofertas,
  podeGerenciar,
  sugestaoLegada,
}: {
  ofertas: BusinessOffer[];
  podeGerenciar: boolean;
  sugestaoLegada: string | null;
}) {
  const [adicionando, setAdicionando] = useState(false);

  if (!podeGerenciar && ofertas.length === 0) {
    return (
      <p className="text-sm text-neutral-700">
        Quem administra o negócio pode cadastrar as ofertas.
      </p>
    );
  }

  if (ofertas.length === 0) {
    return adicionando ? (
      <OfferForm
        sugestao={sugestaoLegada}
        onCancelar={() => setAdicionando(false)}
      />
    ) : (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-neutral-700">
          Quando o Quoron sabe o que você vende, por quanto e por que as pessoas
          escolhem você, as recomendações passam a falar do seu negócio — e não
          de um negócio genérico.
        </p>

        {sugestaoLegada ? (
          <p className="text-sm text-neutral-600">
            Você já nos contou que oferece <strong>{sugestaoLegada}</strong>.
            Vamos começar por aí — você pode ajustar antes de salvar.
          </p>
        ) : null}

        <button
          type="button"
          onClick={() => setAdicionando(true)}
          className="self-start rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white"
        >
          Adicionar uma oferta
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <OfferList ofertas={ofertas} podeGerenciar={podeGerenciar} />

      {podeGerenciar ? (
        adicionando ? (
          <OfferForm onCancelar={() => setAdicionando(false)} />
        ) : (
          <button
            type="button"
            onClick={() => setAdicionando(true)}
            className="self-start rounded border border-neutral-300 px-3 py-2 text-sm font-medium"
          >
            Adicionar outra oferta
          </button>
        )
      ) : null}
    </div>
  );
}
