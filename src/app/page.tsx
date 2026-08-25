import Link from "next/link";

import { ROUTES } from "@/lib/auth/routes";
import { APP_NAME } from "@/lib/brand";

/**
 * Home pública.
 *
 * Duas coisas que ela deliberadamente **não** faz: exibir estágio técnico de
 * rodada — `Rodada 001B — Auth real` era informação de quem constrói, não de
 * quem contrata — e prometer capacidade que ainda não existe. O texto abaixo
 * descreve o propósito do produto sem afirmar que campanhas, importação de
 * conteúdo ou recomendações automáticas já estão disponíveis
 * (`GROWTH_INTELLIGENCE_CANONICAL.md` §2.2: esconder complexidade, nunca
 * esconder o que ainda não se pode entregar).
 */
export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">{APP_NAME}</h1>

      <p className="text-sm text-neutral-700">
        O {APP_NAME} ajuda pequenos negócios a entender o que realmente traz
        resultado — e a decidir o próximo passo sem precisar virar especialista
        em marketing.
      </p>

      <p className="text-sm text-neutral-600">
        Você conta o que faz e o que quer conseguir agora. A partir daí, o
        {" "}
        {APP_NAME} organiza o caminho até esse resultado e mostra, com
        transparência, até onde consegue medir.
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
