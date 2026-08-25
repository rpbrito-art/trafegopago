import Link from "next/link";

import { OffersPanel } from "@/components/offers/offers-panel";
import { ROUTES } from "@/lib/auth/routes";
import { requireUser } from "@/lib/auth/session";
import { pageTitle } from "@/lib/brand";
import { getOffersState } from "@/lib/offers/offer-catalog";

export const metadata = {
  title: pageTitle("Suas ofertas"),
};

/**
 * Nunca pré-renderizar: a página existe em função da sessão de quem a pede.
 */
export const dynamic = "force-dynamic";

/**
 * O que o negócio oferece.
 *
 * O guard é `requireUser()`, que verifica o JWT server-side; o redirect do
 * Proxy é apenas a primeira camada. O que a página mostra vem de
 * `getOffersState()`, que lê sob RLS — e quem pode **alterar** é decidido pelas
 * RPCs, não por esta tela.
 */
export default async function OfertasPage() {
  await requireUser();

  const state = await getOffersState();

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 p-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">Suas ofertas</h1>
        <p className="text-sm text-neutral-600">
          O que você vende, por quanto e por que as pessoas escolhem você.
        </p>
      </div>

      {state.kind === "erro-tecnico" ? (
        <p role="alert" className="text-sm text-red-800">
          Não foi possível carregar suas ofertas agora. Nada foi alterado —
          atualize a página em instantes.
        </p>
      ) : null}

      {state.kind === "negocio-indisponivel" ? (
        <p className="text-sm text-amber-900">
          Não conseguimos acessar seu negócio agora. Verifique sua conta antes
          de cadastrar ofertas.
        </p>
      ) : null}

      {state.kind === "multiplos-negocios" ? (
        <p className="text-sm text-amber-900">
          Sua conta participa de mais de um negócio. Ainda não é possível
          escolher qual deles recebe as ofertas.
        </p>
      ) : null}

      {state.kind === "sem-organizacao" ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-neutral-700">
            Cadastre seu negócio primeiro. Depois disso você conta o que ele
            oferece.
          </p>
          <Link
            href={ROUTES.account}
            className="self-start rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white"
          >
            Ir para meu negócio
          </Link>
        </div>
      ) : null}

      {state.kind === "pronto" ? (
        <>
          <OffersPanel
            ofertas={state.ofertas}
            podeGerenciar={state.podeGerenciar}
            sugestaoLegada={state.sugestaoLegada}
          />

          <Link
            href={ROUTES.account}
            className="self-start text-sm text-neutral-600 underline"
          >
            Voltar para minha conta
          </Link>
        </>
      ) : null}
    </main>
  );
}
