import { describe, expect, it } from "vitest";

import {
  CASOS_DE_EVAL,
  TEXTO_COM_INJECTION,
  contaFixture,
  objetivoFixture,
  ofertaFixture,
} from "../../../test/support/declared-context-fixtures";

import { montarSnapshotDeclarado } from "./context-snapshot-builder";
import { calcularFingerprint } from "./fingerprint";
import { refsDoSnapshot, serializarSnapshotCanonico } from "./snapshot";

/**
 * Snapshot e fingerprint — Rodada 004E §§5.1, 8.1 e 14.
 *
 * A eval sintética roda aqui, sobre os doze casos de fixture. Ela **não** exige
 * frase literal nenhuma: prova invariantes — que a ausência vira ausência, que
 * campo vazio não vira fato, que dado sensível não sai daqui e que o
 * fingerprint muda quando e só quando o contexto muda.
 */

const VERSOES = {
  taskType: "DECLARED_BUSINESS_CONTEXT_REVIEW",
  taskVersion: "v1",
  promptVersion: "v1",
  schemaVersion: "v1",
};

function snapshotDoCaso(caso: (typeof CASOS_DE_EVAL)[number]) {
  return montarSnapshotDeclarado({
    account: caso.conta,
    objetivo: caso.objetivo,
    ofertas: caso.ofertas,
  });
}

describe("eval sintética do snapshot declarado", () => {
  it.each(CASOS_DE_EVAL.map((caso) => [caso.nome, caso] as const))(
    "%s produz snapshot coerente",
    (_nome, caso) => {
      const snapshot = snapshotDoCaso(caso);
      const refs = refsDoSnapshot(snapshot);

      // Todo fato tem valor não vazio: campo em branco não pode virar fato.
      for (const fato of snapshot.facts) {
        expect(fato.value.trim().length).toBeGreaterThan(0);
        expect(fato.label.trim().length).toBeGreaterThan(0);
      }

      for (const ref of caso.esperado.refsEsperadas ?? []) {
        expect([...refs]).toContain(ref);
      }

      for (const ref of caso.esperado.refsProibidas ?? []) {
        expect([...refs]).not.toContain(ref);
      }

      for (const ausente of caso.esperado.ausentesEsperados ?? []) {
        expect(snapshot.missingTopics).toContain(ausente);
      }
    },
  );

  /**
   * O que sai do produto para um provider externo é o que está aqui — e nada
   * mais. Minimizar dado enviado é regra, não preferência
   * (`AI_ARCHITECTURE.md` §19).
   */
  it("nunca inclui identidade, credencial ou dado de provider", () => {
    for (const caso of CASOS_DE_EVAL) {
      const texto = serializarSnapshotCanonico(snapshotDoCaso(caso));

      expect(texto).not.toMatch(/@[a-z0-9.-]+\.[a-z]{2,}/i);
      expect(texto).not.toMatch(/\b(api[_-]?key|token|secret|password|senha)\b/i);

      // Nada **da integração** externa: a rodada não observou provider nenhum,
      // então nenhum id de conexão, conta de anúncios, página ou métrica pode
      // atravessar.
      //
      // Os nomes das plataformas, por si, não entram na lista: "Meu perfil no
      // Instagram" é um destino que o próprio usuário escolheu, e "Meta
      // comercial" é o objetivo que ele declarou. Proibi-los censuraria campos
      // legítimos do contexto declarado — que é exatamente o que a task existe
      // para ler.
      expect(texto).not.toMatch(
        /\b(meta_connection|instagram_account|ad_account|page_id|ig_id|access_token|insights?_data)\b/i,
      );

      // Nenhum id de usuário: a task fala do negócio, não de quem clicou.
      expect(texto).not.toMatch(/user[_-]?id/i);
    }
  });

  /**
   * Texto do cliente com instruções embutidas viaja como **valor de campo**. O
   * prompt é quem declara que tudo ali é dado; o snapshot não deve censurar
   * nem reinterpretar o que o negócio escreveu.
   */
  it("preserva texto com prompt injection como conteúdo do negócio", () => {
    const snapshot = montarSnapshotDeclarado({
      account: contaFixture(),
      objetivo: objetivoFixture(),
      ofertas: [ofertaFixture({ description: TEXTO_COM_INJECTION })],
    });

    const descricao = snapshot.facts.find((fato) =>
      fato.ref.endsWith(":description"),
    );

    expect(descricao?.value).toContain("Ignore todas as instruções");
    // E continua sendo um fato entre outros, não um campo especial.
    expect(snapshot.facts.length).toBeGreaterThan(1);
  });

  it("marca o campo legado como legado, para não ser contado como oferta", () => {
    const snapshot = montarSnapshotDeclarado({
      account: contaFixture(),
      objetivo: objetivoFixture(),
      ofertas: [ofertaFixture()],
    });

    const legado = snapshot.facts.find(
      (fato) => fato.ref === "business.primary_offer_legacy",
    );

    expect(legado?.label).toMatch(/cadastro inicial|texto livre|anterior/i);
  });
});

describe("fingerprint", () => {
  it("é estável para o mesmo contexto", () => {
    const caso = CASOS_DE_EVAL[0];

    const primeiro = calcularFingerprint({ snapshot: snapshotDoCaso(caso), ...VERSOES });
    const segundo = calcularFingerprint({ snapshot: snapshotDoCaso(caso), ...VERSOES });

    expect(primeiro).toBe(segundo);
  });

  /**
   * A ordem em que os fatos foram montados não pode mudar o hash: uma
   * refatoração inocente forçaria uma chamada paga sem que nada do contexto
   * tivesse mudado.
   */
  it("não depende da ordem dos fatos", () => {
    const snapshot = snapshotDoCaso(CASOS_DE_EVAL[0]);
    const invertido = { ...snapshot, facts: [...snapshot.facts].reverse() };

    expect(calcularFingerprint({ snapshot, ...VERSOES })).toBe(
      calcularFingerprint({ snapshot: invertido, ...VERSOES }),
    );
  });

  it("muda quando o contexto muda materialmente", () => {
    const base = snapshotDoCaso(CASOS_DE_EVAL[0]);
    const outro = snapshotDoCaso(CASOS_DE_EVAL[1]);

    expect(calcularFingerprint({ snapshot: base, ...VERSOES })).not.toBe(
      calcularFingerprint({ snapshot: outro, ...VERSOES }),
    );
  });

  /**
   * Uma revisão produzida pelo prompt `v1` não responde pelo `v2`: reutilizá-la
   * entregaria ao usuário a resposta de um contrato que não existe mais.
   */
  it("muda quando a versão de prompt ou schema muda", () => {
    const snapshot = snapshotDoCaso(CASOS_DE_EVAL[0]);
    const base = calcularFingerprint({ snapshot, ...VERSOES });

    expect(
      calcularFingerprint({ snapshot, ...VERSOES, promptVersion: "v2" }),
    ).not.toBe(base);
    expect(
      calcularFingerprint({ snapshot, ...VERSOES, schemaVersion: "v2" }),
    ).not.toBe(base);
  });

  it("cada caso da eval tem fingerprint próprio", () => {
    const hashes = CASOS_DE_EVAL.map((caso) =>
      calcularFingerprint({ snapshot: snapshotDoCaso(caso), ...VERSOES }),
    );

    expect(new Set(hashes).size).toBe(hashes.length);
  });
});
