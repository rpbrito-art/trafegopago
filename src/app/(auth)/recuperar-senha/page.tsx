import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { ROUTES } from "@/lib/auth/routes";
import { pageTitle } from "@/lib/brand";

export const metadata = {
  title: pageTitle("Recuperar senha"),
};

/**
 * Pedido público de recuperação.
 *
 * Não recebe nem lê parâmetros de URL: não há nada a personalizar aqui, e
 * qualquer valor refletido nesta tela seria um canal para descobrir contas.
 */
export default function RecuperarSenhaPage() {
  return (
    <AuthShell
      title="Esqueci minha senha"
      description="Informe o e-mail da sua conta. Enviaremos um link para você criar uma nova senha."
      footer={
        <>
          Lembrou a senha?{" "}
          <Link href={ROUTES.signIn} className="font-medium underline">
            Entrar
          </Link>
        </>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
