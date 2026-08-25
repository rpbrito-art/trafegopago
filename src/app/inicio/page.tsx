import Link from "next/link";

import { NextStep } from "@/components/journey/next-step";
import { ROUTES } from "@/lib/auth/routes";
import { requireUser } from "@/lib/auth/session";
import { pageTitle } from "@/lib/brand";
import { resolveGuidedGrowthJourney } from "@/lib/growth/guided-journey";

export const metadata = {
  title: pageTitle("Seu próximo passo"),
};

/**
 * Nunca pré-renderizar: a página existe em função da sessão de quem a pede.
 */
export const dynamic = "force-dynamic";

/**
 * Entrada autenticada guiada.
 *
 * Primeira superfície de condução do produto — e deliberadamente **não** o App
 * Shell/Hoje definitivo. Ela mostra um passo por vez, derivado do estado real
 * do negócio por regra determinística; nenhum provider de IA participa disso.
 *
 * O guard é `requireUser()`, que verifica o JWT server-side; o redirect do
 * Proxy é apenas a primeira camada.
 */
export default async function InicioPage() {
  await requireUser();

  const step = await resolveGuidedGrowthJourney();

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 p-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">Início</h1>
        <p className="text-sm text-neutral-600">
          O Quoron acompanha onde seu negócio está e indica o que fazer agora.
        </p>
      </div>

      <NextStep step={step} />

      <nav className="flex flex-wrap gap-4 text-sm text-neutral-600">
        <Link href={ROUTES.objective} className="underline">
          Meu objetivo
        </Link>
        <Link href={ROUTES.offers} className="underline">
          Minhas ofertas
        </Link>
        <Link href={ROUTES.account} className="underline">
          Minha conta
        </Link>
      </nav>
    </main>
  );
}
