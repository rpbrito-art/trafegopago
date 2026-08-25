import Link from "next/link";

import { ReviewRequestForm } from "@/components/review/review-request-form";
import {
  AVISO_SOMENTE_DECLARADO,
  ReviewResult,
} from "@/components/review/review-result";
import { ROUTES } from "@/lib/auth/routes";
import { requireUser } from "@/lib/auth/session";
import { pageTitle } from "@/lib/brand";
import { getReviewState } from "@/lib/review/review-state";

export const metadata = {
  title: pageTitle("Revisão do seu contexto"),
};

/**
 * Nunca pré-renderizar: a página existe em função da sessão de quem a pede.
 */
export const dynamic = "force-dynamic";

/**
 * Revisão do contexto declarado.
 *
 * **A página não chama o provider.** `getReviewState()` apenas compara o
 * fingerprint do contexto atual com o das revisões existentes; gerar uma nova
 * exige o clique do formulário (mandato §9.1). Renderizar nunca pode gastar
 * dinheiro — nem quando alguém dá refresh, nem quando um prefetch acontece.
 */
export default async function RevisaoPage() {
  await requireUser();

  const state = await getReviewState();

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 p-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">Revisão do seu contexto</h1>
        <p className="text-sm text-neutral-600">
          O Quoron organiza o que você contou e mostra o que ainda falta
          esclarecer.
        </p>
      </div>

      {state.kind === "erro-tecnico" ? (
        <p role="alert" className="text-sm text-red-800">
          Não foi possível carregar sua revisão agora. Nada foi alterado —
          atualize a página em instantes.
        </p>
      ) : null}

      {state.kind === "negocio-indisponivel" ? (
        <p className="text-sm text-amber-900">
          Não conseguimos acessar seu negócio agora. Verifique sua conta antes
          de pedir a revisão.
        </p>
      ) : null}

      {state.kind === "multiplos-negocios" ? (
        <p className="text-sm text-amber-900">
          Sua conta participa de mais de um negócio. Ainda não é possível
          escolher qual deles será revisado.
        </p>
      ) : null}

      {state.kind === "sem-organizacao" || state.kind === "base-incompleta" ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-neutral-700">
            Antes da revisão, complete seu negócio, seu objetivo, suas ofertas e
            o que você está priorizando. É esse contexto que a revisão analisa.
          </p>
          <Link
            href={ROUTES.start}
            className="self-start rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white"
          >
            Ver meu próximo passo
          </Link>
        </div>
      ) : null}

      {state.kind === "pronto" && state.atual ? (
        <ReviewResult
          review={state.atual.review}
          createdAt={state.atual.createdAt}
        />
      ) : null}

      {state.kind === "pronto" && !state.atual ? (
        <div className="flex flex-col gap-4 rounded border border-neutral-200 p-4">
          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold">
              Revisar o que o Quoron entendeu
            </h2>
            <p className="text-sm text-neutral-700">{AVISO_SOMENTE_DECLARADO}</p>
          </div>

          {state.podeRevisar ? (
            <ReviewRequestForm
              temRevisaoDesatualizada={state.temRevisaoDesatualizada}
            />
          ) : (
            <p className="text-sm text-neutral-600">
              Quem administra o negócio pode pedir a revisão.
            </p>
          )}
        </div>
      ) : null}

      {state.kind === "pronto" && state.atual && state.podeRevisar ? (
        <div className="flex flex-col gap-2 border-t border-neutral-200 pt-4">
          <p className="text-sm text-neutral-600">
            Mudou algo no seu negócio? Peça uma nova revisão com as informações
            atuais.
          </p>
          <ReviewRequestForm temRevisaoDesatualizada={false} />
        </div>
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
