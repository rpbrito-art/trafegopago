/**
 * `state` do OAuth Meta — geração, hash e validação.
 *
 * É a peça que impede três ataques distintos (`SECURITY_MODEL.md` §8):
 *
 * 1. **CSRF/callback forjado** — só volta quem tem o `state` de uma ida que
 *    este servidor iniciou;
 * 2. **replay** — a intenção é de uso único, e a segunda volta encontra a
 *    primeira já consumida;
 * 3. **cross-tenant** — a intenção guarda usuário e organização, e o callback
 *    valida os dois, não apenas "há sessão".
 *
 * ## Por que só o hash é persistido
 *
 * O `state` viaja na URL e passa por browser, redirects e possivelmente logs de
 * terceiros. Guardar só o SHA-256 significa que ler a tabela `meta_oauth_intents`
 * não permite forjar um callback — mesmo padrão do `token_hash` do Supabase.
 *
 * Módulo puro: sem I/O, sem `server-only`, para ser testável e reutilizável
 * pelo caminho server-side e pelas provas.
 */

/** Bytes de entropia do `state`. 32 bytes = 256 bits. */
export const STATE_BYTES = 32;

/** Janela de vida da intenção. Curta: é o tempo de uma autorização, não de uma sessão. */
export const INTENT_TTL_SECONDS = 10 * 60;

/**
 * Teto absoluto, espelhando o CHECK da migration
 * `20260823195327_create_meta_connection_foundation.sql`.
 */
export const MAX_INTENT_TTL_SECONDS = 30 * 60;

/**
 * Gera um `state` imprevisível.
 *
 * `crypto.getRandomValues` e não `Math.random()`: o `state` é uma defesa contra
 * quem escolhe o que enviar de volta, e um gerador previsível a anula.
 */
export function generateState(
  randomBytes: (size: number) => Uint8Array = defaultRandomBytes,
): string {
  const bytes = randomBytes(STATE_BYTES);

  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function defaultRandomBytes(size: number): Uint8Array {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return bytes;
}

/**
 * SHA-256 do `state`, em hex minúsculo.
 *
 * Minúsculo por contrato — o CHECK da migration exige `^[0-9a-f]{64}$`, para o
 * dedupe não depender de quem formatou a string.
 */
export async function hashState(state: string): Promise<string> {
  const dados = new TextEncoder().encode(state);
  const digest = await crypto.subtle.digest("SHA-256", dados);

  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Formato aceito para o `state` que volta no callback. */
export function isWellFormedState(value: unknown): value is string {
  return typeof value === "string" && new RegExp(`^[0-9a-f]{${STATE_BYTES * 2}}$`).test(value);
}

/** Intenção como persistida, reduzida ao que a validação precisa. */
export type StoredIntent = {
  organizationId: string;
  userId: string;
  expiresAt: string;
  consumedAt: string | null;
};

export type IntentRejection =
  | "MALFORMED_STATE"
  | "NOT_FOUND"
  | "ALREADY_CONSUMED"
  | "EXPIRED"
  | "WRONG_USER";

export type IntentValidation =
  | { ok: true; organizationId: string }
  | { ok: false; reason: IntentRejection };

/**
 * A intenção autoriza concluir este callback?
 *
 * Ordem deliberada: forma, existência, consumo, expiração e por último a
 * identidade. Cada recusa é fechada — nenhuma delas "tenta de novo" nem
 * completa a conexão parcialmente.
 *
 * `currentUserId` vem da sessão verificada server-side, nunca da querystring:
 * é isso que fecha o vetor cross-tenant. Um `state` válido de outro usuário não
 * conecta a organização dele à sessão de quem chamou.
 */
export function validateIntent(input: {
  state: unknown;
  intent: StoredIntent | null;
  currentUserId: string;
  nowMs?: number;
}): IntentValidation {
  const { state, intent, currentUserId } = input;
  const nowMs = input.nowMs ?? Date.now();

  if (!isWellFormedState(state)) return { ok: false, reason: "MALFORMED_STATE" };
  if (!intent) return { ok: false, reason: "NOT_FOUND" };

  // Uso único antes de expiração: um replay dentro da janela é o caso mais
  // perigoso, e precisa ser nomeado como replay e não como "expirado".
  if (intent.consumedAt !== null) return { ok: false, reason: "ALREADY_CONSUMED" };

  if (new Date(intent.expiresAt).getTime() <= nowMs) {
    return { ok: false, reason: "EXPIRED" };
  }

  if (intent.userId !== currentUserId) return { ok: false, reason: "WRONG_USER" };

  return { ok: true, organizationId: intent.organizationId };
}

/** Instante de expiração para uma intenção criada agora. */
export function intentExpiresAt(nowMs: number = Date.now()): string {
  return new Date(nowMs + INTENT_TTL_SECONDS * 1000).toISOString();
}
