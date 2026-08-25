import type { ReactNode } from "react";
import Link from "next/link";

import { ROUTES } from "@/lib/auth/routes";
import type { ObjectiveState } from "@/lib/growth/objective-state";
import { AVISO_DE_MENSURACAO, descreverObjetivo } from "@/lib/growth/objectives";

/**
 * Objetivo atual, em linguagem de negócio.
 *
 * Nenhuma taxonomia interna, UUID ou termo de plataforma publicitária aparece
 * aqui: quem opera o produto não precisa aprender o vocabulário do Ads Manager
 * para dizer o que quer conseguir (`GROWTH_INTELLIGENCE_CANONICAL.md` §2.1).
 *
 * Ausência de objetivo é **estado válido**, não erro — e não bloqueia conta nem
 * conexão. O que ela faz é orientar o próximo passo (mandato 004B §8.2).
 */
export function ObjectiveSection({ state }: { state: ObjectiveState }) {
  if (state.kind === "erro-tecnico") {
    return (
      <Bloco tom="erro" titulo="Não foi possível carregar seu objetivo">
        <p className="text-sm text-red-800">
          Isto é um problema nosso, não da sua conta. Nada foi alterado —
          atualize a página em instantes.
        </p>
      </Bloco>
    );
  }

  if (state.kind === "sem-organizacao") {
    return (
      <Bloco titulo="Comece pelo seu negócio">
        <p className="text-sm text-neutral-600">
          Cadastre seu negócio primeiro. Depois disso você define o objetivo
          atual.
        </p>
        <Link
          href={ROUTES.account}
          className="self-start rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white"
        >
          Criar meu negócio
        </Link>
      </Bloco>
    );
  }

  if (state.kind === "sem-objetivo") {
    return (
      <Bloco titulo="Qual é o seu objetivo agora?">
        <p className="text-sm text-neutral-700">
          Dizer o que você quer conseguir agora é o que orienta o conteúdo, a
          divulgação, a mensuração e as próximas recomendações.
        </p>

        {state.podeDefinir ? (
          <Link
            href={ROUTES.objective}
            className="self-start rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white"
          >
            Definir meu objetivo
          </Link>
        ) : (
          <p className="text-sm text-neutral-600">
            Quem administra o negócio pode definir o objetivo.
          </p>
        )}
      </Bloco>
    );
  }

  const { objetivo, destino, sucesso } = descreverObjetivo(state.objetivo);

  return (
    <Bloco tom="ok" titulo="Seu objetivo atual">
      <dl className="flex flex-col gap-2 text-sm">
        <Linha rotulo="O que você quer conseguir" valor={objetivo} />
        <Linha rotulo="Para onde leva a pessoa" valor={destino} />
        <Linha rotulo="O que conta como sucesso" valor={sucesso} />
        <Linha
          rotulo="Definido em"
          valor={formatarData(state.objetivo.createdAt)}
        />
      </dl>

      <p className="text-sm text-neutral-600">{AVISO_DE_MENSURACAO}</p>

      {state.podeAlterar ? (
        <Link
          href={ROUTES.objective}
          className="self-start rounded border border-neutral-300 px-3 py-2 text-sm font-medium"
        >
          Alterar objetivo
        </Link>
      ) : null}
    </Bloco>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-neutral-500">{rotulo}</dt>
      <dd className="text-right font-medium">{valor}</dd>
    </div>
  );
}

function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR");
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
