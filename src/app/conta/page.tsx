import { SignOutButton } from "@/components/auth/sign-out-button";
import { requireUser } from "@/lib/auth/session";

export const metadata = {
  title: "Sua conta — Tráfego Pago",
};

/**
 * Área protegida mínima da Rodada 001B.
 *
 * Existe para provar identidade e sessão, não para ser o dashboard do produto.
 * O guard vem de `requireUser()`, que verifica o JWT server-side; o redirect do
 * Proxy é apenas a primeira camada e não substitui esta.
 */
export default async function ContaPage() {
  const user = await requireUser();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center gap-6 p-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">Sua conta</h1>
        <p className="text-sm text-neutral-600">
          Sessão verificada no servidor.
        </p>
      </div>

      <dl className="flex flex-col gap-2 rounded border border-neutral-200 p-4 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-neutral-500">E-mail</dt>
          <dd className="font-medium">{user.email ?? "—"}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-neutral-500">Identificador</dt>
          <dd className="font-mono text-xs">{user.id}</dd>
        </div>
      </dl>

      <p className="text-sm text-neutral-600">
        Nenhuma funcionalidade de domínio existe nesta etapa: organizações,
        integrações e campanhas entram em rodadas posteriores.
      </p>

      <SignOutButton />
    </main>
  );
}
