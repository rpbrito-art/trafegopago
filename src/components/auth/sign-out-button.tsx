import { signOutAction } from "@/app/actions/auth";

/**
 * Logout.
 *
 * É um `<form>` com Server Action, não um link: sair é uma mutação e precisa
 * chegar por POST, protegido pela verificação de origem que o Next aplica a
 * Server Actions (`SECURITY_MODEL.md` §18).
 */
export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <button
        type="submit"
        className="rounded border border-neutral-300 px-3 py-2 text-sm font-medium"
      >
        Sair
      </button>
    </form>
  );
}
