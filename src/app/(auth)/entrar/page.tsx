import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { SignInForm } from "@/components/auth/sign-in-form";
import { sanitizeRedirect } from "@/lib/auth/redirect";
import { ROUTES } from "@/lib/auth/routes";

export const metadata = {
  title: "Entrar — Tráfego Pago",
};

export default async function EntrarPage({
  searchParams,
}: PageProps<"/entrar">) {
  const { next } = await searchParams;
  // O valor da querystring é público e editável: só sobrevive se estiver na
  // allowlist. Sanitizar aqui evita que um destino externo chegue até o form.
  const safeNext = sanitizeRedirect(typeof next === "string" ? next : undefined);

  return (
    <AuthShell
      title="Entrar"
      description="Acesse sua conta com e-mail e senha."
      footer={
        <>
          Ainda não tem conta?{" "}
          <Link href={ROUTES.signUp} className="font-medium underline">
            Criar conta
          </Link>
        </>
      }
    >
      <SignInForm next={safeNext} />
    </AuthShell>
  );
}
