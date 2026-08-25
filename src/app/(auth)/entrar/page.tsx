import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { SignInForm } from "@/components/auth/sign-in-form";
import { sanitizeRedirect } from "@/lib/auth/redirect";
import { PASSWORD_RESET_DONE_PARAM, ROUTES } from "@/lib/auth/routes";
import { pageTitle } from "@/lib/brand";

export const metadata = {
  title: pageTitle("Entrar"),
};

/** Confirmação mostrada quando o usuário chega vindo da troca de senha. */
export const PASSWORD_RESET_DONE_MESSAGE =
  "Senha alterada. Entre com a nova senha.";

export default async function EntrarPage({
  searchParams,
}: PageProps<"/entrar">) {
  const params = await searchParams;
  // O valor da querystring é público e editável: só sobrevive se estiver na
  // allowlist. Sanitizar aqui evita que um destino externo chegue até o form.
  const safeNext = sanitizeRedirect(
    typeof params.next === "string" ? params.next : undefined,
  );
  // Marcador booleano posto pela própria aplicação. Mesmo que alguém o force na
  // URL, o pior efeito é ver um aviso: nada aqui depende dele.
  const passwordReset = params[PASSWORD_RESET_DONE_PARAM] === "1";

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
      {passwordReset ? (
        <p
          role="status"
          className="rounded border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900"
        >
          {PASSWORD_RESET_DONE_MESSAGE}
        </p>
      ) : null}

      <SignInForm next={safeNext} />

      <p className="text-sm">
        <Link
          href={ROUTES.forgotPassword}
          className="font-medium text-neutral-600 underline"
        >
          Esqueci minha senha
        </Link>
      </p>
    </AuthShell>
  );
}
