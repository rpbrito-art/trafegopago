import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

/**
 * Config separada para harnesses E2E que mutam estado real.
 *
 * Existe justamente para que esses arquivos **não** entrem no `include` do
 * `vitest.config.ts`: `npm test` e a CI continuam cegos a eles. Rodar exige
 * apontar esta config explicitamente, e cada harness ainda pede a sua própria
 * variável de armação.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(
        new URL("./test/stubs/server-only.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    include: ["scripts/e2e/**/*.e2e.ts"],
  },
});
