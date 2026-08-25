import Link from "next/link";

import { ObjectiveForm } from "@/components/growth/objective-form";
import { ROUTES } from "@/lib/auth/routes";
import { requireUser } from "@/lib/auth/session";
import { pageTitle } from "@/lib/brand";
import { getObjectiveState } from "@/lib/growth/objective-state";
import { AVISO_DE_MENSURACAO } from "@/lib/growth/objectives";

export const metadata = {
  title: pageTitle("Seu objetivo"),
};

/**
 * Nunca pré-renderizar: a página existe em função da sessão de quem a pede.
 */
export const dynamic = "force-dynamic";

/**
 * Objetivo atual do negócio.
 *
 * O guard é `requireUser()`, que verifica o JWT server-side; o redirect do
 * Proxy é apenas a primeira camada. O que a página mostra vem de
 * `getObjectiveState()`, que lê sob RLS — e quem pode **alterar** é decidido
 * pela RPC, não por esta tela.
 */
export default async function ObjetivoPage() {
  await requireUser();

  const state = await getObjectiveState();

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 p-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">Seu objetivo</h1>
        <p className="text-sm text-neutral-600">
          Três perguntas curtas. Elas orientam o que o Quoron vai recomendar
          daqui em diante.
        </p>
      </div>

      {state.kind === "erro-tecnico" ? (
        <p role="alert" className="text-sm text-red-800">
          Não foi possível carregar seu objetivo agora. Nada foi alterado —
          atualize a página em instantes.
        </p>
      ) : null}

      {state.kind === "sem-organizacao" ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-neutral-700">
            Cadastre seu negócio primeiro. Depois disso você define o objetivo.
          </p>
          <Link
            href={ROUTES.account}
            className="self-start rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white"
          >
            Ir para meu negócio
          </Link>
        </div>
      ) : null}

      {state.kind === "sem-objetivo" || state.kind === "definido" ? (
        <>
          {/* Quem não administra vê o estado, mas não o formulário. Esconder
              não é autorização — a RPC recusa de qualquer forma. */}
          {(state.kind === "definido" ? state.podeAlterar : state.podeDefinir) ? (
            <ObjectiveForm
              atual={state.kind === "definido" ? state.objetivo : undefined}
            />
          ) : (
            <p className="text-sm text-neutral-700">
              Quem administra o negócio pode definir ou alterar o objetivo.
            </p>
          )}

          <p className="text-sm text-neutral-600">{AVISO_DE_MENSURACAO}</p>

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
