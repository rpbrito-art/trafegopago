import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { ROUTES } from "@/lib/auth/routes";
import { pageTitle } from "@/lib/brand";

export const metadata = {
  title: pageTitle("Confirme seu e-mail"),
};

/**
 * Aviso pós-cadastro.
 *
 * Não recebe nem exibe o e-mail digitado: a página é acessível por URL direta,
 * e ecoar o endereço permitiria usá-la para confirmar se um cadastro ocorreu.
 */
export default function ConfirmeSeuEmailPage() {
  return (
    <AuthShell
      title="Confirme seu e-mail"
      description="Enviamos um link de confirmação para o endereço informado. Abra o e-mail e clique no link para ativar sua conta."
      footer={
        <>
          Já confirmou?{" "}
          <Link href={ROUTES.signIn} className="font-medium underline">
            Entrar
          </Link>
        </>
      }
    >
      <p className="text-sm text-neutral-600">
        O link expira depois de algum tempo. Se ele não funcionar, faça o
        cadastro novamente para receber um novo e-mail.
      </p>
    </AuthShell>
  );
}
