"use client";

import { useActionState } from "react";

import { setObjectiveFocusAction } from "@/app/actions/focus";
import type { BusinessOffer } from "@/lib/offers/offers";

/**
 * "O que você quer priorizar agora?"
 *
 * Uma pergunta de negócio, com as ofertas pelo nome que o usuário deu e a
 * opção de priorizar o negócio inteiro. Nenhum `focus_type`, id ou termo de
 * banco aparece: as chaves internas vivem apenas no `value` dos rádios.
 *
 * Com uma única oferta, ela vem pré-selecionada — mas **nada é gravado sem o
 * usuário confirmar**. Persistir sozinho transformaria uma sugestão do sistema
 * numa decisão estratégica que ninguém tomou (mandato §4).
 */
export function FocusForm({
  objectiveId,
  ofertas,
  focoAtual,
}: {
  objectiveId: string;
  /** Somente ofertas ativas: arquivada não pode voltar a ser foco. */
  ofertas: BusinessOffer[];
  /** `"BUSINESS"`, o id da oferta priorizada, ou `null` se ainda não há foco. */
  focoAtual: string | null;
}) {
  const [state, action, pending] = useActionState(
    setObjectiveFocusAction,
    undefined,
  );

  // Pré-seleção: o foco atual, quando existe; senão, a oferta única, quando é
  // a única. Com várias ofertas e nenhum foco, nada vem marcado — a escolha é
  // do usuário.
  const preSelecionado =
    focoAtual ?? (ofertas.length === 1 ? ofertas[0].id : null);

  return (
    <form action={action} className="flex flex-col gap-6" noValidate>
      <input type="hidden" name="objectiveId" value={objectiveId} />

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">
          O que você quer priorizar agora?
        </legend>

        <div className="flex flex-col gap-1">
          {ofertas.map((oferta) => (
            <label key={oferta.id} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="focus"
                value={oferta.id}
                defaultChecked={preSelecionado === oferta.id}
              />
              {oferta.name}
            </label>
          ))}

          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="focus"
              value="BUSINESS"
              defaultChecked={preSelecionado === "BUSINESS"}
            />
            Meu negócio como um todo
          </label>
        </div>

        {state?.erro ? (
          <p role="alert" className="text-sm text-red-700">
            {state.erro}
          </p>
        ) : null}
      </fieldset>

      {state?.message ? (
        <p role="alert" className="text-sm text-red-700">
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Salvando…" : focoAtual ? "Salvar prioridade" : "Confirmar prioridade"}
      </button>

      <p className="text-sm text-neutral-500">
        Você pode mudar quando o negócio mudar. Guardamos o que você priorizava
        antes — nada do seu histórico é apagado.
      </p>
    </form>
  );
}
