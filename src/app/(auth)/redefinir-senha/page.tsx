import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { RECOVERY_SESSION_REQUIRED } from "@/lib/auth/errors";
import { ROUTES } from "@/lib/auth/routes";
import { getRecoveryUser } from "@/lib/auth/session";

export const metadata = {
  title: "Nova senha — Tráfego Pago",
};

/**
 * Nunca pré-renderizar: o que a página mostra depende da sessão do request.
 */
export const dynamic = "force-dynamic";

/**
 * Definição da nova senha.
 *
 * O guard é `getRecoveryUser()`, não `requireUser()`. A diferença é o ponto
 * inteiro desta tela: estar autenticado não basta, a sessão precisa provar
 * posse recente do e-mail e não ter passado por senha — o predicado está em
 * `lib/auth/recovery.ts`. Sem isso o formulário nem chega ao browser — e o
 * Server Action repete a verificação, porque esconder o formulário não é
 * autorização.
 */
export default async function RedefinirSenhaPage() {
  const recoveryUser = await getRecoveryUser();

  if (!recoveryUser) {
    return (
      <AuthShell
        title="Link de recuperação inválido"
        description="Não foi possível abrir a tela de nova senha."
        footer={
          <>
            <Link
              href={ROUTES.forgotPassword}
              className="font-medium underline"
            >
              Pedir novo link
            </Link>
            {" · "}
            <Link href={ROUTES.signIn} className="font-medium underline">
              Entrar
            </Link>
          </>
        }
      >
        <p role="status" className="text-sm text-neutral-600">
          {RECOVERY_SESSION_REQUIRED}
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Criar nova senha"
      description="Escolha uma senha nova para entrar na sua conta."
      footer={
        <>
          Mudou de ideia?{" "}
          <Link href={ROUTES.signIn} className="font-medium underline">
            Voltar para o login
          </Link>
        </>
      }
    >
      <ResetPasswordForm />
    </AuthShell>
  );
}
