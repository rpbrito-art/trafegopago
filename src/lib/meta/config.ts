import "server-only";

import { z } from "zod";

import type { RawEnv } from "@/lib/env/public";

/**
 * Configuração da integração Meta — server-only, sem exceção.
 *
 * `server-only` no topo transforma qualquer import a partir de um Client
 * Component em erro de build. Nenhuma destas variáveis pode ganhar prefixo
 * `NEXT_PUBLIC_` (`SECURITY_MODEL.md` §6 e §15.1): o `META_APP_SECRET` é
 * credencial de aplicação, e o `META_APP_ID` fica junto por disciplina — a
 * feature não deve ler configuração Meta do browser.
 *
 * ## Versão da Graph API
 *
 * Um único ponto de verdade (`TECHNICAL_SPEC.md` §7.2). Nenhuma feature escreve
 * `/vXX.X/` no próprio código; todas leem daqui. Trocar de versão é uma decisão
 * com changelog, testes e promoção explícita — não um literal espalhado.
 */

/**
 * Versão vigente da Graph/Marketing API.
 *
 * Revalidada na documentação oficial em 2026-08-23: **v26.0**, lançada em
 * 2026-07-29, é a mais recente. Um default no código, sobrescrevível por env,
 * evita que a aplicação suba com versão indefinida — e mantém a troca
 * concentrada num lugar só.
 */
export const DEFAULT_META_GRAPH_API_VERSION = "v26.0";

/** Data da última revalidação do default acima, para rastreabilidade. */
export const META_API_VERSION_VERIFIED_AT = "2026-08-23";

/** Nomes server-only desta integração. Alimenta `.env.example` e os testes. */
export const META_ENV_NAMES = [
  "META_APP_ID",
  "META_APP_SECRET",
  "META_LOGIN_CONFIG_ID",
  "META_OAUTH_REDIRECT_URI",
  "META_GRAPH_API_VERSION",
] as const;

const versaoGraphApi = z
  .string()
  .regex(/^v[0-9]+\.[0-9]+$/, "formato esperado: vXX.X");

export const metaEnvSchema = z.object({
  META_APP_ID: z.string().min(1),
  META_APP_SECRET: z.string().min(1),

  /**
   * Id da *business login configuration* criada no painel Meta.
   *
   * O Facebook Login for Business substitui o parâmetro `scope` por
   * `config_id`: as permissões e os tipos de ativo ficam definidos na
   * configuração, não na URL. Isso é o que permite o mesmo fluxo servir
   * Instagram profissional e Marketing API.
   */
  META_LOGIN_CONFIG_ID: z.string().min(1),

  /**
   * Precisa bater **exatamente** com o URI cadastrado no app Meta. Explícito, e
   * não derivado da origem do request, porque derivar deixaria a validação do
   * lado da Meta dependente de um header que o cliente controla.
   */
  META_OAUTH_REDIRECT_URI: z.string().url(),

  META_GRAPH_API_VERSION: versaoGraphApi.default(DEFAULT_META_GRAPH_API_VERSION),
});

export type MetaEnv = z.infer<typeof metaEnvSchema>;

export function parseMetaEnv(raw: RawEnv): MetaEnv {
  const result = metaEnvSchema.safeParse({
    META_APP_ID: raw.META_APP_ID,
    META_APP_SECRET: raw.META_APP_SECRET,
    META_LOGIN_CONFIG_ID: raw.META_LOGIN_CONFIG_ID,
    META_OAUTH_REDIRECT_URI: raw.META_OAUTH_REDIRECT_URI,
    META_GRAPH_API_VERSION: raw.META_GRAPH_API_VERSION,
  });

  if (!result.success) {
    // Somente os NOMES entram na mensagem. O valor de `META_APP_SECRET` não
    // pode atravessar log, stack trace ou resposta de erro.
    throw new Error(
      `Configuração Meta ausente ou inválida: ${result.error.issues
        .map((issue) => issue.path.join(".") || "(root)")
        .join(", ")}`,
    );
  }

  return result.data;
}

export function readMetaEnv(): MetaEnv {
  return parseMetaEnv(process.env as RawEnv);
}

/**
 * A integração Meta está configurada neste ambiente?
 *
 * Existe para a UI distinguir "ainda não configuramos a integração" de "houve
 * erro ao conectar". Antes do gate humano da 003A, o ambiente local não tem as
 * credenciais — e a tela precisa dizer isso em linguagem comum, em vez de
 * quebrar (`GROWTH_INTELLIGENCE_CANONICAL.md` §2.1).
 */
export function isMetaConfigured(raw: RawEnv = process.env as RawEnv): boolean {
  return metaEnvSchema.safeParse({
    META_APP_ID: raw.META_APP_ID,
    META_APP_SECRET: raw.META_APP_SECRET,
    META_LOGIN_CONFIG_ID: raw.META_LOGIN_CONFIG_ID,
    META_OAUTH_REDIRECT_URI: raw.META_OAUTH_REDIRECT_URI,
    META_GRAPH_API_VERSION: raw.META_GRAPH_API_VERSION,
  }).success;
}

/** Base da Graph API para a versão configurada. Nunca montada em feature. */
export function graphApiBaseUrl(version: string): string {
  return `https://graph.facebook.com/${version}`;
}

/** Endpoint do diálogo de autorização, na versão configurada. */
export function authorizationDialogUrl(version: string): string {
  return `https://www.facebook.com/${version}/dialog/oauth`;
}
