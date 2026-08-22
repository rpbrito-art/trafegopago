import Link from "next/link";
import type { ReactNode } from "react";

import { ROUTES } from "@/lib/auth/routes";

/**
 * Moldura comum das telas de autenticação.
 *
 * Server Component: não tem estado nem interatividade própria, só enquadra o
 * conteúdo. Mantém a UI mínima — esta rodada prova identidade, não desenho de
 * produto.
 */
export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center gap-6 p-8">
      <div className="flex flex-col gap-1">
        <Link
          href={ROUTES.home}
          className="text-xs font-medium uppercase tracking-wide text-neutral-500"
        >
          Tráfego Pago
        </Link>
        <h1 className="text-xl font-semibold">{title}</h1>
        {description ? (
          <p className="text-sm text-neutral-600">{description}</p>
        ) : null}
      </div>

      {children}

      {footer ? (
        <div className="text-sm text-neutral-600">{footer}</div>
      ) : null}
    </main>
  );
}
