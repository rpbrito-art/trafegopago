import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { ROUTES } from "@/lib/auth/routes";

export const metadata = {
  title: "Link inválido — Tráfego Pago",
};

/**
 * Página de erro de autenticação.
 *
 * Estática e sem parâmetros de propósito: não recebe, não lê e não exibe nada
 * vindo da URL de confirmação. Refletir o motivo exato — ou pior, o token —
 * transformaria a página de erro em canal de vazamento.
 */
export default function AuthErroPage() {
  return (
    <AuthShell
      title="Link inválido ou expirado"
      description="Não foi possível confirmar sua conta com este link."
      footer={
        <>
          <Link href={ROUTES.signUp} className="font-medium underline">
            Fazer cadastro novamente
          </Link>
          {" · "}
          <Link href={ROUTES.signIn} className="font-medium underline">
            Entrar
          </Link>
        </>
      }
    >
      <p className="text-sm text-neutral-600">
        Links de confirmação valem por tempo limitado e só podem ser usados uma
        vez. Solicite um novo e tente de novo.
      </p>
    </AuthShell>
  );
}
