import type { ReactNode } from "react";
import Link from "next/link";

import { ROUTES } from "@/lib/auth/routes";
import type { OffersState } from "@/lib/offers/offer-catalog";
import { OFFER_TYPE_LABELS, descreverPreco } from "@/lib/offers/offers";

/**
 * Resumo das ofertas na conta, com o cadastro morando em `/ofertas`.
 *
 * Ausência de oferta é **estado válido**, não erro — e não bloqueia conta,
 * objetivo nem conexão. O que ela faz é orientar o próximo passo.
 */
export function OffersSection({ state }: { state: OffersState }) {
  if (state.kind === "erro-tecnico") {
    return (
      <Bloco tom="erro" titulo="Não foi possível carregar suas ofertas">
        <p className="text-sm text-red-800">
          Isto é um problema nosso, não da sua conta. Nada foi alterado —
          atualize a página em instantes.
        </p>
      </Bloco>
    );
  }

  // Sem organização, a conta já mostra o convite para criar o negócio. Repetir
  // aqui competiria com a ação principal da tela.
  if (state.kind === "sem-organizacao") return null;

  if (state.kind === "negocio-indisponivel") {
    return (
      <Bloco tom="atencao" titulo="Suas ofertas precisam do seu negócio">
        <p className="text-sm text-amber-900">
          Não conseguimos acessar seu negócio agora. Verifique sua conta antes
          de cadastrar ofertas.
        </p>
      </Bloco>
    );
  }

  if (state.kind === "multiplos-negocios") {
    return (
      <Bloco tom="atencao" titulo="Sua conta tem mais de um negócio">
        <p className="text-sm text-amber-900">
          Ainda não é possível escolher qual negócio recebe as ofertas. Assim
          que a escolha existir, cada um terá as suas.
        </p>
      </Bloco>
    );
  }

  if (state.ofertas.length === 0) {
    return (
      <Bloco titulo="O que você oferece?">
        <p className="text-sm text-neutral-700">
          Contar o que você vende, por quanto e por que escolhem você é o que
          permite recomendar conteúdo e divulgação para o seu negócio, e não
          para um negócio genérico.
        </p>

        {state.podeGerenciar ? (
          <Link
            href={ROUTES.offers}
            className="self-start rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white"
          >
            Adicionar uma oferta
          </Link>
        ) : (
          <p className="text-sm text-neutral-600">
            Quem administra o negócio pode cadastrar as ofertas.
          </p>
        )}
      </Bloco>
    );
  }

  return (
    <Bloco tom="ok" titulo="Suas ofertas">
      <ul className="flex flex-col gap-2 text-sm">
        {state.ofertas.map((oferta) => (
          <li key={oferta.id} className="flex justify-between gap-4">
            <span className="font-medium">{oferta.name}</span>
            <span className="text-right text-neutral-600">
              {OFFER_TYPE_LABELS[oferta.offerType]} · {descreverPreco(oferta)}
            </span>
          </li>
        ))}
      </ul>

      <Link
        href={ROUTES.offers}
        className="self-start rounded border border-neutral-300 px-3 py-2 text-sm font-medium"
      >
        {state.podeGerenciar ? "Gerenciar ofertas" : "Ver ofertas"}
      </Link>
    </Bloco>
  );
}

function Bloco({
  titulo,
  children,
  tom = "neutro",
}: {
  titulo: string;
  children: ReactNode;
  tom?: "neutro" | "ok" | "atencao" | "erro";
}) {
  const cores = {
    neutro: "border-neutral-200",
    ok: "border-emerald-300 bg-emerald-50",
    atencao: "border-amber-300 bg-amber-50",
    erro: "border-red-300 bg-red-50",
  } as const;

  return (
    <section className={`flex flex-col gap-3 rounded border p-4 ${cores[tom]}`}>
      <h2 className="text-sm font-semibold">{titulo}</h2>
      {children}
    </section>
  );
}
