import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // Ver `test/stubs/server-only.ts`.
      "server-only": fileURLToPath(
        new URL("./test/stubs/server-only.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    // `scripts/` entra porque a classificação do link de recovery mora lá e
    // precisa de teste: a versão anterior, embutida no smoke, confundia o
    // domínio do próprio projeto Supabase com um rastreador de terceiro.
    include: [
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
      "scripts/**/*.test.mjs",
    ],
  },
});
