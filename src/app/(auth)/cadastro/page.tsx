import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { ROUTES } from "@/lib/auth/routes";
import { pageTitle } from "@/lib/brand";

export const metadata = {
  title: pageTitle("Criar conta"),
};

export default function CadastroPage() {
  return (
    <AuthShell
      title="Criar conta"
      description="Você receberá um e-mail para confirmar o endereço."
      footer={
        <>
          Já tem conta?{" "}
          <Link href={ROUTES.signIn} className="font-medium underline">
            Entrar
          </Link>
        </>
      }
    >
      <SignUpForm />
    </AuthShell>
  );
}
