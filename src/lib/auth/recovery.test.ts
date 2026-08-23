import { describe, expect, it } from "vitest";

import {
  EMAIL_OTP_AMR_METHODS,
  grantsPasswordReset,
  hasRecoveryMethod,
  MAX_RECOVERY_AMR_AGE_MS,
  MAX_RECOVERY_AMR_SKEW_MS,
  OTP_AMR_METHOD,
  PASSWORD_AMR_METHOD,
  readAmrEntries,
  readAmrMethods,
  RECOVERY_AMR_METHOD,
} from "./recovery";

/** Instante fixo: a janela é testada movendo o `amr`, nunca o relógio real. */
const AGORA = Date.UTC(2026, 7, 23, 12, 0, 0);

/** O Supabase grava `timestamp` em segundos; os testes falam a mesma língua. */
function segundosAtras(ms: number): number {
  return Math.floor((AGORA - ms) / 1000);
}

function amr(method: string, idadeMs = 0) {
  return [{ method, timestamp: segundosAtras(idadeMs) }];
}

describe("readAmrEntries", () => {
  it("normaliza o formato detalhado e converte o instante para ms", () => {
    expect(readAmrEntries([{ method: "otp", timestamp: 1_700_000_000 }])).toEqual(
      [{ method: "otp", timestampMs: 1_700_000_000_000 }],
    );
  });

  it("lê o formato RFC-8176, que não declara instante", () => {
    expect(readAmrEntries(["otp", RECOVERY_AMR_METHOD])).toEqual([
      { method: "otp", timestampMs: null },
      { method: RECOVERY_AMR_METHOD, timestampMs: null },
    ]);
  });

  it.each([undefined, null, "recovery", 42, {}, { method: "recovery" }])(
    "devolve lista vazia para %j em vez de lançar",
    (valor) => {
      expect(readAmrEntries(valor)).toEqual([]);
    },
  );

  it("descarta entradas malformadas sem perder as válidas", () => {
    expect(
      readAmrEntries([null, { timestamp: 1 }, 7, { method: "password" }]),
    ).toEqual([{ method: "password", timestampMs: null }]);
  });

  it.each([undefined, null, "1700000000", Number.NaN, Infinity, 0, -5])(
    "trata o timestamp %j como ausente em vez de inventar uma data",
    (timestamp) => {
      expect(readAmrEntries([{ method: "otp", timestamp }])).toEqual([
        { method: "otp", timestampMs: null },
      ]);
    },
  );
});

describe("readAmrMethods", () => {
  it("extrai só os métodos, nos dois formatos", () => {
    expect(
      readAmrMethods([
        { method: "password", timestamp: 1 },
        RECOVERY_AMR_METHOD,
      ]),
    ).toEqual(["password", RECOVERY_AMR_METHOD]);
  });
});

describe("hasRecoveryMethod", () => {
  it("reconhece o método literal previsto na documentação", () => {
    expect(hasRecoveryMethod([{ method: "recovery", timestamp: 1 }])).toBe(true);
    expect(hasRecoveryMethod(["recovery"])).toBe(true);
  });

  it("registra que otp NÃO é o método recovery", () => {
    // Fato medido contra o provider em 2026-08-23: a sessão de recuperação
    // chega como `otp`. A função sobrevive como diagnóstico da diferença entre
    // o que o Supabase documenta e o que emite — ver `recovery.ts`.
    expect(hasRecoveryMethod(["otp"])).toBe(false);
  });

  it.each([[["password"]], [["magiclink"]], [[]], [undefined]])(
    "recusa %j",
    (valor) => {
      expect(hasRecoveryMethod(valor)).toBe(false);
    },
  );
});

describe("grantsPasswordReset", () => {
  it.each([...EMAIL_OTP_AMR_METHODS])(
    "autoriza sessão recém-nascida do método %s",
    (metodo) => {
      expect(grantsPasswordReset(amr(metodo), AGORA)).toBe(true);
    },
  );

  it("recusa sessão de login por senha", () => {
    expect(grantsPasswordReset(amr(PASSWORD_AMR_METHOD), AGORA)).toBe(false);
  });

  it("recusa mesmo quando password aparece ao lado de um OTP recente", () => {
    // Sessão que em algum momento passou por senha não vira sessão de
    // recuperação por acumular outro método depois.
    expect(
      grantsPasswordReset(
        [...amr(OTP_AMR_METHOD), ...amr(PASSWORD_AMR_METHOD)],
        AGORA,
      ),
    ).toBe(false);
  });

  it("tolera métodos somados por renovação de token", () => {
    expect(
      grantsPasswordReset(
        [...amr(OTP_AMR_METHOD, 60_000), ...amr("token_refresh")],
        AGORA,
      ),
    ).toBe(true);
  });

  describe("janela temporal", () => {
    it("autoriza um segundo antes do limite", () => {
      expect(
        grantsPasswordReset(
          amr(OTP_AMR_METHOD, MAX_RECOVERY_AMR_AGE_MS - 1_000),
          AGORA,
        ),
      ).toBe(true);
    });

    it("recusa um segundo depois do limite", () => {
      expect(
        grantsPasswordReset(
          amr(OTP_AMR_METHOD, MAX_RECOVERY_AMR_AGE_MS + 1_000),
          AGORA,
        ),
      ).toBe(false);
    });

    it("recusa sessão de OTP antiga ainda que válida como login", () => {
      // O caso que a recência existe para fechar: sessão de confirmação de
      // cadastro de ontem, renovada desde então, não abre a troca de senha.
      expect(
        grantsPasswordReset(amr(OTP_AMR_METHOD, 24 * 60 * 60 * 1_000), AGORA),
      ).toBe(false);
    });

    it("tolera relógio do Auth adiantado dentro do skew", () => {
      expect(
        grantsPasswordReset(
          amr(OTP_AMR_METHOD, -(MAX_RECOVERY_AMR_SKEW_MS - 5_000)),
          AGORA,
        ),
      ).toBe(true);
    });

    it("recusa timestamp no futuro além do skew", () => {
      expect(
        grantsPasswordReset(
          amr(OTP_AMR_METHOD, -(MAX_RECOVERY_AMR_SKEW_MS + 60_000)),
          AGORA,
        ),
      ).toBe(false);
    });

    it("recusa o formato sem instante, em vez de autorizar sem prova de recência", () => {
      // Falha fechada: se o provider trocar para RFC-8176, o fluxo nega e o
      // smoke acusa — não abre uma janela indefinida em silêncio.
      expect(grantsPasswordReset([OTP_AMR_METHOD], AGORA)).toBe(false);
      expect(grantsPasswordReset([RECOVERY_AMR_METHOD], AGORA)).toBe(false);
    });

    it("recusa entrada de OTP sem timestamp utilizável", () => {
      expect(
        grantsPasswordReset([{ method: OTP_AMR_METHOD }], AGORA),
      ).toBe(false);
    });
  });

  it.each([[[]], [undefined], [null], [["token_refresh"]], [["oauth"]]])(
    "recusa %j, que não prova posse recente do e-mail",
    (valor) => {
      expect(grantsPasswordReset(valor, AGORA)).toBe(false);
    },
  );

  it("não aceita method parecido por prefixo", () => {
    expect(grantsPasswordReset(amr("otp_backup"), AGORA)).toBe(false);
    expect(grantsPasswordReset(amr("recovery_code"), AGORA)).toBe(false);
  });

  it("usa o relógio atual quando nenhum instante é injetado", () => {
    const agoraEmSegundos = Math.floor(Date.now() / 1000);

    expect(
      grantsPasswordReset([
        { method: OTP_AMR_METHOD, timestamp: agoraEmSegundos },
      ]),
    ).toBe(true);
  });
});
