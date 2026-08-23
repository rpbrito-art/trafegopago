import { describe, expect, it } from "vitest";

import { EXTERNAL_ERROR_CLASSES } from "./contracts";
import {
  decidePoisonArchival,
  poisonSummary,
  SAFE_FAIL_OUTCOMES,
} from "./poison";

describe("decidePoisonArchival", () => {
  it.each([...SAFE_FAIL_OUTCOMES])(
    "arquiva quando fail_operation devolve %s",
    (outcome) => {
      expect(decidePoisonArchival({ outcome, hasError: false })).toEqual({
        archive: true,
      });
    },
  );

  it("NÃO arquiva quando o RPC falha", () => {
    // Sem saber o estado da operação, arquivar deixaria um trabalho pendurado
    // e sem mensagem que o recupere. A visibility timeout devolve e o próximo
    // ciclo tenta de novo.
    expect(decidePoisonArchival({ outcome: "FAILED", hasError: true })).toEqual({
      archive: false,
      reason: "RPC_ERROR",
    });
  });

  it("erro do RPC vence qualquer desfecho aparente", () => {
    for (const outcome of [...SAFE_FAIL_OUTCOMES, null, "QUALQUER"]) {
      const d = decidePoisonArchival({ outcome, hasError: true });
      expect(d.archive).toBe(false);
    }
  });

  it.each([null, undefined, "", "OK", "SUCCEEDED", 42, {}, []])(
    "NÃO arquiva diante do desfecho desconhecido %j",
    (outcome) => {
      expect(decidePoisonArchival({ outcome, hasError: false })).toEqual({
        archive: false,
        reason: "UNKNOWN_OUTCOME",
      });
    },
  );

  it("não trata desconhecido como sucesso", () => {
    // O erro que esta função existe para impedir: um retorno inesperado sendo
    // lido como "pode arquivar".
    const d = decidePoisonArchival({ outcome: "ALGO_NOVO", hasError: false });
    expect(d.archive).toBe(false);
  });
});

describe("poisonSummary", () => {
  it("descreve a exaustão da fila sem inventar erro externo", () => {
    const resumo = poisonSummary(3);

    expect(resumo).toContain("3");
    expect(resumo).toMatch(/fila interna/);
    // A regra do bloqueio A: nenhuma classe da taxonomia externa pode aparecer
    // no texto nem ser usada como classificação.
    for (const classe of EXTERNAL_ERROR_CLASSES) {
      expect(resumo).not.toContain(classe);
    }
  });

  it("cabe no teto de last_error_summary da 002A", () => {
    expect(poisonSummary(999).length).toBeLessThanOrEqual(2000);
  });
});

describe("contrato com a taxonomia externa", () => {
  it("o poison não produz classificação de erro externo", () => {
    // O bloqueio A da auditoria 002B: exaustão de fila é falha INTERNA, e
    // nenhuma chamada a provider aconteceu. O worker passa
    // `p_error_class: null`; o que este módulo fornece é apenas o resumo.
    //
    // Note que `NOT_FOUND` aparece nas duas listas por coincidência de nome:
    // como desfecho de `fail_operation` significa "a operação não existe", e
    // como classe externa significa "o provider não achou o recurso". Papéis
    // diferentes, camadas diferentes — por isso o teste não exige conjuntos
    // disjuntos, e sim que o resumo não carregue classificação nenhuma.
    const resumo = poisonSummary(3);
    const classesNoResumo = EXTERNAL_ERROR_CLASSES.filter((c) =>
      resumo.includes(c),
    );

    expect(classesNoResumo).toEqual([]);
  });

  it("SAFE_FAIL_OUTCOMES descreve desfechos do helper, não erros de provider", () => {
    // Os desfechos são os retornos possíveis de `public.fail_operation`.
    expect([...SAFE_FAIL_OUTCOMES].sort()).toEqual([
      "ALREADY_SUCCEEDED",
      "FAILED",
      "NOT_FAILABLE",
      "NOT_FOUND",
    ]);
  });
});
