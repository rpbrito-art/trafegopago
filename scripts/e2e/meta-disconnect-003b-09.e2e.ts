/**
 * E2E REAL de desconexão — Correção 003B-09 §4.2.
 *
 * **Isto muta estado real.** Roda a desconexão autorizada da conexão USER viva
 * contra a Meta e o Supabase de produção do projeto. Não faz parte da suíte: o
 * `include` do `vitest.config.ts` não alcança este caminho, e a execução exige
 * `META_E2E_DISCONNECT=1` explicitamente. Sem isso, o harness pula.
 *
 * O que ele **não** faz: não duplica a lógica de revogação, não escreve SQL
 * para simular sucesso, não reconecta depois. Chama `disconnectMeta()`, a mesma
 * função que a Server Action da aplicação chama, com a identidade de teste
 * autorizada — e depois lê o Supabase para provar o estado final.
 *
 * Nada de segredo é impresso: nem token, nem App Secret, nem URL (que pode
 * carregar credencial), nem `message` da Meta. A observação do corpo de sucesso
 * registra apenas a **forma** (`boolean` / `object` / chaves), nunca valores
 * sensíveis, e é feita sobre um `clone()` para não consumir a resposta que o
 * gateway ainda vai ler.
 *
 * Uso:
 *   META_E2E_DISCONNECT=1 npx vitest run --config vitest.e2e.config.ts
 */

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

/** Alvos fixados pelo mandato. */
const CONNECTION_ID = "655da6e6-9056-456d-a81d-5e2570da5faf";
const ORGANIZATION_ID = "a8f79c4b-b10a-4e01-b12d-2d8e62917009";
const USER_ID = "d4ed915a-2fe8-4990-9e73-9a68fbbd1f9d";

const ARMADO = process.env.META_E2E_DISCONNECT === "1";

function carregarEnvLocal() {
  const raw = readFileSync(new URL("../../.env.local", import.meta.url), "utf8");

  for (const linha of raw.split(/\r?\n/)) {
    const limpa = linha.trim();
    if (!limpa || limpa.startsWith("#")) continue;
    const eq = limpa.indexOf("=");
    if (eq === -1) continue;
    const chave = limpa.slice(0, eq);
    if (process.env[chave] === undefined) process.env[chave] = limpa.slice(eq + 1);
  }
}

/** Só a forma do corpo pode ser dita em voz alta. */
function formaDoCorpo(valor: unknown): string {
  if (valor === null) return "null";
  if (typeof valor === "boolean") return `boolean:${valor}`;
  if (Array.isArray(valor)) return `array[${valor.length}]`;
  if (typeof valor === "object") {
    return `object{${Object.keys(valor as object).sort().join(",")}}`;
  }
  return typeof valor;
}

describe.runIf(ARMADO)("desconexão USER real — 003B-09", () => {
  it(
    "revoga na Meta pelo caminho canônico e deixa a conexão REVOKED",
    { timeout: 120_000 },
    async () => {
      carregarEnvLocal();

      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL as string,
        process.env.SUPABASE_SECRET_KEY as string,
        { auth: { persistSession: false, autoRefreshToken: false } },
      );

      // ---------------------------------------------------------------- antes
      const { data: antes } = await supabase
        .from("meta_connections")
        .select(
          "id, status, granted_scopes, token_secret_reference, token_expires_at, disconnected_at, external_user_id",
        )
        .eq("id", CONNECTION_ID)
        .maybeSingle();

      console.log("ANTES:", {
        status: antes?.status ?? null,
        temReferenciaDeToken: Boolean(antes?.token_secret_reference),
        escopos: (antes?.granted_scopes as string[] | null)?.length ?? 0,
        expiraEm: antes?.token_expires_at ?? null,
        desconectadaEm: antes?.disconnected_at ?? null,
      });

      // ------------------------------------------- observação sanitizada da Meta
      //
      // Envolve o `fetch` global apenas para registrar a FORMA da resposta do
      // endpoint de revogação — o dado que o mandato pede provar. A chamada em
      // si continua sendo feita pelo gateway; nada aqui decide nada.
      const observado: {
        http: number;
        forma: string;
        tokenNaUrl: boolean;
        metodo: string;
      }[] = [];
      const fetchOriginal = globalThis.fetch;

      globalThis.fetch = (async (
        entrada: Parameters<typeof fetch>[0],
        init?: Parameters<typeof fetch>[1],
      ) => {
        const resposta = await fetchOriginal(entrada, init);
        const alvo = String(entrada instanceof Request ? entrada.url : entrada);

        if (alvo.includes("/permissions")) {
          const copia = resposta.clone();
          const corpo = await copia.json().catch(() => undefined);

          observado.push({
            metodo: String(init?.method ?? "GET"),
            http: resposta.status,
            forma: formaDoCorpo(corpo),
            tokenNaUrl: alvo.includes("access_token="),
          });
        }

        return resposta;
      }) as typeof fetch;

      let resultado: unknown;

      try {
        const { disconnectMeta } = await import("@/lib/meta/gateway");
        resultado = await disconnectMeta({
          userId: USER_ID,
          organizationId: ORGANIZATION_ID,
        });
      } finally {
        globalThis.fetch = fetchOriginal;
      }

      console.log("RESULTADO:", resultado);
      console.log("REVOGAÇÃO OBSERVADA:", observado);

      // ---------------------------------------------------------------- depois
      const { data: depois } = await supabase
        .from("meta_connections")
        .select(
          "id, status, granted_scopes, token_secret_reference, token_expires_at, disconnected_at",
        )
        .eq("id", CONNECTION_ID)
        .maybeSingle();

      console.log("DEPOIS:", {
        status: depois?.status ?? null,
        temReferenciaDeToken: Boolean(depois?.token_secret_reference),
        escopos: (depois?.granted_scopes as string[] | null)?.length ?? 0,
        expiraEm: depois?.token_expires_at ?? null,
        desconectadaEm: depois?.disconnected_at ?? null,
      });

      // Estado terminal exigido pelo §3.3.
      expect(resultado).toEqual({ ok: true });
      expect(depois?.status).toBe("REVOKED");
      expect(depois?.token_secret_reference).toBeNull();
      expect(depois?.token_expires_at).toBeNull();
      expect(depois?.granted_scopes).toEqual([]);
      expect(depois?.disconnected_at).not.toBeNull();

      // Nenhum ativo pode continuar selecionado sobre uma conexão revogada.
      const { data: igs } = await supabase
        .from("instagram_accounts")
        .select("id, status")
        .eq("meta_connection_id", CONNECTION_ID);
      const { data: ads } = await supabase
        .from("ad_accounts")
        .select("id, status")
        .eq("meta_connection_id", CONNECTION_ID);

      console.log("ATIVOS:", {
        instagram: (igs ?? []).map((a) => a.status),
        adAccounts: (ads ?? []).map((a) => a.status),
      });

      expect((igs ?? []).some((a) => a.status === "SELECTED")).toBe(false);
      expect((ads ?? []).some((a) => a.status === "SELECTED")).toBe(false);
    },
  );
});
