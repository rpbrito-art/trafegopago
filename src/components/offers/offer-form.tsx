"use client";

import { useActionState, useState } from "react";

import { saveOfferAction } from "@/app/actions/offers";
import {
  MAX_OFFER_DESCRIPTION_LENGTH,
  MAX_OFFER_NAME_LENGTH,
  MAX_OFFER_VALUE_PROPOSITION_LENGTH,
  OFFER_TYPES,
  OFFER_TYPE_LABELS,
  PRICE_MODES,
  PRICE_MODE_AMOUNTS,
  PRICE_MODE_LABELS,
  valorParaCampo,
  type BusinessOffer,
  type PriceMode,
} from "@/lib/offers/offers";

/**
 * Cinco perguntas, em português simples.
 *
 * Nenhum termo de banco, taxonomia ou id aparece: as chaves internas existem
 * apenas no `value` dos controles, e o que a pessoa lê são os rótulos
 * (`GROWTH_INTELLIGENCE_CANONICAL.md` §2.1).
 *
 * Os campos de dinheiro só aparecem quando o modo escolhido pede valor —
 * perguntar "quanto custa" a quem acabou de dizer "sob orçamento" seria
 * exatamente o formulário longo que a Lei da Simplicidade Guiada rejeita.
 */
export function OfferForm({
  oferta,
  sugestao,
  onCancelar,
}: {
  /** Presente na edição. Ausente, o formulário cria uma oferta nova. */
  oferta?: BusinessOffer;
  /**
   * Texto legado de `business_profiles.primary_offer`, usado como prefill.
   *
   * Sugestão editável: só vira oferta se o usuário salvar (mandato §8).
   */
  sugestao?: string | null;
  onCancelar?: () => void;
}) {
  const [state, action, pending] = useActionState(saveOfferAction, undefined);

  const [priceMode, setPriceMode] = useState<PriceMode>(
    oferta?.priceMode ?? "FIXED",
  );

  const forma = PRICE_MODE_AMOUNTS[priceMode];

  return (
    <form action={action} className="flex flex-col gap-6" noValidate>
      {oferta ? <input type="hidden" name="offerId" value={oferta.id} /> : null}

      <Campo
        name="name"
        label="O que você oferece?"
        ajuda="O nome que seu cliente reconhece."
        defaultValue={oferta?.name ?? sugestao ?? ""}
        maxLength={MAX_OFFER_NAME_LENGTH}
        erro={state?.erros?.name}
      />

      <Escolha
        legenda="É um produto, serviço ou pacote?"
        name="offerType"
        opcoes={OFFER_TYPES.map((valor) => ({
          valor,
          rotulo: OFFER_TYPE_LABELS[valor],
        }))}
        selecionado={oferta?.offerType ?? "SERVICE"}
        erro={state?.erros?.offerType}
      />

      <CampoLongo
        name="description"
        label="Como você descreveria essa oferta?"
        ajuda="Opcional. Em uma ou duas frases."
        defaultValue={oferta?.description ?? ""}
        maxLength={MAX_OFFER_DESCRIPTION_LENGTH}
        erro={state?.erros?.description}
      />

      <CampoLongo
        name="valueProposition"
        label="Por que um cliente escolheria essa oferta?"
        ajuda="Opcional. O que ela tem que as outras não têm."
        defaultValue={oferta?.valueProposition ?? ""}
        maxLength={MAX_OFFER_VALUE_PROPOSITION_LENGTH}
        erro={state?.erros?.valueProposition}
      />

      <Escolha
        legenda="Como você cobra?"
        name="priceMode"
        opcoes={PRICE_MODES.map((valor) => ({
          valor,
          rotulo: PRICE_MODE_LABELS[valor],
        }))}
        selecionado={priceMode}
        onChange={(valor) => setPriceMode(valor as PriceMode)}
        erro={state?.erros?.priceMode}
      />

      {forma !== "nenhum" ? (
        <div className="flex flex-col gap-4">
          <Campo
            name="priceMin"
            label={forma === "faixa" ? "De quanto" : "Quanto custa"}
            ajuda="Use vírgula para os centavos, como 1.250,00."
            defaultValue={valorParaCampo(oferta?.priceMinMinor ?? null)}
            inputMode="decimal"
            erro={state?.erros?.priceMin}
          />

          {forma === "faixa" ? (
            <Campo
              name="priceMax"
              label="Até quanto"
              ajuda="O valor mais alto que você costuma cobrar."
              defaultValue={valorParaCampo(oferta?.priceMaxMinor ?? null)}
              inputMode="decimal"
              erro={state?.erros?.priceMax}
            />
          ) : null}
        </div>
      ) : null}

      {state?.message ? (
        <p role="alert" className="text-sm text-red-700">
          {state.message}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending ? "Salvando…" : oferta ? "Salvar alterações" : "Salvar oferta"}
        </button>

        {onCancelar ? (
          <button
            type="button"
            onClick={onCancelar}
            className="text-sm text-neutral-600 underline"
          >
            Cancelar
          </button>
        ) : null}
      </div>

      {oferta ? (
        <p className="text-sm text-neutral-500">
          Ao salvar, guardamos como sua oferta era antes. Nada do que você já
          informou é apagado.
        </p>
      ) : null}
    </form>
  );
}

function Campo({
  name,
  label,
  ajuda,
  defaultValue,
  maxLength,
  inputMode,
  erro,
}: {
  name: string;
  label: string;
  ajuda?: string;
  defaultValue: string;
  maxLength?: number;
  inputMode?: "decimal";
  erro?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium">{label}</span>
      {ajuda ? <span className="text-neutral-600">{ajuda}</span> : null}
      <input
        type="text"
        name={name}
        defaultValue={defaultValue}
        maxLength={maxLength}
        inputMode={inputMode}
        className="rounded border border-neutral-300 px-3 py-2"
      />
      {erro ? (
        <span role="alert" className="text-red-700">
          {erro}
        </span>
      ) : null}
    </label>
  );
}

function CampoLongo({
  name,
  label,
  ajuda,
  defaultValue,
  maxLength,
  erro,
}: {
  name: string;
  label: string;
  ajuda: string;
  defaultValue: string;
  maxLength: number;
  erro?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium">{label}</span>
      <span className="text-neutral-600">{ajuda}</span>
      <textarea
        name={name}
        defaultValue={defaultValue}
        maxLength={maxLength}
        rows={3}
        className="rounded border border-neutral-300 px-3 py-2"
      />
      {erro ? (
        <span role="alert" className="text-red-700">
          {erro}
        </span>
      ) : null}
    </label>
  );
}

function Escolha({
  legenda,
  name,
  opcoes,
  selecionado,
  onChange,
  erro,
}: {
  legenda: string;
  name: string;
  opcoes: { valor: string; rotulo: string }[];
  selecionado?: string;
  onChange?: (valor: string) => void;
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
              defaultChecked={onChange ? undefined : selecionado === opcao.valor}
              checked={onChange ? selecionado === opcao.valor : undefined}
              onChange={onChange ? () => onChange(opcao.valor) : undefined}
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
