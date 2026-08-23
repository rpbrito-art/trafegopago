"use server";

import { redirect } from "next/navigation";

import { ROUTES } from "@/lib/auth/routes";
import { requireUser } from "@/lib/auth/session";
import { disconnectMeta, startMetaAuthorization } from "@/lib/meta/gateway";

/**
 * Ações de conexão Meta.
 *
 * Ambas terminam em `redirect`, e o desfecho volta pelo mesmo marcador pobre
 * que o callback usa (`?meta=ok|erro`). Um único vocabulário de retorno evita
 * que a UI precise distinguir "falhou ao iniciar" de "falhou ao voltar" — e
 * impede que a razão real da recusa vire informação na barra de endereços.
 */

/** Destino com o desfecho, sem eco de nenhum dado do request. */
function voltarPara(resultado: "ok" | "erro"): string {
  return `${ROUTES.account}?meta=${resultado}`;
}

/**
 * Inicia a conexão.
 *
 * `organizationId` chega por campo oculto, mas não é confiado: o gateway
 * reconfere a membership ativa antes de criar a intenção OAuth. Um id de
 * organização alheia não conecta nada — e a recusa não diz se aquela
 * organização existe.
 */
export async function connectMetaAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const organizationId = asString(formData.get("organizationId"));

  if (!organizationId) redirect(voltarPara("erro"));

  const resultado = await startMetaAuthorization({
    userId: user.id,
    organizationId,
  });

  if (!resultado.ok) redirect(voltarPara("erro"));

  redirect(resultado.authorizationUrl);
}

export async function disconnectMetaAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const organizationId = asString(formData.get("organizationId"));

  if (!organizationId) redirect(voltarPara("erro"));

  const resultado = await disconnectMeta({
    userId: user.id,
    organizationId,
  });

  redirect(voltarPara(resultado.ok ? "ok" : "erro"));
}

function asString(value: FormDataEntryValue | null): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
