import Link from "next/link";

import { ROUTES } from "@/lib/auth/routes";

export const APP_NAME = "Tráfego Pago";

export const BOOTSTRAP_STAGE = "Rodada 001B — Auth real";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">{APP_NAME}</h1>
      <p className="text-sm text-neutral-600">{BOOTSTRAP_STAGE}</p>
      <p className="text-sm text-neutral-600">
        Identidade e sessão já são reais. Nenhuma funcionalidade de domínio —
        organizações, integrações, campanhas ou leads — foi implementada.
      </p>

      <div className="flex gap-3">
        <Link
          href={ROUTES.signIn}
          className="rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white"
        >
          Entrar
        </Link>
        <Link
          href={ROUTES.signUp}
          className="rounded border border-neutral-300 px-3 py-2 text-sm font-medium"
        >
          Criar conta
        </Link>
      </div>
    </main>
  );
}
