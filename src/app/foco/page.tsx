import Link from "next/link";

import { FocusForm } from "@/components/growth/focus-form";
import { ROUTES } from "@/lib/auth/routes";
import { requireUser } from "@/lib/auth/session";
import { pageTitle } from "@/lib/brand";
import { getObjectiveState } from "@/lib/growth/objective-state";
import { getOffersState } from "@/lib/offers/offer-catalog";

export const metadata = {
  title: pageTitle("Sua prioridade"),
};

/**
 * Nunca pré-renderizar: a página existe em função da sessão de quem a pede.
 */
export const dynamic = "force-dynamic";

/**
 * O que o negócio está priorizando agora.
 *
 * Uma oferta específica ou o negócio como um todo. A tela mostra apenas ofertas
 * ativas — uma oferta arquivada não pode voltar a ser foco — e quem decide é o
 * usuário: mesmo com uma única oferta, nada é gravado sem confirmação.
 *
 * O guard é `requireUser()`; quem pode **alterar** é decidido pela RPC, não por
 * esta tela.
 */
export default async function FocoPage() {
  await requireUser();

  const [objetivo, ofertas] = await Promise.all([
    getObjectiveState(),
    getOffersState(),
  ]);

  const indisponivel =
    objetivo.kind === "erro-tecnico" || ofertas.kind === "erro-tecnico";

  const ambiguo =
    objetivo.kind === "multiplos-negocios" ||
    ofertas.kind === "multiplos-negocios";

  const podeEscolher =
    objetivo.kind === "definido" && ofertas.kind === "pronto";

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 p-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">Sua prioridade</h1>
        <p className="text-sm text-neutral-600">
          Escolher um foco é o que permite comparar depois o que funcionou.
        </p>
      </div>

      {indisponivel ? (
        <p role="alert" className="text-sm text-red-800">
          Não foi possível carregar seu negócio agora. Nada foi alterado —
          atualize a página em instantes.
        </p>
      ) : null}

      {ambiguo ? (
        <p className="text-sm text-amber-900">
          Sua conta participa de mais de um negócio. Ainda não é possível
          escolher qual deles recebe a prioridade.
        </p>
      ) : null}

      {!indisponivel && !ambiguo && objetivo.kind === "sem-objetivo" ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-neutral-700">
            Defina primeiro o que você quer conseguir. A prioridade vem depois.
          </p>
          <Link
            href={ROUTES.objective}
            className="self-start rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white"
          >
            Definir meu objetivo
          </Link>
        </div>
      ) : null}

      {podeEscolher && ofertas.kind === "pronto" && ofertas.ofertas.length === 0 ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-neutral-700">
            Cadastre pelo menos uma oferta antes de escolher a prioridade.
          </p>
          <Link
            href={ROUTES.offers}
            className="self-start rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white"
          >
            Adicionar uma oferta
          </Link>
        </div>
      ) : null}

      {podeEscolher &&
      objetivo.kind === "definido" &&
      ofertas.kind === "pronto" &&
      ofertas.ofertas.length > 0 ? (
        objetivo.podeAlterar ? (
          <FocusForm
            objectiveId={objetivo.objetivo.id}
            ofertas={ofertas.ofertas}
            focoAtual={
              objetivo.objetivo.focusType === "BUSINESS"
                ? "BUSINESS"
                : objetivo.objetivo.focusOfferId
            }
          />
        ) : (
          <FocoSomenteLeitura
            focusType={objetivo.objetivo.focusType}
            nomeDaOferta={
              ofertas.ofertas.find(
                (oferta) => oferta.id === objetivo.objetivo.focusOfferId,
              )?.name ?? null
            }
          />
        )
      ) : null}

      <Link
        href={ROUTES.start}
        className="self-start text-sm text-neutral-600 underline"
      >
        Voltar para o início
      </Link>
    </main>
  );
}

/**
 * Quem não administra vê a prioridade atual, mas não o formulário. Esconder não
 * é autorização — a RPC recusa de qualquer forma.
 */
function FocoSomenteLeitura({
  focusType,
  nomeDaOferta,
}: {
  focusType: "BUSINESS" | "OFFER" | null;
  nomeDaOferta: string | null;
}) {
  return (
    <div className="flex flex-col gap-2 text-sm text-neutral-700">
      {focusType === "BUSINESS" ? (
        <p>
          A prioridade atual é <strong>o negócio como um todo</strong>.
        </p>
      ) : null}

      {focusType === "OFFER" && nomeDaOferta ? (
        <p>
          A prioridade atual é <strong>{nomeDaOferta}</strong>.
        </p>
      ) : null}

      {focusType === "OFFER" && !nomeDaOferta ? (
        <p>A oferta priorizada não está mais na lista ativa.</p>
      ) : null}

      {focusType === null ? <p>Nenhuma prioridade foi definida ainda.</p> : null}

      <p className="text-neutral-600">
        Quem administra o negócio pode definir ou alterar a prioridade.
      </p>
    </div>
  );
}
