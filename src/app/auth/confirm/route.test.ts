import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ROUTES } from "@/lib/auth/routes";

let verifyResult: { error: { code?: string } | null } = { error: null };

const verifyOtp = vi.fn(async () => verifyResult);

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({ auth: { verifyOtp } }),
}));

class RedirectError extends Error {
  constructor(readonly to: string) {
    super(`NEXT_REDIRECT:${to}`);
  }
}

vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new RedirectError(to);
  },
}));

const { GET } = await import("./route");

async function confirmar(query: string): Promise<string> {
  const request = new NextRequest(
    new URL(`${ROUTES.confirm}${query}`, "https://app.exemplo.com"),
  );

  try {
    await GET(request);
  } catch (error) {
    if (error instanceof RedirectError) return error.to;
    throw error;
  }

  throw new Error("o handler retornou sem redirecionar");
}

beforeEach(() => {
  verifyResult = { error: null };
  verifyOtp.mockClear();
});

describe("GET /auth/confirm", () => {
  it("troca token válido por sessão e leva à área protegida", async () => {
    const destino = await confirmar("?token_hash=hash-valido&type=signup");

    expect(verifyOtp).toHaveBeenCalledWith({
      type: "signup",
      token_hash: "hash-valido",
    });
    expect(destino).toBe(ROUTES.account);
  });

  it("aceita o tipo email além de signup", async () => {
    await confirmar("?token_hash=h&type=email");

    expect(verifyOtp).toHaveBeenCalledWith({ type: "email", token_hash: "h" });
  });

  it("manda para a página de erro quando o token falha", async () => {
    verifyResult = { error: { code: "otp_expired" } };

    expect(await confirmar("?token_hash=h&type=signup")).toBe(ROUTES.authError);
  });

  it.each([
    "",
    "?type=signup",
    "?token_hash=h",
    "?token_hash=&type=signup",
    "?token_hash=h&type=recovery",
    "?token_hash=h&type=magiclink",
    "?token_hash=h&type=email_change",
    "?token_hash=h&type=invite",
  ])("recusa a requisição %j sem chamar o provider", async (query) => {
    expect(await confirmar(query)).toBe(ROUTES.authError);
    expect(verifyOtp).not.toHaveBeenCalled();
  });

  it.each([
    "https://evil.com",
    "//evil.com/roubar",
    "/\evil.com",
    "/admin",
  ])("ignora next hostil (%j) e usa o destino padrão", async (next) => {
    const destino = await confirmar(
      `?token_hash=h&type=signup&next=${encodeURIComponent(next)}`,
    );

    expect(destino).toBe(ROUTES.account);
  });

  it("respeita next interno da allowlist", async () => {
    expect(
      await confirmar(`?token_hash=h&type=signup&next=${ROUTES.home}`),
    ).toBe(ROUTES.home);
  });

  it("nunca redireciona para uma URL que carregue o token", async () => {
    const destino = await confirmar(
      "?token_hash=segredo-do-email&type=signup&next=%2Fconta",
    );

    expect(destino).not.toContain("segredo-do-email");
    expect(destino).not.toContain("token_hash");
  });
});
