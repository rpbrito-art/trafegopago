import "server-only";

/**
 * Classificação da credencial Meta — somente leitura, fail-closed.
 *
 * Vive fora do `MetaAuthGateway` porque duas fronteiras diferentes precisam da
 * **mesma** resposta: a desconexão, para escolher entre encerrar por API ou
 * devolver o encerramento ao ambiente da Meta; e a descoberta de ativos, para
 * escolher o edge de Pages compatível com a classe real da credencial.
 *
 * Duplicar isso significaria manter duas definições de "é BISU" — e a mais
 * fraca acabaria valendo (Correção 003B-06 §4.1).
 */

/** Fato observável sobre a recusa externa. Nunca carrega `message` nem URL. */
export type CredentialFailure = {
  http?: number;
  code?: number;
  subcode?: number;
  causa?: string;
};

/**
 * O que a credencial é, quando pôde ser afirmado com prova.
 *
 * `subjectId` é a identidade que a própria Meta devolveu para o token — não a
 * que persistimos. É ela que ancora qualquer edge escopado à identidade.
 */
export type CredentialClass =
  | { bisu: true; subjectId: string | null; clientBusinessId: string }
  | { bisu: false; subjectId: string };

export type CredentialClassification =
  | { ok: true; classe: CredentialClass }
  | { ok: false; motivo: CredentialFailure };

/** Extrai da resposta só o que pode ser lido em voz alta. */
export async function describeExternalFailure(
  resposta: Response,
): Promise<CredentialFailure> {
  const corpo = (await resposta.json().catch(() => null)) as {
    error?: { code?: unknown; error_subcode?: unknown };
  } | null;

  const code = corpo?.error?.code;
  const subcode = corpo?.error?.error_subcode;

  return {
    http: resposta.status,
    ...(typeof code === "number" ? { code } : {}),
    ...(typeof subcode === "number" ? { subcode } : {}),
  };
}

function texto(valor: unknown): string | null {
  return typeof valor === "string" && valor.length > 0 ? valor : null;
}

/**
 * A credencial é um BISU?
 *
 * Business Integration System User: o token que o Facebook Login for Business
 * emite quando a configuração pede token de usuário do sistema. `debug_token`
 * chama isso de `SYSTEM_USER`, o mesmo rótulo do system user clássico do
 * Business Manager — e os dois não têm o mesmo ciclo de vida. O que distingue
 * é o contrato de gerenciamento BISU responder `client_business_id`.
 *
 * Foi essa confusão que fez a primeira tentativa real de desconexão chamar
 * `oauth/revoke` e não revogar nada (Investigações 003A-05 e 003A-06A). Por
 * isso `debug_token.type` sozinho continua **não** sendo aceito como prova.
 *
 * **"Não é BISU" é uma afirmação, e afirmação exige prova.** Um HTTP 200 com
 * corpo `{}` não diz que a credencial não é BISU — diz que não sabemos o que
 * ela é. Como os caminhos que saem daqui executam mutação externa ou escolhem
 * a que edge o token será apresentado, a resposta precisa identificar
 * positivamente a credencial: `id` presente, coerente com o que persistimos, e
 * `client_business_id` ausente de verdade, não vazio nem de tipo estranho.
 *
 * Somente leitura.
 */
export async function classifyCredential(input: {
  accessToken: string;
  externalUserId: string | null;
  base: string;
}): Promise<CredentialClassification> {
  const url = new URL(`${input.base}/me`);
  // `fields` pede só `client_business_id`: `id` a Graph API devolve sempre, e
  // pedi-lo explicitamente mudaria a requisição que a 003A já auditou.
  url.searchParams.set("fields", "client_business_id");
  url.searchParams.set("access_token", input.accessToken);

  try {
    const resposta = await fetch(url, { method: "GET" });

    if (!resposta.ok) {
      return { ok: false, motivo: await describeExternalFailure(resposta) };
    }

    const corpo = (await resposta.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;

    if (!corpo || typeof corpo !== "object") {
      return { ok: false, motivo: { http: resposta.status, causa: "CORPO_VAZIO" } };
    }

    // Presente: só é BISU se vier como identificador de verdade. Vazio, nulo
    // ou de outro tipo é resposta que não sabemos ler — não é "não é BISU".
    if ("client_business_id" in corpo) {
      const negocio = corpo.client_business_id;

      if (typeof negocio === "string" && negocio.length > 0) {
        // `subjectId` pode faltar aqui sem invalidar a classificação: quem
        // precisa dele para ancorar um edge é que decide se pode seguir. A
        // desconexão, por exemplo, não precisa — BISU encerra pelo ambiente.
        return {
          ok: true,
          classe: {
            bisu: true,
            subjectId: texto(corpo.id),
            clientBusinessId: negocio,
          },
        };
      }

      return {
        ok: false,
        motivo: { http: resposta.status, causa: "NEGOCIO_INVALIDO" },
      };
    }

    // Daqui em diante a conclusão seria "não é BISU", que libera mutação. Ela
    // precisa de identidade positiva.
    const id = texto(corpo.id);

    if (!id) {
      return {
        ok: false,
        motivo: { http: resposta.status, causa: "SEM_IDENTIDADE" },
      };
    }

    // E a identidade tem que ser a nossa. Revogar permissões de outra conta
    // seria pior do que não revogar nada.
    if (input.externalUserId && input.externalUserId !== id) {
      return {
        ok: false,
        motivo: { http: resposta.status, causa: "IDENTIDADE_DIVERGENTE" },
      };
    }

    return { ok: true, classe: { bisu: false, subjectId: id } };
  } catch {
    return { ok: false, motivo: { causa: "REDE" } };
  }
}
