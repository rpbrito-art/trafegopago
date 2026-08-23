import { describe, expect, it } from "vitest";

import {
  EMAIL_OTP_AMR_METHODS,
  grantsPasswordReset,
  hasRecoveryMethod,
  PASSWORD_AMR_METHOD,
  RECOVERY_AMR_METHOD,
  readAmrMethods,
} from "./recovery";

describe("readAmrMethods", () => {
  it("lê o formato detalhado com method/timestamp", () => {
    expect(
      readAmrMethods([
        { method: "password", timestamp: 1 },
        { method: RECOVERY_AMR_METHOD, timestamp: 2 },
      ]),
    ).toEqual(["password", RECOVERY_AMR_METHOD]);
  });

  it("lê o formato RFC-8176 de strings", () => {
    expect(readAmrMethods(["otp", RECOVERY_AMR_METHOD])).toEqual([
      "otp",
      RECOVERY_AMR_METHOD,
    ]);
  });

  it.each([undefined, null, "recovery", 42, {}, { method: "recovery" }])(
    "devolve lista vazia para %j em vez de lançar",
    (amr) => {
      expect(readAmrMethods(amr)).toEqual([]);
    },
  );

  it("descarta entradas malformadas sem perder as válidas", () => {
    expect(
      readAmrMethods([null, { timestamp: 1 }, 7, { method: "password" }]),
    ).toEqual(["password"]);
  });
});

describe("hasRecoveryMethod", () => {
  it("reconhece o método literal previsto na documentação", () => {
    expect(hasRecoveryMethod([{ method: "recovery", timestamp: 1 }])).toBe(
      true,
    );
    expect(hasRecoveryMethod(["recovery"])).toBe(true);
  });

  it("registra que otp NÃO é o método recovery", () => {
    // Este é o fato medido contra o provider em 2026-08-23: a sessão de
    // recuperação chega como `otp`. Se um dia o Supabase passar a emitir
    // `recovery`, este teste continua verde e o guard fica mais estrito
    // sozinho — mas a diferença nunca fica escondida.
    expect(hasRecoveryMethod(["otp"])).toBe(false);
  });

  it.each([[["password"]], [["magiclink"]], [[]], [undefined]])(
    "recusa %j",
    (amr) => {
      expect(hasRecoveryMethod(amr)).toBe(false);
    },
  );
});

describe("grantsPasswordReset", () => {
  it.each([...EMAIL_OTP_AMR_METHODS])(
    "autoriza sessão nascida do método %s",
    (metodo) => {
      expect(grantsPasswordReset([{ method: metodo, timestamp: 1 }])).toBe(
        true,
      );
      expect(grantsPasswordReset([metodo])).toBe(true);
    },
  );

  it("recusa sessão de login por senha", () => {
    expect(
      grantsPasswordReset([{ method: PASSWORD_AMR_METHOD, timestamp: 1 }]),
    ).toBe(false);
  });

  it("recusa mesmo quando password aparece ao lado de um OTP", () => {
    // Sessão que em algum momento passou por senha não vira sessão de
    // recuperação por acumular outro método depois.
    expect(grantsPasswordReset(["otp", PASSWORD_AMR_METHOD])).toBe(false);
    expect(grantsPasswordReset([PASSWORD_AMR_METHOD, "recovery"])).toBe(false);
  });

  it("tolera métodos somados por renovação de token", () => {
    expect(
      grantsPasswordReset([
        { method: "otp", timestamp: 1 },
        { method: "token_refresh", timestamp: 2 },
      ]),
    ).toBe(true);
  });

  it.each([[[]], [undefined], [null], [["token_refresh"]], [["oauth"]]])(
    "recusa %j, que não prova posse do e-mail agora",
    (amr) => {
      expect(grantsPasswordReset(amr)).toBe(false);
    },
  );

  it("não aceita method parecido por prefixo", () => {
    expect(grantsPasswordReset([{ method: "otp_backup" }])).toBe(false);
    expect(grantsPasswordReset([{ method: "recovery_code" }])).toBe(false);
  });
});
