import { describe, expect, it } from "vitest";

import {
  ACCOUNT_ENUMERATION_CODES,
  describePasswordUpdateError,
  describeSignInError,
  describeSignUpError,
  GENERIC_ERROR,
  GENERIC_SIGN_IN_ERROR,
  isRateLimited,
  PASSWORD_RESET_REQUESTED,
  RECOVERY_SESSION_REQUIRED,
} from "./errors";

describe("describeSignInError", () => {
  it.each([
    "invalid_credentials",
    "user_not_found",
    "email_exists",
    "user_banned",
    "unexpected_failure",
  ])("devolve a mesma mensagem genérica para %s", (code) => {
    expect(describeSignInError({ code })).toBe(GENERIC_SIGN_IN_ERROR);
  });

  it("não permite distinguir e-mail inexistente de senha errada", () => {
    expect(describeSignInError({ code: "user_not_found" })).toBe(
      describeSignInError({ code: "invalid_credentials" }),
    );
  });

  it("orienta quando o e-mail ainda não foi confirmado", () => {
    expect(describeSignInError({ code: "email_not_confirmed" })).toContain(
      "Confirme seu e-mail",
    );
  });

  it("avisa sobre limite de tentativas", () => {
    expect(describeSignInError({ status: 429 })).toContain("Muitas tentativas");
  });
});

describe("describeSignUpError", () => {
  it.each([...ACCOUNT_ENUMERATION_CODES])(
    "não revela conta existente em %s",
    (code) => {
      expect(describeSignUpError({ code })).toBe(GENERIC_ERROR);
    },
  );

  it("orienta sobre senha fraca recusada pelo provider", () => {
    expect(describeSignUpError({ code: "weak_password" })).toContain("forte");
  });

  it("orienta sobre e-mail inválido", () => {
    expect(describeSignUpError({ code: "email_address_invalid" })).toContain(
      "válido",
    );
  });

  it("informa cadastro indisponível quando o provider está desligado", () => {
    expect(describeSignUpError({ code: "signup_disabled" })).toContain(
      "indisponível",
    );
  });

  it("cai na mensagem genérica para código desconhecido", () => {
    expect(describeSignUpError({ code: "algo_novo_do_servidor" })).toBe(
      GENERIC_ERROR,
    );
    expect(describeSignUpError({})).toBe(GENERIC_ERROR);
  });
});

describe("mensagens seguras", () => {
  const TODAS = [
    GENERIC_ERROR,
    GENERIC_SIGN_IN_ERROR,
    describeSignInError({ code: "email_not_confirmed" }),
    describeSignInError({ status: 429 }),
    describeSignUpError({ code: "weak_password" }),
    describeSignUpError({ code: "email_address_invalid" }),
    describeSignUpError({ code: "signup_disabled" }),
    PASSWORD_RESET_REQUESTED,
    RECOVERY_SESSION_REQUIRED,
    describePasswordUpdateError({ code: "weak_password" }),
    describePasswordUpdateError({ code: "same_password" }),
    describePasswordUpdateError({ code: "reauthentication_needed" }),
    describePasswordUpdateError({ status: 429 }),
    describePasswordUpdateError({ code: "unexpected_failure" }),
  ];

  it("nenhuma mensagem ecoa código interno do provider", () => {
    for (const mensagem of TODAS) {
      expect(mensagem).not.toMatch(/_/);
      expect(mensagem).not.toMatch(/[0-9]{3}/);
    }
  });
});

describe("isRateLimited", () => {
  it("reconhece status e códigos de limite", () => {
    expect(isRateLimited({ status: 429 })).toBe(true);
    expect(isRateLimited({ code: "over_request_rate_limit" })).toBe(true);
    expect(isRateLimited({ code: "over_email_send_rate_limit" })).toBe(true);
  });

  it("não marca erro comum como limite", () => {
    expect(isRateLimited({ code: "invalid_credentials", status: 400 })).toBe(
      false,
    );
  });
});

describe("mensagens de recuperação", () => {
  it("o aviso do pedido não confirma nem nega a existência da conta", () => {
    expect(PASSWORD_RESET_REQUESTED).toMatch(/Se houver uma conta/);
    expect(PASSWORD_RESET_REQUESTED).not.toMatch(/enviamos para|encontrad/i);
  });

  it("o aviso de link inválido não distingue expirado de já usado", () => {
    expect(RECOVERY_SESSION_REQUIRED).not.toMatch(/expirad|já usad|inexistent/i);
    expect(RECOVERY_SESSION_REQUIRED).toMatch(/Peça um novo/);
  });
});

describe("describePasswordUpdateError", () => {
  it("orienta sobre senha fraca e senha repetida", () => {
    expect(describePasswordUpdateError({ code: "weak_password" })).toMatch(
      /mais forte/i,
    );
    expect(describePasswordUpdateError({ code: "same_password" })).toMatch(
      /diferente/i,
    );
  });

  it("trata reautenticação exigida como link inválido", () => {
    expect(
      describePasswordUpdateError({ code: "reauthentication_needed" }),
    ).toBe(RECOVERY_SESSION_REQUIRED);
  });

  it("cai na mensagem genérica para falha não mapeada", () => {
    expect(describePasswordUpdateError({ code: "unexpected_failure" })).toBe(
      GENERIC_ERROR,
    );
  });

  it("avisa sobre limite de tentativas", () => {
    expect(describePasswordUpdateError({ status: 429 })).toMatch(
      /Muitas tentativas/,
    );
  });
});
