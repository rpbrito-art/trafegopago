import { isValidElement } from "react";
import { describe, expect, it } from "vitest";

import Home, { APP_NAME, BOOTSTRAP_STAGE } from "./page";

describe("smoke test da aplicação", () => {
  it("a página inicial renderiza um elemento React válido", () => {
    const element = Home();

    expect(isValidElement(element)).toBe(true);
  });

  it("a página inicial identifica o projeto e a etapa corrente", () => {
    expect(APP_NAME).toBe("Tráfego Pago");
    expect(BOOTSTRAP_STAGE).toContain("001B");
  });
});
