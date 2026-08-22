import { describe, expect, it } from "vitest";

import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  signInSchema,
  signUpSchema,
  toFieldErrors,
} from "./schemas";

const SENHA_VALIDA = "senha-forte-123";

describe("signUpSchema", () => {
  it("aceita e-mail e senha válidos", () => {
    const result = signUpSchema.safeParse({
      email: "pessoa@exemplo.com",
      password: SENHA_VALIDA,
    });

    expect(result.success).toBe(true);
  });

  it("normaliza o e-mail para minúsculas e sem espaços", () => {
    const result = signUpSchema.safeParse({
      email: "  Pessoa@Exemplo.COM  ",
      password: SENHA_VALIDA,
    });

    expect(result.success && result.data.email).toBe("pessoa@exemplo.com");
  });

  it.each(["", "sem-arroba", "a@", "@b.com", "a@b", "a b@c.com"])(
    "rejeita o e-mail %j",
    (email) => {
      const result = signUpSchema.safeParse({
        email,
        password: SENHA_VALIDA,
      });

      expect(result.success).toBe(false);
    },
  );

  it("rejeita senha abaixo do mínimo", () => {
    const result = signUpSchema.safeParse({
      email: "pessoa@exemplo.com",
      password: "a".repeat(MIN_PASSWORD_LENGTH - 1),
    });

    expect(result.success).toBe(false);
    expect(result.success === false && toFieldErrors(result.error).password).
      toContain(String(MIN_PASSWORD_LENGTH));
  });

  it("rejeita senha acima do teto defensivo", () => {
    const result = signUpSchema.safeParse({
      email: "pessoa@exemplo.com",
      password: "a".repeat(MAX_PASSWORD_LENGTH + 1),
    });

    expect(result.success).toBe(false);
  });

  it("rejeita campos ausentes", () => {
    const result = signUpSchema.safeParse({
      email: undefined,
      password: undefined,
    });

    expect(result.success).toBe(false);
  });
});

describe("signInSchema", () => {
  it("aceita qualquer senha não vazia", () => {
    const result = signInSchema.safeParse({
      email: "pessoa@exemplo.com",
      password: "curta",
    });

    expect(result.success).toBe(true);
  });

  it("não revela política de senha no login", () => {
    const result = signInSchema.safeParse({
      email: "pessoa@exemplo.com",
      password: "a",
    });

    expect(result.success).toBe(true);
  });

  it("rejeita senha vazia", () => {
    const result = signInSchema.safeParse({
      email: "pessoa@exemplo.com",
      password: "",
    });

    expect(result.success).toBe(false);
  });
});

describe("toFieldErrors", () => {
  it("devolve no máximo uma mensagem por campo", () => {
    const result = signUpSchema.safeParse({ email: "x", password: "y" });

    expect(result.success).toBe(false);
    if (result.success) return;

    const errors = toFieldErrors(result.error);
    expect(typeof errors.email).toBe("string");
    expect(typeof errors.password).toBe("string");
  });

  it("não inclui campos desconhecidos", () => {
    const result = signUpSchema.safeParse({ email: "x", password: "y" });
    if (result.success) return;

    expect(Object.keys(toFieldErrors(result.error)).sort()).toEqual([
      "email",
      "password",
    ]);
  });
});
