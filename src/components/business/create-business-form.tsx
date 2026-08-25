"use client";

import { useActionState } from "react";

import {
  createInitialBusinessAction,
  type BusinessFormState,
} from "@/app/actions/business";

const initialState: BusinessFormState = {};

const inputClass = "rounded border border-neutral-300 px-3 py-2";

/**
 * Formulário do negócio inicial.
 *
 * `pending` do `useActionState` desabilita o botão durante o envio — proteção
 * de UX, não de integridade. A garantia contra dois tenants é o advisory lock
 * na função SQL; este botão só evita o clique duplo mais comum.
 */
export function CreateBusinessForm() {
  const [state, action, pending] = useActionState(
    createInitialBusinessAction,
    initialState,
  );

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <Field
        name="organizationName"
        label="Nome da empresa"
        maxLength={160}
        required
        state={state}
      />
      <Field
        name="segment"
        label="Segmento"
        hint="Ex.: clínica odontológica, restaurante, loja de roupas."
        maxLength={120}
        required
        state={state}
      />
      <Field
        name="locationSummary"
        label="Cidade ou região"
        maxLength={160}
        required
        state={state}
      />
      <Field
        name="primaryOffer"
        label="Produto, serviço ou oferta principal"
        maxLength={280}
        required
        multiline
        state={state}
      />
      <p className="text-sm text-neutral-600">
        Só isso por enquanto. Depois de criar o negócio, você define o objetivo
        atual — e o restante do contexto é completado aos poucos, conforme fizer
        diferença.
      </p>

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
        {pending ? "Criando…" : "Criar meu negócio"}
      </button>
    </form>
  );
}

type FieldProps = {
  name: keyof NonNullable<BusinessFormState["errors"]>;
  label: string;
  hint?: string;
  maxLength: number;
  required?: boolean;
  multiline?: boolean;
  inputMode?: "decimal";
  state: BusinessFormState;
};

function Field({
  name,
  label,
  hint,
  maxLength,
  required,
  multiline,
  inputMode,
  state,
}: FieldProps) {
  const error = state?.errors?.[name];
  const defaultValue = state?.values?.[name] ?? "";

  const shared = {
    name,
    id: name,
    required,
    maxLength,
    defaultValue,
    "aria-invalid": Boolean(error),
    className: inputClass,
  };

  return (
    <label htmlFor={name} className="flex flex-col gap-1 text-sm">
      <span className="font-medium">{label}</span>
      {multiline ? (
        <textarea {...shared} rows={2} />
      ) : (
        <input {...shared} type="text" inputMode={inputMode} />
      )}
      {hint ? <span className="text-xs text-neutral-500">{hint}</span> : null}
      {error ? <span className="text-xs text-red-700">{error}</span> : null}
    </label>
  );
}
