import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { APP_NAME, pageTitle } from "./brand";

/**
 * Marca — Rodada 004B §4 e Correção 004B-01 §5.
 *
 * O teste lê os documentos ativos listados no mandato. **Não** existe verificação
 * global de ausência da string antiga no repositório: rodadas, relatórios,
 * auditorias e migrations registram fatos de um período em que o projeto tinha
 * outro nome, e reescrevê-los seria falsificar histórico.
 */

const ATIVOS = [
  ".gpt/CHAT_ENTRY_PROMPT.md",
  "docs/00-governanca/ACTIVE_DOCS.md",
  "docs/00-governanca/PROJECT_CHARTER.md",
  "docs/00-governanca/IMPLEMENTATION_ROADMAP.md",
  "docs/00-governanca/ARCHITECTURE_EXECUTION_BOUNDARY.md",
  "docs/00-governanca/EXTERNAL_CONFIGURATION_GATE.md",
  "docs/00-governanca/DOCUMENTATION_LIFECYCLE.md",
  "docs/00-governanca/HISTORY_SUMMARY.md",
  "README.md",
  "CLAUDE.md",
  ".gpt/PROJECT_PROMPT.md",
];

function ler(caminho: string): string {
  return readFileSync(join(process.cwd(), caminho), "utf8");
}

describe("nome canônico", () => {
  it("é Quoron", () => {
    expect(APP_NAME).toBe("Quoron");
  });

  it("compõe o título de uma página", () => {
    expect(pageTitle("Sua conta")).toBe("Sua conta — Quoron");
  });
});

describe("documentos ativos", () => {
  it("nenhum usa o nome antigo como identidade corrente", () => {
    for (const caminho of ATIVOS) {
      const conteudo = ler(caminho);

      // Só a forma-marca, com iniciais maiúsculas ou tudo em caixa alta. A
      // forma em minúsculas é o conceito de mídia paga e continua legítima.
      expect(conteudo, caminho).not.toContain("Tráfego Pago");
      expect(conteudo, caminho).not.toContain("TRÁFEGO PAGO");
    }
  });

  it("cada um nomeia o produto como Quoron", () => {
    for (const caminho of ATIVOS) {
      expect(ler(caminho).toLowerCase(), caminho).toContain("quoron");
    }
  });

  it("o conceito “tráfego pago” em minúsculas permanece intacto", () => {
    // Substituí-lo teria corrompido o sentido: ali não é marca, é a prática de
    // mídia paga.
    const canonico = ler("docs/01-produto/PAID_MEDIA_CANONICAL.md");

    expect(canonico).toContain("tráfego pago");
  });

  it("identificadores técnicos legados não foram renomeados", () => {
    // Repo, pasta local e project ref continuam com o nome antigo de propósito:
    // renomeá-los quebraria remotes, automações e branches ativas.
    expect(ler("CLAUDE.md")).toContain("rpbrito-art/trafegopago");
  });
});
