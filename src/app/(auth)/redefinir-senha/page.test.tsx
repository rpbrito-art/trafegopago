import { isValidElement, type ReactElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { RECOVERY_SESSION_REQUIRED } from "@/lib/auth/errors";
import { ROUTES } from "@/lib/auth/routes";

let recoveryUser: { id: string; email: string | null } | null = null;

vi.mock("@/lib/auth/session", () => ({
  getRecoveryUser: async () => recoveryUser,
}));

const { default: RedefinirSenhaPage } = await import("./page");

/**
 * Mesma travessia sem DOM usada em `business-section.test.tsx`: o projeto não
 * tem renderer de testes e o que importa aqui é qual ramo a página escolheu.
 * O formulário é Client Component com hook, então entra como folha.
 */
const FOLHAS: readonly unknown[] = [ResetPasswordForm];

function walk(node: ReactNode, visit: (element: ReactElement) => void): void {
  if (Array.isArray(node)) {
    for (const child of node) walk(child, visit);
    return;
  }

  if (!isValidElement(node)) return;

  visit(node);

  if (typeof node.type === "function" && !FOLHAS.includes(node.type)) {
    const render = node.type as (props: unknown) => ReactNode;
    walk(render(node.props), visit);
    return;
  }

  const props = node.props as { children?: ReactNode };
  if (props?.children !== undefined) walk(props.children, visit);
}

function textOf(node: ReactNode): string {
  const partes: string[] = [];

  walk(node, (element) => {
    const children = (element.props as { children?: ReactNode })?.children;

    for (const parte of [children].flat()) {
      if (typeof parte === "string" || typeof parte === "number") {
        partes.push(String(parte));
      }
    }
  });

  return partes.join("");
}

function mostraFormulario(node: ReactNode): boolean {
  let encontrado = false;
  walk(node, (element) => {
    if (element.type === ResetPasswordForm) encontrado = true;
  });
  return encontrado;
}

function linksDe(node: ReactNode): string[] {
  const hrefs: string[] = [];
  walk(node, (element) => {
    const { href } = element.props as { href?: string };
    if (typeof href === "string") hrefs.push(href);
  });
  return hrefs;
}

beforeEach(() => {
  recoveryUser = null;
});

describe("/redefinir-senha", () => {
  it("mostra o formulário sob sessão de recovery", async () => {
    recoveryUser = { id: "u-1", email: "pessoa@exemplo.com" };

    const page = await RedefinirSenhaPage();

    expect(mostraFormulario(page)).toBe(true);
  });

  it("não mostra formulário sem sessão de recovery", async () => {
    const page = await RedefinirSenhaPage();

    expect(mostraFormulario(page)).toBe(false);
    expect(textOf(page)).toContain(RECOVERY_SESSION_REQUIRED);
  });

  it("orienta a pedir um novo link em vez de expor detalhe técnico", async () => {
    const page = await RedefinirSenhaPage();
    const texto = textOf(page);

    expect(linksDe(page)).toContain(ROUTES.forgotPassword);
    expect(texto).not.toMatch(/amr|jwt|token|claim/i);
  });

  it("não expõe a identidade do usuário na tela de nova senha", async () => {
    recoveryUser = { id: "u-1", email: "pessoa@exemplo.com" };

    const texto = textOf(await RedefinirSenhaPage());

    expect(texto).not.toContain("pessoa@exemplo.com");
    expect(texto).not.toContain("u-1");
  });
});
