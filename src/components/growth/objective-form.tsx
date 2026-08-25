"use client";

import { useActionState } from "react";

import { setGrowthObjectiveAction } from "@/app/actions/growth";
import {
  DESTINATION_LABELS,
  DESTINATION_TYPES,
  OBJECTIVE_LABELS,
  OBJECTIVE_TYPES,
  SUCCESS_EVENT_LABELS,
  SUCCESS_EVENT_TYPES,
  type GrowthObjective,
} from "@/lib/growth/objectives";

/**
 * Três perguntas, em português simples.
 *
 * O formulário não expõe campaign objective, pixel, event id, ad set,
 * placement, token ou qualquer termo de API (mandato 004B §8.1). As chaves das
 * taxonomias existem apenas no `value` dos rádios — o que a pessoa lê são os
 * rótulos.
 */
export function ObjectiveForm({ atual }: { atual?: GrowthObjective }) {
  const [state, action, pending] = useActionState(
    setGrowthObjectiveAction,
    undefined,
  );

  return (
    <form action={action} className="flex flex-col gap-6" noValidate>
      <Escolha
        legenda="O que você quer conseguir agora?"
        name="objectiveType"
        opcoes={OBJECTIVE_TYPES.map((valor) => ({
          valor,
          rotulo: OBJECTIVE_LABELS[valor],
        }))}
        selecionado={atual?.objectiveType}
        erro={state?.erros?.objetivo}
      />

      <Detalhe
        name="objectiveDetail"
        label="Se escolheu “Outro objetivo”, conte qual"
        defaultValue={atual?.objectiveDetail ?? ""}
      />

      <Escolha
        legenda="Para onde você quer levar a pessoa?"
        name="destinationType"
        opcoes={DESTINATION_TYPES.map((valor) => ({
          valor,
          rotulo: DESTINATION_LABELS[valor],
        }))}
        selecionado={atual?.destinationType}
        erro={state?.erros?.destino}
      />

      <Escolha
        legenda="Qual ação significa sucesso?"
        name="successEventType"
        opcoes={SUCCESS_EVENT_TYPES.map((valor) => ({
          valor,
          rotulo: SUCCESS_EVENT_LABELS[valor],
        }))}
        selecionado={atual?.successEventType}
        erro={state?.erros?.sucesso}
      />

      <Detalhe
        name="successEventDetail"
        label="Se escolheu “Outra ação”, conte qual"
        defaultValue={atual?.successEventDetail ?? ""}
      />

      {state?.erros?.detalhe ? (
        <p role="alert" className="text-sm text-red-700">
          {state.erros.detalhe}
        </p>
      ) : null}

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
        {pending ? "Salvando…" : atual ? "Salvar objetivo" : "Definir objetivo"}
      </button>
    </form>
  );
}

function Escolha({
  legenda,
  name,
  opcoes,
  selecionado,
  erro,
}: {
  legenda: string;
  name: string;
  opcoes: { valor: string; rotulo: string }[];
  selecionado?: string;
  erro?: string;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium">{legenda}</legend>

      <div className="flex flex-col gap-1">
        {opcoes.map((opcao) => (
          <label key={opcao.valor} className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name={name}
              value={opcao.valor}
              defaultChecked={selecionado === opcao.valor}
            />
            {opcao.rotulo}
          </label>
        ))}
      </div>

      {erro ? (
        <p role="alert" className="text-sm text-red-700">
          {erro}
        </p>
      ) : null}
    </fieldset>
  );
}

function Detalhe({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-neutral-600">{label}</span>
      <input
        type="text"
        name={name}
        maxLength={280}
        defaultValue={defaultValue}
        className="rounded border border-neutral-300 px-3 py-2"
      />
    </label>
  );
}
